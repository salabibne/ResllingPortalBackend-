import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  InventoryTxPurpose,
  InventoryTxType,
  OrderProcessingStatus,
  PaymentStatus,
  UserRole,
} from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateResellerOrderDto } from './dto/create-reseller-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateCourierSettingDto } from './dto/update-courier-setting.dto';
import { SendToCourierDto, BulkSendCourierDto } from './dto/send-to-courier.dto';
import { CreateCourierPickupDto } from './dto/create-courier-pickup.dto';
import { CreateCourierReturnDto } from './dto/create-courier-return.dto';
import { SteadfastService } from './steadfast.service';
import {
  COURIER_STATUS_GROUPS,
  CourierStatusGroup,
  courierGroupOf,
  courierGroupWhere,
  effectiveCourierStatus,
  isCourierStatusGroup,
  profitBucket,
} from './courier-status.util';

/** Internal status change used by the courier sync / webhook restock flow. */
type InternalStatusUpdate = {
  processingStatus?: OrderProcessingStatus;
  paymentStatus?: PaymentStatus;
};

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steadfastService: SteadfastService,
  ) {}

  /** Guards the scheduled courier sync against overlapping runs. */
  private courierSyncRunning = false;

  /**
   * Public, capability-style tracking lookup. Returns only status data — never
   * the customer's name, phone, address or order value.
   */
  async trackPublicOrder(code: string) {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Enter a tracking code');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderRef: trimmed },
          { courierTrackingCode: trimmed },
          { courierConsignmentId: trimmed },
        ],
      },
      select: {
        orderRef: true,
        paymentStatus: true,
        courierStatus: true,
        courierTrackingLink: true,
        courierSubmittedAt: true,
        courierLastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('No order matches that tracking code');
    }

    return { ...order, status: effectiveCourierStatus(order) };
  }

  async onModuleInit() {
    await this.backfillOrderRefs();
    await this.backfillCourierStatuses();
  }

  /**
   * The courier status is the only status shown to users. Orders that were
   * closed by hand before that change have no courier status, so carry their
   * old outcome over instead of letting them fall back to "Order Placed".
   */
  private async backfillCourierStatuses() {
    try {
      await this.prisma.order.updateMany({
        where: {
          courierStatus: null,
          processingStatus: {
            in: [OrderProcessingStatus.CANCELLED, OrderProcessingStatus.RETURNED],
          },
        },
        data: { courierStatus: 'cancelled' },
      });
      await this.prisma.order.updateMany({
        where: {
          courierStatus: null,
          processingStatus: OrderProcessingStatus.DELIVERED,
        },
        data: { courierStatus: 'delivered' },
      });
    } catch (err) {
      console.error('Error backfilling courier statuses:', err);
    }
  }

  /**
   * Backfill orderRef for existing orders missing an order reference
   */
  private async backfillOrderRefs() {
    try {
      const unreferencedOrders = await this.prisma.order.findMany({
        where: { orderRef: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      });

      if (!unreferencedOrders || unreferencedOrders.length === 0) return;

      let baseSeq = 10001;
      const existingCount = await this.prisma.order.count({
        where: { orderRef: { not: null } },
      });
      baseSeq += existingCount;

      for (let i = 0; i < unreferencedOrders.length; i++) {
        const ord = unreferencedOrders[i];
        const dateStr = new Date(ord.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
        const seqStr = (baseSeq + i).toString();
        const orderRef = `ORD-${dateStr}-${seqStr}`;

        await this.prisma.order.update({
          where: { id: ord.id },
          data: { orderRef },
        });
      }
    } catch (err) {
      console.error('Error backfilling orderRef:', err);
    }
  }

  /**
   * Generate a unique, human-readable order reference number
   */
  private async generateOrderRef(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let attempts = 0;
    while (attempts < 10) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const ref = `ORD-${dateStr}-${randomSuffix}`;
      const existing = await this.prisma.order.findUnique({ where: { orderRef: ref } });
      if (!existing) return ref;
      attempts++;
    }
    return `ORD-${Date.now()}`;
  }

  /**
   * Get dynamic courier charge text & settings configured by Admin
   */
  async getCourierSetting() {
    let setting = await this.prisma.courierSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.courierSetting.create({
        data: {
          title: 'Courier Charge Policy',
          chargeText:
            'Inside Dhaka City: ৳70 | Sub-Urban Dhaka: ৳100 | Outside Dhaka: ৳130. Advance courier fee is collected by reseller if applicable.',
          defaultCharge: 120,
        },
      });
    }
    return setting;
  }

  /**
   * Update courier charge text & settings (Admin only)
   */
  async updateCourierSetting(dto: UpdateCourierSettingDto) {
    const existing = await this.getCourierSetting();
    return this.prisma.courierSetting.update({
      where: { id: existing.id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.chargeText && { chargeText: dto.chargeText }),
        ...(dto.defaultCharge !== undefined && { defaultCharge: dto.defaultCharge }),
      },
    });
  }

  /**
   * Get delivery options configured for reseller and standard checkout
   */
  async getDeliverySettings() {
    return [
      { id: 'inside_dhaka', name: 'Inside Dhaka', charge: 70 },
      { id: 'sub_urban', name: 'Sub-Urban Dhaka', charge: 100 },
      { id: 'outside_dhaka', name: 'Outside Dhaka', charge: 130 },
    ];
  }

  /**
   * Create a Reseller Order directly on behalf of an end-customer.
   */
  async createResellerOrder(resellerUser: any, dto: CreateResellerOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    let resellerSubtotal = 0;
    let resellerSellPriceTotal = 0;

    const validatedItems: any[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product not found (ID: ${item.productId})`);
      }

      const inventory = await this.prisma.inventory.findFirst({
        where: {
          productId: item.productId,
          productSizeId: item.productSizeId || null,
        },
      });

      if (!inventory) {
        throw new BadRequestException(
          `Inventory record not found for product "${product.name}"`,
        );
      }

      if (inventory.currentStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${inventory.currentStock}, Requested: ${item.quantity}`,
        );
      }

      const purchasePrice = Number(product.purchasePrice || 0);
      const resellerWholesalePrice = Number(product.resellerPrice || product.newPrice || 0);
      
      const isCustomPrice = Boolean(
        item.resellerSellingPrice &&
        Number(item.resellerSellingPrice) > 0 &&
        Number(item.resellerSellingPrice) !== resellerWholesalePrice
      );
      const finalSellingPrice = isCustomPrice
        ? Number(item.resellerSellingPrice)
        : resellerWholesalePrice;

      if (isCustomPrice && finalSellingPrice < resellerWholesalePrice) {
        throw new BadRequestException(
          `Selling price for "${product.name}" (৳${finalSellingPrice}) cannot be less than reseller wholesale price (৳${resellerWholesalePrice})`,
        );
      }

      const itemSubtotalWholesale = resellerWholesalePrice * item.quantity;
      const itemSubtotalSell = finalSellingPrice * item.quantity;

      resellerSubtotal += itemSubtotalWholesale;
      resellerSellPriceTotal += itemSubtotalSell;

      const itemProfit = (finalSellingPrice - purchasePrice) * item.quantity;

      validatedItems.push({
        productId: item.productId,
        productSizeId: item.productSizeId || null,
        productColorId: item.productColorId || null,
        quantity: item.quantity,
        snapshotPrice: product.newPrice,
        resellerUnitCost: resellerWholesalePrice,
        resellerSellingPrice: isCustomPrice ? finalSellingPrice : null,
        itemProfit,
        subtotal: itemSubtotalWholesale,
        inventoryId: inventory.id,
        currentStock: inventory.currentStock,
        productName: product.name,
      });
    }

    const resellerProfit = validatedItems.reduce((sum, item) => sum + item.itemProfit, 0);
    const nominalCourierCharge = Number(dto.courierCharge || 0);
    const effectiveCourierCharge = dto.isAdvanceCourierPaid ? 0 : nominalCourierCharge;
    const grandTotal = Number((resellerSubtotal + effectiveCourierCharge).toFixed(2));

    const fullShippingAddress = `${dto.shippingAddress}, ${dto.customerThana}, ${dto.customerDistrict}`;
    const orderRef = await this.generateOrderRef();

    // Perform atomic Order Creation & Inventory Deduction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderRef,
          customerId: resellerUser.id,
          isResellerOrder: true,
          resellerId: resellerUser.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerSecondaryPhone: dto.customerSecondaryPhone || null,
          customerDistrict: dto.customerDistrict,
          customerThana: dto.customerThana,
          shippingAddress: fullShippingAddress,
          resellerSubtotal,
          resellerSellPrice: resellerSellPriceTotal,
          resellerProfit,
          isAdvanceCourierPaid: !!dto.isAdvanceCourierPaid,
          advanceCourierAmount: Number(dto.advanceCourierAmount || 0),
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'DUE',
          processingStatus: 'PENDING',
          subtotal: resellerSubtotal,
          courierCharge: effectiveCourierCharge,
          discount: 0,
          total: grandTotal,
          notes: dto.notes || null,
          orderItems: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              productSizeId: vi.productSizeId,
              productColorId: vi.productColorId,
              quantity: vi.quantity,
              snapshotPrice: vi.snapshotPrice,
              resellerUnitCost: vi.resellerUnitCost,
              resellerSellingPrice: vi.resellerSellingPrice,
              subtotal: vi.subtotal,
            })),
          },
        },
        include: {
          reseller: {
            select: { id: true, name: true, email: true, phone: true, pageName: true },
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
              productSize: {
                include: { size: { select: { id: true, name: true } } },
              },
              productColor: {
                include: {
                  color: { select: { id: true, name: true, colorCode: true } },
                },
              },
            },
          },
        },
      });

      // Deduct stock from Inventory & Create InventoryTransaction (STOCK_OUT / SELL)
      for (const item of validatedItems) {
        const stockBefore = item.currentStock;
        const stockAfter = stockBefore - item.quantity;

        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { currentStock: stockAfter },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: item.inventoryId,
            transactionQuantity: item.quantity,
            stockBefore,
            stockAfter,
            stockType: InventoryTxType.STOCK_OUT,
            purpose: InventoryTxPurpose.SELL,
            reference: `RESELLER-ORDER-${createdOrder.orderRef || createdOrder.id.substring(0, 8).toUpperCase()}`,
            performedBy: resellerUser.id,
            notes: `Reseller Order #${createdOrder.orderRef || createdOrder.id} placed for customer ${dto.customerName}`,
          },
        });
      }

      return createdOrder;
    });

    return order;
  }

  /**
   * Get reseller metrics and performance summary
   */
  async getResellerStats(user: any) {
    const resellerId = user.id;

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ resellerId: resellerId }, { customerId: resellerId }],
        isResellerOrder: true,
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: { purchasePrice: true, resellerPrice: true, newPrice: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalOrders = orders.length;
    let orderPlacedOrders = 0;
    let pendingOrders = 0;
    let inTransitOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let totalResellerProfit = 0;
    let pendingResellerProfit = 0;
    let totalResellerSales = 0;
    let totalWholesaleCost = 0;

    for (const ord of orders) {
      switch (courierGroupOf(ord.courierStatus)) {
        case 'ORDER_PLACED':
          orderPlacedOrders++;
          break;
        case 'PENDING':
          pendingOrders++;
          break;
        case 'IN_TRANSIT':
          inTransitOrders++;
          break;
        case 'DELIVERED':
        case 'PARTIAL':
          deliveredOrders++;
          break;
        case 'CANCELLED':
          cancelledOrders++;
          break;
      }

      // Compute reseller profit for this order
      let orderProfit = 0;
      if (
        ord.resellerProfit !== null &&
        ord.resellerProfit !== undefined &&
        Number(ord.resellerProfit) > 0
      ) {
        orderProfit = Number(ord.resellerProfit);
      } else {
        // Fallback calculation per item if resellerProfit column was null/0 on legacy order
        for (const item of ord.orderItems) {
          const purchasePrice = Number(item.product?.purchasePrice || 0);
          const resellerPrice = Number(
            item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
          );
          const sellingPrice = Number(item.resellerSellingPrice || resellerPrice);
          const itemProfit = (sellingPrice - purchasePrice) * item.quantity;
          orderProfit += itemProfit;
        }
      }

      const bucket = profitBucket(ord);
      if (bucket === 'EARNED') {
        totalResellerProfit += orderProfit;
      } else if (bucket === 'PENDING') {
        pendingResellerProfit += orderProfit;
      }

      totalResellerSales += Number(ord.resellerSellPrice || ord.total || 0);
      totalWholesaleCost += Number(ord.resellerSubtotal || ord.subtotal || 0);
    }

    return {
      totalOrders,
      orderPlacedOrders,
      pendingOrders,
      inTransitOrders,
      deliveredOrders,
      cancelledOrders,
      totalResellerProfit,
      pendingResellerProfit,
      totalResellerSales,
      totalWholesaleCost,
    };
  }

  /**
   * Create an Order from the customer's active Cart and perform STOCK_OUT inventory adjustments.
   */
  async createOrderFromCart(customerId: string, dto: CreateOrderDto) {
    // 1. Fetch active cart
    const cart = await this.prisma.cart.findFirst({
      where: { customerId, status: 'active' },
      include: {
        cartItems: {
          include: {
            product: true,
            productSize: true,
            productColor: true,
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // 2. Validate stock availability for each item in cart
    for (const item of cart.cartItems) {
      const inventory = await this.prisma.inventory.findFirst({
        where: {
          productId: item.productId,
          productSizeId: item.productSizeId || null,
        },
      });

      if (!inventory) {
        throw new BadRequestException(
          `Inventory record not found for product "${item.product.name}"`,
        );
      }

      if (inventory.currentStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${inventory.currentStock}, Requested: ${item.quantity}`,
        );
      }
    }

    // 3. Compute Totals
    const subtotal = cart.cartItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    const courierCharge = dto.courierCharge ?? Number(cart.courierCharge || 0);
    const discount = dto.discount ?? 0;
    const grandTotal = Number((subtotal + courierCharge - discount).toFixed(2));
    const orderRef = await this.generateOrderRef();

    // 4. Perform atomic Order Creation & Inventory Deduction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create Order
      const createdOrder = await tx.order.create({
        data: {
          orderRef,
          cartId: cart.id,
          customerId,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'DUE',
          processingStatus: 'PENDING',
          subtotal,
          courierCharge,
          discount,
          total: grandTotal,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          orderItems: {
            create: cart.cartItems.map((ci) => ({
              productId: ci.productId,
              productSizeId: ci.productSizeId,
              productColorId: ci.productColorId,
              quantity: ci.quantity,
              snapshotPrice: ci.unitPrice,
              subtotal: ci.subtotal,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
              productSize: {
                include: { size: { select: { id: true, name: true } } },
              },
              productColor: {
                include: {
                  color: { select: { id: true, name: true, colorCode: true } },
                },
              },
            },
          },
        },
      });

      // Deduct stock from Inventory & Create InventoryTransaction (STOCK_OUT / SELL)
      for (const item of cart.cartItems) {
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            productSizeId: item.productSizeId || null,
          },
        });

        if (inv) {
          const stockBefore = inv.currentStock;
          const stockAfter = stockBefore - item.quantity;

          // Update Inventory stock
          await tx.inventory.update({
            where: { id: inv.id },
            data: { currentStock: stockAfter },
          });

          // Record Inventory Transaction
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              transactionQuantity: item.quantity,
              stockBefore,
              stockAfter,
              stockType: InventoryTxType.STOCK_OUT,
              purpose: InventoryTxPurpose.SELL,
              reference: `ORDER-${createdOrder.orderRef || createdOrder.id.substring(0, 8).toUpperCase()}`,
              performedBy: customerId,
              notes: `Order #${createdOrder.orderRef || createdOrder.id} placed by customer`,
            },
          });
        }
      }

      // Mark cart as ordered
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'ordered' },
      });

      return createdOrder;
    });

    return order;
  }

  /**
   * Get list of orders (Filtered by customer for regular users, reseller for resellers, all for staff)
   */
  async getOrders(
    user: any,
    page = 1,
    limit = 20,
    search?: string,
    paymentStatus?: string,
    isResellerOnly?: boolean,
    startDate?: string,
    endDate?: string,
    customerPhone?: string,
    courierStatus?: string,
    consignmentId?: string,
    shipmentState?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = this.buildOrderScopeWhere(user, isResellerOnly);

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }

    // Order status filter — the courier status is the only order status.
    if (courierStatus && courierStatus !== 'ALL') {
      if (isCourierStatusGroup(courierStatus)) {
        where.AND = [...(where.AND || []), courierGroupWhere(courierStatus)];
      } else if (courierStatus === 'NOT_SENT') {
        where.courierConsignmentId = null;
        where.courierTrackingCode = null;
      } else if (courierStatus === 'RETURNED') {
        where.courierStatus = { contains: 'return', mode: 'insensitive' };
      } else {
        where.courierStatus = courierStatus.toLowerCase();
      }
    }

    if (consignmentId && consignmentId.trim() !== '') {
      where.courierConsignmentId = {
        contains: consignmentId.trim(),
        mode: 'insensitive',
      };
    }

    if (shipmentState) {
      switch (shipmentState) {
        case 'NOT_BOOKED':
          where.courierConsignmentId = null;
          where.courierTrackingCode = null;
          break;
        case 'BOOKED':
          where.courierConsignmentId = { not: null };
          break;
        case 'BOOKING':
        case 'FAILED':
        case 'UNCERTAIN':
          where.courierBookingState = shipmentState;
          break;
      }
    }

    // Date Range / Single Date Filter
    if (startDate || endDate) {
      const sDateStr = startDate || endDate;
      const eDateStr = endDate || startDate;
      const start = new Date(`${sDateStr}T00:00:00.000Z`);
      const end = new Date(`${eDateStr}T23:59:59.999Z`);
      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // Customer Phone Filter
    if (customerPhone && customerPhone.trim() !== '') {
      const phoneClean = customerPhone.trim();
      const phoneCondition = [
        { customerPhone: { contains: phoneClean, mode: 'insensitive' } },
        { customerSecondaryPhone: { contains: phoneClean, mode: 'insensitive' } },
        { customer: { phone: { contains: phoneClean, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        // Wrap existing OR inside AND logic
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: phoneCondition },
        ];
        delete where.OR;
      } else {
        where.OR = phoneCondition;
      }
    }

    if (search && search.trim() !== '') {
      const searchClean = search.trim();
      const isUuidSearch =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          searchClean,
        );
      const searchCondition: any[] = [
        { orderRef: { contains: searchClean, mode: 'insensitive' } },
        { customerName: { contains: searchClean, mode: 'insensitive' } },
        { customerPhone: { contains: searchClean, mode: 'insensitive' } },
        { shippingAddress: { contains: searchClean, mode: 'insensitive' } },
        { courierConsignmentId: { contains: searchClean, mode: 'insensitive' } },
        { courierTrackingCode: { contains: searchClean, mode: 'insensitive' } },
      ];
      // UUID columns do not support LIKE/contains in Postgres
      if (isUuidSearch) {
        searchCondition.push({ id: searchClean });
      }
      if (where.OR) {
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true, role: true, pageName: true },
          },
          reseller: {
            select: { id: true, name: true, email: true, phone: true, pageName: true },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  resellerPrice: true,
                  newPrice: true,
                  purchasePrice: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
              productSize: {
                include: { size: { select: { id: true, name: true } } },
              },
              productColor: {
                include: {
                  color: { select: { id: true, name: true, colorCode: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const mappedData = data.map((ord) => {
      let resellerProfit = Number(ord.resellerProfit || 0);
      let resellerSellPrice = Number(ord.resellerSellPrice || 0);
      let resellerSubtotal = Number(ord.resellerSubtotal || ord.subtotal || 0);

      if (ord.isResellerOrder || ord.resellerId) {
        if (resellerSellPrice === 0) {
          resellerSellPrice = (ord.orderItems || []).reduce((sum, item) => {
            const sellingPrice = Number(
              item.resellerSellingPrice || item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
            );
            return sum + sellingPrice * item.quantity;
          }, 0);
        }

        if (resellerSubtotal === 0) {
          resellerSubtotal = (ord.orderItems || []).reduce((sum, item) => {
            const wholesalePrice = Number(
              item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
            );
            return sum + wholesalePrice * item.quantity;
          }, 0);
        }

        if (resellerProfit === 0) {
          let computedProfit = 0;
          for (const item of ord.orderItems || []) {
            const purchasePrice = Number(item.product?.purchasePrice || 0);
            const resellerPrice = Number(
              item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
            );
            const sellingPrice = Number(item.resellerSellingPrice || resellerPrice);
            computedProfit += (sellingPrice - purchasePrice) * item.quantity;
          }
          resellerProfit = computedProfit;
        }
      }

      return {
        ...ord,
        resellerProfit,
        resellerSellPrice,
        resellerSubtotal,
      };
    });

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export all matching orders without pagination limits for CSV download
   */
  async exportOrders(
    user: any,
    search?: string,
    paymentStatus?: string,
    isResellerOnly?: boolean,
    startDate?: string,
    endDate?: string,
    customerPhone?: string,
    courierStatus?: string,
    consignmentId?: string,
    shipmentState?: string,
  ) {
    const res = await this.getOrders(
      user,
      1,
      100000,
      search,
      paymentStatus,
      isResellerOnly,
      startDate,
      endDate,
      customerPhone,
      courierStatus,
      consignmentId,
      shipmentState,
    );
    return res.data;
  }

  /**
   * Which orders a user may see: staff see all, resellers see their own,
   * customers see the orders they placed.
   */
  private buildOrderScopeWhere(user: any, isResellerOnly?: boolean): any {
    const where: any = {};

    if (this.isStaffUser(user)) {
      if (isResellerOnly) {
        where.isResellerOrder = true;
      }
    } else if (user.role === UserRole.RESELLER) {
      where.OR = [{ resellerId: user.id }, { customerId: user.id }];
      if (isResellerOnly) {
        where.isResellerOrder = true;
      }
    } else {
      where.customerId = user.id;
    }

    return where;
  }

  /**
   * Order counts per courier status group, scoped to what the user may see.
   */
  async getOrderStatusSummary(user: any, isResellerOnly?: boolean) {
    const scope = this.buildOrderScopeWhere(user, isResellerOnly);
    const [total, ...counts] = await Promise.all([
      this.prisma.order.count({ where: scope }),
      ...COURIER_STATUS_GROUPS.map((group) =>
        this.prisma.order.count({
          where: { AND: [scope, courierGroupWhere(group)] },
        }),
      ),
    ]);

    const summary = { total } as { total: number } & Record<CourierStatusGroup, number>;
    COURIER_STATUS_GROUPS.forEach((group, i) => {
      summary[group] = counts[i];
    });
    return summary;
  }


  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string, user: any) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const order = await this.prisma.order.findFirst({
      where: isUuid
        ? { OR: [{ id: orderId }, { orderRef: orderId }] }
        : { orderRef: orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, pageName: true },
        },
        reseller: {
          select: { id: true, name: true, email: true, phone: true, pageName: true },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                resellerPrice: true,
                newPrice: true,
                purchasePrice: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            productSize: {
              include: { size: { select: { id: true, name: true } } },
            },
            productColor: {
              include: {
                color: { select: { id: true, name: true, colorCode: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isStaff = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES_EXECUTIVE,
    ].includes(user.role);

    if (!isStaff && order.customerId !== user.id && order.resellerId !== user.id) {
      throw new ForbiddenException('Access denied to this order');
    }

    let resellerProfit = Number(order.resellerProfit || 0);
    let resellerSellPrice = Number(order.resellerSellPrice || 0);
    let resellerSubtotal = Number(order.resellerSubtotal || order.subtotal || 0);

    if (order.isResellerOrder || order.resellerId) {
      if (resellerSellPrice === 0) {
        resellerSellPrice = (order.orderItems || []).reduce((sum, item) => {
          const sellingPrice = Number(
            item.resellerSellingPrice || item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
          );
          return sum + sellingPrice * item.quantity;
        }, 0);
      }

      if (resellerSubtotal === 0) {
        resellerSubtotal = (order.orderItems || []).reduce((sum, item) => {
          const wholesalePrice = Number(
            item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
          );
          return sum + wholesalePrice * item.quantity;
        }, 0);
      }

      if (resellerProfit === 0) {
        let computedProfit = 0;
        for (const item of order.orderItems || []) {
          const purchasePrice = Number(item.product?.purchasePrice || 0);
          const resellerPrice = Number(
            item.resellerUnitCost || item.product?.resellerPrice || item.snapshotPrice || 0,
          );
          const sellingPrice = Number(item.resellerSellingPrice || resellerPrice);
          computedProfit += (sellingPrice - purchasePrice) * item.quantity;
        }
        resellerProfit = computedProfit;
      }
    }

    return {
      ...order,
      resellerProfit,
      resellerSellPrice,
      resellerSubtotal,
    };
  }

  /**
   * Update payment status (Admin/Staff only). The order status itself comes
   * from the courier and is not editable here.
   */
  async updatePaymentStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    staffUser: any,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        orderProcessedBy: staffUser.id,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        orderItems: true,
      },
    });
  }

  /**
   * Cancel an order that has not been handed to the courier yet (Admin/Staff only).
   * Stock is NOT restored automatically — staff restock by hand from Inventory.
   */
  async cancelOrder(orderId: string, staffUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.courierConsignmentId || order.courierTrackingCode) {
      throw new ConflictException(
        'This order is already booked with Steadfast. Cancel it with the courier; its status will update automatically.',
      );
    }

    if (courierGroupOf(order.courierStatus) === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierStatus: 'cancelled',
        processingStatus: OrderProcessingStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
        orderProcessedBy: staffUser.id,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        orderItems: true,
      },
    });
  }

  /**
   * Internal status change used by the courier sync / webhook flow; adjusts
   * Inventory on CANCELLED / RETURNED.
   */
  private async updateOrderStatus(
    orderId: string,
    dto: InternalStatusUpdate,
    staffUser: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRestockStatus = (status?: string) =>
      status === 'CANCELLED' || status === 'RETURNED';

    const wasRestocked = isRestockStatus(order.processingStatus);
    const willBeRestocked = isRestockStatus(dto.processingStatus);

    return this.prisma.$transaction(async (tx) => {
      // 1. If transitioning from active -> CANCELLED/RETURNED, restore stock (STOCK_IN)
      if (!wasRestocked && willBeRestocked && dto.processingStatus) {
        for (const item of order.orderItems) {
          const inv = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              productSizeId: item.productSizeId || null,
            },
          });

          if (inv) {
            const stockBefore = inv.currentStock;
            const stockAfter = stockBefore + item.quantity;

            await tx.inventory.update({
              where: { id: inv.id },
              data: { currentStock: stockAfter },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                transactionQuantity: item.quantity,
                stockBefore,
                stockAfter,
                stockType: InventoryTxType.STOCK_IN,
                purpose: InventoryTxPurpose.RETURN,
                reference: `${dto.processingStatus}-ORDER-${order.id.substring(0, 8).toUpperCase()}`,
                performedBy: staffUser.id,
                notes: `Order #${order.id} status changed to ${dto.processingStatus}`,
              },
            });
          }
        }
      }

      // 2. If transitioning from CANCELLED/RETURNED -> active status, re-deduct stock (STOCK_OUT)
      if (wasRestocked && dto.processingStatus && !willBeRestocked) {
        // Validate stock availability first
        for (const item of order.orderItems) {
          const inv = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              productSizeId: item.productSizeId || null,
            },
          });

          if (!inv || inv.currentStock < item.quantity) {
            throw new BadRequestException(
              `Cannot reactivate order. Insufficient stock for product ID "${item.productId}". Available: ${inv?.currentStock || 0}, Required: ${item.quantity}`,
            );
          }
        }

        // Deduct stock
        for (const item of order.orderItems) {
          const inv = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              productSizeId: item.productSizeId || null,
            },
          });

          if (inv) {
            const stockBefore = inv.currentStock;
            const stockAfter = stockBefore - item.quantity;

            await tx.inventory.update({
              where: { id: inv.id },
              data: { currentStock: stockAfter },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                transactionQuantity: item.quantity,
                stockBefore,
                stockAfter,
                stockType: InventoryTxType.STOCK_OUT,
                purpose: InventoryTxPurpose.SELL,
                reference: `REACTIVATE-ORDER-${order.id.substring(0, 8).toUpperCase()}`,
                performedBy: staffUser.id,
                notes: `Order #${order.id} status updated from ${order.processingStatus} to ${dto.processingStatus}`,
              },
            });
          }
        }
      }

      // 3. Update order status in DB
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(dto.processingStatus && { processingStatus: dto.processingStatus }),
          ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
          orderProcessedBy: staffUser.id,
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          orderItems: true,
        },
      });

      return updated;
    });
  }

  /**
   * Helper to calculate expected COD amount for an order
   */
  private calculateCodAmount(order: any, customCod?: number): number {
    if (customCod !== undefined && customCod !== null) {
      return Math.max(0, Math.round(Number(customCod)));
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return 0;
    }

    let baseAmount = Number(order.total || 0);

    // If it's a reseller order with customer sell price specified
    if (order.isResellerOrder && order.resellerSellPrice) {
      baseAmount = Number(order.resellerSellPrice) + Number(order.courierCharge || 0);
    }

    // Deduct advance courier payment if already collected
    if (order.isAdvanceCourierPaid && order.advanceCourierAmount) {
      baseAmount -= Number(order.advanceCourierAmount);
    }

    return Math.max(0, Math.round(baseAmount));
  }

  /**
   * Send single order to Steadfast Courier
   */
  async sendOrderToCourier(
    orderId: string,
    dto: SendToCourierDto,
    staffUser: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        reseller: true,
        orderItems: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.courierConsignmentId || order.courierTrackingCode) {
      throw new ConflictException(
        `Order is already booked with Steadfast (consignment ${order.courierConsignmentId || 'N/A'}, tracking ${order.courierTrackingCode || 'N/A'}). Refresh its status instead of booking again.`,
      );
    }

    if (courierGroupOf(order.courierStatus) === 'CANCELLED') {
      throw new BadRequestException('Cancelled orders cannot be sent to the courier.');
    }

    const claimed = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        courierConsignmentId: null,
        courierTrackingCode: null,
        OR: [{ courierBookingState: null }, { courierBookingState: 'FAILED' }],
      },
      data: {
        courierBookingState: 'BOOKING',
        orderProcessedBy: staffUser.id,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictException(
        'A courier booking is already in progress or the order has already been booked.',
      );
    }

    const recipientName =
      order.customerName || order.customer?.name || 'Customer';
    const recipientPhone =
      order.customerPhone || order.customer?.phone || '';
    const altPhone =
      order.customerSecondaryPhone || order.customer?.secondaryPhone || undefined;
    const recipientEmail = order.customer?.email || undefined;

    const addressParts = [
      order.shippingAddress,
      order.customerThana,
      order.customerDistrict,
    ].filter(Boolean);
    const recipientAddress =
      addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';

    const codAmount = this.calculateCodAmount(order, dto.codAmount);
    const invoice = order.orderRef || order.id;

    const itemDesc = order.orderItems
      ?.map(
        (i) =>
          `${i.product?.name || 'Product'} (x${i.quantity})`,
      )
      .join(', ');
    const totalLot = order.orderItems?.reduce((acc, i) => acc + i.quantity, 0) || 1;

    try {
      const response = await this.steadfastService.createOrder({
        invoice,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        alternative_phone: altPhone,
        recipient_email: recipientEmail,
        recipient_address: recipientAddress,
        cod_amount: codAmount,
        note: dto.note || order.notes || undefined,
        item_description: itemDesc,
        total_lot: totalLot,
        delivery_type: dto.deliveryType !== undefined ? dto.deliveryType : 0,
      });

      const consignment = response.consignment;

      if (!consignment?.consignment_id || !consignment?.tracking_code) {
        throw new BadGatewayException(
          'Steadfast did not return a consignment ID and tracking code for this booking.',
        );
      }

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          courierProvider: 'STEADFAST',
          courierConsignmentId: String(consignment.consignment_id),
          courierTrackingCode: consignment.tracking_code,
          courierTrackingLink: consignment.tracking_link || null,
          courierCodAmount: codAmount,
          courierStatus: consignment.status || 'in_review',
          courierSubmittedAt: new Date(),
          courierLastSyncedAt: new Date(),
          courierDeliveryType: dto.deliveryType !== undefined ? dto.deliveryType : 0,
          courierNotes: dto.note || null,
          courierBookingState: 'BOOKED',
          processingStatus:
            order.processingStatus === OrderProcessingStatus.PENDING ||
            order.processingStatus === OrderProcessingStatus.CONFIRMED
              ? OrderProcessingStatus.SHIPPED
              : order.processingStatus,
          orderProcessedBy: staffUser.id,
        },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          reseller: { select: { id: true, name: true, email: true, phone: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      return {
        message: 'Order placed to Steadfast Courier successfully',
        order: updated,
        consignment,
      };
    } catch (err: any) {
      const message = err?.message || 'Steadfast booking failed';
      const isAmbiguous =
        err instanceof GatewayTimeoutException ||
        err instanceof BadGatewayException ||
        this.isDuplicateInvoiceError(message);

      await this.setBookingState(order.id, isAmbiguous ? 'UNCERTAIN' : 'FAILED');

      if (isAmbiguous) {
        throw new ConflictException(
          `Booking for invoice ${invoice} may have been created, but the Steadfast response was inconclusive. Reconcile the invoice with Steadfast before retrying.`,
        );
      }

      throw err;
    }
  }

  private isDuplicateInvoiceError(message: string): boolean {
    return /invoice/i.test(message) && /(already|exist|duplicate|used)/i.test(message);
  }

  private async setBookingState(orderId: string, state: 'FAILED' | 'UNCERTAIN') {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { courierBookingState: state },
      });
    } catch (err: any) {
      console.error(
        `Failed to persist courier booking state ${state} for order ${orderId}: ${err?.message}`,
      );
    }
  }

  /**
   * Bulk send orders to Steadfast Courier
   */
  async sendBulkOrdersToCourier(dto: BulkSendCourierDto, staffUser: any) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('No order IDs provided');
    }

    const allOrders = await this.prisma.order.findMany({
      where: {
        id: { in: dto.orderIds },
      },
      include: {
        customer: true,
        orderItems: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (allOrders.length === 0) {
      throw new NotFoundException('No matching orders found');
    }

    const isCancelled = (o: (typeof allOrders)[number]) =>
      courierGroupOf(o.courierStatus) === 'CANCELLED';
    const unbooked = allOrders.filter(
      (o) => !o.courierConsignmentId && !o.courierTrackingCode && !isCancelled(o),
    );
    const skipped = allOrders.filter(
      (o) => o.courierConsignmentId || o.courierTrackingCode || isCancelled(o),
    );

    // Atomically claim each unbooked order so concurrent bulk requests cannot double-book.
    const orders: typeof allOrders = [];
    for (const order of unbooked) {
      const claimed = await this.prisma.order.updateMany({
        where: {
          id: order.id,
          courierConsignmentId: null,
          courierTrackingCode: null,
          OR: [{ courierBookingState: null }, { courierBookingState: 'FAILED' }],
        },
        data: {
          courierBookingState: 'BOOKING',
          orderProcessedBy: staffUser.id,
        },
      });
      if (claimed.count > 0) {
        orders.push(order);
      } else {
        skipped.push(order);
      }
    }

    if (orders.length === 0) {
      return {
        message: `Bulk courier processing finished. Succeeded: 0, Failed: ${skipped.length}`,
        succeededCount: 0,
        failedCount: skipped.length,
        updatedOrders: [],
        failedOrders: skipped.map((o) => ({
          invoice: o.orderRef || o.id,
          error: 'Already booked',
        })),
      };
    }

    const payloadItems = orders.map((order) => {
      const recipientName =
        order.customerName || order.customer?.name || 'Customer';
      const recipientPhone =
        order.customerPhone || order.customer?.phone || '';
      const altPhone =
        order.customerSecondaryPhone || order.customer?.secondaryPhone || undefined;
      const addressParts = [
        order.shippingAddress,
        order.customerThana,
        order.customerDistrict,
      ].filter(Boolean);
      const recipientAddress =
        addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';
      const codAmount = this.calculateCodAmount(order);
      const invoice = order.orderRef || order.id;

      return {
        invoice,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        alternative_phone: altPhone,
        recipient_address: recipientAddress,
        cod_amount: codAmount,
        note: order.notes || undefined,
        delivery_type: dto.deliveryType !== undefined ? dto.deliveryType : 0,
      };
    });

    let results: any[];
    try {
      results = await this.steadfastService.createBulkOrders(payloadItems);
    } catch (err: any) {
      const ambiguous =
        err instanceof GatewayTimeoutException || err instanceof BadGatewayException;
      for (const order of orders) {
        await this.setBookingState(order.id, ambiguous ? 'UNCERTAIN' : 'FAILED');
      }
      throw err;
    }

    const updatedOrders: any[] = [];
    const failedOrders: any[] = skipped.map((o) => ({
      invoice: o.orderRef || o.id,
      error: 'Already booked',
    }));
    const handledIds = new Set<string>();

    for (const resItem of results) {
      const order = orders.find(
        (o) => o.orderRef === resItem.invoice || o.id === resItem.invoice,
      );

      if (order && resItem.status !== 'error' && (resItem.consignment_id || resItem.tracking_code)) {
        const updated = await this.prisma.order.update({
          where: { id: order.id },
          data: {
            courierProvider: 'STEADFAST',
            courierConsignmentId: resItem.consignment_id
              ? String(resItem.consignment_id)
              : null,
            courierTrackingCode: resItem.tracking_code || null,
            courierTrackingLink: (resItem as any).tracking_link || null,
            courierCodAmount: this.calculateCodAmount(order),
            courierBookingState: 'BOOKED',
            courierStatus: resItem.status || 'in_review',
            courierSubmittedAt: new Date(),
            courierLastSyncedAt: new Date(),
            courierDeliveryType: dto.deliveryType !== undefined ? dto.deliveryType : 0,
            processingStatus:
              order.processingStatus === OrderProcessingStatus.PENDING ||
              order.processingStatus === OrderProcessingStatus.CONFIRMED
                ? OrderProcessingStatus.SHIPPED
                : order.processingStatus,
            orderProcessedBy: staffUser.id,
          },
        });
        handledIds.add(order.id);
        updatedOrders.push(updated);
      } else {
        if (order) {
          handledIds.add(order.id);
          await this.setBookingState(order.id, 'FAILED');
        }
        failedOrders.push({
          invoice: resItem.invoice,
          error: resItem.status === 'error' ? 'Steadfast rejected order data' : 'Unknown',
        });
      }
    }

    // Any claimed order without a matching provider result needs reconciliation.
    for (const order of orders) {
      if (!handledIds.has(order.id)) {
        await this.setBookingState(order.id, 'UNCERTAIN');
      }
    }

    return {
      message: `Bulk courier processing finished. Succeeded: ${updatedOrders.length}, Failed: ${failedOrders.length}`,
      succeededCount: updatedOrders.length,
      failedCount: failedOrders.length,
      updatedOrders,
      failedOrders,
    };
  }

  /**
   * Sync single order status from Steadfast Courier
   */
  async syncCourierStatus(orderId: string, staffUser?: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const attempts = this.buildCourierIdentifierAttempts(order);
    if (attempts.length === 0) {
      throw new BadRequestException(
        'Order has no booked shipment. Place it with Steadfast before refreshing courier status.',
      );
    }

    let statusResult: { status: number; delivery_status: string } | null = null;
    let lastSyncError: any;
    for (const attempt of attempts) {
      try {
        const result = await this.fetchCourierStatusByIdentifier(
          attempt.type,
          attempt.value,
        );
        if (result?.delivery_status) {
          statusResult = result;
          break;
        }
      } catch (err: any) {
        lastSyncError = err;
        // Same keys give the same answer for every identifier — stop burning 401s.
        if (err instanceof UnauthorizedException) break;
      }
    }

    if (!statusResult) {
      if (lastSyncError instanceof UnauthorizedException) {
        await this.throwForCourier401();
      }
      if (lastSyncError) throw lastSyncError;
      return {
        message: 'No status information returned from Steadfast',
        order,
      };
    }

    const deliveryStatus = statusResult.delivery_status.toLowerCase();

    const { targetProcessingStatus, targetPaymentStatus } =
      this.mapCourierDeliveryStatus(deliveryStatus, order);

    // If order is cancelled and needs restocking, execute inventory restock flow
    if (
      targetProcessingStatus === OrderProcessingStatus.CANCELLED &&
      order.processingStatus !== OrderProcessingStatus.CANCELLED
    ) {
      await this.updateOrderStatus(
        order.id,
        {
          processingStatus: OrderProcessingStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
        },
        staffUser || { id: order.orderProcessedBy || order.customerId },
      );
    } else if (targetProcessingStatus || targetPaymentStatus) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          ...(targetProcessingStatus && { processingStatus: targetProcessingStatus }),
          ...(targetPaymentStatus && { paymentStatus: targetPaymentStatus }),
        },
      });
    }

    const finalOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: deliveryStatus,
        courierLastSyncedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        reseller: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      message: `Courier status synced: ${deliveryStatus}`,
      deliveryStatus,
      order: finalOrder,
    };
  }

  /**
   * Handle incoming Steadfast Courier Webhook
   * Automatically updates internal order state, status, payment, and inventory restock on cancelled
   */
  async handleSteadfastWebhook(payload: any, authHeader?: string) {
    // 1. Verify bearer token if configured in .env
    const expectedToken = process.env.STEADFAST_WEBHOOK_TOKEN;
    if (expectedToken) {
      const incomingToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
      if (!incomingToken || incomingToken !== expectedToken) {
        throw new ForbiddenException('Invalid Steadfast Webhook token');
      }
    }

    const invoice = payload.invoice || payload.invoice_no || payload.order_ref;
    const consignmentId = payload.consignment_id ? String(payload.consignment_id) : undefined;
    const trackingCode = payload.tracking_code ? String(payload.tracking_code) : undefined;
    const deliveryStatus = (payload.delivery_status || payload.status || '').toLowerCase().trim();

    if (!deliveryStatus) {
      throw new BadRequestException('delivery_status is required in webhook payload');
    }

    // 2. Locate order by invoice, consignment ID, or tracking code
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          ...(invoice ? [{ orderRef: String(invoice) }, { id: String(invoice) }] : []),
          ...(trackingCode ? [{ courierTrackingCode: String(trackingCode) }] : []),
          ...(consignmentId ? [{ courierConsignmentId: String(consignmentId) }] : []),
        ],
      },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return {
        status: 'ignored',
        message: `Order not found for invoice: ${invoice || 'N/A'}, tracking: ${trackingCode || 'N/A'}, consignment: ${consignmentId || 'N/A'}`,
      };
    }

    // 3. Map status to OrderProcessingStatus and PaymentStatus
    const { targetProcessingStatus, targetPaymentStatus } =
      this.mapCourierDeliveryStatus(deliveryStatus, order);

    // 4. If cancelled, execute restocking logic
    if (
      targetProcessingStatus === OrderProcessingStatus.CANCELLED &&
      order.processingStatus !== OrderProcessingStatus.CANCELLED
    ) {
      await this.updateOrderStatus(
        order.id,
        {
          processingStatus: OrderProcessingStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
        },
        { id: order.orderProcessedBy || order.customerId },
      );
    } else if (targetProcessingStatus || targetPaymentStatus) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          ...(targetProcessingStatus && { processingStatus: targetProcessingStatus }),
          ...(targetPaymentStatus && { paymentStatus: targetPaymentStatus }),
        },
      });
    }

    // 5. Update courier status and tracking fields
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: deliveryStatus,
        courierLastSyncedAt: new Date(),
        ...(consignmentId && !order.courierConsignmentId && { courierConsignmentId: consignmentId }),
        ...(trackingCode && !order.courierTrackingCode && { courierTrackingCode: trackingCode }),
      },
    });

    return {
      status: 'success',
      message: `Order #${order.orderRef || order.id} updated to ${deliveryStatus}`,
      orderId: order.id,
      deliveryStatus,
    };
  }

  /**
   * Bulk sync all active courier orders that are currently in-flight
   */
  async syncAllActiveCourierOrders(staffUser: any) {
    const activeOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { courierTrackingCode: { not: null } },
          { courierConsignmentId: { not: null } },
        ],
        courierStatus: {
          notIn: [
            'delivered',
            'cancelled',
            'cancelled_return_received',
            'partial_delivered_return_received',
          ],
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderRef: true },
    });

    if (activeOrders.length === 0) {
      return {
        message: 'No active courier orders require syncing right now.',
        totalChecked: 0,
        syncedCount: 0,
        failedCount: 0,
      };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const ord of activeOrders) {
      try {
        await this.syncCourierStatus(ord.id, staffUser);
        syncedCount++;
      } catch (err: any) {
        failedCount++;
        // Unauthorized here means the keys are being rejected globally (the
        // per-parcel case surfaces as Forbidden) — stop before the remaining
        // orders pile 401s onto Steadfast's lockout counter.
        if (err instanceof UnauthorizedException) {
          console.error(
            `Aborting courier sync cycle after ${failedCount}/${activeOrders.length} orders: ${err.message}`,
          );
          break;
        }
      }
    }

    return {
      message: `Synced ${syncedCount} active courier orders (${failedCount} failed).`,
      totalChecked: activeOrders.length,
      syncedCount,
      failedCount,
    };
  }

  /**
   * Get detailed parcel tracking milestones for an order using Steadfast /trackings_by_invoice
   */
  async getOrderTrackingHistory(orderId: string, user: any) {
    const order = await this.getOrderById(orderId, user);
    const invoice = order.orderRef || order.id;

    const steadfastTracking = await this.steadfastService.getTrackingsByInvoice(invoice);
    return {
      orderId: order.id,
      orderRef: order.orderRef,
      courierStatus: order.courierStatus,
      courierTrackingCode: order.courierTrackingCode,
      courierConsignmentId: order.courierConsignmentId,
      courierSubmittedAt: order.courierSubmittedAt,
      courierLastSyncedAt: order.courierLastSyncedAt,
      trackingEvents: steadfastTracking?.tracking || [],
    };
  }

  /**
   * Check customer delivery reputation / fraud stats from Steadfast Courier
   */
  async checkCustomerFraudScore(phone: string) {
    return this.steadfastService.checkFraudScore(phone);
  }

  private isStaffUser(user: any): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES_EXECUTIVE,
    ].includes(user?.role);
  }

  /**
   * Single source of truth: Steadfast delivery_status -> internal order statuses.
   * Used by both the manual/bulk sync and the Steadfast webhook so the two paths
   * can never drift apart.
   */
  private mapCourierDeliveryStatus(
    deliveryStatus: string,
    order: { processingStatus: OrderProcessingStatus; paymentStatus: PaymentStatus },
  ): {
    targetProcessingStatus?: OrderProcessingStatus;
    targetPaymentStatus?: PaymentStatus;
  } {
    const status = (deliveryStatus || '').toLowerCase();

    if (status === 'delivered') {
      return {
        targetProcessingStatus: OrderProcessingStatus.DELIVERED,
        ...(order.paymentStatus !== PaymentStatus.PAID
          ? { targetPaymentStatus: PaymentStatus.PAID }
          : {}),
      };
    }

    if (status === 'partial_delivered' || status === 'partial_delivered_return_received') {
      return {
        targetProcessingStatus: OrderProcessingStatus.DELIVERED,
        targetPaymentStatus: PaymentStatus.PARTIAL,
      };
    }

    // cancelled_* covers the whole return lifecycle: restock runs once, guarded
    // by order.processingStatus !== CANCELLED in both call sites.
    if (
      status === 'cancelled' ||
      status === 'cancelled_return_received' ||
      status === 'cancelled_return_proccessing' ||
      status === 'cancelled_return_rider_assigned'
    ) {
      return {
        targetProcessingStatus: OrderProcessingStatus.CANCELLED,
        targetPaymentStatus: PaymentStatus.CANCELLED,
      };
    }

    if (
      [
        'pending',
        'in_review',
        'in_transit',
        'delivered_approval_pending',
        'partial_delivered_approval_pending',
        'partial_delivered_return_proccessing',
        'partial_delivered_return_rider_assigned',
      ].includes(status) &&
      (order.processingStatus === OrderProcessingStatus.PENDING ||
        order.processingStatus === OrderProcessingStatus.CONFIRMED)
    ) {
      return { targetProcessingStatus: OrderProcessingStatus.SHIPPED };
    }

    // hold / exceptional / unknown / *_approval_pending cancel reviews:
    // courierStatus is still persisted, processingStatus deliberately unchanged.
    return {};
  }

  /**
   * Steadfast has no guaranteed webhook delivery, so poll in-flight consignments.
   * Its status responses are cached for 60s server-side and rate limits are
   * 1000 req/min, so a 10-minute cadence for at most 100 orders is safe.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCourierStatusOnSchedule() {
    if (this.courierSyncRunning) return;
    this.courierSyncRunning = true;
    try {
      // Cheap probe: skips the whole cycle when the base URL is unreachable or the
      // keys are rejected, instead of hammering Steadfast with 100 failing lookups.
      const auth = await this.steadfastService.getCredentialStatus();
      if (!auth.pingOk || !auth.balanceOk) {
        console.warn(
          `Skipping scheduled courier sync: ${!auth.pingOk ? `Steadfast unreachable (${auth.pingError || 'unknown error'})` : `keys rejected (${auth.balanceError || 'invalid API keys'})`}`,
        );
        return;
      }
      await this.syncAllActiveCourierOrders(null);
    } catch (err) {
      console.error('Scheduled courier status sync failed:', err);
    } finally {
      this.courierSyncRunning = false;
    }
  }

  /**
   * Courier.md: a 401 means either wrong/revoked keys or a parcel that belongs to
   * another profile. /get_balance answers 401 only when the keys themselves are bad,
   * so one cheap probe tells the two apart instead of retrying the same 401.
   */
  private async throwForCourier401(): Promise<never> {
    const keysValid = await this.steadfastService.areKeysValid();
    if (!keysValid) {
      throw new UnauthorizedException(
        'Steadfast rejected the configured API keys (401). Update STEADFAST_API_KEY / STEADFAST_SECRET_KEY in Backend/.env, then re-check GET /orders/courier/auth-status.',
      );
    }

    throw new ForbiddenException(
      "This consignment ID, tracking code, or invoice belongs to a different Steadfast profile (Courier.md: 401 = 'not yours'). Book the parcel with this account's API keys, or correct the consignment ID.",
    );
  }

  private async fetchCourierStatusByIdentifier(
    type: 'cid' | 'tracking' | 'invoice',
    value: string,
  ): Promise<{ status: number; delivery_status: string }> {
    if (type === 'cid') {
      return this.steadfastService.getStatusByConsignmentId(value);
    }
    if (type === 'tracking') {
      return this.steadfastService.getStatusByTrackingCode(value);
    }
    return this.steadfastService.getStatusByInvoice(value);
  }

  private buildCourierIdentifierAttempts(
    order: any | null,
    enteredIdentifier?: string,
  ): Array<{ type: 'cid' | 'tracking' | 'invoice'; value: string }> {
    const attempts: Array<{
      type: 'cid' | 'tracking' | 'invoice';
      value: string;
    }> = [];

    const push = (
      type: 'cid' | 'tracking' | 'invoice',
      value?: string | null,
    ) => {
      if (!value) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      if (
        !attempts.some(
          (attempt) =>
            attempt.type === type && attempt.value === normalized,
        )
      ) {
        attempts.push({ type, value: normalized });
      }
    };

    if (enteredIdentifier) {
      const normalized = enteredIdentifier.trim();
      if (order?.courierConsignmentId === normalized) {
        push('cid', normalized);
      } else if (order?.courierTrackingCode === normalized) {
        push('tracking', normalized);
      } else if (order?.orderRef === normalized) {
        push('invoice', normalized);
      } else {
        push('cid', normalized);
        push('tracking', normalized);
        push('invoice', normalized);
      }
    }

    push('cid', order?.courierConsignmentId);
    push('tracking', order?.courierTrackingCode);
    push('invoice', order?.orderRef);

    return attempts;
  }

  async getCourierAuthStatus() {
    return this.steadfastService.getCredentialStatus();
  }

  async trackCourierParcel(identifier: string, user: any) {
    const normalizedIdentifier = (identifier || '').trim();
    if (!normalizedIdentifier) {
      throw new BadRequestException(
        'A consignment ID, tracking code, or invoice is required',
      );
    }

    const isStaff = this.isStaffUser(user);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        normalizedIdentifier,
      );

    const matchWhere: any = {
      OR: [
        { courierConsignmentId: normalizedIdentifier },
        { courierTrackingCode: normalizedIdentifier },
        { orderRef: normalizedIdentifier },
        ...(isUuid ? [{ id: normalizedIdentifier }] : []),
      ],
    };

    const order = await this.prisma.order.findFirst({
      where: isStaff
        ? matchWhere
        : {
            AND: [
              matchWhere,
              {
                OR: [
                  { resellerId: user?.id },
                  { customerId: user?.id },
                ],
              },
            ],
          },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        reseller: { select: { id: true, name: true } },
      },
    });

    if (!order && !isStaff) {
      throw new ForbiddenException(
        'You can only track consignments that belong to your own orders',
      );
    }

    const attempts = this.buildCourierIdentifierAttempts(
      order,
      normalizedIdentifier,
    );
    if (attempts.length === 0) {
      throw new BadRequestException(
        'No trackable consignment ID, tracking code, or invoice was provided',
      );
    }

    let deliveryStatus: string | null = null;
    let matchedBy: 'cid' | 'tracking' | 'invoice' | null = null;
    let matchedIdentifier = normalizedIdentifier;
    let lastError: any;

    for (const attempt of attempts) {
      try {
        const result = await this.fetchCourierStatusByIdentifier(
          attempt.type,
          attempt.value,
        );
        if (result?.delivery_status) {
          deliveryStatus = result.delivery_status.toLowerCase();
          matchedBy = attempt.type;
          matchedIdentifier = attempt.value;
          break;
        }
      } catch (err: any) {
        lastError = err;
        // Same keys give the same answer for every identifier — stop burning 401s.
        if (err instanceof UnauthorizedException) break;
      }
    }

    if (!deliveryStatus || !matchedBy) {
      if (lastError instanceof UnauthorizedException) {
        await this.throwForCourier401();
      }
      if (lastError) throw lastError;
      throw new BadRequestException(
        'No status information returned from Steadfast',
      );
    }

    const invoice =
      order?.orderRef || (matchedBy === 'invoice' ? matchedIdentifier : null);

    let trackingEvents: any[] = [];
    if (invoice) {
      try {
        const tracking =
          await this.steadfastService.getTrackingsByInvoice(invoice);
        trackingEvents = tracking?.tracking || [];
      } catch {
        trackingEvents = [];
      }
    }

    return {
      identifier: normalizedIdentifier,
      matchedBy,
      matchedIdentifier,
      orderId: order?.id,
      orderRef: order?.orderRef || null,
      customerName:
        order?.customerName || order?.customer?.name || null,
      customerPhone:
        order?.customerPhone || order?.customer?.phone || null,
      consignmentId:
        order?.courierConsignmentId ||
        (matchedBy === 'cid' ? matchedIdentifier : null),
      trackingCode:
        order?.courierTrackingCode ||
        (matchedBy === 'tracking' ? matchedIdentifier : null),
      trackingLink: order?.courierTrackingLink || null,
      deliveryStatus,
      persistedCourierStatus: order?.courierStatus || null,
      lastSyncedAt: order?.courierLastSyncedAt || null,
      returnStatus: order?.courierReturnStatus || null,
      returnReason: order?.courierReturnReason || null,
      returnRequestedAt: order?.courierReturnRequestedAt || null,
      trackingEvents,
    };
  }

  /**
   * Get Steadfast Courier Account Balance
   */
  async getCourierBalance() {
    return this.steadfastService.getBalance();
  }

  async createCourierPickup(dto: CreateCourierPickupDto, staffUser: any) {
    const response = await this.steadfastService.createPickupRequest({
      ...(dto.addressId ? { address_id: dto.addressId } : {}),
      ...(dto.policeStationId ? { police_station_id: dto.policeStationId } : {}),
      address: dto.address.trim(),
      contact_number: dto.contactNumber.trim(),
      ...(dto.note ? { note: dto.note.trim() } : {}),
      ...(dto.estimQty ? { estim_qty: dto.estimQty } : {}),
    });

    const pickup = await this.prisma.courierPickup.create({
      data: {
        provider: 'STEADFAST',
        addressId: dto.addressId ?? null,
        policeStationId: dto.policeStationId ?? null,
        address: dto.address.trim(),
        contactNumber: dto.contactNumber.trim(),
        note: dto.note?.trim() || null,
        estimQty: dto.estimQty ?? null,
        status: 'requested',
        providerResponse: response ?? {},
        createdBy: staffUser?.id ?? null,
      },
    });

    return {
      message: 'Pickup request submitted to Steadfast',
      pickup,
      providerResponse: response,
    };
  }

  async getCourierPickups(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.courierPickup.count(),
      this.prisma.courierPickup.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createCourierReturn(dto: CreateCourierReturnDto, staffUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let identifier: {
      consignment_id?: string;
      tracking_code?: string;
      invoice?: string;
    };
    if (order.courierConsignmentId) {
      identifier = { consignment_id: order.courierConsignmentId };
    } else if (order.courierTrackingCode) {
      identifier = { tracking_code: order.courierTrackingCode };
    } else if (order.orderRef) {
      identifier = { invoice: order.orderRef };
    } else {
      throw new BadRequestException(
        'Order has no consignment ID, tracking code, or invoice to return',
      );
    }

    const response = await this.steadfastService.createReturnRequest({
      ...identifier,
      ...(dto.reason ? { reason: dto.reason } : {}),
    });

    const rawReturn = response?.return_request || response;
    const rawReturnId = rawReturn?.id ?? response?.data?.id;
    const returnId = Number(rawReturnId);
    const returnStatus =
      typeof rawReturn?.status === 'string'
        ? rawReturn.status
        : typeof response?.status === 'string'
          ? response.status
          : 'pending';

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        ...(Number.isFinite(returnId) ? { courierReturnRequestId: returnId } : {}),
        courierReturnStatus: returnStatus,
        courierReturnReason: dto.reason?.trim() || null,
        courierReturnRequestedAt: new Date(),
        orderProcessedBy: staffUser?.id ?? order.orderProcessedBy,
      },
    });

    return {
      message: 'Return request created with Steadfast',
      returnRequest: response,
      order: updated,
    };
  }

  async getCourierReturns(page = 1) {
    const result = await this.steadfastService.getReturnRequests(page);

    for (const item of result.data) {
      try {
        const status = typeof item?.status === 'string' ? item.status : null;
        if (!status) continue;

        const consignmentId = item?.consignment_id
          ? String(item.consignment_id)
          : null;
        const invoice = item?.invoice || item?.order_ref || null;
        if (!consignmentId && !invoice) continue;

        const returnId = Number(item?.id);
        await this.prisma.order.updateMany({
          where: consignmentId
            ? { courierConsignmentId: consignmentId }
            : { orderRef: String(invoice) },
          data: {
            courierReturnStatus: status,
            ...(Number.isFinite(returnId)
              ? { courierReturnRequestId: returnId }
              : {}),
          },
        });
      } catch (err: any) {
        console.error(
          `Failed to reconcile return request ${item?.id}: ${err?.message}`,
        );
      }
    }

    return result;
  }

  async getCourierReturn(id: string | number) {
    return this.steadfastService.getReturnRequest(id);
  }

  async getCourierPayments(page = 1) {
    return this.steadfastService.getPayments(page);
  }

  async getCourierPayment(id: string | number) {
    return this.steadfastService.getPayment(id);
  }

  async getPoliceStations() {
    return this.steadfastService.getPoliceStations();
  }
}


