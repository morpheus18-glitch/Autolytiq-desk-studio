# Deal Storage Methods - Quick Reference

**Last Updated:** November 21, 2025

## Quick Import

```typescript
import { getStorageService } from '@/core/database/storage.service';

const storage = getStorageService();
const tenantId = req.user.dealershipId; // From authenticated request
```

---

## Deal Query Methods

### List Deals (Advanced Filtering)
```typescript
const { deals, total } = await storage.listDeals(
  {
    limit: 50,
    offset: 0,
    status: 'APPROVED',
    customerId: 'uuid',
    vehicleId: 'uuid',
    salesPersonId: 'uuid',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    sortBy: 'created_at',
    sortOrder: 'desc',
  },
  tenantId
);
```

### Get Deals by Customer
```typescript
const deals = await storage.getDealsByCustomer(customerId, tenantId);
```

### Get Deals by Vehicle
```typescript
const deals = await storage.getDealsByVehicle(vehicleId, tenantId);
```

### Get Deals by Salesperson
```typescript
// All deals
const deals = await storage.getDealsBySalesPerson(salesPersonId, tenantId);

// With date range
const deals = await storage.getDealsBySalesPerson(
  salesPersonId,
  tenantId,
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  }
);
```

### Get Deals by Status
```typescript
const approvedDeals = await storage.getDealsByStatus('APPROVED', tenantId);
const draftDeals = await storage.getDealsByStatus('DRAFT', tenantId);
```

### Update Deal Status
```typescript
const deal = await storage.updateDealStatus(dealId, 'APPROVED', tenantId);
```

### Delete Deal (Soft Delete)
```typescript
await storage.deleteDeal(dealId, tenantId);
```

---

## Deal Analytics Methods

### Get Deal Statistics
```typescript
// All time stats
const stats = await storage.getDealStats(tenantId);

// With date range
const stats = await storage.getDealStats(tenantId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Returns:
// {
//   total: 150,
//   pending: 45,
//   approved: 95,
//   completed: 95,
//   cancelled: 10,
//   totalRevenue: 3500000,
//   avgDealSize: 36842
// }
```

### Get Salesperson Performance
```typescript
// All time performance
const performance = await storage.getSalesPersonPerformance(
  salesPersonId,
  tenantId
);

// With date range
const performance = await storage.getSalesPersonPerformance(
  salesPersonId,
  tenantId,
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  }
);

// Returns:
// {
//   dealCount: 25,
//   totalSales: 875000,
//   avgDealSize: 35000,
//   conversionRate: 0.68
// }
```

---

## Trade-In Methods

### Get Trade-Ins for Deal
```typescript
const tradeIns = await storage.getTradeInsByDeal(dealId, tenantId);
```

### Create Trade-In
```typescript
const tradeIn = await storage.createTradeIn(
  {
    dealId: 'uuid',
    year: 2019,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX',
    mileage: 45000,
    vin: '1HGCV1F3XJA123456',
    condition: 'good',
    allowance: '18000.00',
    payoff: '12000.00',
    payoffTo: 'Honda Financial',
  },
  tenantId
);
```

### Update Trade-In
```typescript
const tradeIn = await storage.updateTradeIn(
  tradeInId,
  {
    allowance: '19000.00',
    condition: 'excellent',
  },
  tenantId
);
```

---

## Scenario Methods

### Get Deal Scenarios
```typescript
const scenarios = await storage.getDealScenarios(dealId, tenantId);
```

### Create Deal Scenario
```typescript
const scenario = await storage.createDealScenario(
  {
    dealId: 'uuid',
    vehicleId: 'uuid',
    scenarioType: 'FINANCE_DEAL',
    name: 'Finance - 72 months @ 4.99%',
    vehiclePrice: '35000.00',
    downPayment: '5000.00',
    apr: '0.0499',
    term: 72,
    // ... other scenario fields
  },
  tenantId
);
```

---

## Common Patterns

### Deal Pipeline Management
```typescript
// Get all deals by status for pipeline view
const pipeline = {
  draft: await storage.getDealsByStatus('DRAFT', tenantId),
  inProgress: await storage.getDealsByStatus('IN_PROGRESS', tenantId),
  approved: await storage.getDealsByStatus('APPROVED', tenantId),
};
```

### Customer Deal History
```typescript
// Get all deals for customer with scenarios
const deals = await storage.getDealsByCustomer(customerId, tenantId);
const dealsWithScenarios = await Promise.all(
  deals.map(async (deal) => ({
    ...deal,
    scenarios: await storage.getDealScenarios(deal.id, tenantId),
  }))
);
```

### Salesperson Leaderboard
```typescript
const salespeople = await storage.getUsers(tenantId);
const leaderboard = await Promise.all(
  salespeople
    .filter((user) => user.role === 'salesperson')
    .map(async (user) => ({
      ...user,
      performance: await storage.getSalesPersonPerformance(
        user.id,
        tenantId,
        {
          startDate: startOfMonth,
          endDate: endOfMonth,
        }
      ),
    }))
);

// Sort by total sales
leaderboard.sort((a, b) => b.performance.totalSales - a.performance.totalSales);
```

