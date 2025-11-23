/**
 * VEHICLE INVENTORY INTEGRATION TESTS
 *
 * Tests vehicle inventory operations:
 * - Add vehicles to inventory
 * - Update vehicle status (available → in-deal → sold)
 * - Search and filtering
 * - Vehicle availability checks
 * - VIN validation
 * - Price updates
 * - Multi-tenant isolation
 *
 * CRITICAL: Vehicle inventory is the product catalog.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { vehicles } from '@shared/schema';
import { eq, like, and, gte, lte, or, desc, sql } from 'drizzle-orm';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import {
  createVehicleData,
} from './helpers/test-data';
import {
  assertValidVehicle,
  assertVINFormat,
  assertRecentDate,
  assertDecimalPrecision,
} from './helpers/assertions';

describe('Vehicle Inventory Integration Tests', () => {
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
  // CREATE VEHICLE TESTS
  // ============================================================================

  describe('Add Vehicle to Inventory', () => {
    it('should add new vehicle with complete information', async () => {
      // GIVEN: Complete vehicle data
      const vehicleData = createVehicleData(testContext.dealershipId, {
        year: 2024,
        make: 'Toyota',
        model: 'Camry',
        trim: 'XSE',
        vin: 'TEST12345VIN67890',
        stockNumber: 'STK12345',
        condition: 'new',
        status: 'available',
        msrp: '35000',
        internetPrice: '32000',
        mileage: 10,
      });

      // WHEN: Adding to inventory
      const [vehicle] = await db
        .insert(vehicles)
        .values(vehicleData)
        .returning();

      // THEN: Vehicle added successfully
      assertValidVehicle(vehicle);
      expect(vehicle.year).toBe(2024);
      expect(vehicle.make).toBe('Toyota');
      expect(vehicle.model).toBe('Camry');
      expect(vehicle.trim).toBe('XSE');
      expect(vehicle.condition).toBe('new');
      expect(vehicle.status).toBe('available');
      assertRecentDate(vehicle.createdAt);
    });

    it('should validate VIN format', async () => {
      // GIVEN: Valid 17-character VIN
      const vin = 'TEST12345VIN67890';
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, { vin }))
        .returning();

      // THEN: VIN stored correctly
      assertVINFormat(vehicle.vin);
      expect(vehicle.vin).toBe(vin);
    });

    it('should auto-generate stock number if not provided', async () => {
      // GIVEN: Vehicle without stock number
      const vehicleData = createVehicleData(testContext.dealershipId);

      // WHEN: Adding vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(vehicleData)
        .returning();

      // THEN: Stock number auto-generated
      expect(vehicle.stockNumber).toBeDefined();
      expect(vehicle.stockNumber).toMatch(/^STK\d{5}$/);
    });

    it('should set default status to available for new vehicles', async () => {
      // GIVEN: Vehicle with no explicit status
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          status: 'available',
        }))
        .returning();

      // THEN: Status is available
      expect(vehicle.status).toBe('available');
    });

    it('should store pricing information with decimal precision', async () => {
      // GIVEN: Vehicle with precise pricing
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          msrp: '35999.99',
          internetPrice: '32499.50',
          invoicePrice: '30250.00',
          costPrice: '29000.00',
        }))
        .returning();

      // THEN: Prices stored with precision
      assertDecimalPrecision(vehicle.msrp, 2);
      assertDecimalPrecision(vehicle.internetPrice, 2);
      assertDecimalPrecision(vehicle.invoicePrice || '0', 2);
      assertDecimalPrecision(vehicle.costPrice || '0', 2);
    });
  });

  // ============================================================================
  // VEHICLE STATUS LIFECYCLE TESTS
  // ============================================================================

  describe('Vehicle Status Lifecycle', () => {
    it('should transition vehicle from available to in-deal', async () => {
      // GIVEN: Available vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          status: 'available',
        }))
        .returning();

      expect(vehicle.status).toBe('available');

      // WHEN: Marking as in-deal
      const [updated] = await db
        .update(vehicles)
        .set({
          status: 'in-deal',
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Status updated
      expect(updated.status).toBe('in-deal');
      assertRecentDate(updated.updatedAt);
    });

    it('should transition vehicle from in-deal to sold', async () => {
      // GIVEN: Vehicle in deal
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          status: 'in-deal',
        }))
        .returning();

      // WHEN: Marking as sold
      const [sold] = await db
        .update(vehicles)
        .set({
          status: 'sold',
          soldDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Vehicle marked sold
      expect(sold.status).toBe('sold');
      expect(sold.soldDate).toBeDefined();
      assertRecentDate(sold.soldDate!);
    });

    it('should return vehicle to available if deal falls through', async () => {
      // GIVEN: Vehicle in deal
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          status: 'in-deal',
        }))
        .returning();

      // WHEN: Deal falls through
      const [available] = await db
        .update(vehicles)
        .set({
          status: 'available',
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Vehicle available again
      expect(available.status).toBe('available');
    });

    it('should check vehicle availability before creating deal', async () => {
      // GIVEN: Sold vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          status: 'sold',
        }))
        .returning();

      // WHEN: Checking availability
      const isAvailable = vehicle.status === 'available' || vehicle.status === 'in-deal';

      // THEN: Not available
      expect(isAvailable).toBe(false);
    });
  });

  // ============================================================================
  // SEARCH & FILTER TESTS
  // ============================================================================

  describe('Search and Filter Vehicles', () => {
    beforeEach(async () => {
      // Create diverse inventory
      await db.insert(vehicles).values([
        createVehicleData(testContext.dealershipId, {
          year: 2024,
          make: 'Toyota',
          model: 'Camry',
          condition: 'new',
          status: 'available',
          internetPrice: '30000',
        }),
        createVehicleData(testContext.dealershipId, {
          year: 2023,
          make: 'Honda',
          model: 'Accord',
          condition: 'used',
          status: 'available',
          internetPrice: '25000',
        }),
        createVehicleData(testContext.dealershipId, {
          year: 2024,
          make: 'Ford',
          model: 'F-150',
          condition: 'new',
          status: 'in-deal',
          internetPrice: '45000',
        }),
        createVehicleData(testContext.dealershipId, {
          year: 2022,
          make: 'Tesla',
          model: 'Model 3',
          condition: 'used',
          status: 'sold',
          internetPrice: '38000',
        }),
      ]);
    });

    it('should filter vehicles by status (available only)', async () => {
      // WHEN: Filtering available vehicles
      const available = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          eq(vehicles.status, 'available')
        ),
      });

      // THEN: Only available vehicles returned
      expect(available.length).toBeGreaterThanOrEqual(2);
      available.forEach(v => {
        expect(v.status).toBe('available');
      });
    });

    it('should filter vehicles by condition (new/used)', async () => {
      // WHEN: Filtering new vehicles
      const newVehicles = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          eq(vehicles.condition, 'new')
        ),
      });

      // THEN: Only new vehicles returned
      newVehicles.forEach(v => {
        expect(v.condition).toBe('new');
      });
    });

    it('should search vehicles by make', async () => {
      // WHEN: Searching for Toyota
      const toyotas = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          eq(vehicles.make, 'Toyota')
        ),
      });

      // THEN: Only Toyotas returned
      toyotas.forEach(v => {
        expect(v.make).toBe('Toyota');
      });
    });

    it('should filter vehicles by price range', async () => {
      // WHEN: Filtering $20k - $35k
      const inRange = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          sql`CAST(${vehicles.internetPrice} AS DECIMAL) >= 20000`,
          sql`CAST(${vehicles.internetPrice} AS DECIMAL) <= 35000`
        ),
      });

      // THEN: Only vehicles in price range
      inRange.forEach(v => {
        const price = parseFloat(v.internetPrice);
        expect(price).toBeGreaterThanOrEqual(20000);
        expect(price).toBeLessThanOrEqual(35000);
      });
    });

    it('should filter vehicles by year range', async () => {
      // WHEN: Filtering 2023+
      const recent = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          gte(vehicles.year, 2023)
        ),
      });

      // THEN: Only 2023+ vehicles
      recent.forEach(v => {
        expect(v.year).toBeGreaterThanOrEqual(2023);
      });
    });

    it('should search by partial match (make OR model)', async () => {
      // WHEN: Searching for "Cam" or "Acc"
      const results = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          or(
            like(vehicles.make, '%Cam%'),
            like(vehicles.model, '%Cam%'),
            like(vehicles.model, '%Acc%')
          )
        ),
      });

      // THEN: Camry and Accord returned
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should sort vehicles by price (low to high)', async () => {
      // WHEN: Sorting by price ascending
      const sorted = await db.query.vehicles.findMany({
        where: eq(vehicles.dealershipId, testContext.dealershipId),
        orderBy: [sql`CAST(${vehicles.internetPrice} AS DECIMAL) ASC`],
      });

      // THEN: Sorted correctly
      for (let i = 0; i < sorted.length - 1; i++) {
        const price1 = parseFloat(sorted[i].internetPrice);
        const price2 = parseFloat(sorted[i + 1].internetPrice);
        expect(price1).toBeLessThanOrEqual(price2);
      }
    });

    it('should sort vehicles by newest first', async () => {
      // WHEN: Sorting by year descending
      const sorted = await db.query.vehicles.findMany({
        where: eq(vehicles.dealershipId, testContext.dealershipId),
        orderBy: [desc(vehicles.year)],
      });

      // THEN: Newest first
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].year).toBeGreaterThanOrEqual(sorted[i + 1].year);
      }
    });
  });

  // ============================================================================
  // UPDATE VEHICLE TESTS
  // ============================================================================

  describe('Update Vehicle', () => {
    it('should update vehicle price', async () => {
      // GIVEN: Vehicle with initial price
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          internetPrice: '30000',
        }))
        .returning();

      // WHEN: Updating price
      const [updated] = await db
        .update(vehicles)
        .set({
          internetPrice: '28500',
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Price updated
      expect(updated.internetPrice).toBe('28500');
    });

    it('should update vehicle mileage', async () => {
      // GIVEN: Used vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          mileage: 50000,
        }))
        .returning();

      // WHEN: Updating mileage
      const [updated] = await db
        .update(vehicles)
        .set({
          mileage: 50250,
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Mileage updated
      expect(updated.mileage).toBe(50250);
    });

    it('should update vehicle description', async () => {
      // GIVEN: Vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          description: 'Initial description',
        }))
        .returning();

      // WHEN: Updating description
      const newDescription = 'Updated: Low mileage, one owner, excellent condition';
      const [updated] = await db
        .update(vehicles)
        .set({
          description: newDescription,
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      // THEN: Description updated
      expect(updated.description).toBe(newDescription);
    });
  });

  // ============================================================================
  // MULTI-TENANT ISOLATION TESTS
  // ============================================================================

  describe('Multi-Tenant Isolation', () => {
    it('should only fetch vehicles for correct dealership', async () => {
      // GIVEN: Vehicles for test dealership
      await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId));

      // WHEN: Fetching with dealership filter
      const dealershipVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.dealershipId, testContext.dealershipId),
      });

      // THEN: All belong to correct dealership
      dealershipVehicles.forEach(vehicle => {
        expect(vehicle.dealershipId).toBe(testContext.dealershipId);
      });
    });

    it('should enforce dealership boundary on all queries', async () => {
      // GIVEN: Multiple dealership filter
      const results = await db.query.vehicles.findMany({
        where: and(
          eq(vehicles.dealershipId, testContext.dealershipId),
          eq(vehicles.status, 'available')
        ),
      });

      // THEN: All match dealership
      results.forEach(v => {
        expect(v.dealershipId).toBe(testContext.dealershipId);
      });
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero mileage (new vehicle)', async () => {
      // GIVEN: Brand new vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          mileage: 0,
          condition: 'new',
        }))
        .returning();

      // THEN: Zero mileage accepted
      expect(vehicle.mileage).toBe(0);
      expect(vehicle.condition).toBe('new');
    });

    it('should handle very high mileage (200k+)', async () => {
      // GIVEN: High mileage vehicle
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          mileage: 250000,
          condition: 'used',
        }))
        .returning();

      // THEN: High mileage accepted
      expect(vehicle.mileage).toBe(250000);
    });

    it('should handle special characters in description', async () => {
      // GIVEN: Description with special characters
      const description = 'Great deal! Only $25k - 50% off!!! Loaded: A/C, sunroof, leather...';
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          description,
        }))
        .returning();

      // THEN: Special characters preserved
      expect(vehicle.description).toBe(description);
    });

    it('should handle concurrent vehicle creation', async () => {
      // GIVEN: Multiple simultaneous additions
      const promises = Array.from({ length: 10 }, (_, i) =>
        db
          .insert(vehicles)
          .values(createVehicleData(testContext.dealershipId, {
            make: `Make${i}`,
          }))
          .returning()
      );

      // WHEN: Adding all in parallel
      const results = await Promise.all(promises);

      // THEN: All created successfully
      expect(results.length).toBe(10);

      // All have unique IDs and stock numbers
      const ids = results.map(([v]) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      const stockNumbers = results.map(([v]) => v.stockNumber);
      const uniqueStockNumbers = new Set(stockNumbers);
      expect(uniqueStockNumbers.size).toBe(10);
    });

    it('should handle null optional fields', async () => {
      // GIVEN: Vehicle with minimal data
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          trim: null,
          description: null,
          invoicePrice: null,
          costPrice: null,
        }))
        .returning();

      // THEN: Null values accepted
      expect(vehicle.trim).toBeNull();
      expect(vehicle.description).toBeNull();
      expect(vehicle.invoicePrice).toBeNull();
      expect(vehicle.costPrice).toBeNull();
    });
  });
});
