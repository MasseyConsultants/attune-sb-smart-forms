# attune-sb-smart-forms — Project Scorecard

> Author: Robert Massey | Created: 2026-07-11
> Living status document. Update after completing any task.

## Current Status

- **Phase:** P1 Paywall Core (P0 complete)
- **Current sprint:** Sprint 1 (`planning/SPRINT_01.md`)
- **Version:** 0.1.0

## Phase Progress

| Phase               | Sprints | Status      | Notes                                       |
| ------------------- | ------- | ----------- | ------------------------------------------- |
| P0 Foundation       | S0      | ✅ Complete | 2026-07-12 — auth, branding, CI, seed green |
| P1 Paywall Core     | S1–S2   | In progress | Entitlements + Stripe next                  |
| P2 Form Builder     | S3–S4   | Not started | —                                           |
| P3 SmartMapper      | S5–S6   | Not started | —                                           |
| P4 Workflow Builder | S7–S8   | Not started | —                                           |
| P5 Library + Polish | S9      | Not started | —                                           |
| P6 Launch Hardening | S10–S11 | Not started | —                                           |

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

## Quality Gates

| Gate              | Target | Current                                    |
| ----------------- | ------ | ------------------------------------------ |
| API test coverage | 80%    | Low — S0 shipped 2 suites; debt owed in S1 |
| Web test coverage | 70%    | 0% — first component tests due in S2       |
| CI status         | Green  | Workflow added S0; first run on next push  |

## Unplanned Items

| Date       | Item                                                                | Resolution                                  |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-12 | `HttpExceptionFilter` crashed on Terminus object-shaped `error`     | Fixed + regression spec                     |
| 2026-07-12 | Nest `deleteOutDir` + stale tsbuildinfo emitted incomplete `dist/`  | `incremental: false` in tsconfig.build.json |
| 2026-07-12 | `repo-seed/` starter bundle excluded from git (duplicates planning) | Added to .gitignore                         |

## Changelog

_See `scorecard/CHANGELOG.md` once semantic-release is configured (target: S10 launch hardening; Conventional Commits enforced since S0)._
