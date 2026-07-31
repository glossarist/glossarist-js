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
    },
  },
  {
    ignores: [
      'node_modules/',
      'TODO.improvements/',
      'dist/',
      'TODO.*/',
      'TODO.*.md',
      // Hand-maintained declaration files. These retire in Phase 3
      // (TODO 50) once the corresponding .ts sources land. Linting
      // them now produces noise without value.
      '**/*.d.ts',
    ],
  },
);
