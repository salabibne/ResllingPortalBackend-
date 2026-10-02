import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../../prisma/generated/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CustomPagesService } from './custom-pages.service';
import { CreateCustomPageDto } from './dto/create-custom-page.dto';
import { UpdateCustomPageDto } from './dto/update-custom-page.dto';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('custom-pages')
export class CustomPagesController {
  constructor(private readonly customPagesService: CustomPagesService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.customPagesService.findAll({ search, status });
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.customPagesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customPagesService.findOne(id);
  }

  @Post('reset-home')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  resetHome() {
    return this.customPagesService.resetHomePage();
  }

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: CreateCustomPageDto) {
    return this.customPagesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateCustomPageDto) {
    return this.customPagesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.customPagesService.remove(id);
  }

  // Section Routes
  @Post(':pageId/sections')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  addSection(@Param('pageId') pageId: string, @Body() dto: any) {
    return this.customPagesService.addSection(pageId, dto);
  }

  @Patch('sections/:sectionId')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  updateSection(@Param('sectionId') sectionId: string, @Body() dto: any) {
    return this.customPagesService.updateSection(sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.customPagesService.deleteSection(sectionId);
  }

  @Post(':pageId/sections/reorder')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  reorderSections(
    @Param('pageId') pageId: string,
    @Body('sectionOrders') sectionOrders: { id: string; sortOrder: number }[],
  ) {
    return this.customPagesService.reorderSections(pageId, sectionOrders);
  }
}
