/**
 * TAX SERVICE USAGE EXAMPLES
 *
 * This file demonstrates how to use the Enhanced Tax System (v2.0)
 * for various tax calculation scenarios.
 *
 * IMPORTANT: All monetary values must be decimal strings, not numbers!
 */

import type { Database } from '../../../lib/types';
import {
  EnhancedTaxService,
  DatabaseTaxStorage,
  formatUSD,
  formatPercent,
  type SalesTaxResult,
  type CompleteTaxBreakdown,
} from '../index';

// ==========================================================================
// EXAMPLE 1: Simple Sales Tax Calculation
// ==========================================================================

export async function example1_SimpleSalesTax(db: Database) {
  console.log('\n=== Example 1: Simple Sales Tax ===\n');

  // Create service instances
  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Calculate sales tax for a $35,000 vehicle in California
  const result = await taxService.calculateSalesTax({
    dealershipId: 'dealership-123',
    vehiclePrice: '35000.00',
    zipCode: '90210',
    state: 'CA',
    userId: 'user-456',
  });

  console.log('Vehicle Price:', formatUSD(result.taxableAmount));
  console.log('Tax Rate:', formatPercent(result.taxRate.totalRate));
  console.log('Total Tax:', formatUSD(result.totalTax));
  console.log('\nBreakdown:');
  console.log('  State Tax:', formatUSD(result.breakdown.stateTax));
  console.log('  County Tax:', formatUSD(result.breakdown.countyTax));
  console.log('  City Tax:', formatUSD(result.breakdown.cityTax));
  console.log('  District Tax:', formatUSD(result.breakdown.specialDistrictTax));

  return result;
}

// ==========================================================================
// EXAMPLE 2: Sales Tax with Trade-In Credit
// ==========================================================================

