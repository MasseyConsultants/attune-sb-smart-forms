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

---

## Retrospective (closed 2026-07-13)

### Delivered

All five tasks shipped; Phase 3 (SmartMapper) is complete.

1. **Stage 1 auto-mapping** — `auto-mapper/` module: `extract.ts` (pdfjs-dist
   legacy CJS build, top-origin bbox conversion, line grouping/merging),
   `fuzzy-match.ts` (fuzzball token_set_ratio, abbreviation table, auto-accept
   ≥88 / review 70–87), `GroupValidatorService` (geometric yes/no/na checkbox
   validation), `AutoMapperService` orchestrator +
   `POST /document-templates/:id/suggest-mappings`. Scanned-PDF heuristic
   (<10 text items/page) returns `scannedPdf: true` → UI shows a
   "manual mapping only" notice. Canvas grew candidate overlays
   (`CandidateTag`) and a review sidebar (`DocumentCandidatesPanel`) with
   per-candidate and bulk accept/reject.
2. **Document fill runtime** — `document-fills/` module: `pdf-filler.ts` pure
   stamping function (value / checkmark / highlight render modes, signature
   strokes, WinAnsi sanitization, answer-option activation),
   `DocumentFillsService` hooked into submission intake (never blocks intake;
   at DOC_FILLS cap the fill is skipped and the submission is kept),
   `GET /submissions/:id/document` download + PDF button on the data view.
3. **Storage metering** — `STORAGE_BYTES` is now a live aggregate of template
   `sizeBytes` + submission `filledDocumentBytes` (deletes reclaim space with
   no reconciliation job); upload asserts headroom before accepting the file.
4. **Tests** — 225 API / 61 web / 42 form-engine, all green. New suites:
   fuzzy-match fixtures (label variants, dedupe downgrade), group-validator
   geometry, pdf-filler render modes (verified by re-parsing output PDFs),
   document-fills service (cap skip, swallow-never-throw), extract
   integration against generated PDFs, candidate-tag + candidates-panel.
5. **E2E smoke** (`scripts/smoke-sprint6.ps1`) — login → create form → upload
   fixture PDF → auto-map (10/10 fields auto-accepted, 100% coverage) → save
   mappings → publish → public submission → filled PDF downloaded with all
   values stamped on the correct labels → DOC_FILLS 1/10, STORAGE_BYTES 3,166
   bytes live.

### Deviations & fixes

- Enterprise `normalizeLabel` stripped punctuation before parenthetical
  qualifiers, so "(sufficient depth)" was never removed — fixed here
  (parens stripped first) with a regression test.
- `pdfjs-dist` optional `canvas` dep broke jsdom web tests on install —
  excluded via pnpm override (`"canvas": "-"`); nothing renders server-side.
- Windows Prisma DLL lock still requires stopping the API dev server before
  `prisma migrate dev` (known from S5).

### Carried forward

- AI vision mapping (Stage 2) + OCR for scanned PDFs — backlog (v1.5 upsell).
- Workflow-triggered fills — S7 wires `fill_document` as a workflow node.
- DOCX upload manual verification — rolled into the Phase 4 checklist.
