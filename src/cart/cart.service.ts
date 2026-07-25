import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRole } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { BatchAddToCartDto } from './dto/batch-add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch active cart for customer or create a new active cart if none exists.
   */
  async getOrCreateActiveCart(customerId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: 'active',
      },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                newPrice: true,
                resellerPrice: true,
                unit: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { imageUrl: true },
                },
              },
            },
            productSize: {
              include: {
                size: { select: { id: true, name: true } },
              },
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

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customerId,
          status: 'active',
          total: 0,
        },
        include: {
          cartItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  newPrice: true,
                  resellerPrice: true,
                  unit: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { imageUrl: true },
                  },
                },
              },
              productSize: {
                include: {
                  size: { select: { id: true, name: true } },
                },
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
    }

    return cart;
  }

  /**
   * Add a product variant (product + optional size + optional color) to active cart.
   */
  async addToCart(customerId: string, dto: AddToCartDto, userRole?: UserRole) {
    const { productId, productSizeId, productColorId, quantity } = dto;

    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('Product not found or inactive');
    }

    // 2. Validate product size if provided
    if (productSizeId) {
      const ps = await this.prisma.productSize.findUnique({
        where: { id: productSizeId },
      });
      if (!ps || ps.productId !== productId) {
        throw new BadRequestException('Invalid product size variant selection');
      }
    }

    // 3. Validate product color if provided
    if (productColorId) {
      const pc = await this.prisma.productColor.findUnique({
        where: { id: productColorId },
      });
      if (!pc || pc.productId !== productId) {
        throw new BadRequestException('Invalid product color variant selection');
      }
    }

    // 4. Resolve price based on role
    const unitPrice =
      userRole === UserRole.RESELLER
        ? Number(product.resellerPrice)
        : Number(product.newPrice);

    const activeCart = await this.getOrCreateActiveCart(customerId);

    // 5. Check if matching variant item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: activeCart.id,
        productId,
        productSizeId: productSizeId || null,
        productColorId: productColorId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = Number((unitPrice * newQuantity).toFixed(2));

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          unitPrice,
          subtotal: newSubtotal,
        },
      });
    } else {
      const subtotal = Number((unitPrice * quantity).toFixed(2));
      await this.prisma.cartItem.create({
        data: {
          cartId: activeCart.id,
          productId,
          productSizeId: productSizeId || null,
          productColorId: productColorId || null,
          quantity,
          unitPrice,
          subtotal,
        },
      });
    }

    // 6. Recalculate cart total
    await this.recalculateCartTotal(activeCart.id);

    return this.getOrCreateActiveCart(customerId);
  }

  /**
   * Batch add multiple product variants to active cart in a single request.
   */
  async batchAddToCart(
    customerId: string,
    dto: BatchAddToCartDto,
    userRole?: UserRole,
  ) {
    for (const itemDto of dto.items) {
      const { productId, productSizeId, productColorId, quantity } = itemDto;

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.status !== 'ACTIVE') {
        throw new NotFoundException(
          `Product ID "${productId}" not found or inactive`,
        );
      }

      if (productSizeId) {
        const ps = await this.prisma.productSize.findUnique({
          where: { id: productSizeId },
        });
        if (!ps || ps.productId !== productId) {
          throw new BadRequestException(
            `Invalid product size variant for product ID "${productId}"`,
          );
        }
      }

      if (productColorId) {
        const pc = await this.prisma.productColor.findUnique({
          where: { id: productColorId },
        });
        if (!pc || pc.productId !== productId) {
          throw new BadRequestException(
            `Invalid product color variant for product ID "${productId}"`,
          );
        }
      }

      const unitPrice =
        userRole === UserRole.RESELLER
          ? Number(product.resellerPrice)
          : Number(product.newPrice);

      const activeCart = await this.getOrCreateActiveCart(customerId);

      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: activeCart.id,
          productId,
          productSizeId: productSizeId || null,
          productColorId: productColorId || null,
        },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const newSubtotal = Number((unitPrice * newQuantity).toFixed(2));

        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            unitPrice,
            subtotal: newSubtotal,
          },
        });
      } else {
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        await this.prisma.cartItem.create({
          data: {
            cartId: activeCart.id,
            productId,
            productSizeId: productSizeId || null,
            productColorId: productColorId || null,
            quantity,
            unitPrice,
            subtotal,
          },
        });
      }
    }

    const activeCart = await this.getOrCreateActiveCart(customerId);
    await this.recalculateCartTotal(activeCart.id);

    return this.getOrCreateActiveCart(customerId);
  }

  /**
   * Cron Job running daily at 3:00 AM to clear abandoned active carts older than 30 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupAbandonedCarts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const abandonedCarts = await this.prisma.cart.findMany({
      where: {
        status: 'active',
        updatedAt: { lte: thirtyDaysAgo },
      },
      select: { id: true },
    });

    if (abandonedCarts.length > 0) {
      const cartIds = abandonedCarts.map((c) => c.id);

      await this.prisma.cartItem.deleteMany({
        where: { cartId: { in: cartIds } },
      });

      await this.prisma.cart.deleteMany({
        where: { id: { in: cartIds } },
      });
    }
  }

  /**
   * Update quantity of a cart item
   */
  async updateCartItem(
    customerId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const activeCart = await this.getOrCreateActiveCart(customerId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: activeCart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      const unitPrice = Number(item.unitPrice);
      const subtotal = Number((unitPrice * dto.quantity).toFixed(2));

      await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity: dto.quantity,
          subtotal,
        },
      });
    }

    await this.recalculateCartTotal(activeCart.id);
    return this.getOrCreateActiveCart(customerId);
  }

  /**
   * Remove a single item from active cart
   */
  async removeCartItem(customerId: string, cartItemId: string) {
    const activeCart = await this.getOrCreateActiveCart(customerId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: activeCart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    await this.recalculateCartTotal(activeCart.id);

    return this.getOrCreateActiveCart(customerId);
  }

  /**
   * Clear all items in active cart
   */
  async clearCart(customerId: string) {
    const activeCart = await this.getOrCreateActiveCart(customerId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: activeCart.id },
    });

    await this.prisma.cart.update({
      where: { id: activeCart.id },
      data: { total: 0 },
    });

    return this.getOrCreateActiveCart(customerId);
  }

  /**
   * Recalculates total sum of cart items + courierCharge
   */
  private async recalculateCartTotal(cartId: string) {
    const agg = await this.prisma.cartItem.aggregate({
      where: { cartId },
      _sum: { subtotal: true },
    });

    const itemsSubtotal = Number(agg._sum.subtotal || 0);

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { courierCharge: true },
    });

    const courier = Number(cart?.courierCharge || 0);
    const grandTotal = Number((itemsSubtotal + courier).toFixed(2));

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { total: grandTotal },
    });
  }
}
