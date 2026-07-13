// Author: Robert Massey | Module: Web / ESLint
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
  },
  ignorePatterns: ['node_modules/', '.next/', 'coverage/'],
};
