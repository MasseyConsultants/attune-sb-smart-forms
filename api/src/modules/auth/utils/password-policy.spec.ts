// Author: Robert Massey | Created: 2026-07-12 | Module: Auth / Tests

import { checkPasswordPolicy, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from './password-policy';

describe('checkPasswordPolicy', () => {
  it('accepts a strong unique passphrase', () => {
    const result = checkPasswordPolicy('correct-horse-battery-staple-42');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects passwords shorter than the minimum length', () => {
    const result = checkPasswordPolicy('a'.repeat(PASSWORD_MIN_LENGTH - 1));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain(`at least ${PASSWORD_MIN_LENGTH}`);
  });

  it('rejects passwords longer than the maximum length', () => {
    const result = checkPasswordPolicy('a'.repeat(PASSWORD_MAX_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain(`not exceed ${PASSWORD_MAX_LENGTH}`);
  });

  it('rejects blocklisted passwords case-insensitively', () => {
    const result = checkPasswordPolicy('Password123');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('commonly used'))).toBe(true);
  });

  it('rejects passwords containing the first name', () => {
    const result = checkPasswordPolicy('xyzRobertxyz12345', { firstName: 'Robert' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('first name'))).toBe(true);
  });

  it('rejects passwords containing the last name', () => {
    const result = checkPasswordPolicy('xyzMasseyxyz12345', { lastName: 'Massey' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('last name'))).toBe(true);
  });

  it('ignores name context shorter than 3 characters', () => {
    const result = checkPasswordPolicy('aliceinwonderland9', { firstName: 'al' });
    expect(result.valid).toBe(true);
  });

  it('collects multiple violations at once', () => {
    const result = checkPasswordPolicy('admin', { firstName: 'Admin' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
