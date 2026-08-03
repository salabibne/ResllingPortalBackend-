import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSocialMediaDto } from './dto/create-social-media.dto';
import { UpdateSocialMediaDto } from './dto/update-social-media.dto';

@Injectable()
export class SocialMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSocialMediaDto) {
    return this.prisma.cmsSocialMedia.create({
      data: {
        name: dto.name,
        iconName: dto.iconName,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsSocialMedia.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No social media entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsSocialMedia.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Social Media item with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateSocialMediaDto) {
    await this.findOne(id);

    return this.prisma.cmsSocialMedia.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsSocialMedia.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
