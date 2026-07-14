import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        name: dto.name,
        imageUrl: dto.imageUrl,
        status: dto.status,
      },
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID "${id}" not found`);
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.brand.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
