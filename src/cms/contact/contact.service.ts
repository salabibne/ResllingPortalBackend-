import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    return this.prisma.cmsContact.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        telegram: dto.telegram,
        whatsapp: dto.whatsapp,
        facebook: dto.facebook,
        status: dto.status,
      },
    });
  }

  async findAll() {
    const items = await this.prisma.cmsContact.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('No contact entries found');
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.cmsContact.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Contact entry with ID "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id);

    return this.prisma.cmsContact.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cmsContact.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
