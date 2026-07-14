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
import { AgeVariantService } from './age-variant.service';
import { CreateAgeVariantDto } from './dto/create-age-variant.dto';
import { UpdateAgeVariantDto } from './dto/update-age-variant.dto';

const METADATA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('age-variants')
export class AgeVariantController {
  constructor(private readonly ageVariantService: AgeVariantService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  create(@Body() dto: CreateAgeVariantDto) {
    return this.ageVariantService.create(dto);
  }

  @Get()
  findAll() {
    return this.ageVariantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ageVariantService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgeVariantDto,
  ) {
    return this.ageVariantService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ageVariantService.remove(id);
  }
}
