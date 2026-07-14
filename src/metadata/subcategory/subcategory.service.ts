import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class SubcategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubcategoryDto) {
    return this.prisma.subcategory.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        status: dto.status,
      },
      include: { category: true },
    });
  }

  async findAll() {
    return this.prisma.subcategory.findMany({
      include: { category: true, childCategories: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true, childCategories: true },
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID "${id}" not found`);
    }

    return subcategory;
  }

  async update(id: string, dto: UpdateSubcategoryDto) {
    await this.findOne(id);

    return this.prisma.subcategory.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.subcategory.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
