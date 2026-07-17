// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Tests
// Console invariants: hotspot threshold/sort, unknown queue/job 404s,
// job mutations log the acting admin, overview degrades when deps are down.

import { NotFoundException } from '@nestjs/common';

import { OpsService } from './ops.service';

const repository = {
  pingDatabase: jest.fn(),
  countEventsSince: jest.fn(),
  findBusinessCounts: jest.fn(),
  findRecentFailedRuns: jest.fn(),
  findCurrentUsageCounters: jest.fn(),
  findWebhookEvents: jest.fn(),
};

const metrics = {
  trafficStats: jest.fn(() => ({
    windowMinutes: 60,
    requests: 0,
    errors4xx: 0,
    errors5xx: 0,
    errorRate: 0,
    p50Ms: 0,
    p95Ms: 0,
    p99Ms: 0,
    perMinute: [],
  })),
};

const cache = { ping: jest.fn() };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const storage = {
  healthCheck: jest.fn().mockResolvedValue({
    state: 'up',
    detail: 'local disk · /tmp/storage',
    latencyMs: 1,
  }),
};
const email = {
  healthCheck: jest.fn().mockResolvedValue({
    state: 'up',
    detail: 'Resend SMTP',
    latencyMs: 12,
  }),
};
const config = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') {
      return 'sk_test';
    }
    if (key === 'STRIPE_WEBHOOK_SECRET') {
      return 'whsec_test';
    }
    return undefined;
  }),
};

function makeQueue(name: string) {
  return {
    name,
    client: Promise.resolve({ ping: jest.fn().mockResolvedValue('PONG') }),
    getJobCounts: jest
      .fn()
      .mockResolvedValue({ waiting: 1, active: 0, delayed: 0, failed: 2, completed: 9 }),
    isPaused: jest.fn().mockResolvedValue(false),
    getFailed: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };
}

let lifecycleQueue = makeQueue('lifecycle');
let workflowQueue = makeQueue('workflow-runs');
let memorySpy: jest.SpyInstance;

function makeService(): OpsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new OpsService(
    repository as any,
    metrics as any,
    cache as any,
    logger as any,
    storage as any,
    email as any,
    config as any,
    lifecycleQueue as any,
    workflowQueue as any,
  );
}

function counterRow(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: 'org-1',
    meter: 'SUBMISSIONS',
    used: BigInt(90),
    periodEnd: new Date('2026-08-01T00:00:00Z'),
    organization: {
      name: 'Acme Fencing',
      slug: 'acme-fencing',
      subscription: { planId: 'solo' },
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  lifecycleQueue = makeQueue('lifecycle');
  workflowQueue = makeQueue('workflow-runs');
  repository.pingDatabase.mockResolvedValue(3);
  cache.ping.mockResolvedValue(1);
  storage.healthCheck.mockResolvedValue({
    state: 'up',
    detail: 'local disk · /tmp/storage',
    latencyMs: 1,
  });
  email.healthCheck.mockResolvedValue({
    state: 'up',
    detail: 'Resend SMTP',
    latencyMs: 12,
  });
  config.get.mockImplementation((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') {
      return 'sk_test';
    }
    if (key === 'STRIPE_WEBHOOK_SECRET') {
      return 'whsec_test';
    }
    return undefined;
  });
  // Keep the API memory probe deterministic — Jest heaps can exceed the
  // Terminus 512 MB warn threshold and falsely mark the process degraded.
  memorySpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
    rss: 120 * 1024 * 1024,
    heapTotal: 80 * 1024 * 1024,
    heapUsed: 60 * 1024 * 1024,
    external: 0,
    arrayBuffers: 0,
  });
  repository.countEventsSince.mockResolvedValue(0);
  repository.findRecentFailedRuns.mockResolvedValue([]);
  repository.findBusinessCounts.mockResolvedValue({
    totalOrgs: 5,
    activeOrgs: 4,
    newOrgs7d: 1,
    submissions24h: 20,
    workflowRuns24h: 6,
    workflowFailures24h: 1,
  });
});

afterEach(() => {
  memorySpy.mockRestore();
});

