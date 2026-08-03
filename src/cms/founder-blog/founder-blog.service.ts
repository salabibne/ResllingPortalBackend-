import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFounderBlogDto } from './dto/create-founder-blog.dto';
import { UpdateFounderBlogDto } from './dto/update-founder-blog.dto';

@Injectable()
export class FounderBlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFounderBlogDto) {
    return this.prisma.cmsFounderBlog.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        description: dto.description,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsFounderBlog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No founder blog entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsFounderBlog.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Founder Blog entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateFounderBlogDto) {
    await this.findOne(id);

    return this.prisma.cmsFounderBlog.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsFounderBlog.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
