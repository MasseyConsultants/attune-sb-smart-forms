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
