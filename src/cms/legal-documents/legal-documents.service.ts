import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveLegalDocumentDto } from './dto/save-legal-document.dto';

@Injectable()
export class LegalDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.legalDocument.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const doc = await this.prisma.legalDocument.findUnique({
      where: { slug },
    });

    if (!doc) {
      throw new NotFoundException(`Legal document with slug "${slug}" not found`);
    }

    return doc;
  }

  async findOne(id: string) {
    const doc = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException(`Legal document with ID "${id}" not found`);
    }

    return doc;
  }

  async create(dto: SaveLegalDocumentDto) {
    const slug =
      dto.slug ||
      dto.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-');

    const existing = await this.prisma.legalDocument.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Slug "${slug}" is already in use`);
    }

    const { id, createdAt, updatedAt, ...docData } = dto;

    return this.prisma.legalDocument.create({
      data: {
        ...docData,
        slug,
      },
    });
  }

  async update(id: string, dto: Partial<SaveLegalDocumentDto>) {
    await this.findOne(id);

    const { id: _, createdAt, updatedAt, ...docData } = dto;

    if (docData.slug) {
      const existing = await this.prisma.legalDocument.findUnique({ where: { slug: docData.slug } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Slug "${docData.slug}" is already in use`);
      }
    }

    return this.prisma.legalDocument.update({
      where: { id },
      data: docData,
    });
  }

  async remove(id: string) {
    const doc = await this.findOne(id);
    if (doc.isSystem) {
      throw new BadRequestException('System protected legal documents cannot be deleted');
    }

    return this.prisma.legalDocument.delete({
      where: { id },
    });
  }
}
