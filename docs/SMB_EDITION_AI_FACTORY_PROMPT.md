# SMB Edition — AI Project Factory Prompt

> **Purpose:** This document is the master seed prompt for building the small-business (SMB) edition
> of the Attune Smart Forms platform. Paste the sections below into the new repository as the
> founding context for the AI engineering agent (`.cursorrules` + `planning/MASTER_PLAN.md` seed).
>
> **Author:** Robert Massey | **Created:** 2026-07-11
> **Derived from:** attune-smart-forms (enterprise edition, RC 1.0.6)
> **Market research:** July 2026 (Jotform, Cognito Forms, Typeform, Formstack, GoCanvas)

---

# HOW TO USE THIS DOCUMENT

1. Create the new repository (working name: `attune-sb-smart-forms` — final brand TBD).
2. Copy **PART 1** into the new repo's `.cursorrules`.
3. Copy **PART 2** into `planning/MASTER_PLAN.md`.
4. Copy **PART 3** into `docs/PRICING_AND_ENTITLEMENTS.md`.
5. Copy **PART 4** into `planning/SPRINT_00.md` and begin.
6. Port the reusable packages listed in the "Carry-over manifest" (Part 2, §6) from the
   enterprise repo — do NOT rewrite them from scratch.

## Related documents (enterprise repo)

- [BACKLOG.md — BACKLOG-114 tracks this spin-off](../planning/BACKLOG.md)
- [MASTER_PLAN.md — enterprise plan this derives from](../planning/MASTER_PLAN.md)
- [PROJECT_SCORECARD.md — enterprise status](../scorecard/PROJECT_SCORECARD.md)
- [INFRASTRUCTURE_SCALING_PLAN.md — hosting/cost model to adapt for SMB scale](./INFRASTRUCTURE_SCALING_PLAN.md)
- ADRs referenced by the carry-over manifest: [ADR directory](./ADR/)
- Branding sources (Part 2 §6a): [globals.css](../admin-portal/src/app/globals.css),
  [theme-provider.tsx](../admin-portal/src/providers/theme-provider.tsx),
  [login page (hero + vector shapes)](<../admin-portal/src/app/(auth)/login/page.tsx>),
  [tailwind.config.ts](../admin-portal/tailwind.config.ts)
- Flagship system sources: [form-engine package](../packages/form-engine/),
  [shared-types package](../packages/shared-types/),
  [document-templates module (SmartMapper)](../api/src/modules/document-templates/),
  [workflows module (orchestrator + adapters)](../api/src/modules/workflows/)

> Note: these are relative links within the ENTERPRISE repo. When this file is
> copied into the new `attune-sb-smart-forms` repo, they will not resolve —
> use the absolute path `a:\Attune IT LLC\WebProjects\attune-smart-forms\` there.

---

---

# PART 1 — `.cursorrules` FOR THE NEW REPOSITORY

```
# ============================================================
# PROJECT IDENTITY
# ============================================================
# Project: attune-sb-smart-forms (working name)
# Type: Multi-tenant SaaS web app for small businesses (monorepo)
# Stack: NestJS 10 + Next.js 15 + PostgreSQL 16 + Redis 7 + Stripe
# Author: Robert Massey
# Version: 0.1.0
# Sibling: attune-smart-forms (enterprise edition — source of proven patterns)
# ============================================================

You are a Senior Full-Stack Software Engineer, SaaS product architect, and
growth-minded builder working on **attune-sb-smart-forms** — a self-serve,
subscription-based forms + documents + workflow platform for small businesses.

This is a DERIVATIVE product of attune-smart-forms (the enterprise edition).
You carry forward its proven architecture (shared-types, module-per-domain,
global guards, step-adapter workflow orchestrator, SmartMapper coordinate
mapping, JWT rotation, tenant isolation at service layer) and you ADD what
the enterprise edition does not have: self-serve signup, Stripe subscription
billing, a plan/entitlement/metering layer, a public template library, and
resource throttling tied to what the customer pays.

## PRODUCT THESIS (memorize this)

Small businesses currently pay for THREE tools: a form builder (Jotform,
$39-129/mo), a document generator (Formstack Documents, $50-100/user/mo),
and workflow automation (Zapier or Formstack Suite, $299/mo). We sell all
three in one product at form-builder prices. The paywall is honest and
usage-based: pay for the forms, submissions, and documents you actually use.

The THREE flagship systems, in priority order:
1. **Form Builder** — drag-and-drop builder, 30 field types, conditional
   logic, multi-page navigation, live preview, versioned publishing.
2. **Form Mapper (SmartMapper)** — customer uploads THEIR existing PDF/DOCX
   form (the paper form they already use), maps fields onto it visually,
   and submissions fill that exact document. Auto-mapping suggests field
   positions. This is the moat — no SMB competitor does this well.
3. **Workflow Builder** — visual node graph: on submission → generate PDF →
   email it → require approval → post to webhook. Node catalog is a curated
   SMB subset of the enterprise engine.

## PRIME DIRECTIVE

Before writing a single line of code:
1. Read `planning/MASTER_PLAN.md`
2. Identify the current sprint in `planning/SPRINT_[CURRENT].md`
3. Check the current phase in `scorecard/PROJECT_SCORECARD.md`
4. Confirm the task in scope before implementing

Do NOT build ahead of the plan. Do NOT skip planning artifacts.
When the plan is unclear, ADD to `planning/BACKLOG.md` and ask for clarification.

## MONOREPO STRUCTURE

