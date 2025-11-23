/**
 * DATABASE MODULE EXPORTS
 * Central export point for all database-related functionality
 */

// Core database service (now in core layer)
export { getDatabaseService, db, pool, transaction, serializableTransaction } from './db-service';
export type { PoolMetrics, QueryMetrics, TransactionStats, TransactionContext } from './db-service';

// Storage service (new secure multi-tenant layer)
export { StorageService } from './storage.service';
export type { IStorage } from './storage.interface';

// Atomic operations (now in core layer)
export {
  getAtomicOperations,
  createDeal,
  attachCustomerToDeal,
  registerUser,
  generateDealNumber,
  generateStockNumber,
  updateEmailStatus,
} from './atomic-operations';
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
} from './atomic-operations';

// Adapters
export { createStorageAdapter, getStorageService, getSharedStorageService } from '../adapters/storage.adapter';
