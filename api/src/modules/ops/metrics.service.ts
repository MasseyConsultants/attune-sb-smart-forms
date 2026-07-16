// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Metrics
// Purpose: Process-local RED metrics (Rate, Errors, Duration) with two consumers:
//   1. prom-client registry — Prometheus text exposition for external scraping
//      (industry-standard pull model; see ADR-0006).
//   2. A rolling 60-minute in-memory window — powers the Platform Ops console
//      without requiring a Prometheus deployment at v1.
// Route labels are normalized (UUIDs/numbers → :id) to bound cardinality.

import type { OpsTrafficMinute, OpsTrafficStats } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const WINDOW_MINUTES = 60;
// Per-minute latency reservoir cap — enough for stable p95/p99 without
// unbounded memory under load.
const MAX_SAMPLES_PER_MINUTE = 300;

const UUID_SEGMENT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT = /\/\d+(?=\/|$)/g;

interface MinuteBucket {
  epochMinute: number;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  durationSumMs: number;
  samples: number[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, idx)]);
}

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpDuration: Histogram<string>;
  private readonly httpRequests: Counter<string>;
  private readonly buckets = new Map<number, MinuteBucket>();

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'attune_sb_' });

    this.httpDuration = new Histogram({
      name: 'attune_sb_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequests = new Counter({
      name: 'attune_sb_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
  }

  recordHttp(method: string, path: string, statusCode: number, durationMs: number): void {
    const route = this.normalizeRoute(path);
    const status = String(statusCode);
    this.httpRequests.inc({ method, route, status });
    this.httpDuration.observe({ method, route, status }, durationMs / 1000);
    this.recordWindowSample(statusCode, durationMs);
  }

  /** Prometheus text exposition (scrape endpoint payload). */
  prometheusText(): Promise<string> {
    return this.registry.metrics();
  }

  get prometheusContentType(): string {
    return this.registry.contentType;
  }

  trafficStats(): OpsTrafficStats {
    this.evictExpired();
    const ordered = [...this.buckets.values()].sort((a, b) => a.epochMinute - b.epochMinute);

    const allSamples: number[] = [];
    let requests = 0;
    let errors4xx = 0;
    let errors5xx = 0;
    const perMinute: OpsTrafficMinute[] = ordered.map((b) => {
      requests += b.requests;
      errors4xx += b.errors4xx;
      errors5xx += b.errors5xx;
      allSamples.push(...b.samples);
      return {
        minute: new Date(b.epochMinute * 60_000).toISOString(),
        requests: b.requests,
        errors4xx: b.errors4xx,
        errors5xx: b.errors5xx,
        avgMs: b.requests > 0 ? Math.round(b.durationSumMs / b.requests) : 0,
      };
    });

    allSamples.sort((a, b) => a - b);
    return {
      windowMinutes: WINDOW_MINUTES,
      requests,
      errors4xx,
      errors5xx,
      errorRate: requests > 0 ? errors5xx / requests : 0,
      p50Ms: percentile(allSamples, 50),
      p95Ms: percentile(allSamples, 95),
      p99Ms: percentile(allSamples, 99),
      perMinute,
    };
  }

  private normalizeRoute(path: string): string {
    return path.replace(UUID_SEGMENT, ':id').replace(NUMERIC_SEGMENT, '/:id');
  }

  private recordWindowSample(statusCode: number, durationMs: number): void {
    const epochMinute = Math.floor(Date.now() / 60_000);
    let bucket = this.buckets.get(epochMinute);
    if (!bucket) {
      this.evictExpired();
      bucket = {
        epochMinute,
        requests: 0,
        errors4xx: 0,
        errors5xx: 0,
        durationSumMs: 0,
        samples: [],
      };
      this.buckets.set(epochMinute, bucket);
    }

    bucket.requests += 1;
    bucket.durationSumMs += durationMs;
    if (statusCode >= 500) {
      bucket.errors5xx += 1;
    } else if (statusCode >= 400) {
      bucket.errors4xx += 1;
    }
    if (bucket.samples.length < MAX_SAMPLES_PER_MINUTE) {
      bucket.samples.push(durationMs);
    }
  }

  private evictExpired(): void {
    const cutoff = Math.floor(Date.now() / 60_000) - WINDOW_MINUTES;
    for (const key of this.buckets.keys()) {
      if (key < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}
