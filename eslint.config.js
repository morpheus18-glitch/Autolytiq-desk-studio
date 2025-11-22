import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import boundaries from 'eslint-plugin-boundaries';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '.next/**',
      'coverage/**',
      '*.config.js',
      'vite.config.ts',
      'vitest.config.*.ts',
      'scripts/**/*.js',
    ],
  },

  // Base JavaScript config
  js.configs.recommended,

  // TypeScript and React files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        NodeJS: 'readonly',
        fetch: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      boundaries,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
      'boundaries/elements': [
        {
          type: 'client',
          pattern: 'client/**/*',
          mode: 'full',
        },
        {
          type: 'server',
          pattern: 'server/**/*',
          mode: 'full',
        },
        {
          type: 'shared',
          pattern: 'shared/**/*',
          mode: 'full',
        },
        {
          type: 'module-public',
          pattern: 'src/modules/*/index.ts',
          mode: 'file',
        },
        {
          type: 'module-internal',
          pattern: 'src/modules/*/**/*',
          mode: 'full',
          capture: ['moduleName'],
        },
        {
          type: 'core',
          pattern: 'src/core/**/*',
          mode: 'full',
        },
        {
          type: 'tests',
          pattern: 'tests/**/*',
          mode: 'full',
        },
      ],
    },
    rules: {
      // TypeScript strictness - FORTRESS MODE
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Import rules - PHYSICAL BOUNDARIES
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@shared/**',
              group: 'internal',
              position: 'after',
            },
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-cycle': 'error',
      'import/no-unresolved': 'error',
      'import/no-relative-parent-imports': 'error',

      // Module boundary enforcement - NO CROSS-MODULE IMPORTS
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'src/modules/*/services/**',
                'src/modules/*/api/**',
                'src/modules/*/components/**',
                'src/modules/*/hooks/**',
                'src/modules/*/types/**',
                'src/modules/*/utils/**',
              ],
              message: "Import from module's public API (src/modules/moduleName) instead of internal paths",
            },
            {
              group: ['**/modules/*/!(index).ts', '**/modules/*/!(index).tsx'],
              message: 'Only import from module index.ts (public API)',
            },
          ],
        },
      ],

      // Boundaries plugin - ARCHITECTURAL FORTRESS
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'client',
              allow: ['client', 'shared', 'module-public', 'core'],
            },
            {
              from: 'server',
              allow: ['server', 'shared', 'module-public', 'core'],
            },
            {
              from: 'shared',
              allow: ['shared'],
            },
            {
              from: 'module-internal',
              allow: ['module-internal', 'shared', 'core', 'server', 'client'],
              message: 'Modules can only import from their own internals, shared, core, server, or client. Import other modules via their public API.',
            },
            {
              from: 'module-public',
              allow: ['module-internal', 'shared', 'core', 'server', 'client'],
            },
            {
              from: 'core',
              allow: ['core', 'shared', 'server'],
            },
            {
              from: 'tests',
              allow: ['client', 'server', 'shared', 'tests', 'module-public', 'module-internal', 'core'],
            },
          ],
        },
      ],
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',

      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Code quality - COMPLEXITY LIMITS
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'max-depth': ['error', 3],
      'max-lines': ['error', 500],
      complexity: ['error', 10],
    },
  },

  // Test files - relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'max-lines': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Server files - allow console
  {
    files: ['server/**/*.ts', 'src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
