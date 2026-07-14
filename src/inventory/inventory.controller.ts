import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

const INVENTORY_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('adjust')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...INVENTORY_WRITE_ROLES)
  adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }

  @Get('product/:productId')
  @UseGuards(JwtAccessGuard)
  findByProductId(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.findByProductId(productId);
  }

  @Get('product/:productId/transactions')
  @UseGuards(JwtAccessGuard)
  getTransactionHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.inventoryService.getTransactionHistory(productId);
  }
}
