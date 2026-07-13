// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / Tests
// Real-world label variants: abbreviations, item numbers, parenthetical
// qualifiers, threshold triage, and duplicate-candidate downgrade.

import type { LabelCandidate } from './extract';
import {
  THRESHOLD_AUTO_ACCEPT,
  detectAnswerOptionLabel,
  fuzzyMatchFields,
  normalizeLabel,
} from './fuzzy-match';

function candidate(text: string, overrides: Partial<LabelCandidate> = {}): LabelCandidate {
  return {
    text,
    page: 0,
    x: 50,
    y: 100,
    width: 80,
    height: 12,
    isCheckbox: false,
    ...overrides,
  };
}

describe('normalizeLabel', () => {
  it('expands common abbreviations', () => {
    expect(normalizeLabel('DOB')).toBe('date of birth');
    expect(normalizeLabel('Emp. No.')).toBe('employee number');
    expect(normalizeLabel('SSN')).toBe('social security number');
  });

  it('strips leading item numbers but keeps ordinals', () => {
    expect(normalizeLabel('1. Are aisles clear?')).toBe('are aisles clear');
    expect(normalizeLabel('12 Tire tread')).toBe('tire tread');
    expect(normalizeLabel('2nd Driver')).toBe('second driver');
  });

  it('strips parenthetical qualifiers and punctuation', () => {
    expect(normalizeLabel('Tread depth (sufficient depth)')).toBe('tread depth');
    expect(normalizeLabel('Name: ______')).toBe('name');
  });
});

describe('fuzzyMatchFields', () => {
  it('auto-accepts exact label matches', () => {
    const results = fuzzyMatchFields(
      [candidate('Full Name:'), candidate('Email Address:')],
      [
        { id: 'f1', label: 'Full Name', type: 'text' },
        { id: 'f2', label: 'Email Address', type: 'email' },
      ],
    );
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(THRESHOLD_AUTO_ACCEPT);
      expect(r.status).toBe('auto_accept');
    }
  });

  it('matches abbreviated PDF labels against verbose field labels', () => {
    const results = fuzzyMatchFields(
      [candidate('Emp. No.')],
      [{ id: 'f1', label: 'Employee Number', type: 'text' }],
    );
    expect(results).toHaveLength(1);
    expect(results[0].candidate.text).toBe('Emp. No.');
    expect(results[0].status).toBe('auto_accept');
  });

  it('drops candidates below the review threshold', () => {
    const results = fuzzyMatchFields(
      [candidate('Vehicle Identification')],
      [{ id: 'f1', label: 'Favorite Color', type: 'text' }],
    );
    expect(results).toHaveLength(0);
  });

  it('downgrades to review when two fields match the same candidate', () => {
    const shared = candidate('Name:');
    const results = fuzzyMatchFields(
      [shared],
      [
        { id: 'f1', label: 'Name', type: 'text' },
        { id: 'f2', label: 'Name', type: 'text' },
      ],
    );
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.status).toBe('review');
    }
  });

  it('ignores checkbox candidates for label matching', () => {
    const results = fuzzyMatchFields(
      [candidate('☐', { isCheckbox: true })],
      [{ id: 'f1', label: 'Anything', type: 'text' }],
    );
    expect(results).toHaveLength(0);
  });
});

describe('detectAnswerOptionLabel', () => {
  it('maps yes/no/na variants including pass/fail', () => {
    expect(detectAnswerOptionLabel('YES')).toBe('yes');
    expect(detectAnswerOptionLabel('Pass')).toBe('yes');
    expect(detectAnswerOptionLabel('FAIL')).toBe('no');
    expect(detectAnswerOptionLabel('N/A')).toBe('na');
    expect(detectAnswerOptionLabel('Not Applicable')).toBe('na');
    expect(detectAnswerOptionLabel('Comments')).toBeNull();
  });
});
