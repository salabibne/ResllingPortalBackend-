import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonStatus, NoticeAudience } from '../../../prisma/generated/client';
import { CreateNoticeModalDto } from './dto/create-notice-modal.dto';
import { UpdateNoticeModalDto } from './dto/update-notice-modal.dto';

@Injectable()
export class NoticeModalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.noticeModal.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(audience?: NoticeAudience) {
    const now = new Date();

    const audienceFilter: NoticeAudience[] =
      audience === NoticeAudience.RESELLER
        ? [NoticeAudience.RESELLER, NoticeAudience.ALL]
        : audience === NoticeAudience.PUBLIC
        ? [NoticeAudience.PUBLIC, NoticeAudience.ALL]
        : [NoticeAudience.ALL, NoticeAudience.PUBLIC, NoticeAudience.RESELLER];

    const notices = await this.prisma.noticeModal.findMany({
      where: {
        status: CommonStatus.ACTIVE,
        targetAudience: { in: audienceFilter },
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } },
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Return the latest active notice or null
    return notices.length > 0 ? notices[0] : null;
  }

  async findOne(id: string) {
    const notice = await this.prisma.noticeModal.findUnique({
      where: { id },
    });

    if (!notice) {
      throw new NotFoundException(`Notice modal with ID "${id}" not found`);
    }

    return notice;
  }

  async create(dto: CreateNoticeModalDto) {
    return this.prisma.noticeModal.create({
      data: {
        title: dto.title,
        content: dto.content,
        imageUrl: dto.imageUrl || null,
        buttonText: dto.buttonText || null,
        buttonLink: dto.buttonLink || null,
        targetAudience: dto.targetAudience || NoticeAudience.ALL,
        status: dto.status || CommonStatus.ACTIVE,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateNoticeModalDto) {
    await this.findOne(id);

    return this.prisma.noticeModal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.buttonText !== undefined && { buttonText: dto.buttonText || null }),
        ...(dto.buttonLink !== undefined && { buttonLink: dto.buttonLink || null }),
        ...(dto.targetAudience !== undefined && { targetAudience: dto.targetAudience }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
      },
    });
  }

  async toggleStatus(id: string) {
    const notice = await this.findOne(id);
    const newStatus =
      notice.status === CommonStatus.ACTIVE
        ? CommonStatus.DEACTIVATED
        : CommonStatus.ACTIVE;

    return this.prisma.noticeModal.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.noticeModal.delete({
      where: { id },
    });
  }
}
