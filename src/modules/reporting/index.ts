/**
 * REPORTING MODULE - PUBLIC API
 *
 * Export all public interfaces for the reporting module
 */

// API Routes
export { createReportingRouter } from './api/reporting.routes';
export { default as reportingRoutes } from './api/reporting.routes';

// Services
export { ReportingService } from './services/reporting.service';

// Types
export type {
  DashboardKPIs,
  DashboardMetrics,
  SalesReport,
  InventoryMetrics,
  DealAnalytics,
  TeamPerformance,
  RevenueBreakdown,
  CustomerAcquisition,
  CustomerRetention,
  ConversionMetrics,
  Period,
  GroupBy,
  SalespersonPerformance,
  KPIMetric,
  InventoryItem,
  MakePopularity,
  AgeDistribution,
  DealPipeline,
  PaymentDistribution,
  CreditDistribution,
  FinanceTypeBreakdown,
  VehicleTypeBreakdown,
  TeamActivity,
  TeamGoals,
} from './types/reporting.types';

export {
  PeriodSchema,
  GroupBySchema,
  ReportQuerySchema,
} from './types/reporting.types';
