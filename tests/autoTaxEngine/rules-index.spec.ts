/**
 * Rules Index Module Tests
 *
 * Tests for the rules/index.ts module that provides state rules management
 * functions including getRulesForState, getAllStateCodes, isStateImplemented,
 * getImplementedStates, and getStubStates.
 */
import { describe, it, expect } from 'vitest';
import {
  STATE_RULES_MAP,
  getRulesForState,
  getAllStateCodes,
  isStateImplemented,
  getImplementedStates,
  getStubStates,
} from '../../shared/autoTaxEngine/rules';
import type { TaxRulesConfig } from '../../shared/autoTaxEngine/types';

describe('Rules Index Module', () => {
  describe('STATE_RULES_MAP constant', () => {
    it('should contain all 50 US states', () => {
      const expectedStates = [
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
      ];

      expect(Object.keys(STATE_RULES_MAP).length).toBe(50);

      for (const state of expectedStates) {
        expect(STATE_RULES_MAP[state]).toBeDefined();
      }
    });

    it('should have valid TaxRulesConfig for each state', () => {
      for (const [code, rules] of Object.entries(STATE_RULES_MAP)) {
        expect(rules.stateCode).toBe(code);
        expect(typeof rules.version).toBe('number');
        expect(rules.tradeInPolicy).toBeDefined();
        expect(rules.rebates).toBeDefined();
        expect(typeof rules.docFeeTaxable).toBe('boolean');
        expect(rules.leaseRules).toBeDefined();
        expect(rules.reciprocity).toBeDefined();
      }
    });
  });

  describe('getRulesForState', () => {
    it('should return rules for valid uppercase state code', () => {
      const rules = getRulesForState('IN');
      expect(rules).toBeDefined();
      expect(rules?.stateCode).toBe('IN');
    });

    it('should return rules for lowercase state code', () => {
      const rules = getRulesForState('in');
      expect(rules).toBeDefined();
      expect(rules?.stateCode).toBe('IN');
    });

    it('should return rules for mixed case state code', () => {
      const rules = getRulesForState('In');
      expect(rules).toBeDefined();
      expect(rules?.stateCode).toBe('IN');
    });

    it('should return undefined for invalid state code', () => {
      const rules = getRulesForState('XX');
      expect(rules).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const rules = getRulesForState('');
      expect(rules).toBeUndefined();
    });

    it('should return rules for all 50 states', () => {
      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(rules).toBeDefined();
        expect(rules?.stateCode).toBe(code);
      }
    });

    it('should return correct Indiana rules', () => {
      const rules = getRulesForState('IN');
      expect(rules).toBeDefined();
      expect(rules?.stateCode).toBe('IN');
      expect(rules?.tradeInPolicy.type).toBe('FULL');
      expect(rules?.vehicleTaxScheme).toBe('STATE_ONLY');
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it('should return correct Georgia TAVT rules', () => {
      const rules = getRulesForState('GA');
      expect(rules).toBeDefined();
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_TAVT');
      // GA TAVT config is in extras.gaTAVT
      expect(rules?.extras?.gaTAVT).toBeDefined();
      expect(rules?.extras?.gaTAVT?.defaultRate).toBe(0.07);
    });

    it('should return correct North Carolina HUT rules', () => {
      const rules = getRulesForState('NC');
      expect(rules).toBeDefined();
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_HUT');
      // NC HUT config is in extras.ncHUT
      expect(rules?.extras?.ncHUT).toBeDefined();
      expect(rules?.extras?.ncHUT?.baseRate).toBe(0.03);
    });

    it('should return correct West Virginia privilege tax rules', () => {
      const rules = getRulesForState('WV');
      expect(rules).toBeDefined();
      expect(rules?.vehicleTaxScheme).toBe('DMV_PRIVILEGE_TAX');
      // WV Privilege config is in extras.wvPrivilege
      expect(rules?.extras?.wvPrivilege).toBeDefined();
    });
  });

  describe('getAllStateCodes', () => {
    it('should return array of 50 state codes', () => {
      const codes = getAllStateCodes();
      expect(codes).toHaveLength(50);
    });

    it('should return all uppercase two-letter codes', () => {
      const codes = getAllStateCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });

    it('should contain all expected states', () => {
      const codes = getAllStateCodes();
      const expectedStates = [
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
      ];

      for (const state of expectedStates) {
        expect(codes).toContain(state);
      }
    });

    it('should return a new array each time', () => {
      const codes1 = getAllStateCodes();
      const codes2 = getAllStateCodes();
      expect(codes1).not.toBe(codes2);
      expect(codes1).toEqual(codes2);
    });
  });

  describe('isStateImplemented', () => {
    it('should return true for fully implemented states', () => {
      // Major implemented states
      const implementedStates = ['IN', 'CA', 'TX', 'FL', 'NY', 'GA', 'NC', 'WV', 'MI', 'OH'];
      for (const state of implementedStates) {
        expect(isStateImplemented(state)).toBe(true);
      }
    });

    it('should return false for stub states', () => {
      const stubStates = getStubStates();
      for (const state of stubStates) {
        expect(isStateImplemented(state)).toBe(false);
      }
    });

    it('should return false for invalid state code', () => {
      expect(isStateImplemented('XX')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isStateImplemented('')).toBe(false);
    });

    it('should handle lowercase state codes', () => {
      expect(isStateImplemented('in')).toBe(true);
    });

    it('should correctly identify states based on extras.status', () => {
      // Test a few known states
      const inRules = getRulesForState('IN');
      if (inRules?.extras?.status === 'STUB') {
        expect(isStateImplemented('IN')).toBe(false);
      } else {
        expect(isStateImplemented('IN')).toBe(true);
      }
    });
  });

  describe('getImplementedStates', () => {
    it('should return array of implemented state codes', () => {
      const implemented = getImplementedStates();
      expect(Array.isArray(implemented)).toBe(true);
      expect(implemented.length).toBeGreaterThan(0);
    });

    it('should only contain implemented states', () => {
      const implemented = getImplementedStates();
      for (const code of implemented) {
        expect(isStateImplemented(code)).toBe(true);
      }
    });

    it('should include major market states', () => {
      const implemented = getImplementedStates();
      // These should all be implemented based on the rules/index.ts comments
      const majorMarkets = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'MI', 'NJ', 'GA'];
      for (const state of majorMarkets) {
        expect(implemented).toContain(state);
      }
    });

    it('should not include stub states', () => {
      const implemented = getImplementedStates();
      const stubs = getStubStates();

      for (const stubState of stubs) {
        expect(implemented).not.toContain(stubState);
      }
    });

    it('should return uppercase two-letter codes', () => {
      const implemented = getImplementedStates();
      for (const code of implemented) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });
  });

  describe('getStubStates', () => {
    it('should return array of stub state codes', () => {
      const stubs = getStubStates();
      expect(Array.isArray(stubs)).toBe(true);
    });

    it('should only contain non-implemented states', () => {
      const stubs = getStubStates();
      for (const code of stubs) {
        expect(isStateImplemented(code)).toBe(false);
      }
    });

    it('should not include implemented states', () => {
      const stubs = getStubStates();
      const implemented = getImplementedStates();

      for (const implState of implemented) {
        expect(stubs).not.toContain(implState);
      }
    });

    it('should return uppercase two-letter codes', () => {
      const stubs = getStubStates();
      for (const code of stubs) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });

    it('combined with implemented should equal all states', () => {
      const implemented = getImplementedStates();
      const stubs = getStubStates();
      const all = getAllStateCodes();

      expect(implemented.length + stubs.length).toBe(all.length);

      const combined = [...implemented, ...stubs].sort();
      const sorted = [...all].sort();
      expect(combined).toEqual(sorted);
    });
  });

  describe('State Rules Validation', () => {
    it('should have valid vehicle tax schemes for all states', () => {
      const validSchemes = [
        'STATE_ONLY',
        'STATE_PLUS_LOCAL',
        'LOCAL_ONLY',
        'SPECIAL_TAVT',
        'SPECIAL_HUT',
        'DMV_PRIVILEGE_TAX',
      ];

      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(validSchemes).toContain(rules?.vehicleTaxScheme);
      }
    });

    it('should have valid trade-in policy types', () => {
      const validTypes = ['FULL', 'CAPPED', 'PERCENT', 'NONE'];

      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(validTypes).toContain(rules?.tradeInPolicy.type);
      }
    });

    it('should have valid reciprocity modes', () => {
      const validModes = ['NONE', 'CREDIT_UP_TO_STATE_RATE', 'CREDIT_FULL', 'HOME_STATE_ONLY'];

      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(validModes).toContain(rules?.reciprocity.homeStateBehavior);
      }
    });

    it('should have valid lease methods', () => {
      const validMethods = ['MONTHLY', 'FULL_UPFRONT', 'HYBRID'];

      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(validMethods).toContain(rules?.leaseRules.method);
      }
    });

    it('should have rebate rules array for all states', () => {
      const allCodes = getAllStateCodes();
      for (const code of allCodes) {
        const rules = getRulesForState(code);
        expect(Array.isArray(rules?.rebates)).toBe(true);
      }
    });
  });

  describe('Special Scheme States', () => {
    it('Georgia should have TAVT configuration', () => {
      const rules = getRulesForState('GA');
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_TAVT');
      // GA TAVT config is in extras.gaTAVT
      expect(rules?.extras?.gaTAVT).toBeDefined();
      expect(rules?.extras?.gaTAVT?.defaultRate).toBeGreaterThan(0);
      expect(rules?.extras?.gaTAVT?.allowTradeInCredit).toBeDefined();
    });

    it('North Carolina should have HUT configuration', () => {
      const rules = getRulesForState('NC');
      expect(rules?.vehicleTaxScheme).toBe('SPECIAL_HUT');
      // NC HUT config is in extras.ncHUT
      expect(rules?.extras?.ncHUT).toBeDefined();
      expect(rules?.extras?.ncHUT?.baseRate).toBeGreaterThan(0);
    });

    it('West Virginia should have privilege tax configuration', () => {
      const rules = getRulesForState('WV');
      expect(rules?.vehicleTaxScheme).toBe('DMV_PRIVILEGE_TAX');
      // WV Privilege config is in extras.wvPrivilege
      expect(rules?.extras?.wvPrivilege).toBeDefined();
      expect(rules?.extras?.wvPrivilege?.baseRate).toBeGreaterThan(0);
    });
  });

  describe('No Sales Tax States', () => {
    const noSalesTaxStates = ['MT', 'NH', 'OR', 'DE', 'AK'];

    it('should have appropriate configurations for no-sales-tax states', () => {
      for (const state of noSalesTaxStates) {
        const rules = getRulesForState(state);
        expect(rules).toBeDefined();
        // These states typically have either 0% base rate or special schemes
      }
    });
  });

  describe('Reciprocity States', () => {
    it('should have reciprocity enabled for major reciprocity states', () => {
      const reciprocityStates = ['TX', 'OH', 'MI', 'PA', 'IL', 'IN'];
      for (const state of reciprocityStates) {
        const rules = getRulesForState(state);
        expect(rules?.reciprocity.enabled).toBe(true);
      }
    });

    it('should have reciprocity disabled for non-reciprocity states', () => {
      // CA and NY are notable non-reciprocity states
      const noReciprocityStates = ['CA'];
      for (const state of noReciprocityStates) {
        const rules = getRulesForState(state);
        expect(rules?.reciprocity.enabled).toBe(false);
      }
    });
  });
});
