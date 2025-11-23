/**
 * TRANSACTION MANAGER
 * Provides transaction management with automatic rollback, retry logic, and error handling
 *
 * This module handles:
 * - ACID transaction guarantees
 * - Automatic rollback on errors
 * - Retry logic for transient failures
 * - Savepoints for nested transactions
 * - Transaction isolation levels
 * - Deadlock detection and recovery
 */

import { PoolClient } from '@neondatabase/serverless';
import { getConnectionPool } from './connection-pool';

/**
 * Transaction isolation levels
 * READ COMMITTED - Default, good for most use cases
 * REPEATABLE READ - Prevents non-repeatable reads
 * SERIALIZABLE - Strictest isolation, prevents phantom reads
 */
export enum IsolationLevel {
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number; // Transaction timeout in milliseconds
}

/**
 * Transaction context passed to transaction callback
 */
export interface TransactionContext {
  client: PoolClient;
  savepoint: (name: string) => Promise<void>;
  releaseSavepoint: (name: string) => Promise<void>;
  rollbackToSavepoint: (name: string) => Promise<void>;
}

/**
 * Transaction statistics
 */
interface TransactionStats {
  totalTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  retriedTransactions: number;
  failedTransactions: number;
  deadlockRetries: number;
  avgDuration: number;
}

/**
 * Transient errors that should trigger retry
 */
const TRANSIENT_ERROR_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '08006', // connection_failure
  '08000', // connection_exception
  '57P03', // cannot_connect_now
]);

/**
 * Transaction Manager
 */
class TransactionManager {
  private stats: TransactionStats = {
    totalTransactions: 0,
    committedTransactions: 0,
    rolledBackTransactions: 0,
    retriedTransactions: 0,
    failedTransactions: 0,
    deadlockRetries: 0,
    avgDuration: 0,
  };

  private durations: number[] = [];

  /**
   * Check if error is transient and should be retried
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const pgError = error as Error & { code?: string };
    // PostgreSQL error code is in error.code
    if (pgError.code && TRANSIENT_ERROR_CODES.has(pgError.code)) {
      return true;
    }

    // Check for specific error messages
    const message = pgError.message?.toLowerCase() || '';
    if (
      message.includes('deadlock') ||
      message.includes('could not serialize') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Execute a function within a database transaction
   * Automatically handles commit/rollback and retries
   */
  async executeTransaction<T>(
    callback: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      isolationLevel = IsolationLevel.READ_COMMITTED,
      maxRetries = 3,
      retryDelay = 100,
      timeout = 30000, // 30 seconds default
    } = options;

    const connectionPool = getConnectionPool();
    let lastError: unknown;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const client = await connectionPool.getClient();
      const startTime = Date.now();

      try {
        // Start transaction with specified isolation level
        await client.query('BEGIN');
        if (isolationLevel !== IsolationLevel.READ_COMMITTED) {
          await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        }

        // Set statement timeout for this transaction
        await client.query(`SET LOCAL statement_timeout = ${timeout}`);

        // Create transaction context with savepoint support
        const ctx: TransactionContext = {
          client,
          savepoint: async (name: string) => {
            await client.query(`SAVEPOINT ${name}`);
          },
          releaseSavepoint: async (name: string) => {
            await client.query(`RELEASE SAVEPOINT ${name}`);
          },
          rollbackToSavepoint: async (name: string) => {
            await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
          },
        };

        // Execute callback
        const result = await callback(ctx);

        // Commit transaction
        await client.query('COMMIT');

        // Track success metrics
        const duration = Date.now() - startTime;
        this.trackSuccess(duration, attempt);

        return result;
      } catch (error: unknown) {
        // Rollback transaction
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[Transaction] Rollback failed:', rollbackError);
        }

        lastError = error;

        // Check if this is a transient error that should be retried
        if (this.isTransientError(error) && attempt < maxRetries) {
          attempt++;
          this.stats.retriedTransactions++;

          if (error.code === '40P01') {
            this.stats.deadlockRetries++;
          }

          console.warn(
            `[Transaction] Transient error detected, retrying (attempt ${attempt}/${maxRetries}):`,
            error.message
          );

          // Exponential backoff for retries
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));

          continue;
        }

        // Non-transient error or max retries exceeded
        this.trackFailure();
        throw error;
      } finally {
        // Always release client back to pool
        client.release();
      }
    }

    // Should never reach here, but TypeScript needs it
    this.trackFailure();
    throw lastError || new Error('Transaction failed after maximum retries');
  }

  /**
   * Track successful transaction
   */
  private trackSuccess(duration: number, retries: number): void {
    this.stats.totalTransactions++;
    this.stats.committedTransactions++;

    // Track duration for avg calculation
    this.durations.push(duration);
    if (this.durations.length > 1000) {
      this.durations.shift();
    }

    this.stats.avgDuration =
      this.durations.reduce((a, b) => a + b, 0) / this.durations.length;
  }

  /**
   * Track failed transaction
   */
  private trackFailure(): void {
    this.stats.totalTransactions++;
    this.stats.failedTransactions++;
    this.stats.rolledBackTransactions++;
  }

  /**
   * Get transaction statistics
   */
  getStats(): TransactionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = {
      totalTransactions: 0,
      committedTransactions: 0,
      rolledBackTransactions: 0,
      retriedTransactions: 0,
      failedTransactions: 0,
      deadlockRetries: 0,
      avgDuration: 0,
    };
    this.durations = [];
  }
}

// Singleton instance
let transactionManager: TransactionManager | null = null;

/**
 * Get transaction manager instance
 */
export function getTransactionManager(): TransactionManager {
  if (!transactionManager) {
    transactionManager = new TransactionManager();
  }
  return transactionManager;
}

/**
 * Execute a transaction (convenience function)
 */
export async function withTransaction<T>(
  callback: (ctx: TransactionContext) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const manager = getTransactionManager();
  return manager.executeTransaction(callback, options);
}

/**
 * Execute a serializable transaction (for critical operations)
 */
export async function withSerializableTransaction<T>(
  callback: (ctx: TransactionContext) => Promise<T>,
  options?: Omit<TransactionOptions, 'isolationLevel'>
): Promise<T> {
  return withTransaction(callback, {
    ...options,
    isolationLevel: IsolationLevel.SERIALIZABLE,
  });
}

// Export types
export type { TransactionStats };