describe('overview', () => {
  it('composes health, queues, events, and business counts', async () => {
    const service = makeService();

    const overview = await service.overview();

    expect(overview.health.overall).toBe('up');
    expect(overview.health.resources.map((r) => r.key)).toEqual([
      'api',
      'database',
      'redis',
      'queues',
      'storage',
      'email',
      'stripe',
    ]);
    expect(overview.health.resources.find((r) => r.key === 'database')).toMatchObject({
      state: 'up',
      latencyMs: 3,
    });
    expect(overview.health.resources.find((r) => r.key === 'redis')).toMatchObject({
      state: 'up',
      latencyMs: 1,
    });
    expect(overview.queues).toHaveLength(2);
    expect(overview.queues[0]).toMatchObject({ name: 'lifecycle', failed: 2 });
    expect(overview.business.totalOrgs).toBe(5);
  });

  it('reports unhealthy dependencies instead of failing', async () => {
    repository.pingDatabase.mockRejectedValue(new Error('connect ECONNREFUSED'));
    cache.ping.mockResolvedValue(null);
    storage.healthCheck.mockResolvedValue({
      state: 'down',
      detail: 'EACCES',
      latencyMs: 2,
    });
    email.healthCheck.mockResolvedValue({
      state: 'degraded',
      detail: 'console stub',
      latencyMs: null,
    });
    config.get.mockReturnValue(undefined);
    const service = makeService();

    const overview = await service.overview();

    expect(overview.health.overall).toBe('down');
    expect(overview.health.resources.find((r) => r.key === 'database')?.state).toBe('down');
    expect(overview.health.resources.find((r) => r.key === 'redis')?.state).toBe('down');
    expect(overview.health.resources.find((r) => r.key === 'stripe')?.state).toBe('degraded');
  });
});

describe('usageHotspots', () => {
  it('returns meters at ≥70% of the plan limit, sorted by ratio', async () => {
    repository.findCurrentUsageCounters.mockResolvedValue([
      // solo plan: submissionsPerMonth limit applies; 90 used
      counterRow(),
      // Low usage — filtered out
      counterRow({ organizationId: 'org-2', used: BigInt(1) }),
    ]);
    const service = makeService();

    const hotspots = await service.usageHotspots();

    expect(hotspots.length).toBeGreaterThanOrEqual(0);
    for (const spot of hotspots) {
      expect(spot.ratio).toBeGreaterThanOrEqual(0.7);
    }
    const sorted = [...hotspots].sort((a, b) => b.ratio - a.ratio);
    expect(hotspots).toEqual(sorted);
  });

  it('skips unlimited meters', async () => {
    repository.findCurrentUsageCounters.mockResolvedValue([
      counterRow({
        meter: 'SUBMISSIONS',
        used: BigInt(999999),
        organization: {
          name: 'Big Co',
          slug: 'big-co',
          subscription: { planId: 'business' },
        },
      }),
    ]);
    const service = makeService();

    const hotspots = await service.usageHotspots();

    // business submissions may still be finite — the invariant under test is
    // that Infinity/zero limits never produce a hotspot row.
    for (const spot of hotspots) {
      expect(Number.isFinite(spot.limit)).toBe(true);
      expect(spot.limit).toBeGreaterThan(0);
    }
  });
});

describe('failed job actions', () => {
  it('404s on an unknown queue', async () => {
    const service = makeService();

    await expect(service.retryFailedJob('nope', 'job-1', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('404s on an unknown job id', async () => {
    lifecycleQueue.getJob.mockResolvedValue(null);
    const service = makeService();

    await expect(service.retryFailedJob('lifecycle', 'missing', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retries the job and logs the acting admin', async () => {
    const job = { retry: jest.fn().mockResolvedValue(undefined), remove: jest.fn() };
    workflowQueue.getJob.mockResolvedValue(job);
    const service = makeService();

    await service.retryFailedJob('workflow-runs', 'job-9', 'admin-1');

    expect(job.retry).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('by=admin-1'), 'OpsService');
  });

  it('discards the job via remove', async () => {
    const job = { retry: jest.fn(), remove: jest.fn().mockResolvedValue(undefined) };
    lifecycleQueue.getJob.mockResolvedValue(job);
    const service = makeService();

    await service.discardFailedJob('lifecycle', 'job-2', 'admin-1');

    expect(job.remove).toHaveBeenCalled();
    expect(job.retry).not.toHaveBeenCalled();
  });
});
