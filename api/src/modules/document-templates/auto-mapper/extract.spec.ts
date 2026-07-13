// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / Tests
// Integration test for the pdfjs extraction stage — fixtures are generated
// with pdf-lib so the pdfjs v3 CJS build is exercised against real PDF bytes.

import { PDFDocument, StandardFonts } from 'pdf-lib';

import { extractLabels, isCheckboxItem } from './extract';

const LABELS = [
  'Full Name:',
  'Email Address:',
  'Phone Number:',
  'Date of Birth:',
  'Street Address:',
  'City:',
  'State:',
  'Zip Code:',
  'Employer:',
  'Job Title:',
  'Start Date:',
  'Supervisor Name:',
];

async function makeLabeledPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  LABELS.forEach((label, i) => {
    page.drawText(label, { x: 72, y: 720 - i * 28, size: 11, font });
  });
  return Buffer.from(await doc.save());
}

describe('extractLabels', () => {
  it('extracts labels with top-origin coordinates from generated PDF bytes', async () => {
    const result = await extractLabels(await makeLabeledPdf());

    expect(result.pageDimensions).toEqual([{ width: 612, height: 792 }]);
    expect(result.likelyScanned).toBe(false);

    const texts = result.candidates.map((c) => c.text);
    for (const label of LABELS) {
      expect(texts).toContain(label);
    }

    const fullName = result.candidates.find((c) => c.text === 'Full Name:');
    expect(fullName).toBeDefined();
    expect(fullName?.x).toBeCloseTo(72, 0);
    // drawText y=720 (baseline from bottom) → top-origin y ≈ 792 - 720 - height
    expect(fullName?.y).toBeGreaterThan(55);
    expect(fullName?.y).toBeLessThan(72);
    expect(fullName?.page).toBe(0);
  });

  it('flags a text-free PDF as likely scanned', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const result = await extractLabels(Buffer.from(await doc.save()));

    expect(result.candidates).toHaveLength(0);
    expect(result.likelyScanned).toBe(true);
  });
});

describe('isCheckboxItem', () => {
  it('detects glyph, ASCII, and tiny-box checkboxes', () => {
    expect(isCheckboxItem('☐', 10, 10)).toBe(true);
    expect(isCheckboxItem('[ ]', 12, 10)).toBe(true);
    expect(isCheckboxItem('()', 8, 8)).toBe(true);
    expect(isCheckboxItem('Full Name:', 80, 12)).toBe(false);
    // Short text but large box → decorative, not a checkbox
    expect(isCheckboxItem('AB', 60, 40)).toBe(false);
  });
});
