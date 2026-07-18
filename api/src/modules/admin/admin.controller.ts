// Author: Robert Massey | Created: 2026-07-13 | Module: Admin
// PLATFORM_ADMIN only — the whole controller. @AllowReadOnly because the
// platform org itself never goes read-only, but support actions must work
// even while a target org is read-only. Restore/purge-request live on the
// existing /admin/lifecycle controller.

import {
  AdminEntitlementOverride,
  AdminOrgDetail,
  AdminOrgSummary,
  PlatformStaffSummary,
} from '@attune-sb/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AdminService } from './admin.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { InvitePlatformAdminDto } from './dto/invite-platform-admin.dto';
import { ListOrgsQueryDto } from './dto/list-orgs-query.dto';
import { SetLegalHoldDto } from './dto/set-legal-hold.dto';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { AllowReadOnly } from '@/modules/lifecycle/decorators/allow-read-only.decorator';

@ApiTags('Admin')
@Controller('admin')
@Roles(Role.PLATFORM_ADMIN)
@AllowReadOnly()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('orgs')
  @ApiOperation({ summary: 'List all organizations (PLATFORM_ADMIN)' })
  listOrgs(@Query() query: ListOrgsQueryDto): Promise<{ orgs: AdminOrgSummary[]; total: number }> {
    return this.adminService.listOrgs(query);
  }

  @Get('orgs/:id')
  @ApiOperation({ summary: 'Org detail: subscription, usage, members, overrides' })
  getOrg(@Param('id', ParseUUIDPipe) id: string): Promise<AdminOrgDetail> {
    return this.adminService.getOrg(id);
  }

  @Post('orgs/:id/legal-hold')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set or clear the legal hold flag (blocks purge)' })
  async setLegalHold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetLegalHoldDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.adminService.setLegalHold(id, dto.hold, user.userId);
  }

  @Post('orgs/:id/overrides')
  @ApiOperation({ summary: 'Create an entitlement override for an org' })
  createOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEntitlementOverride> {
    return this.adminService.createOverride(id, dto, user.userId);
  }

  @Delete('orgs/:id/overrides/:overrideId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an entitlement override' })
  async deleteOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.adminService.deleteOverride(id, overrideId, user.userId);
  }

  @Get('platform-staff')
  @ApiOperation({ summary: 'List platform-org staff and pending PLATFORM_ADMIN invites' })
  listPlatformStaff(@CurrentUser() user: AuthenticatedUser): Promise<PlatformStaffSummary> {
    return this.adminService.listPlatformStaff(user);
  }

  @Post('platform-staff/invite')
  @ApiOperation({ summary: 'Invite a peer as PLATFORM_ADMIN into the platform org' })
  invitePlatformAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InvitePlatformAdminDto,
  ): Promise<{ id: string; email: string }> {
    return this.adminService.invitePlatformAdmin(user, dto);
  }

  @Post('platform-staff/:userId/grant')
  @HttpCode(204)
  @ApiOperation({ summary: 'Promote a platform-org member to PLATFORM_ADMIN' })
  async grantPlatformAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.adminService.grantPlatformAdmin(user, userId);
  }

  @Post('platform-staff/:userId/revoke')
  @HttpCode(204)
  @ApiOperation({ summary: 'Demote a PLATFORM_ADMIN to ADMIN (cannot revoke self or last admin)' })
  async revokePlatformAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.adminService.revokePlatformAdmin(user, userId);
  }
}
