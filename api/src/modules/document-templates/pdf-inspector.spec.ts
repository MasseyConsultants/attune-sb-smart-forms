// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: PDF validation tests — the upload boundary must refuse anything
// that is not a clean, parseable, unencrypted PDF.

import { UnprocessableEntityException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

import { inspectPdf } from './pdf-inspector';

async function buildPdf(pages: Array<{ width: number; height: number }>): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (const page of pages) {
    doc.addPage([page.width, page.height]);
  }
  return Buffer.from(await doc.save());
}

describe('inspectPdf', () => {
  it('extracts page count and dimensions from a valid PDF', async () => {
    const buffer = await buildPdf([
      { width: 612, height: 792 }, // US Letter
      { width: 595, height: 842 }, // A4
    ]);

    const geometry = await inspectPdf(buffer);

    expect(geometry.pageCount).toBe(2);
    expect(geometry.pageDimensions[0]).toEqual({ width: 612, height: 792 });
    expect(geometry.pageDimensions[1]).toEqual({ width: 595, height: 842 });
  });

  it('rejects files without the PDF magic bytes', async () => {
    const notPdf = Buffer.from('<html>definitely not a pdf</html>');
    await expect(inspectPdf(notPdf)).rejects.toThrow(UnprocessableEntityException);
    await expect(inspectPdf(notPdf)).rejects.toThrow(/not a valid PDF/);
  });

  it('rejects corrupted files that carry the magic bytes but do not parse', async () => {
    const corrupted = Buffer.from('%PDF-1.7 garbage garbage garbage');
    await expect(inspectPdf(corrupted)).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects PDFs above the page ceiling', async () => {
    const buffer = await buildPdf(Array.from({ length: 101 }, () => ({ width: 612, height: 792 })));
    await expect(inspectPdf(buffer)).rejects.toThrow(/maximum is 100/);
  });
});
