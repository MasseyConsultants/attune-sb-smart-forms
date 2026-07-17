// Author: Robert Massey | Created: 2026-07-16 | Module: Ops
// Purpose: Platform Ops console composition (SB-025) — health, RED traffic,
// queue introspection, webhook log, usage hotspots, workflow failure triage.
// Read-mostly; the only mutations are failed-job retry/discard, both logged
// with the acting admin.

import {
  AdminStripeWebhookEvent,
  Meter as MeterEnum,
  OpsFailedJob,
  OpsHealthState,
  OpsOverview,
  OpsQueueSnapshot,
  OpsResourceHealth,
  OpsSystemHealth,
  OpsUsageHotspot,
  OpsWorkflowFailure,
  PLAN_ENTITLEMENTS,
  PlanId,
  limitForMeter,
} from '@attune-sb/shared-types';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { MetricsService } from './metrics.service';
import { FailedRunRow, OpsRepository, UsageCounterRow } from './ops.repository';

import { AppCacheService } from '@/modules/common/cache/app-cache.service';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { LIFECYCLE_QUEUE } from '@/modules/lifecycle/lifecycle.processor';
import { EmailService } from '@/modules/notifications/email.service';
import { WORKFLOW_QUEUE } from '@/modules/workflows/engine/workflow.processor';

const HOTSPOT_THRESHOLD = 0.7;
const HOTSPOT_LIMIT = 50;
const FAILED_JOBS_PER_QUEUE = 20;
const RECENT_FAILURES_LIMIT = 10;
// Match Terminus readiness thresholds in HealthController.
const HEAP_WARN_BYTES = 512 * 1024 * 1024;
const RSS_WARN_BYTES = 1024 * 1024 * 1024;

function worstState(...states: OpsHealthState[]): OpsHealthState {
  if (states.includes('down')) {
    return 'down';
  }
  if (states.includes('degraded')) {
    return 'degraded';
  }
  return 'up';
}

function formatBytesShort(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

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
    private readonly storage: BlobStorageService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
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

    const [health, queues, apiErrors, security, business, failures] = await Promise.all([
      this.collectHealth(now, memory),
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
      health,
      traffic: this.metrics.trafficStats(),
      queues,
      events24h: { apiErrors, security },
      business,
      recentWorkflowFailures: failures.map(toFailure),
    };
  }

  private async collectHealth(now: Date, memory: NodeJS.MemoryUsage): Promise<OpsSystemHealth> {
    const [database, redis, storage, email, queues] = await Promise.all([
      this.probeDatabase(),
      this.probeRedis(),
      this.storage.healthCheck(),
      this.email.healthCheck(),
      this.probeQueues(),
    ]);

    const api = this.probeApi(memory);
    const stripe = this.probeStripe();

    const resources: OpsResourceHealth[] = [
      {
        key: 'api',
        label: 'API',
        state: api.state,
        latencyMs: null,
        detail: api.detail,
      },
      {
        key: 'database',
        label: 'PostgreSQL',
        state: database.state,
        latencyMs: database.latencyMs,
        detail: database.detail,
      },
      {
        key: 'redis',
        label: 'Redis',
        state: redis.state,
        latencyMs: redis.latencyMs,
        detail: redis.detail,
      },
      {
        key: 'queues',
        label: 'Job queues',
        state: queues.state,
        latencyMs: queues.latencyMs,
        detail: queues.detail,
      },
      {
        key: 'storage',
        label: 'Blob storage',
        state: storage.state,
        latencyMs: storage.latencyMs,
        detail: storage.detail,
      },
      {
        key: 'email',
        label: 'Email',
        state: email.state,
        latencyMs: email.latencyMs,
        detail: email.detail,
      },
      {
        key: 'stripe',
        label: 'Stripe',
        state: stripe.state,
        latencyMs: null,
        detail: stripe.detail,
      },
    ];

    return {
      overall: worstState(...resources.map((r) => r.state)),
      checkedAt: now.toISOString(),
      resources,
    };
  }

  private probeApi(memory: NodeJS.MemoryUsage): { state: OpsHealthState; detail: string } {
    const heapOk = memory.heapUsed < HEAP_WARN_BYTES;
    const rssOk = memory.rss < RSS_WARN_BYTES;
    if (!heapOk || !rssOk) {
      return {
        state: 'degraded',
        detail: `memory high — heap ${formatBytesShort(memory.heapUsed)} / RSS ${formatBytesShort(memory.rss)}`,
      };
    }
    return {
      state: 'up',
      detail: `process up · heap ${formatBytesShort(memory.heapUsed)} · RSS ${formatBytesShort(memory.rss)}`,
    };
  }

  private async probeDatabase(): Promise<{
    state: OpsHealthState;
    latencyMs: number | null;
    detail: string;
  }> {
    try {
      const latencyMs = await this.repository.pingDatabase();
      return { state: 'up', latencyMs, detail: `SELECT 1 · ${latencyMs}ms` };
    } catch (err) {
      return {
        state: 'down',
        latencyMs: null,
        detail: err instanceof Error ? err.message : 'database unreachable',
      };
    }
  }

  private async probeRedis(): Promise<{
    state: OpsHealthState;
    latencyMs: number | null;
    detail: string;
  }> {
    const latencyMs = await this.cache.ping();
    if (latencyMs === null) {
      return { state: 'down', latencyMs: null, detail: 'PING failed / unreachable' };
    }
    return { state: 'up', latencyMs, detail: `PING · ${latencyMs}ms` };
  }

  private async probeQueues(): Promise<{
    state: OpsHealthState;
    latencyMs: number | null;
    detail: string;
  }> {
    const start = Date.now();
    try {
      // getJobCounts round-trips Redis through the BullMQ client — enough to
      // prove enqueue paths are live. Depths are shown in the Queues tab.
      await Promise.all(this.queues.map((q) => q.getJobCounts('waiting', 'failed')));
      return {
        state: 'up',
        latencyMs: Date.now() - start,
        detail: `${this.queues.length} queues connected`,
      };
    } catch (err) {
      return {
        state: 'down',
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : 'BullMQ client unreachable',
      };
    }
  }

  private probeStripe(): { state: OpsHealthState; detail: string } {
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    const webhook = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (secret && webhook) {
      return { state: 'up', detail: 'keys configured' };
    }
    if (secret || webhook) {
      return {
        state: 'degraded',
        detail: secret ? 'missing STRIPE_WEBHOOK_SECRET' : 'missing STRIPE_SECRET_KEY',
      };
    }
    return {
      state: 'degraded',
      detail: 'not configured — trial path only',
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
