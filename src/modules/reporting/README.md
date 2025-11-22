# Reporting Module

## Overview

The Reporting Module provides comprehensive analytics and dashboard endpoints for dealership performance tracking. It consolidates all reporting, analytics, and metrics endpoints in one modular, maintainable location.

## Features

- **Dashboard KPIs**: Key performance indicators with trend analysis
- **Sales Reports**: Revenue trends, salesperson performance, vehicle type breakdowns
- **Inventory Analytics**: Aging reports, turnover metrics, hot/cold inventory tracking
- **Deal Analytics**: Pipeline funnel, conversion rates, payment distributions
- **Customer Analytics**: Acquisition and retention metrics
- **Team Performance**: Leaderboards, goals tracking, activity metrics

## Architecture

```
/src/modules/reporting/
├── api/
│   └── reporting.routes.ts    # Express routes (20 endpoints)
├── services/
│   └── reporting.service.ts   # Business logic
├── types/
│   └── reporting.types.ts     # TypeScript type definitions
├── index.ts                   # Public API
└── README.md                  # This file
```

## Installation

```typescript
// In your main routes.ts or app.ts
import { createReportingRouter } from './modules/reporting';
import { StorageService } from './core/database/storage.service';
import { requireAuth } from './auth';

const storage = new StorageService();
const reportingRouter = createReportingRouter(storage, requireAuth);

app.use('/api/analytics', reportingRouter);
```

## API Endpoints

### Dashboard Endpoints

#### GET /api/analytics/kpis
Get Key Performance Indicators with sparkline data.

**Query Parameters:**
- `period`: `'today' | 'week' | 'month' | 'quarter' | 'year'` (default: `'month'`)

**Response:**
```typescript
{
  totalDeals: { value: 45, change: 12.5, trend: 'up' },
  totalRevenue: { value: 1250000, change: 8.3, trend: 'up' },
  conversionRate: { value: 32.5, change: -2.1, trend: 'down' },
  // ... more KPIs
}
```

**Cache:** 5 minutes

---

#### GET /api/analytics/dashboard
Get dashboard overview metrics.

**Query Parameters:**
- `period`: `'today' | 'week' | 'month' | 'quarter' | 'year'`

**Response:**
```typescript
{
  sales: { total: 1250000, count: 45, avgDealSize: 27777, trend: 8.3 },
  inventory: { total: 120, available: 98, avgDaysOnLot: 32, turnover: 2.4 },
  customers: { total: 2500, new: 150, returning: 45, conversionRate: 32.5 },
  revenue: { total: 1250000, gross: 450000, net: 380000, margin: 36 }
}
```

**Cache:** 5 minutes

---

### Sales Endpoints

#### GET /api/analytics/sales/summary
Get comprehensive sales summary report.

**Query Parameters:**
- `period`: `'today' | 'week' | 'month' | 'quarter' | 'year'`

**Response:**
```typescript
{
  period: 'month',
  totalSales: 1250000,
  dealCount: 45,
  avgDealSize: 27777,
  bySalesperson: [
    {
      id: 'user-1',
      name: 'John Smith',
      deals: 12,
      revenue: 340000,
      avgDealValue: 28333,
      conversionRate: 35.2
    }
  ],
  byVehicleType: { new: 28, used: 15, certified: 2 },
  trends: [
    { date: '2025-01-01', sales: 42000, deals: 2 }
  ]
}
```

---

#### GET /api/analytics/sales/trends
Get sales trends over time with grouping.

**Query Parameters:**
- `period`: `'week' | 'month' | 'quarter' | 'year'`
- `groupBy`: `'day' | 'week' | 'month' | 'quarter'`

---

#### GET /api/analytics/sales/by-salesperson
Get sales performance by salesperson.

**Query Parameters:**
- `period`: Period filter

**Response:**
```typescript
{
  period: 'month',
  bySalesperson: [
    {
      id: 'user-1',
      name: 'John Smith',
      role: 'Sales Manager',
      deals: 12,
      revenue: 340000,
      profit: 85000,
      avgDealValue: 28333,
      avgProfit: 7083,
      conversionRate: 35.2,
      avgResponseTime: 45,
      fiAttachmentRate: 78.5
    }
  ]
}
```

---

### Revenue Endpoints

#### GET /api/analytics/revenue
Get revenue breakdown by period with grouping.

