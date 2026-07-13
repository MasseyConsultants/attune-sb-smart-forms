// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / GroupValidator
// Purpose: Validates yes/no/na checkbox groups produced by Stage 1 fuzzy matching.
// Ported from the enterprise auto-mapper. Candidates that violate the geometric
// rules are downgraded to review with a human-readable note — never auto-placed.
//
// Validation rules:
//   1. Option count == 3 for yes/no/na, all options present, no duplicates
//   2. All boxes co-located: same row (±4pt Y) OR same column (±4pt X)
//   3. No overlapping boxes
//   4. Plausible checkbox dimensions: 4pt ≤ w,h ≤ 24pt
//   5. Group span (total X or Y extent) ≤ 250pt

import { Injectable } from '@nestjs/common';

export type AnswerOption = 'yes' | 'no' | 'na';

// --- Types ---

export interface GroupEntry {
  fieldId: string;
  answerOption: AnswerOption;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroupValidationResult {
  valid: boolean;
  reasons: string[];
}

// --- Constants ---

const CO_LOCATION_TOLERANCE_PT = 4;
const MIN_CHECKBOX_DIM_PT = 4;
const MAX_CHECKBOX_DIM_PT = 24;
const MAX_GROUP_SPAN_PT = 250;

const YESNO_OPTIONS: readonly AnswerOption[] = ['yes', 'no', 'na'];

// --- Service ---

@Injectable()
export class GroupValidatorService {
  /**
   * Validate a group of yes/no/na checkbox candidates for a single field.
   * Pass all candidates for the same `fieldId` together.
   */
  validateYesNoGroup(entries: GroupEntry[]): GroupValidationResult {
    const reasons: string[] = [];

    const options = entries.map((e) => e.answerOption);
    if (entries.length !== 3) {
      reasons.push(
        `Expected 3 options (yes/no/na), got ${entries.length}: [${options.join(', ')}]`,
      );
    }

    const optionSet = new Set(options);
    for (const required of YESNO_OPTIONS) {
      if (!optionSet.has(required)) {
        reasons.push(`Missing answer option: "${required}"`);
      }
    }
    if (optionSet.size !== options.length) {
      reasons.push(`Duplicate answer options detected: [${options.join(', ')}]`);
    }

    // Remaining checks require at least 2 entries to be meaningful
    if (entries.length < 2) {
      return { valid: reasons.length === 0, reasons };
    }

    // Co-location: same row (±4pt Y) OR same column (±4pt X)
    const firstY = entries[0].y;
    const firstX = entries[0].x;
    const sameRow = entries.every((e) => Math.abs(e.y - firstY) <= CO_LOCATION_TOLERANCE_PT);
    const sameCol = entries.every((e) => Math.abs(e.x - firstX) <= CO_LOCATION_TOLERANCE_PT);
    if (!sameRow && !sameCol) {
      const ys = entries.map((e) => e.y.toFixed(1)).join(', ');
      const xs = entries.map((e) => e.x.toFixed(1)).join(', ');
      reasons.push(
        `Boxes are not co-located: Y spread [${ys}] exceeds ±${CO_LOCATION_TOLERANCE_PT}pt ` +
          `and X spread [${xs}] exceeds ±${CO_LOCATION_TOLERANCE_PT}pt`,
      );
    }

    // No overlapping boxes
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (boxesOverlap(entries[i], entries[j])) {
          reasons.push(
            `Boxes for "${entries[i].answerOption}" and "${entries[j].answerOption}" overlap`,
          );
        }
      }
    }

    // Plausible checkbox dimensions
    for (const entry of entries) {
      if (entry.width < MIN_CHECKBOX_DIM_PT || entry.width > MAX_CHECKBOX_DIM_PT) {
        reasons.push(
          `"${entry.answerOption}" box width ${entry.width.toFixed(1)}pt is outside ` +
            `[${MIN_CHECKBOX_DIM_PT}, ${MAX_CHECKBOX_DIM_PT}]pt range`,
        );
      }
      if (entry.height < MIN_CHECKBOX_DIM_PT || entry.height > MAX_CHECKBOX_DIM_PT) {
        reasons.push(
          `"${entry.answerOption}" box height ${entry.height.toFixed(1)}pt is outside ` +
            `[${MIN_CHECKBOX_DIM_PT}, ${MAX_CHECKBOX_DIM_PT}]pt range`,
        );
      }
    }

    // Group span ≤ 250pt
    if (sameRow) {
      const minX = Math.min(...entries.map((e) => e.x));
      const maxX = Math.max(...entries.map((e) => e.x + e.width));
      if (maxX - minX > MAX_GROUP_SPAN_PT) {
        reasons.push(
          `Group horizontal span ${(maxX - minX).toFixed(1)}pt exceeds ${MAX_GROUP_SPAN_PT}pt limit`,
        );
      }
    } else if (sameCol) {
      const minY = Math.min(...entries.map((e) => e.y));
      const maxY = Math.max(...entries.map((e) => e.y + e.height));
      if (maxY - minY > MAX_GROUP_SPAN_PT) {
        reasons.push(
          `Group vertical span ${(maxY - minY).toFixed(1)}pt exceeds ${MAX_GROUP_SPAN_PT}pt limit`,
        );
      }
    }

    return { valid: reasons.length === 0, reasons };
  }

  /**
   * Validate all yes/no/na groups in a full candidate set.
   * Returns a map of fieldId → validation result (only for grouped fields).
   */
  validateAll(groups: Map<string, GroupEntry[]>): Map<string, GroupValidationResult> {
    const results = new Map<string, GroupValidationResult>();
    for (const [fieldId, entries] of groups) {
      results.set(fieldId, this.validateYesNoGroup(entries));
    }
    return results;
  }
}

// --- Internal helpers ---

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return !(ax2 <= b.x || bx2 <= a.x || ay2 <= b.y || by2 <= a.y);
}
