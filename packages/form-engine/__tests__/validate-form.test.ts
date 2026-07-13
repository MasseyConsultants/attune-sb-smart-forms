// Author: Robert Massey | Created: 2026-04-03 | Module: @attune/form-engine
// Tests for the validateForm() pure function.

import { validateForm } from '../src/logic/validate-form';
import type { FieldDefinition } from '@attune-sb/shared-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function field(
  overrides: Partial<FieldDefinition> & { id: string; label: string },
): FieldDefinition {
  return {
    type: 'text',
    required: false,
    config: {},
    sortOrder: 0,
    page: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Required field checks
// ---------------------------------------------------------------------------

describe('validateForm — required fields', () => {
  it('returns no errors for a valid required field', () => {
    const fields = [field({ id: 'name', label: 'Name', required: true })];
    expect(validateForm(fields, { name: 'Alice' })).toEqual({});
  });

  it('returns error when a required field is missing entirely', () => {
    const fields = [field({ id: 'name', label: 'Name', required: true })];
    const errors = validateForm(fields, {});
    expect(errors).toEqual({ name: 'Name is required' });
  });

  it('returns error when a required field is an empty string', () => {
    const fields = [field({ id: 'name', label: 'Name', required: true })];
    const errors = validateForm(fields, { name: '   ' });
    expect(errors).toEqual({ name: 'Name is required' });
  });

  it('returns error when a required field is null', () => {
    const fields = [field({ id: 'name', label: 'Name', required: true })];
    const errors = validateForm(fields, { name: null });
    expect(errors).toEqual({ name: 'Name is required' });
  });

  it('returns error when a required multi-select is an empty array', () => {
    const fields = [field({ id: 'tags', label: 'Tags', type: 'multiselect', required: true })];
    const errors = validateForm(fields, { tags: [] });
    expect(errors).toEqual({ tags: 'Tags is required' });
  });

  it('skips section, pagebreak, and thankyou fields', () => {
    const fields = [
      field({ id: 's1', label: 'Section', type: 'section', required: true }),
      field({ id: 'pb', label: 'Page Break', type: 'pagebreak', required: true }),
      field({ id: 'ty', label: 'Thank You', type: 'thankyou', required: true }),
    ];
    expect(validateForm(fields, {})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Validation rules — minLength / maxLength
// ---------------------------------------------------------------------------

describe('validateForm — minLength / maxLength', () => {
  it('fails minLength', () => {
    const fields = [
      field({
        id: 'bio',
        label: 'Bio',
        validations: [{ type: 'minLength', value: 10, message: 'Too short' }],
      }),
    ];
    expect(validateForm(fields, { bio: 'Hi' })).toEqual({ bio: 'Too short' });
  });

  it('passes minLength', () => {
    const fields = [
      field({
        id: 'bio',
        label: 'Bio',
        validations: [{ type: 'minLength', value: 3, message: 'Too short' }],
      }),
    ];
    expect(validateForm(fields, { bio: 'Hello' })).toEqual({});
  });

  it('fails maxLength', () => {
    const fields = [
      field({
        id: 'bio',
        label: 'Bio',
        validations: [{ type: 'maxLength', value: 5, message: 'Too long' }],
      }),
    ];
    expect(validateForm(fields, { bio: 'Hello World' })).toEqual({ bio: 'Too long' });
  });
});

// ---------------------------------------------------------------------------
// Validation rules — min / max (numeric)
// ---------------------------------------------------------------------------

describe('validateForm — min / max', () => {
  it('fails min', () => {
    const fields = [
      field({
        id: 'age',
        label: 'Age',
        type: 'number',
        validations: [{ type: 'min', value: 18, message: 'Must be 18+' }],
      }),
    ];
    expect(validateForm(fields, { age: 16 })).toEqual({ age: 'Must be 18+' });
  });

  it('passes min', () => {
    const fields = [
      field({
        id: 'age',
        label: 'Age',
        type: 'number',
        validations: [{ type: 'min', value: 18, message: 'Must be 18+' }],
      }),
    ];
    expect(validateForm(fields, { age: 21 })).toEqual({});
  });

  it('fails max', () => {
    const fields = [
      field({
        id: 'score',
        label: 'Score',
        type: 'number',
        validations: [{ type: 'max', value: 100, message: 'Max 100' }],
      }),
    ];
    expect(validateForm(fields, { score: 150 })).toEqual({ score: 'Max 100' });
  });
});

// ---------------------------------------------------------------------------
// Validation rules — pattern
// ---------------------------------------------------------------------------

describe('validateForm — pattern', () => {
  it('fails a bad postal code', () => {
    const fields = [
      field({
        id: 'zip',
        label: 'ZIP',
        validations: [{ type: 'pattern', value: '^\\d{5}$', message: 'Invalid ZIP' }],
      }),
    ];
    expect(validateForm(fields, { zip: 'ABCDE' })).toEqual({ zip: 'Invalid ZIP' });
  });

  it('passes a valid postal code', () => {
    const fields = [
      field({
        id: 'zip',
        label: 'ZIP',
        validations: [{ type: 'pattern', value: '^\\d{5}$', message: 'Invalid ZIP' }],
      }),
    ];
    expect(validateForm(fields, { zip: '90210' })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Validation rules — custom
// ---------------------------------------------------------------------------

describe('validateForm — custom validation type', () => {
  it('always returns the custom message as an error', () => {
    const fields = [
      field({
        id: 'ssn',
        label: 'SSN',
        validations: [{ type: 'custom', value: null, message: 'SSN failed server check' }],
      }),
    ];
    expect(validateForm(fields, { ssn: '123-45-6789' })).toEqual({
      ssn: 'SSN failed server check',
    });
  });

  it('skips custom rule when field is empty and not required', () => {
    const fields = [
      field({
        id: 'ssn',
        label: 'SSN',
        required: false,
        validations: [{ type: 'custom', value: null, message: 'SSN failed' }],
      }),
    ];
    // Empty value → skip all rules
    expect(validateForm(fields, {})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Multiple fields — only first failing rule reported per field
// ---------------------------------------------------------------------------

describe('validateForm — multiple rules per field', () => {
  it('reports only the first failing rule', () => {
    const fields = [
      field({
        id: 'code',
        label: 'Code',
        validations: [
          { type: 'minLength', value: 4, message: 'Too short' },
          { type: 'maxLength', value: 10, message: 'Too long' },
        ],
      }),
    ];
    expect(validateForm(fields, { code: 'AB' })).toEqual({ code: 'Too short' });
  });
});

// ---------------------------------------------------------------------------
// Multiple fields — independent error collection
// ---------------------------------------------------------------------------

describe('validateForm — multiple fields', () => {
  it('collects errors for all invalid fields', () => {
    const fields = [
      field({ id: 'first', label: 'First Name', required: true }),
      field({ id: 'last', label: 'Last Name', required: true }),
      field({
        id: 'bio',
        label: 'Bio',
        validations: [{ type: 'minLength', value: 20, message: 'Bio too short' }],
      }),
    ];
    const errors = validateForm(fields, { first: '', last: '', bio: 'Hi' });
    expect(errors).toEqual({
      first: 'First Name is required',
      last: 'Last Name is required',
      bio: 'Bio too short',
    });
  });
});
