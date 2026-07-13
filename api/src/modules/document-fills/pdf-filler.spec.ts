// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills / Tests
// Fill runtime: each render mode (value, checkmark, highlight, signature),
// answer-option activation, multi-page placement, and WinAnsi sanitization.
// Fixtures are generated with pdf-lib so tests need no binary assets.

import type { FieldCoordinateMapping } from '@attune-sb/shared-types';
import { PDFDocument } from 'pdf-lib';

import { answerMatches, renderFilledPdf, sanitizeForWinAnsi } from './pdf-filler';

async function makeFixturePdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([612, 792]); // US Letter in points
  }
  return Buffer.from(await doc.save());
}

function mapping(overrides: Partial<FieldCoordinateMapping> = {}): FieldCoordinateMapping {
  return {
    fieldId: 'name',
    fieldLabel: 'Name',
    page: 0,
    x: 100,
    y: 100,
    width: 160,
    height: 20,
    ...overrides,
  };
}

describe('renderFilledPdf', () => {
  it('stamps value mode text and returns a loadable PDF', async () => {
    const fixture = await makeFixturePdf();
    const filled = await renderFilledPdf(fixture, [mapping()], { name: 'Jane Smith' });

    const reloaded = await PDFDocument.load(filled);
    expect(reloaded.getPageCount()).toBe(2);
    // Text + embedded font must grow the document.
    expect(filled.length).toBeGreaterThan(fixture.length);
  });

  it('renders on the mapped page of a multi-page document', async () => {
    const fixture = await makeFixturePdf(3);
    const filled = await renderFilledPdf(fixture, [mapping({ page: 2 })], { name: 'X' });
    expect((await PDFDocument.load(filled)).getPageCount()).toBe(3);
  });

  it('skips mappings whose page does not exist instead of throwing', async () => {
    const fixture = await makeFixturePdf(1);
    await expect(
      renderFilledPdf(fixture, [mapping({ page: 5 })], { name: 'X' }),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it('skips empty values', async () => {
    const fixture = await makeFixturePdf(1);
    const filled = await renderFilledPdf(fixture, [mapping()], { name: '' });
    expect((await PDFDocument.load(filled)).getPageCount()).toBe(1);
  });

  it('draws checkmark mode only for the matching answer option', async () => {
    const fixture = await makeFixturePdf(1);
    const mappings: FieldCoordinateMapping[] = [
      mapping({ fieldId: 'safe', answerOption: 'yes', x: 100, width: 12, height: 12 }),
      mapping({ fieldId: 'safe', answerOption: 'no', x: 140, width: 12, height: 12 }),
      mapping({ fieldId: 'safe', answerOption: 'na', x: 180, width: 12, height: 12 }),
    ];

    const yes = await renderFilledPdf(fixture, mappings, { safe: 'yes' });
    const none = await renderFilledPdf(fixture, mappings, { safe: 'maybe' });
    // One checkmark drawn vs none — the yes variant must carry more content.
    expect(yes.length).toBeGreaterThan(none.length);
  });

  it('activates option mappings from boolean submissions (yesno normalisation)', async () => {
    const fixture = await makeFixturePdf(1);
    const mappings = [mapping({ fieldId: 'ok', answerOption: 'yes', width: 12, height: 12 })];
    const filled = await renderFilledPdf(fixture, mappings, { ok: true });
    const skipped = await renderFilledPdf(fixture, mappings, { ok: false });
    expect(filled.length).toBeGreaterThan(skipped.length);
  });

  it('renders highlight mode rectangles', async () => {
    const fixture = await makeFixturePdf(1);
    const filled = await renderFilledPdf(
      fixture,
      [mapping({ fieldId: 'shift', answerOption: 'second', renderMode: 'highlight' })],
      { shift: 'second' },
    );
    expect(filled.length).toBeGreaterThan(fixture.length);
  });

  it('renders signature strokes without throwing', async () => {
    const fixture = await makeFixturePdf(1);
    const strokes = [
      [
        { x: 0, y: 0 },
        { x: 40, y: 20 },
        { x: 80, y: 5 },
      ],
    ];
    const filled = await renderFilledPdf(
      fixture,
      [mapping({ fieldId: 'sig', width: 120, height: 40 })],
      { sig: strokes },
    );
    expect(filled.length).toBeGreaterThan(fixture.length);
  });

  it('joins array answers and survives non-WinAnsi characters', async () => {
    const fixture = await makeFixturePdf(1);
    await expect(
      renderFilledPdf(fixture, [mapping()], { name: ['✓ done', 'em—dash', '日本語'] }),
    ).resolves.toBeInstanceOf(Buffer);
  });
});

describe('answerMatches', () => {
  it('normalises booleans and 0/1 to yes/no', () => {
    expect(answerMatches(true, 'yes')).toBe(true);
    expect(answerMatches('1', 'yes')).toBe(true);
    expect(answerMatches(false, 'no')).toBe(true);
    expect(answerMatches('0', 'no')).toBe(true);
    expect(answerMatches('n/a', 'na')).toBe(true);
  });

  it('matches any element of a multi-select array', () => {
    expect(answerMatches(['a', 'b'], 'b')).toBe(true);
    expect(answerMatches(['a', 'b'], 'c')).toBe(false);
  });
});

describe('sanitizeForWinAnsi', () => {
  it('substitutes meaning-preserving replacements and falls back to ?', () => {
    expect(sanitizeForWinAnsi('✓ done')).toBe('Y done');
    expect(sanitizeForWinAnsi('a—b')).toBe('a-b');
    expect(sanitizeForWinAnsi('日本')).toBe('??');
  });
});
