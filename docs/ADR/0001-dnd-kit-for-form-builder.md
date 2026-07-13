# ADR 0001 — dnd-kit for the form builder drag-and-drop

> Author: Robert Massey | Date: 2026-07-13 | Status: Accepted

## Context

Sprint 3's form builder studio needs drag-and-drop for the field palette →
canvas flow and for reordering fields on the canvas. MASTER_PLAN §7 (S3)
names Zustand + dnd-kit as the intended stack.

## Decision

Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` to `web`.

## Rationale

- Actively maintained, headless (no styling opinions — fits our token-based
  theme system), tree-shakeable, and accessible (keyboard sensors built in).
- `react-beautiful-dnd` is deprecated/archived; HTML5 native DnD has poor
  keyboard/touch support and fights React reconciliation.
- Already the de-facto standard for React 18/19 sortable UIs; no transitive
  runtime dependencies beyond React.

## Consequences

- The builder bundle grows ~35 kB gzipped — acceptable because the builder is
  loaded via `next/dynamic` and never ships to public form fill pages.
