import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';

@Injectable()
export class HeroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHeroDto) {
    return this.prisma.cmsHero.create({
      data: {
        heroTitle: dto.heroTitle,
        heroSubtitle: dto.heroSubtitle,
        buttonText1: dto.buttonText1,
        buttonLink1: dto.buttonLink1,
        buttonText2: dto.buttonText2,
        buttonLink2: dto.buttonLink2,
        imageUrl: dto.imageUrl,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsHero.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No hero entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsHero.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Hero entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateHeroDto) {
    await this.findOne(id);

    return this.prisma.cmsHero.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsHero.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
