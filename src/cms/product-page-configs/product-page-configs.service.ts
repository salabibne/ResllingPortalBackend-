import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveProductPageConfigDto } from './dto/save-product-page-config.dto';

@Injectable()
export class ProductPageConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByProductId(productId: string) {
    const config = await this.prisma.productPageConfig.findUnique({
      where: { productId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!config) {
      throw new NotFoundException(`Product page config for product "${productId}" not found`);
    }

    return config;
  }

  async create(dto: SaveProductPageConfigDto) {
    const { id, createdAt, updatedAt, product, sections, ...configData } = dto;

    return this.prisma.productPageConfig.create({
      data: {
        ...configData,
        sections:
          sections && sections.length > 0
            ? {
                create: sections.map((sec: any, idx: number) => ({
                  title: sec.title || '',
                  subtitle: sec.subtitle,
                  description: sec.description,
                  imageUrl: sec.imageUrl,
                  images: sec.images || [],
                  imageDescription: sec.imageDescription,
                  buttonText: sec.buttonText,
                  buttonLink: sec.buttonLink,
                  productIds: sec.productIds || [],
                  sortOrder: sec.sortOrder ?? idx + 1,
                  content: sec.content || {},
                })),
              }
            : undefined,
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async update(id: string, dto: Partial<SaveProductPageConfigDto>) {
    const existing = await this.prisma.productPageConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product page config with ID "${id}" not found`);
    }

    const { id: _, createdAt, updatedAt, product, sections, ...configData } = dto;

    await this.prisma.productPageConfig.update({
      where: { id },
      data: configData,
    });

    if (sections) {
      await this.prisma.productPageSection.deleteMany({ where: { productPageConfigId: id } });
      if (sections.length > 0) {
        await this.prisma.productPageSection.createMany({
          data: sections.map((sec: any, idx: number) => ({
            productPageConfigId: id,
            title: sec.title || '',
            subtitle: sec.subtitle,
            description: sec.description,
            imageUrl: sec.imageUrl,
            images: sec.images || [],
            imageDescription: sec.imageDescription,
            buttonText: sec.buttonText,
            buttonLink: sec.buttonLink,
            productIds: sec.productIds || [],
            sortOrder: sec.sortOrder ?? idx + 1,
            content: sec.content || {},
          })),
        });
      }
    }

    return this.prisma.productPageConfig.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
