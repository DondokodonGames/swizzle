/* eslint-env node */
// ESLint 8.x classic config (flat config not used; ESLint 8.57.x).
// Baseline goal (WP31): establish a "currently green" line so that NEW
// violations are detected without forcing a large refactor. Several rules are
// intentionally relaxed to `warn` or `off` — see docs/work-plans/logs for the
// inventory. Tighten these in a later cleanup work-package (WP33).
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    // --- React ---
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // --- Relaxed to warn for the baseline (existing violations) ---
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-empty-interface': 'warn',
    'no-empty': 'warn',
    'no-constant-condition': ['warn', { checkLoops: false }],
    'no-async-promise-executor': 'warn',
    'no-prototype-builtins': 'warn',
    'no-useless-escape': 'warn',
    'no-control-regex': 'warn',
    'no-case-declarations': 'warn',
    'no-fallthrough': 'warn',
    // Existing duplicate-case in a feedback switch (LogicRepairer) is a known
    // smell left for WP33; warn so it surfaces without blocking the baseline.
    'no-duplicate-case': 'warn',
    // Full-width spaces (U+3000) appear intentionally inside Japanese prompt
    // template literals; don't flag them there (would corrupt prompt content).
    'no-irregular-whitespace': [
      'error',
      { skipStrings: true, skipTemplates: true, skipComments: true },
    ],

    // --- Disabled: low-value style noise for this baseline ---
    '@typescript-eslint/no-inferrable-types': 'off',

    // --- Disabled: handled by TypeScript / tsconfig or too noisy for baseline ---
    'no-undef': 'off', // TypeScript handles this; avoids false positives on globals
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': 'warn',
  },
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    '*.config.ts',
    '*.config.js',
    'vite.config.ts',
    'scripts/**',
  ],
  overrides: [
    {
      // Test files: relax rules that commonly appear in test setups.
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', 'src/test/**'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
