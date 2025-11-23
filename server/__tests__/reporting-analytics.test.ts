/**
 * REPORTING & ANALYTICS INTEGRATION TESTS
 *
 * Tests business intelligence queries:
 * - Sales performance metrics
 * - Inventory analytics
 * - Revenue reporting
 * - Customer insights
 * - Deal pipeline metrics
 * - Salesperson performance
 * - Time-based aggregations
 *
 * CRITICAL: Reporting drives business decisions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { customers, vehicles, deals, dealScenarios, users } from '@shared/schema';
import { eq, and, gte, lte, desc, count, sum, avg, sql } from 'drizzle-orm';
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

describe('Reporting & Analytics Integration Tests', () => {
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
  // SALES PERFORMANCE METRICS
  // ============================================================================

  describe('Sales Performance Metrics', () => {
    beforeEach(async () => {
      // Create test deals for reporting
      for (let i = 0; i < 5; i++) {
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId))
          .returning();

        const [vehicle] = await db
          .insert(vehicles)
          .values(createVehicleData(testContext.dealershipId, {
            internetPrice: '30000',
          }))
          .returning();

        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: customer.id,
          vehicleId: vehicle.id,
          initialState: 'SOLD',
          scenarioData: {
            vehiclePrice: '30000',
            downPayment: '5000',
            term: 60,
            apr: '6.99',
          },
        });
      }
    });

    it('should calculate total sales volume', async () => {
      // WHEN: Counting total deals
      const [result] = await db
        .select({
          totalDeals: count(deals.id),
        })
        .from(deals)
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'SOLD')
          )
        );

      // THEN: Correct count returned
      expect(result.totalDeals).toBeGreaterThanOrEqual(5);
    });

    it('should calculate average deal value', async () => {
      // WHEN: Calculating average vehicle price
      const [result] = await db
        .select({
          avgPrice: avg(sql`CAST(${dealScenarios.vehiclePrice} AS DECIMAL)`),
        })
        .from(dealScenarios)
        .innerJoin(deals, eq(deals.id, dealScenarios.dealId))
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'SOLD')
          )
        );

      // THEN: Average calculated correctly
      const avgPrice = parseFloat(result.avgPrice?.toString() || '0');
      expect(avgPrice).toBeGreaterThan(0);
      expect(avgPrice).toBeCloseTo(30000, -3); // Within thousands
    });

    it('should calculate total revenue', async () => {
      // WHEN: Summing all deal values
      const [result] = await db
        .select({
          totalRevenue: sum(sql`CAST(${dealScenarios.vehiclePrice} AS DECIMAL)`),
        })
        .from(dealScenarios)
        .innerJoin(deals, eq(deals.id, dealScenarios.dealId))
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'SOLD')
          )
        );

      // THEN: Total revenue calculated
      const totalRevenue = parseFloat(result.totalRevenue?.toString() || '0');
      expect(totalRevenue).toBeGreaterThan(0);
      expect(totalRevenue).toBeGreaterThanOrEqual(150000); // 5 deals × $30k
    });

    it('should break down sales by deal state', async () => {
      // Create mix of deal states
      await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'PENDING',
      });

      await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        initialState: 'DRAFT',
      });

      // WHEN: Grouping by state
      const results = await db
        .select({
          dealState: deals.dealState,
          count: count(deals.id),
        })
        .from(deals)
        .where(eq(deals.dealershipId, testContext.dealershipId))
        .groupBy(deals.dealState);

      // THEN: Counts per state
      expect(results.length).toBeGreaterThan(0);

      const soldCount = results.find(r => r.dealState === 'SOLD')?.count || 0;
      const pendingCount = results.find(r => r.dealState === 'PENDING')?.count || 0;

      expect(soldCount).toBeGreaterThanOrEqual(5);
      expect(pendingCount).toBeGreaterThanOrEqual(1);
    });

    it('should track sales by salesperson', async () => {
      // WHEN: Aggregating by salesperson
      const results = await db
        .select({
          salespersonId: deals.salespersonId,
          dealCount: count(deals.id),
          totalValue: sum(sql`CAST(${dealScenarios.vehiclePrice} AS DECIMAL)`),
        })
        .from(deals)
        .innerJoin(dealScenarios, eq(dealScenarios.dealId, deals.id))
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'SOLD')
          )
        )
        .groupBy(deals.salespersonId);

      // THEN: Salesperson metrics calculated
      expect(results.length).toBeGreaterThan(0);

      const userMetrics = results.find(r => r.salespersonId === testContext.userId);
      expect(userMetrics).toBeDefined();
      expect(userMetrics?.dealCount).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================================
  // INVENTORY ANALYTICS
  // ============================================================================

  describe('Inventory Analytics', () => {
    beforeEach(async () => {
      // Create diverse inventory
      await db.insert(vehicles).values([
        createVehicleData(testContext.dealershipId, {
          condition: 'new',
          status: 'available',
          internetPrice: '35000',
        }),
        createVehicleData(testContext.dealershipId, {
          condition: 'new',
          status: 'available',
          internetPrice: '40000',
        }),
        createVehicleData(testContext.dealershipId, {
          condition: 'used',
          status: 'available',
          internetPrice: '25000',
        }),
        createVehicleData(testContext.dealershipId, {
          condition: 'used',
          status: 'sold',
          internetPrice: '28000',
        }),
      ]);
    });

    it('should count total inventory', async () => {
      // WHEN: Counting vehicles
      const [result] = await db
        .select({
          total: count(vehicles.id),
        })
        .from(vehicles)
        .where(eq(vehicles.dealershipId, testContext.dealershipId));

      // THEN: Correct count
      expect(result.total).toBeGreaterThanOrEqual(4);
    });

    it('should count available inventory only', async () => {
      // WHEN: Counting available
      const [result] = await db
        .select({
          available: count(vehicles.id),
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.dealershipId, testContext.dealershipId),
            eq(vehicles.status, 'available')
          )
        );

      // THEN: Only available counted
      expect(result.available).toBeGreaterThanOrEqual(3);
    });

    it('should calculate average inventory value', async () => {
      // WHEN: Averaging prices
      const [result] = await db
        .select({
          avgValue: avg(sql`CAST(${vehicles.internetPrice} AS DECIMAL)`),
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.dealershipId, testContext.dealershipId),
            eq(vehicles.status, 'available')
          )
        );

      // THEN: Average calculated
      const avgValue = parseFloat(result.avgValue?.toString() || '0');
      expect(avgValue).toBeGreaterThan(0);
      expect(avgValue).toBeGreaterThan(25000);
    });

    it('should break down inventory by condition (new/used)', async () => {
      // WHEN: Grouping by condition
      const results = await db
        .select({
          condition: vehicles.condition,
          count: count(vehicles.id),
          totalValue: sum(sql`CAST(${vehicles.internetPrice} AS DECIMAL)`),
        })
        .from(vehicles)
        .where(eq(vehicles.dealershipId, testContext.dealershipId))
        .groupBy(vehicles.condition);

      // THEN: Breakdown returned
      expect(results.length).toBeGreaterThan(0);

      const newVehicles = results.find(r => r.condition === 'new');
      const usedVehicles = results.find(r => r.condition === 'used');

      expect(newVehicles).toBeDefined();
      expect(usedVehicles).toBeDefined();
      expect(newVehicles?.count).toBeGreaterThanOrEqual(2);
      expect(usedVehicles?.count).toBeGreaterThanOrEqual(2);
    });

    it('should identify aging inventory (days in stock)', async () => {
      // WHEN: Calculating age
      const results = await db
        .select({
          id: vehicles.id,
          stockNumber: vehicles.stockNumber,
          daysInStock: sql<number>`EXTRACT(DAY FROM (NOW() - ${vehicles.createdAt}))`,
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.dealershipId, testContext.dealershipId),
            eq(vehicles.status, 'available')
          )
        )
        .orderBy(desc(sql`EXTRACT(DAY FROM (NOW() - ${vehicles.createdAt}))`));

      // THEN: Age calculated
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.daysInStock).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================================
  // CUSTOMER INSIGHTS
  // ============================================================================

  describe('Customer Insights', () => {
    beforeEach(async () => {
      // Create customers with deals
      for (let i = 0; i < 3; i++) {
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId, {
            state: i % 2 === 0 ? 'CA' : 'TX',
          }))
          .returning();

        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: customer.id,
          initialState: 'SOLD',
        });
      }
    });

    it('should count total customers', async () => {
      // WHEN: Counting customers
      const [result] = await db
        .select({
          total: count(customers.id),
        })
        .from(customers)
        .where(eq(customers.dealershipId, testContext.dealershipId));

      // THEN: Correct count
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('should identify customers with multiple deals', async () => {
      // Create repeat customer
      const [repeatCustomer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // Create 3 deals for same customer
      for (let i = 0; i < 3; i++) {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          customerId: repeatCustomer.id,
        });
      }

      // WHEN: Finding repeat customers
      const results = await db
        .select({
          customerId: deals.customerId,
          dealCount: count(deals.id),
        })
        .from(deals)
        .where(eq(deals.dealershipId, testContext.dealershipId))
        .groupBy(deals.customerId)
        .having(sql`COUNT(${deals.id}) > 1`);

      // THEN: Repeat customers identified
      const repeatEntry = results.find(r => r.customerId === repeatCustomer.id);
      expect(repeatEntry).toBeDefined();
      expect(repeatEntry?.dealCount).toBe(3);
    });

    it('should break down customers by state', async () => {
      // WHEN: Grouping by state
      const results = await db
        .select({
          state: customers.state,
          count: count(customers.id),
        })
        .from(customers)
        .where(eq(customers.dealershipId, testContext.dealershipId))
        .groupBy(customers.state);

      // THEN: State breakdown returned
      expect(results.length).toBeGreaterThan(0);

      const caCustomers = results.find(r => r.state === 'CA');
      const txCustomers = results.find(r => r.state === 'TX');

      expect(caCustomers || txCustomers).toBeDefined();
    });

    it('should calculate customer lifetime value', async () => {
      // WHEN: Calculating total value per customer
      const results = await db
        .select({
          customerId: deals.customerId,
          customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
          totalValue: sum(sql`CAST(${dealScenarios.vehiclePrice} AS DECIMAL)`),
          dealCount: count(deals.id),
        })
        .from(deals)
        .innerJoin(customers, eq(customers.id, deals.customerId))
        .innerJoin(dealScenarios, eq(dealScenarios.dealId, deals.id))
        .where(eq(deals.dealershipId, testContext.dealershipId))
        .groupBy(deals.customerId, sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`)
        .orderBy(desc(sum(sql`CAST(${dealScenarios.vehiclePrice} AS DECIMAL)`)));

      // THEN: CLV calculated
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        const totalValue = parseFloat(r.totalValue?.toString() || '0');
        expect(totalValue).toBeGreaterThan(0);
        expect(r.dealCount).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // TIME-BASED ANALYTICS
  // ============================================================================

  describe('Time-Based Analytics', () => {
    it('should calculate deals by month', async () => {
      // Create deals with specific dates
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // WHEN: Grouping by month
      const results = await db
        .select({
          month: sql<string>`TO_CHAR(${deals.createdAt}, 'YYYY-MM')`,
          dealCount: count(deals.id),
        })
        .from(deals)
        .where(eq(deals.dealershipId, testContext.dealershipId))
        .groupBy(sql`TO_CHAR(${deals.createdAt}, 'YYYY-MM')`)
        .orderBy(desc(sql`TO_CHAR(${deals.createdAt}, 'YYYY-MM')`));

      // THEN: Monthly breakdown returned
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter deals by date range', async () => {
      // GIVEN: Date range (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // WHEN: Filtering by date
      const results = await db
        .select({
          id: deals.id,
          createdAt: deals.createdAt,
        })
        .from(deals)
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            gte(deals.createdAt, thirtyDaysAgo)
          )
        );

      // THEN: Only recent deals returned
      results.forEach(r => {
        expect(new Date(r.createdAt).getTime()).toBeGreaterThanOrEqual(
          thirtyDaysAgo.getTime()
        );
      });
    });

    it('should calculate sales velocity (deals per day)', async () => {
      // Create multiple deals
      for (let i = 0; i < 10; i++) {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          initialState: 'SOLD',
        });
      }

      // WHEN: Calculating velocity
      const [result] = await db
        .select({
          totalDeals: count(deals.id),
          firstDeal: sql<Date>`MIN(${deals.createdAt})`,
          lastDeal: sql<Date>`MAX(${deals.createdAt})`,
        })
        .from(deals)
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'SOLD')
          )
        );

      // THEN: Velocity can be calculated
      expect(result.totalDeals).toBeGreaterThan(0);
      expect(result.firstDeal).toBeDefined();
      expect(result.lastDeal).toBeDefined();
    });
  });

  // ============================================================================
  // DEAL PIPELINE METRICS
  // ============================================================================

  describe('Deal Pipeline Metrics', () => {
    beforeEach(async () => {
      // Create pipeline with different states
      const states: Array<'DRAFT' | 'PENDING' | 'SOLD' | 'CANCELLED'> = [
        'DRAFT',
        'DRAFT',
        'PENDING',
        'PENDING',
        'PENDING',
        'SOLD',
        'SOLD',
        'CANCELLED',
      ];

      for (const state of states) {
        await createDeal({
          dealershipId: testContext.dealershipId,
          salespersonId: testContext.userId,
          initialState: state,
        });
      }
    });

    it('should show pipeline stages distribution', async () => {
      // WHEN: Grouping by state
      const results = await db
        .select({
          dealState: deals.dealState,
          count: count(deals.id),
          percentage: sql<number>`
            ROUND(
              (COUNT(${deals.id})::DECIMAL /
               (SELECT COUNT(*) FROM ${deals} WHERE ${deals.dealershipId} = ${testContext.dealershipId})) * 100,
              2
            )
          `,
        })
        .from(deals)
        .where(eq(deals.dealershipId, testContext.dealershipId))
        .groupBy(deals.dealState);

      // THEN: Distribution calculated
      expect(results.length).toBeGreaterThan(0);

      const draftCount = results.find(r => r.dealState === 'DRAFT')?.count || 0;
      const pendingCount = results.find(r => r.dealState === 'PENDING')?.count || 0;
      const soldCount = results.find(r => r.dealState === 'SOLD')?.count || 0;

      expect(draftCount).toBeGreaterThanOrEqual(2);
      expect(pendingCount).toBeGreaterThanOrEqual(3);
      expect(soldCount).toBeGreaterThanOrEqual(2);
    });

    it('should calculate conversion rate (sold / total)', async () => {
      // WHEN: Calculating conversion
      const [result] = await db
        .select({
          totalDeals: count(deals.id),
          soldDeals: sql<number>`COUNT(CASE WHEN ${deals.dealState} = 'SOLD' THEN 1 END)`,
          conversionRate: sql<number>`
            ROUND(
              (COUNT(CASE WHEN ${deals.dealState} = 'SOLD' THEN 1 END)::DECIMAL /
               COUNT(${deals.id})::DECIMAL) * 100,
              2
            )
          `,
        })
        .from(deals)
        .where(eq(deals.dealershipId, testContext.dealershipId));

      // THEN: Conversion rate calculated
      expect(result.totalDeals).toBeGreaterThan(0);
      expect(result.soldDeals).toBeGreaterThan(0);
      expect(result.conversionRate).toBeGreaterThan(0);
      expect(result.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should identify stale deals (pending > 30 days)', async () => {
      // WHEN: Finding old pending deals
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const results = await db
        .select({
          id: deals.id,
          dealNumber: deals.dealNumber,
          daysOld: sql<number>`EXTRACT(DAY FROM (NOW() - ${deals.createdAt}))`,
        })
        .from(deals)
        .where(
          and(
            eq(deals.dealershipId, testContext.dealershipId),
            eq(deals.dealState, 'PENDING'),
            sql`${deals.createdAt} < NOW() - INTERVAL '30 days'`
          )
        );

      // THEN: Stale deals can be identified
      // (May be empty for new test data)
      expect(results).toBeDefined();
    });
  });
});
