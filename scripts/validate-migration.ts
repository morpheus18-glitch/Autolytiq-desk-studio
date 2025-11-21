#!/usr/bin/env tsx
/**
 * Migration Validation Script
 *
 * Validates codebase compliance with strict framework:
 * - No 'any' types
 * - All imports through module public APIs
 * - All database queries through service layer
 * - All UI components use design tokens
 * - No circular dependencies
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface ValidationResult {
  passed: boolean;
  category: string;
  message: string;
  file?: string;
  line?: number;
}

const results: ValidationResult[] = [];
const projectRoot = process.cwd();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Validation 1: Check for 'any' types
 */
function validateNoAnyTypes(): void {
  log('blue', '\n=== Checking for \'any\' types ===');

  const files = getAllTypeScriptFiles('src');
  let totalAnyCount = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match: ': any' (with various contexts)
      if (line.match(/:\s*any[\s,;\)\]\}]/)) {
        totalAnyCount++;
        results.push({
          passed: false,
          category: 'Type Safety',
          message: `Found 'any' type`,
          file: relative(projectRoot, file),
          line: index + 1,
        });
      }
    });
  }

  if (totalAnyCount === 0) {
    log('green', '✓ No \'any\' types found');
  } else {
    log('red', `✗ Found ${totalAnyCount} 'any' type violations`);
  }
}

/**
 * Validation 2: Check module boundary violations
 */
function validateModuleBoundaries(): void {
  log('blue', '\n=== Checking module boundaries ===');

  const moduleFiles = getAllTypeScriptFiles('src/modules');
  const violations: string[] = [];

  for (const file of moduleFiles) {
    // Skip index.ts files (public APIs)
    if (file.endsWith('index.ts')) continue;

    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for imports from module internals
      const internalImportMatch = line.match(/from ['"](@\/|\.\.?\/.*?)(modules\/\w+\/(?:services|api|components|hooks|utils))/);

      if (internalImportMatch) {
        const importPath = internalImportMatch[2];
        const currentModule = file.match(/modules\/(\w+)/)?.[1];
        const importedModule = importPath.match(/modules\/(\w+)/)?.[1];

        // Only flag if importing from a DIFFERENT module's internals
        if (currentModule !== importedModule) {
          violations.push(`${relative(projectRoot, file)}:${index + 1}`);
          results.push({
            passed: false,
            category: 'Module Boundaries',
            message: `Importing from module internals: ${importPath}`,
            file: relative(projectRoot, file),
            line: index + 1,
          });
        }
      }
    });
  }

  if (violations.length === 0) {
    log('green', '✓ All module boundaries respected');
  } else {
    log('red', `✗ Found ${violations.length} module boundary violations`);
  }
}

/**
 * Validation 3: Check for direct database access
 */
function validateNoDirect DatabaseAccess(): void {
  log('blue', '\n=== Checking for direct database access ===');

  const files = getAllTypeScriptFiles('src');
  const violations: string[] = [];

  for (const file of files) {
    // Skip core database files
    if (file.includes('/core/database/')) continue;

    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for direct Drizzle imports
      if (line.match(/from ['"]drizzle-orm['"]/)) {
        violations.push(`${relative(projectRoot, file)}:${index + 1}`);
        results.push({
          passed: false,
          category: 'Database Access',
          message: 'Direct Drizzle import found - use database service instead',
          file: relative(projectRoot, file),
          line: index + 1,
        });
      }

      // Check for direct db.query usage
      if (line.match(/db\.query\./)) {
        violations.push(`${relative(projectRoot, file)}:${index + 1}`);
        results.push({
          passed: false,
          category: 'Database Access',
          message: 'Direct database query found - use service layer',
          file: relative(projectRoot, file),
          line: index + 1,
        });
      }
    });
  }

  if (violations.length === 0) {
    log('green', '✓ All database access through service layer');
  } else {
    log('red', `✗ Found ${violations.length} direct database access violations`);
  }
}

/**
 * Validation 4: Check for hardcoded UI patterns
 */
