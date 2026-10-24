import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export interface SteadfastCreateOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  alternative_phone?: string;
  recipient_email?: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number;
}

export interface SteadfastCreateOrderResponse {
  status: number;
  message?: string;
  consignment?: {
    consignment_id: number | string;
    invoice: string;
    tracking_code: string;
    tracking_link?: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
  };
  errors?: any;
}

export interface SteadfastBulkItemResponse {
  invoice: string;
  recipient_name?: string;
  recipient_address?: string;
  recipient_phone?: string;
  cod_amount?: string | number;
  note?: string | null;
  consignment_id?: number | null;
  tracking_code?: string | null;
  status: string;
  errors?: any;
}

@Injectable()
export class SteadfastService {
  private readonly logger = new Logger(SteadfastService.name);
  private readonly defaultBaseUrl = 'https://portal.packzy.com/api/v1';
  private preferredSource: 'env' | 'database' | null = null;

  /** Sliding window of 401s used to stay under Steadfast's lockout threshold. */
  private recent401At: number[] = [];
  private suspendedUntil = 0;

  /** Cached /get_balance probe: a 401 there means the keys themselves are bad. */
  private keysValidCache: boolean | null = null;
  private keysValidUntil = 0;

  private static readonly WINDOW_MS = 5 * 60_000;
  private static readonly MAX_401S_IN_WINDOW = 5;
  private static readonly SUSPENSION_MS = 5 * 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve API credentials dynamically from .env or DB
   */
  async getCredentials(): Promise<{ apiKey: string; secretKey: string; baseUrl: string }> {
    const candidates = await this.getCredentialCandidates();
    if (candidates.length > 0) {
      const chosen =
        candidates.find(
          (candidate) => candidate.source === this.preferredSource,
        ) || candidates[0];
      return {
        apiKey: chosen.apiKey,
        secretKey: chosen.secretKey,
        baseUrl: chosen.baseUrl,
      };
    }

    let apiKey = this.configService.get<string>('STEADFAST_API_KEY') || process.env.STEADFAST_API_KEY;
    let secretKey = this.configService.get<string>('STEADFAST_SECRET_KEY') || process.env.STEADFAST_SECRET_KEY;
    let baseUrl = this.configService.get<string>('STEADFAST_BASE_URL') || process.env.STEADFAST_BASE_URL || this.defaultBaseUrl;

    // Dynamically reload from .env file to ensure runtime changes are picked up immediately
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        if (envConfig.STEADFAST_API_KEY && envConfig.STEADFAST_API_KEY !== 'your_steadfast_api_key_here') {
          apiKey = envConfig.STEADFAST_API_KEY;
        }
        if (envConfig.STEADFAST_SECRET_KEY && envConfig.STEADFAST_SECRET_KEY !== 'your_steadfast_secret_key_here') {
          secretKey = envConfig.STEADFAST_SECRET_KEY;
        }
        if (envConfig.STEADFAST_BASE_URL) {
          baseUrl = envConfig.STEADFAST_BASE_URL;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not read .env dynamically: ${err.message}`);
    }

    if (!apiKey || !secretKey || apiKey.includes('your_steadfast')) {
      const dbApi = await this.prisma.externalApi.findFirst({
        where: { apiName: { contains: 'steadfast', mode: 'insensitive' } },
      });
      if (dbApi && dbApi.credentials) {
        try {
          const parsed = JSON.parse(dbApi.credentials);
          apiKey = parsed.apiKey || parsed['Api-Key'] || parsed.api_key || apiKey;
          secretKey = parsed.secretKey || parsed['Secret-Key'] || parsed.secret_key || secretKey;
          baseUrl = dbApi.apiUrl || baseUrl;
        } catch {
          // not JSON
        }
      }
    }

    apiKey = (apiKey || '').trim();
    secretKey = (secretKey || '').trim();

    return { apiKey, secretKey, baseUrl: baseUrl.replace(/\/+$/, '') };
  }

  private readEnvConfig(): Record<string, string> {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (!fs.existsSync(envPath)) return {};
      return dotenv.parse(fs.readFileSync(envPath));
    } catch {
      return {};
    }
  }

  private async getDatabaseCredentials(): Promise<{
    apiKey: string;
    secretKey: string;
    baseUrl?: string;
  }> {
    try {
      const dbApi = await this.prisma.externalApi.findFirst({
        where: { apiName: { contains: 'steadfast', mode: 'insensitive' } },
      });
      if (!dbApi?.credentials) return { apiKey: '', secretKey: '' };

      const parsed = JSON.parse(dbApi.credentials);
      return {
        apiKey: String(
          parsed.apiKey || parsed['Api-Key'] || parsed.api_key || '',
        ).trim(),
        secretKey: String(
          parsed.secretKey || parsed['Secret-Key'] || parsed.secret_key || '',
        ).trim(),
        baseUrl: dbApi.apiUrl
          ? String(dbApi.apiUrl).replace(/\/+$/, '')
          : undefined,
      };
    } catch {
      return { apiKey: '', secretKey: '' };
    }
  }

  private async getCredentialCandidates(): Promise<
    Array<{
      source: 'env' | 'database';
      apiKey: string;
      secretKey: string;
      baseUrl: string;
    }>
  > {
    const envConfig = this.readEnvConfig();

    let apiKey =
      this.configService.get<string>('STEADFAST_API_KEY') ||
      process.env.STEADFAST_API_KEY ||
      '';
    let secretKey =
      this.configService.get<string>('STEADFAST_SECRET_KEY') ||
      process.env.STEADFAST_SECRET_KEY ||
      '';
    let baseUrl =
      this.configService.get<string>('STEADFAST_BASE_URL') ||
      process.env.STEADFAST_BASE_URL ||
      this.defaultBaseUrl;

    if (
      envConfig.STEADFAST_API_KEY &&
      !envConfig.STEADFAST_API_KEY.includes('your_steadfast')
    ) {
      apiKey = envConfig.STEADFAST_API_KEY;
    }
    if (
      envConfig.STEADFAST_SECRET_KEY &&
      !envConfig.STEADFAST_SECRET_KEY.includes('your_steadfast')
    ) {
      secretKey = envConfig.STEADFAST_SECRET_KEY;
    }
    if (envConfig.STEADFAST_BASE_URL) {
      baseUrl = envConfig.STEADFAST_BASE_URL;
    }

    const envKey = String(apiKey || '').trim();
    const envSecret = String(secretKey || '').trim();
    const envBaseUrl = String(baseUrl || this.defaultBaseUrl).replace(
      /\/+$/,
      '',
    );

    const candidates: Array<{
      source: 'env' | 'database';
      apiKey: string;
      secretKey: string;
      baseUrl: string;
    }> = [];

    if (envKey && envSecret && !envKey.includes('your_steadfast')) {
      candidates.push({
        source: 'env',
        apiKey: envKey,
        secretKey: envSecret,
        baseUrl: envBaseUrl,
      });
    }

    const dbCredentials = await this.getDatabaseCredentials();
    if (
      dbCredentials.apiKey &&
      dbCredentials.secretKey &&
      !(
        dbCredentials.apiKey === envKey &&
        dbCredentials.secretKey === envSecret
      )
    ) {
      candidates.push({
        source: 'database',
        apiKey: dbCredentials.apiKey,
        secretKey: dbCredentials.secretKey,
        baseUrl: dbCredentials.baseUrl || envBaseUrl,
      });
    }

    if (this.preferredSource) {
      const preferred = candidates.find(
        (candidate) => candidate.source === this.preferredSource,
      );
      if (preferred) {
        return [
          preferred,
          ...candidates.filter(
            (candidate) => candidate.source !== this.preferredSource,
          ),
        ];
      }
    }

    return candidates;
  }

  async getCredentialStatus(): Promise<{
    preferredSource: 'env' | 'database' | null;
    envConfigured: boolean;
    databaseConfigured: boolean;
    pingOk: boolean;
    pingError?: string;
    balanceOk: boolean;
    balanceError?: string;
  }> {
    const candidates = await this.getCredentialCandidates();
    const envConfigured = candidates.some((c) => c.source === 'env');
    const databaseConfigured = candidates.some(
      (c) => c.source === 'database',
    );

    const ping = await this.ping();

    try {
      const balance = await this.steadfastGet<{
        status: number;
        current_balance: number;
      }>('/get_balance', 'get_balance');

      return {
        preferredSource: this.preferredSource,
        envConfigured,
        databaseConfigured,
        pingOk: ping.ok,
        ...(ping.ok ? {} : { pingError: ping.message }),
        balanceOk: Number(balance?.status) === 200,
      };
    } catch (err: any) {
      return {
        preferredSource: this.preferredSource,
        envConfigured,
        databaseConfigured,
        pingOk: ping.ok,
        ...(ping.ok ? {} : { pingError: ping.message }),
        balanceOk: false,
        balanceError: this.sanitizeMessage(err?.message) || 'Steadfast rejected the credentials.',
      };
    }
  }

  private cleanPhoneNumber(phone?: string | null): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length === 13) {
      digits = digits.slice(2);
    }
    if (digits.length === 10 && !digits.startsWith('0')) {
      digits = '0' + digits;
    }
    return digits;
  }

  private getHttpTimeoutMs(): number {
    const raw =
      this.configService.get<string>('STEADFAST_HTTP_TIMEOUT_MS') ||
      process.env.STEADFAST_HTTP_TIMEOUT_MS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
  }

  private sanitizeMessage(message?: string | null): string {
    return (message || '').replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  /**
   * Courier.md: after 10 failed 401s in five minutes Steadfast refuses the client
   * for 60 minutes, valid keys included. Refuse locally before we get there.
   */
  private assertAuthNotSuspended(): void {
    if (this.suspendedUntil <= Date.now()) return;
    const seconds = Math.ceil((this.suspendedUntil - Date.now()) / 1000);
    throw new ServiceUnavailableException(
      `Steadfast calls are suspended for another ${seconds}s after repeated 401 responses. Fix the API keys in Backend/.env before retrying, otherwise Steadfast locks this account out for 60 minutes.`,
    );
  }

  private recordUnauthorized(): void {
    const now = Date.now();
    this.recent401At = this.recent401At.filter(
      (at) => now - at < SteadfastService.WINDOW_MS,
    );
    this.recent401At.push(now);

    if (this.recent401At.length >= SteadfastService.MAX_401S_IN_WINDOW) {
      this.suspendedUntil = now + SteadfastService.SUSPENSION_MS;
      this.logger.warn(
        `${this.recent401At.length} Steadfast 401 responses in 5 minutes — suspending outgoing calls for ${SteadfastService.SUSPENSION_MS / 60_000} minutes to stay under the lockout threshold (Courier.md).`,
      );
    }
  }

  /**
   * Reachability check per Courier.md: GET /ping needs no credentials, so it
   * separates "wrong base URL / network" from "bad keys" (which only /get_balance shows).
   */
  async ping(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { baseUrl } = await this.getCredentials();
      const res = await this.steadfastFetch(
        `${baseUrl}/ping`,
        { method: 'GET' },
        'ping',
        true,
      );

      if (!res.ok) {
        await res.text().catch(() => '');
        return { ok: false, message: `Steadfast /ping answered HTTP ${res.status}` };
      }

      const data: any = await res.json().catch(() => null);
      if (Number(data?.status) !== 200) {
        return {
          ok: false,
          message: this.sanitizeMessage(data?.message) || 'Steadfast /ping returned an unexpected body',
        };
      }

      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        message: this.sanitizeMessage(err?.message) || 'Steadfast /ping is unreachable',
      };
    }
  }

  /**
   * Courier.md: /get_balance answers 401 when the keys are wrong, so a single
   * cheap probe tells "keys rejected" apart from "that parcel is not yours".
   * Cached for a minute so a burst of failures does not become its own storm.
   */
  async areKeysValid(): Promise<boolean> {
    const now = Date.now();
    if (this.keysValidCache !== null && now < this.keysValidUntil) {
      return this.keysValidCache;
    }

    let valid = true;
    try {
      const { apiKey, secretKey, baseUrl } = await this.getCredentials();
      if (!apiKey || !secretKey) {
        valid = false;
      } else {
        const res = await this.steadfastFetch(
          `${baseUrl}/get_balance`,
          {
            method: 'GET',
            headers: {
              'Api-Key': apiKey,
              'Secret-Key': secretKey,
              'Content-Type': 'application/json',
            },
          },
          'get_balance',
          true,
        );
        // drained so the connection is not left holding the body
        const probeBody = await res.text().catch(() => '');
        let appStatus: number | null = null;
        try {
          appStatus = Number(JSON.parse(probeBody)?.status);
        } catch {
          appStatus = null;
        }
        valid = res.status !== 401 && appStatus !== 401;
      }
    } catch {
      // timeouts and 5xx say nothing about the keys — assume they are fine
      valid = true;
    }

    this.keysValidCache = valid;
    this.keysValidUntil = now + 60_000;
    return valid;
  }

  private async steadfastFetch(
    url: string,
    init: RequestInit,
    operation: string,
    bypassAuthGuard = false,
  ): Promise<Response> {
    if (!bypassAuthGuard) this.assertAuthNotSuspended();

    const controller = new AbortController();
    const timeoutMs = this.getHttpTimeoutMs();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new GatewayTimeoutException(
          `Steadfast ${operation} timed out after ${timeoutMs}ms`,
        );
      }
      throw new BadGatewayException(
        `Steadfast ${operation} connection error: ${this.sanitizeMessage(err?.message)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private throwForHttpStatus(
    status: number,
    operation: string,
    retryAfter?: string | null,
  ): never {
    if (status === 401) {
      this.recordUnauthorized();
      throw new UnauthorizedException(
        'Steadfast rejected the request (401). The consignment, tracking code, or invoice may not belong to this Steadfast account, or the configured API keys are invalid.',
      );
    }
    if (status === 403) {
      throw new ForbiddenException(
        'Steadfast rejected this request due to account permissions or KYC restrictions.',
      );
    }
    if (status === 429) {
      throw new ServiceUnavailableException(
        retryAfter
          ? `Steadfast rate limit reached. Retry after ${retryAfter} seconds.`
          : 'Steadfast rate limit reached. Please wait before retrying.',
      );
    }
    throw new BadGatewayException(`Steadfast ${operation} failed with HTTP ${status}`);
  }

  private async steadfastGet<T>(
    path: string,
    operation: string,
    requireAppStatus = true,
  ): Promise<T> {
    const candidates = await this.getCredentialCandidates();
    if (candidates.length === 0) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    let lastError: any;
    for (let index = 0; index < candidates.length; index++) {
      try {
        const result = await this.steadfastGetWithCredentials<T>(
          candidates[index],
          path,
          operation,
          requireAppStatus,
        );
        this.preferredSource = candidates[index].source;
        return result;
      } catch (err: any) {
        lastError = err;
        if (
          err instanceof UnauthorizedException &&
          index < candidates.length - 1
        ) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private async steadfastGetWithCredentials<T>(
    credentials: {
      source: 'env' | 'database';
      apiKey: string;
      secretKey: string;
      baseUrl: string;
    },
    path: string,
    operation: string,
    requireAppStatus: boolean,
  ): Promise<T> {
    const { apiKey, secretKey, baseUrl } = credentials;

    const res = await this.steadfastFetch(
      `${baseUrl}${path}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      },
      operation,
    );

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        this.logger.error(`Steadfast ${operation} failed with HTTP ${res.status}`);
        this.throwForHttpStatus(res.status, operation, res.headers.get('retry-after'));
      }

      this.logger.error(
        `Steadfast ${operation} returned non-JSON response (HTTP ${res.status}): ${this.sanitizeMessage(responseText)}`,
      );
      throw new BadGatewayException(
        `Steadfast ${operation} returned an invalid response (HTTP ${res.status})`,
      );
    }

    if (!res.ok) {
      this.logger.error(`Steadfast ${operation} failed with HTTP ${res.status}`);
      this.throwForHttpStatus(res.status, operation, res.headers.get('retry-after'));
    }

    const appStatus = Number(data?.status);
    if (requireAppStatus && appStatus !== 200) {
      const errMsg = this.sanitizeMessage(data?.message || 'invalid response');
      this.logger.error(`Steadfast ${operation} rejected: ${errMsg}`);

      if (appStatus === 401 || appStatus === 403 || appStatus === 429) {
        this.throwForHttpStatus(appStatus, operation);
      }

      throw new BadRequestException(`Steadfast ${operation} failed: ${errMsg}`);
    }

    return data as T;
  }

  private async steadfastPost<T>(
    path: string,
    body: unknown,
    operation: string,
  ): Promise<T> {
    const candidates = await this.getCredentialCandidates();
    if (candidates.length === 0) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    let lastError: any;
    for (let index = 0; index < candidates.length; index++) {
      try {
        const result = await this.steadfastPostWithCredentials<T>(
          candidates[index],
          path,
          body,
          operation,
        );
        this.preferredSource = candidates[index].source;
        return result;
      } catch (err: any) {
        lastError = err;
        if (
          err instanceof UnauthorizedException &&
          index < candidates.length - 1
        ) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private async steadfastPostWithCredentials<T>(
    credentials: {
      source: 'env' | 'database';
      apiKey: string;
      secretKey: string;
      baseUrl: string;
    },
    path: string,
    body: unknown,
    operation: string,
  ): Promise<T> {
    const { apiKey, secretKey, baseUrl } = credentials;

    const res = await this.steadfastFetch(
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      },
      operation,
    );

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        this.throwForHttpStatus(res.status, operation, res.headers.get('retry-after'));
      }
      this.logger.error(
        `Steadfast ${operation} returned non-JSON response (HTTP ${res.status}): ${this.sanitizeMessage(responseText)}`,
      );
      throw new BadGatewayException(
        `Steadfast ${operation} returned an invalid response (HTTP ${res.status})`,
      );
    }

    if (!res.ok) {
      this.logger.error(`Steadfast ${operation} failed with HTTP ${res.status}`);
      this.throwForHttpStatus(res.status, operation, res.headers.get('retry-after'));
    }

    const appStatus = Number(data?.status);
    if (appStatus && appStatus !== 200 && appStatus !== 201) {
      const errMsg = this.sanitizeMessage(data?.message || 'invalid response');
      this.logger.error(`Steadfast ${operation} rejected: ${errMsg}`);

      if (appStatus === 401 || appStatus === 403 || appStatus === 429) {
        this.throwForHttpStatus(appStatus, operation);
      }

      throw new BadRequestException(`Steadfast ${operation} failed: ${errMsg}`);
    }

    return data as T;
  }

  private normalizeList(data: any): { data: any[]; meta?: any; raw: any } {
    if (Array.isArray(data)) {
      return { data, raw: data };
    }

    const list =
      (Array.isArray(data?.data) && data.data) ||
      (Array.isArray(data?.returns) && data.returns) ||
      (Array.isArray(data?.payments) && data.payments) ||
      (Array.isArray(data?.police_stations) && data.police_stations) ||
      (Array.isArray(data?.stations) && data.stations) ||
      [];

    return {
      data: list,
      meta: data?.meta || (data?.total !== undefined ? { total: data.total } : undefined),
      raw: data,
    };
  }

  private async getDeliveryStatus(path: string, operation: string): Promise<{ status: number; delivery_status: string }> {
    const data = await this.steadfastGet<{ status: number; delivery_status?: string }>(
      path,
      operation,
    );

    if (!data.delivery_status) {
      throw new BadGatewayException(
        `Steadfast ${operation} did not return a delivery_status`,
      );
    }

    return { status: data.status, delivery_status: data.delivery_status };
  }

  /**
   * Create a single order in Steadfast Courier
   */
  async createOrder(payload: SteadfastCreateOrderPayload): Promise<SteadfastCreateOrderResponse> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();

    if (!apiKey || !secretKey || apiKey === 'your_steadfast_api_key_here') {
      throw new BadRequestException(
        'Steadfast Courier API keys are not configured yet. Please enter your valid STEADFAST_API_KEY and STEADFAST_SECRET_KEY in Backend/.env file.',
      );
    }

    const formattedPhone = this.cleanPhoneNumber(payload.recipient_phone);
    if (!formattedPhone || formattedPhone.length !== 11) {
      throw new BadRequestException(
        `Recipient phone must be an 11-digit Bangladesh phone number (Got: "${payload.recipient_phone}")`,
      );
    }

    const formattedPayload = {
      invoice: String(payload.invoice),
      recipient_name: (payload.recipient_name || 'Customer').trim().substring(0, 100),
      recipient_phone: formattedPhone,
      ...(payload.alternative_phone && {
        alternative_phone: this.cleanPhoneNumber(payload.alternative_phone),
      }),
      ...(payload.recipient_email && { recipient_email: payload.recipient_email.trim() }),
      recipient_address: (payload.recipient_address || 'Address not provided').trim().substring(0, 250),
      cod_amount: Math.max(0, Math.round(Number(payload.cod_amount) || 0)),
      note: (payload.note || '').trim() || undefined,
      ...(payload.item_description && { item_description: payload.item_description }),
      ...(payload.total_lot !== undefined && { total_lot: Number(payload.total_lot) }),
      delivery_type: payload.delivery_type !== undefined ? Number(payload.delivery_type) : 0,
    };
    

    try {
      this.logger.log(`Calling Steadfast create_order for Invoice: ${formattedPayload.invoice} to ${baseUrl}`);
      const res = await this.steadfastFetch(
        `${baseUrl}/create_order`,
        {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
            'Secret-Key': secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedPayload),
        },
        'create_order',
      );

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          this.logger.error(`Steadfast create_order failed with HTTP ${res.status}`);
          this.throwForHttpStatus(res.status, 'create_order', res.headers.get('retry-after'));
        }

        this.logger.error(
          `Steadfast returned non-JSON response (HTTP ${res.status}): ${this.sanitizeMessage(responseText)}`,
        );
        throw new BadRequestException(
          `Steadfast Courier responded with HTTP ${res.status}: ${this.sanitizeMessage(responseText)}`,
        );
      }

      const appStatus = Number(data?.status);
      if (!res.ok || (appStatus && appStatus !== 200)) {
        const statusCode = !res.ok ? res.status : appStatus;
        let errMsg = data?.message || `Steadfast HTTP ${statusCode}`;
        if (data?.errors) {
          errMsg += ` (${typeof data.errors === 'object' ? JSON.stringify(data.errors) : data.errors})`;
        }
        this.logger.error(`Steadfast create_order rejected: ${this.sanitizeMessage(errMsg)}`);

        if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
          this.throwForHttpStatus(statusCode, 'create_order', res.headers.get('retry-after'));
        }

        throw new BadRequestException(`Steadfast Courier: ${this.sanitizeMessage(errMsg)}`);
      }

      return data as SteadfastCreateOrderResponse;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Steadfast connection error: ${this.sanitizeMessage(err.message)}`);
      throw new BadRequestException(
        `Steadfast Courier connection error: ${this.sanitizeMessage(err.message)}`,
      );
    }
  }

  /**
   * Bulk order creation (up to 500 items)
   */
  async createBulkOrders(items: SteadfastCreateOrderPayload[]): Promise<SteadfastBulkItemResponse[]> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();

    if (!apiKey || !secretKey || apiKey === 'your_steadfast_api_key_here') {
      throw new BadRequestException(
        'Steadfast Courier API credentials are not configured in Backend/.env.',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('No orders provided for bulk courier submission');
    }

    if (items.length > 500) {
      throw new BadRequestException('Maximum 500 orders allowed per bulk submission');
    }

    const formattedData = items.map((item) => ({
      invoice: String(item.invoice),
      recipient_name: (item.recipient_name || 'Customer').trim().substring(0, 100),
      recipient_address: (item.recipient_address || 'Address not provided').trim().substring(0, 250),
      recipient_phone: this.cleanPhoneNumber(item.recipient_phone),
      cod_amount: Math.max(0, Math.round(Number(item.cod_amount) || 0)),
      note: (item.note || '').trim() || null,
      ...(item.alternative_phone && {
        alternative_phone: this.cleanPhoneNumber(item.alternative_phone),
      }),
      delivery_type: item.delivery_type !== undefined ? Number(item.delivery_type) : 0,
    }));

    try {
      this.logger.log(`Calling Steadfast bulk create with ${formattedData.length} items`);
      const res = await this.steadfastFetch(
        `${baseUrl}/create_order/bulk-order`,
        {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
            'Secret-Key': secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: JSON.stringify(formattedData) }),
        },
        'bulk create_order',
      );

      const responseText = await res.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new BadRequestException(
          `Steadfast bulk create returned HTTP ${res.status}: ${this.sanitizeMessage(responseText)}`,
        );
      }

      if (!res.ok) {
        throw new BadRequestException(
          `Steadfast bulk create failed: ${result?.message || res.statusText}`,
        );
      }

      if (Array.isArray(result)) {
        return result as SteadfastBulkItemResponse[];
      } else if (result?.data && Array.isArray(result.data)) {
        return result.data as SteadfastBulkItemResponse[];
      }
      return [result];
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Steadfast bulk create error: ${this.sanitizeMessage(err.message)}`);
      throw new BadRequestException(
        `Bulk courier submission failed: ${this.sanitizeMessage(err.message)}`,
      );
    }
  }

  /**
   * Check delivery status by Consignment ID
   */
  async getStatusByConsignmentId(
    cid: string | number,
  ): Promise<{ status: number; delivery_status: string }> {
    const encodedCid = encodeURIComponent(String(cid));
    return this.getDeliveryStatus(`/status_by_cid/${encodedCid}`, 'status_by_cid');
  }

  /**
   * Check delivery status by Invoice / OrderRef
   */
  async getStatusByInvoice(invoice: string): Promise<{ status: number; delivery_status: string }> {
    return this.getDeliveryStatus(
      `/status_by_invoice/${encodeURIComponent(invoice)}`,
      'status_by_invoice',
    );
  }

  /**
   * Check delivery status by Tracking Code
   */
  async getStatusByTrackingCode(
    code: string,
  ): Promise<{ status: number; delivery_status: string }> {
    return this.getDeliveryStatus(
      `/status_by_trackingcode/${encodeURIComponent(code)}`,
      'status_by_trackingcode',
    );
  }

  /**
   * Get Steadfast Courier Account Balance
   */
  async getBalance(): Promise<{
    status: number;
    current_balance: number;
    error?: string;
  }> {
    const { apiKey, secretKey } = await this.getCredentials();
    if (!apiKey || !secretKey || apiKey === 'your_steadfast_api_key_here') {
      return {
        status: 500,
        current_balance: 0,
        error: 'Steadfast credentials are not configured.',
      };
    }

    try {
      return await this.steadfastGet<{ status: number; current_balance: number }>(
        '/get_balance',
        'get_balance',
      );
    } catch (err: any) {
      this.logger.error(`Failed to fetch balance: ${this.sanitizeMessage(err.message)}`);
      return {
        status: 500,
        current_balance: 0,
        error: this.sanitizeMessage(err.message) || 'Failed to load Steadfast balance.',
      };
    }
  }

  /**
   * Check delivery & return status by Consignment ID
   * Includes return journey states: cancelled_return_processing, cancelled_return_rider_assigned, cancelled_return_received, etc.
   */
  async getStatusWithReturnStatusByConsignmentId(
    cid: string | number,
  ): Promise<{ status: number; delivery_status: string }> {
    return this.getDeliveryStatus(
      `/status_with_return_status_by_cid/${encodeURIComponent(String(cid))}`,
      'status_with_return_status_by_cid',
    );
  }

  /**
   * Create a pickup request
   */
  async createPickupRequest(payload: {
    address_id?: number;
    police_station_id?: number;
    address: string;
    contact_number: string;
    note?: string;
    estim_qty?: number;
  }): Promise<any> {
    return this.steadfastPost(
      '/create_pickup_request',
      payload,
      'create_pickup_request',
    );
  }

  /**
   * Create a return request for a consignment
   */
  async createReturnRequest(payload: {
    consignment_id?: string | number;
    invoice?: string;
    tracking_code?: string;
    reason?: string;
  }): Promise<any> {
    return this.steadfastPost(
      '/create_return_request',
      payload,
      'create_return_request',
    );
  }

  /**
   * List return requests
   */
  async getReturnRequests(page = 1): Promise<{ data: any[]; meta?: any; raw: any }> {
    const data = await this.steadfastGet<any>(
      `/get_return_requests?page=${encodeURIComponent(String(page))}`,
      'get_return_requests',
      false,
    );
    return this.normalizeList(data);
  }

  /**
   * Get a single return request
   */
  async getReturnRequest(id: string | number): Promise<any> {
    return this.steadfastGet<any>(
      `/get_return_request/${encodeURIComponent(String(id))}`,
      'get_return_request',
      false,
    );
  }

  /**
   * List payment / invoice batches
   */
  async getPayments(page = 1): Promise<{ data: any[]; meta?: any; raw: any }> {
    const data = await this.steadfastGet<any>(
      `/payments?page=${encodeURIComponent(String(page))}`,
      'payments',
      false,
    );
    return this.normalizeList(data);
  }

  /**
   * Get a payment batch with its consignments
   */
  async getPayment(paymentId: string | number): Promise<any> {
    return this.steadfastGet<any>(
      `/payments/${encodeURIComponent(String(paymentId))}`,
      'payments.detail',
      false,
    );
  }

  /**
   * List police stations used by pickup requests
   */
  async getPoliceStations(): Promise<{ data: any[]; meta?: any; raw: any }> {
    const data = await this.steadfastGet<any>(
      '/police_stations',
      'police_stations',
      false,
    );
    return this.normalizeList(data);
  }

  /**
   * Get complete journey tracking timeline for an order by invoice/reference
   */
  async getTrackingsByInvoice(invoice: string): Promise<{
    status: number;
    tracking?: Array<{
      consignment_id: number;
      tracking_type: number;
      text: string;
      created_at: string;
    }>;
  }> {
    return this.steadfastGet(
      `/trackings_by_invoice/${encodeURIComponent(invoice)}`,
      'trackings_by_invoice',
    );
  }

  /**
   * Customer delivery reputation check (fraud ratio, completion count)
   */
  async checkFraudScore(phone: string): Promise<any> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();
    if (!apiKey || !secretKey) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    const cleanPhone = this.cleanPhoneNumber(phone);
    const res = await this.steadfastFetch(
      `${baseUrl}/fraud_check/score/${cleanPhone}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      },
      'fraud_check',
    );

    const responseText = await res.text();
    try {
      return JSON.parse(responseText);
    } catch {
      this.logger.error(`Steadfast fraud check returned invalid JSON (HTTP ${res.status})`);
      throw new BadGatewayException('Steadfast fraud check returned an invalid response');
    }
  }
}

