# Database Runbook

## Overview

This document provides comprehensive procedures for managing the Autolytiq Desk Studio PostgreSQL database running on AWS Aurora Serverless v2, including migrations, backups, performance tuning, and maintenance operations.

---

## Table of Contents

1. [Migration Procedures](#migration-procedures)
2. [Backup and Recovery](#backup-and-recovery)
3. [Performance Tuning](#performance-tuning)
4. [Connection Pool Management](#connection-pool-management)
5. [Schema Change Procedures](#schema-change-procedures)
6. [Maintenance Operations](#maintenance-operations)
7. [Troubleshooting](#troubleshooting)

---

## Migration Procedures

### Migration Overview

The platform uses database migrations to manage schema changes. Different services may use different migration tools:

| Service          | Migration Tool | Migration Location                         |
| ---------------- | -------------- | ------------------------------------------ |
| Deal Service     | Prisma         | `services/deal-service/prisma/migrations/` |
| Customer Service | Golang-Migrate | `services/customer-service/migrations/`    |
| Auth Service     | Prisma         | `services/auth-service/prisma/migrations/` |

### Pre-Migration Checklist

- [ ] Migration script reviewed and approved
- [ ] Migration tested in staging environment
- [ ] Rollback script prepared and tested
- [ ] Database backup verified (< 1 hour old for prod)
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified of migration
- [ ] On-call engineer available

### Running Migrations

#### Prisma Migrations (Node.js Services)

```bash
# Check current migration status
kubectl exec -it deployment/deal-service -n autolytiq-<env> -- \
  npx prisma migrate status

# Deploy pending migrations
kubectl exec -it deployment/deal-service -n autolytiq-<env> -- \
  npx prisma migrate deploy

# Generate new migration (development only)
npx prisma migrate dev --name <migration-name>

# Reset database (development only - destroys data)
npx prisma migrate reset
```

#### Golang-Migrate Migrations

```bash
# Check current version
kubectl exec -it deployment/customer-service -n autolytiq-<env> -- \
  ./migrate -path /migrations -database "$DATABASE_URL" version

# Apply all pending migrations
kubectl exec -it deployment/customer-service -n autolytiq-<env> -- \
  ./migrate -path /migrations -database "$DATABASE_URL" up

# Apply specific number of migrations
kubectl exec -it deployment/customer-service -n autolytiq-<env> -- \
  ./migrate -path /migrations -database "$DATABASE_URL" up 1

# Rollback one migration
kubectl exec -it deployment/customer-service -n autolytiq-<env> -- \
  ./migrate -path /migrations -database "$DATABASE_URL" down 1
```

#### Migration via Kubernetes Job

For production migrations, use a dedicated job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%Y%m%d%H%M%S)
  namespace: autolytiq-prod
spec:
  template:
    spec:
      containers:
        - name: migration
          image: <ecr-registry>/autolytiq/deal-service:<tag>
          command: ['npx', 'prisma', 'migrate', 'deploy']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: autolytiq-secrets
                  key: DATABASE_URL
      restartPolicy: Never
  backoffLimit: 1
  ttlSecondsAfterFinished: 86400
```

```bash
# Apply migration job
kubectl apply -f migration-job.yaml

# Watch job status
kubectl get job -n autolytiq-prod -w

# Check job logs
kubectl logs job/db-migration-<timestamp> -n autolytiq-prod
```

### Zero-Downtime Migration Pattern

For large tables or breaking changes:

#### Phase 1: Expand

```sql
-- Add new column as nullable
ALTER TABLE deals ADD COLUMN new_status VARCHAR(50);

-- Add new table if needed
CREATE TABLE deal_metadata (
  deal_id UUID PRIMARY KEY REFERENCES deals(id),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### Phase 2: Migrate (via background job)

```sql
-- Backfill data in batches
UPDATE deals
SET new_status = status
WHERE id IN (
  SELECT id FROM deals
  WHERE new_status IS NULL
  LIMIT 10000
);

-- Or use a more efficient batch approach
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE deals
    SET new_status = status
    WHERE id IN (
      SELECT id FROM deals
      WHERE new_status IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
    PERFORM pg_sleep(0.1); -- Prevent overload
  END LOOP;
END $$;
```

#### Phase 3: Deploy (dual-write code)

Deploy application code that:

- Writes to both old and new columns
- Reads from new column with fallback to old

#### Phase 4: Contract

```sql
-- After verifying all data migrated
ALTER TABLE deals DROP COLUMN status;
ALTER TABLE deals RENAME COLUMN new_status TO status;
ALTER TABLE deals ALTER COLUMN status SET NOT NULL;
```

### Migration Rollback

#### Immediate Rollback (< 5 minutes after migration)

```bash
# Prisma - no built-in rollback, manually reverse
kubectl exec -it deployment/deal-service -n autolytiq-prod -- \
  npx prisma db execute --file=/migrations/rollback_<version>.sql

# Golang-migrate
kubectl exec -it deployment/customer-service -n autolytiq-prod -- \
  ./migrate -path /migrations -database "$DATABASE_URL" down 1
```

#### Point-in-Time Recovery

For major migration failures, restore from backup:

```bash
# Restore to point before migration
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier autolytiq-prod \
  --db-cluster-identifier autolytiq-prod-restored \
  --restore-to-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --restore-type full-copy

# After verification, switch DNS/connection strings
```

---

## Backup and Recovery

### Automated Backups

Aurora Serverless v2 provides:

- **Continuous backups**: Point-in-time recovery to any second
- **Automated snapshots**: Daily snapshots retained for 35 days (prod)
- **Cross-region replication**: Optional for DR

### Verify Backup Status

```bash
# List automated snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# Check backup retention
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].BackupRetentionPeriod'
```

### Manual Snapshot

Create before major changes:

```bash
# Create manual snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier autolytiq-prod \
  --db-cluster-snapshot-identifier "pre-migration-$(date +%Y%m%d-%H%M%S)"

# Wait for completion
aws rds wait db-cluster-snapshot-available \
  --db-cluster-snapshot-identifier "pre-migration-<timestamp>"

# Verify snapshot
aws rds describe-db-cluster-snapshots \
  --db-cluster-snapshot-identifier "pre-migration-<timestamp>"
```

### Point-in-Time Recovery (PITR)

```bash
# Restore to specific point in time
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier autolytiq-prod \
  --db-cluster-identifier autolytiq-prod-pitr \
  --restore-to-time "2024-01-15T10:30:00Z" \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name autolytiq-prod-db

# Add instance to restored cluster
aws rds create-db-instance \
  --db-instance-identifier autolytiq-prod-pitr-1 \
  --db-cluster-identifier autolytiq-prod-pitr \
  --db-instance-class db.serverless \
  --engine aurora-postgresql
```

### Snapshot Restore

```bash
# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier autolytiq-prod-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name autolytiq-prod-db

# Add instance
aws rds create-db-instance \
  --db-instance-identifier autolytiq-prod-restored-1 \
  --db-cluster-identifier autolytiq-prod-restored \
  --db-instance-class db.serverless \
  --engine aurora-postgresql
```

### Data Export

For specific data export:

```bash
# Export table to CSV
kubectl exec -it <postgres-pod> -n autolytiq-prod -- \
  psql -U autolytiq_admin -d autolytiq \
  -c "\copy deals TO '/tmp/deals_export.csv' WITH CSV HEADER"

# Export schema only
kubectl exec -it <postgres-pod> -n autolytiq-prod -- \
  pg_dump -U autolytiq_admin -d autolytiq --schema-only > schema.sql

# Export specific tables
kubectl exec -it <postgres-pod> -n autolytiq-prod -- \
  pg_dump -U autolytiq_admin -d autolytiq -t deals -t customers > tables.sql
```

---

## Performance Tuning

### Query Performance Analysis

#### Enable pg_stat_statements

Already enabled via parameter group. Access statistics:

```sql
-- Top 10 slowest queries by average time
SELECT
  substring(query, 1, 100) as query_snippet,
  calls,
  round(mean_exec_time::numeric, 2) as avg_ms,
  round(total_exec_time::numeric, 2) as total_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER())::numeric, 2) as pct
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Top 10 by total time consumed
SELECT
  substring(query, 1, 100) as query_snippet,
  calls,
  round(mean_exec_time::numeric, 2) as avg_ms,
  round(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Reset statistics (use sparingly)
SELECT pg_stat_statements_reset();
```

#### Query Explain Analysis

```sql
-- Explain analyze a slow query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT d.*, c.name as customer_name
FROM deals d
JOIN customers c ON d.customer_id = c.id
WHERE d.status = 'active'
AND d.created_at > now() - interval '30 days';
```

Key things to look for:

- **Seq Scan** on large tables (add index)
- **Nested Loop** with high row counts (optimize join)
- **Sort** with high cost (add index for ORDER BY)
- **Buffers: shared hit** ratio (higher is better)

### Index Management

#### Review Existing Indexes

```sql
-- List all indexes with sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Identify unused indexes
SELECT
  s.schemaname,
  s.relname AS table_name,
  s.indexrelname AS index_name,
  s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
FROM pg_catalog.pg_stat_user_indexes s
WHERE s.idx_scan = 0
AND s.schemaname = 'public'
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- Identify missing indexes (based on sequential scans)
SELECT
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC
LIMIT 20;
```

#### Create Index (Online)

```sql
-- Create index concurrently (no locks)
CREATE INDEX CONCURRENTLY idx_deals_status_created
ON deals (status, created_at)
WHERE status IN ('active', 'pending');

-- Verify index creation
\d deals
```

#### Drop Unused Index

```sql
-- Verify index is truly unused
SELECT idx_scan FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_name';

-- Drop if confirmed unused
DROP INDEX CONCURRENTLY IF EXISTS idx_name;
```

### Table Optimization

#### VACUUM and ANALYZE

```sql
-- Check tables needing vacuum
SELECT
  schemaname,
  relname,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Manual vacuum (for urgent cleanup)
VACUUM (VERBOSE, ANALYZE) deals;

-- Aggressive vacuum (reclaim space)
VACUUM (FULL, VERBOSE) deals;  -- Warning: Locks table!
```

#### Table Bloat

```sql
-- Check table bloat
WITH constants AS (
  SELECT current_setting('block_size')::numeric AS bs
),
bloat_info AS (
  SELECT
    schemaname,
    tablename,
    cc.reltuples::bigint AS est_rows,
    pg_relation_size(schemaname||'.'||tablename)::bigint AS table_bytes,
    CEIL((cc.reltuples*((datahdr+ma-
      (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS est_pages
  FROM (
    SELECT
      ma,bs,schemaname,tablename,
      (datawidth+(hdr+ma-(case when hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
      (maxfracsum*(nullhdr+ma-(case when nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
    FROM (
      SELECT
        schemaname, tablename, hdr, ma, bs,
        SUM((1-null_frac)*avg_width) AS datawidth,
        MAX(null_frac) AS maxfracsum,
        hdr+(
          SELECT 1+count(*)/8
          FROM pg_stats s2
          WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
        ) AS nullhdr
      FROM pg_stats s, constants
      CROSS JOIN (SELECT 23 AS hdr, 4 AS ma) AS constant2
      GROUP BY 1,2,3,4,5
    ) AS foo
  ) AS rs
  JOIN pg_class cc ON cc.relname = rs.tablename
  JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
)
SELECT
  schemaname,
  tablename,
  est_rows,
  pg_size_pretty(table_bytes) as table_size,
  pg_size_pretty((table_bytes - est_pages * 8192)::bigint) as bloat_size,
  round(100 * (table_bytes - est_pages * 8192)::numeric / NULLIF(table_bytes, 0), 2) as bloat_pct
FROM bloat_info, constants
WHERE table_bytes > 1000000
ORDER BY (table_bytes - est_pages * 8192) DESC
LIMIT 20;
```

---

## Connection Pool Management

### Connection Limits

Aurora Serverless v2 connection limits:

| ACU | Max Connections |
| --- | --------------- |
| 0.5 | ~90             |
| 1   | ~180            |
| 2   | ~360            |
| 4   | ~720            |
| 8   | ~1440           |

### Monitor Connections

```sql
-- Current connection count
SELECT count(*) FROM pg_stat_activity;

-- Connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Connections by application
SELECT application_name, state, count(*)
FROM pg_stat_activity
GROUP BY application_name, state
ORDER BY count DESC;

-- Long-running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
AND (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### Kill Connections

```sql
-- Kill specific connection
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = <pid>;

-- Kill idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '10 minutes';

-- Kill all connections to a database (emergency)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'autolytiq'
AND pid <> pg_backend_pid();
```

### Application Pool Settings

Recommended settings per service instance:

| Service           | Pool Min | Pool Max | Idle Timeout |
| ----------------- | -------- | -------- | ------------ |
| deal-service      | 5        | 20       | 30s          |
| customer-service  | 5        | 15       | 30s          |
| inventory-service | 5        | 15       | 30s          |
| auth-service      | 5        | 15       | 30s          |

Update pool settings:

```bash
kubectl set env deployment/<service> \
  DB_POOL_MIN=5 \
  DB_POOL_MAX=20 \
  DB_POOL_IDLE_TIMEOUT=30000 \
  -n autolytiq-prod
```

---

## Schema Change Procedures

### Safe Schema Changes

These changes are safe without downtime:

```sql
-- Add nullable column
ALTER TABLE deals ADD COLUMN metadata JSONB;

-- Add column with default (PostgreSQL 11+, instant)
ALTER TABLE deals ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Create index concurrently
CREATE INDEX CONCURRENTLY idx_deals_archived ON deals(is_archived);

-- Add new table
CREATE TABLE audit_logs (...);

-- Rename table (if no direct references)
ALTER TABLE old_name RENAME TO new_name;
```

### Risky Schema Changes

These require careful planning:

```sql
-- Adding NOT NULL to existing column (requires lock)
-- Step 1: Add default value first
ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'draft';
-- Step 2: Backfill nulls
UPDATE deals SET status = 'draft' WHERE status IS NULL;
-- Step 3: Add constraint (brief lock)
ALTER TABLE deals ALTER COLUMN status SET NOT NULL;

-- Changing column type (may require table rewrite)
-- Use expand/migrate/contract pattern instead

-- Dropping column (must ensure no code references)
-- Step 1: Deploy code that doesn't read column
-- Step 2: Wait for all old pods to terminate
-- Step 3: Drop column
ALTER TABLE deals DROP COLUMN old_column;
```

### Schema Change Checklist

- [ ] Change reviewed by DBA or senior engineer
- [ ] Tested in staging with production-like data
- [ ] Backward-compatible with current code
- [ ] Forward-compatible with new code
- [ ] Rollback procedure documented
- [ ] Index creation is CONCURRENT
- [ ] Large table changes scheduled for low-traffic window

---

## Maintenance Operations

### Scheduled Maintenance

Aurora handles most maintenance automatically:

- Storage management
- Minor version patches (configurable)
- Failover testing

### Manual Maintenance Tasks

#### Weekly

```sql
-- Update table statistics
ANALYZE;

-- Check for bloat
SELECT schemaname, relname, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 100000
ORDER BY n_dead_tup DESC;
```

#### Monthly

```sql
-- Review slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Check index usage
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Review table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

#### Quarterly

- Review and optimize indexes
- Archive old data if applicable
- Review parameter tuning
- Capacity planning review

### Data Archival

For tables with historical data:

```sql
-- Create archive table
CREATE TABLE deals_archive (LIKE deals INCLUDING ALL);

-- Move old records
WITH moved AS (
  DELETE FROM deals
  WHERE created_at < now() - interval '2 years'
  RETURNING *
)
INSERT INTO deals_archive SELECT * FROM moved;

-- Verify row counts
SELECT 'deals' as table_name, count(*) FROM deals
UNION ALL
SELECT 'deals_archive', count(*) FROM deals_archive;
```

---

## Troubleshooting

### Connection Issues

**Symptom**: "too many connections" errors

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check max connections
SHOW max_connections;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '5 minutes';
```

**Solution**:

1. Scale up Aurora ACUs (increases max connections)
2. Reduce pool sizes per service
3. Kill idle connections

### Slow Query Investigation

**Symptom**: API latency increased

```sql
-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
EXPLAIN ANALYZE <slow-query>;

-- Check for lock waits
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid));
```

### Lock Investigation

**Symptom**: Queries hanging, timeouts

```sql
-- View active locks
SELECT
  pg_locks.pid,
  pg_class.relname,
  pg_locks.mode,
  pg_locks.granted
FROM pg_locks
JOIN pg_class ON pg_locks.relation = pg_class.oid
WHERE NOT pg_locks.granted;

-- View lock wait chains
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
  ON blocked_locks.locktype = blocking_locks.locktype
  AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
  AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
  AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
  AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
  AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
  AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
  AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
  AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
  AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
  AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE NOT blocked_locks.granted;
```

### Replication Lag

**Symptom**: Read replicas returning stale data

```sql
-- Check replication status
SELECT
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;
```

**Solution**:

1. Reduce write load
2. Scale up replica
3. Check network between primary and replica

### Disk Space

**Symptom**: Database errors about disk space

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('autolytiq'));

-- Check table sizes
SELECT
  relname,
  pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- Check for bloat and vacuum
VACUUM FULL <bloated_table>;  -- Warning: locks table
```

---

## Emergency Procedures

### Database Failover

Aurora handles failover automatically. Manual failover:

```bash
# Force failover to read replica
aws rds failover-db-cluster \
  --db-cluster-identifier autolytiq-prod \
  --target-db-instance-identifier autolytiq-prod-2
```

### Emergency Read-Only Mode

If writes are causing issues:

```sql
-- Set database to read-only (requires restart)
-- Contact AWS support or use application-level enforcement

-- Application level: redirect writes to fail
-- Configure read replica endpoint for all traffic
```

### Data Corruption Recovery

1. Stop all writes (scale services to 0)
2. Assess damage
3. PITR to before corruption
4. Verify data integrity
5. Restore service

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
