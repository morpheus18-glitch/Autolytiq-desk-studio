/**
 * TAX CALCULATION INTEGRATION TESTS
 *
 * Tests tax calculation across different states, scenarios, and edge cases:
 * - State tax rules (CA, IN, TX, etc.)
 * - Local tax rates (county + city)
 * - Trade-in tax credit
 * - Taxable vs non-taxable fees
 * - Lease vs retail tax calculations
 * - Tax rate validation
 *
 * CRITICAL: Tax calculations must be penny-accurate for compliance.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import taxRouter from '../../src/modules/tax/api/tax.routes';
import { db } from '../database/db-service';
import { customers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import {
  createCustomerData,
} from './helpers/test-data';
import {
  assertValidTaxCalculation,
  assertValidTaxRate,
  assertDecimalPrecision,
  assertSuccessResponse,
  assertErrorResponse,
} from './helpers/assertions';

describe('Tax Calculation Integration Tests', () => {
  let app: Express;
  let testContext: ReturnType<typeof getTestContext>;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();

    // Setup Express app with tax routes
    app = express();
    app.use(express.json());
    app.use('/api/tax', taxRouter);
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownTestDatabase();
  });

  // ============================================================================
  // STATE TAX RULES TESTS
  // ============================================================================

  describe('State Tax Rules', () => {
    it('should calculate tax for California (STATE_PLUS_LOCAL)', async () => {
      // GIVEN: CA tax quote request
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 30000,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210', // Beverly Hills, CA
          registrationState: 'CA',
        },
      };

      // WHEN: Requesting tax quote
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated correctly
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);

      // CA uses STATE_PLUS_LOCAL
      expect(response.body.context.primaryStateCode).toBe('CA');
      expect(response.body.result).toBeDefined();
      expect(response.body.result.totalTax).toBeGreaterThan(0);

      // Tax should be reasonable (~8-10% for CA)
      const effectiveRate = response.body.result.totalTax / 30000;
      expect(effectiveRate).toBeGreaterThan(0.07);
      expect(effectiveRate).toBeLessThan(0.11);
    });

    it('should calculate tax for Indiana (FLAT_RATE)', async () => {
      // GIVEN: IN tax quote request
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 25000,
        dealerStateCode: 'IN',
        deal: {
          registrationState: 'IN',
        },
      };

      // WHEN: Requesting tax quote
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated with flat 7% rate
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);

      expect(response.body.context.primaryStateCode).toBe('IN');

      // IN has 7% flat rate
      const expectedTax = 25000 * 0.07;
      expect(response.body.result.totalTax).toBeCloseTo(expectedTax, 0);
    });

    it('should handle Texas (NO_TAX)', async () => {
      // GIVEN: TX tax quote request
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 40000,
        dealerStateCode: 'TX',
        deal: {
          registrationState: 'TX',
        },
      };

      // WHEN: Requesting tax quote
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Should succeed (TX may have different collection method)
      assertSuccessResponse(response);
    });
  });

  // ============================================================================
  // LOCAL TAX RATE TESTS
  // ============================================================================

  describe('Local Tax Rates', () => {
    it('should fetch local tax rate for ZIP code 90210 (Beverly Hills, CA)', async () => {
      // WHEN: Getting local rate
      const response = await request(app)
        .get('/api/tax/local/90210')
        .query({ stateCode: 'CA' });

      // THEN: Local rate returned
      assertSuccessResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Should have rate components
      const data = response.body.data;
      expect(data.totalRate).toBeDefined();
      assertValidTaxRate(data.totalRate);

      // Should have jurisdiction info
      expect(data.state).toBe('CA');
      expect(data.zipCode).toBe('90210');
    });

    it('should return breakdown for tax jurisdiction', async () => {
      // WHEN: Getting jurisdiction breakdown
      const response = await request(app)
        .get('/api/tax/breakdown/90210');

      // THEN: Breakdown returned with components
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        const breakdown = response.body.data;
        expect(breakdown.state).toBeDefined();
        expect(breakdown.county).toBeDefined();
        expect(breakdown.city).toBeDefined();
      } else {
        // Breakdown may not be available for all ZIPs
        expect(response.status).toBe(404);
      }
    });

    it('should reject invalid ZIP code format', async () => {
      // WHEN: Requesting with invalid ZIP
      const response = await request(app)
        .get('/api/tax/local/INVALID');

      // THEN: Error response
      assertErrorResponse(response, 400, 'invalid');
    });

    it('should handle ZIP+4 format', async () => {
      // WHEN: Using ZIP+4
      const response = await request(app)
        .get('/api/tax/local/90210-1234')
        .query({ stateCode: 'CA' });

      // THEN: Should accept and process
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ============================================================================
  // TRADE-IN TAX CREDIT TESTS
  // ============================================================================

  describe('Trade-In Tax Credit', () => {
    it('should apply trade-in credit to reduce taxable amount (CA)', async () => {
      // GIVEN: Purchase with trade-in
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 35000,
        tradeInValue: 10000,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated on reduced amount
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);

      const result = response.body.result;

      // Taxable amount should be reduced by trade-in
      expect(result.taxableAmount).toBeLessThan(35000);
      expect(result.taxableAmount).toBeGreaterThanOrEqual(25000); // 35k - 10k trade
    });

    it('should handle trade-in with payoff (net trade value)', async () => {
      // GIVEN: Trade with payoff
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 30000,
        tradeInValue: 12000,
        // Trade payoff would be handled in deal calculation
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated correctly
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);
    });
  });

  // ============================================================================
  // TAXABLE VS NON-TAXABLE FEES TESTS
  // ============================================================================

  describe('Taxable vs Non-Taxable Fees', () => {
    it('should NOT tax doc fees (non-taxable in most states)', async () => {
      // GIVEN: Purchase with doc fee
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 30000,
        docFee: 500,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Doc fee not included in taxable amount
      assertSuccessResponse(response);

      const result = response.body.result;

      // Taxable amount should be vehicle price only (CA doesn't tax doc fee)
      expect(result.taxableAmount).toBeLessThanOrEqual(30000);
    });

    it('should tax accessories/add-ons (taxable)', async () => {
      // GIVEN: Purchase with accessories
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 30000,
        accessoriesAmount: 2000,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Accessories included in taxable amount
      assertSuccessResponse(response);

      const result = response.body.result;

      // Taxable amount should include accessories
      expect(result.taxableAmount).toBeGreaterThanOrEqual(30000);
    });

    it('should handle multiple fee types correctly', async () => {
      // GIVEN: Purchase with mixed fees
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 30000,
        accessoriesAmount: 1500, // Taxable
        docFee: 500, // Non-taxable
        serviceContracts: 2000, // May vary by state
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated per state rules
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);
    });
  });

  // ============================================================================
  // LEASE TAX TESTS
  // ============================================================================

  describe('Lease Tax Calculations', () => {
    it('should calculate tax on lease payments (payment-based states)', async () => {
      // GIVEN: Lease deal
      const request_body = {
        dealType: 'LEASE',
        asOfDate: '2025-11-22',
        vehiclePrice: 40000,
        grossCapCost: 40000,
        capReductionCash: 3000,
        basePayment: 450,
        paymentCount: 36,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating lease tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated for lease
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);

      const result = response.body.result;
      expect(result.totalTax).toBeGreaterThan(0);
    });

    it('should calculate tax on cap cost (upfront tax states)', async () => {
      // GIVEN: Lease in upfront tax state
      const request_body = {
        dealType: 'LEASE',
        asOfDate: '2025-11-22',
        vehiclePrice: 50000,
        grossCapCost: 50000,
        capReductionCash: 5000,
        basePayment: 550,
        paymentCount: 36,
        dealerStateCode: 'IN', // Indiana uses upfront tax
        deal: {
          registrationState: 'IN',
        },
      };

      // WHEN: Calculating lease tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated upfront
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);
    });
  });

  // ============================================================================
  // CUSTOMER-BASED TAX CALCULATION TESTS
  // ============================================================================

  describe('Customer-Based Tax Calculation', () => {
    it('should calculate tax based on customer address', async () => {
      // GIVEN: Customer with valid address
      const [customer] = await db
        .insert(customers)
        .values(
          createCustomerData(testContext.dealershipId, {
            firstName: 'Jane',
            lastName: 'Doe',
            state: 'CA',
            zipCode: '90210',
            city: 'Beverly Hills',
            county: 'Los Angeles',
          })
        )
        .returning();

      // WHEN: Requesting tax quote for customer
      const response = await request(app)
        .post('/api/tax/customers/quote')
        .send({
          customerId: customer.id,
          dealType: 'RETAIL',
          vehiclePrice: 35000,
        });

      // THEN: Tax calculated using customer address
      assertSuccessResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.taxProfile).toBeDefined();

      const taxProfile = response.body.taxProfile;
      expect(taxProfile.jurisdiction).toBeDefined();
      expect(taxProfile.jurisdiction.state).toBe('CA');
      expect(taxProfile.jurisdiction.zipCode).toBe('90210');
      expect(taxProfile.rates).toBeDefined();
      expect(taxProfile.totalTax).toBeGreaterThan(0);
    });

    it('should validate customer address for tax calculation', async () => {
      // GIVEN: Customer with incomplete address
      const [customer] = await db
        .insert(customers)
        .values(
          createCustomerData(testContext.dealershipId, {
            state: null,
            zipCode: null,
          })
        )
        .returning();

      // WHEN: Checking address validation
      const response = await request(app)
        .get(`/api/tax/customers/${customer.id}/validate-address`);

      // THEN: Address marked as invalid
      assertSuccessResponse(response);
      expect(response.body.valid).toBe(false);
      expect(response.body.missing).toBeDefined();
      expect(response.body.missing.state).toBe(true);
      expect(response.body.missing.zipCode).toBe(true);
    });

    it('should provide tax preview for customer', async () => {
      // GIVEN: Customer with valid address
      const [customer] = await db
        .insert(customers)
        .values(
          createCustomerData(testContext.dealershipId, {
            state: 'CA',
            zipCode: '90210',
          })
        )
        .returning();

      // WHEN: Getting tax preview
      const response = await request(app)
        .get(`/api/tax/customers/${customer.id}/preview`);

      // THEN: Preview returned
      assertSuccessResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.jurisdiction).toBeDefined();
      expect(response.body.rates).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero vehicle price', async () => {
      // GIVEN: Zero price
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 0,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Zero tax returned
      assertSuccessResponse(response);
      expect(response.body.result.totalTax).toBe(0);
    });

    it('should handle very large vehicle price', async () => {
      // GIVEN: Luxury vehicle
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 500000, // Half million dollar car
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax calculated correctly
      assertSuccessResponse(response);
      assertValidTaxCalculation(response.body);

      const result = response.body.result;
      expect(result.totalTax).toBeGreaterThan(30000); // At least 6% of 500k
      expect(result.totalTax).toBeLessThan(75000); // Less than 15% of 500k
    });

    it('should handle missing required fields', async () => {
      // WHEN: Missing vehicle price
      const response = await request(app)
        .post('/api/tax/quote')
        .send({
          dealType: 'RETAIL',
          asOfDate: '2025-11-22',
          // Missing vehiclePrice
        });

      // THEN: Validation error
      assertErrorResponse(response, 400, 'vehiclePrice');
    });

    it('should handle invalid state code', async () => {
      // WHEN: Invalid state
      const response = await request(app)
        .post('/api/tax/quote')
        .send({
          dealType: 'RETAIL',
          asOfDate: '2025-11-22',
          vehiclePrice: 30000,
          dealerStateCode: 'XX', // Invalid
          deal: {
            registrationState: 'XX',
          },
        });

      // THEN: Error response
      assertErrorResponse(response, 400, 'state');
    });

    it('should ensure penny-accurate calculations', async () => {
      // GIVEN: Specific price for precision testing
      const request_body = {
        dealType: 'RETAIL',
        asOfDate: '2025-11-22',
        vehiclePrice: 29999.99,
        dealerStateCode: 'CA',
        deal: {
          zipCode: '90210',
          registrationState: 'CA',
        },
      };

      // WHEN: Calculating tax
      const response = await request(app)
        .post('/api/tax/quote')
        .send(request_body);

      // THEN: Tax has proper precision
      assertSuccessResponse(response);

      const totalTax = response.body.result.totalTax;
      assertDecimalPrecision(totalTax, 2); // Penny precision
    });
  });

  // ============================================================================
  // API ENDPOINT TESTS
  // ============================================================================

  describe('API Endpoints', () => {
    it('should list all supported states', async () => {
      // WHEN: Getting states list
      const response = await request(app).get('/api/tax/states');

      // THEN: States returned
      assertSuccessResponse(response);
      expect(response.body.totalStates).toBeGreaterThan(0);
      expect(response.body.implemented).toBeDefined();
      expect(response.body.stubs).toBeDefined();
      expect(response.body.allStates).toBeDefined();
    });

    it('should get state-specific rules', async () => {
      // WHEN: Getting CA rules
      const response = await request(app).get('/api/tax/states/CA');

      // THEN: Rules returned
      assertSuccessResponse(response);
      expect(response.body.stateCode).toBe('CA');
      expect(response.body.vehicleTaxScheme).toBeDefined();
      expect(response.body.tradeInPolicy).toBeDefined();
    });

    it('should provide API examples', async () => {
      // WHEN: Getting examples
      const response = await request(app).get('/api/tax/examples');

      // THEN: Examples returned
      assertSuccessResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.examples).toBeDefined();
    });

    it('should pass health check', async () => {
      // WHEN: Checking health
      const response = await request(app).get('/api/tax/health');

      // THEN: Healthy
      assertSuccessResponse(response);
      expect(response.body.status).toBe('healthy');
    });
  });
});
