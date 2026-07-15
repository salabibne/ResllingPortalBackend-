import { Injectable } from '@nestjs/common';
import { Prisma, InventoryTxType, InventoryTxPurpose } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardQueryDto,
  LowStockQueryDto,
  TransactionLogQueryDto,
  ProductSummaryQueryDto,
} from './dto/monitor-inventory.dto';

@Injectable()
export class InventoryMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard overview — aggregate KPIs for the entire inventory system.
   */
  async getDashboard(dto: DashboardQueryDto) {
    // 1. Aggregate inventory stats natively where possible
    const agg = await this.prisma.inventory.aggregate({
      _count: true,
      _sum: {
        currentStock: true,
      },
    });

    const totalInventoryRecords = agg._count;
    const totalStockUnits = agg._sum.currentStock || 0;

    // Use queryRaw for computed total stock value
    const [{ totalStockValue }] = await this.prisma.$queryRaw<
      { totalStockValue: number }[]
    >`
      SELECT COALESCE(SUM(current_stock * cost_per_unit), 0)::float as "totalStockValue"
      FROM inventory
    `;

    // Separate count queries
    const outOfStockCount = await this.prisma.inventory.count({
      where: { currentStock: 0 },
    });

    const [{ lowStockCount }] = await this.prisma.$queryRaw<
      { lowStockCount: number }[]
    >`
      SELECT COUNT(*)::int as "lowStockCount"
      FROM inventory
      WHERE current_stock <= stock_limit_alert AND current_stock > 0
    `;

    // 2. Count distinct products
    const distinctProducts = await this.prisma.inventory.findMany({
      select: { productId: true },
      distinct: ['productId'],
    });
    const totalProducts = distinctProducts.length;

    // 3. Aggregate period movement from transactions using groupBy
    const dateFilter: Prisma.InventoryTransactionWhereInput = {};
    if (dto.startDate || dto.endDate) {
      dateFilter.createdAt = {};
      if (dto.startDate) dateFilter.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) dateFilter.createdAt.lte = new Date(dto.endDate);
    }

    const groupedTransactions = await this.prisma.inventoryTransaction.groupBy({
      by: ['stockType', 'purpose'],
      where: dateFilter,
      _sum: {
        transactionQuantity: true,
      },
    });

    const periodMovement = {
      totalStockIn: 0,
      totalStockOut: 0,
      totalPurchased: 0,
      totalSold: 0,
      totalReturned: 0,
      totalDamaged: 0,
    };

    for (const group of groupedTransactions) {
      const qty = group._sum.transactionQuantity || 0;
      if (group.stockType === InventoryTxType.STOCK_IN) {
        periodMovement.totalStockIn += qty;
      } else {
        periodMovement.totalStockOut += qty;
      }

      switch (group.purpose) {
        case InventoryTxPurpose.PURCHASE:
          periodMovement.totalPurchased += qty;
          break;
        case InventoryTxPurpose.SELL:
          periodMovement.totalSold += qty;
          break;
        case InventoryTxPurpose.RETURN:
          periodMovement.totalReturned += qty;
          break;
        case InventoryTxPurpose.DAMAGE:
          periodMovement.totalDamaged += qty;
          break;
      }
    }

    return {
      totalProducts,
      totalInventoryRecords,
      totalStockUnits,
      totalStockValue: totalStockValue.toFixed(2),
      lowStockCount,
      outOfStockCount,
      periodMovement,
    };
  }

  /**
   * Low stock alerts — inventory records at or below their alert threshold.
   */
  async getLowStock(dto: LowStockQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // Use queryRaw for column comparison, counting, and pagination
    const stockCondition = dto.includeOutOfStock
      ? Prisma.sql`current_stock <= stock_limit_alert`
      : Prisma.sql`current_stock <= stock_limit_alert AND current_stock > 0`;

    const [{ total }] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int as total
      FROM inventory
      WHERE ${stockCondition}
    `;

    const idsResult = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM inventory
      WHERE ${stockCondition}
      ORDER BY current_stock ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const ids = idsResult.map((r) => r.id);

    // Fetch the actual records safely with Prisma using the paginated IDs
    const paginated = await this.prisma.inventory.findMany({
      where: { id: { in: ids } },
      include: {
        product: { select: { id: true, name: true } },
        productSize: { include: { size: { select: { id: true, name: true } } } },
      },
      orderBy: { currentStock: 'asc' },
    });

    const data = paginated.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      currentStock: inv.currentStock,
      stockLimitAlert: inv.stockLimitAlert,
      costPerUnit: inv.costPerUnit,
      supplierName: inv.supplierName,
      supplierMobile: inv.supplierMobile,
      product: inv.product,
      productSize: inv.productSize,
      status: inv.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    }));

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
   * Transaction log — filterable, paginated transaction search.
   */
  async getTransactionLog(dto: TransactionLogQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = dto.sortBy ?? 'createdAt';
    const sortOrder = dto.sortOrder ?? 'desc';

    // Build dynamic where clause
    const where: Prisma.InventoryTransactionWhereInput = {};

    // Direct filters on InventoryTransaction
    if (dto.inventoryId) where.inventoryId = dto.inventoryId;
    if (dto.stockType) where.stockType = dto.stockType;
    if (dto.purpose) where.purpose = dto.purpose;
    if (dto.performedBy) where.performedBy = dto.performedBy;

    // Partial match on reference (PO numbers, invoice refs)
    if (dto.reference) {
      where.reference = { contains: dto.reference, mode: 'insensitive' };
    }

    // Date range filter
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    // Filters through the inventory relation
    if (dto.productId || dto.productSizeId) {
      where.inventory = {};
      if (dto.productId) where.inventory.productId = dto.productId;
      if (dto.productSizeId) where.inventory.productSizeId = dto.productSizeId;
    }

    // Execute count + data in parallel
    const [total, data] = await Promise.all([
      this.prisma.inventoryTransaction.count({ where }),
      this.prisma.inventoryTransaction.findMany({
        where,
        include: {
          inventory: {
            include: {
              product: { select: { id: true, name: true } },
              productSize: { include: { size: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
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
   * Stock summary per product — aggregated inventory view with movement breakdown.
   */
  async getProductSummary(dto: ProductSummaryQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const inventoryWhere: Prisma.InventoryWhereInput = {};
    if (dto.productId) inventoryWhere.productId = dto.productId;

    // 1. Get distinct product IDs (for pagination)
    const allProductIds = await this.prisma.inventory.findMany({
      where: inventoryWhere,
      select: { productId: true },
      distinct: ['productId'],
    });

    const total = allProductIds.length;
    const paginatedProductIds = allProductIds
      .slice(skip, skip + limit)
      .map((p) => p.productId);

    // 2. Fetch inventory records for paginated products
    const inventories = await this.prisma.inventory.findMany({
      where: { productId: { in: paginatedProductIds } },
      include: {
        product: { select: { id: true, name: true } },
        productSize: { include: { size: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Build date filter for transaction movement
    const txDateFilter: Prisma.InventoryTransactionWhereInput = {};
    if (dto.startDate || dto.endDate) {
      txDateFilter.createdAt = {};
      if (dto.startDate) txDateFilter.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) txDateFilter.createdAt.lte = new Date(dto.endDate);
    }

    // 4. Fetch transactions for these products' inventories using groupBy
    const inventoryIds = inventories.map((inv) => inv.id);
    const groupedTransactions = await this.prisma.inventoryTransaction.groupBy({
      by: ['inventoryId', 'purpose'],
      where: {
        inventoryId: { in: inventoryIds },
        ...txDateFilter,
      },
      _sum: {
        transactionQuantity: true,
      },
    });

    // 5. Build transaction lookup by inventoryId
    const txByInventory = new Map<string, { purpose: InventoryTxPurpose; sum: number }[]>();
    for (const tx of groupedTransactions) {
      const existing = txByInventory.get(tx.inventoryId) ?? [];
      existing.push({
        purpose: tx.purpose,
        sum: tx._sum.transactionQuantity || 0,
      });
      txByInventory.set(tx.inventoryId, existing);
    }

    // 6. Group inventories by productId and build response
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        inventories: typeof inventories;
      }
    >();

    for (const inv of inventories) {
      const existing = productMap.get(inv.productId);
      if (existing) {
        existing.inventories.push(inv);
      } else {
        productMap.set(inv.productId, {
          productId: inv.productId,
          productName: inv.product.name,
          inventories: [inv],
        });
      }
    }

    const data = Array.from(productMap.values()).map((group) => {
      let totalStockUnits = 0;
      let totalStockValue = 0;
      let totalCostWeighted = 0;

      const sizeBreakdown = group.inventories.map((inv) => {
        const stock = inv.currentStock;
        const cost = Number(inv.costPerUnit);
        totalStockUnits += stock;
        totalStockValue += stock * cost;
        totalCostWeighted += cost;

        return {
          productSizeId: inv.productSizeId,
          sizeName: inv.productSize?.size?.name ?? null,
          currentStock: stock,
          costPerUnit: inv.costPerUnit,
        };
      });

      // Aggregate period movement for this product
      const periodMovement = {
        totalPurchased: 0,
        totalSold: 0,
        totalReturned: 0,
        totalDamaged: 0,
      };

      for (const inv of group.inventories) {
        const invTxs = txByInventory.get(inv.id) ?? [];
        for (const tx of invTxs) {
          switch (tx.purpose) {
            case InventoryTxPurpose.PURCHASE:
              periodMovement.totalPurchased += tx.sum;
              break;
            case InventoryTxPurpose.SELL:
              periodMovement.totalSold += tx.sum;
              break;
            case InventoryTxPurpose.RETURN:
              periodMovement.totalReturned += tx.sum;
              break;
            case InventoryTxPurpose.DAMAGE:
              periodMovement.totalDamaged += tx.sum;
              break;
          }
        }
      }

      const invCount = group.inventories.length;
      return {
        productId: group.productId,
        productName: group.productName,
        totalStockUnits,
        totalStockValue: totalStockValue.toFixed(2),
        avgCostPerUnit:
          invCount > 0 ? (totalCostWeighted / invCount).toFixed(2) : '0.00',
        sizeBreakdown,
        periodMovement,
      };
    });

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
}