**Query Parameters:**
- `period`: `'week' | 'month' | 'quarter' | 'year'`
- `groupBy`: `'day' | 'week' | 'month'`

**Response:**
```typescript
[
  {
    date: '2025-01-01',
    revenue: 42000,
    profit: 10500,
    deals: 2,
    newVehicles: 1,
    usedVehicles: 1,
    financeRevenue: 35000,
    cashRevenue: 7000
  }
]
```

---

#### GET /api/analytics/revenue/summary
Get revenue summary for period.

---

#### GET /api/analytics/revenue/breakdown
Get revenue breakdown by category.

---

### Deal Analytics Endpoints

#### GET /api/analytics/deals
Get comprehensive deal analytics.

**Query Parameters:**
- `period`: Period filter

**Response:**
```typescript
{
  pipeline: {
    leads: 150,
    qualified: 100,
    proposals: 75,
    negotiations: 50,
    closed: 45
  },
  paymentDistribution: [
    { range: '< $300', count: 5 },
    { range: '$300-$500', count: 15 }
  ],
  vehicleTypes: { new: 28, used: 15, certified: 2 },
  financeTypes: { cash: 10, finance: 30, lease: 5 },
  creditDistribution: [
    { range: '< 600', count: 8 },
    { range: '600-650', count: 12 }
  ],
  avgDownPayment: 4500,
  avgTradeValue: 8200
}
```

---

#### GET /api/analytics/deals/pipeline
Get deal pipeline funnel status.

**Response:**
```typescript
{
  period: 'month',
  pipeline: {
    leads: 150,
    qualified: 100,
    proposals: 75,
    negotiations: 50,
    closed: 45
  }
}
```

---

#### GET /api/analytics/deals/conversion
Get conversion rate metrics.

**Response:**
```typescript
{
  leadToQualified: 66.7,
  qualifiedToProposal: 75.0,
  proposalToNegotiation: 66.7,
  negotiationToClosed: 90.0,
  overallConversion: 30.0,
  avgTimeToClose: 14.5,
  bySource: [
    { source: 'website', conversionRate: 35.2 },
    { source: 'walk-in', conversionRate: 28.5 }
  ]
}
```

---

### Inventory Endpoints

#### GET /api/analytics/inventory
Get comprehensive inventory metrics.

**Response:**
```typescript
{
  totalUnits: 120,
  avgDaysOnLot: 32,
  avgTurnoverRate: 2.4,
  optimalInventoryLevel: 132,
  currentUtilization: 90.9,
  hotInventory: [
    { make: 'Toyota', model: 'Camry', count: 5, avgDaysOnLot: 12, turnoverRate: 4.2 }
  ],
  coldInventory: [
    { make: 'Buick', model: 'Encore', count: 2, avgDaysOnLot: 85, turnoverRate: 0.8 }
  ],
  makePopularity: [
    { make: 'Toyota', count: 25, models: [...] }
  ],
  ageDistribution: [
    { range: '0-30 days', count: 42, percentage: 35 }
  ]
}
```

**Cache:** 10 minutes

---

#### GET /api/analytics/inventory/aging
Get vehicle aging report.

**Response:**
```typescript
{
  ageRanges: [
    { range: '0-30 days', count: 42, percentage: 35 },
    { range: '31-60 days', count: 36, percentage: 30 }
  ],
  avgAge: 32,
  oldestVehicle: { /* vehicle details */ }
}
```

---

#### GET /api/analytics/inventory/turnover
Get inventory turnover metrics.

**Response:**
```typescript
{
  overallTurnover: 2.4,
  byMake: [...],
  byModel: [...],
  byYear: [...],
  projectedShortages: [
    {
      make: 'Toyota',
      model: 'Camry',
      daysUntilShortage: 5,
      currentStock: 2,
      recommendedOrder: 8
    }
  ]
}
```

---

### Customer Analytics Endpoints

#### GET /api/analytics/customers/acquisition
Get customer acquisition metrics.

**Response:**
```typescript
{
  period: 'month',
  newCustomers: 150,
  totalCustomers: 2500,
  growthRate: 6.4,
  bySource: [
    { source: 'website', count: 75, conversionRate: 32.5 },
    { source: 'referral', count: 45, conversionRate: 58.2 }
  ]
}
```

