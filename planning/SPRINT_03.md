# attune-sb-smart-forms — Sprint 3

> Author: Robert Massey | Created: 2026-07-13
> Phase: P2 Form Builder (first half; S4 completes the phase)

**Sprint 3 Goal:** The flagship form builder exists — the ported
`@attune-sb/form-engine` renders all 30 field types, the forms API enforces
the publish/version state machine with form-count gating, and a builder can
drag, configure, preview, and publish a form end-to-end.

## Tasks

1. **Port `@attune-sb/form-engine`** (from enterprise `@attune/form-engine`)
   - All 30 field types, conditional logic evaluator, multi-page navigation,
     validate-form.ts — port nearly verbatim per MASTER_PLAN §6
   - Fix the known shared-types drift at port time (add
     `fill_document`/`send_document` to WorkflowNodeType)
   - Web renderer only (no native targets); package builds to `dist/` like
     shared-types
   - Engine unit tests ported/adapted alongside
2. **Forms API module** (`api/src/modules/forms/`)
   - CRUD: create/list/get/update/archive (soft delete), org-scoped at the
     service layer
   - Publish/version FSM: `DRAFT → PUBLISHED → UNPUBLISHED`, immutable
     published versions (`FormVersion` rows), republish bumps version
   - Form schema stored as JSON (form-engine `FormSchema` contract)
   - Publishing gated by `activeForms` counted resource — publish at cap
     returns `LIMIT_EXCEEDED` with upgrade URL; unpublish always allowed
   - Public slug allocation (unique, regenerable) for S4's `/f/[slug]`
   - `ReadOnlyGuard` covers mutations automatically; verify with tests
3. **Form builder studio UI** (`web/src/app/(dashboard)/forms/`)
   - Forms list page (name, status, version, submission count placeholder)
   - Builder: Zustand store + dnd-kit palette/canvas/inspector, live preview
     via form-engine renderer, autosave drafts, publish action with the
     LIMIT_EXCEEDED upgrade flow wired to UpgradeCta
   - Dynamic import for the builder bundle (heavy) per architecture rules
   - Enable the "Forms" nav item in the dashboard shell
4. **Tests**
   - Engine: field rendering + conditional logic + validation suites
   - API: FSM transitions, form-count gating at every plan boundary,
     tenant isolation, read-only mode
   - Web: forms list + builder store unit tests (drag ordering, field config)

## Explicitly out of scope (S4)

Public form fill pages (`/f/[slug]`), submission intake + OVER_LIMIT
quarantine, data views, CSV/Excel export, submission metering UI, downgrade
form-picker UX (SB-014), export-all (SB-015).

## Acceptance

- A trial org can create a form in the builder, add fields of every category,
  set a conditional rule, preview it live, and publish it
- Publishing a 3rd form on trial (cap 2) returns `LIMIT_EXCEEDED` and the UI
  shows the upgrade prompt; unpublishing then publishing another form works
- Published versions are immutable — editing creates a new draft version;
  republish bumps the version number
- A read-only org cannot create/edit/publish forms but can view them
- Cross-org form access denied and logged as a security event
- Engine + forms API + builder store tests green in CI
