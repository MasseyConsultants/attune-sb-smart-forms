# attune-sb-smart-forms — Project Scorecard

> Author: Robert Massey | Created: 2026-07-11
> Living status document. Update after completing any task.

## Current Status

- **Phase:** P3 SmartMapper — first half ✅ (S5 done 2026-07-13); S6 next
  (auto-mapping + fill runtime)
- **Current sprint:** Sprint 6 next (`planning/SPRINT_06.md`)
- **Version:** 0.1.0

## Phase Progress

| Phase               | Sprints | Status      | Notes                                                                   |
| ------------------- | ------- | ----------- | ----------------------------------------------------------------------- |
| P0 Foundation       | S0      | ✅ Complete | 2026-07-12 — auth, branding, CI, seed green                             |
| P1 Paywall Core     | S1–S2   | ✅ Complete | 2026-07-13 — entitlements, Stripe, lifecycle FSM, purge sweep, plan UI  |
| P2 Form Builder     | S3–S4   | ✅ Complete | 2026-07-13 — engine, forms API, builder, public fill, submissions       |
| P3 SmartMapper      | S5–S6   | 🔶 S5 done  | 2026-07-13 — upload pipeline, canvas, mapping studio; S6: auto-map+fill |
| P4 Workflow Builder | S7–S8   | Not started | —                                                                       |
| P5 Library + Polish | S9      | Not started | —                                                                       |
| P6 Launch Hardening | S10–S11 | Not started | —                                                                       |

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

## Sprint 3 Task Status

| #   | Task                        | Status  | Notes                                                                   |
| --- | --------------------------- | ------- | ----------------------------------------------------------------------- |
| 1   | Port @attune-sb/form-engine | ✅ Done | Logic verbatim; RN renderer replaced with DOM components; 42 tests      |
| 2   | Forms API module            | ✅ Done | CRUD + DRAFT→PUBLISHED→ARCHIVED FSM, immutable versions, slug alloc     |
| 3   | activeForms publish gating  | ✅ Done | Live-count via entitlements; LIMIT_EXCEEDED 402 with upgrade URL        |
| 4   | Form builder studio UI      | ✅ Done | Zustand store, dnd-kit palette/canvas/inspector, live preview, autosave |
| 5   | Forms list + nav            | ✅ Done | List page w/ status/version, create/delete; Forms nav enabled           |
| 6   | Tests                       | ✅ Done | 24 forms API specs, 15 builder-store/forms-list web tests               |

## Sprint 3 Verification (2026-07-13)

- 154 API tests across 9 suites; 32 web tests across 6 suites; 42 form-engine
  tests across 4 suites — all green
- Live API drill (trial org, cap 2): publish×2 OK → 3rd publish returns
  `LIMIT_EXCEEDED {limit:2, current:2, upgradeUrl}` → unpublish frees the slot
  → 3rd publishes → republish bumps to v2 with immutable v1+v2 snapshots
- `GET /billing/usage` now reports live activeForms counts (2/2 at cap)
- Builder UI click-through (create → drag fields → conditional rule → preview
  → publish-at-cap upgrade prompt) — pending manual pass at Phase 2 close
- dnd-kit dependency recorded in `docs/ADR/0001-dnd-kit-for-form-builder.md`

## Sprint 4 Task Status

| #   | Task                        | Status  | Notes                                                                    |
| --- | --------------------------- | ------- | ------------------------------------------------------------------------ |
| 1   | Submissions API module      | ✅ Done | Public intake w/ honeypot + IP throttle; OVER_LIMIT quarantine; metering |
| 2   | Public fill pages /f/[slug] | ✅ Done | SSR no-store, mobile card layout, plan-gated "Powered by", vague 404     |
| 3   | Data views + export         | ✅ Done | Schema-derived table, detail expand, CSV/XLSX (exceljs, ADR-0002)        |
| 4   | Submission counts on list   | ✅ Done | `_count` aggregate replaces S3 placeholder; links to data view           |
| 5   | SB-014 downgrade picker     | ✅ Done | Billing card appears when published > cap; org chooses what stays live   |
| 6   | SB-015 export-all           | ✅ Done | "Export your data" takeout card on /billing; works in read-only mode     |
| 7   | Phase 2 close               | ✅ Done | Run instructions + seed credentials + click-through checklist delivered  |

