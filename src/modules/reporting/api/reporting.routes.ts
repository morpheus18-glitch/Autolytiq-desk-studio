/**
 * REPORTING MODULE - API ROUTES
 * Analytics and dashboard endpoints
 *
 * This module consolidates all reporting/analytics routes:
 * - Dashboard KPIs and metrics
 * - Sales reports and trends
 * - Inventory analytics
 * - Team performance tracking
 * - Customer analytics
 * - Deal pipeline analysis
 * - Revenue breakdowns
 *
 * All endpoints are multi-tenant enforced via middleware
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ReportingService } from '../services/reporting.service';
import { StorageService } from '../../../core/database/storage.service';
import {
  PeriodSchema,
  GroupBySchema,
  type Period,
  type GroupBy,
} from '../types/reporting.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Extended Request type with user information
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    dealershipId: string;
    role: string;
    email: string;
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const queryPeriodSchema = z.object({
  period: PeriodSchema.default('month'),
});

const queryPeriodGroupSchema = z.object({
  period: PeriodSchema.default('month'),
  groupBy: GroupBySchema.default('day'),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// ============================================================================
// ROUTER FACTORY
// ============================================================================

/**
 * Create reporting router with dependency injection
 *
 * @param storage StorageService instance (will be injected from main routes)
 * @param requireAuth Authentication middleware
 * @param requireRole Role-based access control middleware
 */
