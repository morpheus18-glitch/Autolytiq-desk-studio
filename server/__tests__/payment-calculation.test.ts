/**
 * PAYMENT CALCULATION INTEGRATION TESTS
 *
 * Tests payment calculations for finance and lease deals:
 * - Monthly payment calculations
 * - APR/Interest rate calculations
 * - Lease payment formulas
 * - Negative equity handling
 * - Down payment impact
 *
 * CRITICAL: Payment calculations affect customer decisions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { dealScenarios } from '@shared/schema';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import { createDeal } from '../database/atomic-operations';
import { createScenarioData } from './helpers/test-data';
import { assertReasonablePayment, assertDecimalPrecision } from './helpers/assertions';

describe('Payment Calculation Integration Tests', () => {
  let testContext: ReturnType<typeof getTestContext>;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownTestDatabase();
  });

  describe('Finance Payment Calculations', () => {
    it('should calculate correct monthly payment for standard finance', async () => {
      // GIVEN: Finance deal
      const vehiclePrice = 30000;
      const downPayment = 5000;
      const term = 60;
      const apr = 6.99;

      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: vehiclePrice.toString(),
          downPayment: downPayment.toString(),
          term,
          apr: apr.toString(),
        },
      });

      // WHEN: Checking calculated payment
      const scenario = result.scenario;
      const monthlyPayment = parseFloat(scenario.monthlyPayment || '0');

      // THEN: Payment is reasonable
      assertReasonablePayment(monthlyPayment, vehiclePrice, downPayment, term);

      // Manual calculation for verification
      const principal = vehiclePrice - downPayment;
      const monthlyRate = apr / 100 / 12;
      const expectedPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
        (Math.pow(1 + monthlyRate, term) - 1);

      expect(monthlyPayment).toBeCloseTo(expectedPayment, 0); // Within $1
    });

    it('should handle zero down payment', async () => {
      // GIVEN: Zero down
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '25000',
          downPayment: '0',
          term: 72,
          apr: '8.99',
        },
      });

      // THEN: Payment calculated on full amount
      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(300); // Reasonable for 25k/72mo
      expect(payment).toBeLessThan(500);
    });

    it('should handle negative equity from trade', async () => {
      // GIVEN: Negative equity
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '30000',
          downPayment: '2000',
          tradeAllowance: '8000',
          tradePayoff: '12000', // -4k negative equity
          term: 60,
          apr: '9.99',
        },
      });

      // THEN: Payment reflects added negative equity
      const scenario = result.scenario;

      // Amount financed = 30000 - 2000 - 8000 + 12000 = 32000
      const payment = parseFloat(scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(600); // Higher due to negative equity
    });

    it('should handle different term lengths correctly', async () => {
      const testCases = [
        { term: 36, expectedRange: [700, 900] },
        { term: 48, expectedRange: [550, 700] },
        { term: 60, expectedRange: [470, 600] },
        { term: 72, expectedRange: [410, 530] },
      ];

      for (const { term, expectedRange } of testCases) {
        const result = await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          scenarioData: {
            scenarioType: 'finance',
            vehiclePrice: '25000',
            downPayment: '0',
            term,
            apr: '6.99',
          },
        });

        const payment = parseFloat(result.scenario.monthlyPayment || '0');
        expect(payment).toBeGreaterThan(expectedRange[0]);
        expect(payment).toBeLessThan(expectedRange[1]);

        // Cleanup for next iteration
        await db.delete(dealScenarios).where({ id: result.scenario.id });
      }
    });
  });

  describe('Lease Payment Calculations', () => {
    it('should calculate lease payment with money factor', async () => {
      // GIVEN: Lease scenario
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'lease',
          vehiclePrice: '40000',
          downPayment: '3000',
          term: 36,
          moneyFactor: '0.00125', // ~3% APR
          residualValue: '24000', // 60% residual
        },
      });

      // THEN: Lease payment calculated
      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(300);
      expect(payment).toBeLessThan(600);
    });

    it('should handle high residual value (lower payment)', async () => {
      // GIVEN: High residual
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'lease',
          vehiclePrice: '50000',
          downPayment: '0',
          term: 36,
          moneyFactor: '0.00100',
          residualValue: '32500', // 65% residual
        },
      });

      // THEN: Lower payment due to high residual
      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeLessThan(700); // Lower than purchase payment
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short term (12 months)', async () => {
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '15000',
          downPayment: '5000',
          term: 12,
          apr: '5.99',
        },
      });

      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(800); // High due to short term
      expect(payment).toBeLessThan(900);
    });

    it('should handle very long term (84 months)', async () => {
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '35000',
          downPayment: '0',
          term: 84,
          apr: '7.99',
        },
      });

      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(400); // Lower due to long term
      expect(payment).toBeLessThan(600);
    });

    it('should maintain penny precision', async () => {
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '27543.87',
          downPayment: '3721.19',
          term: 60,
          apr: '6.49',
        },
      });

      const payment = result.scenario.monthlyPayment || '0';
      assertDecimalPrecision(payment, 2);
    });

    it('should handle zero APR (promotional financing)', async () => {
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '30000',
          downPayment: '5000',
          term: 60,
          apr: '0',
        },
      });

      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      const expectedPayment = (30000 - 5000) / 60;
      expect(payment).toBeCloseTo(expectedPayment, 0);
    });

    it('should handle high APR (subprime)', async () => {
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '20000',
          downPayment: '2000',
          term: 60,
          apr: '19.99',
        },
      });

      const payment = parseFloat(result.scenario.monthlyPayment || '0');
      expect(payment).toBeGreaterThan(400); // High interest adds significant cost
      expect(payment).toBeLessThan(600);
    });
  });

  describe('Rebates and Incentives', () => {
    it('should apply rebates to reduce amount financed', async () => {
      // GIVEN: Deal with manufacturer rebate
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        scenarioData: {
          scenarioType: 'finance',
          vehiclePrice: '30000',
          downPayment: '3000',
          rebates: '2000', // $2k rebate
          term: 60,
          apr: '5.99',
        },
      });

      // THEN: Payment based on reduced amount
      const payment = parseFloat(result.scenario.monthlyPayment || '0');

      // Amount financed = 30000 - 3000 - 2000 = 25000
      const principal = 25000;
      const monthlyRate = 5.99 / 100 / 12;
      const expectedPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, 60)) /
        (Math.pow(1 + monthlyRate, 60) - 1);

      expect(payment).toBeCloseTo(expectedPayment, 0);
    });
  });
});
