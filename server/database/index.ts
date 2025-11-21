/**
 * DATABASE LAYER - MAIN EXPORTS
 *
 * This is the primary entry point for the database layer.
 * Import database functionality from here in your application code.
 *
 * @example
 * import { db, transaction, createDeal } from './database';
 */

// Core database service
export {
  getDatabaseService,
  db,
  pool,
  transaction,
  serializableTransaction,
  healthCheck,
  getMetrics,
  shutdownDatabase,
  type PoolMetrics,
  type QueryMetrics,
  type TransactionStats,
  type TransactionContext,
  IsolationLevel,
} from './db-service';

// Connection pool
export {
  getConnectionPool,
  shutdownConnectionPool,
} from './connection-pool';

// Transaction manager
export {
  getTransactionManager,
  withTransaction,
  withSerializableTransaction,
} from './transaction-manager';

// Atomic operations
export {
  getAtomicOperations,
  createDeal,
  attachCustomerToDeal,
  registerUser,
  generateDealNumber,
  generateStockNumber,
  updateEmailStatus,
  type CreateDealInput,
  type CreateDealResult,
  type RegisterUserInput,
  type RegisterUserResult,
} from './atomic-operations';

// Monitoring routes (for Express app)
export { default as dbMonitoringRoutes } from './monitoring-routes';
