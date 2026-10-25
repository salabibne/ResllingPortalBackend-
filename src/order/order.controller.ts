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
import { Public } from '../auth/decorators/public.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateResellerOrderDto } from './dto/create-reseller-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderService } from './order.service';

import { UpdateCourierSettingDto } from './dto/update-courier-setting.dto';
import { SendToCourierDto, BulkSendCourierDto } from './dto/send-to-courier.dto';
import { CreateCourierPickupDto } from './dto/create-courier-pickup.dto';
import { CreateCourierReturnDto } from './dto/create-courier-return.dto';

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

  /**
   * Public Webhook endpoint for Steadfast Courier to push automated status changes
   */
  @Public()
  @Post('steadfast-webhook')
  handleSteadfastWebhook(@Req() req: any, @Body() body: any) {
    return this.orderService.handleSteadfastWebhook(body, req.headers.authorization);
  }

  /** Public tracking lookup used by the storefront floating widget. */
  @Public()
  @Get('track/:code')
  trackOrder(@Param('code') code: string) {
    return this.orderService.trackPublicOrder(code);
  }

  /**
   * Staff endpoint to sync all in-flight courier orders in one batch
   */
  @Post('sync-all-courier')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  syncAllCourierOrders(@Req() req: any) {
    return this.orderService.syncAllActiveCourierOrders(req.user);
  }

  @Get('courier/balance')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierBalance() {
    return this.orderService.getCourierBalance();
  }

  /**
   * Staff endpoints: courier pickups, returns, invoices, and shipments
   */
  @Post('courier/pickups')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  createCourierPickup(@Req() req: any, @Body() dto: CreateCourierPickupDto) {
    return this.orderService.createCourierPickup(dto, req.user);
  }

  @Get('courier/pickups')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierPickups(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.getCourierPickups(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('courier/police-stations')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getPoliceStations() {
    return this.orderService.getPoliceStations();
  }

  @Get('courier/returns')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierReturns(@Query('page') page?: string) {
    return this.orderService.getCourierReturns(page ? parseInt(page, 10) : 1);
  }

  @Post('courier/returns')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  createCourierReturn(@Req() req: any, @Body() dto: CreateCourierReturnDto) {
    return this.orderService.createCourierReturn(dto, req.user);
  }

  @Get('courier/returns/:id')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierReturn(@Param('id') id: string) {
    return this.orderService.getCourierReturn(id);
  }

  @Get('courier/payments')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierPayments(@Query('page') page?: string) {
    return this.orderService.getCourierPayments(page ? parseInt(page, 10) : 1);
  }

  @Get('courier/payments/:id')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierPayment(@Param('id') id: string) {
    return this.orderService.getCourierPayment(id);
  }

  @Get('courier/track')
  trackCourierParcel(
    @Req() req: any,
    @Query('identifier') identifier?: string,
  ) {
    return this.orderService.trackCourierParcel(identifier || '', req.user);
  }

  @Get('courier/auth-status')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierAuthStatus() {
    return this.orderService.getCourierAuthStatus();
  }

  @Get('courier/shipments')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getCourierShipments(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('courierStatus') courierStatus?: string,
    @Query('consignmentId') consignmentId?: string,
    @Query('shipmentState') shipmentState?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.orderService.getOrders(
      req.user,
      pageNum,
      limitNum,
      search,
      undefined,
      undefined,
      false,
      startDate,
      endDate,
      customerPhone,
      courierStatus,
      consignmentId,
      shipmentState,
    );
  }

  @Get('fraud-check/:phone')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  checkFraudScore(@Param('phone') phone: string) {
    return this.orderService.checkCustomerFraudScore(phone);
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
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  syncCourierStatus(@Req() req: any, @Param('id') id: string) {
    return this.orderService.syncCourierStatus(id, req.user);
  }

  @Get(':id/courier-tracking')
  getCourierTracking(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getOrderTrackingHistory(id, req.user);
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
