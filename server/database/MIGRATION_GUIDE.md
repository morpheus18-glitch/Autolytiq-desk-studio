# Database Layer Migration Guide

This guide helps you migrate existing code to use the new database infrastructure.

## Quick Start

### 1. Update Imports

**Before**:
```typescript
import { db, pool } from './db';
```

**After**:
```typescript
import { db, pool } from './database';
// or more specific:
import { db, transaction, createDeal } from './database';
```

### 2. Replace Direct Database Operations with Transactions

**Before** (NON-ATOMIC):
```typescript
// storage.ts - createDeal method
async createDeal(insertDeal: InsertDeal, dealershipId: string): Promise<Deal> {
  const [deal] = await db.insert(deals)
    .values({ ...insertDeal, dealershipId })
    .returning();

  // Separate operation - if this fails, deal is orphaned!
  await this.createScenario({
    dealId: deal.id,
    name: 'Scenario 1',
    // ... scenario data
  });

  return deal;
}
```

**After** (ATOMIC):
```typescript
import { createDeal } from './database';

async createDeal(input: CreateDealInput): Promise<CreateDealResult> {
  // All operations in transaction - all succeed or all fail
  return createDeal({
    dealershipId: input.dealershipId,
    salespersonId: input.salespersonId,
    customerId: input.customerId,
    vehicleId: input.vehicleId,
    customerData: input.customerData,
    scenarioData: input.scenarioData,
  });
}
```

### 3. Use Transactions for Multi-Step Operations

**Before** (RACE CONDITIONS):
```typescript
// attachCustomerToDeal method
async attachCustomerToDeal(dealId: string, customerId: string): Promise<Deal> {
  const customer = await this.getCustomer(customerId);
  const deal = await this.getDeal(dealId);

  // Race condition: another request could generate same deal number!
  const dealNumber = await this.generateDealNumber(deal.dealershipId);

  // If this update fails, sequence is incremented but deal has no number!
  const [updatedDeal] = await db.update(deals)
    .set({ customerId, dealNumber })
    .where(eq(deals.id, dealId))
    .returning();

  return updatedDeal;
}
```

**After** (ATOMIC):
```typescript
import { attachCustomerToDeal } from './database';

async attachCustomerToDeal(dealId: string, customerId: string, userId: string): Promise<Deal> {
  // Transaction handles all operations atomically
  return attachCustomerToDeal(dealId, customerId, userId);
}
```

### 4. Replace generateDealNumber with Atomic Version

**Before** (RACE CONDITIONS):
```typescript
async generateDealNumber(dealershipId: string): Promise<string> {
  const [sequence] = await db.select()
    .from(dealNumberSequences)
    .where(eq(dealNumberSequences.dealershipId, dealershipId));

  const nextValue = (sequence?.currentValue || 0) + 1;

  // Race condition: two requests could get same value!
  await db.update(dealNumberSequences)
    .set({ currentValue: nextValue })
    .where(eq(dealNumberSequences.dealershipId, dealershipId));

  return `${year}-${month}${day}-${String(nextValue).padStart(4, '0')}`;
}
```

**After** (ATOMIC):
```typescript
import { generateDealNumber } from './database';

async generateDealNumber(dealershipId: string): Promise<string> {
  // Uses SERIALIZABLE transaction with FOR UPDATE lock
  return generateDealNumber(dealershipId);
}
```

## Migration Checklist

### Phase 1: Update Imports (Zero Risk)

- [ ] Replace `import { db, pool } from './db'` with `import { db, pool } from './database'`
- [ ] Test that existing code still works (backward compatible)

### Phase 2: Migrate Critical Operations (High Priority)

- [ ] Migrate `createDeal` to use `database/atomic-operations.ts`
- [ ] Migrate `attachCustomerToDeal` to use atomic version
- [ ] Migrate `generateDealNumber` to use atomic version
- [ ] Migrate `generateStockNumber` to use atomic version
- [ ] Migrate `registerUser` to use atomic version

### Phase 3: Add Transactions to Multi-Step Operations

Identify operations that modify multiple tables and wrap them in transactions:

```typescript
import { transaction } from './database';

async complexOperation(data: any): Promise<any> {
  return transaction(async ({ client }) => {
    // Step 1: Insert into table A
    const resultA = await client.query('INSERT INTO table_a ...', [data.a]);

    // Step 2: Insert into table B
    const resultB = await client.query('INSERT INTO table_b ...', [resultA.id]);

    // Step 3: Update table C
    await client.query('UPDATE table_c ...', [resultB.id]);

    return resultB;
  });
}
```

Operations to wrap in transactions:
- [ ] Email send + log + status update
- [ ] Vehicle purchase + inventory update + deal creation
- [ ] User creation + permission assignment
- [ ] Customer creation + deal attachment
- [ ] Quote generation + contact logging

### Phase 4: Apply Performance Indexes

- [ ] Run migration `0004_add_critical_indexes.sql`
- [ ] Monitor index usage with `pg_stat_user_indexes`
- [ ] Identify missing indexes for custom queries
- [ ] Remove unused indexes after 7 days

