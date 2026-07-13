// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Canvas helpers over the shared-types mapping contract. Ported from
// enterprise document-canvas/types.ts — the types themselves now live in
// @attune-sb/shared-types so the API and canvas can never drift.

import type { FieldCoordinateMapping, MappingRenderMode } from '@attune-sb/shared-types';

/** Unique stable key for a mapping — accounts for answer-option variants. */
export function mappingKey(m: Pick<FieldCoordinateMapping, 'fieldId' | 'answerOption'>): string {
  return m.answerOption ? `${m.fieldId}:${m.answerOption}` : m.fieldId;
}

/** Effective render mode after applying the back-compat default. */
export function effectiveRenderMode(m: FieldCoordinateMapping): MappingRenderMode {
  if (m.renderMode) {
    return m.renderMode;
  }
  return m.answerOption ? 'checkmark' : 'value';
}

/** Round a value to the nearest grid interval. */
export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
