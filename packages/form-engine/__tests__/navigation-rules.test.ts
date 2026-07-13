// Author: Robert Massey | Created: 2026-03-26 | Module: @attune/form-engine tests
import { evaluateNavigationRules } from '../src/logic/navigation-rules';
import type { NavigationRule } from '../src/logic/navigation-rules';

describe('evaluateNavigationRules', () => {
  it('should return defaultNextPage when rules array is empty', () => {
    expect(evaluateNavigationRules([], {}, 2)).toBe(2);
  });

  it('should return target page on first matching equals rule', () => {
    const rules: NavigationRule[] = [
      { id: 'r1', fieldId: 'answer', operator: 'equals', value: 'yes', targetPage: 3 },
      { id: 'r2', fieldId: 'answer', operator: 'equals', value: 'no', targetPage: 5 },
    ];
    expect(evaluateNavigationRules(rules, { answer: 'yes' }, 2)).toBe(3);
    expect(evaluateNavigationRules(rules, { answer: 'no' }, 2)).toBe(5);
  });

  it('should use first-match-wins semantics', () => {
    const rules: NavigationRule[] = [
      { id: 'r1', fieldId: 'val', operator: 'is_not_empty', targetPage: 3 },
      { id: 'r2', fieldId: 'val', operator: 'equals', value: 'specific', targetPage: 7 },
    ];
    // First rule matches because val is not empty, so page 3 (not 7)
    expect(evaluateNavigationRules(rules, { val: 'specific' }, 2)).toBe(3);
  });

  it('should fall through to default when no rule matches', () => {
    const rules: NavigationRule[] = [
      { id: 'r1', fieldId: 'answer', operator: 'equals', value: 'maybe', targetPage: 4 },
    ];
    expect(evaluateNavigationRules(rules, { answer: 'yes' }, 2)).toBe(2);
  });

  it('should handle is_empty operator', () => {
    const rules: NavigationRule[] = [
      { id: 'r1', fieldId: 'notes', operator: 'is_empty', targetPage: 3 },
    ];
    expect(evaluateNavigationRules(rules, { notes: '' }, 2)).toBe(3);
    expect(evaluateNavigationRules(rules, { notes: 'text' }, 2)).toBe(2);
  });

  it('should handle contains operator', () => {
    const rules: NavigationRule[] = [
      { id: 'r1', fieldId: 'category', operator: 'contains', value: 'urgent', targetPage: 5 },
    ];
    expect(evaluateNavigationRules(rules, { category: 'URGENT: fix now' }, 2)).toBe(5);
    expect(evaluateNavigationRules(rules, { category: 'routine' }, 2)).toBe(2);
  });
});
