/**
 * Tax Engine Service
 *
 * Centralized service for calculating tax profiles based on customer address.
 * Single source of truth for tax calculations.
 */

import { db } from '../db';
import { customers, dealScenarios } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getLocalTaxRate } from '../local-tax-service';
import { getRulesForState } from '@shared/autoTaxEngine';
import type {
  TaxProfile,
  TaxQuoteInput,
  CustomerAddress,
  TaxMethod,
} from '@shared/types/tax-engine';

/**
 * Calculate a complete TaxProfile for a customer
 */
export async function calculateTaxProfile(input: TaxQuoteInput): Promise<TaxProfile> {
  // 1. Fetch customer with address
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, input.customerId),
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (!customer.state || !customer.zipCode) {
    throw new Error('Customer address incomplete - state and ZIP required');
  }

  // 2. Build address snapshot
  const addressSnapshot: CustomerAddress = {
    line1: customer.address || '',
    city: customer.city || '',
    state: customer.state,
    stateCode: customer.state, // Assuming 2-letter stored
    postalCode: customer.zipCode,
    country: 'US',
    county: customer.county || undefined,
  };

  // 3. Get local tax rates from database
  const localRates = await getLocalTaxRate(customer.zipCode, customer.state);

  // 4. Get state rules from AutoTaxEngine
  const stateRules = getRulesForState(customer.state);
  if (!stateRules) {
    throw new Error(`State ${customer.state} not supported by tax engine`);
  }

  // 5. Determine tax method
  const method = determineTaxMethod(stateRules, input.dealType);

  // 6. Build rate breakdown
  const stateRulesAny = stateRules as any;
  const rates = {
    stateRate: stateRulesAny.rates?.stateRate || 0.07,
    countyRate: localRates?.countyRate || 0,
    cityRate: localRates?.cityRate || 0,
    specialRate: localRates?.specialDistrictRate || 0,
    combinedRate: localRates?.totalRate || stateRulesAny.rates?.stateRate || 0.07,
  };

  // 7. Build rules from state config
  const rules = {
    tradeInReducesTaxBase: stateRules.tradeInPolicy?.type === 'FULL' ||
      stateRules.tradeInPolicy?.type === 'CAPPED',
    docFeeTaxable: isDocFeeTaxable(stateRules),
    docFeeCap: stateRulesAny.fees?.docFeeCap as number | undefined,
    gapTaxable: isProductTaxable(stateRules, 'GAP'),
    vscTaxable: isProductTaxable(stateRules, 'VSC'),
    luxuryTaxThreshold: stateRulesAny.extras?.luxuryTaxThreshold as number | undefined,
    luxuryTaxRate: stateRulesAny.extras?.luxuryTaxRate as number | undefined,
  };

  // 8. Precompute values based on deal data
  const precomputed = precomputeTaxValues(input, rates, rules, method);

  // 9. Build final TaxProfile
  const taxProfile: TaxProfile = {
    customerId: input.customerId,
    addressSnapshot,
    calculatedAt: new Date().toISOString(),
    jurisdiction: {
      stateCode: customer.state,
      countyName: localRates?.countyName || customer.county || undefined,
      cityName: localRates?.cityName || customer.city || undefined,
    },
    rates,
    method,
    rules,
    precomputed,
  };

  return taxProfile;
}

/**
 * Determine the tax method based on state rules and deal type
 */
function determineTaxMethod(stateRules: any, dealType: 'RETAIL' | 'LEASE'): TaxMethod {
  if (dealType === 'RETAIL') {
    // Check for special schemes
    if (stateRules.vehicleTaxScheme === 'SPECIAL_TAVT') return 'SPECIAL_TAVT';
    if (stateRules.vehicleTaxScheme === 'SPECIAL_HUT') return 'SPECIAL_HUT';
    if (stateRules.vehicleTaxScheme === 'DMV_PRIVILEGE_TAX') return 'SPECIAL_PRIVILEGE';
    return 'TAX_ON_PRICE';
  }

  // Lease deal - check lease rules
  const leaseMethod = stateRules.leaseRules?.method;
  switch (leaseMethod) {
    case 'MONTHLY':
      return 'TAX_ON_PAYMENT';
    case 'FULL_UPFRONT':
      return 'TAX_ON_CAP_COST';
    case 'HYBRID':
      return 'TAX_ON_CAP_REDUCTION';
    default:
      return 'TAX_ON_PAYMENT'; // Default for most states
  }
}

/**
 * Check if doc fee is taxable in this state
 */
function isDocFeeTaxable(stateRules: any): boolean {
  const feeRules = stateRules.fees?.feeRules || [];
  const docRule = feeRules.find((r: any) => r.code === 'DOC');
  if (docRule) {
    return docRule.taxable === true || docRule.taxable === 'YES';
  }
  return false;
}

