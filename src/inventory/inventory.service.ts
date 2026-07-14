import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, InventoryTxType, InventoryTxPurpose } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── ADJUST STOCK ───────────────────────────────────────────────────

  /**
   * Executes a stock mutation inside a serializable transaction.
   *
   * Steps:
   * 1. Fetch inventory by productId + sizeId (acts as implicit row lock).
   * 2. Validate stock sufficiency for STOCK_OUT.
   * 3. Compute weighted moving average for STOCK_IN + PURCHASE.
   * 4. Apply stock delta.
   * 5. Write immutable InventoryTransaction record.
   */
  async adjustStock(dto: AdjustStockDto) {
    // Validate incomingCostPerUnit is provided for PURCHASE operations
    if (
      dto.stockType === InventoryTxType.STOCK_IN &&
      dto.purpose === InventoryTxPurpose.PURCHASE &&
      (dto.incomingCostPerUnit === undefined || dto.incomingCostPerUnit === null)
    ) {
      throw new BadRequestException(
        'incomingCostPerUnit is required when stockType is STOCK_IN and purpose is PURCHASE',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Fetch current inventory state by productId + productSizeId
        const inventory = dto.productSizeId
          ? await tx.inventory.findUnique({
              where: {
                productId_productSizeId: {
                  productId: dto.productId,
                  productSizeId: dto.productSizeId,
                },
              },
            })
          : await tx.inventory.findFirst({
              where: {
                productId: dto.productId,
                productSizeId: null,
              },
            });

        if (!inventory) {
          const sizeLabel = dto.productSizeId ? ` and productSize "${dto.productSizeId}"` : '';
          throw new NotFoundException(
            `Inventory for product "${dto.productId}"${sizeLabel} not found. ` +
            `Ensure the product exists and has an inventory record for this size.`,
          );
        }

        const stockBefore = inventory.currentStock;
        const currentCostPerUnit = Number(inventory.costPerUnit);

        // 2. Validate stock sufficiency for STOCK_OUT
        if (dto.stockType === InventoryTxType.STOCK_OUT) {
          if (stockBefore < dto.transactionQuantity) {
            throw new BadRequestException(
              `Insufficient stock. Current: ${stockBefore}, ` +
              `Requested: ${dto.transactionQuantity}`,
            );
          }
        }

        // 3. Compute new cost per unit (weighted moving average) for PURCHASE
        let newCostPerUnit = currentCostPerUnit;

        if (
          dto.stockType === InventoryTxType.STOCK_IN &&
          dto.purpose === InventoryTxPurpose.PURCHASE &&
          dto.incomingCostPerUnit !== undefined
        ) {
          const totalExistingValue = stockBefore * currentCostPerUnit;
          const totalIncomingValue =
            dto.transactionQuantity * dto.incomingCostPerUnit;
          const totalQuantity = stockBefore + dto.transactionQuantity;

          // Avoid division by zero (shouldn't happen since qty >= 1, but guard anyway)
          newCostPerUnit =
            totalQuantity > 0
              ? (totalExistingValue + totalIncomingValue) / totalQuantity
              : dto.incomingCostPerUnit;
        }

        // 4. Compute stock delta
        const stockAfter =
          dto.stockType === InventoryTxType.STOCK_IN
            ? stockBefore + dto.transactionQuantity
            : stockBefore - dto.transactionQuantity;

        // 5. Update inventory record
        const updateData: Prisma.InventoryUpdateInput = {
          currentStock: stockAfter,
        };

        // Only update costPerUnit for PURCHASE operations
        if (
          dto.stockType === InventoryTxType.STOCK_IN &&
          dto.purpose === InventoryTxPurpose.PURCHASE
        ) {
          updateData.costPerUnit = new Prisma.Decimal(
            newCostPerUnit.toFixed(2),
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: updateData,
        });

        // 6. Write immutable transaction record
        const transaction = await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            transactionQuantity: dto.transactionQuantity,
            stockBefore,
            stockAfter,
            stockType: dto.stockType,
            purpose: dto.purpose,
            reference: dto.reference,
            performedBy: dto.performedBy,
            notes: dto.notes,
          },
          include: {
            inventory: {
              include: {
                product: { select: { id: true, name: true } },
                productSize: { include: { size: { select: { id: true, name: true } } } },
              },
            },
          },
        });

        return transaction;
      },
      {
        // Serializable isolation prevents phantom reads and ensures
        // concurrent adjustStock calls are properly sequenced
        isolationLevel: 'Serializable',
      },
    );
  }

  // ─── READ ───────────────────────────────────────────────────────────

  /**
   * Fetches all inventory records for a product (one per size).
   * Includes size details and last 50 transactions per inventory record.
   */
  async findByProductId(productId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { productId },
      include: {
        product: { select: { id: true, name: true } },
        productSize: { include: { size: { select: { id: true, name: true } } } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!inventories.length) {
      throw new NotFoundException(
        `Inventory for product "${productId}" not found`,
      );
    }

    return inventories;
  }

  /**
   * Fetches transaction history across all size inventories for a product.
   */
  async getTransactionHistory(productId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { productId },
      select: { id: true },
    });

    if (!inventories.length) {
      throw new NotFoundException(
        `Inventory for product "${productId}" not found`,
      );
    }

    const inventoryIds = inventories.map((inv) => inv.id);

    return this.prisma.inventoryTransaction.findMany({
      where: { inventoryId: { in: inventoryIds } },
      include: {
        inventory: {
          select: {
            productSize: { include: { size: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
