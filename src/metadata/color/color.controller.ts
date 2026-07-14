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
import { ColorService } from './color.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

const METADATA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  create(@Body() dto: CreateColorDto) {
    return this.colorService.create(dto);
  }

  @Get()
  findAll() {
    return this.colorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.colorService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColorDto,
  ) {
    return this.colorService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.colorService.remove(id);
  }
}
