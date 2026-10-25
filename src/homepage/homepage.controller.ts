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

const HOMEPAGE_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('homepage')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  /** Published configuration only — used by the public storefront. */
  @Get()
  getPublic() {
    return this.homepageService.getPublic();
  }

  /** Draft workspace — admin only. */
  @Get('admin')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  getAdmin() {
    return this.homepageService.getAdmin();
  }

  @Post('sections')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  createSection(@Body() dto: CreateSectionDto) {
    return this.homepageService.createSection(dto);
  }

  @Post('sections/reorder')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  reorderSections(@Body() dto: ReorderSectionsDto) {
    return this.homepageService.reorderSections(dto);
  }

  @Post('sections/:id/duplicate')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  duplicateSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.homepageService.duplicateSection(id);
  }

  @Patch('sections/:id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.homepageService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  deleteSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.homepageService.deleteSection(id);
  }

  @Post('publish')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  publish() {
    return this.homepageService.publish();
  }

  @Post('discard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  discard() {
    return this.homepageService.discard();
  }

  @Post('reset')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...HOMEPAGE_WRITE_ROLES)
  reset() {
    return this.homepageService.reset();
  }
}
