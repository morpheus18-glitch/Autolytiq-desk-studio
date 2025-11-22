/**
 * REPORTING MODULE - TYPE DEFINITIONS
 * Comprehensive types for analytics, dashboards, and reports
 */

import { z } from 'zod';

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Time period filter for reports
 */
export const PeriodSchema = z.enum(['today', 'week', 'month', 'quarter', 'year']);
export type Period = z.infer<typeof PeriodSchema>;

/**
 * Grouping granularity for time-series data
 */
export const GroupBySchema = z.enum(['day', 'week', 'month', 'quarter']);
export type GroupBy = z.infer<typeof GroupBySchema>;

/**
 * Common report query parameters
 */
export const ReportQuerySchema = z.object({
  period: PeriodSchema.default('month'),
  groupBy: GroupBySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type ReportQuery = z.infer<typeof ReportQuerySchema>;

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Key Performance Indicators (KPIs)
 */
export interface KPIMetric {
  value: number;
  change: number; // Percentage change from previous period
  trend: 'up' | 'down' | 'flat';
  sparklineData?: Array<{ value: number }>;
}

export interface DashboardKPIs {
  // Deal metrics
  totalDeals: KPIMetric;
  completedDeals: KPIMetric;
  conversionRate: KPIMetric;
  avgResponseTime: KPIMetric;

  // Revenue metrics
  totalRevenue: KPIMetric;
  totalProfit: KPIMetric;
  avgDealValue: KPIMetric;
  grossProfitMargin: KPIMetric;

  // Finance metrics
  financeRate: KPIMetric;
  leaseRate: KPIMetric;
  tradeInRate: KPIMetric;
  fiAttachmentRate: KPIMetric;
  avgFinanceAPR: KPIMetric;

  // Customer metrics
  avgCreditScore: KPIMetric;
  customerSatisfaction?: KPIMetric;
}

/**
 * Dashboard overview metrics
 */
export interface DashboardMetrics {
  sales: {
    total: number;
    count: number;
    avgDealSize: number;
    trend: number; // percentage change
  };
  inventory: {
    total: number;
    available: number;
    avgDaysOnLot: number;
    turnover: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    gross: number;
    net: number;
    margin: number;
  };
}

// ============================================================================
// SALES REPORTS
// ============================================================================

/**
 * Sales performance by salesperson
 */
export interface SalespersonPerformance {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  deals: number;
  revenue: number;
  profit: number;
  avgDealValue: number;
  avgProfit: number;
  conversionRate: number;
  avgResponseTime: number;
  customerSatisfaction?: number;
  fiAttachmentRate: number;
}

/**
 * Sales report data
 */
export interface SalesReport {
  period: string;
  totalSales: number;
  dealCount: number;
  avgDealSize: number;
  bySalesperson: SalespersonPerformance[];
  byVehicleType: {
    new: number;
    used: number;
    certified: number;
  };
  trends: Array<{
    date: string;
    sales: number;
    deals: number;
  }>;
}

/**
 * Revenue breakdown by category
 */
export interface RevenueBreakdown {
  date: string;
  revenue: number;
  profit: number;
  deals: number;
  newVehicles: number;
  usedVehicles: number;
  financeRevenue: number;
  cashRevenue: number;
}

// ============================================================================
// INVENTORY REPORTS
// ============================================================================

/**
 * Inventory item with metrics
 */
export interface InventoryItem {
  make: string;
  model: string;
  year?: number;
  count: number;
  avgDaysOnLot: number;
  turnoverRate: number;
  performance?: 'hot' | 'cold' | 'normal';
}

/**
 * Make/Model popularity
 */
export interface MakePopularity {
  make: string;
  count: number;
  models: Array<{
    model: string;
    count: number;
  }>;
}

/**
 * Inventory aging distribution
 */
export interface AgeDistribution {
  range: string;
  count: number;
  percentage: number;
}

/**
 * Inventory shortage projection
 */
export interface InventoryShortage {
  make: string;
  model: string;
  daysUntilShortage: number;
  currentStock: number;
  recommendedOrder: number;
}

/**
 * Comprehensive inventory metrics
 */
export interface InventoryMetrics {
  totalUnits: number;
  avgDaysOnLot: number;
  avgTurnoverRate: number;
  optimalInventoryLevel: number;
  currentUtilization: number; // Percentage
  hotInventory: InventoryItem[];
  coldInventory: InventoryItem[];
  makePopularity: MakePopularity[];
  ageDistribution: AgeDistribution[];
  projectedShortages?: InventoryShortage[];
}

// ============================================================================
// DEAL ANALYTICS
// ============================================================================

/**
 * Deal pipeline funnel
 */
export interface DealPipeline {
  leads: number;
  qualified: number;
  proposals: number;
  negotiations: number;
  closed: number;
}

/**
 * Payment range distribution
 */
export interface PaymentDistribution {
  range: string;
  count: number;
}

/**
 * Credit score distribution
 */
export interface CreditDistribution {
  range: string;
  count: number;
}

/**
 * Finance type breakdown
 */
export interface FinanceTypeBreakdown {
  cash: number;
  finance: number;
  lease: number;
}

/**
 * Vehicle type breakdown
 */
export interface VehicleTypeBreakdown {
  new: number;
  used: number;
  certified: number;
}

/**
 * Deal analytics data
 */
export interface DealAnalytics {
  pipeline: DealPipeline;
  paymentDistribution: PaymentDistribution[];
  vehicleTypes: VehicleTypeBreakdown;
  financeTypes: FinanceTypeBreakdown;
  creditDistribution: CreditDistribution[];
  avgDownPayment: number;
  avgTradeValue: number;
}

// ============================================================================
// CUSTOMER ANALYTICS
// ============================================================================

/**
 * Customer acquisition metrics
 */
export interface CustomerAcquisition {
  period: string;
  newCustomers: number;
  totalCustomers: number;
  growthRate: number;
  bySource: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
}

/**
 * Customer retention metrics
 */
export interface CustomerRetention {
  period: string;
  returningCustomers: number;
  totalCustomers: number;
  retentionRate: number;
  avgLifetimeValue: number;
  avgPurchaseFrequency: number;
}

// ============================================================================
// TEAM PERFORMANCE
// ============================================================================

/**
 * Team member activity metrics
 */
export interface TeamActivity {
  name: string;
  count: number;
}

/**
 * Team member goals vs actual
 */
export interface TeamGoals {
  name: string;
  dealsGoal: number;
  dealsActual: number;
  revenueGoal: number;
  revenueActual: number;
  profitGoal: number;
  profitActual: number;
}

/**
 * Team performance data
 */
export interface TeamPerformance {
  leaderboard: SalespersonPerformance[];
  activities: {
    calls: TeamActivity[];
    emails: TeamActivity[];
    appointments: TeamActivity[];
    testDrives: TeamActivity[];
  };
  goals: TeamGoals[];
  teamAvgResponseTime: number;
  teamAvgSatisfaction: number;
  topPerformer: SalespersonPerformance;
  mostImproved?: SalespersonPerformance;
}

// ============================================================================
// CONVERSION METRICS
// ============================================================================

/**
 * Conversion rate metrics
 */
export interface ConversionMetrics {
  leadToQualified: number;
  qualifiedToProposal: number;
  proposalToNegotiation: number;
  negotiationToClosed: number;
  overallConversion: number;
  avgTimeToClose: number; // Days
  bySource: Array<{
    source: string;
    conversionRate: number;
  }>;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Period,
  GroupBy,
  ReportQuery,
};
