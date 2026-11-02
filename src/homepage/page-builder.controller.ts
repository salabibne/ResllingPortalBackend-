import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSectionDto, ReorderSectionsDto, UpdateSectionDto } from './dto/section.dto';
import { HomepageService } from './homepage.service';

const PAGE_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

/**
 * The Homepage Builder's section engine for custom pages: same sections,
 * designs, icons and draft → publish flow, scoped to one page by id.
 */
@Controller('page-builder')
export class PageBuilderController {
  constructor(private readonly builder: HomepageService) {}

  /** Published page and sections — used by the storefront at /pages/:slug. */
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.builder.getPublicPage(slug);
  }

  /** Draft workspace — admin only. */
  @Get(':pageId/admin')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  getAdmin(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.builder.getAdmin(pageId);
  }

  @Post(':pageId/sections')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  createSection(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.builder.createSection(dto, pageId);
  }

  @Post(':pageId/sections/reorder')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  reorderSections(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.builder.reorderSections(dto, pageId);
  }

  @Post(':pageId/sections/:id/duplicate')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  duplicateSection(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.builder.duplicateSection(id, pageId);
  }

  @Patch(':pageId/sections/:id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  updateSection(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.builder.updateSection(id, dto, pageId);
  }

  @Delete(':pageId/sections/:id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  deleteSection(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.builder.deleteSection(id, pageId);
  }

  @Post(':pageId/publish')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  publish(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.builder.publish(pageId);
  }

  @Post(':pageId/discard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PAGE_WRITE_ROLES)
  discard(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.builder.discard(pageId);
  }
}
