import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateResellerOrderDto } from './dto/create-reseller-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderService } from './order.service';

import { UpdateCourierSettingDto } from './dto/update-courier-setting.dto';
import { SendToCourierDto, BulkSendCourierDto } from './dto/send-to-courier.dto';

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
];

const RESELLER_ROLES = [
  UserRole.RESELLER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

@Controller('orders')
@UseGuards(JwtAccessGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('courier/balance')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierBalance() {
    return this.orderService.getCourierBalance();
  }

  @Post('bulk-send-to-courier')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  bulkSendToCourier(@Req() req: any, @Body() dto: BulkSendCourierDto) {
    return this.orderService.sendBulkOrdersToCourier(dto, req.user);
  }

  @Post(':id/send-to-courier')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  sendToCourier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendToCourierDto,
  ) {
    return this.orderService.sendOrderToCourier(id, dto, req.user);
  }

  @Post(':id/sync-courier-status')
  syncCourierStatus(@Req() req: any, @Param('id') id: string) {
    return this.orderService.syncCourierStatus(id, req.user);
  }

  @Get('courier-policy')
  getCourierPolicy() {
    return this.orderService.getCourierSetting();
  }

  @Patch('courier-policy')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateCourierPolicy(@Body() dto: UpdateCourierSettingDto) {
    return this.orderService.updateCourierSetting(dto);
  }

  @Get('delivery-settings')
  getDeliverySettings() {
    return this.orderService.getDeliverySettings();
  }

  @Post()
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const customerId = req.user.id;
    return this.orderService.createOrderFromCart(customerId, dto);
  }

  @Post('reseller-checkout')
  @UseGuards(RolesGuard)
  @Roles(...RESELLER_ROLES)
  createResellerOrder(@Req() req: any, @Body() dto: CreateResellerOrderDto) {
    return this.orderService.createResellerOrder(req.user, dto);
  }

  @Get('reseller-stats')
  @UseGuards(RolesGuard)
  @Roles(...RESELLER_ROLES)
  getResellerStats(@Req() req: any) {
    return this.orderService.getResellerStats(req.user);
  }

  @Get()
  getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('processingStatus') processingStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('isResellerOnly') isResellerOnly?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const resellerOnly = isResellerOnly === 'true';
    return this.orderService.getOrders(
      req.user,
      pageNum,
      limitNum,
      search,
      processingStatus,
      paymentStatus,
      resellerOnly,
      startDate,
      endDate,
      customerPhone,
    );
  }

  @Get('export')
  exportOrders(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('processingStatus') processingStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('isResellerOnly') isResellerOnly?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    const resellerOnly = isResellerOnly === 'true';
    return this.orderService.exportOrders(
      req.user,
      search,
      processingStatus,
      paymentStatus,
      resellerOnly,
      startDate,
      endDate,
      customerPhone,
    );
  }

  @Get(':id')
  getOrderById(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getOrderById(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  updateOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto, req.user);
  }
}
