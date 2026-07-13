// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Figma-style smart alignment guides for the document canvas —
// ported from enterprise. During a drag, the moving box's six reference
// points (left/centre/right edges, top/centre/bottom) are compared against
// every sibling on the page; near-alignments snap and emit guide lines.

import type { FieldCoordinateMapping } from '@attune-sb/shared-types';

/** A single guide line to overlay on the page canvas during a drag. */
export interface GuideLine {
  /** 'vertical' → full-height line at `position` pt from the left;
   *  'horizontal' → full-width line at `position` pt from the top. */
  orientation: 'horizontal' | 'vertical';
  /** Guide position in PDF points. */
  position: number;
}

export interface AlignmentResult {
  snappedX: number;
  snappedY: number;
  guides: GuideLine[];
}

/**
 * How close (in PDF points) a dragging edge must be to a sibling edge before
 * the guide activates — a comfortable magnetic feel without being sticky.
 */
export const GUIDE_THRESHOLD_PT = 5;

export function computeAlignmentGuides(
  dragging: FieldCoordinateMapping,
  siblings: FieldCoordinateMapping[],
  threshold = GUIDE_THRESHOLD_PT,
): AlignmentResult {
  const guides: GuideLine[] = [];

  const dL = dragging.x;
  const dCX = dragging.x + dragging.width / 2;
  const dR = dragging.x + dragging.width;
  const dT = dragging.y;
  const dCY = dragging.y + dragging.height / 2;
  const dB = dragging.y + dragging.height;

  let bestDX: number | null = null;
  let bestDY: number | null = null;

  for (const sib of siblings) {
    const sL = sib.x;
    const sCX = sib.x + sib.width / 2;
    const sR = sib.x + sib.width;
    const sT = sib.y;
    const sCY = sib.y + sib.height / 2;
    const sB = sib.y + sib.height;

    const xPairs: Array<[number, number]> = [
      [dL, sL],
      [dL, sR],
      [dCX, sCX],
      [dR, sR],
      [dR, sL],
    ];
    for (const [d, s] of xPairs) {
      const delta = s - d;
      if (Math.abs(delta) <= threshold) {
        if (bestDX === null || Math.abs(delta) < Math.abs(bestDX)) {
          bestDX = delta;
        }
        guides.push({ orientation: 'vertical', position: s });
      }
    }

    const yPairs: Array<[number, number]> = [
      [dT, sT],
      [dT, sB],
      [dCY, sCY],
      [dB, sB],
      [dB, sT],
    ];
    for (const [d, s] of yPairs) {
      const delta = s - d;
      if (Math.abs(delta) <= threshold) {
        if (bestDY === null || Math.abs(delta) < Math.abs(bestDY)) {
          bestDY = delta;
        }
        guides.push({ orientation: 'horizontal', position: s });
      }
    }
  }

  const seen = new Set<string>();
  const uniqueGuides = guides.filter((g) => {
    const key = `${g.orientation}:${g.position}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return {
    snappedX: bestDX !== null ? dragging.x + bestDX : dragging.x,
    snappedY: bestDY !== null ? dragging.y + bestDY : dragging.y,
    guides: uniqueGuides,
  };
}