attune-sb-smart-forms/
├── api/                    # NestJS 10 REST API (hexagonal architecture)
├── web/                    # Next.js 15 — ONE app: marketing pages, signup,
│                           #   builder studio, data views, billing portal
├── packages/
│   ├── shared-types/       # @attune-sb/shared-types — API contracts, entities, enums,
│   │                       #   PLAN DEFINITIONS (the entitlement source of truth)
│   ├── form-engine/        # @attune-sb/form-engine — ported from enterprise; web renderer
│   └── eslint-config/      # shared lint rules
├── docker/                 # Dockerfiles (api, web, nginx)
├── docs/                   # Architecture, pricing/entitlements, ADRs
├── planning/               # MASTER_PLAN, sprint files, BACKLOG
├── scorecard/              # PROJECT_SCORECARD, CHANGELOG
├── scripts/
├── .github/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json

NOTE — deliberate cuts vs enterprise: NO mobile apps at v1 (public web forms
are mobile-responsive instead), NO vendor/PIN app, NO warehouses/teams-by-
warehouse, NO enterprise SSO/OIDC at v1 (backlog for a "Business+" add-on),
NO enterprise deployment mode. One deployment mode: multitenant SaaS.

## THE ENTITLEMENT LAYER (ALWAYS ACTIVE — this is the paywall)

- Stripe is the BILLING system, never the entitlement authority. Webhooks
  (verified, idempotent) update a local `Subscription` row; the app enforces
  access from local state only. Never call Stripe on the request path.
- Plan definitions live in `@attune-sb/shared-types` as typed constants
  (`PLAN_ENTITLEMENTS`). Never scatter `if (plan === 'growth')` checks —
  always go through `EntitlementsService.check(orgId, entitlement)`.
- Two enforcement styles:
  - **Boolean gates** (feature on/off): checked via `@RequireEntitlement()`
    decorator + guard on controllers, and via `useEntitlement()` hook in web.
  - **Metered limits** (forms, submissions/mo, document fills/mo, storage,
    workflow runs/mo, emails/mo): counted in a `UsageCounter` table
    (Postgres, atomic increments) with a Redis cache in front; checked
    BEFORE the action executes; every consumption writes an idempotent
    `UsageEvent` ledger row.
- Soft limit at 80%: banner + email warning. Hard limit at 100%: block the
  metered action with a 402-style response
  (`error.code = 'LIMIT_EXCEEDED'`, includes limit, usage, upgrade URL) —
  but NEVER lose customer data: public form submissions over the cap are
  accepted, stored, and quarantined as `OVER_LIMIT` (visible after upgrade).
  Blocking a paying customer's inbound data is how you lose them.
- Monthly counters reset on the org's billing anchor date, not calendar month.
- Downgrades: never delete data. Forms over the new plan's cap become
  read-only/unpublished (org chooses which stay live); storage over cap
  blocks new uploads only.
- Trial: 14 days of the Growth tier, no credit card required, hard-capped
  (2 published forms, 50 submissions, 10 document fills) so a trial can
  never be farmed as a free production account. One trial per email domain
  + payment-fingerprint heuristics.
- Per-org API rate limits also come from the plan (OrgThrottlerGuard reads
  plan tier). Resource throttling and payment are the same axis.

## BRANDING RULES (same brand as the enterprise edition)

This product shares the Attune IT visual identity with the enterprise edition.
Exact source files to port are listed in MASTER_PLAN §6a (Branding carry-over).

- Brand primary is Attune orange `#F97316` (dark `#EA580C`, mid `#C2410C`,
  deep `#9A3412`); logo wordmark accent green `#4ade80` / `#00A550`.
  Font: Inter (next/font/google, `--font-inter`).
- Port the enterprise theme system (CSS custom properties per `[data-theme]`
  in globals.css + ThemeProvider + theme-switcher + appearance panel).
  DEFAULT THEME for this edition is `attune` (the orange brand theme) —
  not `light` blue as in enterprise.
