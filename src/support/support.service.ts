import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportTicketReason, SupportTicketStatus } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupportTicketDto,
  SupportTicketQueryDto,
  UpdateSupportTicketStatusDto,
} from './dto/support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTicketId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }

  async createTicket(userId: string, dto: CreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketId: this.generateTicketId(),
        userId,
        reason: dto.reason,
        message: dto.message,
        status: SupportTicketStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Support ticket created successfully',
      ticketId: ticket.ticketId,
      ticket,
    };
  }

  async getMyTickets(userId: string, query: SupportTicketQueryDto) {
    const { page = 1, limit = 10 } = this.parsePagination(query);

    const where: Prisma.SupportTicketWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.reason ? { reason: query.reason as SupportTicketReason } : {}),
      ...(query.search
        ? {
            OR: [
              { ticketId: { contains: query.search, mode: 'insensitive' as const } },
              { message: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
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

  async getTicketById(userId: string, ticketId: string, isAdmin: boolean) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticketId }],
        ...(isAdmin ? {} : { userId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async getAllTickets(query: SupportTicketQueryDto) {
    const { page = 1, limit = 10 } = this.parsePagination(query);

    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.reason ? { reason: query.reason as SupportTicketReason } : {}),
      ...(query.search
        ? {
            OR: [
              { ticketId: { contains: query.search, mode: 'insensitive' as const } },
              { message: { contains: query.search, mode: 'insensitive' as const } },
              {
                user: {
                  name: { contains: query.search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  email: { contains: query.search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
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

  async updateTicketStatus(ticketId: string, dto: UpdateSupportTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticketId }],
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status,
        ...(dto.adminNotes !== undefined ? { adminNotes: dto.adminNotes } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  private parsePagination(query: SupportTicketQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    return { page, limit };
  }
}
