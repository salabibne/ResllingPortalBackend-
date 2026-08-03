import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionDto) {
    return this.prisma.cmsSection.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        cardTitle: dto.cardTitle,
        cardIcon: dto.cardIcon,
        cardDescription: dto.cardDescription,
        cardButton: dto.cardButton,
        cardLink: dto.cardLink,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsSection.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No section entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsSection.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Section entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateSectionDto) {
    await this.findOne(id);

    return this.prisma.cmsSection.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsSection.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
