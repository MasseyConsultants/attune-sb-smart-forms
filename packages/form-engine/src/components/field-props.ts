// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Shared prop contract for every web field component.

import type { FieldDefinition } from '@attune-sb/shared-types';

export interface BaseFieldProps {
  readonly field: FieldDefinition;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

/** Normalises config.options so both string[] and {label,value}[] are handled. */
export function normalizeOptions(raw: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : (o as { label: string; value: string }),
  );
}
