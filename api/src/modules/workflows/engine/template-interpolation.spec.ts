// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests

import { interpolate, resolvePath } from './template-interpolation';

const STATE = {
  formData: { name: 'Jane Doe', tags: ['a', 'b'], score: 7 },
  _formName: 'Intake',
};

describe('resolvePath', () => {
  it('resolves nested dot paths', () => {
    expect(resolvePath(STATE, 'formData.name')).toBe('Jane Doe');
    expect(resolvePath(STATE, '_formName')).toBe('Intake');
  });

  it('returns undefined for missing paths without throwing', () => {
    expect(resolvePath(STATE, 'formData.missing.deeper')).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('replaces tokens with state values', () => {
    expect(interpolate('Hi {{formData.name}} re {{_formName}}', STATE)).toBe(
      'Hi Jane Doe re Intake',
    );
  });

  it('renders arrays comma-joined and numbers as-is', () => {
    expect(interpolate('{{formData.tags}} / {{formData.score}}', STATE)).toBe('a, b / 7');
  });

  it('renders unknown paths as empty string', () => {
    expect(interpolate('x{{nope.nothing}}y', STATE)).toBe('xy');
  });

  it('renders {{_date}} as an ISO date', () => {
    expect(interpolate('{{_date}}', STATE)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
