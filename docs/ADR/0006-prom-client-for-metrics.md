# ADR 0006 — prom-client for platform metrics

> Author: Robert Massey | Date: 2026-07-16 | Status: Accepted

## Context

SB-025 adds a Platform Ops console for PLATFORM_ADMIN observability. The API
needs RED metrics (request rate, error rate, duration) plus Node process
metrics (heap, GC, event loop lag), consumable two ways: in-app for the ops
console, and by an external monitoring stack as we scale.

## Decision

Add `prom-client` to `api`. A single `MetricsService` owns:

- a Prometheus `Registry` with `collectDefaultMetrics()` and an HTTP
  histogram/counter (labels: method, normalized route, status), exposed at
  `GET /api/v1/metrics` behind a `METRICS_TOKEN` shared secret (404 when
  unset — never exposed by default);
- a rolling 60-minute in-memory window powering the ops console's traffic
  panel without requiring a Prometheus deployment at v1.

Route labels normalize UUID/numeric segments to `:id` to bound cardinality.

## Rationale

- Prometheus exposition is the de-facto standard pull model — works with
  Prometheus, Grafana Cloud, VictoriaMetrics, Datadog agents, Uptime Kuma.
- `prom-client` is the canonical Node implementation: zero runtime deps, no
  native bindings (Alpine-safe), maintained by the Prometheus community.
- Alternative considered: full OpenTelemetry SDK — heavier (collector needed
  to be useful), and we don't need distributed tracing on a single-service
  API at v1. Revisit with SB-026 (external APM) if tracing becomes necessary.

## Consequences

- Metrics are per-process and reset on restart — correct for the single-
  instance VPS deploy (S10); a multi-instance future scrapes each instance,
  which is exactly the Prometheus model.
- The in-memory window is bounded (60 buckets × ≤300 samples) — flat memory.
