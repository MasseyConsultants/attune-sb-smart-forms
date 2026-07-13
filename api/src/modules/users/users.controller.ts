// Author: Robert Massey | Created: 2026-07-12 | Module: Users

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

import { UsersService, UserProfileDto } from './users.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List org members (ADMIN+)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto[]> {
    return this.usersService.listOrgMembers(user);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Change a member role (ADMIN+)' })
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateRole(user, id, dto.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a member (ADMIN+)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ removed: true }> {
    await this.usersService.deactivate(user, id);
    return { removed: true };
  }
}
