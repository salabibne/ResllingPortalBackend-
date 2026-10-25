import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { CommonStatus, User, UserRole } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type AuthPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};

type PublicUser = Omit<User, 'passwordHash' | 'refreshTokenHash' | 'refreshTokenExpiresAt'>;

type AuthResponse = TokenPair & {
  user: PublicUser;
};

type RegisterApprovalResponse = {
  user: PublicUser;
  requiresApproval: true;
};

const RESELLER_PENDING_MESSAGE =
  'Your reseller account is awaiting approval.';
const RESELLER_INACTIVE_MESSAGE =
  'Your reseller account is not active. Please contact support.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<AuthResponse | RegisterApprovalResponse> {
    await this.ensureUserDoesNotExist(dto.email, dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prismaService.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        secondaryPhone: dto.secondaryPhone,
        passwordHash,
        role: dto.role,
        OrganizationId: dto.organizationId,
        imageUrl: dto.imageUrl,
        // Always decided server-side. Resellers stay PENDING until an admin
        // approves them; customers keep the existing immediate-login behaviour.
        status: CommonStatus.PENDING,
        pageName: dto.pageName,
        presentDistrict: dto.presentDistrict,
        presentThana: dto.presentThana,
        permanentDistrict: dto.permanentDistrict,
        permanentThana: dto.permanentThana,
      },
    });

    if (user.role === UserRole.RESELLER) {
      // No tokens for a reseller that has not been approved yet.
      return { user: this.sanitizeUser(user), requiresApproval: true };
    }

    return this.issueTokensForUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prismaService.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: dto.email.toLowerCase() }, { phone: dto.email }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify the password before revealing any account-status information.
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertAccountEligible(user);

    return this.issueTokensForUser(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token is not recognized');
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (this.hashToken(refreshToken) !== user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is not recognized');
    }

    // A suspended reseller must not be able to extend their session.
    this.assertAccountEligible(user);

    return this.issueTokensForUser(user);
  }

  async validateAccessToken(payload: AuthPayload): Promise<PublicUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid token');
    }

    // Re-checked on every guarded request so a status change takes effect
    // immediately, without waiting for the access token to expire.
    this.assertAccountEligible(user);

    return this.sanitizeUser(user);
  }

  /**
   * Single source of truth for "may this account use the API?".
   * Resellers must be ACTIVE; every other role keeps the pre-existing rules.
   */
  private assertAccountEligible(user: User) {
    if (user.role === UserRole.RESELLER) {
      if (user.status === CommonStatus.PENDING) {
        throw new ForbiddenException(RESELLER_PENDING_MESSAGE);
      }
      if (user.status !== CommonStatus.ACTIVE) {
        throw new ForbiddenException(RESELLER_INACTIVE_MESSAGE);
      }
      return;
    }

    if (user.status === CommonStatus.DEACTIVATED) {
      throw new ForbiddenException('User account is deactivated');
    }
  }

  private async issueTokensForUser(user: User): Promise<AuthResponse> {
    this.assertAccountEligible(user);
    const tokens = await this.generateTokens(user);
    const refreshTokenExpiresAt = new Date(Date.now() + this.getRefreshTokenLifetimeMs());

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: this.hashToken(tokens.refreshToken),
        refreshTokenExpiresAt,
      },
    });

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  private async generateTokens(user: User): Promise<TokenPair> {
    const payload: AuthPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshSecret = this.configService.get<string>(REFRESH_TOKEN_SECRET) ?? 'dev-refresh-secret';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>(REFRESH_TOKEN_TTL) ?? '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.configService.get<string>(ACCESS_TOKEN_TTL) ?? '1d',
      refreshTokenExpiresIn: this.configService.get<string>(REFRESH_TOKEN_TTL) ?? '7d',
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<AuthPayload> {
    const refreshSecret = this.configService.get<string>(REFRESH_TOKEN_SECRET) ?? 'dev-refresh-secret';

    try {
      return (await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      })) as AuthPayload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private async ensureUserDoesNotExist(email: string, phone: string) {
    const existingUser = await this.prismaService.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: email.toLowerCase() }, { phone }],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }
  }

  private sanitizeUser(user: User): PublicUser {
    const { passwordHash, refreshTokenHash, refreshTokenExpiresAt, ...safeUser } = user;
    return safeUser;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenLifetimeMs() {
    return 7 * 24 * 60 * 60 * 1000;
  }
}