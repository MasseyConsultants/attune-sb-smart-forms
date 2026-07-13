# attune-sb-smart-forms — Sprint 6

> Author: Robert Massey | Created: 2026-07-13
> Phase: P3 SmartMapper (second half — closes the phase)

**Sprint 6 Goal:** The SmartMapper moat is complete end-to-end — auto-mapping
suggests field positions on an uploaded document, and a public form submission
fills the customer's exact PDF, metered as a document fill and downloadable
from the submission view.

## Tasks

1. **Stage 1 auto-mapping** (`api/src/modules/document-templates/auto-mapper/`)
   - Port enterprise extract.ts (pdfjs-dist text + bbox extraction, pinned v3
     CJS build for Node) and fuzzy-match.ts (fuzzball label scoring,
     auto-accept ≥88 / review 70–87 thresholds)
   - `POST /document-templates/:id/suggest-mappings` endpoint; scanned-PDF
     detection returns a clear "manual mapping only" response (no OCR at v1)
   - Canvas: candidate overlays (accept/reject per box + bulk), ported
     candidate-tag + candidates panel
2. **Document fill runtime** (`api/src/modules/document-fills/`)
   - Port enterprise fill-document-step.adapter pdf-lib stamping (value /
     checkmark / highlight render modes, answer-option activation)
   - On submission to a form with a mapped template: generate the filled PDF,
     store under `document-fills/{orgId}/`, `DOC_FILLS` metering (assert
     before, consume after, quarantine-consistent with submissions)
   - Download endpoint + link on the submission detail row
3. **Storage metering** — STORAGE_BYTES from live blob sizes (templates +
   generated fills); surfaces on /billing usage
4. **Tests** — fuzzy-match fixtures (real-world label variants), fill-runtime
   specs (each render mode, multi-page), DOC_FILLS plan-cap matrix
5. **Phase 3 close** — manual checklist: upload → auto-map → review → publish
   → public submission → download the filled PDF

## Explicitly out of scope

AI vision mapping (Stage 2 — enterprise `ai_assisted` mode), Azure DI OCR for
scanned PDFs, workflow-triggered fills (P4 wires `fill_document` as a node).

## Acceptance

- Auto-map a text-based PDF: ≥70% of matching-label fields suggested, each
  accepted candidate lands pixel-identical to its suggestion
- Submit a published form with a mapped template → filled PDF stored +
  downloadable; DOC_FILLS incremented; at cap → fill skipped, submission kept,
  banner explains (data never dropped)
- Checkmark/highlight/value render modes verified against a fixture PDF
- STORAGE_BYTES on /billing reflects real blob usage
