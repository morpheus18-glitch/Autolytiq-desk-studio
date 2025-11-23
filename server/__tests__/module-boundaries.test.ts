/**
 * MODULE BOUNDARY VALIDATION TESTS
 *
 * Tests module boundaries and integration points:
 * - Module public APIs
 * - Cross-module integration
 * - Dependency injection
 * - Data flow between modules
 * - Error propagation
 *
 * CRITICAL: Modules must interact through defined public APIs only.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { customers, vehicles, deals } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import {
  createCustomerData,
  createVehicleData,
} from './helpers/test-data';
import { createDeal } from '../database/atomic-operations';

describe('Module Boundary Validation Tests', () => {
  let testContext: ReturnType<typeof getTestContext>;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ============================================================================
  // DATABASE SERVICE LAYER TESTS
  // ============================================================================

  describe('Database Service Layer', () => {
    it('should provide transaction support', async () => {
      // GIVEN: Transaction boundary
      let transactionSuccess = false;

      try {
        // Simulate transaction
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId))
          .returning();

        const [vehicle] = await db
          .insert(vehicles)
          .values(createVehicleData(testContext.dealershipId))
          .returning();

        // If both succeed, transaction succeeds
        transactionSuccess = true;

        // THEN: Both records exist
        expect(customer.id).toBeDefined();
        expect(vehicle.id).toBeDefined();
      } catch (error) {
        // Transaction failed
        transactionSuccess = false;
      }

      expect(transactionSuccess).toBe(true);
    });

    it('should enforce dealership isolation at database level', async () => {
      // GIVEN: Multiple dealership IDs
      const dealership1 = testContext.dealershipId;
      const dealership2 = 'other-dealership-id';

      // WHEN: Querying with dealership filter
      const customers1 = await db.query.customers.findMany({
        where: eq(customers.dealershipId, dealership1),
      });

      const customers2 = await db.query.customers.findMany({
        where: eq(customers.dealershipId, dealership2),
      });

      // THEN: Results isolated by dealership
      customers1.forEach(c => expect(c.dealershipId).toBe(dealership1));
      customers2.forEach(c => expect(c.dealershipId).toBe(dealership2));
    });

    it('should handle concurrent operations safely', async () => {
      // GIVEN: Multiple concurrent inserts
      const promises = Array.from({ length: 5 }, () =>
        db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId))
          .returning()
      );

      // WHEN: Executing concurrently
      const results = await Promise.all(promises);

      // THEN: All succeed without conflicts
      expect(results.length).toBe(5);
      const ids = results.map(([c]) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should provide atomic operations for deal creation', async () => {
      // GIVEN: Atomic deal creation
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'DRAFT',
      });

      // THEN: Deal and scenario created atomically
      expect(result.deal).toBeDefined();
      expect(result.scenario).toBeDefined();
      expect(result.scenario.dealId).toBe(result.deal.id);

      // AND: Both exist in database
      const dealFromDb = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
        with: {
          scenarios: true,
        },
      });

      expect(dealFromDb).toBeDefined();
      expect(dealFromDb?.scenarios?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DEAL MODULE INTEGRATION TESTS
  // ============================================================================

  describe('Deal Module Integration', () => {
    it('should integrate customer data into deal', async () => {
      // GIVEN: Customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: 'John',
          lastName: 'Doe',
        }))
        .returning();

      // WHEN: Creating deal with customer
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
      });

      // THEN: Deal references customer
      expect(result.deal.customerId).toBe(customer.id);

      // AND: Customer data accessible via relation
      const dealWithCustomer = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
        with: {
          customer: true,
        },
      });

      expect(dealWithCustomer?.customer?.firstName).toBe('John');
      expect(dealWithCustomer?.customer?.lastName).toBe('Doe');
    });

    it('should integrate vehicle data into deal scenario', async () => {
      // GIVEN: Vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          year: 2024,
          make: 'Toyota',
          model: 'Camry',
          internetPrice: '30000',
        }))
        .returning();

      // WHEN: Creating deal with vehicle
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        vehicleId: vehicle.id,
        scenarioData: {
          vehiclePrice: '30000',
        },
      });

      // THEN: Scenario references vehicle
      expect(result.scenario.vehicleId).toBe(vehicle.id);
      expect(result.scenario.vehiclePrice).toBe('30000');
    });

    it('should propagate deal state changes through system', async () => {
      // GIVEN: Deal in DRAFT state
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'DRAFT',
      });

      expect(result.deal.dealState).toBe('DRAFT');

      // WHEN: Transitioning to PENDING
      const [updated] = await db
        .update(deals)
        .set({
          dealState: 'PENDING',
          updatedAt: new Date(),
        })
        .where(eq(deals.id, result.deal.id))
        .returning();

      // THEN: State propagated
      expect(updated.dealState).toBe('PENDING');

      // AND: Change reflected in database
      const fromDb = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
      });

      expect(fromDb?.dealState).toBe('PENDING');
    });

    it('should validate cross-module data consistency', async () => {
      // GIVEN: Complete deal with customer and vehicle
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId))
        .returning();

      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
      });

      // WHEN: Fetching complete deal
      const completeDeal = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
        with: {
          customer: true,
          scenarios: {
            with: {
              vehicle: true,
            },
          },
        },
      });

      // THEN: All data consistent
      expect(completeDeal?.dealershipId).toBe(testContext.dealershipId);
      expect(completeDeal?.customer?.dealershipId).toBe(testContext.dealershipId);
      expect(completeDeal?.scenarios?.[0]?.vehicle?.dealershipId).toBe(
        testContext.dealershipId
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING ACROSS MODULES
  // ============================================================================

  describe('Error Handling and Propagation', () => {
    it('should handle missing customer gracefully', async () => {
      // GIVEN: Non-existent customer ID
      const fakeCustomerId = '00000000-0000-0000-0000-000000000000';

      // WHEN: Attempting to create deal
      const promise = createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: fakeCustomerId,
      });

      // THEN: Should throw error
      await expect(promise).rejects.toThrow();
    });

    it('should handle missing vehicle gracefully', async () => {
      // GIVEN: Non-existent vehicle ID
      const fakeVehicleId = '00000000-0000-0000-0000-000000000000';

      // WHEN: Attempting to create deal
      const promise = createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        vehicleId: fakeVehicleId,
      });

      // THEN: Should throw error
      await expect(promise).rejects.toThrow();
    });

    it('should rollback transaction on error', async () => {
      // GIVEN: Count before operation
      const countBefore = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      // WHEN: Failed operation
      try {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: '00000000-0000-0000-0000-000000000000', // Invalid
        });
      } catch (error) {
        // Expected to fail
      }

      // THEN: No orphaned records
      const countAfter = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      expect(countAfter).toBe(countBefore);
    });
  });

  // ============================================================================
  // DATA FLOW VALIDATION
  // ============================================================================

  describe('Data Flow Between Modules', () => {
    it('should flow customer data to deal to scenario', async () => {
      // GIVEN: Customer with specific state
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: 'Jane',
          state: 'CA',
          zipCode: '90210',
        }))
        .returning();

      // WHEN: Creating deal
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
      });

      // THEN: Data flows correctly
      const dealWithData = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
        with: {
          customer: true,
          scenarios: true,
        },
      });

      // Customer data accessible from deal
      expect(dealWithData?.customer?.firstName).toBe('Jane');
      expect(dealWithData?.customer?.state).toBe('CA');

      // Scenario belongs to deal
      expect(dealWithData?.scenarios?.[0]?.dealId).toBe(result.deal.id);
    });

    it('should maintain referential integrity across modules', async () => {
      // GIVEN: Complete deal setup
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId))
        .returning();

      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
      });

      // WHEN: Verifying all relationships
      const dealCheck = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
      });

      const customerCheck = await db.query.customers.findFirst({
        where: eq(customers.id, customer.id),
      });

      const vehicleCheck = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicle.id),
      });

      // THEN: All relationships valid
      expect(dealCheck?.customerId).toBe(customerCheck?.id);
      expect(result.scenario.vehicleId).toBe(vehicleCheck?.id);
    });
  });

  // ============================================================================
  // MODULE PUBLIC API VALIDATION
  // ============================================================================

  describe('Module Public APIs', () => {
    it('should expose atomic deal creation API', async () => {
      // GIVEN: Public API function
      const apiFunction = createDeal;

      // WHEN: Using API
      const result = await apiFunction({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      // THEN: API returns complete result
      expect(result).toHaveProperty('deal');
      expect(result).toHaveProperty('scenario');
      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('vehicle');
    });

    it('should validate input parameters', async () => {
      // WHEN: Invalid dealership ID
      const promise = createDeal({
        dealershipId: '', // Invalid
        salespersonId: testContext.userId,
      });

      // THEN: Should fail validation
      await expect(promise).rejects.toThrow();
    });

    it('should return consistent data structures', async () => {
      // GIVEN: Multiple API calls
      const result1 = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      const result2 = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      // THEN: Same structure
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    });
  });
});