---

#### GET /api/analytics/customers/retention
Get customer retention metrics.

**Response:**
```typescript
{
  period: 'month',
  returningCustomers: 45,
  totalCustomers: 2500,
  retentionRate: 72.5,
  avgLifetimeValue: 85000,
  avgPurchaseFrequency: 1.8
}
```

---

### Team Performance Endpoints

#### GET /api/analytics/team
Get comprehensive team performance data.

**Query Parameters:**
- `period`: Period filter

**Response:**
```typescript
{
  leaderboard: [/* SalespersonPerformance[] */],
  activities: {
    calls: [{ name: 'John Smith', count: 125 }],
    emails: [{ name: 'John Smith', count: 85 }],
    appointments: [{ name: 'John Smith', count: 32 }],
    testDrives: [{ name: 'John Smith', count: 18 }]
  },
  goals: [
    {
      name: 'John Smith',
      dealsGoal: 20,
      dealsActual: 12,
      revenueGoal: 500000,
      revenueActual: 340000,
      profitGoal: 40000,
      profitActual: 85000
    }
  ],
  teamAvgResponseTime: 45,
  teamAvgSatisfaction: 4.5,
  topPerformer: {/* SalespersonPerformance */}
}
```

---

#### GET /api/analytics/team/comparison
Get salesperson performance comparison.

**Response:**
```typescript
{
  comparison: [...],
  rankings: {
    byRevenue: [...],
    byDeals: [...],
    byConversion: [...],
    byCustomerSatisfaction: [...]
  }
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { ReportingService } from './modules/reporting';

const reportingService = new ReportingService();

// Get dashboard KPIs
const kpis = await reportingService.getDashboardKPIs('dealership-123', 'month');

// Get sales report
const salesReport = await reportingService.getSalesReport('dealership-123', 'quarter', 'month');

// Get inventory metrics
const inventory = await reportingService.getInventoryMetrics('dealership-123');
```

### In Express Routes

```typescript
import express from 'express';
import { createReportingRouter } from './modules/reporting';

const app = express();
const reportingRouter = createReportingRouter(storage, requireAuth);

app.use('/api/analytics', reportingRouter);
```

## Multi-Tenant Security

All endpoints enforce multi-tenant isolation:

1. **Authentication Required**: All routes protected by `requireAuth` middleware
2. **Dealership Isolation**: All queries filtered by `dealershipId` from authenticated user
3. **No Cross-Tenant Data**: Users can only access their dealership's analytics

## Caching Strategy

- **Dashboard & KPIs**: 5 minutes (300s)
- **Inventory Metrics**: 10 minutes (600s)
- **Sales/Revenue Reports**: 5 minutes (300s)
- **Team Performance**: 5 minutes (300s)

Caching is implemented via HTTP `Cache-Control` headers.

## Error Handling

All endpoints return consistent error responses:

```typescript
{
  error: "Error message",
  details?: { /* Additional error context */ }
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Invalid query parameters (Zod validation error)
- `401`: Unauthorized (missing/invalid auth)
- `500`: Server error

## Migration Notes

This module consolidates the following routes from `/server/routes.ts`:

- `GET /api/analytics/kpis` (line 2666)
- `GET /api/analytics/revenue` (line 2811)
- `GET /api/analytics/deals` (line 2898)
- `GET /api/analytics/inventory` (line 3000)
- `GET /api/analytics/team` (line 3072)

Total: **5 base endpoints migrated** → **20 comprehensive endpoints created**

## Future Enhancements

1. **Real-time Updates**: WebSocket support for live dashboard updates
2. **Export Capabilities**: PDF/Excel export for reports
3. **Custom Reports**: User-defined report builder
4. **Forecasting**: Predictive analytics for sales and inventory
5. **Benchmarking**: Industry comparison metrics
6. **Alerts**: Automated notifications for KPI thresholds

## Dependencies

- `express`: Web framework
- `zod`: Runtime validation
- `StorageService`: Database access layer

## Testing

```bash
# Unit tests
npm test src/modules/reporting/services/reporting.service.test.ts

# Integration tests
npm test src/modules/reporting/api/reporting.routes.test.ts

# E2E tests
npm test e2e/reporting.test.ts
```

## Support

For issues or questions about the Reporting Module, contact the development team or create an issue in the project repository.
