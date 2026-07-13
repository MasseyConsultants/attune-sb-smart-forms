# attune-sb-smart-forms — Sprint 0

> **Seed document for the NEW SMB repository.** Copy to `planning/SPRINT_00.md`
> in `attune-sb-smart-forms`. Staged in the enterprise repo under `docs/smb-edition/`.
> Author: Robert Massey | Created: 2026-07-11

**Sprint 0 Goal:** Runnable monorepo skeleton with auth, org signup, seeded plans,
branding foundation, and CI gates — nothing user-visible beyond signup/login.

## Tasks

1. Scaffold monorepo (pnpm + Turborepo) per the `.cursorrules` monorepo
   structure; port eslint-config
2. Prisma schema v1: Organization (incl. lifecycleState, readOnlyAt,
   purgeScheduledAt, purgeRequestedAt, legalHoldAt), User, RefreshToken,
   InviteToken, Subscription, Plan, UsageCounter, UsageEvent,
   EntitlementOverride, PurgeAuditLog (+ conventions: UUID, soft delete,
   timestamps)
3. Port common modules: prisma, logger, encryption, cache, guards (JWT, Roles,
   OrgThrottler), filters, TransformInterceptor, health
4. Auth module: self-serve signup (creates org + OWNER + TRIALING subscription),
   login, refresh rotation, email verification, invitations
5. `@attune-sb/shared-types` v0: roles, plan enums, PLAN_ENTITLEMENTS constants,
   response envelope types
6. Branding foundation (per MASTER_PLAN §6a): port theme system with `attune`
   orange as default, logo assets, Inter font, extracted brand components
   (DecorativeBackground/Separator); branded signup/login/forgot/reset/
   accept-invite pages; `/privacy` + `/terms` pages (draft copy, real routes);
   terms/privacy consent checkbox on signup
7. CI: lint + typecheck + test workflows, coverage gates, Conventional Commits
8. Seed script: plans, a demo org, platform admin
9. `scorecard/PROJECT_SCORECARD.md` + `planning/BACKLOG.md` initialized

## Acceptance

`pnpm dev` boots api + web; signup→verify→login round-trip works;
trial subscription row created with correct `trialEndsAt`; auth pages render the
Attune orange brand treatment; `/privacy` and `/terms` resolve; CI green.

## Pre-seeded BACKLOG (deferred — do not build in v1)

MFA/TOTP, Google OAuth (fast-follow S3), enterprise SSO, AI workflow nodes,
AI mapping Stage 2 (vision), overage packs, native mobile apps, per-permission
RBAC table, push notifications, Azure Document Intelligence for scanned PDFs,
affiliate/referral program, annual-plan proration edge cases, EU data residency.

---

## Retro (closed 2026-07-12)

**Delivered.** All 9 tasks; acceptance met: `pnpm dev` boots api+web,
signup→login round-trip creates org + OWNER + TRIALING subscription with
correct `trialEndsAt`, auth pages carry the orange brand treatment,
`/privacy` / `/terms` / `/refund-policy` resolve, lint/typecheck/test green.

**What went well**

- Porting from enterprise paid off: common modules, auth flows, and the theme
  system landed nearly wholesale with SMB simplifications (no MFA/SSO/vendor).
- Extracting `DecorativeBackground`/`Separator` into `components/brand/` up
  front (vs. enterprise's inline-per-page copies) made 6 auth pages trivial.
- Building `shared-types` as a compiled package (dist + declarations) instead
  of a source-path alias avoided the enterprise `rootDir` entanglement.

**What bit us**

- Windows shell quoting broke `ts-node --compiler-options` inline JSON for the
  seed script → dedicated `tsconfig.seed.json`. Rule: no inline JSON in
  package scripts.
- Nest CLI + stale `.tsbuildinfo` emitted an incomplete `dist/` after
  `deleteOutDir`; fixed with `incremental: false` in `tsconfig.build.json`.
- `HttpExceptionFilter` assumed `error` is always a string; Terminus health
  payloads proved otherwise and crashed the process. Fixed + regression spec.
  Lesson: ported code gets re-validated against libraries the enterprise
  edition didn't use.

**Debt carried into S1**

- Test coverage far below the 80/70 gates — only 2 API suites exist. S1 must
  ship specs alongside the entitlement layer (which requires exhaustive tests
  per `.cursorrules` anyway).
- Legal page copy is draft-quality; needs owner review before launch (P6).
- semantic-release + CHANGELOG automation deferred to S10.
