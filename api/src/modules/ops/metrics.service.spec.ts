// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Tests
// RED-window invariants: aggregation, error classification, percentiles,
// and route-label cardinality bounding (UUIDs/numbers → :id).

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('aggregates requests and classifies 4xx/5xx in the rolling window', () => {
    service.recordHttp('GET', '/api/v1/forms', 200, 20);
    service.recordHttp('GET', '/api/v1/forms', 200, 40);
    service.recordHttp('POST', '/api/v1/forms', 422, 15);
    service.recordHttp('GET', '/api/v1/billing', 500, 120);

    const stats = service.trafficStats();

    expect(stats.requests).toBe(4);
    expect(stats.errors4xx).toBe(1);
    expect(stats.errors5xx).toBe(1);
    expect(stats.errorRate).toBeCloseTo(0.25);
    expect(stats.perMinute).toHaveLength(1);
    expect(stats.perMinute[0].requests).toBe(4);
  });

  it('computes latency percentiles from recorded samples', () => {
    for (let i = 1; i <= 100; i += 1) {
      service.recordHttp('GET', '/api/v1/forms', 200, i);
    }

    const stats = service.trafficStats();

    expect(stats.p50Ms).toBe(50);
    expect(stats.p95Ms).toBe(95);
    expect(stats.p99Ms).toBe(99);
  });

  it('returns zeroed stats when idle', () => {
    const stats = service.trafficStats();

    expect(stats.requests).toBe(0);
    expect(stats.errorRate).toBe(0);
    expect(stats.p95Ms).toBe(0);
    expect(stats.perMinute).toHaveLength(0);
  });

  it('normalizes UUID and numeric path segments in Prometheus labels', async () => {
    service.recordHttp('GET', '/api/v1/forms/0d9c8b7a-1234-4abc-9def-1234567890ab', 200, 10);
    service.recordHttp('GET', '/api/v1/forms/42/versions/7', 200, 10);

    const text = await service.prometheusText();

    expect(text).toContain('route="/api/v1/forms/:id"');
    expect(text).toContain('route="/api/v1/forms/:id/versions/:id"');
    expect(text).not.toContain('0d9c8b7a');
  });
});
