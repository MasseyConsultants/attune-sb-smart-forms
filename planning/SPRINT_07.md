# attune-sb-smart-forms — Sprint 7

> Author: Robert Massey | Created: 2026-07-13
> Phase: P4 Workflow Builder (first half)

**Sprint 7 Goal:** The workflow engine runs — a published workflow triggered by
a form submission executes a node graph through the ported orchestrator on
BullMQ, with core adapters (email, pdf_generate, fill_document, send_document,
condition, notify) working and every run metered against WORKFLOW_RUNS.

## Tasks

1. **Workflows API module** (`api/src/modules/workflows/`)
   - `Workflow` + `WorkflowVersion` + `WorkflowRun` + `WorkflowRunStep` Prisma
     models (JSON graph column, DRAFT→PUBLISHED FSM mirroring forms, immutable
     published snapshots, version pinning on runs)
   - CRUD + publish/unpublish endpoints; graph validation on publish (single
     start node, reachable end, no orphan edges, node configs schema-checked)
   - Plan gating: node catalog by tier from `PLAN_ENTITLEMENTS`
     (`workflowNodes: 'core' | 'growth' | 'all'`) — publish rejects graphs
     containing nodes above the org's tier
2. **Orchestrator + step adapters** (`api/src/modules/workflows/engine/`)
   - Port enterprise `WorkflowOrchestrator` + step-adapter registry; execution
     on a BullMQ queue (never inline in the intake request)
   - Core adapters this sprint: `start`, `end`, `form` (trigger context),
     `condition` (form-engine logic evaluation), `email` (brand shell,
     EMAILS meter), `pdf_generate`, `fill_document` (reuse
     DocumentFillsService), `send_document`, `notify`
   - Run ledger: WorkflowRunStep per node with status/input/output/error;
     failures mark the run FAILED but never affect the stored submission
3. **Trigger wiring** — on accepted public submission, enqueue runs for
   published workflows bound to that form; WORKFLOW_RUNS assert-before /
   consume-after (at cap: run skipped + recorded as SKIPPED_LIMIT, submission
   untouched — same never-drop-data rule as fills)
4. **Fix shared-types drift** — add `fill_document` / `send_document` to
   `WorkflowNodeType` (MASTER_PLAN §6 carry-over note)
5. **Tests** — orchestrator walk (linear, branch, failure mid-graph), each
   adapter spec, WORKFLOW_RUNS + EMAILS cap matrix, publish validation specs

## Explicitly out of scope (S8)

React Flow builder UI, approval nodes + ApprovalToken public links, webhook/api
nodes (SSRF protection), switch/data_transform/export, Business-tier nodes
(delay, sub_workflow, excel_generate, loop), runs list UI.

## Acceptance

- Publish a workflow (submission → fill_document → email) via API; a public
  submission triggers it: filled PDF generated, email logged through the brand
  shell, WORKFLOW_RUNS and EMAILS both incremented
- Run at WORKFLOW_RUNS cap → run recorded SKIPPED_LIMIT, submission stored
- A node failure mid-run marks the run FAILED with the failing step's error
  captured; earlier step outputs retained
- Publishing a graph with a Growth-tier node on a trial/Free org returns
  `LIMIT_EXCEEDED`-style 402 with upgrade URL
- All quality gates green (lint, typecheck, tests)

---

## Retrospective (closed 2026-07-13)

### Delivered

All five tasks shipped; the engine half of P4 is done.

1. **Workflows API module** — `Workflow`/`WorkflowVersion`/`WorkflowRun`/
   `WorkflowRunStep` models (migration `workflows_engine`), CRUD + publish FSM
   mirroring forms (immutable version snapshots, runs pin to a version,
   unpublish bumps the draft version). Publish validation ported from the
   enterprise validation service (one start, ≥1 end, edges reference real
   nodes, BFS reachability) plus two rules enterprise lacks: duplicate-node-id
   and unknown-node-type checks. `triggerFormId` on the workflow row is the
   authoritative submission binding.
2. **Plan-tier node gate** — `nodesAboveTier()` against
   `PLAN_ENTITLEMENTS.features.workflowNodeTier`; publish with an
   above-tier node returns the standard 402 `LIMIT_EXCEEDED` envelope with
   the offending node types in `details.entitlement` and an upgrade URL.
3. **Orchestrator + adapters** (`engine/`) — enterprise stepping loop ported
   (explicit-target → failure-edge → branch-label → default-edge routing,
   100-step cycle ceiling, replay-idempotent on PENDING status). S7 adapters:
   `condition`, `email`, `pdf_generate`, `fill_document`, `send_document`,
   `notify`; start/form/end handled inline. Adapterless tier-gated types
   (approval etc.) record a SKIPPED ledger row and advance. Every node writes
   a `WorkflowRunStep` (status/output/error/durationMs).
4. **Trigger + metering** — intake calls `WorkflowTriggerService` after the
   fill hook, never-throw both ways. WORKFLOW_RUNS asserted before enqueue; at
   cap the run is stored as `SKIPPED_LIMIT` (visible, never dropped). EMAILS
   metered per send with `wfemail:{runId}:{nodeId}` idempotency; email/doc
   caps SKIP the step and the run continues — a cap on one action never kills
   the rest of the run.
5. **Tests** — 296 API tests (was 225): validation + tier gate, interpolation,
   orchestrator walks (linear, explicit + label branching, failure edge vs
   FAILED, throw capture, cycle ceiling, replay no-op), per-adapter specs
   (cap-skip matrix, idempotency keys, intake-fill reuse), trigger specs,
   publish FSM specs. E2E smoke (`scripts/smoke-sprint7.ps1`): publish
   fill→send→notify workflow, tier-gate 402 verified live, public submission
   → run COMPLETED in ~230ms with a 5-step ledger, WORKFLOW_RUNS 0→1,
   EMAILS 0→1.

### Deviations (deliberate, from enterprise parity)

- `pdf_generate` renders a branded label/value summary via pdf-lib instead of
  Puppeteer HTML→PDF — no headless browser on the run hot path; revisit if
  template-styled PDFs become a selling point.
- `notify` emails the org owner (no in-app notification center at v1) and is
  deliberately NOT metered against EMAILS — self-notifications shouldn't burn
  the outbound allowance.
- `fill_document` reuses the intake fill when one exists (same submission,
  no second DOC_FILLS charge); renders fresh into `workflow-artifacts/` only
  when intake didn't fill.
- Run history is a real `WorkflowRunStep` ledger table, not the enterprise
  audit-log-with-hashes — simpler to query for the S8 runs UI.
- `form`/`start` nodes are pass-throughs (the trigger submission already
  carries the data); mid-run form pauses arrive with approvals in S8.

### Carried forward

- Workflow artifacts (`workflow-artifacts/` blobs) are purged with the org but
  not yet counted in the STORAGE_BYTES live sum — S8 alongside the runs UI.
- Condition node config UI + form-engine operator parity — S8 builder.
- WORKFLOW_RUNS at-cap notification email (soft-warn latch covers 80%).
