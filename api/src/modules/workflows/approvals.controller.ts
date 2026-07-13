// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Approvals
// Public token-addressed approval surface — the emailed link is the auth.
// Per-IP throttled like public form intake: tokens are unguessable (256-bit)
// but the endpoint must not be a brute-force or enumeration playground.

import type { ApprovalPublicView } from '@attune-sb/shared-types';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApprovalsService } from './approvals.service';
import { DecideApprovalDto } from './dto/decide-approval.dto';

import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Public Approvals')
@Controller('public/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get(':token')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 1_000 }, long: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Approval context for the public landing page' })
  getView(@Param('token') token: string): Promise<ApprovalPublicView> {
    return this.approvalsService.getView(token);
  }

  @Post(':token/decide')
  @Public()
  @Throttle({ short: { limit: 3, ttl: 1_000 }, long: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Record approve/reject and resume the paused run' })
  async decide(@Param('token') token: string, @Body() dto: DecideApprovalDto): Promise<void> {
    await this.approvalsService.decide(token, dto.decision, dto.note);
  }
}
