import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamDto) {
    return this.prisma.cmsTeam.create({
      data: {
        name: dto.name,
        designation: dto.designation,
        imageUrl: dto.imageUrl,
        message: dto.message,
        status: dto.status,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsTeam.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    if (!items || items.length === 0) {
      return [];
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsTeam.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Team member entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);

    return this.prisma.cmsTeam.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsTeam.delete({
      where: { id },
    });
  }
}
