# Database Layer Architecture

## Overview

This directory contains the complete database infrastructure for Autolytiq Desk Studio. The database layer has been completely redesigned to provide enterprise-grade reliability, performance, and maintainability.

## Architecture Components

### 1. Connection Pool Manager (`connection-pool.ts`)

**Purpose**: Centralized connection pooling with health monitoring and performance tracking.

**Features**:
- Configurable pool sizing (default: 5-20 connections)
- Connection timeout handling (10s connect, 30s idle)
- Statement timeout protection (prevents long-running queries)
- Query performance tracking
- Slow query detection and logging
- Connection leak detection
- Graceful shutdown with active connection draining

**Configuration** (via environment variables):
```bash
DB_POOL_MAX=20                    # Maximum connections
DB_POOL_MIN=5                     # Minimum connections
DB_CONNECT_TIMEOUT=10000          # Connection timeout (ms)
DB_IDLE_TIMEOUT=30000             # Idle timeout (ms)
DB_STATEMENT_TIMEOUT=30000        # Statement timeout (ms)
DB_QUERY_TIMEOUT=30000            # Query timeout (ms)
DB_SLOW_QUERY_THRESHOLD=1000      # Slow query threshold (ms)
```

**Usage**:
```typescript
import { getConnectionPool } from './database/connection-pool';

const pool = getConnectionPool();
const metrics = pool.getMetrics();
```

### 2. Transaction Manager (`transaction-manager.ts`)

**Purpose**: ACID transaction guarantees with automatic retry and error handling.

**Features**:
- Multiple isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
- Automatic retry on transient errors (deadlocks, serialization failures)
- Savepoint support for nested transactions
- Exponential backoff retry strategy
- Transaction timeout protection
- Comprehensive statistics tracking

**Isolation Levels**:
- `READ COMMITTED` - Default, prevents dirty reads
- `REPEATABLE READ` - Prevents non-repeatable reads
- `SERIALIZABLE` - Strictest, prevents phantom reads (use for critical operations)

**Usage**:
```typescript
import { withTransaction, IsolationLevel } from './database/transaction-manager';

// Standard transaction
await withTransaction(async ({ client }) => {
  await client.query('INSERT INTO deals ...');
  await client.query('INSERT INTO deal_scenarios ...');
});

// Serializable transaction (for critical operations)
await withTransaction(async ({ client, savepoint }) => {
  await savepoint('before_deal');
  const result = await client.query('INSERT INTO deals ...');
  // Can rollback to savepoint if needed
}, {
  isolationLevel: IsolationLevel.SERIALIZABLE,
  maxRetries: 5,
  timeout: 10000
});
```

### 3. Database Service (`db-service.ts`)

**Purpose**: Main database service integrating all components.

**Features**:
- Unified interface for all database operations
- Automatic connection management
- Transaction helpers
- Health checks and metrics
- Graceful shutdown handling
- Integration with Drizzle ORM

**Usage**:
```typescript
import { db, transaction, healthCheck, getMetrics } from './database/db-service';

// Use Drizzle ORM
const users = await db.select().from(usersTable);

// Execute transaction
await transaction(async ({ client }) => {
  // Multiple operations
});

// Health check
const isHealthy = await healthCheck();

// Get metrics
const metrics = await getMetrics();
```

### 4. Atomic Operations (`atomic-operations.ts`)

**Purpose**: Critical business operations with transactional guarantees.

**Operations**:
- **Deal Creation**: Creates deal + scenario + customer (if new) atomically
- **Customer Attachment**: Attaches customer and generates deal number atomically
- **User Registration**: Creates user and initializes permissions atomically
- **Sequence Generation**: Atomic counter operations (deal numbers, stock numbers)

**Usage**:
```typescript
import { createDeal, attachCustomerToDeal } from './database/atomic-operations';

// Create deal with customer and vehicle
const result = await createDeal({
  dealershipId: 'dealer-123',
  salespersonId: 'user-456',
  vehicleId: 'vehicle-789',
  customerData: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  scenarioData: {
    name: 'Finance Deal',
    term: 60,
    apr: '8.9',
  },
});

// Result contains: deal, scenario, customer, vehicle
```

### 5. Monitoring Routes (`monitoring-routes.ts`)

**Purpose**: HTTP endpoints for database monitoring and observability.

