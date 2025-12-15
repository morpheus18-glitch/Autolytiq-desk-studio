/**
 * Test Helpers Index
 *
 * Central export point for all test utilities.
 *
 * Usage:
 * ```typescript
 * import { createMockUser, createTestDb, mockAuthService } from '@/tests/helpers';
 * ```
 */

// ============================================================================
// FIXTURES - Factory functions for test data
// ============================================================================

export {
  // User factories
  createMockUser,
  createMockAdmin,
  createMockManager,
  type MockUser,
  type UserRole,

  // Dealership factories
  createMockDealership,
  type MockDealership,

  // Customer factories
  createMockCustomer,
  createMockCustomerWithPII,
  createMockCustomers,
  type MockCustomer,

  // Vehicle factories
  createMockVehicle,
  createMockNewVehicle,
  createMockUsedVehicle,
  createMockVehicles,
  type MockVehicle,
  type VehicleStatus,
  type VehicleCondition,

  // Deal factories
  createMockDeal,
  createMockCashDeal,
  createMockLeaseDeal,
  createMockDeals,
  type MockDeal,
  type DealType,
  type DealStatus,

  // Credit profile factories
  createMockCreditProfile,
  createMockPrimeCreditProfile,
  createMockSubprimeCreditProfile,
  type MockCreditProfile,
  type CreditRiskTier,
  type CreditBureau,

  // Auth factories
  createMockAuthTokens,
  createMockLoginRequest,
  type MockAuthTokens,
  type MockLoginRequest,

  // Batch factories
  createMockUsers,

  // Scenario builders
  createDealershipScenario,
} from './fixtures';

// ============================================================================
// TEST DATABASE - In-memory SQLite for integration tests
// ============================================================================

export {
  createTestDb,
  createTestContext,
  cleanTables,
  withTransaction,
  type TestDb,
} from './test-db';

// ============================================================================
// MOCK SERVICES - HTTP mocking with MSW
// ============================================================================

export {
  mockServer,
  setupMockServer,
  mockAuthService,
  mockDealService,
  mockCustomerService,
  mockTaxService,
  createAuthHeaders,
  expectApiError,
  expectApiSuccess,
} from './mock-services';

// ============================================================================
// TEST UTILITIES - Helper functions from setup
// ============================================================================

export { waitFor, delay, mockDate } from './setup';
