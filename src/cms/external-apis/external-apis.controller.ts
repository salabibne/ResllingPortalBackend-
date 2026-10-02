import {
  Body,
  Controller,
  Delete,
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

import { ExternalApisService } from './external-apis.service';
import { SaveExternalApiDto } from './dto/save-external-api.dto';

const CMS_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Controller('external-apis')
export class ExternalApisController {
  constructor(private readonly externalApisService: ExternalApisService) {}

  @Get()
  findAll() {
    return this.externalApisService.findAll();
  }

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  create(@Body() dto: SaveExternalApiDto) {
    return this.externalApisService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: Partial<SaveExternalApiDto>) {
    return this.externalApisService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.externalApisService.remove(id);
  }

  @Post(':id/test')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...CMS_WRITE_ROLES)
  testConnection(@Param('id') id: string) {
    return this.externalApisService.testConnection(id);
  }
}
