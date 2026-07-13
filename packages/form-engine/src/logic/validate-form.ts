// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Pure, side-effect-free form validation function.
// Used by: mobile submission, portal form preview, and API submission handler.
// Keeping this as a pure function means zero React dependency — safe to call
// from NestJS service code without importing any component.

import type { FieldDefinition } from '@attune-sb/shared-types';

export type ValidationErrors = Record<string, string>;

/**
 * Validates a set of field values against a form's field definitions.
 *
 * @param fields - The FieldDefinition[] from the published form schema.
 * @param values - A flat map of fieldId → submitted value.
 * @returns An object mapping fieldId → first failing error message.
 *          An empty object means the submission is valid.
 */
export function validateForm(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const field of fields) {
    // Skip structural / display-only fields — they carry no user data.
    if (field.type === 'section' || field.type === 'pagebreak' || field.type === 'thankyou') {
      continue;
    }

    const raw = values[field.id];
    const isEmpty = isValueEmpty(raw);

    if (field.required && isEmpty) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }

    // Skip further checks if the field is optional and has no value.
    if (isEmpty) {
      continue;
    }

    if (!field.validations || field.validations.length === 0) {
      continue;
    }

    for (const rule of field.validations) {
      const error = evaluateValidationRule(field, raw, rule);
      if (error) {
        errors[field.id] = error;
        break; // Report only the first failing rule per field.
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function evaluateValidationRule(
  field: FieldDefinition,
  value: unknown,
  rule: FieldDefinition['validations'] extends (infer R)[] | undefined ? R : never,
): string | null {
  if (!rule) {
    return null;
  }

  switch (rule.type) {
    case 'minLength': {
      const str = String(value);
      const min = Number(rule.value);
      if (str.length < min) {
        return rule.message || `${field.label} must be at least ${min} characters`;
      }
      break;
    }
    case 'maxLength': {
      const str = String(value);
      const max = Number(rule.value);
      if (str.length > max) {
        return rule.message || `${field.label} must be no more than ${max} characters`;
      }
      break;
    }
    case 'min': {
      const num = Number(value);
      const min = Number(rule.value);
      if (!isNaN(num) && num < min) {
        return rule.message || `${field.label} must be at least ${min}`;
      }
      break;
    }
    case 'max': {
      const num = Number(value);
      const max = Number(rule.value);
      if (!isNaN(num) && num > max) {
        return rule.message || `${field.label} must be no more than ${max}`;
      }
      break;
    }
    case 'pattern': {
      const str = String(value);
      const pattern = new RegExp(String(rule.value));
      if (!pattern.test(str)) {
        return rule.message || `${field.label} format is invalid`;
      }
      break;
    }
    case 'custom': {
      // Custom validation rules must supply an explicit message.
      // The rule.value is intentionally unused here — custom logic is defined
      // at the point of use (server-side extension or future plugin system).
      // We surface the message as the error to signal the field failed custom validation.
      return rule.message || `${field.label} failed custom validation`;
    }
  }

  return null;
}
