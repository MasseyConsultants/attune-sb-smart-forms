# attune-sb-smart-forms — Sprint 5

> Author: Robert Massey | Created: 2026-07-13
> Phase: P3 SmartMapper (first half)

**Sprint 5 Goal:** A customer can upload their existing PDF (or DOCX) form,
see it rendered on a document canvas, and map their form's fields onto it
visually — the upload pipeline, template storage, page rendering, and manual
coordinate mapping land this sprint. (Auto-mapping and the fill runtime close
the phase in S6.)

## Tasks

1. **Document templates API module** (`api/src/modules/document-templates/`)
   - `DocumentTemplate` Prisma model (org-scoped, file metadata, page dims,
     `fieldMappings` JSON, status: UPLOADED → PROCESSING → READY / FAILED)
   - Upload endpoint: MIME + size validation per plan, blob storage layout
     (local disk driver first, S3-compatible interface), PDF sanitization
     before processing
   - DOCX → PDF conversion (mammoth + Puppeteer, ported from enterprise);
     pdf-lib page-dimension extraction
   - `uploadedTemplates` counted-resource gating (Trial 1 / Solo 3 / Growth
     15 / Business 50) via the existing entitlements layer
2. **Document canvas UI** (`web/src/components/document-canvas/`)
   - Ported from enterprise admin portal: page navigation, zoom, pdfjs render
   - Field-mapping overlay: drag a form field onto the page, position/resize
     the box, per-field font size + alignment
   - Mapping persistence (`fieldMappings` JSON per template + form pairing)
3. **Template management pages** (`web/src/app/(dashboard)/templates/`)
   - Templates list (status, page count, linked forms), upload flow with
     progress, delete (blob + row), LIMIT_EXCEEDED upgrade prompt at cap
4. **Tests**
   - Upload validation specs (MIME/size/plan cap), conversion pipeline specs
     with fixture files, canvas component tests

## Explicitly out of scope (S6)

Stage 1 auto-mapping (pdfjs text extraction + fuzzball), `fill_document`
runtime + document-fill metering, generated-document storage/download, the
10-minute onboarding flow polish.

## Acceptance

- Upload a real-world PDF → template READY with correct page count/dims
- Upload a DOCX → converted to PDF and rendered identically on the canvas
- Map 5 fields of a published form onto page 1, save, reload — mappings
  persist pixel-identically
- Trial org at 1 template: second upload returns `LIMIT_EXCEEDED` with the
  upgrade URL; template count shows on /billing usage
- Oversized/wrong-MIME uploads rejected before touching the pipeline

---

## Retrospective (2026-07-13)

**Delivered.** All four tasks. API: `DocumentTemplate` model + migration,
multipart upload through the API (deviation from enterprise — see below),
`pdf-inspector` (magic bytes, parse, encrypted rejection, 100-page ceiling),
mammoth+Puppeteer DOCX conversion, `BlobStorageService` local-disk driver with
an S3-shaped interface, `uploadedTemplates` gating live in entitlements, purge
sweep now deletes template blobs + all S3+ rows (a gap since S3 — forms and
submissions weren't in `softDeleteOrgData`/`hardDeleteOrg` either). Web: full
document-canvas port (page viewer, field tags, sidebar, alignment guides)
with a zoom control the enterprise never had, `/templates` management page,
`/templates/[id]` mapping studio, 5 BFF routes. Mapping types moved into
`@attune-sb/shared-types` instead of enterprise's API/admin duplication.

**Deviation from enterprise, on purpose.** Enterprise uploads via presigned
Azure PUTs; we flow multipart through the API. Local disk has no presign, and
plan-gated validation (size, MIME, cap) wants the bytes in hand before
anything is stored anyway. The storage interface is S3-shaped so a presigned
flow can return when an S3/R2 driver lands (backlogged as part of SB-005
deploy work).

**What bit us.**

- Puppeteer 25 is ESM-only: Jest can't parse it (mock `docx-converter` at the
  spec boundary) and `setContent` no longer accepts `networkidle0` — inline
  HTML needs only `'load'`. CJS `require('puppeteer')` still works at runtime.
- pdf-lib defers some parse failures from `load()` to `getPages()` — the
  inspector wraps both in the same try/catch or corrupted files leak a 500.
- The Windows Prisma DLL lock struck again on `prisma generate` (dev server
  holds the query engine). Same ritual: kill API dev server, migrate, restart.

**Carried to S6.** Stage 1 auto-mapping (pdfjs extract + fuzzball), the
`fill_document` runtime with DOC_FILLS metering, generated-document storage +
download, DOCX live-upload manual verification, STORAGE_BYTES metering on
upload (meter exists, currently always 0 — decide whether SUM(sizeBytes) at
read or counter writes on upload/delete).
