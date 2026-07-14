# attune-sb-smart-forms — Project Scorecard

> Author: Robert Massey | Created: 2026-07-11
> Living status document. Update after completing any task.

## Current Status

- **Phase:** P5 Library + Polish — ✅ complete (S9 closed 2026-07-13); next up
  P6 Launch Hardening (S10)
- **Current sprint:** Sprint 9 closed — template gallery + clone flow,
  in-app notifications, branding gate audit, admin console (SB-016)
- **Version:** 0.1.0

## Phase Progress

| Phase               | Sprints | Status      | Notes                                                                  |
| ------------------- | ------- | ----------- | ---------------------------------------------------------------------- |
| P0 Foundation       | S0      | ✅ Complete | 2026-07-12 — auth, branding, CI, seed green                            |
| P1 Paywall Core     | S1–S2   | ✅ Complete | 2026-07-13 — entitlements, Stripe, lifecycle FSM, purge sweep, plan UI |
| P2 Form Builder     | S3–S4   | ✅ Complete | 2026-07-13 — engine, forms API, builder, public fill, submissions      |
| P3 SmartMapper      | S5–S6   | ✅ Complete | 2026-07-13 — upload, canvas, auto-map, fill runtime, storage metering  |
| P4 Workflow Builder | S7–S8   | ✅ Complete | 2026-07-13 — engine + visual builder, approvals, SSRF'd webhooks, runs |
| P5 Library + Polish | S9      | ✅ Complete | 2026-07-13 — 27-template gallery, clone, notifications, admin console  |
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

## Sprint 6 Task Status

| #   | Task                    | Status  | Notes                                                                       |
| --- | ----------------------- | ------- | --------------------------------------------------------------------------- |
| 1   | Stage 1 auto-mapping    | ✅ Done | pdfjs extract + fuzzball match, suggest-mappings endpoint, scanned-PDF gate |
| 2   | Candidate review UI     | ✅ Done | Canvas overlays w/ accept/reject/nudge, candidates panel, bulk actions      |
| 3   | Document fill runtime   | ✅ Done | pdf-lib stamping (value/checkmark/highlight/signature), intake hook         |
| 4   | DOC_FILLS metering      | ✅ Done | Assert-before/consume-after; at cap fill skipped, submission never dropped  |
| 5   | STORAGE_BYTES live sums | ✅ Done | Templates + fills aggregate; upload asserts headroom; deletes reclaim       |
| 6   | Tests                   | ✅ Done | 40 new API specs (fuzzy/geometry/filler/fills/extract), 10 new web specs    |
| 7   | Phase 3 close           | ✅ Done | E2E smoke script green; retro + S7 draft written                            |

## Sprint 6 Verification (2026-07-13)

- 225 API tests across 17 suites; 61 web tests across 12 suites; 42 form-engine
  tests — all green; lint + typecheck clean
- Live E2E smoke (`scripts/smoke-sprint6.ps1`): 10-field form + fixture PDF →
  auto-map suggested 10/10 (100% ≥ 70% acceptance bar) → mappings saved →
  publish → public submission → filled PDF stored + downloaded; text extraction
  of the output confirmed every value stamped beside its label
- Meters after the run: DOC_FILLS 1/10, SUBMISSIONS 3/50, STORAGE_BYTES 3,166
  bytes (template 1,230 + fill 1,936 — live sum verified after cache TTL)
- Trial caps exercised incidentally: `uploadedTemplates` 1/1 and
  `activeForms` 2/2 both returned `LIMIT_EXCEEDED` with upgrade URL mid-drill
- `normalizeLabel` parenthetical-stripping bug found in the enterprise source
  fixed here with a regression test

## Sprint 7 Task Status

