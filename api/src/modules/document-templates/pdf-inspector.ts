// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: PDF validation + geometry extraction. Uploads are a hostile
// boundary (.cursorrules: uploaded PDFs are scanned/sanitized before
// processing): we check magic bytes, force a full pdf-lib parse, and reject
// encrypted documents before anything downstream touches the file.

import type { PageDimension } from '@attune-sb/shared-types';
import { UnprocessableEntityException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

export interface PdfGeometry {
  readonly pageCount: number;
  readonly pageDimensions: PageDimension[];
}

const PDF_MAGIC = '%PDF-';
const MAX_PAGES = 100;

/**
 * Parses and validates a PDF buffer, returning page geometry.
 * Throws 422 with a human-readable reason for anything we refuse.
 */
export async function inspectPdf(buffer: Buffer): Promise<PdfGeometry> {
  if (buffer.subarray(0, PDF_MAGIC.length).toString('latin1') !== PDF_MAGIC) {
    throw new UnprocessableEntityException('File is not a valid PDF');
  }

  // pdf-lib is lenient at load() and can defer parse failures until page
  // traversal — keep BOTH inside the guard so corruption maps to a clean 422.
  let doc: PDFDocument;
  let pages: ReturnType<PDFDocument['getPages']>;
  try {
    doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    pages = doc.getPages();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('encrypted')) {
      throw new UnprocessableEntityException(
        'Password-protected PDFs are not supported — remove the password and re-upload',
      );
    }
    throw new UnprocessableEntityException('PDF could not be parsed — the file may be corrupted');
  }

  if (doc.isEncrypted) {
    throw new UnprocessableEntityException(
      'Password-protected PDFs are not supported — remove the password and re-upload',
    );
  }
  if (pages.length === 0) {
    throw new UnprocessableEntityException('PDF has no pages');
  }
  if (pages.length > MAX_PAGES) {
    throw new UnprocessableEntityException(
      `PDF has ${pages.length} pages — the maximum is ${MAX_PAGES}`,
    );
  }

  return {
    pageCount: pages.length,
    pageDimensions: pages.map((p) => ({ width: p.getWidth(), height: p.getHeight() })),
  };
}
