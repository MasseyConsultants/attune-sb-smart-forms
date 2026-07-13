# ADR 0002 — exceljs for submission exports

> Author: Robert Massey | Date: 2026-07-13 | Status: Accepted

## Context

Sprint 4 delivers submission data views with CSV and Excel export. CSV is
hand-rolled (trivial, no dependency), but .xlsx generation needs a library.

## Decision

Add `exceljs` to `api` and generate workbooks server-side in the export
endpoint (streamed as a buffer, `Content-Disposition: attachment`).

## Rationale

- Actively maintained, no native bindings (pure JS — works in our Alpine
  Docker images without build toolchains).
- Streaming writer keeps memory flat for large exports.
- Alternatives: `xlsx` (SheetJS) community edition has licensing ambiguity and
  a slow release cadence; `node-xlsx` is a thin wrapper over it.

## Consequences

- ~1 MB added to the API bundle; irrelevant server-side.
- Export stays in the API (not the web tier) so the same endpoint later powers
  the S4 export-all and scheduled-export backlog items.
