// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Evaluates whether a field should be visible based on its conditional rules.
// AND semantics — ALL rules in the set must pass for the field to be visible.
// Ported verbatim from the enterprise @attune/form-engine.
import type {
  ConditionalVisibility,
  ConditionalRule,
  ConditionalOperator,
} from '@attune-sb/shared-types';

// --- Rule evaluator ---

function evaluateRule(rule: ConditionalRule, values: Record<string, unknown>): boolean {
  const fieldValue = values[rule.fieldId];
  const op: ConditionalOperator = rule.operator;

  switch (op) {
    case 'equals':
      return fieldValue === rule.value;
    case 'not_equals':
      return fieldValue !== rule.value;
    case 'contains':
      return typeof fieldValue === 'string' && typeof rule.value === 'string'
        ? fieldValue.toLowerCase().includes(rule.value.toLowerCase())
        : false;
    case 'not_contains':
      return typeof fieldValue === 'string' && typeof rule.value === 'string'
        ? !fieldValue.toLowerCase().includes(rule.value.toLowerCase())
        : true;
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof rule.value === 'number'
        ? fieldValue > rule.value
        : false;
    case 'less_than':
      return typeof fieldValue === 'number' && typeof rule.value === 'number'
        ? fieldValue < rule.value
        : false;
    case 'is_empty':
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case 'is_not_empty':
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== '' &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
}

// --- Main export ---
// Returns true if the field SHOULD be visible.
// If visibility is not enabled, the field is always visible.
export function evaluateConditionalVisibility(
  visibility: ConditionalVisibility | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!visibility?.enabled || !visibility.rules || visibility.rules.length === 0) {
    return true;
  }
  // AND semantics: every rule must pass
  return visibility.rules.every((rule) => evaluateRule(rule, values));
}
