// Author: Robert Massey | Created: 2026-07-16 | Module: Ops
// PLATFORM_ADMIN only — the whole controller. @AllowReadOnly for the same
// reason as AdminController: platform staff must be able to troubleshoot
// regardless of any org's lifecycle state.

import {
  AdminStripeWebhookEvent,
  OpsEventsPage,
  OpsOverview,
  OpsQueuesResponse,
  OpsUsageHotspot,
} from '@attune-sb/shared-types';
import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ListOpsEventsQueryDto } from './dto/list-ops-events-query.dto';
import { ListWebhookEventsQueryDto } from './dto/list-webhook-events-query.dto';
import { OpsEventsService } from './ops-events.service';
import { OpsService } from './ops.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { AllowReadOnly } from '@/modules/lifecycle/decorators/allow-read-only.decorator';

@ApiTags('Ops')
@Controller('admin/ops')
@Roles(Role.PLATFORM_ADMIN)
@AllowReadOnly()
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly opsEvents: OpsEventsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'System health, RED traffic metrics, queues, and business stats' })
  overview(): Promise<OpsOverview> {
    return this.opsService.overview();
  }

  @Get('events')
  @ApiOperation({ summary: 'Browse the API error / security event ledger' })
  listEvents(@Query() query: ListOpsEventsQueryDto): Promise<OpsEventsPage> {
    return this.opsEvents.list(query);
  }

  @Get('queues')
  @ApiOperation({ summary: 'BullMQ queue snapshots + recent failed jobs' })
  async queues(): Promise<OpsQueuesResponse> {
    const [queues, failedJobs] = await Promise.all([
      this.opsService.queueSnapshots(),
      this.opsService.failedJobs(),
    ]);
    return { queues, failedJobs };
  }

  @Post('queues/:queue/jobs/:jobId/retry')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retry a failed job' })
  async retryJob(
    @Param('queue') queue: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.opsService.retryFailedJob(queue, jobId, user.userId);
  }

  @Delete('queues/:queue/jobs/:jobId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Discard a failed job' })
  async discardJob(
    @Param('queue') queue: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.opsService.discardFailedJob(queue, jobId, user.userId);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Recent Stripe webhook events (idempotency ledger)' })
  webhooks(
    @Query() query: ListWebhookEventsQueryDto,
  ): Promise<{ events: AdminStripeWebhookEvent[]; total: number }> {
    return this.opsService.listWebhookEvents(query);
  }

  @Get('usage-hotspots')
  @ApiOperation({ summary: 'Orgs at ≥70% of a plan meter — support/expansion signal' })
  usageHotspots(): Promise<OpsUsageHotspot[]> {
    return this.opsService.usageHotspots();
  }
}