**Endpoints**:
- `GET /api/db/health` - Quick health check
- `GET /api/db/metrics` - Comprehensive metrics
- `GET /api/db/query-history` - Recent query history
- `GET /api/db/slow-queries` - Slow query log
- `GET /api/db/transaction-stats` - Transaction statistics
- `GET /api/db/pool-metrics` - Connection pool metrics

**Security Note**: These endpoints should be protected by authentication in production.

## Critical Workflows

### Deal Creation (Atomic)

The deal creation flow is now completely atomic:

1. **Create customer** (if new customer data provided)
2. **Generate deal number** (atomic sequence increment)
3. **Create deal** record
4. **Create default scenario**
5. **Update vehicle status** (mark as pending)
6. **Create audit log** entry

**All-or-nothing guarantee**: If any step fails, entire operation rolls back.

**Race condition prevention**: Deal number generation uses SERIALIZABLE isolation to prevent duplicate numbers.

```typescript
// Before (NON-ATOMIC - DANGEROUS)
const customer = await createCustomer(data);
const dealNumber = await generateDealNumber(); // Race condition!
const deal = await createDeal({ customerId, dealNumber });
const scenario = await createScenario({ dealId: deal.id });
// If scenario creation fails, customer and deal are orphaned!

// After (ATOMIC - SAFE)
const result = await createDeal({
  dealershipId: 'dealer-123',
  salespersonId: 'user-456',
  customerData: { firstName: 'John', lastName: 'Doe' },
});
// All succeed or all fail - guaranteed
```

### User Registration (Atomic)

User registration with duplicate checks:

1. **Check username uniqueness** (within transaction)
2. **Check email uniqueness** (within transaction)
3. **Create user** record
4. **Initialize permissions** (if applicable)

### Email Status Updates (Atomic)

Email status updates with audit trail:

1. **Update email status**
2. **Create audit log** entry
3. **Trigger notifications** (if configured)

## Performance Optimizations

### Indexes Created

The `0004_add_critical_indexes.sql` migration adds:

- **Multi-tenant isolation indexes**: Optimize dealership_id filtering
- **Foreign key indexes**: Improve JOIN performance
- **Audit log indexes**: Fast compliance queries
- **Partial indexes**: Smaller, faster indexes for specific filters
- **Composite indexes**: Multi-column indexes for complex queries

**Key indexes**:
```sql
-- Multi-tenant filtering (CRITICAL)
idx_deals_dealership_id ON deals(dealership_id)
idx_customers_dealership_id ON customers(dealership_id)
idx_vehicles_dealership_id ON vehicles(dealership_id)

-- Deal lookups
idx_deals_state ON deals(dealership_id, deal_state)
idx_deals_created_at ON deals(dealership_id, created_at DESC)

-- Customer search
idx_customers_search ON customers(dealership_id, last_name, first_name)
idx_customers_email ON customers(dealership_id, email)

-- Partial indexes (active data only)
idx_deals_active ON deals WHERE deal_state NOT IN ('CANCELLED', 'DELIVERED')
idx_vehicles_pending ON vehicles WHERE status = 'pending'
```

### Query Patterns

**Always filter by dealership_id first**:
```typescript
// Good - uses idx_deals_dealership_id
const deals = await db.select()
  .from(deals)
  .where(eq(deals.dealershipId, dealershipId));

// Bad - full table scan
const deals = await db.select()
  .from(deals)
  .where(eq(deals.dealState, 'APPROVED'));
```

**Use composite indexes**:
```typescript
// Good - uses idx_deals_state
const deals = await db.select()
  .from(deals)
  .where(and(
    eq(deals.dealershipId, dealershipId),
    eq(deals.dealState, 'APPROVED')
  ));
```

**Leverage partial indexes**:
```typescript
// Good - uses idx_deals_active (smaller index)
const activeDeals = await db.select()
  .from(deals)
  .where(and(
    eq(deals.dealershipId, dealershipId),
    notInArray(deals.dealState, ['CANCELLED', 'DELIVERED'])
  ));
```

## Migration Strategy

### Current Migration State

- `0000_boring_mentor.sql` - Initial schema
- `0001_add_performance_indexes.sql` - Early performance indexes
- `0002_schema_consistency.sql` - Schema fixes
- `0003_fix_email_direction.sql` - Email system fixes
- `0004_add_critical_indexes.sql` - Comprehensive index coverage (NEW)

### Migration Best Practices

