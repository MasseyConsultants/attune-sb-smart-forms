// Author: Robert Massey | Created: 2026-07-13 | Module: Scripts
// Generates a labeled one-page fixture PDF for SmartMapper smoke tests.
// Usage: node scripts/make-fixture-pdf.mjs <output-path>

import { writeFileSync } from 'node:fs';

import { PDFDocument, StandardFonts } from 'pdf-lib';

const LABELS = [
  'Full Name:',
  'Email Address:',
  'Phone Number:',
  'Company:',
  'Street Address:',
  'City:',
  'State:',
  'Zip Code:',
  'Preferred Contact Date:',
  'Comments:',
  'Signature:',
  'Date Signed:',
];

const doc = await PDFDocument.create();
const page = doc.addPage([612, 792]);
const font = await doc.embedFont(StandardFonts.Helvetica);

page.drawText('Customer Intake Form', { x: 72, y: 740, size: 18, font });
LABELS.forEach((label, i) => {
  page.drawText(label, { x: 72, y: 690 - i * 32, size: 11, font });
});

const out = process.argv[2] ?? 'fixture-form.pdf';
writeFileSync(out, await doc.save());
console.log(`wrote ${out}`);
