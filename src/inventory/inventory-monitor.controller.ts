import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryMonitorService } from './inventory-monitor.service';
import {
  DashboardQueryDto,
  LowStockQueryDto,
  TransactionLogQueryDto,
  ProductSummaryQueryDto,
} from './dto/monitor-inventory.dto';

const MONITOR_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('inventory/monitor')
export class InventoryMonitorController {
  constructor(private readonly monitorService: InventoryMonitorService) {}

  @Get('dashboard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MONITOR_ROLES)
  getDashboard(@Query() dto: DashboardQueryDto) {
    return this.monitorService.getDashboard(dto);
  }

  @Get('low-stock')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MONITOR_ROLES)
  getLowStock(@Query() dto: LowStockQueryDto) {
    return this.monitorService.getLowStock(dto);
  }

  @Get('transactions')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MONITOR_ROLES)
  getTransactionLog(@Query() dto: TransactionLogQueryDto) {
    return this.monitorService.getTransactionLog(dto);
  }

  @Get('product-summary')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MONITOR_ROLES)
  getProductSummary(@Query() dto: ProductSummaryQueryDto) {
    return this.monitorService.getProductSummary(dto);
  }
}
