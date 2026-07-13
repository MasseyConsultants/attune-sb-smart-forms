# attune-sb-smart-forms — Sprint 4

> Author: Robert Massey | Created: 2026-07-13
> Phase: P2 Form Builder (second half — closes the phase)

**Sprint 4 Goal:** The public loop closes — anyone can fill a published form at
`/f/[slug]`, submissions are metered (never dropped: OVER_LIMIT quarantine),
builders see their data in a table with CSV/Excel export, and the Phase 2
stop-condition checklist passes end to end.

## Tasks

1. **Submissions API module** (`api/src/modules/submissions/`)
   - `Submission` Prisma model per shared-types contract (formId, formVersion,
     data JSON, status, submittedAt, org-scoped)
   - Public intake endpoint `POST /public/forms/:slug/submissions` (`@Public()`)
     - Validates against the published FormVersion snapshot (validate-form)
     - Meters `SUBMISSIONS`: consume + quarantine as `OVER_LIMIT` when the org
       is at cap — data is NEVER rejected (design rule: don't lose customer data)
     - Abuse controls: per-form throttle, honeypot field check, org must be
       ACTIVE (read-only orgs' forms are unpublished by lifecycle anyway)
   - Authenticated list/get/delete endpoints, org-scoped at the service layer
   - OVER_LIMIT rows hidden from list/exports until the plan has room (visible
     after upgrade), surfaced as a count + upgrade nudge
2. **Public form fill pages** (`web/src/app/f/[slug]/`)
   - Unauthenticated SSR route outside the dashboard shell, fast + mobile
   - Renders the latest published FormVersion via form-engine FormRenderer
   - Posts to the public intake BFF; branded success screen (settings-driven)
   - "Powered by Attune IT Smart Forms" footer on Free/Solo/Trial
     (`removeBranding` gate)
   - 404 page for unknown/unpublished slugs
3. **Data views + export** (`web/src/app/(dashboard)/forms/[id]/submissions/`)
   - Submissions table (columns from schema, paginated), detail drawer
   - CSV + Excel export (exceljs or csv only if exceljs needs an ADR)
   - Submission count column on the forms list (replaces the S3 placeholder)
   - Usage meter visibility: submissions meter on the dashboard reflects intake
4. **Phase 2 close**
   - SB-014 downgrade form-picker + SB-015 export-all from backlog
   - Run instructions + seed credentials + click-through checklist delivered
     (the Phase 2 stop condition from MASTER_PLAN §7)

## Explicitly out of scope (S5+)

SmartMapper (PDF/DOCX upload + mapping), document generation, workflows,
template library, CAPTCHA integration (honeypot only for now — CAPTCHA is an
env-gated option later).

## Acceptance

- Anonymous user fills a published form at `/f/[slug]` on mobile viewport;
  submission appears in the builder's data view within seconds
- Org at its submissions cap: intake still returns success to the filler, row
  stored as OVER_LIMIT, dashboard shows the quarantine count + upgrade nudge
- CSV and Excel exports download with correct columns and all non-quarantined
  rows; read-only orgs can still export (AllowReadOnly)
- Unpublishing a form 404s its public page immediately
- Full Phase 2 click-through checklist passes: signup → trial → build →
  publish → public fill → data view → export → metering visible

---

## Retrospective (2026-07-13)

### Delivered

All four tasks plus both backlog items (SB-014, SB-015). Phase 2 is closed.

1. **Submissions API** — `Submission` model + migration; public intake with
   honeypot (fake 201, nothing stored), per-IP throttle (5/s, 30/min),
   snapshot validation via `@attune-sb/form-engine/logic` (new React-free
   subpath export), conditional-visibility-aware required checks, unknown-key
   stripping; OVER_LIMIT quarantine with lazy release on headroom; CSV/XLSX
   export (exceljs, ADR-0002); 16 service specs.
2. **Public fill pages** — `/f/[slug]` SSR (`no-store` so unpublish 404s
   immediately), intake posts directly from the browser so the throttle sees
   real visitor IPs, plan-gated "Powered by" footer, deliberately vague 404.
3. **Data views** — schema-derived columns (capped at 4, detail expand shows
   all), pagination, quarantine banner + upgrade nudge, delete, CSV/Excel
   download buttons; submission counts now live on the forms list.
4. **SB-014/SB-015** — over-cap downgrade picker and export-all takeout card
   on `/billing` (export stays available read-only by design).

### What went well

- The `./logic` subpath export (with `typesVersions` for the API's classic
  node resolution) cleanly split form validation from React — the API never
  bundles DOM code.
- "Never lose customer data" fell out of the design naturally: intake meters
  and stores in one path; quarantine is just a status, so release is a bulk
  status flip with no re-metering.

### What bit us

- Killing the API dev server for `prisma generate` (Windows DLL lock) left no
  server running for the live drill — restart is part of the routine now.
- Auto-review blocked authenticated smoke tests (login with seed credentials
  - data export), so list/export endpoints are verified by unit tests + the
    manual checklist rather than a scripted drill.
- First commit subject exceeded commitlint's length cap; shortened.

### Deferred

- OVER_LIMIT end-to-end drill (needs 50 seeded rows) — manual checklist item.
- CAPTCHA option, scheduled exports, submission status workflow (IN_REVIEW /
  APPROVED / REJECTED are modeled but unused until workflows in P4).
