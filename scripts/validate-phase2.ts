#!/usr/bin/env tsx
/**
 * PHASE 2 VALIDATION SCRIPT
 *
 * Validates that all 4 modules are correctly integrated and functional.
 * Run at each checkpoint to ensure quality gates are met.
 *
 * Usage:
 *   npm run validate:phase2
 *   npm run validate:phase2 -- --checkpoint=T+4h
 *   npm run validate:phase2 -- --checkpoint=T+8h
 *   npm run validate:phase2 -- --checkpoint=T+16h
 *   npm run validate:phase2 -- --checkpoint=final
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

const results: ValidationResult[] = [];

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(name: string, passed: boolean, message: string, critical = false) {
  results.push({ name, passed, message, critical });

  if (passed) {
    log(`  ✅ ${name}: ${message}`, 'green');
  } else if (critical) {
    log(`  ❌ ${name}: ${message}`, 'red');
  } else {
    log(`  ⚠️  ${name}: ${message}`, 'yellow');
  }
}

// ============================================================================
// FILE STRUCTURE VALIDATION
// ============================================================================

async function validateFileStructure() {
  log('\n📁 Validating File Structure...', 'blue');

  const requiredStructure = [
    // Customer module
    { path: 'src/modules/customer/services/customer.service.ts', name: 'Customer Service', critical: true },
    { path: 'src/modules/customer/api/customer.routes.ts', name: 'Customer Routes', critical: true },
    { path: 'src/modules/customer/index.ts', name: 'Customer Public API', critical: true },

    // Email module
    { path: 'src/modules/email/services/email.service.ts', name: 'Email Service', critical: true },
    { path: 'src/modules/email/api/email.routes.ts', name: 'Email Routes', critical: true },
    { path: 'src/modules/email/index.ts', name: 'Email Public API', critical: true },

    // Vehicle module
    { path: 'src/modules/vehicle/services/vehicle.service.ts', name: 'Vehicle Service', critical: true },
    { path: 'src/modules/vehicle/api/vehicle.routes.ts', name: 'Vehicle Routes', critical: true },
    { path: 'src/modules/vehicle/index.ts', name: 'Vehicle Public API', critical: true },

    // Reporting module
    { path: 'src/modules/reporting/services/analytics.service.ts', name: 'Analytics Service', critical: false },
    { path: 'src/modules/reporting/api/reporting.routes.ts', name: 'Reporting Routes', critical: false },
    { path: 'src/modules/reporting/index.ts', name: 'Reporting Public API', critical: false },
  ];

  for (const { path, name, critical } of requiredStructure) {
    const fullPath = join(process.cwd(), path);
    const exists = existsSync(fullPath);

    addResult(
      name,
      exists,
      exists ? 'File exists' : 'File missing',
      critical
    );
  }
}

// ============================================================================
// ROUTE REGISTRATION VALIDATION
// ============================================================================

async function validateRouteRegistration() {
  log('\n🔌 Validating Route Registration...', 'blue');

  const routesFile = join(process.cwd(), 'server/routes.ts');

  if (!existsSync(routesFile)) {
    addResult('Routes File', false, 'server/routes.ts not found', true);
    return;
  }

  const routesContent = readFileSync(routesFile, 'utf-8');

  // Check customer routes
  const hasCustomerImport = routesContent.includes("import('../src/modules/customer/api/customer.routes')");
  const hasCustomerMount = routesContent.includes("app.use('/api/customers'");
  addResult(
    'Customer Routes',
    hasCustomerImport && hasCustomerMount,
    hasCustomerImport && hasCustomerMount ? 'Imported and mounted' : 'Not properly wired',
    true
  );

  // Check email routes
  const hasEmailImport = routesContent.includes("import('../src/modules/email/api/email.routes')");
  const hasEmailMount = routesContent.includes("app.use('/api/email'");
  addResult(
    'Email Routes',
    hasEmailImport && hasEmailMount,
    hasEmailImport && hasEmailMount ? 'Imported and mounted' : 'Not properly wired',
    true
  );

  // Check vehicle routes
  const hasVehicleImport = routesContent.includes("import('../src/modules/vehicle/api/vehicle.routes')");
  const hasVehicleMount = routesContent.includes("app.use('/api/vehicles'");
  addResult(
    'Vehicle Routes',
    hasVehicleImport && hasVehicleMount,
    hasVehicleImport && hasVehicleMount ? 'Imported and mounted' : 'Not properly wired',
    true
  );

  // Check reporting routes
  const hasReportingImport = routesContent.includes("import('../src/modules/reporting/api/reporting.routes')");
  const hasReportingMount = routesContent.includes("app.use('/api/reporting'");
  addResult(
    'Reporting Routes',
    hasReportingImport && hasReportingMount,
    hasReportingImport && hasReportingMount ? 'Imported and mounted' : 'Not properly wired',
    false
  );
}

// ============================================================================
// OLD EMAIL SYSTEM CHECK
// ============================================================================

async function validateOldSystemRemoval() {
  log('\n🗑️  Validating Old Email System Removal...', 'blue');

  const oldEmailFiles = [
    'server/email-routes.ts',
    'server/email-service.ts',
    'server/email-config.ts',
    'server/email-security.ts',
    'server/email-security-monitor.ts',
    'server/email-webhook-routes.ts',
  ];

  let anyOldFilesExist = false;

  for (const file of oldEmailFiles) {
    const fullPath = join(process.cwd(), file);
    const exists = existsSync(fullPath);

    if (exists) {
      anyOldFilesExist = true;
      addResult(
        `Old File: ${file}`,
        false,
        'Still exists - should be removed',
        false // Not critical until final checkpoint
      );
    }
  }

  if (!anyOldFilesExist) {
    addResult(
      'Old Email System',
      true,
      'All old files removed',
      false
    );
  }
}

// ============================================================================
// TYPESCRIPT COMPILATION
// ============================================================================

async function validateTypeScript() {
  log('\n🔍 Validating TypeScript Compilation...', 'blue');

  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit');

    addResult(
      'TypeScript',
      true,
      'No compilation errors',
      true
    );
  } catch (error: any) {
    const errorOutput = error.stdout || error.stderr || error.message;
    const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;

    addResult(
      'TypeScript',
      false,
      `${errorCount} compilation errors found`,
      true
    );
  }
}

// ============================================================================
// ESLINT VALIDATION
// ============================================================================

async function validateESLint() {
  log('\n📋 Validating ESLint Rules...', 'blue');

  try {
    const { stdout } = await execAsync('npx eslint src/modules --quiet');

    addResult(
      'ESLint',
      true,
      'No violations in modules',
      false
    );
  } catch (error: any) {
    const errorOutput = error.stdout || '';
    const problemCount = (errorOutput.match(/problems? \((\d+) errors?/)?.[1]) || '0';

    addResult(
      'ESLint',
      false,
      `${problemCount} violations found`,
      false
    );
  }
}

// ============================================================================
// MODULE PUBLIC API VALIDATION
// ============================================================================

async function validateModuleAPIs() {
  log('\n📦 Validating Module Public APIs...', 'blue');

  const modules = ['customer', 'email', 'vehicle', 'reporting'];

  for (const module of modules) {
    const indexPath = join(process.cwd(), `src/modules/${module}/index.ts`);

    if (!existsSync(indexPath)) {
      addResult(
        `${module} Public API`,
        false,
        'index.ts not found',
        module !== 'reporting' // Reporting not critical yet
      );
      continue;
    }

    const content = readFileSync(indexPath, 'utf-8');

    // Check for proper exports
    const hasExports = content.includes('export');
    const hasTypes = content.includes('export type');
    const hasServices = content.includes('Service');

    const isValid = hasExports && hasTypes;

    addResult(
      `${module} Public API`,
      isValid,
      isValid
        ? `Exports types${hasServices ? ', services' : ''}`
        : 'Missing exports or types',
      module !== 'reporting'
    );
  }
}

// ============================================================================
// DATABASE SERVICE USAGE
// ============================================================================

async function validateDatabaseServiceUsage() {
  log('\n💾 Validating Database Service Usage...', 'blue');

  // Check that module services use the database service layer
  const servicesToCheck = [
    { path: 'src/modules/customer/services/customer.service.ts', name: 'Customer Service' },
    { path: 'src/modules/email/services/email.service.ts', name: 'Email Service' },
    { path: 'src/modules/vehicle/services/vehicle.service.ts', name: 'Vehicle Service' },
  ];

  for (const { path, name } of servicesToCheck) {
    const fullPath = join(process.cwd(), path);

    if (!existsSync(fullPath)) {
      continue; // Already reported in file structure check
    }

    const content = readFileSync(fullPath, 'utf-8');

    // Check for database service import
    const usesDbService =
      content.includes("from '../../core/database'") ||
      content.includes("from '../core/database'") ||
      content.includes('StorageService') ||
      content.includes('IStorage');

    // Check for direct Drizzle usage (should be minimal or none)
    const hasDirectDrizzle = content.includes("from 'drizzle-orm'");

    addResult(
      `${name} DB Usage`,
      usesDbService && !hasDirectDrizzle,
      usesDbService
        ? (hasDirectDrizzle ? 'Uses both service and direct Drizzle' : 'Uses database service')
        : 'Does not use database service',
      false
    );
  }
}

// ============================================================================
// MULTI-TENANT ISOLATION CHECK
// ============================================================================

async function validateMultiTenantIsolation() {
  log('\n🔒 Validating Multi-Tenant Isolation...', 'blue');

  const servicesToCheck = [
    'src/modules/customer/services/customer.service.ts',
    'src/modules/email/services/email.service.ts',
    'src/modules/vehicle/services/vehicle.service.ts',
  ];

  for (const path of servicesToCheck) {
    const fullPath = join(process.cwd(), path);

    if (!existsSync(fullPath)) {
      continue;
    }

    const content = readFileSync(fullPath, 'utf-8');
    const serviceName = path.split('/').slice(-1)[0].replace('.ts', '');

    // Check for tenantId parameters in methods
    const methodsWithTenantId = (content.match(/\w+\([^)]*tenantId[^)]*\)/g) || []).length;

    // Check for tenantId in queries
    const queriesWithTenantId = (content.match(/tenantId[:\s]*['"]/g) || []).length;

    const hasTenantIsolation = methodsWithTenantId > 0 || queriesWithTenantId > 0;

    addResult(
      `${serviceName} Tenant Isolation`,
      hasTenantIsolation,
      hasTenantIsolation
        ? `${methodsWithTenantId} methods with tenantId`
        : 'No tenantId found - SECURITY RISK',
      true // Critical security issue
    );
  }
}

// ============================================================================
// CHECKPOINT-SPECIFIC VALIDATIONS
// ============================================================================

function getCheckpointRequirements(checkpoint: string) {
  const requirements = {
    'T+4h': [
      'File Structure',
      'Route Registration',
      'TypeScript',
      'Customer Routes',
      'Email Routes',
    ],
    'T+8h': [
      'File Structure',
      'Route Registration',
      'TypeScript',
      'ESLint',
      'Customer Routes',
      'Email Routes',
      'Vehicle Routes',
      'Module APIs',
    ],
    'T+16h': [
      'File Structure',
      'Route Registration',
      'TypeScript',
      'ESLint',
      'Customer Routes',
      'Email Routes',
      'Vehicle Routes',
      'Module APIs',
      'Database Service Usage',
      'Tenant Isolation',
    ],
    'final': [
      'File Structure',
      'Route Registration',
      'Old Email System',
      'TypeScript',
      'ESLint',
      'Module APIs',
      'Database Service Usage',
      'Tenant Isolation',
      'All Routes',
    ],
  };

  return requirements[checkpoint as keyof typeof requirements] || requirements.final;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const checkpointArg = args.find(arg => arg.startsWith('--checkpoint='));
  const checkpoint = checkpointArg?.split('=')[1] || 'manual';

  log('\n═══════════════════════════════════════════════════════════', 'magenta');
  log('   PHASE 2 MODULE MIGRATION - VALIDATION SCRIPT', 'magenta');
  log('═══════════════════════════════════════════════════════════\n', 'magenta');

  log(`Checkpoint: ${checkpoint}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');

  // Run all validations
  await validateFileStructure();
  await validateRouteRegistration();
  await validateOldSystemRemoval();
  await validateTypeScript();
  await validateESLint();
  await validateModuleAPIs();
  await validateDatabaseServiceUsage();
  await validateMultiTenantIsolation();

  // Summary
  log('\n═══════════════════════════════════════════════════════════', 'magenta');
  log('   VALIDATION SUMMARY', 'magenta');
  log('═══════════════════════════════════════════════════════════\n', 'magenta');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const criticalFailures = results.filter(r => !r.passed && r.critical).length;

  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'yellow' : 'green');
  log(`Critical Failures: ${criticalFailures}`, criticalFailures > 0 ? 'red' : 'green');

  // Checkpoint-specific pass/fail
  const requiredChecks = getCheckpointRequirements(checkpoint);
  const requiredResults = results.filter(r =>
    requiredChecks.some(check => r.name.includes(check))
  );
  const requiredPassed = requiredResults.filter(r => r.passed).length;

  log(`\nCheckpoint ${checkpoint}: ${requiredPassed}/${requiredResults.length} required checks passed`,
    requiredPassed === requiredResults.length ? 'green' : 'red');

  // Final verdict
  if (criticalFailures > 0) {
    log('\n❌ VALIDATION FAILED - Critical issues found', 'red');
    log('Cannot proceed to next checkpoint until critical issues are resolved.', 'red');
    process.exit(1);
  } else if (failedTests > 0) {
    log('\n⚠️  VALIDATION PASSED WITH WARNINGS', 'yellow');
    log('Non-critical issues found. Review and address before final checkpoint.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ VALIDATION PASSED - All checks successful', 'green');
    process.exit(0);
  }
}

main().catch(error => {
  log(`\n❌ Validation script error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