1. **Always use CONCURRENTLY for indexes**:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```
   This prevents table locks in production.

2. **Add NOT NULL constraints carefully**:
   ```sql
   -- Step 1: Add column as nullable
   ALTER TABLE users ADD COLUMN new_field TEXT;

   -- Step 2: Backfill data
   UPDATE users SET new_field = 'default' WHERE new_field IS NULL;

   -- Step 3: Add constraint
   ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;
   ```

3. **Use transactions for data migrations**:
   ```sql
   BEGIN;
   -- Multiple operations
   COMMIT;
   ```

4. **Include rollback instructions**:
   Every migration should document how to rollback.

## Monitoring and Observability

### Key Metrics to Track

**Connection Pool**:
- `totalConnections` - Should be between min and max
- `idleConnections` - Should have some idle for burst traffic
- `waitingClients` - Should be 0 (if > 0, increase pool size)
- `avgQueryTime` - Baseline for performance regression

**Transactions**:
- `committedTransactions` - Success rate
- `rolledBackTransactions` - Failure rate
- `retriedTransactions` - Transient error frequency
- `deadlockRetries` - Contention indicator

**Queries**:
- `slowQueries` - Queries exceeding threshold
- `failedQueries` - Error rate

### Alerting Thresholds

```typescript
// Example monitoring check
const metrics = await getMetrics();

// Alert if pool is exhausted
if (metrics.pool.waitingClients > 5) {
  alert('Database pool exhausted');
}

// Alert if slow queries are increasing
if (metrics.pool.slowQueries > 100) {
  alert('High number of slow queries');
}

// Alert if deadlocks are frequent
if (metrics.transactions.deadlockRetries > 10) {
  alert('High transaction contention');
}

// Alert if health check fails
if (!metrics.health) {
  alert('Database health check failed');
}
```

## Troubleshooting

### Connection Pool Exhausted

**Symptom**: `waitingClients > 0`, requests timing out

**Solutions**:
1. Increase `DB_POOL_MAX` (but not beyond database limit)
2. Check for connection leaks (clients not released)
3. Review slow queries (blocking connections)
4. Add read replicas for read-heavy workloads

### High Transaction Rollbacks

**Symptom**: `rolledBackTransactions` increasing

**Solutions**:
1. Review application error handling
2. Check for serialization failures (reduce isolation level if safe)
3. Add retry logic in application code
4. Investigate deadlocks with `pg_stat_activity`

### Slow Queries

**Symptom**: `slowQueries` increasing, `avgQueryTime` rising

**Solutions**:
1. Review query execution plans: `EXPLAIN ANALYZE`
2. Add missing indexes
3. Optimize query predicates
4. Consider query result caching
5. Partition large tables

### Deadlocks

**Symptom**: `deadlockRetries` > 0

**Solutions**:
1. Ensure consistent lock ordering
2. Keep transactions short
3. Reduce isolation level if safe
4. Split large transactions

## Performance Testing

### Load Testing Queries

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_toast%';

-- Table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Slow queries (requires pg_stat_statements extension)
-- SELECT query, calls, mean_exec_time, total_exec_time
-- FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;
```

## Security Considerations

### Multi-Tenant Isolation

**CRITICAL**: Every query MUST filter by `dealership_id` to prevent cross-tenant data leaks.

```typescript
// Good - isolated
const deals = await db.select()
  .from(deals)
  .where(eq(deals.dealershipId, req.user.dealershipId));

// Bad - SECURITY VULNERABILITY
const deals = await db.select()
  .from(deals); // Returns ALL dealerships!
```

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// Good - parameterized
await client.query('SELECT * FROM users WHERE id = $1', [userId]);

// Bad - SQL injection risk
await client.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Connection String Security

Never commit `DATABASE_URL` to version control. Use environment variables.

## Future Enhancements

1. **Read Replicas**: Separate read traffic to replicas
2. **Query Result Caching**: Redis caching for frequent queries
3. **Automatic Query Optimization**: Machine learning for index suggestions
4. **Real-time Metrics Dashboard**: Grafana/Prometheus integration
5. **Database Sharding**: Horizontal scaling for multi-tenant data
6. **Point-in-Time Recovery**: Automated backup and restore
7. **Change Data Capture**: Real-time event streaming

## Support

For questions or issues with the database layer:
1. Check this documentation
2. Review query execution plans
3. Check monitoring endpoints for metrics
4. Consult database architect

---

**Last Updated**: 2025-11-20
**Database**: PostgreSQL (Neon Serverless)
**ORM**: Drizzle ORM 0.39.1
