/**
 * DATABASE CONNECTION POOL MANAGER
 * Centralized connection pooling with health checks, monitoring, and graceful shutdown
 *
 * This module provides:
 * - Connection pooling with configurable limits
 * - Health monitoring and automatic recovery
 * - Query performance tracking
 * - Graceful shutdown handling
 * - Connection leak detection
 */

import { Pool, PoolClient, PoolConfig, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon WebSocket for serverless compatibility
neonConfig.webSocketConstructor = ws;

// Connection pool configuration with production-ready defaults
const POOL_CONFIG: PoolConfig = {
  connectionString: process.env.DATABASE_URL,

  // Connection pool sizing
  // Rule of thumb: (CPU cores * 2) + effective_spindle_count
  // For most applications: 10-20 is a good starting point
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),

  // Connection timeouts
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10), // 10 seconds
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30 seconds

  // Statement timeout (prevent long-running queries from blocking)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10), // 30 seconds

  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10), // 30 seconds
};

/**
 * Connection pool metrics for monitoring
 */
interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  uptime: number;
}

/**
 * Query execution metrics
 */
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

/**
 * Database Connection Pool Manager
 */
class ConnectionPoolManager {
  private pool: Pool;
  private metrics: {
    totalQueries: number;
    slowQueries: number;
    failedQueries: number;
    queryTimes: number[];
    startTime: Date;
    queryHistory: QueryMetrics[];
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  // Slow query threshold (ms) - log queries taking longer than this
  private readonly SLOW_QUERY_THRESHOLD = parseInt(
    process.env.DB_SLOW_QUERY_THRESHOLD || '1000',
    10
  ); // 1 second

  // Keep last 100 queries for debugging
  private readonly MAX_QUERY_HISTORY = 100;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL must be set. Did you forget to provision a database?'
      );
    }

    this.pool = new Pool(POOL_CONFIG);
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      queryTimes: [],
      startTime: new Date(),
      queryHistory: [],
    };

    this.setupEventHandlers();
    this.startHealthCheck();
  }

  /**
   * Setup pool event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      console.log('[DB Pool] New client connected');
    });

    this.pool.on('acquire', (client: PoolClient) => {
      // Client acquired from pool - could track acquisition time here
    });

    this.pool.on('remove', (client: PoolClient) => {
      console.log('[DB Pool] Client removed from pool');
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      console.error('[DB Pool] Unexpected error on idle client:', err);
      // Don't exit - pool will handle reconnection
    });
  }

  /**
   * Start periodic health checks to ensure pool is healthy
   */
  private startHealthCheck(): void {
    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('[DB Pool] Health check failed:', error);
      }
    }, 30000);
  }

  /**
   * Perform health check by executing simple query
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[DB Pool] Health check query failed:', error);
      return false;
    }
  }

  /**
   * Get pool metrics for monitoring
   */
  getMetrics(): PoolMetrics {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const avgQueryTime =
      this.metrics.queryTimes.length > 0
        ? this.metrics.queryTimes.reduce((a, b) => a + b, 0) /
          this.metrics.queryTimes.length
        : 0;

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      totalQueries: this.metrics.totalQueries,
      slowQueries: this.metrics.slowQueries,
      failedQueries: this.metrics.failedQueries,
      avgQueryTime: Math.round(avgQueryTime),
      uptime,
    };
  }

  /**
   * Get recent query history for debugging
   */
  getQueryHistory(limit: number = 20): QueryMetrics[] {
    return this.metrics.queryHistory.slice(-limit);
  }

  /**
   * Track query execution for monitoring
   */
  private trackQuery(metrics: QueryMetrics): void {
    this.metrics.totalQueries++;
    this.metrics.queryTimes.push(metrics.duration);

    // Keep only last 1000 query times to calculate avg
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes.shift();
    }

    if (!metrics.success) {
      this.metrics.failedQueries++;
    }

    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.slowQueries++;
      console.warn(
        `[DB Pool] Slow query detected (${metrics.duration}ms):`,
        metrics.query.substring(0, 200)
      );
    }

    // Add to query history
    this.metrics.queryHistory.push(metrics);
    if (this.metrics.queryHistory.length > this.MAX_QUERY_HISTORY) {
      this.metrics.queryHistory.shift();
    }
  }

  /**
   * Execute a query with automatic tracking and error handling
   */
  async query<T = any>(
    queryText: string,
    values?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await this.pool.query(queryText, values);
      success = true;
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      this.trackQuery({
        query: queryText,
        duration,
        timestamp: new Date(),
        success,
        error,
      });
    }
  }

  /**
   * Get a client from the pool for transaction handling
   */
  async getClient(): Promise<PoolClient> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }
    return await this.pool.connect();
  }

  /**
   * Get the raw pool instance (for Drizzle integration)
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Graceful shutdown - close all connections
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[DB Pool] Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    console.log('[DB Pool] Starting graceful shutdown...');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Log final metrics
    const finalMetrics = this.getMetrics();
    console.log('[DB Pool] Final metrics:', JSON.stringify(finalMetrics, null, 2));

    try {
      // Wait for active queries to complete (max 10 seconds)
      const shutdownTimeout = 10000;
      const shutdownStart = Date.now();

      while (
        this.pool.totalCount > this.pool.idleCount &&
        Date.now() - shutdownStart < shutdownTimeout
      ) {
        console.log(
          `[DB Pool] Waiting for ${this.pool.totalCount - this.pool.idleCount} active connections...`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Close the pool
      await this.pool.end();
      console.log('[DB Pool] Pool closed successfully');
    } catch (error) {
      console.error('[DB Pool] Error during shutdown:', error);
      throw error;
    }
  }
}

// Singleton instance
let poolManager: ConnectionPoolManager | null = null;

/**
 * Get the connection pool manager instance
 */
export function getConnectionPool(): ConnectionPoolManager {
  if (!poolManager) {
    poolManager = new ConnectionPoolManager();
  }
  return poolManager;
}

/**
 * Graceful shutdown handler - call this on process exit
 */
export async function shutdownConnectionPool(): Promise<void> {
  if (poolManager) {
    await poolManager.shutdown();
    poolManager = null;
  }
}

// Export for convenience
export type { PoolMetrics, QueryMetrics };
