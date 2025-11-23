/**
 * DATABASE SERVICE
 * Centralized database service integrating connection pooling, transactions, and Drizzle ORM
 *
 * This is the main database service that should be used throughout the application.
 * It provides:
 * - Connection pooling via connection-pool.ts
 * - Transaction management via transaction-manager.ts
 * - Drizzle ORM integration
 * - Query monitoring and logging
 * - Health checks and metrics
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import {
  getConnectionPool,
  shutdownConnectionPool,
  type PoolMetrics,
  type QueryMetrics,
} from './connection-pool';
import {
  withTransaction,
  withSerializableTransaction,
  getTransactionManager,
  type TransactionContext,
  type TransactionOptions,
  type TransactionStats,
  IsolationLevel,
} from './transaction-manager';
import type { DbRow } from '@shared/types';

/**
 * Database Service Class
 */
class DatabaseService {
  private connectionPool;
  private drizzleDb;

  constructor() {
    // Initialize connection pool
    this.connectionPool = getConnectionPool();

    // Initialize Drizzle with our managed pool
    this.drizzleDb = drizzle({
      client: this.connectionPool.getPool(),
      schema,
    });

    console.log('[DB Service] Database service initialized');
  }

  /**
   * Get Drizzle database instance
   * Use this for all Drizzle queries
   */
  get db() {
    return this.drizzleDb;
  }

  /**
   * Get underlying connection pool
   * Use for raw queries when needed
   */
  get pool() {
    return this.connectionPool.getPool();
  }

  /**
   * Execute a raw SQL query with tracking
   */
  async query<T extends DbRow = DbRow>(
    queryText: string,
    values?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.connectionPool.query<T>(queryText, values);
  }

  /**
   * Execute a transaction with automatic retry
   * Use this for any multi-step operations that need to be atomic
   *
   * @example
   * await db.transaction(async ({ client }) => {
   *   await client.query('INSERT INTO customers ...');
   *   await client.query('INSERT INTO deals ...');
   * });
   */
  async transaction<T>(
    callback: (ctx: TransactionContext) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    return withTransaction(callback, options);
  }

  /**
   * Execute a serializable transaction (strictest isolation)
   * Use this for critical operations like financial transactions, inventory updates
   *
   * @example
   * await db.serializableTransaction(async ({ client }) => {
   *   // Generate unique deal number
   *   // Create deal
   *   // Update sequence
   * });
   */
  async serializableTransaction<T>(
    callback: (ctx: TransactionContext) => Promise<T>,
    options?: Omit<TransactionOptions, 'isolationLevel'>
  ): Promise<T> {
    return withSerializableTransaction(callback, options);
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.connectionPool.healthCheck();
      return result;
    } catch (error) {
      console.error('[DB Service] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection pool metrics
   */
  getPoolMetrics(): PoolMetrics {
    return this.connectionPool.getMetrics();
  }

  /**
   * Get recent query history for debugging
   */
  getQueryHistory(limit?: number): QueryMetrics[] {
    return this.connectionPool.getQueryHistory(limit);
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(): TransactionStats {
    return getTransactionManager().getStats();
  }

  /**
   * Get comprehensive database metrics
   */
  async getMetrics(): Promise<{
    pool: PoolMetrics;
    transactions: TransactionStats;
    health: boolean;
  }> {
    const health = await this.healthCheck();
    return {
      pool: this.getPoolMetrics(),
      transactions: this.getTransactionStats(),
      health,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[DB Service] Shutting down database service...');
    await shutdownConnectionPool();
    console.log('[DB Service] Database service shutdown complete');
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

/**
 * Get database service instance
 * This is the main export - use this throughout your application
 */
export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

/**
 * Convenience exports for common operations
 */

// Get Drizzle db instance
export const db = getDatabaseService().db;

// Get connection pool
export const pool = getDatabaseService().pool;

// Transaction helpers
export const transaction = <T,>(
  callback: (ctx: TransactionContext) => Promise<T>,
  options?: TransactionOptions
) => getDatabaseService().transaction(callback, options);

export const serializableTransaction = <T,>(
  callback: (ctx: TransactionContext) => Promise<T>,
  options?: Omit<TransactionOptions, 'isolationLevel'>
) => getDatabaseService().serializableTransaction(callback, options);

// Health check
export const healthCheck = () => getDatabaseService().healthCheck();

// Metrics
export const getMetrics = () => getDatabaseService().getMetrics();

// Shutdown
export const shutdownDatabase = () => getDatabaseService().shutdown();

// Export types
export type { PoolMetrics, QueryMetrics, TransactionStats, TransactionContext };
export { IsolationLevel };

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers() {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n[DB Service] Received ${signal}, shutting down gracefully...`);
      try {
        await shutdownDatabase();
        process.exit(0);
      } catch (error) {
        console.error('[DB Service] Error during shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[DB Service] Uncaught exception:', error);
    try {
      await shutdownDatabase();
    } catch (shutdownError) {
      console.error('[DB Service] Error during emergency shutdown:', shutdownError);
    }
    // DO NOT call process.exit() - let test framework/app handle it
    // In test environment, this allows tests to continue
    // In production, process manager (PM2/Docker) will restart
  });
}

// Setup handlers on module load
setupShutdownHandlers();
