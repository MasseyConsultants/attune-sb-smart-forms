// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: Mustache-style {{path}} token replacement against run state, used
// by email/notify/send_document configs ("New submission from {{formData.f-name}}").
// Ported from the enterprise template-interpolation module, trimmed to the
// dot-path + built-in-token subset SMB configs need.

/** Resolves a dot path ("formData.f-name") against a nested object. */
export function resolvePath(state: Record<string, unknown>, path: string): unknown {
  let current: unknown = state;
  for (const part of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(stringify).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Replaces {{path}} tokens with values from state. Unknown paths become empty
 * strings (a half-rendered email beats a crashed run). Built-ins: {{_date}},
 * {{_time}} render the current date/time.
 */
export function interpolate(template: string, state: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}|\s]+)\s*\}\}/g, (_match, rawPath: string) => {
    if (rawPath === '_date') {
      return new Date().toISOString().slice(0, 10);
    }
    if (rawPath === '_time') {
      return new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    }
    return stringify(resolvePath(state, rawPath));
  });
}
