# attune-sb-smart-forms

> Author: Robert Massey | © 2026 Attune IT LLC
> Self-serve, subscription-based forms + documents + workflow SaaS for small
> businesses. Derivative of the enterprise `attune-smart-forms` platform.

**Status:** Phase 3 complete (v0.1.0) — self-serve signup with 14-day
trial, entitlement/metering paywall, Stripe billing scaffolding, org data
lifecycle, form builder with 30 field types, versioned publishing, public fill
pages, submissions with quarantine-not-drop metering, CSV/Excel export, and
the full SmartMapper moat: upload your existing PDF/DOCX form, auto-map fields
onto it (fuzzy label matching with a visual review step), and every public
submission fills your exact PDF — metered, stored, and downloadable from the
data view. Phase 4 (workflow builder) is next.

## Stack

pnpm + Turborepo monorepo: NestJS 10 API (`api/`), Next.js 15 web (`web/`),
PostgreSQL 16 + Redis 7 (Docker), Prisma, Stripe, BullMQ.

| Package                  | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `api/`                   | REST API — auth, entitlements, billing, forms, submissions, templates    |
| `web/`                   | Marketing + auth + dashboard + builder + public fill pages               |
| `packages/shared-types`  | API contracts, enums, `PLAN_ENTITLEMENTS` (paywall source of truth)      |
| `packages/form-engine`   | Form renderer + conditional logic / validation (`./logic` is React-free) |
| `packages/eslint-config` | Shared lint rules                                                        |

## Run it locally

Prereqs: Node ≥ 20, pnpm ≥ 8, Docker Desktop.

```powershell
# 1. Infrastructure (Postgres on 5434, Redis on 6382, Mailpit UI on 8025)
docker compose up -d

# 2. Environment
Copy-Item .env.example .env        # defaults work for local dev
Copy-Item .env.example api\.env    # api reads its own copy

# 3. Install, migrate, seed
pnpm install
pnpm db:migrate
pnpm db:seed

# 4. Run everything (API :3001, web :3000)
pnpm dev
```

Swagger lives at `http://localhost:3001/api/docs` in dev.

### Seed credentials

| Account        | Email                        | Password              |
| -------------- | ---------------------------- | --------------------- |
| Platform admin | `admin@attuneitus.com`       | `AttunePlatform#2026` |
| Demo org owner | `owner@demo.attune-sb.local` | `DemoOwnerPass#2026`  |

The demo org starts on an active 14-day trial (2 published forms,
50 submissions/mo, 10 document fills/mo, 1 uploaded template). Or sign up
fresh at `http://localhost:3000/signup` — no credit card required.

Template uploads are stored on local disk (`api/storage/` by default;
override with `STORAGE_LOCAL_DIR`). An S3-compatible driver is backlogged
(SB-017).

### Stripe (optional for local dev)

The trial path works with no Stripe keys; checkout/portal endpoints return
`BILLING_NOT_CONFIGURED` (503) until keys exist. To test paid flows, put test
keys in `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs) and
forward webhooks: `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe`.

## Quality gates

```powershell
pnpm lint ; pnpm typecheck ; pnpm test
```

CI (GitHub Actions) runs all three plus commitlint (Conventional Commits) on
every PR. Coverage targets: 80% API / 70% web.

## Where things are decided

- `planning/MASTER_PLAN.md` — vision, pricing, phase roadmap
- `planning/SPRINT_XX.md` — per-sprint scope + retro
- `docs/PRICING_AND_ENTITLEMENTS.md` — paywall + data lifecycle spec
- `docs/ADR/` — dependency and architecture decisions
- `scorecard/PROJECT_SCORECARD.md` — living status
