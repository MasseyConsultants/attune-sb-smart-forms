// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / Stage 1 Fuzzy Match
// Purpose: Normalize label text and score field-label ↔ PDF-candidate pairs using
// fuzzball token_set_ratio. Ported from the enterprise auto-mapper.
//
// Thresholds:
//   ≥ 88  → auto_accept  (place on canvas immediately, lighter highlight)
//   55–87 → review       (yellow candidate overlay, builder confirms)
//   < 55  → drop         (don't surface — too noisy)

import * as fuzzball from 'fuzzball';

import type { LabelCandidate } from './extract';

// --- Thresholds ---

export const THRESHOLD_AUTO_ACCEPT = 88;
// 55 (not the classic 70) so shorter / fragmented PDF labels still surface
// for review instead of being silently dropped — tuned on real enterprise forms.
export const THRESHOLD_REVIEW = 55;

export type MatchStatus = 'auto_accept' | 'review';

// --- Types ---

export interface FormFieldInput {
  id: string;
  label: string;
  type: string;
}

export interface FieldMatch {
  field: FormFieldInput;
  candidate: LabelCandidate;
  score: number; // 0-100
  status: MatchStatus;
}

// --- Label normalization ---

// Abbreviation expansion table — add entries as real forms surface new patterns.
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bdob\b/gi, 'date of birth'],
  [/\bd\.o\.b\.?\b/gi, 'date of birth'],
  [/\bdept\.?\b/gi, 'department'],
  [/\bemp\.?\b/gi, 'employee'],
  [/\bno\.?\b/gi, 'number'],
  [/\bnum\.?\b/gi, 'number'],
  [/\b#\b/g, 'number'],
  [/\baddr\.?\b/gi, 'address'],
  [/\bmgr\.?\b/gi, 'manager'],
  [/\bsig\.?\b/gi, 'signature'],
  [/\btel\.?\b/gi, 'phone'],
  [/\bph\.?\b/gi, 'phone'],
  [/\bssn\.?\b/gi, 'social security number'],
  [/\bein\.?\b/gi, 'employer identification number'],
  [/\bid\.?\b/gi, 'identifier'],
  [/\bzip\.?\b/gi, 'zip code'],
  [/\bst\.?\b/gi, 'state'],
  [/\bmi\.?\b/gi, 'middle initial'],
  [/\bop(er)?\.?\b/gi, 'operator'],
  [/\bsupv?\.?\b/gi, 'supervisor'],
  [/\binsp\.?\b/gi, 'inspection'],
  [/\bqty\.?\b/gi, 'quantity'],
  [/\bloc\.?\b/gi, 'location'],
  [/\bref\.?\b/gi, 'reference'],
  [/\bdesc\.?\b/gi, 'description'],
  [/\brepair(ed|s)?\b/gi, 'repair'],
  [/\bdefect(s|ive)?\b/gi, 'defect'],
  [/\bcond(ition)?\b/gi, 'condition'],
  [/\bequip(ment)?\b/gi, 'equipment'],
  [/\bveh(icle)?\b/gi, 'vehicle'],
  // Ordinals ("2nd Driver", "3rd Party")
  [/\b1st\b/gi, 'first'],
  [/\b2nd\b/gi, 'second'],
  [/\b3rd\b/gi, 'third'],
  [/\b4th\b/gi, 'fourth'],
  [/\brequestor\b/gi, 'requester'],
  [/\bauthorize[dr]?\b/gi, 'authorized'],
  [/\bapprove[dr]?\b/gi, 'approved'],
];

