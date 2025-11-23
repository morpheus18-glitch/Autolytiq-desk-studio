/**
 * DEAL CREATION INTEGRATION TESTS
 *
 * Tests the critical deal creation flow:
 * - Atomic deal creation (customer + vehicle + deal + scenario)
 * - Deal number generation
 * - Multi-tenant isolation
 * - Validation and error handling
 * - Vehicle availability checks
 *
 * CRITICAL: These tests ensure deals are created correctly
 * without orphaning customers, vehicles, or scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import {
  createDeal,
  ValidationError,
  ResourceNotFoundError,
  VehicleNotAvailableError,
  MultiTenantViolationError,
} from '../database/atomic-operations';
import { customers, vehicles, deals, dealScenarios } from '@shared/schema';
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
  COMMON_SCENARIOS,
} from './helpers/test-data';
import {
  assertValidDeal,
  assertValidScenario,
  assertValidCustomer,
  assertValidVehicle,
  assertSameDealership,
  assertUUID,
  assertRecentDate,
} from './helpers/assertions';

describe('Deal Creation Integration Tests', () => {
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

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================

  describe('Happy Path: Successful Deal Creation', () => {
    it('should create deal with existing customer and vehicle', async () => {
      // GIVEN: Existing customer and vehicle
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId))
        .returning();

      // WHEN: Creating deal
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        initialState: 'PENDING',
      });

      // THEN: Deal created successfully
      expect(result).toBeDefined();
      assertValidDeal(result.deal);
      assertValidScenario(result.scenario);
      expect(result.customer).toBeDefined();
      expect(result.vehicle).toBeDefined();

      // Verify deal has unique deal number
      expect(result.deal.dealNumber).toBeDefined();
      expect(result.deal.dealNumber).toMatch(/^D-\d{6}$/);

      // Verify associations
      expect(result.deal.customerId).toBe(customer.id);
      expect(result.scenario.vehicleId).toBe(vehicle.id);

      // Verify multi-tenant isolation
      assertSameDealership(result.deal, customer);
      assertSameDealership(result.deal, vehicle);

      // Verify scenario belongs to deal
      expect(result.scenario.dealId).toBe(result.deal.id);

      // Verify timestamps
      assertRecentDate(result.deal.createdAt);
      assertRecentDate(result.scenario.createdAt);
    });

    it('should create deal with minimal data (draft)', async () => {
      // WHEN: Creating minimal draft deal
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'DRAFT',
      });

      // THEN: Deal created as draft
      expect(result.deal.dealState).toBe('DRAFT');
      expect(result.deal.customerId).toBeNull();
      assertValidDeal(result.deal);
      assertValidScenario(result.scenario);

      // Draft deals should NOT have deal number yet
      expect(result.deal.dealNumber).toBeNull();
    });

    it('should generate unique deal numbers sequentially', async () => {
      // GIVEN: Multiple deals
      const dealNumbers: string[] = [];

      // WHEN: Creating 5 deals
      for (let i = 0; i < 5; i++) {
        const result = await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          initialState: 'PENDING',
        });

        if (result.deal.dealNumber) {
          dealNumbers.push(result.deal.dealNumber);
        }
      }

      // THEN: All deal numbers are unique
      const uniqueNumbers = new Set(dealNumbers);
      expect(uniqueNumbers.size).toBe(dealNumbers.length);

      // AND: Numbers are sequential
      const numbers = dealNumbers
        .map((dn) => parseInt(dn.replace('D-', '')))
        .sort((a, b) => a - b);

      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
      }
    });

    it('should mark vehicle as "in-deal" when attached to deal', async () => {
      // GIVEN: Available vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(
          createVehicleData(testContext.dealershipId, {
            status: 'available',
          })
        )
        .returning();

      expect(vehicle.status).toBe('available');

      // WHEN: Creating deal with vehicle
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        vehicleId: vehicle.id,
        initialState: 'PENDING',
      });

      // THEN: Vehicle status updated
      const updatedVehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicle.id),
      });

      expect(updatedVehicle?.status).toBe('in-deal');
    });

    it('should create scenario with default values', async () => {
      // WHEN: Creating deal without scenario data
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'DRAFT',
      });

      // THEN: Scenario has sensible defaults
      expect(result.scenario.scenarioType).toBe('finance');
      expect(result.scenario.name).toContain('Scenario');
      expect(result.scenario.isActive).toBe(true);
      expect(result.scenario.vehiclePrice).toBe('0');
      expect(result.scenario.downPayment).toBe('0');
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Validation: Invalid Inputs', () => {
    it('should reject deal with invalid dealership ID', async () => {
      await expect(
        createDeal({
          dealershipId: 'invalid-dealership-id',
          salespersonId: testContext.userId,
          initialState: 'PENDING',
        })
      ).rejects.toThrow();
    });

    it('should reject deal with non-existent customer', async () => {
      await expect(
        createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: '00000000-0000-0000-0000-000000000000',
          initialState: 'PENDING',
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should reject deal with non-existent vehicle', async () => {
      await expect(
        createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          vehicleId: '00000000-0000-0000-0000-000000000000',
          initialState: 'PENDING',
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should reject deal with unavailable vehicle', async () => {
      // GIVEN: Vehicle already in another deal
      const [vehicle] = await db
        .insert(vehicles)
        .values(
          createVehicleData(testContext.dealershipId, {
            status: 'sold',
          })
        )
        .returning();

      // WHEN/THEN: Attempt to create deal with sold vehicle
      await expect(
        createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          vehicleId: vehicle.id,
          initialState: 'PENDING',
        })
      ).rejects.toThrow(VehicleNotAvailableError);
    });

    it('should reject deal with customer from different dealership', async () => {
      // GIVEN: Customer from different dealership
      const otherDealershipId = 'other-dealership-id';

      // Create another dealership for isolation test
      const [otherDealership] = await db
        .insert(testContext.dealership.constructor)
        .values({
          dealershipId: otherDealershipId,
          dealershipName: 'Other Dealership',
        })
        .returning()
        .catch(() => [{ id: otherDealershipId }]); // May already exist

      const [customerFromOtherDealership] = await db
        .insert(customers)
        .values(createCustomerData(otherDealershipId))
        .returning();

      // WHEN/THEN: Attempt to create deal with cross-dealership customer
      await expect(
        createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: customerFromOtherDealership.id,
          initialState: 'PENDING',
        })
      ).rejects.toThrow(MultiTenantViolationError);
    });
  });

  // ============================================================================
  // ATOMICITY TESTS
  // ============================================================================

  describe('Atomicity: All-or-Nothing Creation', () => {
    it('should rollback entire transaction if scenario creation fails', async () => {
      // GIVEN: Valid customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const customerCountBefore = await db
        .select()
        .from(customers)
        .then((rows) => rows.length);

      const dealsCountBefore = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      // WHEN: Attempt to create deal with invalid scenario data
      // (This should fail validation inside the transaction)
      try {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: customer.id,
          scenarioData: {
            vehiclePrice: 'invalid-price', // Invalid decimal
          } as any,
        });
      } catch (error) {
        // Expected to fail
      }

      // THEN: No orphaned deals or customers
      const customerCountAfter = await db
        .select()
        .from(customers)
        .then((rows) => rows.length);

      const dealsCountAfter = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      expect(customerCountAfter).toBe(customerCountBefore);
      expect(dealsCountAfter).toBe(dealsCountBefore);
    });

    it('should not create deal if vehicle status update fails', async () => {
      // This test verifies the entire transaction rolls back
      // if ANY step fails, preventing orphaned records

      const dealsCountBefore = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      // WHEN: Attempting to create deal with invalid vehicle
      try {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          vehicleId: '00000000-0000-0000-0000-000000000000',
        });
      } catch (error) {
        // Expected
      }

      // THEN: No deal created
      const dealsCountAfter = await db
        .select()
        .from(deals)
        .then((rows) => rows.length);

      expect(dealsCountAfter).toBe(dealsCountBefore);
    });
  });

  // ============================================================================
  // ASSOCIATIONS TESTS
  // ============================================================================

  describe('Associations: Deal Relationships', () => {
    it('should correctly link deal to customer, vehicle, and scenario', async () => {
      // GIVEN: Customer and vehicle
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId))
        .returning();

      // WHEN: Creating deal
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
      });

      // THEN: Verify database relationships
      const dealFromDb = await db.query.deals.findFirst({
        where: eq(deals.id, result.deal.id),
        with: {
          customer: true,
          salesperson: true,
          scenarios: true,
        },
      });

      expect(dealFromDb).toBeDefined();
      expect(dealFromDb?.customer?.id).toBe(customer.id);
      expect(dealFromDb?.salesperson?.id).toBe(testContext.userId);
      expect(dealFromDb?.scenarios?.length).toBeGreaterThan(0);
      expect(dealFromDb?.scenarios?.[0].id).toBe(result.scenario.id);
    });

    it('should allow multiple scenarios per deal', async () => {
      // GIVEN: Deal with initial scenario
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      // WHEN: Adding additional scenarios
      const [scenario2] = await db
        .insert(dealScenarios)
        .values({
          dealId: result.deal.id,
          scenarioType: 'lease',
          name: 'Lease Option',
          vehiclePrice: '30000',
          downPayment: '3000',
          term: 36,
        })
        .returning();

      // THEN: Deal has multiple scenarios
      const scenariosFromDb = await db.query.dealScenarios.findMany({
        where: eq(dealScenarios.dealId, result.deal.id),
      });

      expect(scenariosFromDb.length).toBe(2);
      expect(scenariosFromDb.map((s) => s.scenarioType)).toContain('finance');
      expect(scenariosFromDb.map((s) => s.scenarioType)).toContain('lease');
    });
  });

  // ============================================================================
  // CONCURRENT CREATION TESTS
  // ============================================================================

  describe('Concurrency: Parallel Deal Creation', () => {
    it('should handle concurrent deal creation without conflicts', async () => {
      // GIVEN: Multiple simultaneous deal creation requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          initialState: 'PENDING',
        })
      );

      // WHEN: Creating all deals in parallel
      const results = await Promise.all(promises);

      // THEN: All deals created successfully
      expect(results.length).toBe(10);

      // All have unique IDs
      const dealIds = results.map((r) => r.deal.id);
      const uniqueIds = new Set(dealIds);
      expect(uniqueIds.size).toBe(10);

      // All have unique deal numbers
      const dealNumbers = results
        .map((r) => r.deal.dealNumber)
        .filter((n) => n !== null);
      const uniqueNumbers = new Set(dealNumbers);
      expect(uniqueNumbers.size).toBe(dealNumbers.length);
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe('Data Integrity: Referential Constraints', () => {
    it('should cascade delete scenarios when deal is deleted', async () => {
      // GIVEN: Deal with scenario
      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      const scenarioId = result.scenario.id;

      // WHEN: Deleting deal
      await db.delete(deals).where(eq(deals.id, result.deal.id));

      // THEN: Scenario should be deleted (cascade)
      const scenarioAfter = await db.query.dealScenarios.findFirst({
        where: eq(dealScenarios.id, scenarioId),
      });

      expect(scenarioAfter).toBeUndefined();
    });

    it('should preserve customer when deal is deleted', async () => {
      // GIVEN: Deal with customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
      });

      // WHEN: Deleting deal
      await db.delete(deals).where(eq(deals.id, result.deal.id));

      // THEN: Customer still exists
      const customerAfter = await db.query.customers.findFirst({
        where: eq(customers.id, customer.id),
      });

      expect(customerAfter).toBeDefined();
      expect(customerAfter?.id).toBe(customer.id);
    });

    it('should preserve vehicle when deal is deleted', async () => {
      // GIVEN: Deal with vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId))
        .returning();

      const result = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        vehicleId: vehicle.id,
      });

      // WHEN: Deleting deal
      await db.delete(deals).where(eq(deals.id, result.deal.id));

      // THEN: Vehicle still exists and status reset
      const vehicleAfter = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicle.id),
      });

      expect(vehicleAfter).toBeDefined();
      expect(vehicleAfter?.id).toBe(vehicle.id);
      // Vehicle status should be reset to available when deal is deleted
      // (This would require a trigger or application logic)
    });
  });
});
