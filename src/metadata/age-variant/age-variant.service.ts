import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgeVariantDto } from './dto/create-age-variant.dto';
import { UpdateAgeVariantDto } from './dto/update-age-variant.dto';

@Injectable()
export class AgeVariantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAgeVariantDto) {
    return this.prisma.ageVariant.create({
      data: {
        ageRange: dto.ageRange,
        status: dto.status,
      },
    });
  }

  async findAll() {
    return this.prisma.ageVariant.findMany({
      orderBy: { ageRange: 'asc' },
    });
  }

  async findOne(id: string) {
    const ageVariant = await this.prisma.ageVariant.findUnique({
      where: { id },
    });

    if (!ageVariant) {
      throw new NotFoundException(`AgeVariant with ID "${id}" not found`);
    }

    return ageVariant;
  }

  async update(id: string, dto: UpdateAgeVariantDto) {
    await this.findOne(id);

    return this.prisma.ageVariant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.ageVariant.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