export function normalizeLabel(text: string): string {
  let s = text
    .toLowerCase()
    // Strip parenthetical qualifiers FIRST — "(sufficient depth)" etc. They
    // describe the acceptance criterion, not the label, and hurt fuzzy scores.
    // (Must run before punctuation stripping removes the parens themselves —
    // the enterprise version had this ordered wrong and never stripped them.)
    .replace(/\(.*?\)/g, ' ')
    .replace(/[_\-:;()/\\*]+/g, ' ') // strip common form punctuation
    .replace(/[^a-z0-9\s]/g, ' '); // strip remaining non-alphanumeric

  // Strip leading item numbers — handles both formats:
  //   "1. Are aisles clear?" (period-dot format)
  //   "1 Tire tread"        (space format)
  // Does NOT strip ordinals like "2nd Driver" (no dot/space after the digits).
  s = s.replace(/^\s*\d+\.\s+/, '');
  s = s.replace(/^\s*\d+\s+/, '');

  for (const [pattern, replacement] of ABBREVIATIONS) {
    s = s.replace(pattern, replacement);
  }

  return s.replace(/\s+/g, ' ').trim();
}

// --- Fuzzy match ---

/**
 * For each form field, find the best-matching PDF label candidate.
 * Returns one FieldMatch per field (only if score ≥ THRESHOLD_REVIEW).
 * When multiple fields match the same candidate, all are downgraded to review.
 */
export function fuzzyMatchFields(
  candidates: LabelCandidate[],
  fields: FormFieldInput[],
): FieldMatch[] {
  // Checkbox candidates are handled by yes/no group detection, not label matching.
  const textCandidates = candidates.filter((c) => !c.isCheckbox);

  const normCandidates = textCandidates.map((c) => ({
    candidate: c,
    norm: normalizeLabel(c.text),
  }));

  const results: FieldMatch[] = [];

  for (const field of fields) {
    const normField = normalizeLabel(field.label);
    if (!normField) {
      continue;
    }

    let bestScore = -1;
    let bestIdx = -1;

    for (let i = 0; i < normCandidates.length; i++) {
      const { norm } = normCandidates[i];
      if (!norm) {
        continue;
      }

      // Max of two complementary scorers:
      // - token_set_ratio: reordered / subset tokens ("Name" vs "Requester Full Name")
      // - partial_token_sort_ratio: contiguous-substring cases, abbreviations/prefixes
      const s1 = fuzzball.token_set_ratio(normField, norm);
      const s2 = fuzzball.partial_token_sort_ratio(normField, norm);
      const score = Math.max(s1, s2);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1 || bestScore < THRESHOLD_REVIEW) {
      continue;
    }

    results.push({
      field,
      candidate: normCandidates[bestIdx].candidate,
      score: bestScore,
      status: bestScore >= THRESHOLD_AUTO_ACCEPT ? 'auto_accept' : 'review',
    });
  }

  // De-duplicate: if two fields matched the same candidate, downgrade both to review.
  const usage = new Map<LabelCandidate, number>();
  for (const r of results) {
    usage.set(r.candidate, (usage.get(r.candidate) ?? 0) + 1);
  }

  return results.map((r) =>
    (usage.get(r.candidate) ?? 0) > 1 ? { ...r, status: 'review' as MatchStatus } : r,
  );
}

// --- Yes/No/NA label detection ---

// Labels that indicate a yes/no/na option on a printed form (normalized first).
// PASS/FAIL treated as yes/no equivalents — common on inspection forms.
export const YES_LABELS = new Set(['yes', 'y', 'si', 'sí', 'pass', 'passed', 'ok', 'okay']);
export const NO_LABELS = new Set(['no', 'n', 'no/na', 'fail', 'failed', 'defective']);
export const NA_LABELS = new Set(['na', 'n a', 'n/a', 'not applicable', 'not app', 'n.a.', 'none']);

export type AnswerOptionLabel = 'yes' | 'no' | 'na';

export function detectAnswerOptionLabel(text: string): AnswerOptionLabel | null {
  const norm = normalizeLabel(text);
  if (YES_LABELS.has(norm)) {
    return 'yes';
  }
  if (NO_LABELS.has(norm)) {
    return 'no';
  }
  if (NA_LABELS.has(norm)) {
    return 'na';
  }
  return null;
}
