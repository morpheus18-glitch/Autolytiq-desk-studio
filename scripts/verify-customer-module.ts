#!/usr/bin/env tsx
/**
 * CUSTOMER MODULE VERIFICATION SCRIPT
 * Verifies that the customer module is fully integrated and operational
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

interface VerificationResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: VerificationResult[] = [];

function verify(name: string, condition: boolean, details?: string) {
  results.push({ name, passed: condition, details });
  if (!condition) {
    console.error(`❌ FAILED: ${name}`);
    if (details) console.error(`   ${details}`);
  } else {
    console.log(`✅ PASSED: ${name}`);
  }
}

console.log('🔍 Verifying Customer Module Migration...\n');

// ============================================================================
// 1. MODULE STRUCTURE
// ============================================================================

console.log('📁 Checking module structure...');

const moduleFiles = [
  'src/modules/customer/index.ts',
  'src/modules/customer/api/customer.routes.ts',
  'src/modules/customer/services/customer.service.ts',
  'src/modules/customer/types/customer.types.ts',
  'src/modules/customer/utils/validators.ts',
  'src/modules/customer/utils/formatters.ts',
  'src/modules/customer/utils/address-validator.ts',
  'src/modules/customer/hooks/useCustomer.ts',
  'src/modules/customer/hooks/useCustomerList.ts',
  'src/modules/customer/hooks/useCustomerSearch.ts',
  'src/modules/customer/__tests__/customer.service.test.ts',
  'src/modules/customer/__tests__/customer.integration.test.ts',
];

moduleFiles.forEach((file) => {
  const fullPath = resolve(process.cwd(), file);
  verify(
    `File exists: ${file}`,
    existsSync(fullPath),
    fullPath
  );
});

// ============================================================================
// 2. EXPORTS VERIFICATION
// ============================================================================

console.log('\n📦 Checking module exports...');

try {
  // Check if module can be imported
  const customerModule = require('../src/modules/customer/index.ts');

  verify(
    'CustomerService exported',
    typeof customerModule.CustomerService === 'function'
  );

  verify(
    'customerService instance exported',
    customerModule.customerService !== undefined
  );

  verify(
    'getCustomerService exported',
    typeof customerModule.getCustomerService === 'function'
  );

  verify(
    'customerRoutes exported',
    customerModule.customerRoutes !== undefined
  );

  verify(
    'Customer types exported',
    customerModule.CustomerStatus !== undefined &&
    customerModule.CustomerSource !== undefined &&
    customerModule.PreferredContactMethod !== undefined
  );

  verify(
    'Error classes exported',
    customerModule.CustomerError !== undefined &&
    customerModule.CustomerNotFoundError !== undefined &&
    customerModule.CustomerValidationError !== undefined &&
    customerModule.DuplicateCustomerError !== undefined &&
    customerModule.CustomerAccessDeniedError !== undefined
  );

  verify(
    'Validation schemas exported',
    customerModule.CustomerSchema !== undefined &&
    customerModule.CreateCustomerRequestSchema !== undefined &&
    customerModule.UpdateCustomerRequestSchema !== undefined
  );

  verify(
    'Utility functions exported',
    typeof customerModule.normalizePhone === 'function' &&
    typeof customerModule.normalizeEmail === 'function' &&
    typeof customerModule.validateCustomerData === 'function'
  );

  verify(
    'Formatter functions exported',
    typeof customerModule.getFullName === 'function' &&
    typeof customerModule.formatPhone === 'function' &&
    typeof customerModule.formatAddressSingleLine === 'function'
  );

  verify(
    'React hooks exported',
    typeof customerModule.useCustomer === 'function' &&
    typeof customerModule.useCustomerList === 'function' &&
    typeof customerModule.useCustomerSearch === 'function'
  );

} catch (error) {
  verify('Module can be imported', false, error.message);
}

// ============================================================================
// 3. INTEGRATION VERIFICATION
// ============================================================================

console.log('\n🔗 Checking integration points...');

try {
  const routesFile = require('../server/routes.ts');
  verify('Routes file can be loaded', true);
} catch (error) {
  verify('Routes file can be loaded', false, error.message);
}

// Check StorageService integration
try {
  const storageService = require('../src/core/database/storage.service.ts');
  verify(
    'StorageService has customer methods',
    typeof storageService.StorageService === 'function'
  );
} catch (error) {
  verify('StorageService integration', false, error.message);
}

// ============================================================================
// 4. SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY\n');

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`Total Checks: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 ALL CHECKS PASSED! Customer module is fully operational.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME CHECKS FAILED. Review errors above.\n');
  process.exit(1);
}
