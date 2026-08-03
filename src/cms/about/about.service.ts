import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAboutDto } from './dto/create-about.dto';
import { UpdateAboutDto } from './dto/update-about.dto';

@Injectable()
export class AboutService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAboutDto) {
    return this.prisma.cmsAbout.create({
      data: {
        title: dto.title,
        description: dto.description,
        youtubeLink: dto.youtubeLink,
        buttonText1: dto.buttonText1,
        buttonLink1: dto.buttonLink1,
        buttonText2: dto.buttonText2,
        buttonLink2: dto.buttonLink2,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsAbout.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No about entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsAbout.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`About entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateAboutDto) {
    await this.findOne(id);

    return this.prisma.cmsAbout.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsAbout.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
