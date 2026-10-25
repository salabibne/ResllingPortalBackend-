import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommonStatus, UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserService } from './user.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: CommonStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.userService.findAll({
      search,
      role,
      status,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    this.assertNotSelf(req, id);

    // Approving (ACTIVE) and suspending (DEACTIVATED) is an administrator
    // action only — never something a user can do for their own account.
    return this.userService.updateStatus(id, dto.status);
  }

  @Patch(':id/role')
  updateRole(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    this.assertNotSelf(req, id);

    if (
      dto.role === UserRole.SUPER_ADMIN &&
      req.user?.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a super administrator can grant the super administrator role',
      );
    }

    return this.userService.updateRole(id, dto.role);
  }

  private assertNotSelf(req: any, targetId: string) {
    if (req?.user?.id && req.user.id === targetId) {
      throw new ForbiddenException(
        'You cannot change your own role or account status',
      );
    }
  }
}
