// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Evaluates page navigation rules — determines which page to navigate to next.
// First-match-wins: the first rule whose condition passes determines the target page.
// Falls through to defaultNextPage if no rule matches.
// Ported verbatim from the enterprise @attune/form-engine.
import type { NavigationRule } from '@attune-sb/shared-types';

// Re-export so consumers that imported from this module directly are unaffected.
export type { NavigationRule };

// --- Main export ---
// Returns the target page number after applying first-match navigation.
// Returns defaultNextPage when no rule matches.
export function evaluateNavigationRules(
  rules: NavigationRule[],
  values: Record<string, unknown>,
  defaultNextPage: number,
): number {
  for (const rule of rules) {
    const fieldValue = values[rule.fieldId];
    let matched = false;

    switch (rule.operator) {
      case 'equals':
        matched = fieldValue === rule.value;
        break;
      case 'not_equals':
        matched = fieldValue !== rule.value;
        break;
      case 'contains':
        matched =
          typeof fieldValue === 'string' && typeof rule.value === 'string'
            ? fieldValue.toLowerCase().includes((rule.value as string).toLowerCase())
            : false;
        break;
      case 'is_empty':
        matched = fieldValue === null || fieldValue === undefined || fieldValue === '';
        break;
      case 'is_not_empty':
        matched = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        break;
      default:
        matched = false;
    }

    if (matched) {
      return rule.targetPage;
    }
  }

  return defaultNextPage;
}
