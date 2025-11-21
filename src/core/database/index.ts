/**
 * DATABASE MODULE EXPORTS
 * Central export point for all database-related functionality
 */

// Core database service (from server infrastructure)
export { getDatabaseService, db, pool, transaction, serializableTransaction } from '../../../server/database/db-service';
export type { PoolMetrics, QueryMetrics, TransactionStats, TransactionContext } from '../../../server/database/db-service';

// Storage service (new secure multi-tenant layer)
export { StorageService } from './storage.service';
export type { IStorage } from './storage.interface';

// Atomic operations (from server infrastructure)
export {
  getAtomicOperations,
  createDeal,
  attachCustomerToDeal,
  registerUser,
  generateDealNumber,
  generateStockNumber,
  updateEmailStatus,
} from '../../../server/database/atomic-operations';
export type {
  CreateDealResult,
  CreateDealInput,
  RegisterUserResult,
  RegisterUserInput,
  DealCreationError,
  ValidationError,
  ResourceNotFoundError,
  VehicleNotAvailableError,
  DuplicateDealNumberError,
  MultiTenantViolationError,
} from '../../../server/database/atomic-operations';

// Adapters
export { createStorageAdapter, getStorageService, getSharedStorageService } from '../adapters/storage.adapter';
