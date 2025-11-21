#!/usr/bin/env ts-node
/**
 * Phase 1-2 Validation Script
 * Validates completion of database services and module migration
 */

import { execSync } from 'child_process';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  phase: string;
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
}

const results: ValidationResult[] = [];

function validate(phase: string, category: string, item: string, condition: boolean, details?: string): void {
  results.push({
    phase,
    category,
    item,
    status: condition ? 'PASS' : 'FAIL',
    details,
  });
}

function warn(phase: string, category: string, item: string, details: string): void {
  results.push({
    phase,
    category,
    item,
    status: 'WARN',
    details,
  });
}

function checkFileExists(path: string): boolean {
  return existsSync(path);
}

function countLines(path: string): number {
  try {
    if (!existsSync(path)) return 0;
    const output = execSync(`wc -l ${path}`).toString();
    return parseInt(output.trim().split(' ')[0], 10);
  } catch {
    return 0;
  }
}

function countFilesInDirectory(dir: string, pattern: string = '*.ts'): number {
  try {
    if (!existsSync(dir)) return 0;
    const output = execSync(`find ${dir} -name "${pattern}" -type f | wc -l`).toString();
    return parseInt(output.trim(), 10);
  } catch {
    return 0;
  }
}

console.log('🔍 Validating Phase 1-2 Completion\n');
console.log('=' .repeat(80) + '\n');

// ====================
// PHASE 1: FOUNDATION
// ====================

console.log('📦 Phase 1: Foundation Migration\n');

// Database Service Layer
validate(
  'Phase 1',
  'Database',
  'Core storage service exists',
  checkFileExists('src/core/database/storage.service.ts'),
  `${countLines('src/core/database/storage.service.ts')} lines`
);

validate(
  'Phase 1',
  'Database',
  'Database connection pool',
  checkFileExists('server/database/connection-pool.ts'),
);

validate(
  'Phase 1',
  'Database',
  'Transaction manager',
  checkFileExists('server/database/transaction-manager.ts'),
);

validate(
  'Phase 1',
  'Database',
  'Atomic operations',
  checkFileExists('server/database/atomic-operations.ts'),
);

// Core Utilities
const coreUtilsExist = checkFileExists('src/core/utils');
validate(
  'Phase 1',
  'Utilities',
  'Core utilities directory',
  coreUtilsExist,
);

// Type Definitions
validate(
  'Phase 1',
  'Types',
  'Canonical models directory',
  checkFileExists('shared/models'),
);

const modelFiles = countFilesInDirectory('shared/models', '*.model.ts');
validate(
  'Phase 1',
  'Types',
  'Domain model files',
  modelFiles >= 5,
  `${modelFiles} model files found (expected: 5+)`
);

// ====================
// PHASE 2: MODULES
// ====================

console.log('\n📦 Phase 2: Module Migration\n');

const requiredModules = ['auth', 'customer', 'deal', 'email', 'tax', 'vehicle'];
const optionalModules = ['reporting'];

for (const module of requiredModules) {
  const modulePath = `src/modules/${module}`;
  const exists = checkFileExists(modulePath);

  validate(
    'Phase 2',
    'Modules',
    `${module} module exists`,
    exists,
  );

  if (exists) {
    // Check for standard module structure
    const hasApi = checkFileExists(join(modulePath, 'api'));
    const hasServices = checkFileExists(join(modulePath, 'services'));
    const hasTypes = checkFileExists(join(modulePath, 'types'));
    const hasIndex = checkFileExists(join(modulePath, 'index.ts'));

    validate('Phase 2', module, 'API routes', hasApi);
    validate('Phase 2', module, 'Services', hasServices);
    validate('Phase 2', module, 'Types', hasTypes);
    validate('Phase 2', module, 'Public API (index.ts)', hasIndex);

    // Count service files
    const serviceCount = countFilesInDirectory(join(modulePath, 'services'), '*.service.ts');
    if (serviceCount > 0) {
      validate(
        'Phase 2',
        module,
        'Service layer',
        serviceCount > 0,
        `${serviceCount} service file(s)`
      );
    } else {
      warn('Phase 2', module, 'Service layer', 'No .service.ts files found');
    }
  }
}

// Check optional modules
for (const module of optionalModules) {
  const exists = checkFileExists(`src/modules/${module}`);
  if (exists) {
    validate('Phase 2', 'Modules', `${module} module (optional)`, true);
  } else {
    warn('Phase 2', 'Modules', `${module} module`, 'Not implemented (optional)');
  }
}

// ====================
// DESIGN TOKENS & UI
// ====================

console.log('\n🎨 Design Tokens & Core Components\n');

validate(
  'Phase 2',
  'Design',
  'Design tokens',
  checkFileExists('client/src/lib/design-tokens.ts'),
  `${countLines('client/src/lib/design-tokens.ts')} lines`
);

validate(
  'Phase 2',
  'Design',
  'Core components directory',
  checkFileExists('client/src/components/core'),
);

