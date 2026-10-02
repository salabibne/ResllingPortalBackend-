import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
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
import { SteadfastService } from './steadfast.service';

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steadfastService: SteadfastService,
  ) {}

  async onModuleInit() {
    await this.backfillOrderRefs();
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
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let totalResellerProfit = 0;
    let pendingResellerProfit = 0;
    let totalResellerSales = 0;
    let totalWholesaleCost = 0;

    for (const ord of orders) {
      if (ord.processingStatus === 'PENDING') {
        pendingOrders++;
      }
      if (ord.processingStatus === 'DELIVERED') {
        deliveredOrders++;
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

      const isCancelledOrReturned =
        ord.processingStatus === 'CANCELLED' || ord.processingStatus === 'RETURNED';
      const isDeliveredAndPaid =
        ord.processingStatus === 'DELIVERED' && ord.paymentStatus === 'PAID';

      if (isDeliveredAndPaid) {
        totalResellerProfit += orderProfit;
      } else if (!isCancelledOrReturned) {
        pendingResellerProfit += orderProfit;
      }

      totalResellerSales += Number(ord.resellerSellPrice || ord.total || 0);
      totalWholesaleCost += Number(ord.resellerSubtotal || ord.subtotal || 0);
    }

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
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
    processingStatus?: string,
    paymentStatus?: string,
    isResellerOnly?: boolean,
    startDate?: string,
    endDate?: string,
    customerPhone?: string,
  ) {
    const skip = (page - 1) * limit;
    const isStaff = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES_EXECUTIVE,
    ].includes(user.role);

    const isReseller = user.role === UserRole.RESELLER;

    let where: any = {};

    if (isStaff) {
      if (isResellerOnly) {
        where.isResellerOrder = true;
      }
    } else if (isReseller) {
      where.OR = [{ resellerId: user.id }, { customerId: user.id }];
      if (isResellerOnly) {
        where.isResellerOrder = true;
      }
    } else {
      where.customerId = user.id;
    }

    if (processingStatus && processingStatus !== 'ALL') {
      where.processingStatus = processingStatus;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
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
      const searchCondition = [
        { orderRef: { contains: searchClean, mode: 'insensitive' } },
        { id: { contains: searchClean, mode: 'insensitive' } },
        { customerName: { contains: searchClean, mode: 'insensitive' } },
        { customerPhone: { contains: searchClean, mode: 'insensitive' } },
        { shippingAddress: { contains: searchClean, mode: 'insensitive' } },
      ];
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
    processingStatus?: string,
    paymentStatus?: string,
    isResellerOnly?: boolean,
    startDate?: string,
    endDate?: string,
    customerPhone?: string,
  ) {
    const res = await this.getOrders(
      user,
      1,
      100000,
      search,
      processingStatus,
      paymentStatus,
      isResellerOnly,
      startDate,
      endDate,
      customerPhone,
    );
    return res.data;
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
   * Update Order status (Admin/Staff only) & adjust Inventory on CANCELLED / RETURNED
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
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

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        courierProvider: 'STEADFAST',
        courierConsignmentId: consignment?.consignment_id
          ? String(consignment.consignment_id)
          : null,
        courierTrackingCode: consignment?.tracking_code || null,
        courierStatus: consignment?.status || 'in_review',
        courierSubmittedAt: new Date(),
        courierLastSyncedAt: new Date(),
        courierDeliveryType: dto.deliveryType !== undefined ? dto.deliveryType : 0,
        courierNotes: dto.note || null,
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
  }

  /**
   * Bulk send orders to Steadfast Courier
   */
  async sendBulkOrdersToCourier(dto: BulkSendCourierDto, staffUser: any) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('No order IDs provided');
    }

    const orders = await this.prisma.order.findMany({
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

    if (orders.length === 0) {
      throw new NotFoundException('No matching orders found');
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

    const results = await this.steadfastService.createBulkOrders(payloadItems);

    const updatedOrders: any[] = [];
    const failedOrders: any[] = [];

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
        updatedOrders.push(updated);
      } else {
        failedOrders.push({
          invoice: resItem.invoice,
          error: resItem.status === 'error' ? 'Steadfast rejected order data' : 'Unknown',
        });
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

    let statusResult: { status: number; delivery_status: string } | null = null;

    if (order.courierTrackingCode) {
      statusResult = await this.steadfastService.getStatusByTrackingCode(
        order.courierTrackingCode,
      );
    } else if (order.courierConsignmentId) {
      statusResult = await this.steadfastService.getStatusByConsignmentId(
        order.courierConsignmentId,
      );
    } else if (order.orderRef) {
      statusResult = await this.steadfastService.getStatusByInvoice(order.orderRef);
    } else {
      throw new BadRequestException('Order has no tracking code or consignment ID to sync');
    }

    if (!statusResult || !statusResult.delivery_status) {
      return {
        message: 'No status information returned from Steadfast',
        order,
      };
    }

    const deliveryStatus = statusResult.delivery_status.toLowerCase();

    // Map delivery status to internal OrderProcessingStatus
    let targetProcessingStatus: OrderProcessingStatus | undefined;
    let targetPaymentStatus: PaymentStatus | undefined;

    if (deliveryStatus === 'delivered') {
      targetProcessingStatus = OrderProcessingStatus.DELIVERED;
      if (order.paymentStatus !== PaymentStatus.PAID) {
        targetPaymentStatus = PaymentStatus.PAID;
      }
    } else if (deliveryStatus === 'partial_delivered') {
      targetProcessingStatus = OrderProcessingStatus.DELIVERED;
      targetPaymentStatus = PaymentStatus.PARTIAL;
    } else if (deliveryStatus === 'cancelled') {
      targetProcessingStatus = OrderProcessingStatus.CANCELLED;
    } else if (
      deliveryStatus === 'pending' ||
      deliveryStatus === 'in_review' ||
      deliveryStatus === 'delivered_approval_pending'
    ) {
      if (
        order.processingStatus === OrderProcessingStatus.PENDING ||
        order.processingStatus === OrderProcessingStatus.CONFIRMED
      ) {
        targetProcessingStatus = OrderProcessingStatus.SHIPPED;
      }
    }

    // If order is cancelled and need restocking, use updateOrderStatus flow
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
   * Get Steadfast Courier Account Balance
   */
  async getCourierBalance() {
    return this.steadfastService.getBalance();
  }
}

