// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Queue
// Purpose: Daily ops-maintenance sweep — prunes OpsEvent rows past the
// retention window so the ledger cannot grow unbounded. Same scheduler
// pattern (and failure tolerance) as the lifecycle sweep.

import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { OpsEventsService } from './ops-events.service';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export const OPS_QUEUE = 'ops-maintenance';
const PRUNE_JOB = 'prune-ops-events';

// 04:05 UTC daily — after the 03:15 lifecycle sweep.
const DAILY_CRON = '5 4 * * *';
const DEFAULT_RETENTION_DAYS = 30;

@Processor(OPS_QUEUE)
export class OpsMaintenanceProcessor extends WorkerHost {
  private readonly retentionDays: number;

  constructor(
    private readonly opsEvents: OpsEventsService,
    private readonly logger: SecureLoggerService,
    config: ConfigService,
  ) {
    super();
    this.retentionDays = config.get<number>('OPS_EVENT_RETENTION_DAYS', DEFAULT_RETENTION_DAYS);
  }

  async process(): Promise<{ deleted: number }> {
    this.logger.log('Ops maintenance sweep started', 'OpsMaintenanceProcessor');
    const deleted = await this.opsEvents.prune(this.retentionDays);
    return { deleted };
  }
}

@Injectable()
export class OpsMaintenanceScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(OPS_QUEUE) private readonly queue: Queue,
    private readonly logger: SecureLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.upsertJobScheduler(PRUNE_JOB, { pattern: DAILY_CRON });
      this.logger.log(`Ops maintenance scheduled (${DAILY_CRON} UTC)`, 'OpsMaintenanceScheduler');
    } catch (err) {
      // Redis being briefly unavailable at boot must not crash the API.
      this.logger.error(
        `Failed to schedule ops maintenance: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'OpsMaintenanceScheduler',
      );
    }
  }
}
