import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { ACCESS_TOKEN_SECRET } from '../auth.constants';

import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type AuthenticatedRequest = Request & {
  user?: unknown;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(ACCESS_TOKEN_SECRET) ?? 'dev-access-secret',
      });

      request.user = await this.authService.validateAccessToken(payload);
      return true;
    } catch (error) {
      // Preserve deliberate 403s (e.g. an unapproved reseller) instead of
      // masking every failure as an invalid token.
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer') {
      return null;
    }

    return token ?? null;
  }
}