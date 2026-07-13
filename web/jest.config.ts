// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Jest Config
// Purpose: Component test config via next/jest — SWC transform, CSS/module
// mocks, and the @/ path alias mirrored from tsconfig.

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/app/**/layout.tsx'],
};

export default createJestConfig(config);
