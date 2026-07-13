# attune-sb-smart-forms — Sprint 8

> Author: Robert Massey | Created: 2026-07-13
> Phase: P4 Workflow Builder (second half)

**Sprint 8 Goal:** Customers can build workflows without touching the API — a
visual React Flow builder with the plan-gated node palette, node config
panels, a runs list with the step ledger, plus the Growth-tier adapters
(approval with public links, webhook/api with SSRF protection, switch,
data_transform, export).

## Tasks

1. **Workflow builder UI** (`web/src/app/(dashboard)/workflows/`)
   - Workflows list page (status, trigger form, run count, publish toggle)
   - `/workflows/[id]` React Flow canvas: node palette grouped by tier
     (above-tier nodes greyed with upgrade CTA), drag to add, edge drawing
     with labels (Yes/No/failure), node config side panel per type
   - Publish flow surfacing graph-validation errors and the 402 tier gate
     inline; dynamic import (builder bundle stays out of the base chunk)
   - ADR for the react-flow dependency
2. **Runs view** — `/workflows/[id]/runs`: run list (status incl.
   SKIPPED_LIMIT with upgrade CTA, trigger submission link) + step ledger
   detail (status, duration, error, output preview)
3. **Growth-tier adapters** (`engine/adapters/`)
   - `approval` — pauses the run (orchestrator pause/resume ported),
     ApprovalToken public accept/reject links through the brand email shell
   - `webhook`/`api` — HTTP step with SSRF protection (deny private ranges,
     scheme allowlist, response size/time caps), secrets via EncryptionService
   - `switch` (multi-branch), `data_transform` (rename/map state keys),
     `export` (CSV of the trigger submission to email)
4. **Storage metering completion** — count `workflow-artifacts/` blobs in the
   STORAGE_BYTES live sum (S7 carry-over)
5. **Tests** — approval pause/resume + token flows, SSRF matrix, switch/
   transform/export specs, builder store + palette gating web tests

## Explicitly out of scope

Business-tier nodes (delay, sub_workflow, excel_generate, loop) — v1.1;
AI nodes — post-launch; workflow templates in the public library — P5.

## Acceptance

- Build submission → condition → (approve path) → fill_document →
  send_document entirely in the browser; publish; live run pauses at
  approval; the emailed public link approves it and the run completes
- Trial org sees Growth nodes greyed out; dragging one in and publishing
  surfaces the upgrade prompt (402 path already live from S7)
- Webhook step refuses `http://169.254.169.254` and private-range targets
- Runs list shows COMPLETED/FAILED/SKIPPED_LIMIT with the step ledger
- All quality gates green

---

## Retrospective (closed 2026-07-13)

**All tasks delivered.** P4 Workflow Builder is complete.

### Delivered

- **Builder UI** — workflows list (status, trigger form, run count, delete),
  `/workflows/[id]` React Flow canvas (`@xyflow/react` v12, ADR-0004):
  click-to-add palette grouped Flow/Documents/Messaging/People & systems,
  Growth nodes locked with an upgrade CTA on core-tier orgs, generic
  `WorkflowNode` card with per-type config summary, edge labels
  (Yes/No/Approved/Rejected/failure), per-type config side panel with
  `{{token}}` field hints from the trigger form schema, publish surfacing
  graph-validation errors and the 402 tier gate inline. Builder bundle
  dynamic-imported (`ssr: false`) — stays out of the shared chunk.
- **Runs view** — `/workflows/[id]/runs`: auto-refreshing run list
  (COMPLETED/FAILED/PAUSED/SKIPPED_LIMIT with upgrade CTA) + expandable
  step ledger (status, duration, error, output preview).
- **Approval flow** — `approval` adapter pauses the run (orchestrator
  pause/resume, `PAUSED` status, branchHint routing), one-shot
  `ApprovalToken` (SHA-256 stored, raw token emailed), branded
  approve/reject links, public `/approvals/[token]` landing page +
  throttled `@Public()` endpoints; single-use + expiry enforced (410 Gone).
- **HTTP steps** — `webhook`/`api` adapter with ported SSRF guard
  (scheme allowlist, blocked hostnames, private/reserved IPv4+IPv6 ranges,
  DNS resolution check, `redirect: 'error'`), 15s timeout, 256 KB response
  cap.
- **Remaining Growth adapters** — `switch` (multi-branch via condition
  adapter), `data_transform` (dot-path mappings + scalar transforms),
  `export` (CSV of trigger submission emailed as attachment, EMAILS
  metered).
- **Storage metering** — `artifactBytes` on WorkflowRun; pdf_generate +
  fill_document artifacts now counted in the STORAGE_BYTES live sum
  (S7 carry-over closed).

### Verification

- 368 API tests / 26 suites; 68 web tests / 13 suites; 42 form-engine
  tests — all green; lint + typecheck clean.
- Live E2E smoke (`scripts/smoke-sprint8.ps1`): publish approval workflow
  blocked 402 on trial → growth override → published → public submission →
  run PAUSED at approval → public token approved → run COMPLETED down the
  Approved branch (notify step in ledger); token reuse → 410; webhook to
  `169.254.169.254` refused by SSRF guard, run completed via failure edge.
- Browser click-through: workflows list, builder canvas (palette tier
  gating verified on trial org — 6 Growth nodes locked), node config panel,
  runs view with expanded step ledger.

### Deviations

- Palette is click-to-add (not drag) — simpler and keyboard-accessible;
  drag can layer on later without API changes.
- Approval email links preselect the decision via `?decision=` but never
  auto-submit — a GET must not mutate (mail scanners prefetch links).
- Webhook secrets via EncryptionService deferred (SB backlog) — v1 headers
  are interpolated from run state; no stored-credential path yet.

### Found & fixed along the way

- `web/public/attune-logo-sidebar.svg` contained two raw `0x14` control
  bytes (mangled em-dashes) making the XML unparseable — sidebar logo
  rendered as broken alt text on every dashboard page. Replaced with
  hyphens.
- Email stub now surfaces `href` links from HTML bodies so approval/invite
  links are clickable in local dev logs.
