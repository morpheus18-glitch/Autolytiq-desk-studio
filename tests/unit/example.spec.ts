/**
 * Example Test - Verify Vitest Setup
 *
 * This is your first test!
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';

describe('Foundation Setup Verification', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should validate objects', () => {
    const user = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin'
    };

    expect(user).toMatchObject({
      name: 'Test User',
      email: expect.stringContaining('@'),
      role: expect.any(String)
    });
  });
});

describe('Test Helpers', () => {
  it('should have access to test helpers', async () => {
    // Verify helpers are available
    const factories = await import('../helpers/factories');

    expect(factories.createMockUser).toBeDefined();
    expect(factories.createMockCustomer).toBeDefined();
  });
});
