#!/usr/bin/env tsx
/**
 * CI Validation Script
 *
 * Validates codebase against architectural rules.
 * Can be run locally or in CI pipeline.
 *
 * Usage:
 *   npm run ci-validate
 *   tsx scripts/ci-validation.ts
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

class CIValidator {
  private results: ValidationResult[] = [];
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
  }

  /**
   * Run all validation checks
   */
  async validate(): Promise<boolean> {
    console.log('🔍 Running CI validation checks...\n');

    // Run all checks
    this.checkTypeScript();
    this.checkESLint();
    this.checkPrettier();
    this.checkAnyTypes();
    this.checkModuleBoundaries();
    this.checkCircularDependencies();
    this.checkFileSize();
    this.checkImportPaths();

    // Print results
    this.printResults();

    // Return overall status
    const allPassed = this.results.every((r) => r.passed);
    return allPassed;
  }

  /**
   * Check TypeScript strict mode
   */
  private checkTypeScript(): void {
    console.log('📘 Checking TypeScript strict mode...');
    const result: ValidationResult = {
      name: 'TypeScript Strict Mode',
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      execSync('npm run typecheck', { stdio: 'pipe', encoding: 'utf-8' });
      console.log('✅ TypeScript check passed\n');
    } catch (error: any) {
      result.passed = false;
      result.errors.push('TypeScript errors detected');
      if (error.stdout) {
        result.errors.push(error.stdout.toString());
      }
      console.log('❌ TypeScript check failed\n');
    }

    this.results.push(result);
  }

  /**
   * Check ESLint
   */
  private checkESLint(): void {
    console.log('📐 Checking ESLint...');
    const result: ValidationResult = {
      name: 'ESLint',
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      execSync('npm run lint', { stdio: 'pipe', encoding: 'utf-8' });
      console.log('✅ ESLint check passed\n');
    } catch (error: any) {
      result.passed = false;
      result.errors.push('ESLint violations detected');
      if (error.stdout) {
        result.errors.push(error.stdout.toString());
      }
      console.log('❌ ESLint check failed\n');
    }

    this.results.push(result);
  }

  /**
   * Check Prettier
   */
  private checkPrettier(): void {
    console.log('🎨 Checking Prettier...');
    const result: ValidationResult = {
      name: 'Prettier',
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      execSync('npm run format', { stdio: 'pipe', encoding: 'utf-8' });
      console.log('✅ Prettier check passed\n');
    } catch (error: any) {
      result.passed = false;
      result.errors.push('Formatting issues detected');
      if (error.stdout) {
        result.errors.push(error.stdout.toString());
      }
      console.log('❌ Prettier check failed\n');
    }

    this.results.push(result);
  }

  /**
   * Check for 'any' types in new architecture
   */
  private checkAnyTypes(): void {
    console.log('🚫 Checking for \'any\' types in new architecture...');
    const result: ValidationResult = {
      name: 'No Any Types',
      passed: true,
      errors: [],
      warnings: [],
    };

    const strictDirs = ['src/modules', 'src/core', 'shared/models'];
    const anyPattern = /:\s*any\b|<any>|any\[\]|Array<any>|Record<[^,]*any/;

    strictDirs.forEach((dir) => {
      const fullPath = join(this.rootDir, dir);
      if (!existsSync(fullPath)) return;

      this.scanDirectory(fullPath, (file) => {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
        if (file.includes('.test.') || file.includes('.spec.')) return;

        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (anyPattern.test(line)) {
            const relativePath = relative(this.rootDir, file);
            result.errors.push(
              `${relativePath}:${index + 1} - 'any' type found: ${line.trim()}`
            );
            result.passed = false;
          }
        });
      });
    });

    if (result.passed) {
      console.log('✅ No \'any\' types in strict directories\n');
    } else {
      console.log('❌ Found \'any\' types in strict directories\n');
    }

    this.results.push(result);
  }

  /**
   * Check module boundaries
   */
  private checkModuleBoundaries(): void {
    console.log('🏛️ Checking module boundaries...');
    const result: ValidationResult = {
      name: 'Module Boundaries',
      passed: true,
      errors: [],
      warnings: [],
    };

    const modulesDir = join(this.rootDir, 'src/modules');
    if (!existsSync(modulesDir)) {
      console.log('⚠️ No modules directory found\n');
      this.results.push(result);
      return;
    }

    // Pattern for cross-module internal imports
    // Matches: from 'src/modules/auth/services/...'
    // Should be: from 'src/modules/auth'
    const crossModulePattern = /from\s+['"].*\/modules\/([^'"\/]+)\/([^'"]+)['"]/;

    this.scanDirectory(modulesDir, (file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const match = crossModulePattern.exec(line);
        if (match && !line.includes('./')) {
          // Check if it's importing from another module's internals
          const moduleName = match[1];
          const internalPath = match[2];

          // Allow importing from the same module's index
          if (!file.includes(`/modules/${moduleName}/`) || internalPath !== '') {
            const relativePath = relative(this.rootDir, file);
            result.errors.push(
              `${relativePath}:${index + 1} - Cross-module internal import: ${line.trim()}`
            );
            result.passed = false;
          }
        }
      });
    });

    if (result.passed) {
      console.log('✅ Module boundaries respected\n');
    } else {
      console.log('❌ Module boundary violations detected\n');
    }

    this.results.push(result);
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(): void {
    console.log('🔄 Checking for circular dependencies...');
    const result: ValidationResult = {
      name: 'Circular Dependencies',
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if madge is available
      execSync('npx madge --version', { stdio: 'pipe' });

      // Run madge on source directories
      const dirs = ['src', 'client', 'server', 'shared'].filter((dir) =>
        existsSync(join(this.rootDir, dir))
      );

      dirs.forEach((dir) => {
        try {
          const output = execSync(
            `npx madge --circular --extensions ts,tsx ${dir}`,
            { encoding: 'utf-8' }
          );

          if (output.includes('✖')) {
            result.passed = false;
            result.errors.push(`Circular dependencies found in ${dir}/`);
            result.errors.push(output);
          }
        } catch (error: any) {
          if (error.stdout && error.stdout.includes('✖')) {
            result.passed = false;
            result.errors.push(`Circular dependencies found in ${dir}/`);
            result.errors.push(error.stdout.toString());
          }
        }
      });

      if (result.passed) {
        console.log('✅ No circular dependencies\n');
      } else {
        console.log('❌ Circular dependencies detected\n');
      }
    } catch {
      result.warnings.push('madge not available - skipping check');
      console.log('⚠️ madge not available - skipping check\n');
    }

    this.results.push(result);
  }

  /**
   * Check file sizes
   */
  private checkFileSize(): void {
    console.log('📏 Checking file sizes...');
    const result: ValidationResult = {
      name: 'File Size',
      passed: true,
      errors: [],
      warnings: [],
    };

    const maxLines = 500;
    const dirs = ['src', 'client/src', 'server', 'shared'];

    dirs.forEach((dir) => {
      const fullPath = join(this.rootDir, dir);
      if (!existsSync(fullPath)) return;

      this.scanDirectory(fullPath, (file) => {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

        const content = readFileSync(file, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount > maxLines) {
          const relativePath = relative(this.rootDir, file);
          result.warnings.push(
            `${relativePath} has ${lineCount} lines (max: ${maxLines})`
          );
        }
      });
    });

    if (result.warnings.length === 0) {
      console.log('✅ All files within size limits\n');
    } else {
      console.log(`⚠️ ${result.warnings.length} files exceed size limit\n`);
    }

    this.results.push(result);
  }

  /**
   * Check import paths
   */
  private checkImportPaths(): void {
    console.log('🔗 Checking import paths...');
    const result: ValidationResult = {
      name: 'Import Paths',
      passed: true,
      errors: [],
      warnings: [],
    };

    const dirs = ['src', 'client/src', 'server'];
    const relativeParentPattern = /from\s+['"]\.\.\/.*['"]/;

    dirs.forEach((dir) => {
      const fullPath = join(this.rootDir, dir);
      if (!existsSync(fullPath)) return;

      this.scanDirectory(fullPath, (file) => {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (relativeParentPattern.test(line)) {
            const relativePath = relative(this.rootDir, file);
            result.warnings.push(
              `${relativePath}:${index + 1} - Relative parent import: ${line.trim()}`
            );
          }
        });
      });
    });

    if (result.warnings.length === 0) {
      console.log('✅ All import paths are clean\n');
    } else {
      console.log(`⚠️ ${result.warnings.length} relative parent imports found\n`);
    }

    this.results.push(result);
  }

  /**
   * Scan directory recursively
   */
  private scanDirectory(dir: string, callback: (file: string) => void): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir);

    entries.forEach((entry) => {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        this.scanDirectory(fullPath, callback);
      } else if (stat.isFile()) {
        callback(fullPath);
      }
    });
  }

  /**
   * Print validation results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CI VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    this.results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);

      if (result.errors.length > 0) {
        totalErrors += result.errors.length;
        console.log('   Errors:');
        result.errors.slice(0, 5).forEach((error) => {
          console.log(`   - ${error}`);
        });
        if (result.errors.length > 5) {
          console.log(`   ... and ${result.errors.length - 5} more errors`);
        }
      }

      if (result.warnings.length > 0) {
        totalWarnings += result.warnings.length;
        console.log('   Warnings:');
        result.warnings.slice(0, 3).forEach((warning) => {
          console.log(`   - ${warning}`);
        });
        if (result.warnings.length > 3) {
          console.log(`   ... and ${result.warnings.length - 3} more warnings`);
        }
      }

      console.log();
    });

    console.log('='.repeat(80));
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);

    const passedCount = this.results.filter((r) => r.passed).length;
    const failedCount = this.results.length - passedCount;

    console.log(`Passed: ${passedCount}/${this.results.length}`);
    console.log(`Failed: ${failedCount}/${this.results.length}`);
    console.log('='.repeat(80) + '\n');

    if (failedCount === 0) {
      console.log('🎉 All validation checks passed!\n');
    } else {
      console.log('❌ Some validation checks failed. Fix errors before committing.\n');
    }
  }
}

// Run validation
const validator = new CIValidator();
validator.validate().then((success) => {
  process.exit(success ? 0 : 1);
});
