// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills
// Purpose: Pure pdf-lib stamping — overlays submitted values onto the template
// PDF at their mapped coordinates. Ported from the enterprise fill_document
// step adapter. No I/O here: bytes in, bytes out, fully unit-testable.
//
// Render modes per mapping (see FieldCoordinateMapping):
//   value      — stamp the answer text (default for non-option fields)
//   checkmark  — draw a vector checkmark when this mapping's answerOption is
//                active (default for option-bearing mappings)
//   highlight  — translucent rectangle when active (for pre-printed options)
//
// Signature fields (stroke arrays) render as scaled vector paths.

import type { FieldCoordinateMapping, MappingRenderMode } from '@attune-sb/shared-types';
import type { PDFPage } from 'pdf-lib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// --- Option matching ---

/** Effective render mode after applying back-compat defaults. */
function effectiveRenderMode(m: FieldCoordinateMapping): MappingRenderMode {
  if (m.renderMode) {
    return m.renderMode;
  }
  return m.answerOption ? 'checkmark' : 'value';
}

/** Yes/No/NA-aware option normalisation: maps booleans/0/1/n_a to canonical keys. */
function normaliseOption(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  const s = String(raw).toLowerCase().trim();
  if (s === 'true' || s === '1') {
    return 'yes';
  }
  if (s === 'false' || s === '0') {
    return 'no';
  }
  if (s === 'n/a' || s === 'n_a') {
    return 'na';
  }
  return s;
}

/** Does the submitted value activate the mapping with the given answerOption? */
export function answerMatches(submitted: unknown, answerOption: string): boolean {
  const optKey = normaliseOption(answerOption);
  // Multi-select submissions arrive as arrays — any matching option activates.
  if (Array.isArray(submitted)) {
    return submitted.some((v) => normaliseOption(v) === optKey);
  }
  return normaliseOption(submitted) === optKey;
}

/** Strip / replace characters outside the WinAnsi (Windows-1252) range so that
 *  pdf-lib's Helvetica embedding never throws. Common substitutions preserve
 *  meaning; everything else beyond U+00FF falls back to '?'. */
export function sanitizeForWinAnsi(text: string): string {
  return (
    text
      .replace(/[✓✔]/g, 'Y')
      .replace(/[✗✘✖]/g, 'N')
      .replace(/[–—]/g, '-')
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[•·]/g, '*')
      .replace(/…/g, '...')
      // eslint-disable-next-line no-control-regex -- WinAnsi range is defined by byte value
      .replace(/[^\x00-\xFF]/g, '?')
  );
}

// --- Signature stroke rendering ---
// Signature fields store stroke data as an array of strokes, where each stroke
// is an array of {x, y} points. Both wrapped ([[{x,y}…]]) and flat ([{x,y}…])
// forms are accepted; JSON-string values are parsed.

interface StrokePoint {
  x: number;
  y: number;
}

function toStrokes(value: unknown): StrokePoint[][] {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }
  if (Array.isArray(parsed[0])) {
    return parsed as StrokePoint[][];
  }
  return [parsed as StrokePoint[]];
}

function isSignatureStrokes(value: unknown): boolean {
  const strokes = toStrokes(value);
  if (strokes.length === 0) {
    return false;
  }
  const point: unknown = strokes[0]?.[0];
  // Guard the element type too — plain string arrays (multi-select answers)
  // also survive toStrokes and must not be treated as stroke data.
  return typeof point === 'object' && point !== null && 'x' in point && 'y' in point;
}

