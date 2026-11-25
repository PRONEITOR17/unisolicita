'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      complexity: ['warn', 12],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    rules: { 'max-lines-per-function': 'off' },
  },
  { ignores: ['node_modules/', 'coverage/', 'data/', 'public/'] },
];
