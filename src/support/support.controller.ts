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
  CreateSupportTicketDto,
  SupportTicketQueryDto,
  UpdateSupportTicketStatusDto,
} from './dto/support-ticket.dto';
import { SupportService } from './support.service';

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

@Controller('support')
@UseGuards(JwtAccessGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @Roles(...RESELLER_ROLES)
  createTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @Get('tickets/my')
  @Roles(...RESELLER_ROLES)
  getMyTickets(@Req() req: any, @Query() query: SupportTicketQueryDto) {
    return this.supportService.getMyTickets(req.user.id, query);
  }

  @Get('tickets/my/:id')
  @Roles(...RESELLER_ROLES)
  getMyTicketById(@Req() req: any, @Param('id') id: string) {
    return this.supportService.getTicketById(req.user.id, id, false);
  }

  @Get('tickets/admin/all')
  @Roles(...ADMIN_ROLES)
  getAllTickets(@Query() query: SupportTicketQueryDto) {
    return this.supportService.getAllTickets(query);
  }

  @Get('tickets/admin/:id')
  @Roles(...ADMIN_ROLES)
  getTicketByIdAdmin(@Param('id') id: string) {
    return this.supportService.getTicketById('', id, true);
  }

  @Patch('tickets/admin/:id/status')
  @Roles(...ADMIN_ROLES)
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketStatusDto,
  ) {
    return this.supportService.updateTicketStatus(id, dto);
  }
}