- Port the logo asset set (attune-logo.svg, attune-logo-dark.svg,
  attune-icon.png, attune-it-logo.png) and the login/auth hero treatment:
  orange gradient (135deg #EA580C → #C2410C → #9A3412) with the vector-style
  DecorativeBackground/DecorativeSeparator geometry (clipPath hexagons,
  torus rings, blurred orbs, grid overlay). EXTRACT those decorative
  components into `web/src/components/brand/` — do not repeat the
  enterprise mistake of defining them inline per page.
- Centralize brand constants (colors, app name, logo paths) in ONE module
  (`web/src/lib/brand.ts` + tokens in globals.css). Never hardcode
  `#F97316` in page components — the enterprise duplicated BRAND_PRIMARY
  across 8+ files; fix that at the border, don't import it.
- All auth pages (login, signup, forgot/reset password, accept-invite) get
  the SAME branded two-column treatment — enterprise left forgot/reset
  unbranded and change-password purple; here they are consistent.
- Legal pages are REQUIRED, branded, and real: `/privacy`, `/terms` (and
  `/refund-policy` for Stripe). Enterprise links to them but never built
  them — a self-serve SaaS taking card payments cannot 404 its privacy
  policy. Signup includes a terms/privacy consent checkbox.
- Emails use the same brand shell: orange accent, logo header,
  "Powered by Attune IT Smart Forms" footer (removable per plan gate).

## DATA LIFECYCLE RULES (trial expiry, cancellation, purge)

Storage and compute are cost drivers — orgs that stop paying must not park
data on our infrastructure indefinitely. Full spec in
`docs/PRICING_AND_ENTITLEMENTS.md` § Data Lifecycle & Purge. Non-negotiables:

- **Trial expires without conversion:** org goes read-only immediately
  (public forms unpublished, workflows paused, builders locked; view +
  export still work). After a 30-day retention window, all org data is
  purged. Reminder emails at expiry, day 7, day 23, day 28.
- **Paid subscription canceled:** full access until end of the paid period,
  then read-only for a 60-day retention window (they paid — be generous),
  then purged. Resubscribing inside the window restores everything instantly.
- **Unresolved PAST_DUE:** after dunning grace windows elapse, auto-cancel
  and enter the same canceled lifecycle.
- **Purge is two-phase:** blob storage (uploads, templates, generated
  documents — the expensive part) deleted first + rows soft-deleted; hard
  DB delete 7 days later (safety net for support mistakes). Purge runs as
  an idempotent daily BullMQ sweep, never inline in a request.
- **What survives purge:** billing/invoice records (legal), a minimal
  tombstone (org id, name, owner email hash, purge timestamp + counts —
  no form/submission content), and the trial-abuse fingerprint so purged
  trial orgs cannot re-trial for free.
- **Legal hold flag** on an org blocks purge unconditionally.
- **User-requested deletion** (GDPR/CCPA-style) skips retention windows —
  purge within 30 days of the verified request, immediately on demand.
- Every purge decision is logged to `PurgeAuditLog`. Purging the wrong org
  is unrecoverable — the sweep gets the same exhaustive test treatment as
  the entitlement layer.

## CODE GENERATION RULES

### TypeScript
- Strict mode ALWAYS (`"strict": true`)
- Never use `any` without a `// Reason: [justification]` comment
- Prefer `interface` for object shapes in signatures; `type` for unions
- All async functions return typed Promises
- `readonly` on immutable properties
- Never `@ts-ignore` — fix the underlying issue
- All API client calls generically typed via `@attune-sb/shared-types`
- Exhaustive switches over unions/enums: `never` check in default case

### Naming
- Files: `kebab-case.ts`; Classes/Interfaces: `PascalCase`;
  functions: `camelCase`; constants: `SCREAMING_SNAKE_CASE`
- DB columns: `snake_case` (Prisma-mapped)
- React components: `PascalCase.tsx`
- Tests: `[filename].spec.ts` (API), `[filename].test.tsx` (web)
- NestJS: `[domain].module.ts` / `.controller.ts` / `.service.ts` / `.repository.ts`

### Function design
- Max 40 lines; max 4 params (options object beyond that)
- Early returns, guard clauses at top

### Errors
- Never swallow errors — log via `SecureLoggerService`
- Custom exceptions extend NestJS `HttpException`
- Services throw domain exceptions; global `HttpExceptionFilter` handles them
- Entitlement denials use a dedicated `EntitlementExceededException`
  carrying `{ entitlement, limit, current, resetsAt, upgradeUrl }`

### Comments & attribution
- File headers: `// Author: Robert Massey | Created: [date] | Module: [name]`
- Explain WHY, not WHAT; no AI-sounding filler
- Imports always at top of module — no inline imports

## ARCHITECTURE RULES

### API (NestJS)
- Hexagonal; module-per-domain in `api/src/modules/[domain]/`
- Controllers: parse/validate/delegate only. Services: business logic only.
  Repositories: the ONLY place Prisma is called.
- Envelope: `{ success, data, error?: { code, message, details }, meta? }`
- Prefix `/api/v1/`; standard pagination meta
- Guard order: JWT → Roles → Entitlements → OrgThrottler

### Web (Next.js 15, App Router)
- Server components by default; `'use client'` only when needed
- Zustand (builder state) + TanStack Query (server state)
- react-hook-form + zod; auth via httpOnly cookies through Route Handlers
  (BFF pattern) — tokens NEVER in localStorage
- Public form fill pages (`/f/[slug]`) are unauthenticated, SSR, fast,
  mobile-responsive, and carry "Powered by" branding on Free/Solo tiers
- Dynamic imports for the form builder, document canvas, workflow builder

### Database (Prisma + PostgreSQL 16)
- UUID v4 PKs; `createdAt`/`updatedAt`/`deletedAt` everywhere
- Every tenant-scoped query filters `organizationId` at the SERVICE layer
- `prisma migrate dev` exclusively; JSON columns for form schema,
  workflow graphs, field mappings; index every FK and WHERE column

## SECURITY RULES (ALWAYS ACTIVE)

- JWT access 15 min; refresh 7 days with rotation (bcrypt-hashed, family tracking)
- Global `JwtAuthGuard`; `@Public()` opt-out (auth, health, webhooks,
  public form fill, template gallery browse)
- Roles (simplified for SMB): PLATFORM_ADMIN, OWNER, ADMIN, BUILDER, VIEWER
- Tenant isolation at service layer; cross-org access is a security event
- `@nestjs/throttler` + per-plan `OrgThrottlerGuard`
- Global ValidationPipe + class-validator DTOs
- AES-256-GCM for stored third-party credentials (SMTP, webhook secrets)
- PII redaction via `SecureLoggerService`
- Stripe webhooks: signature-verified on raw body, idempotent handlers
- File upload: MIME validation + per-plan size limits; uploaded PDFs are
  scanned/sanitized before processing
- Public form endpoints: CAPTCHA option, per-form rate limits, honeypot field
- Account lockout 5 fails / 15 min; CORS, Helmet, HSTS in main.ts
- No secrets in code — `process.env` + `.env.example`

## TESTING RULES

- Every service → `.spec.ts`; every controller → Supertest integration test;
  every React component → `.test.tsx`
- The entitlement layer gets EXHAUSTIVE tests: every plan × every limit ×
  soft/hard boundary × trial expiry × downgrade. Billing bugs are trust-killers.
- Stripe webhook handlers tested with recorded fixtures + idempotency replays
- Coverage: 80% API / 70% web. CI MUST fail on test failures.

## CI/CD RULES

- Never bypass CI; PRs pass lint, typecheck, tests before merge
- Conventional Commits; semantic-release
- Secrets via GitHub Secrets; production deploy requires manual approval

## PLANNING & SCORECARD RULES

- After completing any task, update `scorecard/PROJECT_SCORECARD.md`
- New requirements → `planning/BACKLOG.md` first; never silently expand scope

## WHAT CURSOR MUST NOT DO

- Never generate `TODO: implement this` stubs without a backlog entry
- Never build the whole app in one shot — follow the sprint plan
- Never hardcode plan names/limits outside `@attune-sb/shared-types` PLAN_ENTITLEMENTS
- Never query the DB outside a repository class
- Never call Stripe on a request path to decide access
- Never add a dependency without a `docs/ADR/` note
- Never create a form field component outside `@attune-sb/form-engine`
- Never use `any` in API client calls
- Never delete or hide customer submission data because of a plan limit
```

---

---

# PART 2 — `planning/MASTER_PLAN.md` SEED

## 1. Product Vision

**One-liner:** "Turn the paper forms your business already uses into digital forms,
filled PDFs, and automated workflows — for the price of a basic form builder."

**Target customer:** Solopreneurs and small businesses (1–25 employees) that run on
paper/PDF forms today: contractors, inspectors, property managers, clinics, gyms,
cleaning services, small logistics, franchises. They are underserved: form builders
(Jotform/Typeform) can't fill their existing PDFs; document platforms (Formstack)
price them out at $299/mo; field tools (GoCanvas) force per-seat minimums ($87+/mo).

**Positioning statement:** For small businesses that live on standard forms,
attune-sb-smart-forms is the only affordable platform that combines a form builder,
a "bring your own PDF" form mapper, and no-code workflow automation (PDF generation,
email delivery, approvals) in one subscription — priced against basic form builders,
not enterprise document suites.

## 2. Competitive Landscape (researched July 2026)

| Competitor        | Entry paid tier                      | Mid tier                         | Top self-serve                                | Key limits model                             | Our angle                                                         |
| ----------------- | ------------------------------------ | -------------------------------- | --------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| **Jotform**       | Bronze $39/mo (25 forms, 1k subs/mo) | Silver $49 (50 forms, 2.5k subs) | Gold $129 (100 forms, 10k subs)               | Forms + submissions + storage + payment subs | No PDF-fill of customer's own forms; single-user until Enterprise |
| **Cognito Forms** | Pro $19/mo (2k entries, 2 users)     | Team $39 (10k entries, 5 users)  | Enterprise $129 (unlimited entries, 20 users) | Entries + users + storage                    | Strong logic/calc, weak documents & workflow                      |
| **Typeform**      | Basic $29/mo (100 responses!)        | Plus $79 (1k)                    | Business $129 (10k)                           | Responses (very tight)                       | Marketing forms only; no documents/workflow                       |
| **Formstack**     | Forms $99/mo (25 forms, 1 builder)   | —                                | Suite $299/mo (forms+docs+sign)               | Forms + per-form submissions + builders      | Our feature set at 3–6× our price; validates the bundle           |
| **GoCanvas**      | $29/user/mo, 3-user min (~$87)       | $39/user                         | $49/user                                      | Per-seat; unlimited forms/subs               | Field-ops focus; per-seat pricing punishes small teams            |

**Pricing insights to encode:**

- The market meters on: active forms, monthly submissions, storage, users, and
  document generations. Documents are the premium meter (Formstack charges
  ~$50–100/user/mo just for doc-gen at 100–2,000 docs/mo).
- $19 is the credible solo entry point (Cognito). $39–49 is the SMB sweet spot
  (Jotform Bronze/Silver, Cognito Team, GoCanvas). $99–129 is the self-serve ceiling.
- Flat org pricing with included seats beats per-seat at this segment (GoCanvas's
  3-seat minimum is a documented pain point).
- Typeform proves tight response caps generate upgrade revenue but also churn —
  our caps must feel generous at each rung, with the document-fill meter as the
  real differentiated upsell.

## 3. Pricing & Tier Design (v1 — validate before launch)

|                                          | **Free Trial**       | **Solo**             | **Growth**                     | **Business**                              |
| ---------------------------------------- | -------------------- | -------------------- | ------------------------------ | ----------------------------------------- |
| Price (monthly)                          | $0 × 14 days         | **$19/mo**           | **$49/mo**                     | **$99/mo**                                |
| Price (annual, ~2 mo free)               | —                    | $190/yr              | $490/yr                        | $990/yr                                   |
| Users included                           | 2                    | 1 (+$5/extra, max 3) | 5 (+$5/extra, max 10)          | 15 (+$4/extra, max 30)                    |
| Active (published) forms                 | 2                    | 5                    | 25                             | 75                                        |
| Submissions / month                      | 50                   | 500                  | 2,500                          | 10,000                                    |
| Document fills (PDF/DOCX) / mo           | 10                   | 50                   | 500                            | 2,000                                     |
| Uploaded template forms (SmartMapper)    | 1                    | 3                    | 15                             | 50                                        |
| Workflow runs / month                    | 50                   | 500                  | 2,500                          | 10,000                                    |
| Workflow nodes available                 | Core                 | Core                 | Core + Approvals + Webhook/API | All (incl. scheduled/delay, sub-workflow) |
| Emails sent via workflows / mo           | 25                   | 200                  | 1,500                          | 6,000                                     |
| Storage                                  | 250 MB               | 1 GB                 | 10 GB                          | 50 GB                                     |
| Max upload size                          | 5 MB                 | 10 MB                | 25 MB                          | 50 MB                                     |
| Template library                         | Use                  | Use                  | Use + publish to own org       | Use + publish + private org library       |
| API access                               | —                    | —                    | Read-only                      | Full REST API                             |
| API rate limit (req/min/org)             | 30                   | 60                   | 300                            | 1,000                                     |
| Auto-mapping (Stage 1, free engine)      | ✓                    | ✓                    | ✓                              | ✓                                         |
| AI-assisted mapping credits / mo         | 3                    | 5                    | 25                             | 100                                       |
| Remove "Powered by" branding             | —                    | —                    | ✓                              | ✓                                         |
| Data retention (while subscribed)        | n/a                  | 1 year               | 3 years                        | 7 years                                   |
| Retention after trial end / cancellation | 30 days, then purged | 60 days, then purged | 60 days, then purged           | 60 days, then purged                      |
| Support                                  | Community            | Email                | Priority email                 | Priority + onboarding call                |

**Design rules (non-negotiable):**

1. Everything is capped — "max but not unlimited" on Business. Unlimited anything
   destroys the cost model; Jotform's own top self-serve tier is capped.
2. Every meter maps to a real cost driver: submissions → DB/compute, document
   fills → CPU (pdf-lib/Puppeteer), emails → deliverability cost, storage → blob,
   AI credits → LLM spend, API rate → infra. Throttling and revenue share one axis.
3. Upgrade paths are obvious: Solo hits the 5-form or 50-doc-fill wall → Growth.
   Growth teams hit approvals/API needs → Business. Business hits 75 forms/10k
   subs → sales conversation (route to the enterprise edition — that's the ladder
   between the two products).
4. Overage policy: no surprise charges at v1. Soft-warn at 80%, hard-stop at 100%
   (except inbound public submissions, which are quarantined not dropped).
   Metered overage packs (e.g. +1,000 submissions for $10) are a fast-follow.
5. Trial converts on value moment: the "aha" is uploading their own PDF and seeing
   it auto-fill from a submission. Onboarding drives to that in <10 minutes.

## 4. System Inventory

### Flagship systems (port + adapt from enterprise)

| System                        | Enterprise source                                                                                                                                                                         | SMB adaptation                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Form Builder**              | forms module + admin-portal builder (Zustand + @dnd-kit) + `@attune/form-engine` (30 field types, conditional visibility, navigation rules, publish/version FSM)                          | Port as-is. Add public form pages (`/f/[slug]`) with SSR web renderer. Gate active-form count by plan.              |
| **Form Mapper (SmartMapper)** | document-templates module: presigned upload, DOCX→PDF (mammoth+Puppeteer), pdf-lib page dims, coordinate `fieldMappings` JSON, document-canvas UI, Stage 1 auto-mapper (pdfjs + fuzzball) | Port as-is minus Azure DI (backlog). Gate template count + AI credits by plan. This is the marquee onboarding flow. |
| **Workflow Builder**          | workflows module: React Flow graph, publish snapshots, WorkflowOrchestrator + step adapters, version pinning, BullMQ execution                                                            | Port orchestrator + curated node subset (below). Gate node catalog + runs/mo by plan.                               |

### SMB workflow node catalog

- **Core (all tiers):** start, end, form, condition, email, pdf_generate,
  fill_document, send_document, notify
- **Growth+:** approval (token-based public approval links — port ApprovalToken),
  webhook, api (with SSRF protection), switch, data_transform, export (CSV/Excel)
- **Business:** delay (BullMQ scheduled resume), sub_workflow, excel_generate, loop
- **Cut from v1:** sharepoint, teams_message, ai_* nodes, track_usage
  (AI nodes are a strong v1.5 upsell — backlog them)

### Supporting systems

| System                       | Notes                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenancy**            | Port Organization model + service-layer isolation. Single deployment mode (multitenant). Self-serve org creation at signup.                                                                                                                                                                                       |
| **RBAC**                     | Simplified: PLATFORM_ADMIN (us), OWNER (billing + everything), ADMIN, BUILDER (forms/workflows, no billing/users), VIEWER (data only). Port RolesGuard hierarchy; drop DB per-permission table at v1 (roles suffice for SMB).                                                                                     |
| **Auth**                     | Port JWT + refresh rotation, lockout, email verification, forgot/reset, invitations. ADD: self-serve signup w/ org creation, Google OAuth social login (SMBs expect it). CUT: enterprise OIDC/SSO, MFA→backlog (fast-follow), vendor PIN entirely.                                                                |
| **Data views (submissions)** | Port submissions module: status workflow, audit log, filters/search, CSV/Excel export, per-submission detail w/ generated documents. Add simple charts (submissions over time, per form).                                                                                                                         |
| **Template Library**         | Port library module + EXPAND: curated public gallery (industry categories: inspections, intake, HR, field service…), one-click clone into org, template = form schema + optional document mapping + optional workflow. Growth+ can publish org-private templates. Public gallery is also SEO/acquisition surface. |
| **Billing & Entitlements**   | NEW build (see Part 3). Stripe Checkout + Customer Portal; local Subscription/Plan/UsageCounter/UsageEvent; EntitlementsService + guard + web hook.                                                                                                                                                               |
| **Notifications**            | Port in-app + email (nodemailer→transactional provider). Cut push/Firebase at v1.                                                                                                                                                                                                                                 |
| **Connections**              | Port encrypted credentials (AES-256-GCM) for customer SMTP + webhook secrets.                                                                                                                                                                                                                                     |
| **Observability**            | Port SecureLogger, Sentry, health checks, security events. Add usage/limit analytics for OUR ops (which orgs near limits = expansion pipeline).                                                                                                                                                                   |

## 5. Architecture Decisions (pre-seeded ADRs)

- **ADR-001:** Stack inheritance — NestJS 10, Prisma 5, PostgreSQL 16, Redis/BullMQ,
  Next.js 15, Turborepo/pnpm. Same as enterprise; proven, and enables code sharing.
- **ADR-002:** Single web app (marketing + product) instead of separate portal —
  SMB motion needs seamless landing→signup→builder; split later if needed.
- **ADR-003:** Entitlements as a first-class module — local authority, Stripe as
  input via webhooks; Redis-cached counters over a Postgres ledger (see Part 3).
- **ADR-004:** No native mobile at v1 — responsive public form pages cover the
  fill-side; the enterprise edition remains the offline-first field-ops answer.
  Revisit after PMF (the enterprise Expo apps + MobileWorkflowEngine are portable).
- **ADR-005:** Storage abstraction — keep `BlobStorageService` interface, but choose
  provider by cost at SMB scale (S3-compatible; don't hard-couple to Azure).

## 6. Carry-over Manifest (port, don't rewrite)

**Port nearly verbatim:** `@attune/form-engine` (rename `@attune-sb/form-engine`),
shared-types core (field defs, workflow types — FIX the known drift: add
fill_document/send_document to WorkflowNodeType), validate-form.ts, encryption
service, SecureLoggerService, TransformInterceptor + exception filters, JWT/refresh
rotation auth core, RolesGuard, OrgThrottlerGuard (extend to read plan), Prisma
conventions, WorkflowOrchestrator + the kept step adapters, document-templates
module + document-canvas UI + Stage 1 auto-mapper, ApprovalToken flow,
BullMQ queue module, health module, BFF cookie auth middleware pattern.

**Known enterprise debt — do NOT import:** shared-types node-type drift (fix at
port time), OrgAuditLogService test-scope issues, Azure-specific storage coupling,
`any` types wherever found in ported code (clean at the border).

### 6a. Branding carry-over (same Attune identity, orange-first)

Port from the enterprise repo (`attune-smart-forms`) — exact sources:

| Asset                                          | Enterprise source                                                                                                                                                        | SMB destination / change                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Theme tokens (13 themes incl. `attune` orange) | `admin-portal/src/app/globals.css` (theme block + component utilities)                                                                                                   | `web/src/app/globals.css`; set default theme to `attune` (orange), not `light`                          |
| Theme runtime                                  | `admin-portal/src/providers/theme-provider.tsx`, `src/lib/utils.ts` (`THEME_NAMES`), `src/components/ui/theme-switcher.tsx`, `(dashboard)/settings/appearance-panel.tsx` | Port; rename storage key to `attune-sb-theme`                                                           |
| Tailwind semantic mapping + Inter font         | `admin-portal/tailwind.config.ts`, `src/app/layout.tsx`                                                                                                                  | Port as-is                                                                                              |
| Logos                                          | `admin-portal/public/attune-logo.svg`, `attune-logo-dark.svg`, `attune-icon.png`, `attune-it-logo.png`                                                                   | Copy to `web/public/`                                                                                   |
| Login hero + vector shapes                     | `admin-portal/src/app/(auth)/login/page.tsx` (`DecorativeBackground`, `DecorativeSeparator`, orange gradient `#EA580C→#C2410C→#9A3412`)                                  | Extract into reusable `web/src/components/brand/` components; apply to ALL auth pages + marketing pages |
| Email brand shell                              | `api/prisma/seed.ts` email HTML shell + logo footer                                                                                                                      | Port with orange accent; "Powered by" footer is plan-gated                                              |

Border fixes while porting (do not carry the debt): centralize `BRAND_PRIMARY`
`#F97316` and app name in `web/src/lib/brand.ts` (enterprise duplicates it in 8+
files); build the real `/privacy` and `/terms` pages (enterprise login links to
them but they 404); make forgot/reset/change-password pages match the branded
treatment (enterprise left them inconsistent).

## 7. Phased Delivery Plan (Agile — 2-week sprints)

| Phase                   | Sprints | Outcome                                                                                                                                                                                                                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0 Foundation**       | S0      | Monorepo scaffold, CI, Prisma schema v1, ported common modules, auth (signup/login/invite), org creation, seed plans, branding foundation (theme system w/ orange default, logos, branded auth pages, privacy/terms pages)                                                      |
| **P1 Paywall Core**     | S1–S2   | Stripe integration (Checkout, Portal, webhooks), Subscription/Plan/Entitlements module, UsageCounter + guard + web hooks, trial lifecycle + org lifecycle state machine (read-only mode, DataLifecycleService purge sweep, reminder emails, export-all), plan pages             |
| **P2 Form Builder**     | S3–S4   | Ported builder + engine, publish/version, public form pages, submissions capture + data views, form-count & submission metering live                                                                                                                                            |
| **P3 SmartMapper**      | S5–S6   | Upload pipeline, document canvas, coordinate mapping, Stage 1 auto-map, fill_document runtime, doc-fill metering, the 10-minute onboarding flow                                                                                                                                 |
| **P4 Workflow Builder** | S7–S8   | React Flow builder w/ plan-gated node catalog, orchestrator, email/pdf/approval/webhook adapters, run metering                                                                                                                                                                  |
| **P5 Library + Polish** | S9      | Template gallery (seed 25+ curated templates), clone flow, notifications, exports, branding removal gate                                                                                                                                                                        |
| **P6 Launch Hardening** | S10–S11 | Security pass (public form abuse, webhook idempotency replay tests), load test metering hot path, billing edge cases (dunning, downgrade, cancel), full lifecycle rehearsal (trial-expiry → purge and cancel → purge on a staging org, restore drills), docs, production deploy |

**Definition of Done (every sprint):** tests written & green in CI, coverage gates
met, scorecard updated, no `any` without justification, entitlement checks on every
new metered surface, CHANGELOG entry, demo-able increment.

**Agile ceremonies encoded in repo:** sprint file per sprint with goals/tasks/
acceptance criteria; BACKLOG.md as the single intake; scorecard as the living
status; retros appended to each sprint file at close.

---

---

# PART 3 — `docs/PRICING_AND_ENTITLEMENTS.md` SEED (technical spec)

## Entitlement Architecture

```
Stripe (billing events only)
   │  verified, idempotent webhooks
   ▼
Subscription (local table — plan, status, trialEndsAt, billingAnchor, seats)
   ▼
EntitlementsService  ◄── PLAN_ENTITLEMENTS (typed constants in @attune-sb/shared-types)
   │                          + EntitlementOverride table (per-org exceptions,
   │                            temporary grants, grandfathered limits)
   ├── boolean gates  → @RequireEntitlement() guard / useEntitlement() hook
   └── metered limits → UsageCounter (Postgres, atomic) + Redis cache
                          ▲
                        UsageEvent ledger (idempotent, append-only —
                        source for billing reconciliation & analytics)
```

### Data model additions (Prisma)

```prisma
model Plan {              // seeded rows mirror PLAN_ENTITLEMENTS for reporting joins
  id            String   @id            // 'solo' | 'growth' | 'business'
  stripePriceIdMonthly String
  stripePriceIdAnnual  String
  // limits are NOT stored here at runtime — code constants are authority;
  // this table exists for admin reporting and Stripe price mapping
}

model Subscription {
  id                 String   @id @default(uuid())
  organizationId     String   @unique
  planId             String
  status             SubscriptionStatus  // TRIALING, ACTIVE, PAST_DUE, CANCELED, PAUSED
  stripeCustomerId   String
  stripeSubscriptionId String?
  trialEndsAt        DateTime?
  billingAnchorDay   Int       // usage counters reset on this day
  seats              Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UsageCounter {          // one row per org × meter × period
  id             String  @id @default(uuid())
  organizationId String
  meter          Meter   // SUBMISSIONS, DOC_FILLS, WORKFLOW_RUNS, EMAILS, AI_CREDITS, STORAGE_BYTES
  periodStart    DateTime
  periodEnd      DateTime
  used           BigInt
  @@unique([organizationId, meter, periodStart])
}

model UsageEvent {            // append-only, idempotent ledger
  id             String  @id @default(uuid())
  organizationId String
  meter          Meter
  quantity       BigInt
  idempotencyKey String  @unique
  refType        String? // 'submission' | 'workflowExecution' | ...
  refId          String?
  createdAt      DateTime @default(now())
}

model EntitlementOverride {   // sales exceptions, grandfathering, temp grants
  id             String  @id @default(uuid())
  organizationId String
  entitlement    String
  value          Json
  expiresAt      DateTime?
  reason         String
}
```

### Enforcement flow (metered action, e.g. document fill)

1. `EntitlementsService.consume(orgId, Meter.DOC_FILLS, 1, idempotencyKey)`
2. Read counter (Redis cache → Postgres fallback); compare vs plan limit + overrides
3. Under limit → atomic `UPDATE ... SET used = used + 1` + insert UsageEvent → proceed
4. ≥80% → proceed + enqueue soft-limit notification (once per period per meter)
5. At limit → throw `EntitlementExceededException` → 402-style envelope with
   `{ limit, used, resetsAt, upgradeUrl }` → web renders upgrade modal
6. Exception: PUBLIC submission intake never throws — accept, store as
   `OVER_LIMIT`, notify owner, count toward next period on upgrade

### Stripe integration rules

- Checkout Session for purchase; Customer Portal for self-serve plan changes,
  payment method, cancellation. We do not build card forms.
- Webhooks handled: `checkout.session.completed`, `customer.subscription.updated/
deleted`, `invoice.paid`, `invoice.payment_failed` — all idempotent (event ID
  dedupe table), signature-verified on raw body.
- Dunning: PAST_DUE = 7-day grace with full access + banners; then downgrade to
  read-only (data visible/exportable, no new submissions to private forms,
  public forms show "temporarily unavailable" after a further 14 days). If still
  unpaid 30 days after the failed invoice, auto-cancel → CANCELED lifecycle below.
- Cancellation: via Customer Portal, effective end of paid period. Then the
  CANCELED lifecycle below takes over. Export always available until purge.

### Throttling ties to plan

- `OrgThrottlerGuard` resolves req/min from plan tier
- Queue priority (BullMQ): Business > Growth > Solo for workflow/doc-gen jobs
- Per-plan max upload size + storage checks in presigned-URL issuance

## Data Lifecycle & Purge

**Why:** abandoned trials and canceled subscriptions must not accumulate blob
storage (uploaded PDFs, generated documents, attachments) and database rows
indefinitely. Storage is a plan meter and a real cost — the lifecycle reclaims it
predictably, while never surprising a customer who intends to come back.

### Org lifecycle state machine

`Organization.lifecycleState`:

```
ACTIVE ──trial expires unconverted──► EXPIRED_TRIAL (read-only, 30-day window)
ACTIVE ──cancel / dunning exhausted──► CANCELED (read-only, 60-day window)
EXPIRED_TRIAL | CANCELED ──subscribe/resubscribe──► ACTIVE (instant full restore)
EXPIRED_TRIAL | CANCELED ──window elapses──► PURGE_PENDING (blobs deleted,
                                              rows soft-deleted)
PURGE_PENDING ──7 days──► PURGED (hard delete; tombstone only)
PURGE_PENDING ──support restore (DB rows only; blobs are gone)──► ACTIVE
```

### Read-only means

- Public forms unpublished (fill pages return "no longer available")
- Workflows paused; scheduled/delayed executions canceled
- Builders, uploads, and all metered actions blocked
- Login, viewing data, and FULL EXPORT (submissions CSV/JSON, form schemas,
  uploaded templates, generated documents as a zip) still work — export is the
  last thing we ever take away

### Timelines & communications

| Event                        | Trial (unconverted)  | Paid (canceled)       |
| ---------------------------- | -------------------- | --------------------- |
| Access ends                  | at `trialEndsAt`     | end of paid period    |
| Retention window (read-only) | 30 days              | 60 days               |
| Reminder emails              | T+0, T+7, T+23, T+28 | T+0, T+14, T+45, T+53 |
| Blob purge + soft delete     | day 30               | day 60                |
| Hard DB delete               | day 37               | day 67                |

Reminder emails state exactly what will be deleted and when, link to one-click
export and one-click resubscribe. The final two mails are explicit purge warnings.

### Purge mechanics

- Daily BullMQ sweep (`DataLifecycleService`), idempotent, batch-limited;
  never runs inline in a request
- Phase 1 (window elapsed): delete all org blobs (uploads, templates, filled
  documents, attachments) — the expensive resource goes first; soft-delete org
  rows; state → PURGE_PENDING; write `PurgeAuditLog` entry with per-entity counts
- Phase 2 (+7 days): hard-delete org rows (cascade order documented in the
  purge service); state → PURGED
- Legal hold: `Organization.legalHoldAt` blocks both phases unconditionally
- User-requested deletion (GDPR/CCPA-style): verified request sets
  `purgeRequestedAt` → sweep processes it on the next run, skipping windows

### What survives a purge

- Stripe customer + invoice/billing records (legal/accounting requirement)
- A tombstone row: org id, org name, SHA-256 of owner email, plan at exit,
  lifecycle path (trial vs canceled), purge timestamps, entity counts —
  no form, submission, or document content
- Trial-abuse fingerprint (email-domain + payment fingerprint hashes) so a
  purged trial org cannot re-trial for free
- `PurgeAuditLog` entries (they reference the tombstone, not PII)

### Schema additions

```prisma
// on Organization:
//   lifecycleState  OrgLifecycleState @default(ACTIVE)
//   readOnlyAt      DateTime?   // when the retention window started
//   purgeScheduledAt DateTime?  // precomputed by the sweep for observability
//   purgeRequestedAt DateTime?  // user-initiated deletion request
//   legalHoldAt     DateTime?

model PurgeAuditLog {
  id             String   @id @default(uuid())
  organizationId String   // survives as reference to tombstone
  phase          PurgePhase // BLOBS_DELETED, HARD_DELETED, RESTORED, LEGAL_HOLD_SKIP
  entityCounts   Json     // { forms: n, submissions: n, blobsBytes: n, ... }
  triggeredBy    String   // 'lifecycle-sweep' | 'user-request' | 'support:[userId]'
  createdAt      DateTime @default(now())
}
```

### Testing requirements (same rigor as entitlements)

- Sweep is idempotent: running twice never double-deletes or skips
- Resubscribe at every state: day 29 of trial window, day 59 of canceled
  window, during PURGE_PENDING (rows restorable, blobs gone — verified UX copy)
- Legal hold and purge-request paths
- Clock-boundary cases (timezone, DST, billing anchor vs lifecycle dates)
- PurgeAuditLog written for every transition; tombstone contains no content PII

---

---

# PART 4 — `planning/SPRINT_00.md` SEED

**Sprint 0 Goal:** Runnable monorepo skeleton with auth, org signup, seeded plans,
and CI gates — nothing user-visible beyond signup/login.

Tasks:

1. Scaffold monorepo (pnpm + Turborepo) per Part 1 structure; port eslint-config
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

Acceptance: `pnpm dev` boots api + web; signup→verify→login round-trip works;
trial subscription row created with correct `trialEndsAt`; auth pages render the
Attune orange brand treatment; `/privacy` and `/terms` resolve; CI green.

Pre-seeded BACKLOG (deferred, do not build in v1): MFA/TOTP, Google OAuth
(fast-follow S3), enterprise SSO, AI workflow nodes, AI mapping Stage 2 (vision),
overage packs, native mobile apps, per-permission RBAC table, push notifications,
Azure Document Intelligence for scanned PDFs, affiliate/referral program,
annual-plan proration edge cases, EU data residency.

---

# APPENDIX — Market data snapshot (July 2026, for future re-validation)

- Jotform: Free (5 forms/100 subs) · Bronze $39 (25/1,000) · Silver $49 (50/2,500)
  · Gold $129 (100/10,000) — single-user until Enterprise; meters: forms, subs,
  views, storage, payment subs, signed docs, fields/form.
- Cognito Forms: Free (unlimited forms/100 entries) · Pro $19 (2,000 entries,
  2 users) · Team $39 (10k, 5 users) · Enterprise $129 (unlimited, 20 users).
- Typeform: Basic $29–39 (100 responses) · Plus $79 (1,000) · Business $129 (10k).
- Formstack: Forms $99/mo ($83 annual; 25 forms, 1,000 subs/form, 1 builder) ·
  Suite $299/mo ($250 annual; +Documents+Sign, 100 forms, 3 builders).
  Documents standalone historically ~$50–100/user/mo for 100–2,000 docs/mo.
- GoCanvas: $29/$39/$49 per user/mo, 3-user minimum, annual billing; unlimited
  forms/submissions; meters on seats + feature gates instead.
- Entitlement best practice consensus: Stripe = billing input, never access
  authority; local subscription state via idempotent webhooks; plan→capability
  map in code; usage ledger + counter summary for sub-ms checks; support
  overrides, grace periods, trials, grandfathering explicitly.
