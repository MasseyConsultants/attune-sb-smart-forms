module.exports = {
  extends: ['@attune-sb/eslint-config'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  root: true,
  env: {
    node: true,
    jest: true,
  },
};
