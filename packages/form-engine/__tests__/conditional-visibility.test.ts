// Author: Robert Massey | Created: 2026-03-26 | Module: @attune/form-engine tests
import { evaluateConditionalVisibility } from '../src/logic/conditional-visibility';
import type { ConditionalVisibility } from '@attune-sb/shared-types';

describe('evaluateConditionalVisibility', () => {
  it('should return true when visibility is undefined', () => {
    expect(evaluateConditionalVisibility(undefined, {})).toBe(true);
  });

  it('should return true when visibility is disabled', () => {
    const v: ConditionalVisibility = { enabled: false, rules: [] };
    expect(evaluateConditionalVisibility(v, {})).toBe(true);
  });

  it('should return true when rules array is empty', () => {
    const v: ConditionalVisibility = { enabled: true, rules: [] };
    expect(evaluateConditionalVisibility(v, {})).toBe(true);
  });

  it('should pass equals rule correctly', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'status', operator: 'equals', value: 'active' }],
    };
    expect(evaluateConditionalVisibility(v, { status: 'active' })).toBe(true);
    expect(evaluateConditionalVisibility(v, { status: 'inactive' })).toBe(false);
  });

  it('should pass not_equals rule correctly', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'status', operator: 'not_equals', value: 'deleted' }],
    };
    expect(evaluateConditionalVisibility(v, { status: 'active' })).toBe(true);
    expect(evaluateConditionalVisibility(v, { status: 'deleted' })).toBe(false);
  });

  it('should use AND semantics — all rules must pass', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [
        { fieldId: 'type', operator: 'equals', value: 'premium' },
        { fieldId: 'age', operator: 'greater_than', value: 18 },
      ],
    };
    expect(evaluateConditionalVisibility(v, { type: 'premium', age: 25 })).toBe(true);
    expect(evaluateConditionalVisibility(v, { type: 'premium', age: 16 })).toBe(false);
    expect(evaluateConditionalVisibility(v, { type: 'basic', age: 25 })).toBe(false);
  });

  it('should handle contains operator', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'name', operator: 'contains', value: 'john' }],
    };
    expect(evaluateConditionalVisibility(v, { name: 'John Smith' })).toBe(true);
    expect(evaluateConditionalVisibility(v, { name: 'Jane Smith' })).toBe(false);
  });

  it('should handle is_empty operator', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'notes', operator: 'is_empty' }],
    };
    expect(evaluateConditionalVisibility(v, { notes: '' })).toBe(true);
    expect(evaluateConditionalVisibility(v, { notes: null })).toBe(true);
    expect(evaluateConditionalVisibility(v, { notes: undefined })).toBe(true);
    expect(evaluateConditionalVisibility(v, { notes: 'some text' })).toBe(false);
  });

  it('should handle is_not_empty operator', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'notes', operator: 'is_not_empty' }],
    };
    expect(evaluateConditionalVisibility(v, { notes: 'text' })).toBe(true);
    expect(evaluateConditionalVisibility(v, { notes: '' })).toBe(false);
  });

  it('should handle less_than operator', () => {
    const v: ConditionalVisibility = {
      enabled: true,
      rules: [{ fieldId: 'score', operator: 'less_than', value: 50 }],
    };
    expect(evaluateConditionalVisibility(v, { score: 30 })).toBe(true);
    expect(evaluateConditionalVisibility(v, { score: 70 })).toBe(false);
  });
});