### Dashboard Statistics
```typescript
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const monthlyStats = await storage.getDealStats(tenantId, {
  startDate: startOfMonth,
  endDate: endOfMonth,
});

const yearToDateStats = await storage.getDealStats(tenantId, {
  startDate: new Date(today.getFullYear(), 0, 1),
  endDate: today,
});
```

---

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  const deal = await storage.updateDealStatus(dealId, 'APPROVED', tenantId);
} catch (error) {
  if (error.message.includes('not found or access denied')) {
    // Deal doesn't exist or wrong tenant
    res.status(404).json({ error: 'Deal not found' });
  } else {
    // Other error
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Performance Tips

### 1. Use Pagination
```typescript
// Good - paginated
const { deals, total } = await storage.listDeals(
  { limit: 50, offset: page * 50 },
  tenantId
);

// Avoid - fetching all deals
const allDeals = await storage.getDealsByStatus('APPROVED', tenantId);
```

### 2. Use Specific Queries
```typescript
// Good - specific query
const deals = await storage.getDealsByCustomer(customerId, tenantId);

// Avoid - filter in code
const allDeals = await storage.listDeals({}, tenantId);
const customerDeals = allDeals.deals.filter((d) => d.customerId === customerId);
```

### 3. Leverage Date Ranges
```typescript
// Good - database filters
const deals = await storage.getDealsBySalesPerson(salesPersonId, tenantId, {
  startDate: lastMonth,
  endDate: today,
});

// Avoid - filter in code
const allDeals = await storage.getDealsBySalesPerson(salesPersonId, tenantId);
const recentDeals = allDeals.filter((d) => d.createdAt >= lastMonth);
```

### 4. Use Analytics Methods
```typescript
// Good - single optimized query
const stats = await storage.getDealStats(tenantId);

// Avoid - multiple queries
const approved = await storage.getDealsByStatus('APPROVED', tenantId);
const cancelled = await storage.getDealsByStatus('CANCELLED', tenantId);
const total = approved.length + cancelled.length;
```

---

## Migration Examples

### Before (Direct DB Access)
```typescript
import { db } from '@/db';
import { deals, dealScenarios } from '@shared/schema';

// Multiple queries, no tenant enforcement
const customerDeals = await db
  .select()
  .from(deals)
  .where(eq(deals.customerId, customerId));

const dealsWithScenarios = await Promise.all(
  customerDeals.map(async (deal) => ({
    ...deal,
    scenarios: await db
      .select()
      .from(dealScenarios)
      .where(eq(dealScenarios.dealId, deal.id)),
  }))
);
```

### After (StorageService)
```typescript
import { getStorageService } from '@/core/database/storage.service';

const storage = getStorageService();
const tenantId = req.user.dealershipId;

// Single method, tenant-enforced, optimized
const customerDeals = await storage.getDealsByCustomer(customerId, tenantId);

const dealsWithScenarios = await Promise.all(
  customerDeals.map(async (deal) => ({
    ...deal,
    scenarios: await storage.getDealScenarios(deal.id, tenantId),
  }))
);
```

---

## Testing Examples

### Unit Test
```typescript
describe('StorageService - Deal Methods', () => {
  it('should filter deals by customer', async () => {
    const storage = getStorageService();
    const tenantId = 'test-tenant';

    const deals = await storage.getDealsByCustomer('customer-1', tenantId);

    expect(deals).toBeInstanceOf(Array);
    expect(deals.every((d) => d.customerId === 'customer-1')).toBe(true);
    expect(deals.every((d) => d.dealershipId === tenantId)).toBe(true);
  });
});
```

### Integration Test
```typescript
describe('Deal Pipeline', () => {
  it('should move deal through pipeline', async () => {
    const storage = getStorageService();
    const tenantId = 'test-tenant';

    // Create draft deal
    const deal = await storage.createDeal(
      { salespersonId: 'user-1', dealState: 'DRAFT' },
      tenantId
    );

    // Move to in progress
    await storage.updateDealStatus(deal.id, 'IN_PROGRESS', tenantId);
    const inProgressDeals = await storage.getDealsByStatus('IN_PROGRESS', tenantId);
    expect(inProgressDeals.find((d) => d.id === deal.id)).toBeDefined();

    // Approve
    await storage.updateDealStatus(deal.id, 'APPROVED', tenantId);
    const stats = await storage.getDealStats(tenantId);
    expect(stats.approved).toBeGreaterThan(0);
  });
});
```

---

## Reference Links

- **Full Documentation:** `/DEAL_STORAGE_METHODS_SUMMARY.md`
- **Interface Definition:** `/src/core/database/storage.interface.ts`
- **Implementation:** `/src/core/database/storage.service.ts`
- **Schema Types:** `/shared/schema.ts`

---

**Last Updated:** November 21, 2025
**Version:** 1.0.0
**Status:** Production Ready
