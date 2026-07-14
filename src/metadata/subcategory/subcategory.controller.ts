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
import { SubcategoryService } from './subcategory.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

const METADATA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('subcategories')
export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  create(@Body() dto: CreateSubcategoryDto) {
    return this.subcategoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.subcategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subcategoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubcategoryDto,
  ) {
    return this.subcategoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subcategoryService.remove(id);
  }
}
