import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Focus linting on our TypeScript source & tests only (skip dist, build artifacts, node_modules)
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'build/**',
      'public/**',
      'node_modules/**',
      '*.config.*',
      'scripts/**' // scripts are utility; exclude to cut noise for now
    ]
  },
  {
    files: ['server/**/*.ts', 'client/src/**/*.ts', 'client/src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        Audio: 'readonly',
        CustomEvent: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // temporarily off to reduce noise
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
);
