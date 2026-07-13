// Author: Robert Massey | Created: 2026-05-27 | Module: Auth
// Purpose: NIST SP 800-63B compliant password policy checker.
// No complexity rules (NIST explicitly discourages them) — just length, blocklist,
// and context-aware checks (username/name inclusion).

export interface PasswordPolicyResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// Top-200 most frequently breached passwords (NIST recommended blocklist subset).
// Checked case-insensitively so "Password123" still matches "password123".
const COMMON_PASSWORDS = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '0987654321',
  'password',
  'password1',
  'password2',
  'password123',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  'p4ssword',
  'pa$$word',
  'pass1234',
  'pass@123',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abc123',
  'iloveyou',
  'letmein',
  'letmein1',
  'monkey',
  'dragon',
  'master',
  'welcome',
  'welcome1',
  'login',
  'admin',
  'admin123',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'baseball1',
  'soccer',
  'batman',
  'superman',
  'trustno1',
  'shadow',
  'michael',
  'jessica',
  'hunter',
  'ranger',
  'hockey',
  'mustang',
  'access',
  'flower',
  'starwars',
  'matrix',
  'hello',
  'freedom',
  'whatever',
  'cheese',
  'charlie',
  'donald',
  'changeme',
  'newpassword',
  'secure',
  'temp',
  'temp1234',
  'test',
  'test1234',
  'test@123',
  'testing',
  'testing123',
  'winter2024',
  'spring2024',
  'summer2024',
  'fall2024',
  'autumn2024',
  'winter2025',
  'spring2025',
  'summer2025',
  'fall2025',
  'autumn2025',
  'winter2026',
  'spring2026',
  'summer2026',
  'fall2026',
  'autumn2026',
  'january',
  'february',
  'march',
  'april',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'company',
  'company123',
  'work',
  'work123',
  'office',
  'office123',
  'attune',
  'attune123',
  'smartforms',
  'forms123',
  'attuneIT',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '000000',
  '112233',
  '121212',
  'aaaaaa',
  'ababab',
  'abcdef',
  'abcabc',
]);

/**
 * Enforces NIST SP 800-63B password rules.
 *
 * Rules:
 *   1. Length: 12–128 characters.
 *   2. Not on the common-passwords blocklist.
 *   3. Does not contain the user's login identifier, first name, or last name (≥3 chars).
 *
 * Intentionally no complexity requirements (mixed case, numbers, symbols) — NIST
 * research shows complexity rules weaken security by producing predictable patterns.
 */
export function checkPasswordPolicy(
  newPassword: string,
  context?: {
    readonly username?: string | null;
    readonly firstName?: string;
    readonly lastName?: string;
  },
): PasswordPolicyResult {
  const errors: string[] = [];
  const lower = newPassword.toLowerCase();

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  if (newPassword.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`);
  }

  if (COMMON_PASSWORDS.has(lower)) {
    errors.push(
      'This password appears on a list of commonly used passwords. Please choose a more unique one.',
    );
  }

  if (
    context?.username &&
    context.username.length >= 3 &&
    lower.includes(context.username.toLowerCase())
  ) {
    errors.push('Password cannot contain your username.');
  }

  if (
    context?.firstName &&
    context.firstName.length >= 3 &&
    lower.includes(context.firstName.toLowerCase())
  ) {
    errors.push('Password cannot contain your first name.');
  }

  if (
    context?.lastName &&
    context.lastName.length >= 3 &&
    lower.includes(context.lastName.toLowerCase())
  ) {
    errors.push('Password cannot contain your last name.');
  }

  return { valid: errors.length === 0, errors };
}
