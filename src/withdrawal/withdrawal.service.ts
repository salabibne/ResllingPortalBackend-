import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PayoutMethod, WithdrawalStatus } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteWithdrawalDto,
  CreateWithdrawalDto,
  RejectWithdrawalDto,
  WithdrawalQueryDto,
} from './dto/withdrawal.dto';

@Injectable()
export class WithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── RESELLER METHODS ───────────────────────────────────────────────

  /**
   * Computes real-time wallet statistics for a specific reseller.
   */
  async getResellerWalletSummary(resellerId: string) {
    // 1. Fetch delivered and paid orders to calculate lifetime earned profit
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ resellerId }, { customerId: resellerId }],
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
    });

    let totalEarnedProfit = 0;
    let pendingProfit = 0;

    for (const ord of orders) {
      let orderProfit = 0;
      if (
        ord.resellerProfit !== null &&
        ord.resellerProfit !== undefined &&
        Number(ord.resellerProfit) > 0
      ) {
        orderProfit = Number(ord.resellerProfit);
      } else {
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
        totalEarnedProfit += orderProfit;
      } else if (!isCancelledOrReturned) {
        pendingProfit += orderProfit;
      }
    }

    // 2. Fetch all withdrawals for this reseller
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { resellerId },
    });

    let totalWithdrawn = 0;
    let pendingWithdrawal = 0;
    let rejectedWithdrawal = 0;

    for (const w of withdrawals) {
      const amount = Number(w.amount);
      if (w.status === WithdrawalStatus.COMPLETED) {
        totalWithdrawn += amount;
      } else if (
        w.status === WithdrawalStatus.PENDING ||
        w.status === WithdrawalStatus.PROCESSING
      ) {
        pendingWithdrawal += amount;
      } else if (w.status === WithdrawalStatus.REJECTED) {
        rejectedWithdrawal += amount;
      }
    }

    const withdrawableBalance = Math.max(
      0,
      Number((totalEarnedProfit - (totalWithdrawn + pendingWithdrawal)).toFixed(2)),
    );

    return {
      totalEarnedProfit: Number(totalEarnedProfit.toFixed(2)),
      pendingProfit: Number(pendingProfit.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      pendingWithdrawal: Number(pendingWithdrawal.toFixed(2)),
      rejectedWithdrawal: Number(rejectedWithdrawal.toFixed(2)),
      withdrawableBalance,
    };
  }

  /**
   * Reseller creates a new withdrawal request.
   */
  async createWithdrawalRequest(resellerId: string, dto: CreateWithdrawalDto) {
    const summary = await this.getResellerWalletSummary(resellerId);

    if (dto.amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than 0');
    }

    if (dto.amount > summary.withdrawableBalance) {
      throw new BadRequestException(
        `Requested amount (৳${dto.amount}) exceeds your available withdrawable balance (৳${summary.withdrawableBalance})`,
      );
    }

    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        resellerId,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        payoutMethod: dto.payoutMethod,
        accountDetails: dto.accountDetails.trim(),
        resellerNotes: dto.resellerNotes?.trim() || null,
        status: WithdrawalStatus.PENDING,
      },
      include: {
        reseller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            pageName: true,
          },
        },
      },
    });

    return withdrawal;
  }

  /**
   * Reseller views their own withdrawal history.
   */
  async getMyWithdrawals(resellerId: string, query: WithdrawalQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WithdrawalWhereInput = { resellerId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.payoutMethod) {
      where.payoutMethod = query.payoutMethod;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, data, summary] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          processedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.getResellerWalletSummary(resellerId),
    ]);

    return {
      data,
      summary,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reseller cancels their pending withdrawal request.
   */
  async cancelWithdrawal(resellerId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { id: withdrawalId, resellerId },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request not found`);
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING withdrawal requests can be cancelled. Current status is ${withdrawal.status}.`,
      );
    }

    return this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.CANCELLED,
      },
    });
  }

  // ─── ADMIN METHODS ──────────────────────────────────────────────────

  /**
   * Admin lists all withdrawals across all resellers with filters & aggregates.
   */
  async getAllWithdrawalsAdmin(query: WithdrawalQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WithdrawalWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.payoutMethod) {
      where.payoutMethod = query.payoutMethod;
    }
    if (query.resellerId) {
      where.resellerId = query.resellerId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { accountDetails: { contains: search, mode: 'insensitive' } },
        { reseller: { name: { contains: search, mode: 'insensitive' } } },
        { reseller: { phone: { contains: search, mode: 'insensitive' } } },
        { reseller: { email: { contains: search, mode: 'insensitive' } } },
        { reseller: { pageName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data, aggregates] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reseller: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              pageName: true,
              imageUrl: true,
            },
          },
          processedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.withdrawal.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    let totalPaidOut = 0;
    let totalPendingAmount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;

    for (const agg of aggregates) {
      const amount = Number(agg._sum.amount || 0);
      const count = agg._count;
      if (agg.status === WithdrawalStatus.COMPLETED) {
        totalPaidOut += amount;
        completedCount += count;
      } else if (
        agg.status === WithdrawalStatus.PENDING ||
        agg.status === WithdrawalStatus.PROCESSING
      ) {
        totalPendingAmount += amount;
        pendingCount += count;
      } else if (agg.status === WithdrawalStatus.REJECTED) {
        rejectedCount += count;
      }
    }

    return {
      data,
      kpis: {
        totalPaidOut: Number(totalPaidOut.toFixed(2)),
        totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
        pendingCount,
        completedCount,
        rejectedCount,
        totalRequests: total,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin approves and completes a withdrawal with proof documents & TrxID.
   */
  async completeWithdrawalAdmin(
    adminId: string,
    withdrawalId: string,
    dto: CompleteWithdrawalDto,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { reseller: true },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request not found`);
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      throw new BadRequestException('This withdrawal request has already been completed.');
    }

    if (withdrawal.status === WithdrawalStatus.CANCELLED) {
      throw new BadRequestException('Cannot process a cancelled withdrawal request.');
    }

    return this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.COMPLETED,
        transactionId: dto.transactionId?.trim() || null,
        proofImageUrl: dto.proofImageUrl?.trim() || null,
        adminNotes: dto.adminNotes?.trim() || null,
        processedBy: adminId,
        processedAt: new Date(),
      },
      include: {
        reseller: {
          select: { id: true, name: true, email: true, phone: true, pageName: true },
        },
        processedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Admin rejects a withdrawal request with a mandatory reason.
   */
  async rejectWithdrawalAdmin(
    adminId: string,
    withdrawalId: string,
    dto: RejectWithdrawalDto,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request not found`);
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      throw new BadRequestException('Cannot reject an already completed withdrawal.');
    }

    if (withdrawal.status === WithdrawalStatus.CANCELLED) {
      throw new BadRequestException('Cannot reject a cancelled withdrawal request.');
    }

    return this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.REJECTED,
        adminNotes: dto.adminNotes.trim(),
        processedBy: adminId,
        processedAt: new Date(),
      },
      include: {
        reseller: {
          select: { id: true, name: true, email: true, phone: true, pageName: true },
        },
        processedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
