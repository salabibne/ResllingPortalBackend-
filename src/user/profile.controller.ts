import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

type AuthenticatedRequest = Request & { user: { id: string } };

/** Self-service profile for the signed-in user (used by the reseller panel). */
@Controller('profile')
@UseGuards(JwtAccessGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.profileService.getMe(request.user.id);
  }

  @Patch('me')
  updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMe(request.user.id, dto);
  }
}
