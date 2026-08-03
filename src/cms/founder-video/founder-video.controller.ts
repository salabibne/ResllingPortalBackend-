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
import { UserRole } from '../../../prisma/generated/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateFounderVideoDto } from './dto/create-founder-video.dto';
import { UpdateFounderVideoDto } from './dto/update-founder-video.dto';
import { FounderVideoService } from './founder-video.service';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('cms/founder-video')
export class FounderVideoController {
  constructor(private readonly founderVideoService: FounderVideoService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: CreateFounderVideoDto) {
    return this.founderVideoService.create(dto);
  }

  @Get()
  findAll() {
    return this.founderVideoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.founderVideoService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFounderVideoDto,
  ) {
    return this.founderVideoService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.founderVideoService.remove(id);
  }
}
