/**
 * TEST SETUP & DATABASE UTILITIES
 *
 * Provides database setup, teardown, and test data helpers
 * for integration tests.
 *
 * RESPONSIBILITIES:
 * - Test database initialization
 * - Transaction rollback between tests
 * - Test data factories
 * - Database cleanup
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db, pool } from '../database/db-service';
import {
  users,
  customers,
  vehicles,
  deals,
  dealScenarios,
  dealershipSettings,
  emailMessages,
  emailAccounts,
  InsertUser,
  InsertCustomer,
  InsertVehicle,
  InsertDeal,
  InsertDealScenario,
  InsertDealershipSettings,
  User,
  Customer,
  Vehicle,
  Deal,
  DealScenario,
} from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * Test dealership ID - consistent across all tests
 */
export const TEST_DEALERSHIP_ID = 'test-dealership-001';

/**
 * Test database setup state
 */
let testDealership: any = null;
let testUser: User | null = null;

/**
 * Initialize test database with test dealership
 */
export async function setupTestDatabase() {
  try {
    console.log('[Test Setup] Initializing test database...');

    // Create test dealership if not exists
    const existingDealership = await db.query.dealershipSettings.findFirst({
      where: eq(dealershipSettings.dealershipId, TEST_DEALERSHIP_ID),
    });

    if (!existingDealership) {
      const [dealership] = await db
        .insert(dealershipSettings)
        .values({
          dealershipId: TEST_DEALERSHIP_ID,
          dealershipName: 'Test Dealership',
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
          phone: '555-0100',
          email: 'test@dealership.com',
        })
        .returning();
      testDealership = dealership;
    } else {
      testDealership = existingDealership;
    }

    // Create test user if not exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, 'testuser'),
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('TestPass123', 10);
      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testDealership.id,
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@user.com',
          password: hashedPassword,
          role: 'salesperson',
          isActive: true,
        })
        .returning();
      testUser = user;
    } else {
      testUser = existingUser;
    }

    console.log('[Test Setup] Test database ready');
    console.log(`[Test Setup] Test Dealership ID: ${testDealership.id}`);
    console.log(`[Test Setup] Test User ID: ${testUser?.id}`);
  } catch (error) {
    console.error('[Test Setup] Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean up test data (preserves dealership and test user)
 */
export async function cleanupTestData() {
  try {
    console.log('[Test Cleanup] Cleaning up test data...');

    // Delete in order of dependencies (child → parent)
    await db.delete(dealScenarios).execute();
    await db.delete(deals).execute();
    await db.delete(vehicles).execute();
    await db.delete(customers).execute();
    await db.delete(emailMessages).execute();

    console.log('[Test Cleanup] Test data cleaned');
  } catch (error) {
    console.error('[Test Cleanup] Failed to clean test data:', error);
    throw error;
  }
}

/**
 * Teardown test database connection
 */
export async function teardownTestDatabase() {
  try {
    console.log('[Test Teardown] Closing database connections...');
    await pool.end();
    console.log('[Test Teardown] Database connections closed');
  } catch (error) {
    console.error('[Test Teardown] Failed to close database:', error);
  }
}

/**
 * Get test dealership and user
 */
export function getTestContext() {
  if (!testDealership || !testUser) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }

  return {
    dealership: testDealership,
    user: testUser,
    dealershipId: testDealership.id,
    userId: testUser.id,
  };
}

/**
 * Setup hooks for all tests
 */
export function setupTestHooks() {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clean data before each test for isolation
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownTestDatabase();
  });
}
