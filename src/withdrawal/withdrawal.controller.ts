import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CompleteWithdrawalDto,
  CreateWithdrawalDto,
  RejectWithdrawalDto,
  WithdrawalQueryDto,
} from './dto/withdrawal.dto';
import { WithdrawalService } from './withdrawal.service';

const RESELLER_ROLES = [
  UserRole.RESELLER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('withdrawals')
@UseGuards(JwtAccessGuard, RolesGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  // ─── RESELLER ENDPOINTS ─────────────────────────────────────────────

  @Post('request')
  @Roles(...RESELLER_ROLES)
  createRequest(@Req() req: any, @Body() dto: CreateWithdrawalDto) {
    const resellerId = req.user.id;
    return this.withdrawalService.createWithdrawalRequest(resellerId, dto);
  }

  @Get('my-withdrawals')
  @Roles(...RESELLER_ROLES)
  getMyWithdrawals(@Req() req: any, @Query() query: WithdrawalQueryDto) {
    const resellerId = req.user.id;
    return this.withdrawalService.getMyWithdrawals(resellerId, query);
  }

  @Get('wallet-summary')
  @Roles(...RESELLER_ROLES)
  getWalletSummary(@Req() req: any) {
    const resellerId = req.user.id;
    return this.withdrawalService.getResellerWalletSummary(resellerId);
  }

  @Patch(':id/cancel')
  @Roles(...RESELLER_ROLES)
  cancelWithdrawal(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const resellerId = req.user.id;
    return this.withdrawalService.cancelWithdrawal(resellerId, id);
  }

  // ─── ADMIN ENDPOINTS ────────────────────────────────────────────────

  @Get('admin/all')
  @Roles(...ADMIN_ROLES)
  getAllAdmin(@Query() query: WithdrawalQueryDto) {
    return this.withdrawalService.getAllWithdrawalsAdmin(query);
  }

  @Patch('admin/:id/complete')
  @Roles(...ADMIN_ROLES)
  completeAdmin(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteWithdrawalDto,
  ) {
    const adminId = req.user.id;
    return this.withdrawalService.completeWithdrawalAdmin(adminId, id, dto);
  }

  @Patch('admin/:id/reject')
  @Roles(...ADMIN_ROLES)
  rejectAdmin(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    const adminId = req.user.id;
    return this.withdrawalService.rejectWithdrawalAdmin(adminId, id, dto);
  }
}
