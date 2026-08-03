import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFounderVideoDto } from './dto/create-founder-video.dto';
import { UpdateFounderVideoDto } from './dto/update-founder-video.dto';

@Injectable()
export class FounderVideoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFounderVideoDto) {
    return this.prisma.cmsFounderVideo.create({
      data: {
        title: dto.title,
        videoLink: dto.videoLink,
        description: dto.description,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsFounderVideo.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No founder video entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsFounderVideo.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Founder Video entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateFounderVideoDto) {
    await this.findOne(id);

    return this.prisma.cmsFounderVideo.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsFounderVideo.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
