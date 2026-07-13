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
