/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { getRulesForState, isStateImplemented } from '../../shared/autoTaxEngine';

describe('Louisiana Tax Rules Configuration', () => {
  it('should load Louisiana rules successfully', () => {
    const rules = getRulesForState('LA');
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe('LA');
  });

  it('should mark Louisiana as implemented (not a stub)', () => {
    expect(isStateImplemented('LA')).toBe(true);
  });

  it('should have correct version number', () => {
    const rules = getRulesForState('LA');
    expect(rules?.version).toBe(2);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe('Retail - Trade-in Policy', () => {
    it('should have FULL trade-in policy (unlimited)', () => {
      const rules = getRulesForState('LA');
      expect(rules?.tradeInPolicy.type).toBe('FULL');
    });
  });

  describe('Retail - Rebate Rules', () => {
    it('should have correct rebate rules', () => {
      const rules = getRulesForState('LA');
      expect(rules?.rebates).toHaveLength(2);
    });

    it('should mark manufacturer rebates as NON-taxable', () => {
      const rules = getRulesForState('LA');
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === 'MANUFACTURER');
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain('NOT taxable');
    });

    it('should mark dealer rebates as NON-taxable', () => {
      const rules = getRulesForState('LA');
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === 'DEALER');
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain('NOT taxable');
    });
  });

  describe('Retail - Doc Fee', () => {
    it('should mark doc fee as taxable (likely)', () => {
      const rules = getRulesForState('LA');
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it('should have doc fee in fee tax rules', () => {
      const rules = getRulesForState('LA');
      const docFee = rules?.feeTaxRules.find((r) => r.code === 'DOC_FEE');
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain('$425');
    });
  });

  describe('Retail - Backend Products', () => {
    it('should mark service contracts as EXEMPT (likely, verify)', () => {
      const rules = getRulesForState('LA');
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === 'SERVICE_CONTRACT');
      expect(serviceContract).toBeDefined();
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain('LIKELY EXEMPT');
      expect(serviceContract?.notes).toContain('VERIFY');
    });

    it('should mark GAP as EXEMPT (likely, verify)', () => {
      const rules = getRulesForState('LA');
      const gap = rules?.feeTaxRules.find((r) => r.code === 'GAP');
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain('LIKELY EXEMPT');
      expect(gap?.notes).toContain('VERIFY');
    });

    it('should have title fees as non-taxable', () => {
      const rules = getRulesForState('LA');
      const title = rules?.feeTaxRules.find((r) => r.code === 'TITLE');
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it('should have registration fees as non-taxable', () => {
      const rules = getRulesForState('LA');
      const reg = rules?.feeTaxRules.find((r) => r.code === 'REG');
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe('Retail - Product Taxability', () => {
    it('should tax accessories', () => {
      const rules = getRulesForState('LA');
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it('should NOT tax negative equity', () => {
      const rules = getRulesForState('LA');
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it('should NOT tax service contracts', () => {
      const rules = getRulesForState('LA');
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it('should NOT tax GAP', () => {
      const rules = getRulesForState('LA');
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe('Retail - Tax Scheme', () => {
    it('should use STATE_PLUS_LOCAL vehicle tax scheme', () => {
      const rules = getRulesForState('LA');
      expect(rules?.vehicleTaxScheme).toBe('STATE_PLUS_LOCAL');
    });

    it('should use local sales tax', () => {
      const rules = getRulesForState('LA');
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe('Lease - Method', () => {
    it('should use MONTHLY lease taxation method', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.method).toBe('MONTHLY');
    });
  });

  describe('Lease - Cap Cost Reduction', () => {
    it('should NOT tax cap cost reduction (unclear, needs verification)', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe('Lease - Rebates', () => {
    it('should follow retail rebate rules', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.rebateBehavior).toBe('FOLLOW_RETAIL_RULE');
    });
  });

  describe('Lease - Doc Fee', () => {
    it('should follow retail doc fee rules', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.docFeeTaxability).toBe('FOLLOW_RETAIL_RULE');
    });

    it('should have doc fee as taxable in lease fee rules', () => {
      const rules = getRulesForState('LA');
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'DOC_FEE');
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe('Lease - Trade-in Credit', () => {
    it('should follow retail trade-in rules (unclear, verify)', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.tradeInCredit).toBe('FOLLOW_RETAIL_RULE');
    });
  });

  describe('Lease - Negative Equity', () => {
    it('should NOT tax negative equity on leases', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe('Lease - Backend Products', () => {
    it('should mark service contracts as EXEMPT on leases', () => {
      const rules = getRulesForState('LA');
      const serviceContract = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === 'SERVICE_CONTRACT'
      );
      expect(serviceContract).toBeDefined();
      expect(serviceContract?.taxable).toBe(false);
    });

    it('should mark GAP as EXEMPT on leases', () => {
      const rules = getRulesForState('LA');
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'GAP');
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it('should have title as non-taxable on leases', () => {
      const rules = getRulesForState('LA');
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'TITLE');
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it('should have registration as non-taxable on leases', () => {
      const rules = getRulesForState('LA');
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'REG');
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe('Lease - Title Fee Rules', () => {
    it('should have correct title fee configuration', () => {
      const rules = getRulesForState('LA');
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === 'TITLE');
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe('Lease - Fee Timing', () => {
    it('should tax fees upfront', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  describe('Lease - Special Scheme', () => {
    it('should have no special scheme', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.specialScheme).toBe('NONE');
    });
  });

  describe('Lease - Notes', () => {
    it('should have comprehensive lease notes', () => {
      const rules = getRulesForState('LA');
      expect(rules?.leaseRules.notes).toBeDefined();
      expect(rules?.leaseRules.notes).toContain('MONTHLY');
      expect(rules?.leaseRules.notes).toContain('1.45%');
      expect(rules?.leaseRules.notes).toContain('Transportation Trust Fund');
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe('Reciprocity', () => {
    it('should have reciprocity enabled', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it('should apply to both retail and lease', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.scope).toBe('BOTH');
    });

    it('should use CREDIT_UP_TO_STATE_RATE behavior', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.homeStateBehavior).toBe('CREDIT_UP_TO_STATE_RATE');
    });

    it('should require proof of tax paid', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it('should use TAX_PAID basis', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.basis).toBe('TAX_PAID');
    });

    it('should cap at Louisiana tax', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it('should not have lease exception', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it('should have reciprocity notes mentioning rate-to-rate and $90 cap', () => {
      const rules = getRulesForState('LA');
      expect(rules?.reciprocity.notes).toContain('RECIPROCAL');
      expect(rules?.reciprocity.notes).toContain('RATE-TO-RATE');
      expect(rules?.reciprocity.notes).toContain('$90');
    });
  });

  // ============================================================================
  // EXTRAS / METADATA TESTS
  // ============================================================================

  describe('Extras - Metadata', () => {
    it('should have extras metadata', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras).toBeDefined();
    });

    it('should have last updated date', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.lastUpdated).toBe('2025-11-13');
    });

    it('should have comprehensive sources list', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect((rules?.extras?.sources as string[]).length).toBeGreaterThan(10);
    });

    it('should have detailed notes', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes).toContain('5%');
      expect(rules?.extras?.notes).toContain('DOMICILE-BASED');
    });

    it('should have state rate of 5.0%', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.stateRate).toBe(5.0);
    });

    it('should have historical rate information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.rateHistorical).toBeDefined();
      expect(rules?.extras?.rateHistorical?.['pre-2025-01-01']).toBe(4.45);
      expect(rules?.extras?.rateHistorical?.['2025-01-01-to-2029-12-31']).toBe(5.0);
      expect(rules?.extras?.rateHistorical?.['2030-01-01-onwards']).toBe(4.75);
    });

    it('should have rate change effective date', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.rateChangeEffectiveDate).toBe('2025-01-01');
    });

    it('should have future rate change information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.futureRateChange).toBeDefined();
      expect(rules?.extras?.futureRateChange?.date).toBe('2030-01-01');
      expect(rules?.extras?.futureRateChange?.rate).toBe(4.75);
    });

    it('should have local rate range', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.localRateRange).toBeDefined();
      expect(rules?.extras?.localRateRange?.min).toBe(0.0);
      expect(rules?.extras?.localRateRange?.max).toBe(7.0);
    });

    it('should have combined rate range', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(5.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(13.5);
    });

    it('should have highest rate jurisdictions', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.highestRateJurisdictions).toBeDefined();
      expect(Array.isArray(rules?.extras?.highestRateJurisdictions)).toBe(true);
      expect((rules?.extras?.highestRateJurisdictions as any[]).length).toBeGreaterThanOrEqual(2);
    });

    it('should have lowest rate jurisdiction', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.lowestRateJurisdiction).toBeDefined();
      expect(rules?.extras?.lowestRateJurisdiction?.name).toBe('Cameron Parish');
      expect(rules?.extras?.lowestRateJurisdiction?.rate).toBe(5.0);
    });

    it('should have doc fee cap of $425', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.docFeeCap).toBe(425);
    });

    it('should have lease tax rates breakdown', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.leaseTaxRates).toBeDefined();
      expect(rules?.extras?.leaseTaxRates?.state).toBe(1.45);
      expect(rules?.extras?.leaseTaxRates?.baseLeaseTax).toBe(1.0);
      expect(rules?.extras?.leaseTaxRates?.additionalLeaseTax).toBe(0.45);
    });

    it('should have new resident use tax cap information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.newResidentUseTaxCap).toBeDefined();
      expect(rules?.extras?.newResidentUseTaxCap?.amount).toBe(90);
      expect(rules?.extras?.newResidentUseTaxCap?.effectiveDate).toBe('2025-01-01');
    });

    it('should have antique vehicle exemption information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.antiqueVehicleExemption).toBeDefined();
      expect(rules?.extras?.antiqueVehicleExemption?.effectiveDate).toBe('2019-07-01');
    });

    it('should have orthopedic disability rebate information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.orthopedicDisabilityRebate).toBeDefined();
      expect(rules?.extras?.orthopedicDisabilityRebate?.statute).toBe('RS 47:305.72');
    });

    it('should indicate domicile-based taxation', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.domicileBasedTaxation).toBe(true);
    });

    it('should have verification needed list', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.verificationNeeded).toBeDefined();
      expect(Array.isArray(rules?.extras?.verificationNeeded)).toBe(true);
      expect((rules?.extras?.verificationNeeded as string[]).length).toBeGreaterThan(5);
    });

    it('should have contact information', () => {
      const rules = getRulesForState('LA');
      expect(rules?.extras?.contactInfo).toBeDefined();
      expect(rules?.extras?.contactInfo?.phone).toBe('855-307-3893');
      expect(rules?.extras?.contactInfo?.email).toBe('sales.inquiries@la.gov');
      expect(rules?.extras?.contactInfo?.website).toContain('revenue.louisiana.gov');
    });
  });

  // ============================================================================
  // CASE SENSITIVITY TESTS
  // ============================================================================

  describe('Case Insensitivity', () => {
    it('should handle case-insensitive state code lookup', () => {
      const rulesUpper = getRulesForState('LA');
      const rulesLower = getRulesForState('la');
      const rulesMixed = getRulesForState('La');

      expect(rulesUpper).toBeDefined();
      expect(rulesLower).toBeDefined();
      expect(rulesMixed).toBeDefined();
      expect(rulesUpper?.stateCode).toBe('LA');
      expect(rulesLower?.stateCode).toBe('LA');
      expect(rulesMixed?.stateCode).toBe('LA');
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle Cameron Parish (lowest rate jurisdiction)', () => {
      const rules = getRulesForState('LA');
      // Cameron Parish has only state tax (5%), no local tax
      expect(rules?.extras?.lowestRateJurisdiction?.rate).toBe(5.0);
      expect(rules?.extras?.combinedRateRange?.min).toBe(5.0);
    });

    it('should handle Monroe (highest rate jurisdiction)', () => {
      const rules = getRulesForState('LA');
      // Monroe has the highest combined rate (13.5%)
      const highestRates = rules?.extras?.highestRateJurisdictions as any[];
      const monroe = highestRates?.find((j) => j.name === 'Monroe');
      expect(monroe).toBeDefined();
      expect(monroe?.rate).toBe(13.5);
    });

    it('should handle new resident use tax cap scenario', () => {
      const rules = getRulesForState('LA');
      // New residents who qualify pay maximum $90 use tax
      expect(rules?.extras?.newResidentUseTaxCap?.amount).toBe(90);
      expect(rules?.extras?.newResidentUseTaxCap?.requirements).toBeDefined();
      expect((rules?.extras?.newResidentUseTaxCap?.requirements as string[]).length).toBe(3);
    });

    it('should handle state rate change timeline correctly', () => {
      const rules = getRulesForState('LA');
      // Verify all three rate periods
      expect(rules?.extras?.rateHistorical?.['pre-2025-01-01']).toBe(4.45);
      expect(rules?.extras?.stateRate).toBe(5.0); // Current rate
      expect(rules?.extras?.futureRateChange?.rate).toBe(4.75); // Future rate
    });

    it('should handle lease tax rate calculation', () => {
      const rules = getRulesForState('LA');
      // Lease tax is 1% + 0.45% = 1.45% state
      const baseTax = Number(rules?.extras?.leaseTaxRates?.baseLeaseTax) || 0;
      const additionalTax = Number(rules?.extras?.leaseTaxRates?.additionalLeaseTax) || 0;
      const totalStateLeaseTax = Number(rules?.extras?.leaseTaxRates?.state) || 0;
      expect(baseTax + additionalTax).toBeCloseTo(totalStateLeaseTax, 4);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration - Retail Scenario', () => {
    it('should correctly configure for a typical retail purchase', () => {
      const rules = getRulesForState('LA');

      // Verify retail configuration
      expect(rules?.tradeInPolicy.type).toBe('FULL');
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.taxOnAccessories).toBe(true);
      expect(rules?.taxOnNegativeEquity).toBe(false);
      expect(rules?.vehicleTaxScheme).toBe('STATE_PLUS_LOCAL');

      // Verify rebates reduce taxable base
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === 'MANUFACTURER');
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === 'DEALER');
      expect(mfrRebate?.taxable).toBe(false);
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe('Integration - Lease Scenario', () => {
    it('should correctly configure for a typical lease', () => {
      const rules = getRulesForState('LA');

      // Verify lease configuration
      expect(rules?.leaseRules.method).toBe('MONTHLY');
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
      expect(rules?.leaseRules.tradeInCredit).toBe('FOLLOW_RETAIL_RULE');
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);

      // Verify backend products are exempt
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'SERVICE_CONTRACT');
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === 'GAP');
      expect(vsc?.taxable).toBe(false);
      expect(gap?.taxable).toBe(false);
    });
  });

  describe('Integration - Reciprocity Scenario', () => {
    it('should correctly configure for out-of-state purchase', () => {
      const rules = getRulesForState('LA');

      // Verify reciprocity configuration
      expect(rules?.reciprocity.enabled).toBe(true);
      expect(rules?.reciprocity.homeStateBehavior).toBe('CREDIT_UP_TO_STATE_RATE');
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);

      // Credit applies to state tax only (5%), not parish/municipal
      expect(rules?.extras?.stateRate).toBe(5.0);
    });
  });
});
