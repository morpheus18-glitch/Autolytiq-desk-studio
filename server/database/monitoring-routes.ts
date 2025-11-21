/**
 * DATABASE MONITORING ROUTES
 * Health checks, metrics, and monitoring endpoints for database operations
 *
 * Endpoints:
 * - GET /api/db/health - Quick health check
 * - GET /api/db/metrics - Comprehensive metrics
 * - GET /api/db/query-history - Recent query history
 * - GET /api/db/slow-queries - Slow query log
 */

import { Router, Request, Response } from 'express';
import { getDatabaseService } from './db-service';
import { getTransactionManager } from './transaction-manager';

const router = Router();

/**
 * Health check endpoint
 * Returns basic connectivity status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbService = getDatabaseService();
    const isHealthy = await dbService.healthCheck();

    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Comprehensive metrics endpoint
 * Requires admin authentication in production
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check in production
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }

    const dbService = getDatabaseService();
    const metrics = await dbService.getMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get metrics',
    });
  }
});

/**
 * Query history endpoint
 * Returns recent query execution history
 */
router.get('/query-history', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check in production
    const limit = parseInt(req.query.limit as string) || 20;
    const dbService = getDatabaseService();
    const history = dbService.getQueryHistory(Math.min(limit, 100));

    res.json({
      timestamp: new Date().toISOString(),
      queries: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get query history',
    });
  }
});

/**
 * Slow queries endpoint
 * Returns queries that exceeded threshold
 */
router.get('/slow-queries', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check in production
    const threshold = parseInt(req.query.threshold as string) || 1000;
    const dbService = getDatabaseService();
    const history = dbService.getQueryHistory(100);

    const slowQueries = history.filter((q) => q.duration > threshold);

    res.json({
      timestamp: new Date().toISOString(),
      threshold,
      queries: slowQueries,
      count: slowQueries.length,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get slow queries',
    });
  }
});

/**
 * Transaction stats endpoint
 */
router.get('/transaction-stats', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check in production
    const transactionManager = getTransactionManager();
    const stats = transactionManager.getStats();

    res.json({
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get transaction stats',
    });
  }
});

/**
 * Pool metrics endpoint
 */
router.get('/pool-metrics', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check in production
    const dbService = getDatabaseService();
    const poolMetrics = dbService.getPoolMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      ...poolMetrics,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get pool metrics',
    });
  }
});

/**
 * Execute test query (development only)
 */
router.get('/test', async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development' });
  }

  try {
    const dbService = getDatabaseService();
    const result = await dbService.query('SELECT NOW() as current_time, version() as version');

    res.json({
      timestamp: new Date().toISOString(),
      result: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Test query failed',
    });
  }
});

export default router;
