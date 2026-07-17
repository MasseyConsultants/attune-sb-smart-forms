// Author: Robert Massey | Created: 2026-07-16 | Module: Dashboard

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DashboardSummary } from '@attune-sb/shared-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { DashboardService } from './dashboard.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { AllowReadOnly } from '@/modules/lifecycle/decorators/allow-read-only.decorator';

class DashboardSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  windowDays?: number;
}

@ApiTags('Dashboard')
@Controller('dashboard')
@AllowReadOnly()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Role-shaped workspace home summary (pulse, attention, onboarding, usage)',
  })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummary> {
    return this.dashboardService.getSummary(user, query.windowDays ?? 7);
  }
}
