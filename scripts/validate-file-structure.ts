#!/usr/bin/env npx ts-node
/* eslint-disable no-magic-numbers, complexity, max-lines */

/**
 * File Structure Validation Script
 *
 * REJECTS files written outside approved directories.
 * ALERTS with clear error messages.
 *
 * This is Layer 1 of the multi-layer enforcement system.
 */

import { readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

interface DirectoryConfig {
  allowed: string[];
  description: string;
}

interface ValidationResult {
  approved: boolean;
  reason?: string;
  suggestion?: string;
}

interface Violation {
  file: string;
  reason: string;
  suggestion: string;
}

/**
 * Approved directory structure.
 * Any file outside these patterns is REJECTED.
 */
const APPROVED_STRUCTURE: Record<string, DirectoryConfig> = {
  // Infrastructure as Code
  infrastructure: {
    allowed: ['**/*.yaml', '**/*.yml', '**/*.tf', '**/*.tfvars', '**/*.json', '**/*.md'],
    description: 'Kubernetes manifests, Terraform IaC, and deployment configs',
  },

  // GitHub Actions workflows
  '.github': {
    allowed: ['**/*.yaml', '**/*.yml', '**/*.md'],
    description: 'GitHub Actions workflows and templates',
  },

  // Rust WASM services
  services: {
    allowed: ['**/*'],
    description: 'Rust/WASM microservices (tax-engine-rs, etc.)',
  },

  // Tax engine - UNTOUCHABLE
  'shared/autoTaxEngine': {
    allowed: [
      '**/*.ts',
      '**/*.md',
      '**/*.json',
      '**/*.js',
      '**/*.wasm',
      '**/*.mjs',
      '**/.gitignore',
    ],
    description: 'Tax engine (PROTECTED - includes Rust WASM module)',
  },

  // Shared contracts and types
  'shared/contracts': {
    allowed: ['**/*.yaml', '**/*.json'],
    description: 'OpenAPI contracts and API schemas',
  },
  'shared/types': {
    allowed: ['**/*.ts'],
    description: 'Shared TypeScript type definitions',
  },
  'shared/models': {
    allowed: ['**/*.model.ts', '**/*.schema.ts'],
    description: 'Domain models and Zod schemas',
  },

  // Design System
  'shared/design-system': {
    allowed: ['**/*.ts', '**/*.tsx', '**/*.css', '**/*.md'],
    description: 'Shared React design system components and tokens',
  },

  // Database
  'shared/schema.ts': {
    allowed: ['schema.ts'],
    description: 'Drizzle database schema',
  },

  // Core modules (backend services)
  'src/modules/auth': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Authentication module',
  },
  'src/modules/deal': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Deal management module',
  },
  'src/modules/tax': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Tax calculation module',
  },
  'src/modules/customer': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Customer management module',
  },
  'src/modules/email': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Email module',
  },
  'src/modules/vehicle': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Vehicle inventory module',
  },

  // Core infrastructure
  'src/core/database': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'Database services and utilities',
  },
  'src/core/logger': {
    allowed: ['**/*.ts'],
    description: 'Structured logging',
  },
  'src/core/http': {
    allowed: ['**/*.ts', '**/*.test.ts'],
    description: 'HTTP middleware and utilities',
  },

  // Gateway/BFF - handled by Go API Gateway in services/api-gateway/
  // No TypeScript gateway needed - all business logic in Go microservices

  // Tests
  'tests/contract': {
    allowed: ['**/*.spec.ts', '**/*.test.ts'],
    description: 'Contract validation tests',
  },
  'tests/integration': {
    allowed: ['**/*.spec.ts', '**/*.test.ts'],
    description: 'Integration tests',
  },
  'tests/e2e': {
    allowed: ['**/*.spec.ts', '**/*.test.ts'],
    description: 'End-to-end tests',
  },
  'tests/unit': {
    allowed: ['**/*.spec.ts', '**/*.test.ts'],
    description: 'Unit tests',
  },
  'tests/autoTaxEngine': {
    allowed: ['**/*.spec.ts', '**/*.test.ts'],
    description: 'Tax engine tests (PROTECTED)',
  },
  'tests/helpers': {
    allowed: ['**/*.ts'],
    description: 'Test utilities and factories',
  },

  // Scripts
  scripts: {
    allowed: ['**/*.ts', '**/*.sh', '**/*.mjs'],
    description: 'Build and validation scripts (TypeScript only)',
  },

  // Docs
  docs: {
    allowed: ['**/*.md', '**/*.png', '**/*.jpg'],
    description: 'Documentation',
  },

  // Database migrations
  migrations: {
    allowed: ['**/*.sql', '**/*.json'],
    description: 'Drizzle database migrations',
  },

  // Public assets
  public: {
    allowed: ['**/*.*'],
    description: 'Public static assets',
  },

  // Client frontend (Vite + React)
  client: {
    allowed: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.css',
      '**/*.html',
      '**/*.json',
      '**/*.svg',
      '**/*.md',
      '**/*.mjs',
      '**/*.js',
    ],
    description: 'Vite + React frontend application (TypeScript only, except config files)',
  },

  // Config files (root level only)
  '.': {
    allowed: [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'tsconfig.strict.json',
      'tsconfig.eslint.json',
      'vite.config.ts',
      'vitest.config.ts',
      'drizzle.config.ts',
      'playwright.config.ts',
      'components.json',
      'postcss.config.js',
      'tailwind.config.js',
      'tailwind.config.ts',
      'eslint.config.js',
      '.env',
      '.env.example',
      '.eslintrc.json',
      '.prettierrc.json',
      '.lintstagedrc.json',
      '.gitignore',
      'README.md',
      'CLAUDE.md',
      'ARCHITECTURE.md',
      'ARCHITECTURE_RULES.md',
      'AGENT_WORKFLOW_GUIDE.md',
      'MANDATORY_SESSION_START.md',
      'CHANGELOG.md',
      'WEEK2_PLAN.md',
      'DESIGN_SYSTEM_OVERVIEW.md',
      'RAILWAY_SETUP.md',
      'railway.json',
      'railway.toml',
    ],
    description: 'Root configuration files',
  },
};

