import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { getVerification } from '../user/reseller-verification';

type AuthenticatedRequest = Request & {
  user?: unknown;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    const user = request.user as Record<string, unknown> | undefined;
    return user ? { ...user, verification: getVerification(user) } : user;
  }
}