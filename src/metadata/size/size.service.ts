import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Injectable()
export class SizeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSizeDto) {
    return this.prisma.size.create({
      data: {
        name: dto.name,
        status: dto.status,
      },
    });
  }

  async findAll() {
    return this.prisma.size.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const size = await this.prisma.size.findUnique({
      where: { id },
    });

    if (!size) {
      throw new NotFoundException(`Size with ID "${id}" not found`);
    }

    return size;
  }

  async update(id: string, dto: UpdateSizeDto) {
    await this.findOne(id);

    return this.prisma.size.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.size.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
