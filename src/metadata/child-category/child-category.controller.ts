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
import { ChildCategoryService } from './child-category.service';
import { CreateChildCategoryDto } from './dto/create-child-category.dto';
import { UpdateChildCategoryDto } from './dto/update-child-category.dto';

const METADATA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_EXECUTIVE,
  UserRole.INVENTOR,
];

@Controller('child-categories')
export class ChildCategoryController {
  constructor(private readonly childCategoryService: ChildCategoryService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  create(@Body() dto: CreateChildCategoryDto) {
    return this.childCategoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.childCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.childCategoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChildCategoryDto,
  ) {
    return this.childCategoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...METADATA_WRITE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.childCategoryService.remove(id);
  }
}