### Phase 5: Add Monitoring

- [ ] Mount database monitoring routes in Express app
- [ ] Set up health check endpoint monitoring
- [ ] Configure alerts for pool exhaustion
- [ ] Configure alerts for slow queries
- [ ] Add metrics dashboard (optional)

## Common Patterns

### Pattern 1: Simple Transaction

```typescript
import { transaction } from './database';

await transaction(async ({ client }) => {
  await client.query('INSERT INTO table1 ...', [data1]);
  await client.query('INSERT INTO table2 ...', [data2]);
});
```

### Pattern 2: Serializable Transaction (Critical Operations)

```typescript
import { serializableTransaction } from './database';

await serializableTransaction(async ({ client }) => {
  // Get and lock row
  const result = await client.query(
    'SELECT * FROM sequences WHERE id = $1 FOR UPDATE',
    [id]
  );

  // Update atomically
  await client.query(
    'UPDATE sequences SET value = value + 1 WHERE id = $1',
    [id]
  );
});
```

### Pattern 3: Transaction with Savepoints

```typescript
import { transaction } from './database';

await transaction(async ({ client, savepoint, rollbackToSavepoint }) => {
  await client.query('INSERT INTO table1 ...', [data1]);

  await savepoint('before_risky_operation');

  try {
    await client.query('INSERT INTO table2 ...', [riskyData]);
  } catch (error) {
    // Rollback to savepoint, keep table1 insert
    await rollbackToSavepoint('before_risky_operation');
    await client.query('INSERT INTO table2 ...', [fallbackData]);
  }
});
```

### Pattern 4: Transaction with Retry

```typescript
import { transaction } from './database';

await transaction(
  async ({ client }) => {
    // Operations that might fail due to serialization
    await client.query('UPDATE inventory ...', [data]);
  },
  {
    maxRetries: 5,
    retryDelay: 100,
    timeout: 10000,
  }
);
```

## Monitoring Integration

### Add to Express App

```typescript
import express from 'express';
import { dbMonitoringRoutes } from './database';

const app = express();

// Mount database monitoring routes
app.use('/api/db', dbMonitoringRoutes);

// Health check for load balancers
app.get('/health', async (req, res) => {
  const { healthCheck } = await import('./database');
  const isHealthy = await healthCheck();
  res.status(isHealthy ? 200 : 503).json({ healthy: isHealthy });
});
```

### Check Metrics

```bash
# Health check
curl http://localhost:5000/api/db/health

# Comprehensive metrics
curl http://localhost:5000/api/db/metrics

# Recent queries
curl http://localhost:5000/api/db/query-history?limit=20

# Slow queries
curl http://localhost:5000/api/db/slow-queries?threshold=1000
```

## Testing

### Unit Tests

```typescript
import { getTransactionManager } from './database/transaction-manager';

beforeEach(() => {
  // Reset transaction stats for each test
  getTransactionManager().resetStats();
});

test('transaction commits successfully', async () => {
  await transaction(async ({ client }) => {
    await client.query('INSERT INTO test_table ...', [data]);
  });

  const stats = getTransactionManager().getStats();
  expect(stats.committedTransactions).toBe(1);
  expect(stats.rolledBackTransactions).toBe(0);
});

test('transaction rolls back on error', async () => {
  await expect(
    transaction(async ({ client }) => {
      await client.query('INSERT INTO test_table ...', [data]);
      throw new Error('Test error');
    })
  ).rejects.toThrow('Test error');

  const stats = getTransactionManager().getStats();
  expect(stats.rolledBackTransactions).toBe(1);
});
```

### Integration Tests

```typescript
test('deal creation is atomic', async () => {
  const result = await createDeal({
    dealershipId: 'test-dealer',
    salespersonId: 'test-user',
    customerData: {
      firstName: 'Test',
      lastName: 'Customer',
    },
  });

  // Verify all entities were created
  expect(result.deal).toBeDefined();
  expect(result.scenario).toBeDefined();
  expect(result.customer).toBeDefined();

  // Verify they're linked
  expect(result.deal.customerId).toBe(result.customer.id);
  expect(result.scenario.dealId).toBe(result.deal.id);
});
```

## Rollback Plan

If issues arise, you can temporarily rollback to old code:

1. **Keep old db.ts**: The new `db.ts` re-exports from `database/db-service.ts`, so old code continues to work
2. **Gradual migration**: Migrate one operation at a time
3. **Feature flags**: Use feature flags to toggle between old and new implementations
4. **Monitoring**: Watch metrics to catch issues early

## Support

If you encounter issues during migration:

1. Check `server/database/README.md` for architecture details
2. Review example patterns in this guide
3. Check transaction stats: `GET /api/db/transaction-stats`
4. Check slow queries: `GET /api/db/slow-queries`
5. Consult database architect

---

**Migration Priority**: Critical operations first (deal creation, user registration), then gradual migration of remaining code.
