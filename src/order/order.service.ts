import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  InventoryTxPurpose,
  InventoryTxType,
  UserRole,
} from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 4. Perform atomic Order Creation & Inventory Deduction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create Order
      const createdOrder = await tx.order.create({
        data: {
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
              reference: `ORDER-${createdOrder.id.substring(0, 8).toUpperCase()}`,
              performedBy: customerId,
              notes: `Order #${createdOrder.id} placed by customer`,
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
   * Get list of orders (Filtered by customer for regular users, all for admins/staff)
   */
  async getOrders(user: any, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const isStaff = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES_EXECUTIVE,
    ].includes(user.role);

    const where = isStaff ? {} : { customerId: user.id };

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true } },
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

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
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

    if (!isStaff && order.customerId !== user.id) {
      throw new ForbiddenException('Access denied to this order');
    }

    return order;
  }

  /**
   * Update Order status (Admin/Staff only)
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    staffUser: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
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
  }
}