/**
 * FORBIDDEN directories.
 * Any files in these directories are REJECTED.
 */
const FORBIDDEN_DIRECTORIES: string[] = [
  'server',
  'src/client',
  'src/server',
  'frontend/src/modules', // Modules belong in src/modules
  'backend',
  'api',
  // 'services' is now ALLOWED for Rust/WASM microservices
  // 'client' is ALLOWED for the Vite+React frontend application
];

/**
 * Check if a file path matches approved patterns.
 */
function isFileApproved(filePath: string): ValidationResult {
  const relativePath = relative(ROOT_DIR, filePath);
  const parts = relativePath.split(sep);

  // Check if in forbidden directory
  for (const forbidden of FORBIDDEN_DIRECTORIES) {
    if (relativePath.startsWith(forbidden + sep) || relativePath === forbidden) {
      return {
        approved: false,
        reason: `FORBIDDEN DIRECTORY: ${forbidden}`,
        suggestion: getForbiddenSuggestion(forbidden),
      };
    }
  }

  // Check if in approved structure
  for (const [approvedDir, config] of Object.entries(APPROVED_STRUCTURE)) {
    if (
      relativePath.startsWith(approvedDir + sep) ||
      relativePath === approvedDir ||
      (approvedDir === '.' && !relativePath.includes(sep))
    ) {
      // Check if file matches allowed patterns
      const fileName = parts[parts.length - 1];
      const isAllowed = config.allowed.some((pattern: string) => {
        if (pattern === '**/*' || pattern === '**/*.*') return true;
        if (pattern.startsWith('**/.')) {
          // Handle patterns like **/.gitignore
          const specificFile = pattern.slice(3);
          return fileName === specificFile;
        }
        if (pattern.startsWith('**/*.')) {
          const ext = pattern.slice(4);
          return fileName.endsWith(ext);
        }
        return fileName === pattern || relativePath === pattern;
      });

      if (isAllowed) {
        return { approved: true };
      } else {
        return {
          approved: false,
          reason: `File type not allowed in ${approvedDir}`,
          suggestion: `Allowed patterns: ${config.allowed.join(', ')}`,
        };
      }
    }
  }

  // Not in any approved directory
  return {
    approved: false,
    reason: 'File not in approved directory structure',
    suggestion: getDirectorySuggestion(relativePath),
  };
}

/**
 * Get suggestion for forbidden directory.
 */
function getForbiddenSuggestion(forbidden: string): string {
  const suggestions: Record<string, string> = {
    client: 'Client code has been removed. Use gateway/ or src/modules/ instead.',
    server: 'Server code has been removed. Use src/modules/ for business logic.',
    'frontend/src/modules': 'Modules belong in src/modules/, not frontend/src/modules/',
    backend: 'Use src/modules/ for backend services.',
    api: 'Use gateway/ for API gateway or src/modules/ for service logic.',
    services: 'Use src/modules/ for service implementations.',
  };
  return suggestions[forbidden] || `Do not create files in ${forbidden}/`;
}

/**
 * Get suggestion for where file should go.
 */
