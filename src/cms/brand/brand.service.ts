import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    return this.prisma.cmsBrand.create({
      data: {
        logoUrl: dto.logoUrl,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsBrand.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No site logo entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsBrand.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Site logo entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    return this.prisma.cmsBrand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsBrand.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