## Sprint 4 Verification (2026-07-13)

- 170 API tests across 10 suites; 35 web tests across 7 suites — all green
- Live intake drill (public, unauthenticated): valid submission stored
  `SUBMITTED` + metered; missing-required rejected 422 with field errors;
  honeypot hit returned fake 201 id and stored NOTHING
- Browser drill: `/f/qejfjr3fw8` SSR-rendered with "Powered by" footer,
  filled + submitted → branded thank-you screen; unknown slug → 404 page
- Quarantine (at-cap intake → OVER_LIMIT → lazy release on headroom) covered
  by unit tests; end-to-end pass is on the manual checklist (needs 50 rows)
- Form-engine `./logic` subpath export lets the API validate against the
  published snapshot without pulling React into the Nest build

## Sprint 5 Task Status

| #   | Task                     | Status  | Notes                                                                    |
| --- | ------------------------ | ------- | ------------------------------------------------------------------------ |
| 1   | Document templates API   | ✅ Done | Multipart upload, PDF inspect/sanitize, DOCX→PDF, plan gating, ADR-0003  |
| 2   | Blob storage service     | ✅ Done | Local-disk driver, S3-shaped interface; wired into purge sweep phase 1   |
| 3   | Document canvas UI       | ✅ Done | pdfjs render + zoom, drag/resize tags, multi-select, align, smart guides |
| 4   | Template management page | ✅ Done | /templates list, upload + form link, delete, LIMIT_EXCEEDED upgrade CTA  |
| 5   | Mapping studio           | ✅ Done | /templates/[id] — sidebar fields, save mappings, unsaved-changes guard   |
| 6   | Tests                    | ✅ Done | 15 API specs (inspector + service), 16 web specs (guides, sidebar, tag)  |

## Sprint 5 Verification (2026-07-13)

- 185 API tests across 12 suites; 51 web tests across 10 suites — all green
- Live smoke (trial org, cap 1): PDF upload → `READY` with correct page
  count/dims; 2nd upload → `LIMIT_EXCEEDED {limit:1, current:1, upgradeUrl}`;
  PDF streams 200; PATCH links form; PUT mappings persists; out-of-bounds page
  mapping rejected 400; DELETE 204 removes blobs + row
- Lifecycle integration: purge phase 1 now deletes `document-templates/{orgId}`
  blobs; soft/hard delete cover forms/submissions/templates rows
- `uploadedTemplates` counted resource is live (was structurally 0 since S1)
- DOCX conversion path ported (mammoth + Puppeteer, `waitUntil: 'load'`);
  manual DOCX upload verification on the S6 checklist
- SmartMapper mapping types centralized in `@attune-sb/shared-types`
  (enterprise had them duplicated in API + admin UI)

## Quality Gates

| Gate              | Target | Current                                                               |
| ----------------- | ------ | --------------------------------------------------------------------- |
| API test coverage | 80%    | Improving — 12 suites / 185 tests; paywall + lifecycle + forms + docs |
| Web test coverage | 70%    | Growing — 10 suites / 51 tests (+ 42 engine tests in form-engine)     |
| CI status         | Green  | Workflow added S0; validating on pushes                               |

## Unplanned Items

| Date       | Item                                                                | Resolution                                  |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-12 | `HttpExceptionFilter` crashed on Terminus object-shaped `error`     | Fixed + regression spec                     |
| 2026-07-12 | Nest `deleteOutDir` + stale tsbuildinfo emitted incomplete `dist/`  | `incremental: false` in tsconfig.build.json |
| 2026-07-12 | `repo-seed/` starter bundle excluded from git (duplicates planning) | Added to .gitignore                         |

## Changelog

_See `scorecard/CHANGELOG.md` once semantic-release is configured (target: S10 launch hardening; Conventional Commits enforced since S0)._
