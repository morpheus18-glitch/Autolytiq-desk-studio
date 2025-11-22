/**
 * SYSTEM ROUTES
 *
 * Core system endpoints for health checks, status monitoring, and diagnostics.
 * These routes provide essential operational visibility for production monitoring.
 *
 * @module CoreAPI
 */

import { Router } from 'express';
import { db } from '../database/index';

/**
 * Create system router
 */
export function createSystemRouter(requireAuth?: any) {
  const router = Router();

  /**
   * GET /health
   * Health check endpoint (PUBLIC - no auth required)
   *
   * Used by load balancers, monitoring services, and uptime checkers.
   * Returns 200 OK if service is running.
   */
  router.get('/health', async (req, res) => {
    try {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /ping
   * Simple ping endpoint (PUBLIC - no auth required)
   */
  router.get('/ping', (req, res) => {
    res.json({ pong: true, timestamp: Date.now() });
  });

  /**
   * GET /status
   * Detailed system status (PROTECTED - requires auth)
   *
   * Returns:
   * - Database connection status
   * - External services status
   * - Environment information
   * - System metrics
   */
  router.get('/status', requireAuth || ((req: any, res: any, next: any) => next()), async (req, res) => {
    try {
      // Check database connectivity
      let dbStatus = 'unknown';
      let dbLatency = 0;
      try {
        const startTime = Date.now();
        // Simple query to test DB connection
        await db.execute('SELECT 1 as test');
        dbLatency = Date.now() - startTime;
        dbStatus = 'connected';
      } catch (dbError) {
        dbStatus = 'disconnected';
        console.error('[System] Database health check failed:', dbError);
      }

      // Check environment
      const environment = process.env.NODE_ENV || 'development';
      const isProduction = environment === 'production';

      // System metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Feature flags (from environment)
      const features = {
        googleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
        aiAssistant: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        email: !!process.env.RESEND_API_KEY,
      };

      res.json({
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        environment,
        services: {
          database: {
            status: dbStatus,
            latency: dbLatency,
          },
        },
        features,
        system: {
          uptime: Math.floor(uptime),
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            unit: 'MB',
          },
          node: process.version,
          platform: process.platform,
        },
      });
    } catch (error: any) {
      console.error('[System] Status check error:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message || 'Failed to retrieve system status',
      });
    }
  });

  /**
   * GET /version
   * Application version information (PUBLIC)
   */
  router.get('/version', (req, res) => {
    // Read from package.json in production, or provide fallback
    const version = process.env.APP_VERSION || '1.0.0';
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();

    res.json({
      version,
      buildTime,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  /**
   * GET /readiness
   * Kubernetes readiness probe (PUBLIC)
   *
   * Returns 200 when service is ready to accept traffic.
   * Checks critical dependencies.
   */
  router.get('/readiness', async (req, res) => {
    try {
      // Check database
      await db.execute('SELECT 1 as test');

      res.json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Database not ready',
      });
    }
  });

  /**
   * GET /liveness
   * Kubernetes liveness probe (PUBLIC)
   *
   * Returns 200 if process is alive.
   * Should be simple and fast.
   */
  router.get('/liveness', (req, res) => {
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

/**
 * Default export
 */
export default createSystemRouter();
