const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.expo/**', 'test-results/**', 'playwright-report/**'],
  },
  {
    // Playwright fixtures call `use()`, which is not React's hook.
    files: ['e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    ignores: ['scripts/web/sw.template.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/web/sw.template.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
]);
