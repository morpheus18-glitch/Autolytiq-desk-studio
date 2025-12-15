/**
 * Vitest Global Test Setup
 *
 * This file runs before each test file and configures the test environment.
 *
 * Key features:
 * - Sets NODE_ENV to 'test' for conditional logic
 * - Configures jest-dom matchers for DOM assertions
 * - Sets up console warning filters for noisy dependencies
 * - Configures fetch polyfill for Node.js
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Suppress noisy console warnings from dependencies
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    // Filter out known noisy warnings
    if (
      typeof message === 'string' &&
      (message.includes('React does not recognize') ||
        message.includes('Invalid DOM property') ||
        message.includes('componentWillReceiveProps'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Mock crypto for tests that don't have Web Crypto API
  if (!globalThis.crypto) {
    globalThis.crypto = {
      randomUUID: () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
      getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        if (array instanceof Uint8Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
        }
        return array;
      },
    } as Crypto;
  }
});

afterAll(async () => {
  // Global test teardown - cleanup any persistent resources
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

// Extend expect with custom matchers for the test suite
expect.extend({
  /**
   * Check if a value is a valid UUID
   */
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  /**
   * Check if a value is encrypted (starts with pqc:v1:)
   */
  toBeEncrypted(received: string) {
    const pass = typeof received === 'string' && received.startsWith('pqc:v1:');

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be encrypted`
          : `expected ${received} to be encrypted (start with pqc:v1:)`,
    };
  },

  /**
   * Check if a number is in cents (integer, typically used for money)
   */
  toBeMoneyInCents(received: number) {
    const pass = Number.isInteger(received) && received >= 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be money in cents`
          : `expected ${received} to be a non-negative integer (money in cents)`,
    };
  },
});

// ============================================================================
// GLOBAL TYPE AUGMENTATION
// ============================================================================

declare global {
  namespace Vi {
    interface Assertion {
      toBeValidUUID(): void;
      toBeEncrypted(): void;
      toBeMoneyInCents(): void;
    }
    interface AsymmetricMatchersContaining {
      toBeValidUUID(): void;
      toBeEncrypted(): void;
      toBeMoneyInCents(): void;
    }
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Create a delayed promise for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock Date.now() for deterministic tests
 */
export function mockDate(date: Date | string | number): () => void {
  const mockedDate = new Date(date);
  const original = Date.now;

  vi.spyOn(Date, 'now').mockImplementation(() => mockedDate.getTime());

  return () => {
    Date.now = original;
  };
}
