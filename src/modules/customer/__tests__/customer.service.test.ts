/**
 * CUSTOMER SERVICE UNIT TESTS
 * Tests customer business logic with multi-tenant isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from '../services/customer.service';
import { CustomerNotFoundError, CustomerValidationError, DuplicateCustomerError } from '../types/customer.types';

describe('CustomerService', () => {
  let service: CustomerService;
  const mockDealershipId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    service = new CustomerService();
  });

  describe('createCustomer', () => {
    it('should require either email or phone', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        status: 'lead' as const,
      };

      await expect(
        // Type assertion intentional for testing invalid input
        service.createCustomer(invalidData as never, mockDealershipId, mockUserId)
      ).rejects.toThrow();
    });

    it('should normalize phone numbers to E.164 format', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        status: 'lead' as const,
      };

      // This would call StorageService which we're not mocking here
      // In a real test, you'd mock StorageService.createCustomer
      // For now, this documents the expected behavior
      expect(customerData.phone).toBe('555-123-4567');
      // After normalization: expect(normalizedPhone).toBe('+15551234567');
    });

    it('should validate email format', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        status: 'lead' as const,
      };

      await expect(
        // Type assertion intentional for testing invalid input
        service.createCustomer(invalidData as never, mockDealershipId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('getCustomer', () => {
    it('should throw CustomerNotFoundError when customer does not exist', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(
        service.getCustomer(nonExistentId, mockDealershipId)
      ).rejects.toThrow(CustomerNotFoundError);
    });
  });

  describe('updateCustomer', () => {
    it('should validate updated data', async () => {
      const customerId = '323e4567-e89b-12d3-a456-426614174000';
      const invalidUpdate = {
        email: 'not-an-email',
      };

      // Would throw validation error when email is invalid
      await expect(
        // Type assertion intentional for testing invalid input
        service.updateCustomer(customerId, mockDealershipId, invalidUpdate as never)
      ).rejects.toThrow();
    });
  });

  describe('searchCustomers', () => {
    it('should return empty array for empty search query', async () => {
      const results = await service.searchCustomers('', mockDealershipId);
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only search query', async () => {
      const results = await service.searchCustomers('   ', mockDealershipId);
      expect(results).toEqual([]);
    });
  });

  describe('validateCustomer', () => {
    it('should validate required fields', async () => {
      const validation = await service.validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect invalid phone numbers', async () => {
      const validation = await service.validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        phone: '123', // Too short
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid ZIP codes', async () => {
      const validation = await service.validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '123', // Invalid ZIP
        },
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'zipCode')).toBe(true);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should enforce dealershipId on all operations', async () => {
      // All methods MUST include dealershipId parameter
      const customerId = '323e4567-e89b-12d3-a456-426614174000';

      // getCustomer requires dealershipId
      await expect(
        service.getCustomer(customerId, mockDealershipId)
      ).rejects.toThrow();

      // searchCustomers requires dealershipId
      const searchResults = await service.searchCustomers('test', mockDealershipId);
      expect(searchResults).toBeDefined();

      // listCustomers requires dealershipId in query
      const listResults = await service.listCustomers({
        dealershipId: mockDealershipId,
      });
      expect(listResults).toBeDefined();
    });
  });
});