function renderSignatureStrokes(
  page: PDFPage,
  mapping: FieldCoordinateMapping,
  rawValue: unknown,
  pageHeight: number,
): void {
  const strokes = toStrokes(rawValue);
  if (strokes.length === 0) {
    return;
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.x < minX) {
        minX = pt.x;
      }
      if (pt.x > maxX) {
        maxX = pt.x;
      }
      if (pt.y < minY) {
        minY = pt.y;
      }
      if (pt.y > maxY) {
        maxY = pt.y;
      }
    }
  }

  const sigW = maxX - minX || 1;
  const sigH = maxY - minY || 1;

  // Scale uniformly to fit within the mapping box (2 pt padding each side).
  const pad = 2;
  const targetW = Math.max(1, mapping.width - pad * 2);
  const targetH = Math.max(1, mapping.height - pad * 2);
  const scale = Math.min(targetW / sigW, targetH / sigH);

  const scaledW = sigW * scale;
  const scaledH = sigH * scale;
  const boxLeft = mapping.x + pad + (targetW - scaledW) / 2;
  // PDF y is from bottom-left; our mapping.y is from page top.
  const boxBottom = pageHeight - mapping.y - mapping.height + pad + (targetH - scaledH) / 2;

  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length - 1; i++) {
      const p1 = stroke[i];
      const p2 = stroke[i + 1];
      // Skip duplicate sentinel points that mark pen lifts.
      if (p1.x === p2.x && p1.y === p2.y) {
        continue;
      }

      // Stroke y-coords are top-down (screen); flip for PDF bottom-up origin.
      page.drawLine({
        start: {
          x: boxLeft + (p1.x - minX) * scale,
          y: boxBottom + (sigH - (p1.y - minY)) * scale,
        },
        end: {
          x: boxLeft + (p2.x - minX) * scale,
          y: boxBottom + (sigH - (p2.y - minY)) * scale,
        },
        thickness: 1.2,
        color: rgb(0, 0, 0),
      });
    }
  }
}

/** Convert '#RRGGBB' (or '#RGB') to pdf-lib rgb(); falls back to translucent yellow. */
function parseHexColor(hex: string | undefined): { r: number; g: number; b: number } {
  if (!hex) {
    return { r: 1, g: 0.92, b: 0.23 };
  } // default #FFEB3B
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) {
    return { r: 1, g: 0.92, b: 0.23 };
  }
  let h = m[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// --- Main export ---

/**
 * Overlay submitted values onto the template PDF. Returns the filled PDF bytes.
 * Mappings targeting missing pages or empty values are skipped silently.
 */
export async function renderFilledPdf(
  pdfBytes: Buffer | Uint8Array,
  mappings: FieldCoordinateMapping[],
  formData: Record<string, unknown>,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const mapping of mappings) {
    const rawValue = formData[mapping.fieldId];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const page = pages[mapping.page];
    if (!page) {
      continue;
    }

    const { height: pageHeight } = page.getSize();
    const fontSize = mapping.fontSize ?? 11;
    const mode = effectiveRenderMode(mapping);

    // Option-bearing mappings only draw when the submitted answer activates
    // this specific option; every other position is skipped.
    if (mapping.answerOption !== undefined && !answerMatches(rawValue, mapping.answerOption)) {
      continue;
    }

    // pdf-lib coordinate origin is bottom-left; our stored Y is from top.
    // Glyph modes offset by fontSize so the baseline lands inside the box;
    // highlight mode uses the box rect directly.
    const pdfYGlyph = pageHeight - mapping.y - fontSize;
    const pdfYRect = pageHeight - mapping.y - mapping.height;

    if (mode === 'highlight') {
      const { r, g, b } = parseHexColor(mapping.highlightColor);
      page.drawRectangle({
        x: mapping.x,
        y: Math.max(0, pdfYRect),
        width: mapping.width,
        height: mapping.height,
        color: rgb(r, g, b),
        opacity: 0.35,
        borderColor: rgb(r, g, b),
        borderOpacity: 0.6,
        borderWidth: 0.5,
      });
      continue;
    }

    if (mode === 'checkmark') {
      // Two vector lines — no font encoding involved, works regardless of
      // character set or PDF font configuration.
      const ckX = mapping.x;
      const ckY = Math.max(0, pdfYGlyph);
      const sw = Math.max(1, fontSize * 0.1);
      const s = fontSize * 0.65;
      page.drawLine({
        start: { x: ckX, y: ckY + s * 0.4 },
        end: { x: ckX + s * 0.38, y: ckY },
        thickness: sw,
        color: rgb(0, 0, 0),
      });
      page.drawLine({
        start: { x: ckX + s * 0.38, y: ckY },
        end: { x: ckX + s, y: ckY + s * 0.75 },
        thickness: sw,
        color: rgb(0, 0, 0),
      });
      continue;
    }

    // Signature fields: render stroke paths scaled to the mapping bounding box.
    if (isSignatureStrokes(rawValue)) {
      renderSignatureStrokes(page, mapping, rawValue, pageHeight);
      continue;
    }

    // mode === 'value' — stamp the answer text.
    const rawText = Array.isArray(rawValue) ? (rawValue as unknown[]).join(', ') : String(rawValue);
    page.drawText(sanitizeForWinAnsi(rawText), {
      x: mapping.x,
      y: Math.max(0, pdfYGlyph),
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: mapping.width,
    });
  }

  return Buffer.from(await pdfDoc.save());
}