export function createReportingRouter(
  storage: StorageService,
  requireAuth: (req: Request, res: Response, next: Function) => void,
  requireRole?: (role: string) => (req: Request, res: Response, next: Function) => void
): Router {
  const router = Router();
  const reportingService = new ReportingService(storage);

  // Helper to get dealership ID from authenticated request
  const getDealershipId = (req: AuthenticatedRequest): string => {
    if (!req.user?.dealershipId) {
      throw new Error('Dealership ID not found in authenticated request');
    }
    return req.user.dealershipId;
  };

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  /**
   * GET /api/analytics/kpis
   * Get Key Performance Indicators for dashboard
   *
   * Query params:
   *   - period: 'today' | 'week' | 'month' | 'quarter' | 'year' (default: 'month')
   *
   * Response: Dashboard KPIs with sparkline data
   */
  router.get('/kpis', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const kpis = await reportingService.getDashboardKPIs(dealershipId, period);

      // Cache for 5 minutes (analytics data doesn't need real-time updates)
      res.set('Cache-Control', 'public, max-age=300');
      res.json(kpis);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: err });
      }
      console.error('[ReportingRoutes] GET /kpis error:', err);
      res.status(500).json({ error: err.message || 'Failed to get KPIs' });
    }
  });

  /**
   * GET /api/analytics/dashboard
   * Get dashboard overview metrics
   *
   * Query params:
   *   - period: 'today' | 'week' | 'month' | 'quarter' | 'year' (default: 'month')
   */
  router.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const metrics = await reportingService.getDashboardMetrics(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /dashboard error:', err);
      res.status(500).json({ error: err.message || 'Failed to get dashboard metrics' });
    }
  });

  // ============================================================================
  // SALES REPORTS
  // ============================================================================

  /**
   * GET /api/analytics/sales/summary
   * Get sales summary report
   *
   * Query params:
   *   - period: 'today' | 'week' | 'month' | 'quarter' | 'year' (default: 'month')
   */
  router.get('/sales/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const report = await reportingService.getSalesReport(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(report);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /sales/summary error:', err);
      res.status(500).json({ error: err.message || 'Failed to get sales report' });
    }
  });

  /**
   * GET /api/analytics/sales/trends
   * Get sales trends over time
   *
   * Query params:
   *   - period: 'today' | 'week' | 'month' | 'quarter' | 'year'
   *   - groupBy: 'day' | 'week' | 'month' | 'quarter'
   */
  router.get('/sales/trends', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period, groupBy } = queryPeriodGroupSchema.parse(req.query);

      const trends = await reportingService.getSalesReport(dealershipId, period, groupBy);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(trends.trends);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /sales/trends error:', err);
      res.status(500).json({ error: err.message || 'Failed to get sales trends' });
    }
  });

  /**
   * GET /api/analytics/sales/by-salesperson
   * Get sales performance by salesperson
   */
  router.get('/sales/by-salesperson', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const report = await reportingService.getSalesReport(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        period,
        bySalesperson: report.bySalesperson,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /sales/by-salesperson error:', err);
      res.status(500).json({ error: err.message || 'Failed to get salesperson performance' });
    }
  });

  // ============================================================================
  // REVENUE ANALYTICS
  // ============================================================================

  /**
   * GET /api/analytics/revenue
   * Get revenue breakdown by period
   *
   * Query params:
   *   - period: 'week' | 'month' | 'quarter' | 'year'
   *   - groupBy: 'day' | 'week' | 'month'
   */
  router.get('/revenue', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period, groupBy } = queryPeriodGroupSchema.parse(req.query);

      const breakdown = await reportingService.getRevenueBreakdown(dealershipId, period, groupBy);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(breakdown);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /revenue error:', err);
      res.status(500).json({ error: err.message || 'Failed to get revenue data' });
    }
  });

  /**
   * GET /api/analytics/revenue/summary
   * Get revenue summary
   */
  router.get('/revenue/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const metrics = await reportingService.getDashboardMetrics(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        period,
        revenue: metrics.revenue,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /revenue/summary error:', err);
      res.status(500).json({ error: err.message || 'Failed to get revenue summary' });
    }
  });

  /**
   * GET /api/analytics/revenue/breakdown
   * Get revenue breakdown by category
   */
  router.get('/revenue/breakdown', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const breakdown = await reportingService.getRevenueBreakdown(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(breakdown);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /revenue/breakdown error:', err);
      res.status(500).json({ error: err.message || 'Failed to get revenue breakdown' });
    }
  });

  // ============================================================================
  // DEAL ANALYTICS
  // ============================================================================

  /**
   * GET /api/analytics/deals
   * Get deal analytics (pipeline, distributions)
   *
   * Query params:
   *   - period: 'week' | 'month' | 'quarter' | 'year'
   */
  router.get('/deals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const analytics = await reportingService.getDealAnalytics(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(analytics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /deals error:', err);
      res.status(500).json({ error: err.message || 'Failed to get deal analytics' });
    }
  });

  /**
   * GET /api/analytics/deals/pipeline
   * Get deal pipeline status
   */
  router.get('/deals/pipeline', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const analytics = await reportingService.getDealAnalytics(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        period,
        pipeline: analytics.pipeline,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /deals/pipeline error:', err);
      res.status(500).json({ error: err.message || 'Failed to get deal pipeline' });
    }
  });

  /**
   * GET /api/analytics/deals/conversion
   * Get conversion rates
   */
  router.get('/deals/conversion', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const metrics = await reportingService.getConversionMetrics(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /deals/conversion error:', err);
      res.status(500).json({ error: err.message || 'Failed to get conversion metrics' });
    }
  });

  // ============================================================================
  // INVENTORY REPORTS
  // ============================================================================

  /**
   * GET /api/analytics/inventory
   * Get inventory metrics
   */
  router.get('/inventory', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);

      const metrics = await reportingService.getInventoryMetrics(dealershipId);

      res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /inventory error:', err);
      res.status(500).json({ error: err.message || 'Failed to get inventory metrics' });
    }
  });

  /**
   * GET /api/analytics/inventory/aging
   * Get vehicle aging report
   */
  router.get('/inventory/aging', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);

      const report = await reportingService.getInventoryAging(dealershipId);

      res.set('Cache-Control', 'public, max-age=600');
      res.json(report);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /inventory/aging error:', err);
      res.status(500).json({ error: err.message || 'Failed to get inventory aging report' });
    }
  });

  /**
   * GET /api/analytics/inventory/turnover
   * Get inventory turnover metrics
   */
  router.get('/inventory/turnover', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);

      const metrics = await reportingService.getInventoryTurnover(dealershipId);

      res.set('Cache-Control', 'public, max-age=600');
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /inventory/turnover error:', err);
      res.status(500).json({ error: err.message || 'Failed to get inventory turnover' });
    }
  });

  // ============================================================================
  // CUSTOMER ANALYTICS
  // ============================================================================

  /**
   * GET /api/analytics/customers/acquisition
   * Get customer acquisition metrics
   */
  router.get('/customers/acquisition', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const metrics = await reportingService.getCustomerAcquisition(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /customers/acquisition error:', err);
      res.status(500).json({ error: err.message || 'Failed to get customer acquisition metrics' });
    }
  });

  /**
   * GET /api/analytics/customers/retention
   * Get customer retention metrics
   */
  router.get('/customers/retention', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const metrics = await reportingService.getCustomerRetention(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(metrics);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /customers/retention error:', err);
      res.status(500).json({ error: err.message || 'Failed to get customer retention metrics' });
    }
  });

  // ============================================================================
  // TEAM PERFORMANCE
  // ============================================================================

  /**
   * GET /api/analytics/team
   * Get team performance data
   *
   * Query params:
   *   - period: 'week' | 'month' | 'quarter' | 'year'
   */
  router.get('/team', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const performance = await reportingService.getTeamPerformance(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(performance);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /team error:', err);
      res.status(500).json({ error: err.message || 'Failed to get team performance data' });
    }
  });

  /**
   * GET /api/analytics/team/comparison
   * Get salesperson performance comparison
   */
  router.get('/team/comparison', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = getDealershipId(req);
      const { period } = queryPeriodSchema.parse(req.query);

      const comparison = await reportingService.getSalespersonComparison(dealershipId, period);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(comparison);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[ReportingRoutes] GET /team/comparison error:', err);
      res.status(500).json({ error: err.message || 'Failed to get salesperson comparison' });
    }
  });

  return router;
}

/**
 * Default export for convenience
 * Note: This requires storage, requireAuth to be provided
 */
export default createReportingRouter;
