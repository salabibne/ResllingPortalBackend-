import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../../prisma/generated/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { ProductPageConfigsService } from './product-page-configs.service';
import { SaveProductPageConfigDto } from './dto/save-product-page-config.dto';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('product-page-configs')
export class ProductPageConfigsController {
  constructor(
    private readonly productPageConfigsService: ProductPageConfigsService,
  ) {}

  @Get('product/:productId')
  getByProductId(@Param('productId') productId: string) {
    return this.productPageConfigsService.getByProductId(productId);
  }

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: SaveProductPageConfigDto) {
    return this.productPageConfigsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<SaveProductPageConfigDto>,
  ) {
    return this.productPageConfigsService.update(id, dto);
  }
}
