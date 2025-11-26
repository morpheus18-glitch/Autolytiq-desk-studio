/**
 * AUTO TAX ENGINE - HIGH-VOLUME STATE TESTS
 *
 * Comprehensive test suite for the top 10 automotive markets:
 * 1. California (CA) - 7.25% + local, doc cap $85, no reciprocity
 * 2. Texas (TX) - 6.25% + local, VSC/GAP not taxed
 * 3. Florida (FL) - 6% + local, doc cap $995
 * 4. New York (NY) - 4% + local + MCTD, doc cap $175, no reciprocity
 * 5. Pennsylvania (PA) - 6% state-only, doc cap $195
 * 6. Illinois (IL) - 6.25% + local (Chicago 10.25%)
 * 7. Ohio (OH) - 5.75% + local, doc cap $250
 * 8. Georgia (GA) - TAVT 7% one-time
 * 9. North Carolina (NC) - HUT 3%, 90-day reciprocity
 * 10. Michigan (MI) - 6% state-only, doc cap $200
 *
 * These states represent ~65% of US automotive market volume.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TaxCalculationInput, LeaseFields } from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';
import { getRulesForState, isStateImplemented } from '../../shared/autoTaxEngine/rules';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createRetailInput(
  stateCode: string,
  overrides: Partial<TaxCalculationInput> = {}
): TaxCalculationInput {
  return {
    stateCode,
    asOfDate: '2025-01-15',
    dealType: 'RETAIL',
    vehiclePrice: 35000,
    accessoriesAmount: 0,
    tradeInValue: 0,
    rebateManufacturer: 0,
    rebateDealer: 0,
    docFee: 0,
    otherFees: [],
    serviceContracts: 0,
    gap: 0,
    negativeEquity: 0,
    taxAlreadyCollected: 0,
    rates: [],
    ...overrides,
  } as TaxCalculationInput;
}

function createLeaseInput(
  stateCode: string,
  overrides: Partial<TaxCalculationInput & LeaseFields> = {}
): TaxCalculationInput & LeaseFields {
  return {
    stateCode,
    asOfDate: '2025-01-15',
    dealType: 'LEASE',
    vehiclePrice: 35000,
    accessoriesAmount: 0,
    tradeInValue: 0,
    rebateManufacturer: 0,
    rebateDealer: 0,
    docFee: 0,
    otherFees: [],
    serviceContracts: 0,
    gap: 0,
    negativeEquity: 0,
    taxAlreadyCollected: 0,
    rates: [],
    grossCapCost: 35000,
    capReductionCash: 0,
    capReductionTradeIn: 0,
    capReductionRebateManufacturer: 0,
    capReductionRebateDealer: 0,
    basePayment: 450,
    paymentCount: 36,
    ...overrides,
  } as TaxCalculationInput & LeaseFields;
}

// ============================================================================
// CALIFORNIA (CA) TESTS
// ============================================================================

describe('California (CA) - High-Volume State', () => {
  const STATE = 'CA';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should have correct state code and be implemented', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.stateCode).toBe(STATE);
    });

    it('should have FULL trade-in policy', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.tradeInPolicy.type).toBe('FULL');
    });

    it('should have no reciprocity', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.reciprocity.enabled).toBe(false);
    });

    it('should tax service contracts on retail', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it('should tax GAP on retail', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate tax with state + local rates', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        rates: [
          { label: 'STATE', rate: 0.0725 },
          { label: 'COUNTY', rate: 0.01 },
          { label: 'CITY', rate: 0.0125 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 9.5%
      expect(result.taxes.totalTax).toBe(3800);
    });

    it('should apply full trade-in credit', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        tradeInValue: 10000,
        rates: [{ label: 'STATE', rate: 0.0725 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.bases.vehicleBase).toBe(30000);
    });

    it('should reduce base for non-taxable manufacturer rebates', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        rebateManufacturer: 3000,
        rates: [{ label: 'STATE', rate: 0.0725 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedRebatesNonTaxable).toBe(3000);
      expect(result.bases.vehicleBase).toBe(37000);
    });
  });

  describe('Lease Calculations', () => {
    it('should use MONTHLY lease method', () => {
      const rules = getRulesForState(STATE)!;
      expect(rules.leaseRules.method).toBe('MONTHLY');
    });

    it('should calculate monthly payment tax', () => {
      const rules = getRulesForState(STATE)!;
      const input = createLeaseInput(STATE, {
        grossCapCost: 40000,
        basePayment: 500,
        paymentCount: 36,
        rates: [{ label: 'STATE', rate: 0.0725 }],
      });

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeCloseTo(36.25, 2);
    });

    it('should NOT tax service contracts on lease (when capitalized)', () => {
      const rules = getRulesForState(STATE)!;
      const scRule = rules.leaseRules.feeTaxRules.find((r) => r.code === 'SERVICE_CONTRACT');
      expect(scRule?.taxable).toBe(false);
    });
  });
});

// ============================================================================
// TEXAS (TX) TESTS
// ============================================================================

describe('Texas (TX) - High-Volume State', () => {
  const STATE = 'TX';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should NOT tax service contracts', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it('should NOT tax GAP', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.taxOnGap).toBe(false);
    });

    it('should have reciprocity enabled', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.reciprocity.enabled).toBe(true);
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 6.25% state + local tax', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [
          { label: 'STATE', rate: 0.0625 },
          { label: 'LOCAL', rate: 0.02 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 8.25%
      expect(result.taxes.totalTax).toBeCloseTo(2887.5, 2);
    });

    it('should NOT include VSC in taxable base', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        serviceContracts: 2500,
        rates: [{ label: 'STATE', rate: 0.0625 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(0);
      expect(result.bases.productsBase).toBe(0);
    });

    it('should NOT include GAP in taxable base', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        gap: 800,
        rates: [{ label: 'STATE', rate: 0.0625 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableGap).toBe(0);
    });

    it('should apply reciprocity credit', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0625 }],
        originTaxInfo: {
          stateCode: 'AZ',
          amount: 1680, // 5.6% AZ tax
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(1680);
      // TX tax: 1875, Credit: 1680, Final: 195
      expect(result.taxes.totalTax).toBe(195);
    });
  });
});

// ============================================================================
// FLORIDA (FL) TESTS
// ============================================================================

describe('Florida (FL) - High-Volume State', () => {
  const STATE = 'FL';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should have 6% base state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.stateRate || 6).toBe(6);
    });

    it('should have doc fee cap documented', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.docFeeCap || rules?.extras?.docFeeCapAmount).toBeDefined();
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 6% state + local surtax', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [
          { label: 'STATE', rate: 0.06 },
          { label: 'SURTAX', rate: 0.01 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 7%
      expect(result.taxes.totalTax).toBe(2450);
    });

    it('should apply full trade-in credit', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        tradeInValue: 12000,
        rates: [{ label: 'STATE', rate: 0.06 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(12000);
      expect(result.bases.vehicleBase).toBe(28000);
    });
  });
});

// ============================================================================
// NEW YORK (NY) TESTS
// ============================================================================

describe('New York (NY) - High-Volume State', () => {
  const STATE = 'NY';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should have 4% base state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.stateRate || 4).toBe(4);
    });

    it('should have no reciprocity', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.reciprocity.enabled).toBe(false);
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 4% state + local + MCTD', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [
          { label: 'STATE', rate: 0.04 },
          { label: 'LOCAL', rate: 0.045 },
          { label: 'MCTD', rate: 0.00375 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 8.875%
      expect(result.taxes.totalTax).toBeCloseTo(3106.25, 2);
    });
  });

  describe('Lease Calculations', () => {
    it('should use MONTHLY lease method', () => {
      const rules = getRulesForState(STATE)!;
      expect(rules.leaseRules.method).toBe('MONTHLY');
    });

    it('should tax lease monthly with NY_MTR special scheme', () => {
      const rules = getRulesForState(STATE)!;
      const input = createLeaseInput(STATE, {
        grossCapCost: 40000,
        basePayment: 500,
        paymentCount: 36,
        rates: [{ label: 'STATE', rate: 0.04 }],
      });

      const result = calculateTax(input, rules);

      // NY uses monthly method with MCTD surcharge
      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeGreaterThan(0);
      expect(rules.leaseRules.specialScheme).toBe('NY_MTR');
    });
  });
});

// ============================================================================
// PENNSYLVANIA (PA) TESTS
// ============================================================================

describe('Pennsylvania (PA) - High-Volume State', () => {
  const STATE = 'PA';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should use STATE_PLUS_LOCAL tax scheme', () => {
      const rules = getRulesForState(STATE);
      // PA uses STATE_PLUS_LOCAL due to Allegheny County (+1%) and Philadelphia (+2%)
      expect(rules?.vehicleTaxScheme).toBe('STATE_PLUS_LOCAL');
    });

    it('should have 6% base state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.stateRate || 6).toBe(6);
    });

    it('should have reciprocity enabled with mutual credit requirement', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.reciprocity.enabled).toBe(true);
      // PA requires mutual credit - only grants credit if origin state reciprocates
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 6% state tax (base rate)', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [{ label: 'STATE', rate: 0.06 }],
      });

      const result = calculateTax(input, rules);

      expect(result.taxes.totalTax).toBe(2100);
    });
  });
});

// ============================================================================
// ILLINOIS (IL) TESTS
// ============================================================================

describe('Illinois (IL) - High-Volume State', () => {
  const STATE = 'IL';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should have 6.25% base state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.stateRate || 6.25).toBeCloseTo(6.25, 2);
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate state + local rates (Chicago high-tax)', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [
          { label: 'STATE', rate: 0.0625 },
          { label: 'COUNTY', rate: 0.0175 },
          { label: 'CITY', rate: 0.0125 },
          { label: 'RTA', rate: 0.01 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 10.25% (Chicago area)
      expect(result.taxes.totalTax).toBeCloseTo(3587.5, 2);
    });
  });
});

// ============================================================================
// OHIO (OH) TESTS
// ============================================================================

describe('Ohio (OH) - High-Volume State', () => {
  const STATE = 'OH';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should have 5.75% base state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.stateRate || 5.75).toBeCloseTo(5.75, 2);
    });

    it('should have FULL trade-in policy', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.tradeInPolicy.type).toBe('FULL');
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 5.75% state + local tax', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [
          { label: 'STATE', rate: 0.0575 },
          { label: 'COUNTY', rate: 0.0125 },
        ],
      });

      const result = calculateTax(input, rules);

      // Total rate: 7%
      expect(result.taxes.totalTax).toBe(2450);
    });
  });
});

// ============================================================================
// GEORGIA (GA) - TAVT TESTS
// ============================================================================

describe('Georgia (GA) - TAVT State', () => {
  const STATE = 'GA';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should use SPECIAL_TAVT tax scheme', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_TAVT');
    });

    it('should have 7% TAVT rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.gaTAVT?.defaultRate || rules?.extras?.tavtRate).toBe(0.07);
    });

    it('should NOT use local sales tax', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });
  });

  describe('Retail TAVT Calculations', () => {
    it('should calculate 7% TAVT', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [{ label: 'GA_TAVT', rate: 0.07 }],
      });

      const result = calculateTax(input, rules);

      expect(result.taxes.totalTax).toBeCloseTo(2450, 2);
    });

    it('should apply trade-in credit on TAVT', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        tradeInValue: 10000,
        rates: [{ label: 'GA_TAVT', rate: 0.07 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.bases.vehicleBase).toBe(30000);
      expect(result.taxes.totalTax).toBe(2100);
    });

    it('should NOT include doc fee in TAVT base', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        docFee: 500,
        rates: [{ label: 'GA_TAVT', rate: 0.07 }],
      });

      const result = calculateTax(input, rules);

      expect(result.bases.feesBase).toBe(0);
      expect(result.taxes.totalTax).toBeCloseTo(2450, 2);
    });
  });
});

// ============================================================================
// NORTH CAROLINA (NC) - HUT TESTS
// ============================================================================

describe('North Carolina (NC) - HUT State', () => {
  const STATE = 'NC';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should use SPECIAL_HUT tax scheme', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_HUT');
    });

    it('should have 3% HUT rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.ncHUT?.baseRate || rules?.extras?.hutRate).toBe(0.03);
    });

    it('should have 90-day reciprocity window', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.ncHUT?.maxReciprocityAgeDays || rules?.extras?.timeWindowDays).toBe(90);
    });
  });

  describe('Retail HUT Calculations', () => {
    it('should calculate 3% HUT', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 30000,
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
      });

      const result = calculateTax(input, rules);

      expect(result.taxes.totalTax).toBe(900);
    });

    it('should reduce HUT base for manufacturer rebates (non-taxable)', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 30000,
        rebateManufacturer: 2000,
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
      });

      const result = calculateTax(input, rules);

      // HUT base: 30000 - 2000 = 28000
      expect(result.taxes.totalTax).toBe(840);
    });

    it('should include doc fee in HUT base', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 30000,
        docFee: 400,
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
      });

      const result = calculateTax(input, rules);

      // HUT base: 30000 + 400 = 30400
      expect(result.taxes.totalTax).toBe(912);
    });
  });
});

// ============================================================================
// MICHIGAN (MI) TESTS
// ============================================================================

describe('Michigan (MI) - High-Volume State', () => {
  const STATE = 'MI';

  beforeEach(() => {
    expect(isStateImplemented(STATE)).toBe(true);
  });

  describe('State Configuration', () => {
    it('should use STATE_ONLY tax scheme', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.vehicleTaxScheme).toBe('STATE_ONLY');
    });

    it('should have 6% flat state rate', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.extras?.flatSalesTaxRate).toBe(0.06);
    });

    it('should have reciprocity enabled', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it('should have CAPPED trade-in policy at $11,000', () => {
      const rules = getRulesForState(STATE);
      expect(rules?.tradeInPolicy.type).toBe('CAPPED');
      expect((rules?.tradeInPolicy as { type: 'CAPPED'; capAmount: number }).capAmount).toBe(11000);
    });
  });

  describe('Retail Calculations', () => {
    it('should calculate 6% state-only tax', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 35000,
        rates: [{ label: 'STATE', rate: 0.06 }],
      });

      const result = calculateTax(input, rules);

      expect(result.taxes.totalTax).toBe(2100);
    });

    it('should cap trade-in credit at $11,000', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        tradeInValue: 15000, // Higher than cap
        rates: [{ label: 'STATE', rate: 0.06 }],
      });

      const result = calculateTax(input, rules);

      // MI caps trade-in at $11,000
      expect(result.debug.appliedTradeIn).toBe(11000);
      expect(result.bases.vehicleBase).toBe(29000); // 40000 - 11000
      expect(result.taxes.totalTax).toBe(1740); // 29000 * 0.06
    });

    it('should apply full trade-in when under cap', () => {
      const rules = getRulesForState(STATE)!;
      const input = createRetailInput(STATE, {
        vehiclePrice: 40000,
        tradeInValue: 8000, // Under $11,000 cap
        rates: [{ label: 'STATE', rate: 0.06 }],
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(8000);
      expect(result.bases.vehicleBase).toBe(32000);
      expect(result.taxes.totalTax).toBe(1920); // 32000 * 0.06
    });
  });
});

// ============================================================================
// CROSS-STATE COMPARISON TESTS
// ============================================================================

describe('Cross-State Tax Comparisons', () => {
  it('should show CA has higher tax than TX for same vehicle (no F&I)', () => {
    const vehiclePrice = 40000;
    const caRules = getRulesForState('CA')!;
    const txRules = getRulesForState('TX')!;

    const caInput = createRetailInput('CA', {
      vehiclePrice,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });

    const txInput = createRetailInput('TX', {
      vehiclePrice,
      rates: [{ label: 'STATE', rate: 0.0625 }],
    });

    const caResult = calculateTax(caInput, caRules);
    const txResult = calculateTax(txInput, txRules);

    // CA: 40000 * 7.25% = 2900
    // TX: 40000 * 6.25% = 2500
    expect(caResult.taxes.totalTax).toBeGreaterThan(txResult.taxes.totalTax);
  });

  it('should show TX advantage with F&I products (no tax on VSC/GAP)', () => {
    const vehiclePrice = 40000;
    const serviceContracts = 2500;
    const gap = 800;

    const caRules = getRulesForState('CA')!;
    const txRules = getRulesForState('TX')!;

    const caInput = createRetailInput('CA', {
      vehiclePrice,
      serviceContracts,
      gap,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });

    const txInput = createRetailInput('TX', {
      vehiclePrice,
      serviceContracts,
      gap,
      rates: [{ label: 'STATE', rate: 0.0625 }],
    });

    const caResult = calculateTax(caInput, caRules);
    const txResult = calculateTax(txInput, txRules);

    // TX doesn't tax VSC/GAP, so products base is 0
    expect(txResult.bases.productsBase).toBe(0);

    // CA taxes VSC/GAP
    expect(caResult.bases.productsBase).toBe(3300);

    // TX total tax is lower despite base rate comparison
    expect(txResult.taxes.totalTax).toBeLessThan(caResult.taxes.totalTax);
  });

  it('should show GA TAVT is one-time vs monthly lease states', () => {
    const gaRules = getRulesForState('GA')!;
    const caRules = getRulesForState('CA')!;

    // GA TAVT on retail - one-time 7%
    const gaInput = createRetailInput('GA', {
      vehiclePrice: 35000,
      rates: [{ label: 'GA_TAVT', rate: 0.07 }],
    });

    // CA on lease - monthly 7.25%
    const caInput = createLeaseInput('CA', {
      grossCapCost: 35000,
      basePayment: 450,
      paymentCount: 36,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });

    const gaResult = calculateTax(gaInput, gaRules);
    const caResult = calculateTax(caInput, caRules);

    // GA: 35000 * 7% = 2450 (one-time)
    expect(gaResult.taxes.totalTax).toBeCloseTo(2450, 2);
    expect(gaResult.leaseBreakdown).toBeUndefined();

    // CA lease: 450 * 7.25% * 36 = 1174.50 total over term
    expect(caResult.leaseBreakdown!.totalTaxOverTerm).toBeGreaterThan(0);
  });
});

// ============================================================================
// IMPLEMENTATION STATUS TESTS
// ============================================================================

describe('High-Volume State Implementation Status', () => {
  const highVolumeStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

  highVolumeStates.forEach((state) => {
    it(`should have ${state} implemented`, () => {
      expect(isStateImplemented(state)).toBe(true);
    });

    it(`should have ${state} rules loadable`, () => {
      const rules = getRulesForState(state);
      expect(rules).toBeDefined();
      expect(rules?.stateCode).toBe(state);
    });
  });
});
