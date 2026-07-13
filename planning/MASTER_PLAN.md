# attune-sb-smart-forms — Master Plan

> **Seed document for the NEW SMB repository.** Copy to `planning/MASTER_PLAN.md`
> in `attune-sb-smart-forms`. Staged in the enterprise repo under `docs/smb-edition/`.
> Author: Robert Massey | Created: 2026-07-11

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
| **Billing & Entitlements**   | NEW build (see `docs/PRICING_AND_ENTITLEMENTS.md`). Stripe Checkout + Customer Portal; local Subscription/Plan/UsageCounter/UsageEvent; EntitlementsService + guard + web hook.                                                                                                                                   |
| **Data lifecycle**           | NEW build (see `docs/PRICING_AND_ENTITLEMENTS.md` § Data Lifecycle & Purge): org lifecycle state machine, read-only mode, DataLifecycleService purge sweep, export-all, reminder emails.                                                                                                                          |
| **Notifications**            | Port in-app + email (nodemailer→transactional provider). Cut push/Firebase at v1.                                                                                                                                                                                                                                 |
| **Connections**              | Port encrypted credentials (AES-256-GCM) for customer SMTP + webhook secrets.                                                                                                                                                                                                                                     |
| **Observability**            | Port SecureLogger, Sentry, health checks, security events. Add usage/limit analytics for OUR ops (which orgs near limits = expansion pipeline).                                                                                                                                                                   |

## 5. Architecture Decisions (pre-seeded ADRs)

- **ADR-001:** Stack inheritance — NestJS 10, Prisma 5, PostgreSQL 16, Redis/BullMQ,
  Next.js 15, Turborepo/pnpm. Same as enterprise; proven, and enables code sharing.
- **ADR-002:** Single web app (marketing + product) instead of separate portal —
  SMB motion needs seamless landing→signup→builder; split later if needed.
- **ADR-003:** Entitlements as a first-class module — local authority, Stripe as
  input via webhooks; Redis-cached counters over a Postgres ledger
  (see `docs/PRICING_AND_ENTITLEMENTS.md`).
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