function getDirectorySuggestion(filePath: string): string {
  if (filePath.includes('auth') || filePath.includes('login')) {
    return 'Auth code belongs in src/modules/auth/';
  }
  if (filePath.includes('deal')) {
    return 'Deal code belongs in src/modules/deal/';
  }
  if (filePath.includes('tax')) {
    return 'Tax code belongs in src/modules/tax/ or shared/autoTaxEngine/';
  }
  if (filePath.includes('customer')) {
    return 'Customer code belongs in src/modules/customer/';
  }
  if (filePath.includes('email')) {
    return 'Email code belongs in src/modules/email/';
  }
  if (filePath.includes('vehicle') || filePath.includes('inventory')) {
    return 'Vehicle code belongs in src/modules/vehicle/';
  }
  if (filePath.includes('database') || filePath.includes('db')) {
    return 'Database code belongs in src/core/database/';
  }
  if (filePath.includes('log')) {
    return 'Logging code belongs in src/core/logger/';
  }
  if (filePath.includes('test') || filePath.includes('spec')) {
    return 'Tests belong in tests/contract/, tests/integration/, or tests/e2e/';
  }
  if (filePath.includes('contract') || filePath.includes('api')) {
    return 'API contracts belong in shared/contracts/';
  }
  if (filePath.endsWith('.ts') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
    return 'TypeScript files belong in src/modules/, src/core/, or shared/';
  }
  return 'Check ARCHITECTURE_RULES.md for approved directory structure.';
}

/**
 * Recursively scan directory for violations.
 */
function scanDirectory(dir: string, violations: Violation[] = []): Violation[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      // Skip node_modules, .git, dist, build, and tool config dirs
      if (
        entry === 'node_modules' ||
        entry === '.git' ||
        entry === 'dist' ||
        entry === 'build' ||
        entry === '.next' ||
        entry === '.turbo' ||
        entry === 'coverage' ||
        entry === '.claude' ||
        entry === '.husky' ||
        entry === '.vscode' ||
        entry === '.idea'
      ) {
        continue;
      }

      if (stat.isDirectory()) {
        scanDirectory(fullPath, violations);
      } else if (stat.isFile()) {
        const result = isFileApproved(fullPath);
        if (!result.approved) {
          violations.push({
            file: relative(ROOT_DIR, fullPath),
            reason: result.reason || 'Unknown reason',
            suggestion: result.suggestion || 'No suggestion available',
          });
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error scanning directory ${dir}:`, errorMessage);
  }

  return violations;
}

/**
 * Main validation function.
 */
function validateFileStructure(): boolean {
  console.log(`${colors.bold}${colors.blue}FILE STRUCTURE VALIDATION${colors.reset}`);
  console.log('Scanning for files outside approved directories...\n');

  const violations = scanDirectory(ROOT_DIR);

  if (violations.length === 0) {
    console.log(`${colors.green}${colors.bold}✓ ALL FILES IN APPROVED LOCATIONS${colors.reset}`);
    console.log(`${colors.green}No violations found.${colors.reset}\n`);
    return true;
  }

  console.log(`${colors.red}${colors.bold}✗ FILE STRUCTURE VIOLATIONS DETECTED${colors.reset}`);
  console.log(`${colors.red}Found ${violations.length} violation(s):\n${colors.reset}`);

  violations.forEach((violation, index) => {
    console.log(`${colors.bold}${index + 1}. ${violation.file}${colors.reset}`);
    console.log(`   ${colors.red}Reason: ${violation.reason}${colors.reset}`);
    console.log(`   ${colors.yellow}Suggestion: ${violation.suggestion}${colors.reset}\n`);
  });

  console.log(
    `${colors.red}${colors.bold}BUILD FAILED: Fix file structure violations${colors.reset}`
  );
  console.log(
    `${colors.yellow}Refer to ARCHITECTURE_RULES.md for approved structure.${colors.reset}\n`
  );

  return false;
}

/**
 * Print approved structure (for reference).
 */
function printApprovedStructure(): void {
  console.log(`${colors.bold}${colors.blue}APPROVED DIRECTORY STRUCTURE${colors.reset}\n`);

  for (const [dir, config] of Object.entries(APPROVED_STRUCTURE)) {
    console.log(`${colors.green}${dir}/${colors.reset}`);
    console.log(`  ${colors.blue}Description:${colors.reset} ${config.description}`);
    console.log(`  ${colors.blue}Allowed:${colors.reset} ${config.allowed.join(', ')}\n`);
  }

  console.log(`${colors.bold}${colors.red}FORBIDDEN DIRECTORIES${colors.reset}`);
  FORBIDDEN_DIRECTORIES.forEach((dir) => {
    console.log(`  ${colors.red}✗ ${dir}/${colors.reset}`);
  });
  console.log();
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.bold}File Structure Validation Script${colors.reset}

${colors.bold}Usage:${colors.reset}
  npx ts-node scripts/validate-file-structure.ts [options]

${colors.bold}Options:${colors.reset}
  --help, -h     Show this help message
  --list, -l     List approved directory structure

${colors.bold}Exit Codes:${colors.reset}
  0              All files in approved locations
  1              Violations detected

${colors.bold}Description:${colors.reset}
  Scans the codebase for files outside approved directories.
  REJECTS files in forbidden locations.
  ALERTS with clear error messages and suggestions.

  This is Layer 1 of the multi-layer enforcement system.
`);
  process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
  printApprovedStructure();
  process.exit(0);
}

// Run validation
const isValid = validateFileStructure();
process.exit(isValid ? 0 : 1);