export async function example2_SalesTaxWithTradeIn(db: Database) {
  console.log('\n=== Example 2: Sales Tax with Trade-In ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // $35,000 vehicle with $10,000 trade-in
  // California allows full trade-in credit
  const result = await taxService.calculateSalesTax({
    dealershipId: 'dealership-123',
    vehiclePrice: '35000.00',
    tradeInValue: '10000.00', // Trade-in reduces taxable amount
    zipCode: '90210',
    state: 'CA',
    userId: 'user-456',
  });

  console.log('Vehicle Price:', formatUSD('35000.00'));
  console.log('Trade-In Value:', formatUSD('10000.00'));
  console.log('Taxable Amount:', formatUSD(result.taxableAmount)); // $25,000
  console.log('Tax Rate:', formatPercent(result.taxRate.totalRate));
  console.log('Total Tax:', formatUSD(result.totalTax)); // Tax on $25,000

  return result;
}

// ==========================================================================
// EXAMPLE 3: Sales Tax with Rebates
// ==========================================================================

export async function example3_SalesTaxWithRebates(db: Database) {
  console.log('\n=== Example 3: Sales Tax with Rebates ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // $35,000 vehicle
  // $2,000 manufacturer rebate (NOT taxed in CA)
  // $500 dealer rebate (TAXED in CA)
  const result = await taxService.calculateSalesTax({
    dealershipId: 'dealership-123',
    vehiclePrice: '35000.00',
    rebateManufacturer: '2000.00', // Reduces taxable amount
    rebateDealer: '500.00', // Does NOT reduce taxable amount in CA
    zipCode: '90210',
    state: 'CA',
    userId: 'user-456',
  });

  console.log('Vehicle Price:', formatUSD('35000.00'));
  console.log('Manufacturer Rebate:', formatUSD('2000.00'), '(not taxed)');
  console.log('Dealer Rebate:', formatUSD('500.00'), '(taxed)');
  console.log('Taxable Amount:', formatUSD(result.taxableAmount)); // $33,000
  console.log('Total Tax:', formatUSD(result.totalTax));

  return result;
}

// ==========================================================================
// EXAMPLE 4: Complete Deal Tax Calculation
// ==========================================================================

export async function example4_CompleteDealTaxes(db: Database) {
  console.log('\n=== Example 4: Complete Deal Taxes ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Complete deal with all fees and products
  const result = await taxService.calculateDealTaxes({
    dealId: 'deal-789',
    dealershipId: 'dealership-123',
    userId: 'user-456',

    // Vehicle
    vehiclePrice: '35000.00',
    tradeInValue: '10000.00',

    // Rebates
    rebateManufacturer: '2000.00',
    rebateDealer: '500.00',

    // Fees
    docFee: '85.00', // Capped at $85 in CA, taxable
    otherFees: [
      { code: 'TITLE', name: 'Title Fee', amount: '15.00', taxable: false },
      { code: 'REG', name: 'Registration', amount: '50.00', taxable: false },
    ],

    // Products
    serviceContracts: '2500.00', // Taxable in CA
    gap: '800.00', // Taxable in CA

    // Accessories
    accessories: [
      { code: 'FLOOR_MATS', name: 'Floor Mats', amount: '150.00', taxable: true },
      { code: 'TINT', name: 'Window Tint', amount: '400.00', taxable: true },
    ],

    // Location
    zipCode: '90210',
    state: 'CA',
  });

  console.log('Vehicle Sale:');
  console.log('  Vehicle Price:', formatUSD('35000.00'));
  console.log('  Trade-In:', formatUSD('10000.00'));
  console.log('  Rebates:', formatUSD('2500.00'));
  console.log('  Taxable Amount:', formatUSD(result.salesTax.taxableAmount));
  console.log('  Vehicle Tax:', formatUSD(result.salesTax.totalTax));

  console.log('\nFees:');
  console.log('  Doc Fee:', formatUSD(result.docFee));
  console.log('  Title Fee:', formatUSD(result.titleFee));
  console.log('  Registration:', formatUSD(result.registrationFee));

  console.log('\nProducts & Accessories:');
  for (const fee of result.otherFees) {
    const taxStatus = fee.taxable ? '(taxable)' : '(not taxable)';
    console.log(`  ${fee.name}: ${formatUSD(fee.amount)} ${taxStatus}`);
  }

  console.log('\nTotals:');
  console.log('  Total Taxable:', formatUSD(result.totalTaxable));
  console.log('  Total Non-Taxable:', formatUSD(result.totalNonTaxable));
  console.log('  Total Taxes & Fees:', formatUSD(result.totalTaxesAndFees));

  console.log('\nValidation:', result.validated ? '✓ Passed' : '✗ Failed');
  if (!result.validated) {
    console.log('Errors:', result.validationErrors);
  }

  console.log('\nAudit Trail ID:', result.auditTrail.calculationId);

  return result;
}

// ==========================================================================
// EXAMPLE 5: Michigan Trade-In Credit Cap
// ==========================================================================

export async function example5_MichiganTradeInCap(db: Database) {
  console.log('\n=== Example 5: Michigan Trade-In Cap ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Michigan caps trade-in credit at $2,000
  // $30,000 vehicle with $5,000 trade-in
  const result = await taxService.calculateSalesTax({
    dealershipId: 'dealership-123',
    vehiclePrice: '30000.00',
    tradeInValue: '5000.00', // Will be capped at $2,000
    zipCode: '48201', // Detroit, MI
    state: 'MI',
    userId: 'user-456',
  });

  console.log('Vehicle Price:', formatUSD('30000.00'));
  console.log('Trade-In Value:', formatUSD('5000.00'));
  console.log('Trade-In Credit Cap:', formatUSD('2000.00'), '(MI limit)');
  console.log('Taxable Amount:', formatUSD(result.taxableAmount)); // $28,000
  console.log('Total Tax:', formatUSD(result.totalTax));

  return result;
}

// ==========================================================================
// EXAMPLE 6: Audit Trail Retrieval
// ==========================================================================

export async function example6_AuditTrailRetrieval(
  db: Database,
  dealId: string
) {
  console.log('\n=== Example 6: Audit Trail ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Retrieve all tax calculations for a deal
  const auditLog = await taxService.auditTaxCalculation(dealId);

  console.log(`Found ${auditLog.length} calculation(s) for deal ${dealId}\n`);

  for (const entry of auditLog) {
    console.log('Calculation ID:', entry.calculationId);
    console.log('Calculated At:', entry.calculatedAt.toLocaleString());
    console.log('Calculated By:', entry.calculatedBy);
    console.log('Engine Version:', entry.engineVersion);
    console.log('State Rules Version:', entry.stateRulesVersion);
    console.log('\nInputs:');
    console.log('  Vehicle Price:', formatUSD(entry.inputs.vehiclePrice));
    console.log('  Trade-In:', formatUSD(entry.inputs.tradeInValue || '0'));
    console.log('\nOutputs:');
    console.log('  Total Tax:', formatUSD(entry.outputs.totalTax));
    console.log('  Total Fees:', formatUSD(entry.outputs.totalFees));
    console.log('---');
  }

  return auditLog;
}

// ==========================================================================
// EXAMPLE 7: Jurisdiction Lookup
// ==========================================================================

export async function example7_JurisdictionLookup(db: Database) {
  console.log('\n=== Example 7: Jurisdiction Lookup ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Lookup jurisdiction by ZIP code
  const jurisdiction = await taxService.lookupJurisdiction('90210');

  console.log('ZIP Code:', jurisdiction.zipCode);
  console.log('State:', jurisdiction.state);
  console.log('County:', jurisdiction.county);
  console.log('City:', jurisdiction.city);

  // Get tax rates for this jurisdiction
  const rates = await taxService.getTaxRate(jurisdiction);

  console.log('\nTax Rates:');
  console.log('  State:', formatPercent(rates.stateRate));
  console.log('  County:', formatPercent(rates.countyRate));
  console.log('  City:', formatPercent(rates.cityRate));
  console.log('  Special District:', formatPercent(rates.specialDistrictRate));
  console.log('  Total:', formatPercent(rates.totalRate));

  return { jurisdiction, rates };
}

// ==========================================================================
// EXAMPLE 8: Validation
// ==========================================================================

export async function example8_Validation(db: Database) {
  console.log('\n=== Example 8: Validation ===\n');

  const storage = new DatabaseTaxStorage(db);
  const taxService = new EnhancedTaxService(storage);

  // Calculate tax
  const result = await taxService.calculateSalesTax({
    dealershipId: 'dealership-123',
    vehiclePrice: '35000.00',
    zipCode: '90210',
    state: 'CA',
    userId: 'user-456',
  });

  // Get state rules
  const stateRules = await storage.getStateRules('CA');
  if (!stateRules) {
    throw new Error('State rules not found');
  }

  // Validate the calculation
  const validation = taxService.validateTaxCalculation(result, stateRules);

  console.log('Validation Results:');
  console.log('  All Checks Pass:', validation.allChecksPass ? '✓' : '✗');
  console.log('  Breakdown Matches Total:', validation.breakdownSumMatchesTotal ? '✓' : '✗');
  console.log('  Rate Within Bounds:', validation.rateWithinBounds ? '✓' : '✗');
  console.log('  Taxable Amount Valid:', validation.taxableAmountValid ? '✓' : '✗');
  console.log('  Jurisdiction Current:', validation.jurisdictionCurrent ? '✓' : '✗');

  if (validation.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of validation.errors) {
      console.log(`  [${error.severity}] ${error.code}: ${error.message}`);
    }
  }

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of validation.warnings) {
      console.log(`  ${warning.code}: ${warning.message}`);
    }
  }

  return validation;
}

// ==========================================================================
// EXAMPLE 9: Using Decimal Calculator Directly
// ==========================================================================

export async function example9_DecimalCalculator() {
  console.log('\n=== Example 9: Decimal Calculator ===\n');

  // Import specific calculator functions
  const { add, subtract, multiply, calculateTax, formatUSD } = await import('../index');

  // Demonstrate precision
  console.log('JavaScript Floating Point Issues:');
  console.log('  0.1 + 0.2 =', 0.1 + 0.2); // 0.30000000000000004

  console.log('\nDecimal Calculator (Correct):');
  const sum = add('0.1', '0.2');
  console.log('  0.1 + 0.2 =', sum); // 0.30

  // Complex calculation
  const vehiclePrice = '35000.00';
  const tradeIn = '10000.00';
  const taxRate = '0.0825';

  const taxableAmount = subtract(vehiclePrice, tradeIn);
  const tax = calculateTax(taxableAmount, taxRate);
  const total = add(vehiclePrice, tax);

  console.log('\nDeal Calculation:');
  console.log('  Vehicle Price:', formatUSD(vehiclePrice));
  console.log('  Trade-In:', formatUSD(tradeIn));
  console.log('  Taxable Amount:', formatUSD(taxableAmount));
  console.log('  Tax:', formatUSD(tax));
  console.log('  Total:', formatUSD(total));

  return { taxableAmount, tax, total };
}

// ==========================================================================
// MAIN RUNNER (for testing all examples)
// ==========================================================================

export async function runAllExamples(db: Database) {
  try {
    await example1_SimpleSalesTax(db);
    await example2_SalesTaxWithTradeIn(db);
    await example3_SalesTaxWithRebates(db);
    await example4_CompleteDealTaxes(db);
    await example5_MichiganTradeInCap(db);
    // await example6_AuditTrailRetrieval(db, 'deal-123'); // Requires existing deal
    await example7_JurisdictionLookup(db);
    await example8_Validation(db);
    await example9_DecimalCalculator();

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    throw error;
  }
}
