# ADR 0004 — @xyflow/react for the workflow builder canvas

> Author: Robert Massey | Created: 2026-07-13 | Status: Accepted

## Context

Sprint 8 ships the visual workflow builder: customers assemble a node graph
(condition, email, fill_document, approval, webhook, …) and draw labeled edges
that the orchestrator's routing already understands (Yes/No, Approved/Rejected,
failure). Building a pannable/zoomable node-graph editor from scratch is a
multi-sprint project on its own.

## Decision

Adopt **`@xyflow/react` v12** (React Flow) — the same library the enterprise
edition's builder is built on (enterprise pins `^12.10.1`), so its patterns
(custom `nodeTypes` map, `useNodesState`/`useEdgesState`, edge labels for
branch routing) port directly.

SMB deviations from the enterprise builder:

- **One generic node component** for all types (icon + label + config summary
  from a `NODE_META` catalog) instead of ~20 near-identical components.
- **Click-to-add palette**, grouped by function, with plan-tier gating: node
  types above the org's `workflowNodeTier` render greyed with a lock and an
  upgrade link. The server-side publish gate remains the enforcement authority.
- **No Zustand store** for graph state — React Flow's own state hooks are
  sufficient for a single-canvas editor (matches enterprise).
- The builder bundle loads via `next/dynamic` (`ssr: false`) so React Flow
  stays out of the shared chunk.
- Approval email links land on `/approvals/[token]` which **pre-selects but
  never auto-submits** the decision — email scanners prefetch links, and a
  prefetch must not approve anything (deviation from enterprise, which
  auto-submits on `?decision=`).

## Consequences

- ~45 kB gzipped added to the workflows route only (dynamic import).
- MIT-licensed; the "React Flow" attribution watermark is disabled via
  `proOptions.hideAttribution` (permitted by the license).
- v12 API differs from the legacy `reactflow` v11 package — any enterprise
  snippets ported later must target the `@xyflow/react` import path.
