// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: DOCX → PDF conversion, ported from enterprise: mammoth extracts
// the document as HTML, Puppeteer prints it to an A4 PDF. Text-faithful, not
// layout-faithful — complex layouts may need re-mapping (documented in UI).

import { UnprocessableEntityException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as puppeteer from 'puppeteer';

const PRINT_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 6px 10px; }
  img { max-width: 100%; }
`;

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  let html: string;
  try {
    ({ value: html } = await mammoth.convertToHtml({ buffer: docxBuffer }));
  } catch {
    throw new UnprocessableEntityException(
      'DOCX could not be read — the file may be corrupted or not a real .docx',
    );
  }

  const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>${PRINT_STYLES}</style></head><body>${html}</body></html>`;

  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    // Inline HTML with no external resources — 'load' is sufficient (and
    // puppeteer 25's setContent no longer accepts networkidle waits).
    await page.setContent(wrappedHtml, { waitUntil: 'load', timeout: 15_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
