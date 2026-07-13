// Author: Robert Massey | Created: 2026-07-12 | Module: Organizations

import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { OrganizationsService, OrganizationDto } from './organizations.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

class RenameOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current organization with subscription summary' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationDto> {
    return this.organizationsService.getCurrent(user.organizationId);
  }

  @Patch('me')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Rename the organization (OWNER)' })
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RenameOrgDto,
  ): Promise<OrganizationDto> {
    return this.organizationsService.rename(user.organizationId, dto.name);
  }
}
