import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../../prisma/generated/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { LegalDocumentsService } from './legal-documents.service';
import { SaveLegalDocumentDto } from './dto/save-legal-document.dto';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('legal-documents')
export class LegalDocumentsController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  @Get()
  findAll() {
    return this.legalDocumentsService.findAll();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.legalDocumentsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.legalDocumentsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: SaveLegalDocumentDto) {
    return this.legalDocumentsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: Partial<SaveLegalDocumentDto>) {
    return this.legalDocumentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.legalDocumentsService.remove(id);
  }
}
