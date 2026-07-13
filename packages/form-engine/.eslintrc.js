// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
module.exports = {
  root: true,
  extends: ['@attune-sb/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules', 'jest.config.js', '.eslintrc.js', '__tests__'],
};
