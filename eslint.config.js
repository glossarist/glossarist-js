import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-nocheck': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      }],
      'no-restricted-syntax': ['error', {
        selector: "ImportDeclaration[source.value='.js']",
        message: "Do not add .js extension to relative imports — TypeScript handles extension resolution.",
      }],
    },
  },
  {
    files: ['src/**/*.js'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'Program',
        message: "New source files in src/ must be .ts, not .js. Phase 4 of TS migration enforces TS-only.",
      }],
    },
  },
  {
    ignores: [
      'node_modules/',
      'TODO.improvements/',
      'dist/',
      'TODO.*/',
      'TODO.*.md',
      '**/*.d.ts',
    ],
  },
);
