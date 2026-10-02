import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve API credentials dynamically from .env or DB
   */
  async getCredentials(): Promise<{ apiKey: string; secretKey: string; baseUrl: string }> {
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
      const res = await fetch(`${baseUrl}/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedPayload),
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        this.logger.error(`Steadfast returned non-JSON response (HTTP ${res.status}): ${responseText}`);
        throw new BadRequestException(
          `Steadfast Courier responded with HTTP ${res.status}: ${responseText.substring(0, 200)}`,
        );
      }

      if (!res.ok || (data.status && data.status !== 200)) {
        let errMsg = data.message || `Steadfast HTTP ${res.status}`;
        if (data.errors) {
          errMsg += ` (${typeof data.errors === 'object' ? JSON.stringify(data.errors) : data.errors})`;
        }
        this.logger.error(`Steadfast create_order rejected: ${errMsg}`);
        throw new BadRequestException(`Steadfast Courier: ${errMsg}`);
      }

      return data as SteadfastCreateOrderResponse;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Steadfast connection error: ${err.message}`, err.stack);
      throw new BadRequestException(`Steadfast Courier connection error: ${err.message}`);
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
      const res = await fetch(`${baseUrl}/create_order/bulk-order`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: JSON.stringify(formattedData) }),
      });

      const responseText = await res.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new BadRequestException(
          `Steadfast bulk create returned HTTP ${res.status}: ${responseText.substring(0, 200)}`,
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
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Steadfast bulk create error: ${err.message}`, err.stack);
      throw new BadRequestException(`Bulk courier submission failed: ${err.message}`);
    }
  }

  /**
   * Check delivery status by Consignment ID
   */
  async getStatusByConsignmentId(cid: string | number): Promise<{ status: number; delivery_status: string }> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();
    if (!apiKey || !secretKey) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    try {
      const res = await fetch(`${baseUrl}/status_by_cid/${cid}`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      });
      const responseText = await res.text();
      return JSON.parse(responseText);
    } catch (err: any) {
      this.logger.error(`Failed to fetch status by CID ${cid}: ${err.message}`);
      throw new BadRequestException(`Failed to check courier status: ${err.message}`);
    }
  }

  /**
   * Check delivery status by Invoice / OrderRef
   */
  async getStatusByInvoice(invoice: string): Promise<{ status: number; delivery_status: string }> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();
    if (!apiKey || !secretKey) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    try {
      const res = await fetch(`${baseUrl}/status_by_invoice/${encodeURIComponent(invoice)}`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      });
      const responseText = await res.text();
      return JSON.parse(responseText);
    } catch (err: any) {
      this.logger.error(`Failed to fetch status by invoice ${invoice}: ${err.message}`);
      throw new BadRequestException(`Failed to check courier status: ${err.message}`);
    }
  }

  /**
   * Check delivery status by Tracking Code
   */
  async getStatusByTrackingCode(code: string): Promise<{ status: number; delivery_status: string }> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();
    if (!apiKey || !secretKey) {
      throw new BadRequestException('Steadfast credentials are not configured');
    }

    try {
      const res = await fetch(`${baseUrl}/status_by_trackingcode/${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      });
      const responseText = await res.text();
      return JSON.parse(responseText);
    } catch (err: any) {
      this.logger.error(`Failed to fetch status by tracking code ${code}: ${err.message}`);
      throw new BadRequestException(`Failed to check courier status: ${err.message}`);
    }
  }

  /**
   * Get Steadfast Courier Account Balance
   */
  async getBalance(): Promise<{ status: number; current_balance: number }> {
    const { apiKey, secretKey, baseUrl } = await this.getCredentials();
    if (!apiKey || !secretKey || apiKey === 'your_steadfast_api_key_here') {
      return { status: 200, current_balance: 0 };
    }

    try {
      const res = await fetch(`${baseUrl}/get_balance`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      });
      const responseText = await res.text();
      return JSON.parse(responseText);
    } catch (err: any) {
      this.logger.error(`Failed to fetch balance: ${err.message}`);
      return { status: 500, current_balance: 0 };
    }
  }
}
