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
import { CreateFounderBlogDto } from './dto/create-founder-blog.dto';
import { UpdateFounderBlogDto } from './dto/update-founder-blog.dto';
import { FounderBlogService } from './founder-blog.service';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('cms/founder-blog')
export class FounderBlogController {
  constructor(private readonly founderBlogService: FounderBlogService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: CreateFounderBlogDto) {
    return this.founderBlogService.create(dto);
  }

  @Get()
  findAll() {
    return this.founderBlogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.founderBlogService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFounderBlogDto,
  ) {
    return this.founderBlogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.founderBlogService.remove(id);
  }
}
