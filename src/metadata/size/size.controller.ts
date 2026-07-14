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
import { SizeService } from './size.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

const METADATA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('sizes')
export class SizeController {
  constructor(private readonly sizeService: SizeService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  create(@Body() dto: CreateSizeDto) {
    return this.sizeService.create(dto);
  }

  @Get()
  findAll() {
    return this.sizeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sizeService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSizeDto,
  ) {
    return this.sizeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sizeService.remove(id);
  }
}