/**
 * Check if a product (GAP, VSC) is taxable
 */
function isProductTaxable(stateRules: any, productCode: string): boolean {
  const feeRules = stateRules.fees?.feeRules || [];
  const productRule = feeRules.find((r: any) => r.code === productCode);
  if (productRule) {
    return productRule.taxable === true || productRule.taxable === 'YES';
  }
  // Default: GAP and VSC usually taxable
  return true;
}

/**
 * Precompute tax values based on deal data
 */
function precomputeTaxValues(
  input: TaxQuoteInput,
  rates: TaxProfile['rates'],
  rules: TaxProfile['rules'],
  method: TaxMethod
): TaxProfile['precomputed'] {
  const {
    vehiclePrice,
    tradeAllowance = 0,
    tradePayoff = 0,
    dealerFees = 0,
    aftermarketProducts = [],
  } = input;

  // Calculate taxable amount
  let taxableAmount = vehiclePrice;

  // Apply trade-in credit if state allows
  if (rules.tradeInReducesTaxBase) {
    taxableAmount -= Math.max(0, tradeAllowance - tradePayoff);
  }

  // Add taxable fees
  if (rules.docFeeTaxable) {
    const docFee = rules.docFeeCap ? Math.min(dealerFees, rules.docFeeCap) : dealerFees;
    taxableAmount += docFee;
  }

  // Add taxable aftermarket products
  const taxableProducts = aftermarketProducts
    .filter(p => p.taxable !== false)
    .reduce((sum, p) => sum + p.price, 0);
  taxableAmount += taxableProducts;

  if (input.dealType === 'RETAIL') {
    return {
      totalTaxableAmount: taxableAmount,
      estimatedTax: taxableAmount * rates.combinedRate,
    };
  }

  // Lease precomputation
  if (input.dealType === 'LEASE') {
    if (method === 'TAX_ON_PAYMENT') {
      return {
        monthlyTaxRate: rates.combinedRate,
        totalTaxableAmount: taxableAmount,
      };
    } else if (method === 'TAX_ON_CAP_COST') {
      return {
        upfrontTaxAmount: taxableAmount * rates.combinedRate,
        capCostTaxAmount: taxableAmount * rates.combinedRate,
        totalTaxableAmount: taxableAmount,
      };
    }
  }

  return {
    totalTaxableAmount: taxableAmount,
    estimatedTax: taxableAmount * rates.combinedRate,
  };
}

/**
 * Recalculate taxes for an existing deal
 */
export async function recalculateDealTaxes(dealId: string): Promise<{
  taxProfile: TaxProfile;
  scenarioId: string;
}> {
  // 1. Fetch deal with scenarios
  const deal = await db.query.deals.findFirst({
    where: eq((await import('@shared/schema')).deals.id, dealId),
    with: {
      scenarios: true,
      customer: true,
    },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  if (!deal.customerId) {
    throw new Error('No customer attached to deal');
  }

  // 2. Get active scenario
  const activeScenario = deal.scenarios.find((s: any) => s.id === deal.activeScenarioId)
    || deal.scenarios[0];

  if (!activeScenario) {
    throw new Error('No scenario found');
  }

  // 3. Build input from scenario
  const input: TaxQuoteInput = {
    customerId: deal.customerId,
    dealType: activeScenario.scenarioType === 'LEASE_DEAL' ? 'LEASE' : 'RETAIL',
    vehiclePrice: parseFloat(String(activeScenario.vehiclePrice || 0)),
    tradeAllowance: parseFloat(String(activeScenario.tradeAllowance || 0)),
    tradePayoff: parseFloat(String(activeScenario.tradePayoff || 0)),
    downPayment: parseFloat(String(activeScenario.downPayment || 0)),
    term: activeScenario.term || 36,
    dealerFees: parseFloat(String(activeScenario.dealerFees || 0)),
    msrp: parseFloat(String(activeScenario.msrp || activeScenario.vehiclePrice || 0)),
    residualPercent: parseFloat(String(activeScenario.residualPercent || 0)),
    moneyFactor: parseFloat(String(activeScenario.moneyFactor || 0)),
  };

  // 4. Calculate new tax profile
  const taxProfile = await calculateTaxProfile(input);

  // 5. Update scenario with new tax values
  await db.update(dealScenarios)
    .set({
      totalTax: taxProfile.precomputed?.estimatedTax?.toFixed(2) || '0',
      taxProfile: taxProfile as any, // Store full profile as JSONB
      updatedAt: new Date(),
    })
    .where(eq(dealScenarios.id, activeScenario.id));

  return {
    taxProfile,
    scenarioId: activeScenario.id,
  };
}
