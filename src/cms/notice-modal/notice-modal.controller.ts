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
import { NoticeAudience, UserRole } from '../../../prisma/generated/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateNoticeModalDto } from './dto/create-notice-modal.dto';
import { UpdateNoticeModalDto } from './dto/update-notice-modal.dto';
import { NoticeModalService } from './notice-modal.service';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('cms/notices')
export class NoticeModalController {
  constructor(private readonly noticeModalService: NoticeModalService) {}

  /**
   * Public endpoint to fetch currently active notice for target audience (PUBLIC, RESELLER, ALL).
   */
  @Get('active')
  findActive(@Query('audience') audience?: NoticeAudience) {
    return this.noticeModalService.findActive(audience);
  }

  /**
   * Admin endpoint: list all notices.
   */
  @Get()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  findAll() {
    return this.noticeModalService.findAll();
  }

  /**
   * Admin endpoint: find single notice.
   */
  @Get(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  findOne(@Param('id') id: string) {
    return this.noticeModalService.findOne(id);
  }

  /**
   * Admin endpoint: create notice.
   */
  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: CreateNoticeModalDto) {
    return this.noticeModalService.create(dto);
  }

  /**
   * Admin endpoint: update notice.
   */
  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateNoticeModalDto) {
    return this.noticeModalService.update(id, dto);
  }

  /**
   * Admin endpoint: quick toggle status (ACTIVE / DEACTIVATED).
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  toggleStatus(@Param('id') id: string) {
    return this.noticeModalService.toggleStatus(id);
  }

  /**
   * Admin endpoint: delete notice.
   */
  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.noticeModalService.remove(id);
  }
}