const coreComponents = [
  'page-header.tsx',
  'page-content.tsx',
  'section.tsx',
  'loading-state.tsx',
  'error-state.tsx',
  'loading-button.tsx',
  'confirm-dialog.tsx',
  'form-fields.tsx',
];

for (const component of coreComponents) {
  validate(
    'Phase 2',
    'Components',
    component,
    checkFileExists(`client/src/components/core/${component}`),
  );
}

// ====================
// CODE QUALITY
// ====================

console.log('\n✅ Code Quality Checks\n');

// Count 'any' types in new modules
try {
  const anyCount = execSync(
    `grep -r ": any" src/modules src/core --include="*.ts" --include="*.tsx" | wc -l`
  ).toString().trim();

  const count = parseInt(anyCount, 10);
  if (count <= 10) {
    validate('Quality', 'TypeScript', "'any' types in modules", true, `${count} found (target: <10)`);
  } else {
    warn('Quality', 'TypeScript', "'any' types in modules", `${count} found (target: <10)`);
  }
} catch {
  warn('Quality', 'TypeScript', "'any' types check", 'Could not count');
}

// Count React components
const pageCount = countFilesInDirectory('client/src/pages', '*.tsx');
const componentCount = countFilesInDirectory('client/src/components', '*.tsx');

validate(
  'Quality',
  'Frontend',
  'Page count',
  pageCount > 0,
  `${pageCount} pages`
);

validate(
  'Quality',
  'Frontend',
  'Component count',
  componentCount > 0,
  `${componentCount} components`
);

// ====================
// RESULTS SUMMARY
// ====================

console.log('\n' + '='.repeat(80));
console.log('📊 Validation Results Summary\n');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const warnings = results.filter(r => r.status === 'WARN').length;
const total = results.length;

console.log(`✅ Passed:   ${passed}/${total}`);
console.log(`❌ Failed:   ${failed}/${total}`);
console.log(`⚠️  Warnings: ${warnings}/${total}`);
console.log('');

// Group by phase
const phases = ['Phase 1', 'Phase 2', 'Quality'];
for (const phase of phases) {
  const phaseResults = results.filter(r => r.phase === phase);
  const phasePassed = phaseResults.filter(r => r.status === 'PASS').length;
  const phaseTotal = phaseResults.length;
  const percentage = Math.round((phasePassed / phaseTotal) * 100);

  console.log(`${phase}: ${phasePassed}/${phaseTotal} (${percentage}%)`);
}

console.log('\n' + '='.repeat(80));
console.log('\n📋 Detailed Results:\n');

// Print results grouped by phase and category
for (const phase of ['Phase 1', 'Phase 2', 'Quality']) {
  const phaseResults = results.filter(r => r.phase === phase);
  if (phaseResults.length === 0) continue;

  console.log(`\n${phase}:`);

  const categories = [...new Set(phaseResults.map(r => r.category))];
  for (const category of categories) {
    const categoryResults = phaseResults.filter(r => r.category === category);
    console.log(`  ${category}:`);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const details = result.details ? ` (${result.details})` : '';
      console.log(`    ${icon} ${result.item}${details}`);
    }
  }
}

console.log('\n' + '='.repeat(80) + '\n');

// Phase completion assessment
const phase1Results = results.filter(r => r.phase === 'Phase 1');
const phase1Passed = phase1Results.filter(r => r.status === 'PASS').length;
const phase1Completion = Math.round((phase1Passed / phase1Results.length) * 100);

const phase2Results = results.filter(r => r.phase === 'Phase 2');
const phase2Passed = phase2Results.filter(r => r.status === 'PASS').length;
const phase2Completion = Math.round((phase2Passed / phase2Results.length) * 100);

console.log('🎯 Phase Completion Assessment:\n');
console.log(`Phase 1 (Foundation):  ${phase1Completion}% complete`);
console.log(`Phase 2 (Modules):     ${phase2Completion}% complete`);
console.log('');

if (phase1Completion >= 80 && phase2Completion >= 80) {
  console.log('✅ READY FOR PHASE 3 - UI Pattern Migration can begin');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Review any warnings or failures above');
  console.log('2. Fix TypeScript syntax errors in client/src');
  console.log('3. Begin Phase 3 UI pattern migration');
  process.exit(0);
} else if (phase1Completion < 80) {
  console.log('❌ PHASE 1 INCOMPLETE - Complete foundation before Phase 3');
  console.log('');
  console.log('Required Actions:');
  console.log('- Ensure all database services are implemented');
  console.log('- Complete core utilities migration');
  console.log('- Finish type definitions');
  process.exit(1);
} else {
  console.log('⚠️  PHASE 2 INCOMPLETE - Review module implementation');
  console.log('');
  console.log('Suggested Actions:');
  console.log('- Complete missing module components (API, services, types)');
  console.log('- Verify module public APIs are exported');
  console.log('- Consider proceeding with Phase 3 in parallel');
  process.exit(0);
}
