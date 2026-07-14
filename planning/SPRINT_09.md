# attune-sb-smart-forms — Sprint 9

> Author: Robert Massey | Created: 2026-07-13
> Phase: P5 Library + Polish

**Sprint 9 Goal:** New signups never start from a blank page — a public,
categorized template gallery with 25+ curated templates and a one-click
clone flow — plus the polish layer: in-app notifications, the branding
removal gate audited end to end, and the platform admin console (SB-016)
so we can support customers.

## Tasks

1. **Library shared types** (`packages/shared-types`)
   - `LibraryTemplateCategory` union (inspections, intake, HR, field
     service, events, feedback, orders, legal), `LibraryTemplateSummary` /
     `LibraryTemplateDetail`, clone request/response contracts
2. **LibraryTemplate model + API** (`api/src/modules/library/`)
   - Prisma model: name, slug, category, description, form schema JSON,
     optional workflow graph JSON, scope (`PUBLIC` curated | `ORG`
     customer-published), install count
   - `@Public()` browse + detail endpoints (gallery is an SEO surface);
     org-scoped list merges PUBLIC + own-org templates
   - `POST /library/:id/clone` — creates a DRAFT form (+ DRAFT workflow if
     the template carries one) in the caller's org; slug regenerated;
     respects activeForms semantics (drafts are free, publish is the gate)
   - `POST /library/publish` — save an own form (+ optional workflow) as an
     ORG-scope template; gated by the `publishOrgTemplates` feature (402
     upgrade path on Free/Solo)
3. **Curated seed content** — 25+ templates across the categories, written
   as data (`api/prisma/library-seed-data.ts`), loaded by the seed script
   idempotently; each uses real field variety (conditionals, multi-page
   where it makes sense)
4. **Gallery UI** (`web/src/app/`)
   - Public `/gallery` + `/gallery/[slug]` (SSR, no auth): category filter,
     search, template detail with field preview, brand treatment
   - In-app `/templates/gallery` view with the same browse surface plus
     "Use this template" clone action → lands in the form builder
   - "Save as template" action for Growth+ orgs (feature-gated button)
5. **In-app notifications** (`api/src/modules/notifications/`, web bell)
   - `Notification` model (org + user scope, type, title, body, link,
     readAt); service + list/mark-read endpoints
   - Emitters: usage soft-warning (80% latch), approval decided, workflow
     run failed, trial reminders
   - Web: bell in the dashboard header with unread count, dropdown list,
     mark-all-read
6. **Branding removal gate audit** — verify `removeBranding` gates the
   "Powered by" footer on public fill pages, thank-you screens, workflow
   emails, and the email brand shell consistently; add the missing
   surfaces + tests
7. **Platform admin console (SB-016)** (`api/src/modules/admin/`,
   `web/src/app/(admin)/`)
   - PLATFORM_ADMIN-only guard; org list w/ plan, lifecycle state, usage
     summary; org detail w/ subscription, meters, members
   - Support actions: legal-hold toggle, lifecycle restore, entitlement
     override CRUD (the existing service, surfaced)
   - Kept read-mostly: no impersonation at v1 (backlog if needed)
8. **Tests** — library CRUD/clone/publish-gate specs, seed-data validation
   (every template passes form-schema + graph validation), notifications
   specs, admin guard + endpoint specs; web tests for gallery cards,
   clone flow, bell

## Explicitly out of scope

Private org library UI beyond scope filtering (Business nuance — v1.1),
template versioning/updates propagation, admin impersonation, marketing
site content beyond the gallery, AI template generation.

## Acceptance

- Logged-out visitor browses `/gallery`, opens a template, is routed to
  signup; logged-in org clicks "Use this template" → draft form appears in
  the builder ready to publish
- 25+ curated templates seeded; every one clones cleanly and passes
  validation
- Free-tier org hitting "Save as template" gets the 402 upgrade prompt;
  Growth org publishes an org template its members can see and clone
- Notification bell shows an unread usage warning after crossing 80% of a
  meter; mark-read persists
- Public form + workflow email rendered for a `removeBranding` org carries
  no "Powered by" footer; trial org still does
- PLATFORM_ADMIN sees the admin console; OWNER of a customer org gets 403
- All quality gates green

## Retrospective (closed 2026-07-13)

**All tasks delivered.** P5 Library + Polish is complete.

### Delivered

- **Template library** — `LibraryTemplate` model (PUBLIC curated / ORG
  customer-published scopes), `@Public()` browse + detail-by-slug,
  `POST /library/:id/clone` materializing the schema (and any bundled
  workflow graph) as DRAFTs in the caller's org, install counting, and
  `POST /library/publish` behind the `publishOrgTemplates` feature gate
  (402 with upgrade URL on trial/Free/Solo). 27 curated templates seeded
  across all 8 categories; 3 bundle workflows (Time Off approval, CSAT
  low-score alert, Quote Request notify).
- **Gallery UI** — public SSR `/gallery` + `/gallery/[slug]` (SEO surface,
  signup CTAs), in-app `/library` with category pills, search, org-template
  section, one-click clone routing into the builder, "Save a form as
  template" dialog surfacing the 402 as an UpgradeCta.
- **In-app notifications** — `Notification` model + feed API (list,
  mark-read, mark-all with piggybacked pruning), fire-and-forget `emit()`
  that never fails the producing action, four emitters (usage 80% latch,
  approval decided, workflow run failed, trial reminders), topbar bell with
  unread badge and dropdown feed polling every 30s.
- **Branding audit** — the form thank-you screen was dropping the
  "Powered by" footer (renderer returned early before the footer node);
  fixed with a regression test. Email shell + public fill page verified
  correctly gated by `removeBranding`.
- **Admin console (SB-016)** — PLATFORM_ADMIN-only API + `/admin` UI:
  org list (search, lifecycle filter, plan/state/member/form columns),
  org detail (subscription, live usage meters, members, all-time counts),
  legal-hold toggle, lifecycle restore, entitlement override CRUD (reason
  required — every override is an audited support action). Admin nav item
  renders only for the platform role; the API guard enforces independently.

### Learned

- `forbidNonWhitelisted` rejects DTO properties that carry no
  class-validator decorator at all — the heterogeneous `value` field on
  CreateOverrideDto needed an explicit `@IsDefined()`.
- Validating seed data with the real publish validator (per-template
  `describe.each`) caught nothing today but makes gallery regressions a
  compile-time-adjacent failure instead of a customer-facing broken clone.

### Carry-over

None. P6 Launch Hardening (S10) is next: coverage push to targets,
semantic-release + CHANGELOG, production Docker/nginx, backup/restore
drill, load smoke, security pass.
