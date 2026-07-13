// Author: Robert Massey | Module: Shared Types / ESLint
module.exports = {
  root: true,
  extends: ['@attune-sb/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['dist/', 'node_modules/', '.eslintrc.js'],
};