| #   | Task                    | Status  | Notes                                                                      |
| --- | ----------------------- | ------- | -------------------------------------------------------------------------- |
| 1   | Workflows API module    | ✅ Done | 4 models + migration, CRUD, publish FSM w/ version snapshots, run pinning  |
| 2   | Graph validation        | ✅ Done | Enterprise rules + dup-id/unknown-type checks; trigger-form required       |
| 3   | Plan-tier node gate     | ✅ Done | Above-tier node on publish → 402 LIMIT_EXCEEDED w/ node list + upgrade URL |
| 4   | Orchestrator + adapters | ✅ Done | BullMQ queue, routing (branch labels, failure edges), 6 core adapters      |
| 5   | Trigger + WORKFLOW_RUNS | ✅ Done | Intake hook (never-throw), assert-before/consume-after, SKIPPED_LIMIT rows |
| 6   | Shared-types drift fix  | ✅ Done | fill_document/send_document first-class in WorkflowNodeType + NODE_TIER    |
| 7   | Tests                   | ✅ Done | 71 new API specs: walks, adapters, cap matrix, publish FSM, trigger        |

## Sprint 7 Verification (2026-07-13)

- 296 API tests across 23 suites; 61 web tests; 42 form-engine tests — all
  green; lint + typecheck clean workspace-wide
- Live E2E smoke (`scripts/smoke-sprint7.ps1`): published a
  start→fill_document→send_document→notify→end workflow bound to a mapped
  form → public submission → BullMQ run COMPLETED with a 5-step ledger
  (fill reused the intake fill in 1ms; send emailed the PDF attachment in
  215ms) → WORKFLOW_RUNS 0→1, EMAILS 0→1
- Tier gate verified live: publishing an approval node on the trial org
  returned 402 `LIMIT_EXCEEDED` with the upgrade URL
- Cap semantics: WORKFLOW_RUNS at cap → run recorded SKIPPED_LIMIT (no
  enqueue, no consume, submission untouched); EMAILS/DOC_FILLS at cap →
  step SKIPPED, run continues — unit-tested matrix
- Purge sweep extended: workflows/runs soft+hard delete, `workflow-artifacts/`
  blob prefix removal, tombstone entity counts include workflows

## Sprint 8 Task Status

| #   | Task                     | Status  | Notes                                                                    |
| --- | ------------------------ | ------- | ------------------------------------------------------------------------ |
| 1   | Workflows list page      | ✅ Done | Status/trigger/run-count table, create + delete, LIMIT_EXCEEDED CTA      |
| 2   | React Flow builder       | ✅ Done | @xyflow/react v12 (ADR-0004), tier-gated palette, config panels, publish |
| 3   | Runs view + step ledger  | ✅ Done | Auto-refresh list, SKIPPED_LIMIT upgrade CTA, expandable per-step ledger |
| 4   | Approval pause/resume    | ✅ Done | ApprovalToken (hashed, one-shot), public /approvals/[token] page, resume |
| 5   | webhook/api + SSRF guard | ✅ Done | Private/reserved ranges + metadata hosts + DNS check; 15s/256KB caps     |
| 6   | switch/transform/export  | ✅ Done | Multi-branch routing, state reshaping, CSV export email (EMAILS metered) |
| 7   | Storage metering close   | ✅ Done | artifactBytes on runs feeds STORAGE_BYTES live sum (S7 carry-over)       |
| 8   | Tests                    | ✅ Done | 72 new API specs (SSRF matrix, adapters, approvals), 7 web palette specs |

## Sprint 8 Verification (2026-07-13)

- 368 API tests across 26 suites; 68 web tests across 13 suites; 42
  form-engine tests — all green; lint + typecheck clean
- Live E2E smoke (`scripts/smoke-sprint8.ps1`): approval workflow publish
  → 402 on trial (tier gate) → growth override → published → public
  submission → run PAUSED at approval → public token decision → run
  COMPLETED down the Approved branch; token reuse → 410 Gone; webhook to
  `169.254.169.254` refused by the SSRF guard, run completed via failure edge
- Browser click-through: workflows list, builder canvas (6 Growth nodes
  locked with upgrade CTA on the trial org), node config panel with
  `{{token}}` hints, runs view with expanded step ledger
- P4 Workflow Builder phase closed — all three flagship systems now live

## Sprint 9 Task Status

