# attune-sb-smart-forms — Project Scorecard

> Author: Robert Massey | Created: 2026-07-11
> Living status document. Update after completing any task.

## Current Status

- **Phase:** P2 Form Builder (P1 complete 2026-07-13)
- **Current sprint:** Sprint 3 (`planning/SPRINT_03.md`)
- **Version:** 0.1.0

## Phase Progress

| Phase               | Sprints | Status      | Notes                                                                  |
| ------------------- | ------- | ----------- | ---------------------------------------------------------------------- |
| P0 Foundation       | S0      | ✅ Complete | 2026-07-12 — auth, branding, CI, seed green                            |
| P1 Paywall Core     | S1–S2   | ✅ Complete | 2026-07-13 — entitlements, Stripe, lifecycle FSM, purge sweep, plan UI |
| P2 Form Builder     | S3–S4   | Next        | S3: form-engine port, forms API, builder studio                        |
| P3 SmartMapper      | S5–S6   | Not started | —                                                                      |
| P4 Workflow Builder | S7–S8   | Not started | —                                                                      |
| P5 Library + Polish | S9      | Not started | —                                                                      |
| P6 Launch Hardening | S10–S11 | Not started | —                                                                      |

## Sprint 0 Task Status

| #   | Task                              | Status  | Notes                                                            |
| --- | --------------------------------- | ------- | ---------------------------------------------------------------- |
| 1   | Monorepo scaffold + eslint-config | ✅ Done | pnpm 10 + turbo 2; docker-compose (pg 5434, redis 6382, mailpit) |
| 2   | Prisma schema v1                  | ✅ Done | 14 models incl. lifecycle/usage/purge; migration `init` applied  |
| 3   | Port common modules               | ✅ Done | logger, prisma, encryption, cache, guards, filters, health       |
| 4   | Auth module                       | ✅ Done | signup→org+OWNER+trial txn, login, refresh rotation, invites     |
| 5   | @attune-sb/shared-types v0        | ✅ Done | PLAN_ENTITLEMENTS, roles, envelope, forms, workflows contracts   |
| 6   | Branding foundation               | ✅ Done | attune default theme, brand/ components, 6 auth pages, legal     |
| 7   | CI workflows                      | ✅ Done | lint+typecheck+test w/ pg+redis services; commitlint on PRs      |
| 8   | Seed script                       | ✅ Done | 3 plans, platform admin, demo org w/ active trial                |
| 9   | Scorecard + backlog init          | ✅ Done | —                                                                |

## Sprint 0 Verification (2026-07-12)

- `pnpm lint` / `pnpm typecheck` / `pnpm test` — all green (11 API tests)
- Signup smoke test: org + OWNER + TRIALING subscription created, `trialEndsAt` +14d ✓
- Login → httpOnly cookies → SSR dashboard renders org + trial countdown ✓
- `/health/detailed`: database/redis/memory all up ✓
- `/privacy`, `/terms`, `/refund-policy` resolve with real draft copy ✓
- Pushed to `github.com/MasseyConsultants/attune-sb-smart-forms` (main)

## Sprint 1 Task Status

| #   | Task                  | Status  | Notes                                                                  |
| --- | --------------------- | ------- | ---------------------------------------------------------------------- |
| 1   | Entitlements module   | ✅ Done | check/consume/overrides, anchor-day periods, guard, LIMIT_EXCEEDED 402 |
| 2   | Stripe billing module | ✅ Done | checkout, portal, 5 idempotent webhook handlers, price catalog via env |
| 3   | Trial abuse hardening | ✅ Done | domain heuristic on signup (S0) + card fingerprint hash on checkout    |
| 4   | Web entitlement hooks | ✅ Done | useEntitlement/useUsage/useCheckout, billing BFF, UpgradeCta, /billing |
| 5   | Exhaustive tests      | ✅ Done | 112 tests: plan×meter matrix, replays, webhook fixtures, auth debt     |

## Sprint 1 Verification (2026-07-12)

- 112 API tests green across 7 suites (entitlement matrix: 4 plans × 5 periodic
  meters × under/at-limit boundaries; soft-warn latch; idempotent consume replay)
- Live smoke: `GET /billing/usage` returns all 6 meters with trial limits and
  anchor-day period (13th); `GET /billing/subscription` reports TRIALING
- Webhook replay (same event id) verified a no-op via recorded fixtures
- With no Stripe keys: trial flows fully work; checkout/portal fail fast with
  `BILLING_NOT_CONFIGURED` (503) — pinned by spec
- `/billing` page renders plan, usage meters with 80%/100% color thresholds,
  and checkout/portal actions (manual Stripe checkout verification pending keys)

## Sprint 2 Task Status

| #   | Task                       | Status    | Notes                                                                   |
| --- | -------------------------- | --------- | ----------------------------------------------------------------------- |
| 1   | Org lifecycle FSM          | ✅ Done   | EXPIRED_TRIAL/CANCELED/PURGE_PENDING/PURGED, ReadOnlyGuard, restore     |
| 2   | Purge sweep (BullMQ daily) | ✅ Done   | Two-phase, idempotent, legal hold, tombstone, PurgeAuditLog             |
| 3   | Reminder + warning emails  | ✅ Done   | Trial/cancel schedule, soft-limit 80% latch email, dunning first-notice |
| 4   | Billing/plan pages + UI    | ✅ Done\* | Plan grid from PLAN_ENTITLEMENTS, meters, read-only banner; \*SB-014/15 |
| 5   | Per-plan API throttling    | ✅ Done   | OrgThrottlerGuard reads apiRateLimitPerMin from plan snapshot           |
| 6   | First web component tests  | ✅ Done   | 18 tests: MeterBar, UpgradeCta, ReadOnlyBanner, PlanGrid                |

## Sprint 2 Verification (2026-07-13)

- 130 API tests across 8 suites; 18 web tests across 4 suites — all green
- Live drill: backdated trial → sweep → org `EXPIRED_TRIAL`, read-only flag
  set, purge scheduled +30d, T+0 reminder email logged
- Read-only org: `PATCH /organizations/me` → `ORG_READ_ONLY`; GET still 200
- SSR check: dashboard renders the read-only banner + purge date; `/billing`
  renders all three plan cards, meters, and current-plan state
- Downgrade form-picker UX + export-all deferred to S4 (SB-014, SB-015 —
  need forms/submissions to exist)

## Quality Gates

| Gate              | Target | Current                                                          |
| ----------------- | ------ | ---------------------------------------------------------------- |
| API test coverage | 80%    | Improving — 8 suites / 130 tests; paywall + lifecycle exhaustive |
| Web test coverage | 70%    | Started — 4 suites / 18 tests (billing components)               |
| CI status         | Green  | Workflow added S0; validating on pushes                          |

## Unplanned Items

| Date       | Item                                                                | Resolution                                  |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-12 | `HttpExceptionFilter` crashed on Terminus object-shaped `error`     | Fixed + regression spec                     |
| 2026-07-12 | Nest `deleteOutDir` + stale tsbuildinfo emitted incomplete `dist/`  | `incremental: false` in tsconfig.build.json |
| 2026-07-12 | `repo-seed/` starter bundle excluded from git (duplicates planning) | Added to .gitignore                         |

## Changelog

_See `scorecard/CHANGELOG.md` once semantic-release is configured (target: S10 launch hardening; Conventional Commits enforced since S0)._
