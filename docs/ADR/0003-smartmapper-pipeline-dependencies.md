# ADR 0003 — SmartMapper pipeline dependencies (pdf-lib, mammoth, puppeteer, pdfjs-dist)

> Author: Robert Massey | Created: 2026-07-13 | Status: Accepted

## Context

Sprint 5 ports the enterprise SmartMapper upload pipeline: customers upload
their existing PDF/DOCX forms, the API extracts page geometry, and the web
canvas renders pages for visual field mapping.

## Decision

Adopt the exact stack the enterprise edition has proven in production:

| Package      | Where | Use                                                    |
| ------------ | ----- | ------------------------------------------------------ |
| `pdf-lib`    | API   | Parse PDFs, page count + dimensions; later: fill/stamp |
| `mammoth`    | API   | DOCX → HTML (conversion step 1)                        |
| `puppeteer`  | API   | HTML → PDF via headless Chrome (conversion step 2)     |
| `pdfjs-dist` | Web   | Render PDF pages to canvas in the mapping UI           |

Storage v1 is a **local-disk `BlobStorageService`** with an S3-shaped method
surface (upload/download/delete/exists/deletePrefix) — S3/R2 can drop in
without touching callers. Uploads flow **multipart through the API** (multer,
memory storage) instead of enterprise's Azure presigned PUTs: local disk has
no presign, and plan-gated validation wants the bytes in hand anyway.

## Consequences

- Puppeteer ships a bundled Chromium (~170 MB) — acceptable for a single
  deployment mode; revisit if image size matters (chrome-aws-lambda etc.).
- DOCX conversion is text-faithful, not layout-faithful; complex layouts may
  need re-mapping. Same trade-off as enterprise, documented in the UI.
- pdfjs worker asset must be served from `web/public/pdf.worker.min.mjs`.
- Local-disk storage means blobs live on the API host (`STORAGE_LOCAL_DIR`);
  multi-instance deploys require the S3 driver first (backlogged).