| #   | Task                   | Status  | Notes                                                                      |
| --- | ---------------------- | ------- | -------------------------------------------------------------------------- |
| 1   | Library shared types   | ✅ Done | 8 categories, summary/detail/clone/publish contracts in shared-types       |
| 2   | LibraryTemplate + API  | ✅ Done | PUBLIC/ORG scopes, @Public browse + detail, clone → DRAFTs, publish gate   |
| 3   | Curated seed content   | ✅ Done | 27 templates across all 8 categories; 3 bundle workflows; idempotent seed  |
| 4   | Gallery UI             | ✅ Done | Public /gallery + /gallery/[slug] SSR; in-app /library w/ one-click clone  |
| 5   | In-app notifications   | ✅ Done | Model + feed API, bell w/ unread badge; 4 emitters wired (usage/approval/  |
|     |                        |         | workflow-failed/trial-reminder)                                            |
| 6   | Branding gate audit    | ✅ Done | Fixed thank-you screen dropping the "Powered by" footer; emails verified   |
| 7   | Admin console (SB-016) | ✅ Done | PLATFORM_ADMIN org list/detail, legal hold, restore, override CRUD + UI    |
| 8   | Tests                  | ✅ Done | 108 new API specs incl. per-template seed validation; 10 new web specs     |
| 9   | Team mgmt UI (SB-018)  | ✅ Done | /team: members, role change, deactivate, invites, seats meter; nav enabled |
| 10  | Seat cap (SB-019)      | ✅ Done | maxUsers enforced at invite create AND accept (402; invite stays pending)  |

## Sprint 9 Verification (2026-07-13)

- 476 API tests across 30 suites; 78 web tests across 15 suites; 42
  form-engine tests — all green; lint + typecheck clean workspace-wide
- Live E2E smoke (`scripts/smoke-sprint9.ps1`, 11 steps): unauthenticated
  gallery browse (27 templates) + detail by slug → owner clone lands a DRAFT
  form → notifications feed live → customer OWNER 403 on /admin/orgs →
  publish-org-template 402 on trial (publishOrgTemplates gate) → platform
  admin lists orgs, reads usage/members/counts, creates + deletes an
  entitlement override, toggles legal hold → public /gallery SSR 200
- Seed-data spec validates every curated template against the real publish
  validator + workflow graph validator — a broken template cannot ship
- Admin nav item renders only for PLATFORM_ADMIN (role check server-side in
  the dashboard layout; API guard enforces independently)
- SB-018/SB-019 follow-up (post-review, same day): 483 API tests across 31
  suites; 83 web tests across 16 suites — all green. Live team smoke (7
  checks): accept under cap creates account → invite at cap 402
  LIMIT_EXCEEDED → accept at cap 402 with invite left pending → member list /
  role change / deactivate round-trip → invite succeeds again after the seat
  frees
- Owner-testing polish (2026-07-14): sidebar brand decorations; org-wide
  /submissions view (form/member filters, JSON text search, CSV export);
  SB-020 form-first workflow UX — start node renders the bound form as a
  card (name + fields + friendly types), start config binds the trigger form
  in-canvas, clickable field chips insert {{tokens}} in every token-capable
  node config. 18 web suites / 95 tests green; verified live in the builder

## Quality Gates

| Gate              | Target | Current                                                                                             |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------- |
| API test coverage | 80%    | Improving — 31 suites / 483 tests; paywall + lifecycle + forms + docs + workflows + library + admin |
| Web test coverage | 70%    | Growing — 16 suites / 83 tests (+ 42 engine tests in form-engine)                                   |
| CI status         | Green  | Workflow added S0; validating on pushes                                                             |

## Unplanned Items

| Date       | Item                                                                | Resolution                                  |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-12 | `HttpExceptionFilter` crashed on Terminus object-shaped `error`     | Fixed + regression spec                     |
| 2026-07-12 | Nest `deleteOutDir` + stale tsbuildinfo emitted incomplete `dist/`  | `incremental: false` in tsconfig.build.json |
| 2026-07-12 | `repo-seed/` starter bundle excluded from git (duplicates planning) | Added to .gitignore                         |
| 2026-07-13 | Sidebar logo SVG had raw `0x14` bytes → XML unparseable, broken img | Bytes replaced with hyphens; logo renders   |

## Changelog

_See `scorecard/CHANGELOG.md` once semantic-release is configured (target: S10 launch hardening; Conventional Commits enforced since S0)._
