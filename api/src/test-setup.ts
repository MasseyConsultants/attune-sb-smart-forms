// Author: Robert Massey | Created: 2026-07-12 | Module: Test Setup
// Purpose: Deterministic env vars for unit tests — no real secrets, no network.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://attune:attune_dev_password@localhost:5434/attune_sb_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-0000000000000000000000000000';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-00000000000000000000000';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '900';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '604800';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing in tests
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6382';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '0'.repeat(64);
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
