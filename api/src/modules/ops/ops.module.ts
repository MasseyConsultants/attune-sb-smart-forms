// Author: Robert Massey | Created: 2026-07-16 | Module: Ops
// Purpose: Platform observability (SB-025). @Global so the exception filters,
// auth service, and webhook service can record events / metrics without every
// domain module importing this one — same rationale as LoggerModule.

import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { OpsEventsService } from './ops-events.service';
import { OpsController } from './ops.controller';
import { OpsMaintenanceProcessor, OpsMaintenanceScheduler, OPS_QUEUE } from './ops.processor';
import { OpsRepository } from './ops.repository';
import { OpsService } from './ops.service';

import { LIFECYCLE_QUEUE } from '@/modules/lifecycle/lifecycle.processor';
import { WORKFLOW_QUEUE } from '@/modules/workflows/engine/workflow.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: OPS_QUEUE }),
    // Read-only handles on the domain queues for the inspector — the workers
    // stay in their own modules.
    BullModule.registerQueue({ name: LIFECYCLE_QUEUE }),
    BullModule.registerQueue({ name: WORKFLOW_QUEUE }),
  ],
  controllers: [OpsController, MetricsController],
  providers: [
    OpsRepository,
    OpsEventsService,
    OpsService,
    MetricsService,
    OpsMaintenanceProcessor,
    OpsMaintenanceScheduler,
  ],
  exports: [OpsEventsService, MetricsService],
})
export class OpsModule {}
