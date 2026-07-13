// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle / Queue
// Purpose: BullMQ worker for the daily lifecycle sweep. The repeatable job is
// registered on module init; the sweep itself is idempotent so overlapping or
// replayed jobs are safe. Never runs inline in a request.

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { LifecycleService, SweepResult } from './lifecycle.service';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export const LIFECYCLE_QUEUE = 'lifecycle';
const DAILY_SWEEP_JOB = 'daily-sweep';

// 03:15 UTC daily — off-peak for US SMB customers.
const DAILY_CRON = '15 3 * * *';

@Processor(LIFECYCLE_QUEUE)
export class LifecycleProcessor extends WorkerHost {
  constructor(
    private readonly lifecycleService: LifecycleService,
    private readonly logger: SecureLoggerService,
  ) {
    super();
  }

  process(): Promise<SweepResult> {
    this.logger.log('Lifecycle sweep job started', 'LifecycleProcessor');
    return this.lifecycleService.runDailySweep();
  }
}

@Injectable()
export class LifecycleScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(LIFECYCLE_QUEUE) private readonly queue: Queue,
    private readonly logger: SecureLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.upsertJobScheduler(DAILY_SWEEP_JOB, { pattern: DAILY_CRON });
      this.logger.log(`Lifecycle sweep scheduled (${DAILY_CRON} UTC)`, 'LifecycleScheduler');
    } catch (err) {
      // Redis being briefly unavailable at boot must not crash the API; the
      // scheduler is re-upserted on next boot and the admin endpoint can trigger
      // a sweep manually.
      this.logger.error(
        `Failed to schedule lifecycle sweep: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'LifecycleScheduler',
      );
    }
  }
}
