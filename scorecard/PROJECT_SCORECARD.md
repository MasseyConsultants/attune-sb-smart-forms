# attune-sb-smart-forms — Project Scorecard

> Author: Robert Massey | Created: 2026-07-11
> Living status document. Update after completing any task.

## Current Status

- **Phase:** P1 Paywall Core (S1 complete; S2 next)
- **Current sprint:** Sprint 2 (`planning/SPRINT_02.md`)
- **Version:** 0.1.0

## Phase Progress

| Phase               | Sprints | Status      | Notes                                                                  |
| ------------------- | ------- | ----------- | ---------------------------------------------------------------------- |
| P0 Foundation       | S0      | ✅ Complete | 2026-07-12 — auth, branding, CI, seed green                            |
| P1 Paywall Core     | S1–S2   | In progress | S1 done 2026-07-12 (entitlements + Stripe); S2: lifecycle + plan pages |
| P2 Form Builder     | S3–S4   | Not started | —                                                                      |
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

## Quality Gates

| Gate              | Target | Current                                              |
| ----------------- | ------ | ---------------------------------------------------- |
| API test coverage | 80%    | Improving — 7 suites / 112 tests; paywall exhaustive |
| Web test coverage | 70%    | 0% — first component tests due in S2                 |
| CI status         | Green  | Workflow added S0; validating on pushes              |

## Unplanned Items

| Date       | Item                                                                | Resolution                                  |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-12 | `HttpExceptionFilter` crashed on Terminus object-shaped `error`     | Fixed + regression spec                     |
| 2026-07-12 | Nest `deleteOutDir` + stale tsbuildinfo emitted incomplete `dist/`  | `incremental: false` in tsconfig.build.json |
| 2026-07-12 | `repo-seed/` starter bundle excluded from git (duplicates planning) | Added to .gitignore                         |

## Changelog

_See `scorecard/CHANGELOG.md` once semantic-release is configured (target: S10 launch hardening; Conventional Commits enforced since S0)._
