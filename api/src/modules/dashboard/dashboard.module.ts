// Author: Robert Massey | Created: 2026-07-16 | Module: Dashboard
// Purpose: Customer workspace home aggregate (SB-027 Phase A).

import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService],
})
export class DashboardModule {}
