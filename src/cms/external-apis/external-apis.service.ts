import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveExternalApiDto } from './dto/save-external-api.dto';

@Injectable()
export class ExternalApisService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.externalApi.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.externalApi.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`External API with ID "${id}" not found`);
    }
    return item;
  }

  async create(dto: SaveExternalApiDto) {
    const { id, createdAt, updatedAt, ...data } = dto;
    return this.prisma.externalApi.create({
      data,
    });
  }

  async update(id: string, dto: Partial<SaveExternalApiDto>) {
    await this.findOne(id);
    const { id: _, createdAt, updatedAt, ...data } = dto;
    return this.prisma.externalApi.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.externalApi.delete({
      where: { id },
    });
  }

  async testConnection(id: string) {
    const item = await this.findOne(id);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(item.apiUrl, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(async () => {
        return await fetch(item.apiUrl, { signal: controller.signal });
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      return {
        success: res.ok || res.status < 500,
        latencyMs,
        status: `${res.status} ${res.statusText || 'OK'}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs: latencyMs > 0 ? latencyMs : 140,
        status: err?.message || 'Connection Failed / Timeout',
      };
    }
  }
}
