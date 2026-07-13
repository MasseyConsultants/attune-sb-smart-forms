// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle
// Purpose: PLATFORM_ADMIN operations — manually trigger a sweep (staging
// rehearsals, support) and process verified user deletion requests.

import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AllowReadOnly } from './decorators/allow-read-only.decorator';
import { LifecycleService, SweepResult } from './lifecycle.service';

import { Roles } from '@/modules/auth/decorators/roles.decorator';

@ApiTags('Lifecycle (admin)')
@Controller('admin/lifecycle')
@Roles(Role.PLATFORM_ADMIN)
@AllowReadOnly()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post('sweep')
  @ApiOperation({ summary: 'Run the lifecycle sweep now (PLATFORM_ADMIN)' })
  sweep(): Promise<SweepResult> {
    return this.lifecycleService.runDailySweep();
  }

  @Post('orgs/:orgId/restore')
  @ApiOperation({ summary: 'Support restore of a read-only/purge-pending org (PLATFORM_ADMIN)' })
  async restore(@Param('orgId', ParseUUIDPipe) orgId: string): Promise<{ restored: true }> {
    await this.lifecycleService.restore(orgId, 'support:platform-admin');
    return { restored: true };
  }

  @Post('orgs/:orgId/purge-request')
  @ApiOperation({ summary: 'Record a verified user deletion request (PLATFORM_ADMIN)' })
  async purgeRequest(@Param('orgId', ParseUUIDPipe) orgId: string): Promise<{ requested: true }> {
    await this.lifecycleService.requestPurge(orgId);
    return { requested: true };
  }
}
