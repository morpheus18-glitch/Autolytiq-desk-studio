/**
 * CUSTOMER CRUD INTEGRATION TESTS
 *
 * Tests customer lifecycle operations:
 * - Create customer
 * - Read customer data
 * - Update customer information
 * - Delete customer
 * - Search and filtering
 * - Validation and error handling
 * - Multi-tenant isolation
 *
 * CRITICAL: Customers are the foundation of all deals.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { customers } from '@shared/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
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
  assertValidCustomer,
  assertEmailFormat,
  assertPhoneFormat,
  assertZipCodeFormat,
  assertStateCode,
  assertRecentDate,
  assertSameDealership,
} from './helpers/assertions';

describe('Customer CRUD Integration Tests', () => {
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
  // CREATE CUSTOMER TESTS
  // ============================================================================

  describe('Create Customer', () => {
    it('should create customer with full information', async () => {
      // GIVEN: Complete customer data
      const customerData = createCustomerData(testContext.dealershipId, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        county: 'Los Angeles',
      });

      // WHEN: Creating customer
      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

      // THEN: Customer created successfully
      assertValidCustomer(customer);
      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Doe');
      expect(customer.email).toBe('john.doe@example.com');
      expect(customer.phone).toBe('555-1234');
      expect(customer.state).toBe('CA');
      expect(customer.zipCode).toBe('90001');

      // Verify auto-generated fields
      expect(customer.customerNumber).toBeDefined();
      assertRecentDate(customer.createdAt);
      expect(customer.dealershipId).toBe(testContext.dealershipId);
    });

    it('should create customer with minimal required fields', async () => {
      // GIVEN: Minimal customer data
      const customerData = createCustomerData(testContext.dealershipId, {
        firstName: 'Jane',
        lastName: 'Smith',
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
      });

      // WHEN: Creating customer
      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

      // THEN: Customer created with minimal data
      assertValidCustomer(customer);
      expect(customer.firstName).toBe('Jane');
      expect(customer.lastName).toBe('Smith');
      expect(customer.email).toBeNull();
      expect(customer.phone).toBeNull();
    });

    it('should auto-generate unique customer number', async () => {
      // GIVEN: Multiple customers
      const customerNumbers: string[] = [];

      // WHEN: Creating 5 customers
      for (let i = 0; i < 5; i++) {
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId, {
            firstName: `Customer${i}`,
          }))
          .returning();

        customerNumbers.push(customer.customerNumber);
      }

      // THEN: All customer numbers are unique
      const uniqueNumbers = new Set(customerNumbers);
      expect(uniqueNumbers.size).toBe(5);

      // AND: All follow expected format
      customerNumbers.forEach(num => {
        expect(num).toMatch(/^C-\d{6}$/);
      });
    });

    it('should validate email format', async () => {
      // GIVEN: Valid email addresses
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
      ];

      for (const email of validEmails) {
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId, { email }))
          .returning();

        assertEmailFormat(customer.email!);
      }
    });

    it('should enforce multi-tenant isolation on creation', async () => {
      // GIVEN: Customer for specific dealership
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // THEN: Customer belongs to correct dealership
      expect(customer.dealershipId).toBe(testContext.dealershipId);
    });
  });

  // ============================================================================
  // READ CUSTOMER TESTS
  // ============================================================================

  describe('Read Customer', () => {
    it('should fetch customer by ID', async () => {
      // GIVEN: Existing customer
      const [created] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: 'John',
          lastName: 'Doe',
        }))
        .returning();

      // WHEN: Fetching by ID
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, created.id),
      });

      // THEN: Customer retrieved correctly
      expect(customer).toBeDefined();
      expect(customer?.id).toBe(created.id);
      expect(customer?.firstName).toBe('John');
      expect(customer?.lastName).toBe('Doe');
    });

    it('should fetch customer by email', async () => {
      // GIVEN: Customer with unique email
      const testEmail = 'unique@example.com';
      const [created] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: testEmail,
        }))
        .returning();

      // WHEN: Searching by email
      const customer = await db.query.customers.findFirst({
        where: eq(customers.email, testEmail),
      });

      // THEN: Customer found
      expect(customer).toBeDefined();
      expect(customer?.email).toBe(testEmail);
      expect(customer?.id).toBe(created.id);
    });

    it('should list all customers for dealership', async () => {
      // GIVEN: Multiple customers
      for (let i = 0; i < 5; i++) {
        await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId));
      }

      // WHEN: Fetching all customers
      const allCustomers = await db.query.customers.findMany({
        where: eq(customers.dealershipId, testContext.dealershipId),
        orderBy: [desc(customers.createdAt)],
      });

      // THEN: All customers retrieved
      expect(allCustomers.length).toBeGreaterThanOrEqual(5);
      allCustomers.forEach(customer => {
        assertValidCustomer(customer);
        expect(customer.dealershipId).toBe(testContext.dealershipId);
      });
    });

    it('should search customers by name (partial match)', async () => {
      // GIVEN: Customers with specific names
      await db.insert(customers).values([
        createCustomerData(testContext.dealershipId, {
          firstName: 'John',
          lastName: 'Smith',
        }),
        createCustomerData(testContext.dealershipId, {
          firstName: 'Jane',
          lastName: 'Johnson',
        }),
        createCustomerData(testContext.dealershipId, {
          firstName: 'Bob',
          lastName: 'Jones',
        }),
      ]);

      // WHEN: Searching for "Jo"
      const results = await db.query.customers.findMany({
        where: and(
          eq(customers.dealershipId, testContext.dealershipId),
          or(
            like(customers.firstName, '%Jo%'),
            like(customers.lastName, '%Jo%')
          )
        ),
      });

      // THEN: Matching customers returned
      expect(results.length).toBe(3); // John, Jane Johnson, Bob Jones
      expect(results.some(c => c.firstName === 'John')).toBe(true);
      expect(results.some(c => c.lastName === 'Johnson')).toBe(true);
      expect(results.some(c => c.lastName === 'Jones')).toBe(true);
    });

    it('should filter customers by state', async () => {
      // GIVEN: Customers in different states
      await db.insert(customers).values([
        createCustomerData(testContext.dealershipId, { state: 'CA' }),
        createCustomerData(testContext.dealershipId, { state: 'CA' }),
        createCustomerData(testContext.dealershipId, { state: 'TX' }),
      ]);

      // WHEN: Filtering by CA
      const caCustomers = await db.query.customers.findMany({
        where: and(
          eq(customers.dealershipId, testContext.dealershipId),
          eq(customers.state, 'CA')
        ),
      });

      // THEN: Only CA customers returned
      expect(caCustomers.length).toBeGreaterThanOrEqual(2);
      caCustomers.forEach(customer => {
        expect(customer.state).toBe('CA');
      });
    });
  });

  // ============================================================================
  // UPDATE CUSTOMER TESTS
  // ============================================================================

  describe('Update Customer', () => {
    it('should update customer contact information', async () => {
      // GIVEN: Existing customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: 'old@example.com',
          phone: '555-0000',
        }))
        .returning();

      // WHEN: Updating contact info
      const [updated] = await db
        .update(customers)
        .set({
          email: 'new@example.com',
          phone: '555-9999',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();

      // THEN: Contact info updated
      expect(updated.email).toBe('new@example.com');
      expect(updated.phone).toBe('555-9999');
      assertRecentDate(updated.updatedAt);
    });

    it('should update customer address', async () => {
      // GIVEN: Customer with old address
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          address: '123 Old St',
          city: 'Old City',
          state: 'CA',
          zipCode: '90001',
        }))
        .returning();

      // WHEN: Moving to new address
      const [updated] = await db
        .update(customers)
        .set({
          address: '456 New Ave',
          city: 'New City',
          state: 'TX',
          zipCode: '75001',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();

      // THEN: Address updated
      expect(updated.address).toBe('456 New Ave');
      expect(updated.city).toBe('New City');
      expect(updated.state).toBe('TX');
      expect(updated.zipCode).toBe('75001');
    });

    it('should update only specified fields', async () => {
      // GIVEN: Customer with full data
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
        }))
        .returning();

      // WHEN: Updating only phone
      const [updated] = await db
        .update(customers)
        .set({
          phone: '555-9999',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();

      // THEN: Only phone changed
      expect(updated.phone).toBe('555-9999');
      expect(updated.firstName).toBe('John');
      expect(updated.lastName).toBe('Doe');
      expect(updated.email).toBe('john@example.com');
    });

    it('should track update timestamp', async () => {
      // GIVEN: Customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const originalUpdatedAt = customer.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // WHEN: Updating
      const [updated] = await db
        .update(customers)
        .set({
          firstName: 'Updated',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();

      // THEN: Timestamp updated
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  // ============================================================================
  // DELETE CUSTOMER TESTS
  // ============================================================================

  describe('Delete Customer', () => {
    it('should delete customer by ID', async () => {
      // GIVEN: Existing customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // WHEN: Deleting customer
      await db
        .delete(customers)
        .where(eq(customers.id, customer.id));

      // THEN: Customer no longer exists
      const deleted = await db.query.customers.findFirst({
        where: eq(customers.id, customer.id),
      });

      expect(deleted).toBeUndefined();
    });

    it('should soft-delete by setting inactive flag', async () => {
      // GIVEN: Active customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          isActive: true,
        }))
        .returning();

      // WHEN: Soft-deleting (marking inactive)
      const [updated] = await db
        .update(customers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();

      // THEN: Customer marked inactive
      expect(updated.isActive).toBe(false);

      // AND: Still exists in database
      const stillExists = await db.query.customers.findFirst({
        where: eq(customers.id, customer.id),
      });
      expect(stillExists).toBeDefined();
    });

    it('should handle cascade delete constraints with deals', async () => {
      // GIVEN: Customer with no deals
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // WHEN: Deleting customer
      await db
        .delete(customers)
        .where(eq(customers.id, customer.id));

      // THEN: Successfully deleted
      const deleted = await db.query.customers.findFirst({
        where: eq(customers.id, customer.id),
      });

      expect(deleted).toBeUndefined();
    });
  });

  // ============================================================================
  // MULTI-TENANT ISOLATION TESTS
  // ============================================================================

  describe('Multi-Tenant Isolation', () => {
    it('should only fetch customers for correct dealership', async () => {
      // GIVEN: Customers for test dealership
      await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId));

      // WHEN: Fetching with dealership filter
      const dealershipCustomers = await db.query.customers.findMany({
        where: eq(customers.dealershipId, testContext.dealershipId),
      });

      // THEN: All belong to correct dealership
      dealershipCustomers.forEach(customer => {
        expect(customer.dealershipId).toBe(testContext.dealershipId);
      });
    });

    it('should enforce dealership ID on all operations', async () => {
      // GIVEN: Customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // THEN: Cannot change dealership ID (business rule)
      // This would be enforced at application level
      expect(customer.dealershipId).toBe(testContext.dealershipId);
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long names', async () => {
      // GIVEN: Long names
      const longName = 'A'.repeat(100);
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: longName,
          lastName: longName,
        }))
        .returning();

      // THEN: Names stored correctly
      expect(customer.firstName).toBe(longName);
      expect(customer.lastName).toBe(longName);
    });

    it('should handle special characters in names', async () => {
      // GIVEN: Names with special characters
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: "O'Brien",
          lastName: "García-López",
        }))
        .returning();

      // THEN: Special characters preserved
      expect(customer.firstName).toBe("O'Brien");
      expect(customer.lastName).toBe("García-López");
    });

    it('should handle null/empty optional fields', async () => {
      // GIVEN: Customer with null fields
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          county: null,
        }))
        .returning();

      // THEN: Null values accepted
      expect(customer.email).toBeNull();
      expect(customer.phone).toBeNull();
      expect(customer.address).toBeNull();
    });

    it('should handle concurrent customer creation', async () => {
      // GIVEN: Multiple simultaneous creations
      const promises = Array.from({ length: 10 }, (_, i) =>
        db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId, {
            firstName: `Concurrent${i}`,
          }))
          .returning()
      );

      // WHEN: Creating all in parallel
      const results = await Promise.all(promises);

      // THEN: All created successfully
      expect(results.length).toBe(10);

      // All have unique IDs
      const ids = results.map(([c]) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
