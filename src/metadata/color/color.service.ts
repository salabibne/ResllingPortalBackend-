import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@Injectable()
export class ColorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateColorDto) {
    return this.prisma.color.create({
      data: {
        name: dto.name,
        colorCode: dto.colorCode,
        status: dto.status,
      },
    });
  }

  async findAll() {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const color = await this.prisma.color.findUnique({
      where: { id },
    });

    if (!color) {
      throw new NotFoundException(`Color with ID "${id}" not found`);
    }

    return color;
  }

  async update(id: string, dto: UpdateColorDto) {
    await this.findOne(id);

    return this.prisma.color.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.color.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
