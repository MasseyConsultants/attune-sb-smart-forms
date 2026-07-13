// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / Stage 1 Extract
// Purpose: Extract text items with bounding boxes from a PDF buffer using pdfjs-dist.
// Ported from the enterprise auto-mapper.
//
// pdfjs-dist v3 ships a CommonJS legacy build (legacy/build/pdf.js) that is safe to
// require() from NestJS which runs in CJS mode. v4+ dropped the CJS build (ESM-only)
// so the API package pins v3 while the web frontend uses v5 (ADR-0003).
// Canvas is an optional peer dep of v3 needed only for page rendering — text
// extraction works fine without it.
//
// Coordinate system: all returned coordinates are in PDF points (1pt = 1/72 inch)
// with the origin at the TOP-LEFT of the page (y increases downward). This matches
// FieldCoordinateMapping and the document canvas UI.

// --- Types ---

export interface LabelCandidate {
  /** Merged / cleaned text of this candidate (may span multiple raw items). */
  text: string;
  /** 0-indexed page number. */
  page: number;
  /** Left edge in PDF points from left edge of page. */
  x: number;
  /** Top edge in PDF points from top edge of page (y increases downward). */
  y: number;
  width: number;
  height: number;
  /**
   * True when this candidate looks like a checkbox glyph or fill-in indicator.
   * Used to locate yes/no/na option positions.
   */
  isCheckbox: boolean;
}

export interface ExtractResult {
  candidates: LabelCandidate[];
  pageDimensions: Array<{ width: number; height: number }>;
  /** Average text items per page. < 10 → likely scanned (manual mapping only at v1). */
  avgItemsPerPage: number;
  likelyScanned: boolean;
}

// --- Checkbox detection ---

// Unicode checkbox/radio glyphs and ASCII approximations found in common PDF forms.
const CHECKBOX_GLYPHS = new Set(['☐', '☑', '☒', '□', '■', '▪', '○', '●', '◯']);
const CHECKBOX_ASCII_RE = /^\[?\s*[xX✓✗]?\s*\]$|^\(?\s*[•*]?\s*\)$/;
const CHECKBOX_MAX_DIM = 20; // pt — boxes larger than this are likely decorative

export function isCheckboxItem(text: string, width: number, height: number): boolean {
  const t = text.trim();
  if (CHECKBOX_GLYPHS.has(t)) {
    return true;
  }
  if (CHECKBOX_ASCII_RE.test(t)) {
    return true;
  }
  // Small underpopulated box: very short text and small dimensions
  if (t.length <= 2 && width <= CHECKBOX_MAX_DIM && height <= CHECKBOX_MAX_DIM) {
    return true;
  }
  return false;
}

// --- Line grouping ---

interface RawItem {
  str: string;
  x: number; // PDF x (left)
  yBottom: number; // PDF y from bottom (raw from pdfjs transform[5])
  yTop: number; // converted to top-origin
  width: number;
  height: number;
}

/**
 * Group raw items by approximate line (within ±6 pt vertical tolerance).
 * Returns groups sorted top-to-bottom.
 */
function groupByLine(items: RawItem[]): RawItem[][] {
  const groups: RawItem[][] = [];
  const used = new Set<number>();

  const sorted = [...items].sort((a, b) => a.yTop - b.yTop);

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) {
      continue;
    }
    const anchor = sorted[i];
    const group: RawItem[] = [anchor];
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) {
        continue;
      }
      // 6pt tolerance handles mixed font sizes on the same visual line
      if (Math.abs(sorted[j].yTop - anchor.yTop) <= 6) {
        group.push(sorted[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }

  return groups;
}

/**
 * Within a line, merge adjacent items (within a 50 pt horizontal gap) into
 * single LabelCandidate entries. Consecutive items further apart become
 * separate candidates (likely separate columns).
 */
function mergeLineItems(line: RawItem[], page: number): LabelCandidate[] {
  const sorted = [...line].sort((a, b) => a.x - b.x);
  const result: LabelCandidate[] = [];
  let current: RawItem | null = null;
  let currentText = '';
  let currentRight = 0;

  const flush = (): void => {
    if (!current) {
      return;
    }
    const text = currentText.trim();
    if (text.length === 0) {
      return;
    }
    result.push({
      text,
      page,
      x: current.x,
      y: current.yTop,
      width: currentRight - current.x,
      height: current.height,
      isCheckbox: isCheckboxItem(text, currentRight - current.x, current.height),
    });
  };

  for (const item of sorted) {
    if (current === null) {
      current = item;
      currentText = item.str;
      currentRight = item.x + item.width;
      continue;
    }
    const gap = item.x - currentRight;
    if (gap <= 50) {
      currentText += (gap > 1 ? ' ' : '') + item.str;
      currentRight = Math.max(currentRight, item.x + item.width);
    } else {
      flush();
      current = item;
      currentText = item.str;
      currentRight = item.x + item.width;
    }
  }
  flush();

  return result;
}

// --- Main export ---

/**
 * Extract all text candidates with bounding boxes from a PDF buffer.
 * Returns one LabelCandidate per merged text run per line per page.
 */
export async function extractLabels(pdfBuffer: Buffer): Promise<ExtractResult> {
  // Use the pdfjs-dist v3 CommonJS legacy build. A static import would make
  // Jest and any ESM-aware bundler try to parse the worker; require() the
  // legacy CJS file lazily instead.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as typeof import('pdfjs-dist');
  const { getDocument, GlobalWorkerOptions } = pdfjsLib;
  GlobalWorkerOptions.workerSrc = ''; // empty string → FakeWorker (in-process) in Node.js

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pageDimensions: Array<{ width: number; height: number }> = [];
  const allCandidates: LabelCandidate[] = [];
  let totalItems = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageH = viewport.height;

    pageDimensions.push({ width: viewport.width, height: pageH });

    // pdfjs text content items are structurally typed; narrow manually.
    // Reason: pdfjs-dist v3 TextItem typings don't survive the CJS legacy build require().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textContent: any = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems: RawItem[] = (textContent.items as any[])
      .filter((item) => 'str' in item && typeof item.str === 'string' && item.str.trim().length > 0)
      .map((item) => {
        const x = item.transform[4] as number;
        const yBot = item.transform[5] as number;
        const w = Math.abs(item.width as number) || 6;
        const h = Math.abs(item.height as number) || 8;
        return {
          str: item.str as string,
          x,
          yBottom: yBot,
          yTop: pageH - yBot - h, // convert to top-origin
          width: w,
          height: h,
        };
      });

    totalItems += rawItems.length;

    const lines = groupByLine(rawItems);
    const pageIndex = pageNum - 1; // 0-indexed

    for (const line of lines) {
      allCandidates.push(...mergeLineItems(line, pageIndex));
    }
  }

  const avgItemsPerPage = numPages > 0 ? totalItems / numPages : 0;

  return {
    candidates: allCandidates,
    pageDimensions,
    avgItemsPerPage,
    likelyScanned: avgItemsPerPage < 10,
  };
}
