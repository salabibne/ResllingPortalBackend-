import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChildCategoryDto } from './dto/create-child-category.dto';
import { UpdateChildCategoryDto } from './dto/update-child-category.dto';

@Injectable()
export class ChildCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChildCategoryDto) {
    return this.prisma.childCategory.create({
      data: {
        name: dto.name,
        subcategoryId: dto.subcategoryId,
        status: dto.status,
      },
      include: { subcategory: true },
    });
  }

  async findAll() {
    return this.prisma.childCategory.findMany({
      include: { subcategory: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const childCategory = await this.prisma.childCategory.findUnique({
      where: { id },
      include: { subcategory: { include: { category: true } } },
    });

    if (!childCategory) {
      throw new NotFoundException(`ChildCategory with ID "${id}" not found`);
    }

    return childCategory;
  }

  async update(id: string, dto: UpdateChildCategoryDto) {
    await this.findOne(id);

    return this.prisma.childCategory.update({
      where: { id },
      data: dto,
      include: { subcategory: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.childCategory.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
