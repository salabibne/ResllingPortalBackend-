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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Product create/update: SUPER_ADMIN, ADMIN, MANAGER */
const PRODUCT_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

/** Product delete: SUPER_ADMIN, ADMIN only */
const PRODUCT_DELETE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PRODUCT_WRITE_ROLES)
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PRODUCT_WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...PRODUCT_DELETE_ROLES)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }
}