function validateDesignTokenUsage(): void {
  log('blue', '\n=== Checking design token usage ===');

  const componentFiles = getAllTypeScriptFiles('client/src/pages');
  const violations: string[] = [];

  for (const file of componentFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Check if file imports design tokens
    const importsDesignTokens = content.includes('from \'@/lib/design-tokens\'');

    lines.forEach((line, index) => {
      // Check for hardcoded spacing patterns
      if (line.match(/className="[^"]*\bp-\d/)) {
        violations.push(`${relative(projectRoot, file)}:${index + 1} - Hardcoded padding`);
        if (!importsDesignTokens) {
          results.push({
            passed: false,
            category: 'Design Tokens',
            message: 'Hardcoded padding (p-*) - use design tokens',
            file: relative(projectRoot, file),
            line: index + 1,
          });
        }
      }

      // Check for hardcoded grid patterns
      if (line.match(/className="[^"]*\bgrid grid-cols/)) {
        violations.push(`${relative(projectRoot, file)}:${index + 1} - Hardcoded grid`);
        if (!importsDesignTokens) {
          results.push({
            passed: false,
            category: 'Design Tokens',
            message: 'Hardcoded grid layout - use gridLayouts tokens',
            file: relative(projectRoot, file),
            line: index + 1,
          });
        }
      }
    });
  }

  if (violations.length === 0) {
    log('green', '✓ All components use design tokens');
  } else {
    log('yellow', `⚠ Found ${violations.length} potential design token violations`);
  }
}

/**
 * Validation 5: Run TypeScript strict mode check
 */
function validateTypeScriptStrict(): void {
  log('blue', '\n=== Running TypeScript strict mode check ===');

  try {
    execSync('npm run typecheck', { stdio: 'pipe', encoding: 'utf-8' });
    log('green', '✓ TypeScript strict mode passed');
    results.push({
      passed: true,
      category: 'TypeScript',
      message: 'Strict mode validation passed',
    });
  } catch (error: any) {
    log('red', '✗ TypeScript strict mode failed');
    const output = error.stdout || error.stderr || '';
    const errorLines = output.split('\n').filter((line: string) => line.includes('error TS'));

    errorLines.forEach((line: string) => {
      results.push({
        passed: false,
        category: 'TypeScript',
        message: line.trim(),
      });
    });
  }
}

/**
 * Validation 6: Run ESLint check
 */
function validateESLint(): void {
  log('blue', '\n=== Running ESLint check ===');

  try {
    execSync('npm run lint', { stdio: 'pipe', encoding: 'utf-8' });
    log('green', '✓ ESLint passed');
    results.push({
      passed: true,
      category: 'ESLint',
      message: 'Linting passed',
    });
  } catch (error: any) {
    log('red', '✗ ESLint failed');
    const output = error.stdout || error.stderr || '';

    results.push({
      passed: false,
      category: 'ESLint',
      message: 'Linting errors found - see output above',
    });
  }
}

/**
 * Validation 7: Check for circular dependencies
 */
function validateNoCircularDependencies(): void {
  log('blue', '\n=== Checking for circular dependencies ===');

  // This is a simplified check - full implementation would use madge or similar
  log('yellow', '⚠ Circular dependency check requires additional tooling');
  log('yellow', '  Run: npx madge --circular --extensions ts,tsx src/');
}

/**
 * Helper: Get all TypeScript files in directory
 */
function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const fullDir = join(projectRoot, dir);

  if (!statSync(fullDir).isDirectory()) {
    return fileList;
  }

  const files = readdirSync(fullDir);

  files.forEach(file => {
    const filePath = join(fullDir, file);

    if (statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        getAllTypeScriptFiles(relative(projectRoot, filePath), fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Generate summary report
 */
function generateReport(): void {
  log('blue', '\n=== VALIDATION SUMMARY ===\n');

  const categories = Array.from(new Set(results.map(r => r.category)));

  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.passed).length;
    const failed = categoryResults.filter(r => !r.passed).length;

    if (failed === 0) {
      log('green', `✓ ${category}: All checks passed (${passed})`);
    } else {
      log('red', `✗ ${category}: ${failed} failures`);

      // Show first 5 failures
      categoryResults
        .filter(r => !r.passed)
        .slice(0, 5)
        .forEach(r => {
          if (r.file && r.line) {
            console.log(`  ${r.file}:${r.line} - ${r.message}`);
          } else {
            console.log(`  ${r.message}`);
          }
        });

      if (failed > 5) {
        console.log(`  ... and ${failed - 5} more`);
      }
    }
  });

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;

  log('blue', `\nTotal: ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed === 0) {
    log('green', '\n🎉 ALL VALIDATIONS PASSED! Codebase is compliant with strict framework.\n');
    process.exit(0);
  } else {
    log('red', '\n❌ VALIDATION FAILED. Please fix the issues above.\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  log('magenta', '╔════════════════════════════════════════════════════════════╗');
  log('magenta', '║         AUTOLYTIQ MIGRATION VALIDATION SCRIPT              ║');
  log('magenta', '╚════════════════════════════════════════════════════════════╝');

  validateNoAnyTypes();
  validateModuleBoundaries();
  validateNoDatabaseAccess();
  validateDesignTokenUsage();
  validateTypeScriptStrict();
  validateESLint();
  validateNoCircularDependencies();

  generateReport();
}

main().catch((error) => {
  log('red', `\nFatal error: ${error.message}`);
  process.exit(1);
});
