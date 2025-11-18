import { describe, it, expect } from 'vitest';
import {
  calculateDealerGradeLease,
  moneyFactorToAPR,
  aprToMoneyFactor,
  getLeaseTaxConfig,
  DealerGradeLeaseInput,
} from './calculations';

describe('Lease Calculation Engine', () => {
  describe('Money Factor / APR Conversion', () => {
    it('converts money factor to APR correctly', () => {
      expect(moneyFactorToAPR(0.00250)).toBe(6.0);
      expect(moneyFactorToAPR(0.00200)).toBe(4.8);
      expect(moneyFactorToAPR(0.00125)).toBe(3.0);
    });

    it('converts APR to money factor correctly', () => {
      expect(aprToMoneyFactor(6.0)).toBe(0.0025);
      expect(aprToMoneyFactor(4.8)).toBe(0.002);
      expect(aprToMoneyFactor(3.0)).toBe(0.00125);
    });
  });

  describe('Example 1: Standard 36/10 CA Lease (Tax on Payment)', () => {
    const input: DealerGradeLeaseInput = {
      msrp: 35000,
      sellingPrice: 33500,
      residualPercent: 0.60,
      term: 36,
      moneyFactor: 0.00200,
      acquisitionFee: 595,
      acquisitionFeeCapitalized: true,
      docFee: 85,
      docFeeCapitalized: true,
      dealerFees: [],
      governmentFees: [{ name: 'DMV', amount: 450, capitalized: false }],
      accessories: [],
      aftermarketProducts: [],
      cashDown: 3500,
      tradeAllowance: 8000,
      tradePayoff: 6500,
      manufacturerRebate: 1000,
      otherIncentives: 0,
      taxMethod: 'payment',
      taxRate: 0.095, // 9.5%
      stateCode: 'CA',
    };

    const result = calculateDealerGradeLease(input);

    it('calculates residual value correctly (MSRP × residual%)', () => {
      expect(result.residualValue).toBe(21000);
    });

    it('calculates gross cap cost correctly', () => {
      // Selling price + acq fee + doc fee = 33500 + 595 + 85 = 34180
      expect(result.grossCapCost).toBe(34180);
    });

    it('calculates total cap reductions correctly', () => {
      // Cash down + trade equity + rebates = 3500 + 1500 + 1000 = 6000
      expect(result.totalCapReductions).toBe(6000);
    });

    it('calculates adjusted cap cost correctly', () => {
      // Gross cap - reductions = 34180 - 6000 = 28180
      expect(result.adjustedCapCost).toBe(28180);
    });

    it('calculates depreciation correctly', () => {
      // Adjusted cap - residual = 28180 - 21000 = 7180
      expect(result.depreciation).toBe(7180);
    });

    it('calculates monthly depreciation charge correctly', () => {
      // Depreciation / term = 7180 / 36 = 199.44
      expect(result.monthlyDepreciationCharge).toBeCloseTo(199.44, 2);
    });

    it('calculates monthly rent charge correctly', () => {
      // (Adjusted cap + residual) × MF = (28180 + 21000) × 0.002 = 98.36
      expect(result.monthlyRentCharge).toBeCloseTo(98.36, 2);
    });

    it('calculates base monthly payment correctly', () => {
      // Depreciation + rent = 199.44 + 98.36 = 297.80
      expect(result.baseMonthlyPayment).toBeCloseTo(297.80, 2);
    });

    it('calculates monthly tax correctly (payment method)', () => {
      // Base payment × tax rate = 297.80 × 0.095 = 28.29
      expect(result.monthlyTax).toBeCloseTo(28.29, 2);
    });

    it('calculates total monthly payment correctly', () => {
      // Base + tax = 297.80 + 28.29 = 326.09
      expect(result.totalMonthlyPayment).toBeCloseTo(326.09, 2);
    });

    it('calculates drive-off total correctly', () => {
      // First payment + cash down + DMV fee
      // 326.09 + 3500 + 450 = 4276.09
      expect(result.driveOffTotal).toBeCloseTo(4276.09, 2);
    });

    it('calculates APR equivalent correctly', () => {
      // MF × 2400 = 0.002 × 2400 = 4.8
      expect(result.aprEquivalent).toBe(4.8);
    });
  });

  describe('Example 2: Zero-Down Lease (Everything Capitalized)', () => {
    const input: DealerGradeLeaseInput = {
      msrp: 35000,
      sellingPrice: 33500,
      residualPercent: 0.60,
      term: 36,
      moneyFactor: 0.00200,
      acquisitionFee: 595,
      acquisitionFeeCapitalized: true,
      docFee: 85,
      docFeeCapitalized: true,
      dealerFees: [],
      governmentFees: [{ name: 'DMV', amount: 450, capitalized: true }], // Capitalized this time
      accessories: [],
      aftermarketProducts: [],
      cashDown: 0, // Zero down
      tradeAllowance: 0, // No trade
      tradePayoff: 0,
      manufacturerRebate: 1000,
      otherIncentives: 0,
      taxMethod: 'payment',
      taxRate: 0.095,
      stateCode: 'CA',
    };

    const result = calculateDealerGradeLease(input);

    it('calculates gross cap cost with DMV capitalized', () => {
      // Selling + acq + doc + DMV = 33500 + 595 + 85 + 450 = 34630
      expect(result.grossCapCost).toBe(34630);
    });

    it('calculates adjusted cap cost correctly', () => {
      // Gross - rebate = 34630 - 1000 = 33630
      expect(result.adjustedCapCost).toBe(33630);
    });

    it('calculates higher monthly payment for zero-down', () => {
      // Higher cap cost = higher payment
      expect(result.totalMonthlyPayment).toBeCloseTo(503.80, 2);
    });

    it('calculates minimal drive-off (first payment only)', () => {
      // Just the first payment (no cash down, no upfront fees)
      expect(result.driveOffTotal).toBeCloseTo(503.80, 2);
    });
  });

  describe('Example 3: Texas Lease (Tax on Total Cap Cost)', () => {
    const input: DealerGradeLeaseInput = {
      msrp: 35000,
      sellingPrice: 33500,
      residualPercent: 0.60,
      term: 36,
      moneyFactor: 0.00200,
      acquisitionFee: 595,
      acquisitionFeeCapitalized: true,
      docFee: 85,
      docFeeCapitalized: true,
      dealerFees: [],
      governmentFees: [{ name: 'DMV', amount: 450, capitalized: false }],
      accessories: [],
      aftermarketProducts: [],
      cashDown: 3500,
      tradeAllowance: 8000,
      tradePayoff: 6500,
      manufacturerRebate: 1000,
      otherIncentives: 0,
      taxMethod: 'total_cap', // TX style
      taxRate: 0.0625, // 6.25%
      stateCode: 'TX',
    };

    const result = calculateDealerGradeLease(input);

    it('calculates base monthly payment (same as CA)', () => {
      expect(result.baseMonthlyPayment).toBeCloseTo(297.80, 2);
    });

    it('has no monthly tax (all upfront)', () => {
      expect(result.monthlyTax).toBe(0);
    });

    it('calculates upfront tax on adjusted cap cost', () => {
      // Adjusted cap × tax rate = 28180 × 0.0625 = 1761.25
      expect(result.driveOffBreakdown.upfrontTax).toBeCloseTo(1761.25, 2);
    });

    it('calculates total monthly payment (no tax added)', () => {
      expect(result.totalMonthlyPayment).toBeCloseTo(297.80, 2);
    });

    it('calculates higher drive-off due to upfront tax', () => {
      // First payment + cash down + DMV + upfront tax
      // 297.80 + 3500 + 450 + 1761.25 = 6009.05
      expect(result.driveOffTotal).toBeCloseTo(6009.05, 2);
    });
  });

  describe('Negative Equity Handling', () => {
    it('adds negative equity to gross cap cost', () => {
      const input: DealerGradeLeaseInput = {
        msrp: 35000,
        sellingPrice: 33500,
        residualPercent: 0.60,
        term: 36,
        moneyFactor: 0.00200,
        acquisitionFee: 595,
        acquisitionFeeCapitalized: true,
        docFee: 85,
        docFeeCapitalized: true,
        dealerFees: [],
        governmentFees: [],
        accessories: [],
        aftermarketProducts: [],
        cashDown: 0,
        tradeAllowance: 5000, // Trade value
        tradePayoff: 8000, // Payoff higher = negative equity
        manufacturerRebate: 0,
        otherIncentives: 0,
        taxMethod: 'payment',
        taxRate: 0.095,
        stateCode: 'CA',
      };

      const result = calculateDealerGradeLease(input);

      // Negative equity of $3000 should be added to cap
      // Gross cap = 33500 + 595 + 85 = 34180
      // Adjusted cap = 34180 + 3000 (neg equity) - 0 (no reductions) = 37180
      expect(result.adjustedCapCost).toBe(37180);
    });
  });

  describe('Fee Capitalization', () => {
    it('does not capitalize upfront fees into cap cost', () => {
      const input: DealerGradeLeaseInput = {
        msrp: 35000,
        sellingPrice: 33500,
        residualPercent: 0.60,
        term: 36,
        moneyFactor: 0.00200,
        acquisitionFee: 595,
        acquisitionFeeCapitalized: false, // Upfront
        docFee: 85,
        docFeeCapitalized: false, // Upfront
        dealerFees: [],
        governmentFees: [{ name: 'DMV', amount: 450, capitalized: false }],
        accessories: [],
        aftermarketProducts: [],
        cashDown: 0,
        tradeAllowance: 0,
        tradePayoff: 0,
        manufacturerRebate: 0,
        otherIncentives: 0,
        taxMethod: 'payment',
        taxRate: 0.095,
        stateCode: 'CA',
      };

      const result = calculateDealerGradeLease(input);

      // Only selling price in gross cap
      expect(result.grossCapCost).toBe(33500);

      // All fees should be in drive-off
      expect(result.driveOffBreakdown.acquisitionFee).toBe(595);
      expect(result.driveOffBreakdown.docFee).toBe(85);
    });
  });

  describe('State Tax Configuration', () => {
    it('returns correct config for California', () => {
      const config = getLeaseTaxConfig('CA');
      expect(config.taxMethod).toBe('payment');
      expect(config.stateTaxRate).toBe(0.0725);
    });

    it('returns correct config for Texas', () => {
      const config = getLeaseTaxConfig('TX');
      expect(config.taxMethod).toBe('total_cap');
      expect(config.stateTaxRate).toBe(0.0625);
      expect(config.capReductionTaxable).toBe(true);
    });

    it('returns correct config for Illinois', () => {
      const config = getLeaseTaxConfig('IL');
      expect(config.taxMethod).toBe('selling_price');
    });

    it('returns default payment method for unknown states', () => {
      const config = getLeaseTaxConfig('ZZ');
      expect(config.taxMethod).toBe('payment');
    });
  });

  describe('Total Lease Cost Calculations', () => {
    it('calculates total of payments correctly', () => {
      const input: DealerGradeLeaseInput = {
        msrp: 35000,
        sellingPrice: 33500,
        residualPercent: 0.60,
        term: 36,
        moneyFactor: 0.00200,
        acquisitionFee: 595,
        acquisitionFeeCapitalized: true,
        docFee: 85,
        docFeeCapitalized: true,
        dealerFees: [],
        governmentFees: [{ name: 'DMV', amount: 450, capitalized: false }],
        accessories: [],
        aftermarketProducts: [],
        cashDown: 3500,
        tradeAllowance: 8000,
        tradePayoff: 6500,
        manufacturerRebate: 1000,
        otherIncentives: 0,
        taxMethod: 'payment',
        taxRate: 0.095,
        stateCode: 'CA',
      };

      const result = calculateDealerGradeLease(input);

      // Total of payments = monthly × term
      const expectedTotal = result.totalMonthlyPayment * 36;
      expect(result.totalOfPayments).toBeCloseTo(expectedTotal, 2);
    });

    it('calculates total lease cost correctly', () => {
      const input: DealerGradeLeaseInput = {
        msrp: 35000,
        sellingPrice: 33500,
        residualPercent: 0.60,
        term: 36,
        moneyFactor: 0.00200,
        acquisitionFee: 595,
        acquisitionFeeCapitalized: true,
        docFee: 85,
        docFeeCapitalized: true,
        dealerFees: [],
        governmentFees: [{ name: 'DMV', amount: 450, capitalized: false }],
        accessories: [],
        aftermarketProducts: [],
        cashDown: 3500,
        tradeAllowance: 8000,
        tradePayoff: 6500,
        manufacturerRebate: 1000,
        otherIncentives: 0,
        taxMethod: 'payment',
        taxRate: 0.095,
        stateCode: 'CA',
      };

      const result = calculateDealerGradeLease(input);

      // Total cost = total of payments + drive-off
      const expectedCost = result.totalOfPayments + result.driveOffTotal;
      expect(result.totalLeaseCost).toBeCloseTo(expectedCost, 2);
    });
  });
});
