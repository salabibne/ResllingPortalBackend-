import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFounderDto } from './dto/create-founder.dto';
import { UpdateFounderDto } from './dto/update-founder.dto';

@Injectable()
export class FounderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFounderDto) {
    return this.prisma.cmsFounder.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsFounder.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No founder entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsFounder.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Founder entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateFounderDto) {
    await this.findOne(id);

    return this.prisma.cmsFounder.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsFounder.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
