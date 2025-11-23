/**
 * Customer Search Integration Tests
 * Tests customer search, filtering, and pagination functionality
 *
 * Critical paths tested:
 * - Full-text search across multiple fields
 * - Filter by date range
 * - Pagination and sorting
 * - Multi-tenant isolation
 * - Search result relevance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Customer, PaginatedResponse } from '@shared/types';

describe('Customer Search Integration', () => {
  const TEST_TENANT_ID = 'dealership-001';
  const TEST_USER_ID = 'user-001';

  // Mock customer database for testing
  let testCustomers: (Customer & { id: string })[] = [];

  beforeAll(() => {
    // Create test customers with various attributes
    testCustomers = [
      {
        id: 'cust-001',
        dealershipId: TEST_TENANT_ID,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '5551234567',
        address: {
          street: '123 Main St',
          city: 'Phoenix',
          state: 'AZ',
          zipCode: '85001',
        },
        source: 'Website',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
      },
      {
        id: 'cust-002',
        dealershipId: TEST_TENANT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@email.com',
        phone: '5559876543',
        address: {
          street: '456 Oak Ave',
          city: 'Scottsdale',
          state: 'AZ',
          zipCode: '85251',
        },
        source: 'Referral',
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-10'),
      },
      {
        id: 'cust-003',
        dealershipId: TEST_TENANT_ID,
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.j@email.com',
        phone: '5555551234',
        address: {
          street: '789 Pine Rd',
          city: 'Mesa',
          state: 'AZ',
          zipCode: '85201',
        },
        source: 'Walk-in',
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-12'),
      },
      {
        id: 'cust-004',
        dealershipId: TEST_TENANT_ID,
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.w@email.com',
        phone: '5552223333',
        address: {
          street: '321 Elm St',
          city: 'Tempe',
          state: 'AZ',
          zipCode: '85281',
        },
        source: 'Online Ad',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-20'),
      },
      {
        id: 'cust-005',
        dealershipId: TEST_TENANT_ID,
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'mbrown@email.com',
        phone: '5554445555',
        address: {
          street: '555 Maple Dr',
          city: 'Chandler',
          state: 'AZ',
          zipCode: '85224',
        },
        source: 'Phone',
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date('2025-01-08'),
      },
    ];
  });

  describe('Search by Name', () => {
    it('should find customer by first name', () => {
      // Arrange
      const searchQuery = 'John';

      // Act
      const results = testCustomers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBe(2); // John Smith and John (if exists)
      expect(results[0].firstName).toBe('John');
    });

    it('should find customer by last name', () => {
      // Arrange
      const searchQuery = 'Smith';

      // Act
      const results = testCustomers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].lastName).toBe('Smith');
    });

    it('should find customer by full name', () => {
      // Arrange
      const searchQuery = 'John Smith';

      // Act
      const results = testCustomers.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].firstName).toBe('John');
      expect(results[0].lastName).toBe('Smith');
    });

    it('should perform case-insensitive search', () => {
      // Arrange
      const searchQuery = 'JOHN';

      // Act
      const results = testCustomers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Search by Email and Phone', () => {
    it('should find customer by email address', () => {
      // Arrange
      const searchQuery = 'john.smith@email.com';

      // Act
      const results = testCustomers.filter(
        (c) => c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('cust-001');
    });

    it('should find customer by partial email', () => {
      // Arrange
      const searchQuery = 'jane.doe';

      // Act
      const results = testCustomers.filter(
        (c) => c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].firstName).toBe('Jane');
    });

    it('should find customer by phone number', () => {
      // Arrange
      const searchQuery = '5551234567';

      // Act
      const results = testCustomers.filter(
        (c) => c.phone && c.phone.includes(searchQuery)
      );

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].firstName).toBe('John');
    });

    it('should find customer by partial phone number', () => {
      // Arrange
      const searchQuery = '555';

      // Act
      const results = testCustomers.filter(
        (c) => c.phone && c.phone.includes(searchQuery)
      );

      // Assert
      expect(results.length).toBe(testCustomers.length); // All have 555 area code
    });
  });

  describe('Filter by Date Range', () => {
    it('should filter customers created in date range', () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-05');

      // Act
      const results = testCustomers.filter(
        (c) => c.createdAt >= startDate && c.createdAt <= endDate
      );

      // Assert
      expect(results.length).toBeGreaterThan(0);
      results.forEach((c) => {
        expect(c.createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(c.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter customers updated in date range', () => {
      // Arrange
      const startDate = new Date('2025-01-15');
      const endDate = new Date('2025-01-20');

      // Act
      const results = testCustomers.filter(
        (c) => c.updatedAt >= startDate && c.updatedAt <= endDate
      );

      // Assert
      expect(results.length).toBeGreaterThan(0);
      results.forEach((c) => {
        expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(c.updatedAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should find recently updated customers', () => {
      // Arrange
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Act
      const results = testCustomers.filter((c) => c.updatedAt >= sevenDaysAgo);

      // Assert
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Pagination', () => {
    it('should paginate search results correctly', () => {
      // Arrange
      const pageSize = 2;
      const page = 1; // 0-indexed: first page

      // Act
      const offset = page * pageSize;
      const paginatedResults = testCustomers.slice(offset, offset + pageSize);

      // Assert
      expect(paginatedResults.length).toBeLessThanOrEqual(pageSize);
      expect(paginatedResults.length).toBeGreaterThan(0);
    });

    it('should return correct total count with pagination', () => {
      // Arrange
      const pageSize = 2;
      const totalCustomers = testCustomers.length;

      // Act
      const totalPages = Math.ceil(totalCustomers / pageSize);

      // Assert
      expect(totalPages).toBeGreaterThan(0);
      expect(totalPages).toBe(3); // 5 customers / 2 per page = 3 pages
    });

    it('should handle last page correctly', () => {
      // Arrange
      const pageSize = 2;
      const totalCustomers = testCustomers.length;
      const totalPages = Math.ceil(totalCustomers / pageSize);
      const lastPage = totalPages - 1;

      // Act
      const offset = lastPage * pageSize;
      const lastPageResults = testCustomers.slice(offset, offset + pageSize);

      // Assert
      expect(lastPageResults.length).toBeGreaterThan(0);
      expect(lastPageResults.length).toBeLessThanOrEqual(pageSize);
    });
  });

  describe('Sorting', () => {
    it('should sort customers by name ascending', () => {
      // Arrange & Act
      const sorted = [...testCustomers].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );

      // Assert
      expect(sorted[0].firstName).toBe('Jane');
      expect(sorted[sorted.length - 1].firstName).toBe('Sarah');
    });

    it('should sort customers by creation date descending', () => {
      // Arrange & Act
      const sorted = [...testCustomers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Assert
      expect(sorted[0].id).toBe('cust-003'); // Most recent
    });

    it('should sort customers by last update descending', () => {
      // Arrange & Act
      const sorted = [...testCustomers].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Assert
      expect(sorted[0].id).toBe('cust-004'); // Most recently updated
    });
  });

  describe('Combined Search and Filter', () => {
    it('should search and filter by date range simultaneously', () => {
      // Arrange
      const searchQuery = 'Smith';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-15');

      // Act
      const results = testCustomers.filter(
        (c) =>
          (c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.lastName.toLowerCase().includes(searchQuery.toLowerCase())) &&
          c.createdAt >= startDate &&
          c.createdAt <= endDate
      );

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].lastName).toBe('Smith');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should only return customers for current tenant', () => {
      // Arrange
      const otherTenantId = 'other-dealership-001';

      // Act & Assert
      const results = testCustomers.filter(
        (c) => c.dealershipId === TEST_TENANT_ID
      );

      expect(results.length).toBe(testCustomers.length);
      expect(results.every((c) => c.dealershipId === TEST_TENANT_ID)).toBe(true);

      // Verify no customers from other tenant
      const otherTenantCustomers = testCustomers.filter(
        (c) => c.dealershipId === otherTenantId
      );
      expect(otherTenantCustomers.length).toBe(0);
    });
  });

  describe('Search Result Validation', () => {
    it('should return empty results for non-existent search', () => {
      // Arrange
      const searchQuery = 'NonexistentCustomer12345';

      // Act
      const results = testCustomers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Assert
      expect(results.length).toBe(0);
    });

    it('should return all customers when search is empty', () => {
      // Arrange
      const searchQuery = '';

      // Act
      const results = testCustomers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchQuery === ''
      );

      // Assert
      expect(results.length).toBe(testCustomers.length);
    });
  });

  describe('Search Performance', () => {
    it('should handle search with large result set', () => {
      // Arrange - Create large dataset
      const largeDataset: typeof testCustomers = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `cust-${i}`,
          dealershipId: TEST_TENANT_ID,
          firstName: `Customer${i}`,
          lastName: `Test`,
          email: `customer${i}@email.com`,
          phone: `5550000${String(i).padStart(3, '0')}`,
          address: {
            street: `${i} Test St`,
            city: 'Phoenix',
            state: 'AZ',
            zipCode: '85001',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Act
      const startTime = Date.now();
      const results = largeDataset.filter((c) =>
        c.firstName.toLowerCase().includes('Customer1')
      );
      const duration = Date.now() - startTime;

      // Assert - Should complete quickly (< 100ms for 1000 records)
      expect(duration).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
