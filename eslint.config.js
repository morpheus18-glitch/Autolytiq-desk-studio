import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

/**
 * ESLint Configuration - LAYER 2 ENFORCEMENT
 *
 * This configuration physically rejects:
 * - 'any' types
 * - Missing error handling
 * - Circular dependencies
 * - Cross-module imports
 * - Business logic in contracts
 * - Console.log statements
 * - Excessive complexity
 *
 * Part of the multi-layer enforcement system.
 */

export default [
  // ============================================
  // BASE CONFIGURATION
  // ============================================
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
    },
    rules: {
      // ============================================
      // LAYER 2: ARCHITECTURAL ENFORCEMENT
      // ============================================

      // NO 'any' TYPES - Force explicit typing
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // REQUIRE EXPLICIT RETURN TYPES
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],

      // NO UNUSED VARIABLES - Keep codebase clean
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // REQUIRE NULL CHECKS
      '@typescript-eslint/no-non-null-assertion': 'error',

      // ENFORCE CONSISTENT TYPE IMPORTS
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      // PREVENT FLOATING PROMISES - All promises must be handled
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // NAMING CONVENTIONS
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],

      // COMPLEXITY LIMITS - Prevent spaghetti code
      'complexity': ['error', 15],
      'max-depth': ['error', 4],
      'max-lines': ['error', 500],
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],

      // NO CIRCULAR DEPENDENCIES
      'import/no-cycle': 'error',

      // PREVENT CONSOLE.LOG IN PRODUCTION CODE
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      // REQUIRE EXPLICIT COMPARISONS
      'eqeqeq': ['error', 'always'],

      // NO MAGIC NUMBERS
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
    },
  },

  // ============================================
  // TAX ENGINE - PROTECTED FILES
  // ============================================
  {
    files: ['shared/autoTaxEngine/**/*.ts'],
    rules: {
      // Relax rules for legacy tax engine
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'complexity': 'off',
    },
  },

  // ============================================
  // TESTS - More lenient rules
  // ============================================
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // ============================================
  // CONFIG FILES - Allow default exports
  // ============================================
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'drizzle.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // ============================================
  // MODULES - Strict architectural rules
  // ============================================
  {
    files: ['src/modules/**/*.ts'],
    rules: {
      // ENFORCE MODULE BOUNDARIES
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../*'],
              message: 'Do not import from parent directories. Use absolute imports or barrel exports.',
            },
            {
              group: ['src/modules/*/internal/*'],
              message: "Do not import from other module's internal directory. Use public API.",
            },
          ],
        },
      ],
    },
  },

  // ============================================
  // GATEWAY - Orchestration layer rules
  // ============================================
  {
    files: ['gateway/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['shared/schema'],
              message: 'Gateway should not directly import database schema. Use module services.',
            },
          ],
        },
      ],
    },
  },

  // ============================================
  // SHARED CONTRACTS - No business logic
  // ============================================
  {
    files: ['shared/contracts/**/*.ts', 'shared/types/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Contracts should only contain types, not functions.',
        },
        {
          selector: 'ClassDeclaration',
          message: 'Contracts should only contain types, not classes.',
        },
      ],
    },
  },

  // ============================================
  // IGNORE PATTERNS
  // ============================================
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      'migrations/**',
      'public/**',
      '**/*.js',
      '**/*.mjs',
      '!eslint.config.js',
      '!*.config.js',
    ],
  },
];
