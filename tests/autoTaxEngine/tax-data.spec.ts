/**
 * Tax Data Utilities Tests
 *
 * Tests for the tax-data.ts utility functions that provide
 * comprehensive 50-state automotive tax data access.
 */
import { describe, it, expect } from 'vitest';
import {
  STATE_TAX_DATA,
  LOCAL_TAX_RATES,
  getStateTaxInfo,
  getLocalTaxRate,
  getEffectiveTaxRate,
  hasTradeInCredit,
  getAllStates,
  type StateTax,
  type LocalTaxRate,
} from '../../shared/autoTaxEngine/tax-data';

describe('Tax Data Module', () => {
  describe('STATE_TAX_DATA constant', () => {
    it('should contain all 50 states plus DC', () => {
      const stateCount = Object.keys(STATE_TAX_DATA).length;
      // 50 states + DC = 51
      expect(stateCount).toBe(51);
    });

    it('should have valid state codes as keys', () => {
      const validStateCodes = [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY',
        'DC',
      ];

      for (const code of validStateCodes) {
        expect(STATE_TAX_DATA[code]).toBeDefined();
        expect(STATE_TAX_DATA[code].stateCode).toBe(code);
      }
    });

    it('should have required fields for each state', () => {
      for (const [code, state] of Object.entries(STATE_TAX_DATA)) {
        expect(state.state).toBe(code);
        expect(state.stateCode).toBe(code);
        expect(typeof state.stateName).toBe('string');
        expect(typeof state.baseTaxRate).toBe('number');
        expect(state.baseTaxRate).toBeGreaterThanOrEqual(0);
        expect(state.baseTaxRate).toBeLessThanOrEqual(0.15); // Max reasonable rate
        expect(['full', 'partial', 'none', 'tax_on_difference']).toContain(state.tradeInCredit);
        expect(typeof state.docFeeTaxable).toBe('boolean');
        expect(typeof state.titleFee).toBe('number');
        expect(typeof state.registrationFeeBase).toBe('number');
        expect(typeof state.hasLocalTax).toBe('boolean');
        expect(state.localTaxRanges).toHaveProperty('min');
        expect(state.localTaxRanges).toHaveProperty('max');
        expect(typeof state.averageLocalTax).toBe('number');
      }
    });

    it('should have correct tax rates for no-sales-tax states', () => {
      const noSalesTaxStates = ['AK', 'DE', 'MT', 'NH', 'OR'];
      for (const code of noSalesTaxStates) {
        expect(STATE_TAX_DATA[code].baseTaxRate).toBe(0);
      }
    });

    it('should have correct Indiana data', () => {
      const indiana = STATE_TAX_DATA.IN;
      expect(indiana.baseTaxRate).toBe(0.07);
      expect(indiana.tradeInCredit).toBe('tax_on_difference');
      expect(indiana.docFeeTaxable).toBe(true);
      expect(indiana.maxDocFee).toBe(250);
      expect(indiana.hasLocalTax).toBe(false);
      expect(indiana.warrantyTaxable).toBe(false);
      expect(indiana.gapTaxable).toBe(false);
      expect(indiana.rebateReducesTaxable).toBe(false);
    });

    it('should have correct California data', () => {
      const california = STATE_TAX_DATA.CA;
      expect(california.baseTaxRate).toBe(0.0725);
      expect(california.tradeInCredit).toBe('none');
      expect(california.maxDocFee).toBe(85);
      expect(california.hasLocalTax).toBe(true);
    });
  });

  describe('LOCAL_TAX_RATES constant', () => {
    it('should contain sample local tax rates', () => {
      expect(LOCAL_TAX_RATES.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each entry', () => {
      for (const rate of LOCAL_TAX_RATES) {
        expect(typeof rate.zipCode).toBe('string');
        expect(rate.zipCode.length).toBe(5);
        expect(typeof rate.localTaxRate).toBe('number');
        expect(rate.localTaxRate).toBeGreaterThanOrEqual(0);
        expect(rate.localTaxRate).toBeLessThanOrEqual(0.1);
      }
    });

    it('should include major cities', () => {
      const losAngeles = LOCAL_TAX_RATES.find((r) => r.city === 'Los Angeles');
      expect(losAngeles).toBeDefined();
      expect(losAngeles?.county).toBe('Los Angeles');

      const nyc = LOCAL_TAX_RATES.find((r) => r.city === 'New York City');
      expect(nyc).toBeDefined();

      const chicago = LOCAL_TAX_RATES.find((r) => r.city === 'Chicago');
      expect(chicago).toBeDefined();
    });
  });

  describe('getStateTaxInfo', () => {
    it('should return state tax info for valid state code', () => {
      const info = getStateTaxInfo('IN');
      expect(info).not.toBeNull();
      expect(info?.stateCode).toBe('IN');
      expect(info?.stateName).toBe('Indiana');
    });

    it('should handle lowercase state codes', () => {
      const info = getStateTaxInfo('in');
      expect(info).not.toBeNull();
      expect(info?.stateCode).toBe('IN');
    });

    it('should handle mixed case state codes', () => {
      const info = getStateTaxInfo('In');
      expect(info).not.toBeNull();
      expect(info?.stateCode).toBe('IN');
    });

    it('should return null for invalid state code', () => {
      const info = getStateTaxInfo('XX');
      expect(info).toBeNull();
    });

    it('should return null for empty state code', () => {
      const info = getStateTaxInfo('');
      expect(info).toBeNull();
    });

    it('should return correct info for all 50 states plus DC', () => {
      const codes = Object.keys(STATE_TAX_DATA);
      for (const code of codes) {
        const info = getStateTaxInfo(code);
        expect(info).not.toBeNull();
        expect(info?.stateCode).toBe(code);
      }
    });
  });

  describe('getLocalTaxRate', () => {
    it('should return local tax rate for known ZIP code', () => {
      const rate = getLocalTaxRate('90001'); // Los Angeles
      expect(rate).not.toBeNull();
      expect(rate?.city).toBe('Los Angeles');
      expect(rate?.localTaxRate).toBe(0.025);
    });

    it('should return local tax rate for NYC', () => {
      const rate = getLocalTaxRate('10001');
      expect(rate).not.toBeNull();
      expect(rate?.city).toBe('New York City');
      expect(rate?.localTaxRate).toBe(0.04875);
    });

    it('should return local tax rate for Chicago', () => {
      const rate = getLocalTaxRate('60601');
      expect(rate).not.toBeNull();
      expect(rate?.city).toBe('Chicago');
      expect(rate?.localTaxRate).toBe(0.0475);
    });

    it('should return null for unknown ZIP code', () => {
      const rate = getLocalTaxRate('00000');
      expect(rate).toBeNull();
    });

    it('should return null for invalid ZIP code', () => {
      const rate = getLocalTaxRate('invalid');
      expect(rate).toBeNull();
    });
  });

  describe('getEffectiveTaxRate', () => {
    it('should return base rate when no ZIP provided', () => {
      const rate = getEffectiveTaxRate('IN');
      expect(rate).toBe(0.07); // Indiana flat 7%
    });

    it('should return 0 for invalid state code', () => {
      const rate = getEffectiveTaxRate('XX');
      expect(rate).toBe(0);
    });

    it('should add local rate when ZIP code found', () => {
      const rate = getEffectiveTaxRate('CA', '90001');
      // CA base (7.25%) + LA local (2.5%)
      expect(rate).toBeCloseTo(0.0725 + 0.025, 5);
    });

    it('should use average local rate when ZIP not found but state has local taxes', () => {
      const rate = getEffectiveTaxRate('CA', '99999'); // Unknown ZIP
      // CA base (7.25%) + average local
      expect(rate).toBe(0.0725 + STATE_TAX_DATA.CA.averageLocalTax);
    });

    it('should not add local rate for states without local tax', () => {
      const rate = getEffectiveTaxRate('IN', '46201'); // Indiana ZIP
      expect(rate).toBe(0.07); // No local tax in Indiana
    });

    it('should return 0 for no-sales-tax states', () => {
      const rate = getEffectiveTaxRate('MT'); // Montana - no sales tax
      expect(rate).toBe(0);
    });

    it('should handle NYC correctly', () => {
      const rate = getEffectiveTaxRate('NY', '10001');
      // NY base (4%) + NYC local (4.875%)
      expect(rate).toBeCloseTo(0.04 + 0.04875, 5);
    });
  });

  describe('hasTradeInCredit', () => {
    it('should return true for states with trade-in credit', () => {
      expect(hasTradeInCredit('IN')).toBe(true); // tax_on_difference
      expect(hasTradeInCredit('TX')).toBe(true); // tax_on_difference
      expect(hasTradeInCredit('FL')).toBe(true); // tax_on_difference
      expect(hasTradeInCredit('IL')).toBe(true); // partial
    });

    it('should return false for states without trade-in credit', () => {
      expect(hasTradeInCredit('CA')).toBe(false); // none
      expect(hasTradeInCredit('NJ')).toBe(false); // none
      expect(hasTradeInCredit('MD')).toBe(false); // none
      expect(hasTradeInCredit('WA')).toBe(false); // none
    });

    it('should return false for invalid state code', () => {
      expect(hasTradeInCredit('XX')).toBe(false);
    });

    it('should handle lowercase state codes', () => {
      expect(hasTradeInCredit('in')).toBe(true);
      expect(hasTradeInCredit('ca')).toBe(false);
    });
  });

  describe('getAllStates', () => {
    it('should return all 51 entries (50 states + DC)', () => {
      const states = getAllStates();
      expect(states.length).toBe(51);
    });

    it('should return states sorted alphabetically by name', () => {
      const states = getAllStates();
      for (let i = 1; i < states.length; i++) {
        expect(states[i - 1].stateName.localeCompare(states[i].stateName)).toBeLessThanOrEqual(0);
      }
    });

    it('should have Alabama first (alphabetically)', () => {
      const states = getAllStates();
      expect(states[0].stateCode).toBe('AL');
      expect(states[0].stateName).toBe('Alabama');
    });

    it('should have Wyoming last (alphabetically)', () => {
      const states = getAllStates();
      expect(states[states.length - 1].stateCode).toBe('WY');
      expect(states[states.length - 1].stateName).toBe('Wyoming');
    });

    it('should include DC in the list', () => {
      const states = getAllStates();
      const dc = states.find((s) => s.stateCode === 'DC');
      expect(dc).toBeDefined();
      expect(dc?.stateName).toBe('District of Columbia');
    });
  });

  describe('Edge Cases', () => {
    it('should handle states with luxury tax thresholds', () => {
      const ct = getStateTaxInfo('CT');
      expect(ct?.luxuryTaxThreshold).toBe(50000);
      expect(ct?.luxuryTaxRate).toBe(0.0775);
    });

    it('should handle states with tax caps', () => {
      const sc = getStateTaxInfo('SC');
      expect(sc?.capOnTax).toBe(500);

      const nc = getStateTaxInfo('NC');
      expect(nc?.capOnTax).toBe(2000);
    });

    it('should handle states with EV incentives', () => {
      const ca = getStateTaxInfo('CA');
      expect(ca?.evIncentive).toBe(2000);

      const ct = getStateTaxInfo('CT');
      expect(ct?.evIncentive).toBe(5000);
    });

    it('should handle states with special rules', () => {
      const ga = getStateTaxInfo('GA');
      expect(ga?.specialRules).toContain(
        'Uses Title Ad Valorem Tax (TAVT) instead of annual ad valorem tax'
      );

      const az = getStateTaxInfo('AZ');
      expect(az?.specialRules).toContain('Uses Vehicle License Tax (VLT) instead of sales tax');
    });

    it('should handle states with partial trade-in credit limits', () => {
      const il = getStateTaxInfo('IL');
      expect(il?.tradeInCredit).toBe('partial');
      expect(il?.tradeInCreditLimit).toBe(10000);
    });
  });
});
