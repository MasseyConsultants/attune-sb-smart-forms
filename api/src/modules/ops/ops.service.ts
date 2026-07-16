// Author: Robert Massey | Created: 2026-07-16 | Module: Ops
// Purpose: Platform Ops console composition (SB-025) — health, RED traffic,
// queue introspection, webhook log, usage hotspots, workflow failure triage.
// Read-mostly; the only mutations are failed-job retry/discard, both logged
// with the acting admin.

import {
  AdminStripeWebhookEvent,
  Meter as MeterEnum,
  OpsFailedJob,
  OpsOverview,
  OpsQueueSnapshot,
  OpsUsageHotspot,
  OpsWorkflowFailure,
  PLAN_ENTITLEMENTS,
  PlanId,
  limitForMeter,
} from '@attune-sb/shared-types';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';

import { MetricsService } from './metrics.service';
import { FailedRunRow, OpsRepository, UsageCounterRow } from './ops.repository';

import { AppCacheService } from '@/modules/common/cache/app-cache.service';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { LIFECYCLE_QUEUE } from '@/modules/lifecycle/lifecycle.processor';
import { WORKFLOW_QUEUE } from '@/modules/workflows/engine/workflow.processor';

const HOTSPOT_THRESHOLD = 0.7;
const HOTSPOT_LIMIT = 50;
const FAILED_JOBS_PER_QUEUE = 20;
const RECENT_FAILURES_LIMIT = 10;

function toFailure(row: FailedRunRow): OpsWorkflowFailure {
  return {
    runId: row.id,
    workflowId: row.workflowId,
    workflowName: row.workflow.name,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    error: row.error,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class OpsService {
  constructor(
    private readonly repository: OpsRepository,
    private readonly metrics: MetricsService,
    private readonly cache: AppCacheService,
    private readonly logger: SecureLoggerService,
    @InjectQueue(LIFECYCLE_QUEUE) private readonly lifecycleQueue: Queue,
    @InjectQueue(WORKFLOW_QUEUE) private readonly workflowQueue: Queue,
  ) {}

  private get queues(): Queue[] {
    return [this.lifecycleQueue, this.workflowQueue];
  }

  async overview(): Promise<OpsOverview> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const memory = process.memoryUsage();

    const [database, redisLatency, queues, apiErrors, security, business, failures] =
      await Promise.all([
        this.pingDatabase(),
        this.cache.ping(),
        this.queueSnapshots(),
        this.repository.countEventsSince('API_ERROR', dayAgo),
        this.repository.countEventsSince('SECURITY', dayAgo),
        this.repository.findBusinessCounts(now),
        this.repository.findRecentFailedRuns(RECENT_FAILURES_LIMIT),
      ]);

    return {
      generatedAt: now.toISOString(),
      system: {
        version: process.env.APP_VERSION ?? '0.1.0',
        nodeVersion: process.version,
        uptimeSec: Math.round(process.uptime()),
        memoryHeapUsedBytes: memory.heapUsed,
        memoryRssBytes: memory.rss,
      },
      dependencies: {
        database,
        redis: { healthy: redisLatency !== null, latencyMs: redisLatency },
      },
      traffic: this.metrics.trafficStats(),
      queues,
      events24h: { apiErrors, security },
      business,
      recentWorkflowFailures: failures.map(toFailure),
    };
  }

  queueSnapshots(): Promise<OpsQueueSnapshot[]> {
    return Promise.all(
      this.queues.map(async (queue) => {
        const [counts, paused] = await Promise.all([
          queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
          queue.isPaused(),
        ]);
        return {
          name: queue.name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          delayed: counts.delayed ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
          paused,
        };
      }),
    );
  }

  async failedJobs(): Promise<OpsFailedJob[]> {
    const perQueue = await Promise.all(
      this.queues.map(async (queue) => {
        const jobs = await queue.getFailed(0, FAILED_JOBS_PER_QUEUE - 1);
        return jobs.map((job) => ({
          id: String(job.id),
          name: job.name,
          queue: queue.name,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason ?? null,
          data: job.data as unknown,
          timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        }));
      }),
    );
    return perQueue.flat().sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  }

  async retryFailedJob(queueName: string, jobId: string, actorId: string): Promise<void> {
    const job = await this.findJob(queueName, jobId);
    await job.retry();
    this.logger.warn(`ops.job.retried queue=${queueName} job=${jobId} by=${actorId}`, 'OpsService');
  }

  async discardFailedJob(queueName: string, jobId: string, actorId: string): Promise<void> {
    const job = await this.findJob(queueName, jobId);
    await job.remove();
    this.logger.warn(
      `ops.job.discarded queue=${queueName} job=${jobId} by=${actorId}`,
      'OpsService',
    );
  }

  async listWebhookEvents(params: {
    page: number;
    pageSize: number;
    type?: string;
  }): Promise<{ events: AdminStripeWebhookEvent[]; total: number }> {
    const { events, total } = await this.repository.findWebhookEvents(params);
    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        processedAt: e.processedAt.toISOString(),
      })),
      total,
    };
  }

  async usageHotspots(): Promise<OpsUsageHotspot[]> {
    const counters = await this.repository.findCurrentUsageCounters(new Date());
    return counters
      .map((row) => this.toHotspot(row))
      .filter((h): h is OpsUsageHotspot => h !== null && h.ratio >= HOTSPOT_THRESHOLD)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, HOTSPOT_LIMIT);
  }

  private toHotspot(row: UsageCounterRow): OpsUsageHotspot | null {
    const planId = (row.organization.subscription?.planId ?? 'trial') as PlanId;
    const definition = PLAN_ENTITLEMENTS[planId] ?? PLAN_ENTITLEMENTS.trial;
    const limit = limitForMeter(definition, row.meter as MeterEnum);
    if (!Number.isFinite(limit) || limit <= 0) {
      return null;
    }
    const used = Number(row.used);
    return {
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      organizationSlug: row.organization.slug,
      planId,
      meter: row.meter,
      used,
      limit,
      ratio: Math.min(used / limit, 9.99),
      periodEnd: row.periodEnd.toISOString(),
    };
  }

  private async pingDatabase(): Promise<{ healthy: boolean; latencyMs: number | null }> {
    try {
      const latencyMs = await this.repository.pingDatabase();
      return { healthy: true, latencyMs };
    } catch {
      return { healthy: false, latencyMs: null };
    }
  }

  private async findJob(
    queueName: string,
    jobId: string,
  ): Promise<NonNullable<Awaited<ReturnType<Queue['getJob']>>>> {
    const queue = this.queues.find((q) => q.name === queueName);
    if (!queue) {
      throw new NotFoundException(`Unknown queue: ${queueName}`);
    }
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in queue ${queueName}`);
    }
    return job;
  }
}
