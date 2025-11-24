# Database Infrastructure Setup

**Purpose:** Setup production-grade PostgreSQL database infrastructure after migrating from Replit

**Last Updated:** November 23, 2025
**Status:** Required for deployment

---

## Current Situation

**Problem:** Replit is not suitable for production hosting
- Limited resources
- Not designed for production workloads
- Need dedicated database infrastructure

**Solution:** Migrate to proper database hosting with PostgreSQL 16 + pgvector

---

## Recommended Database Hosting Options

### Option 1: Neon (RECOMMENDED for MVP)

**Why Neon:**
- ✅ Serverless PostgreSQL (auto-scale)
- ✅ Built-in pgvector support
- ✅ Generous free tier (0.5 GB storage, 100 hours compute/month)
- ✅ Pay-as-you-grow pricing
- ✅ Branching (test databases from production)
- ✅ Point-in-time recovery
- ✅ Connection pooling included

**Pricing:**
- **Free:** $0/month (perfect for development)
- **Launch:** $19/month (2 GB storage, always-on compute)
- **Scale:** $69/month (10 GB storage, autoscaling)

**Setup:**
```bash
# 1. Create account at neon.tech
# 2. Create project
# 3. Get connection string:
#    postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname

# 4. Enable pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Update .env
echo "DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname" >> .env
echo "DIRECT_DATABASE_URL=$DATABASE_URL" >> .env
```

**Pros:**
- 🟢 FREE tier for development
- 🟢 Serverless (no server management)
- 🟢 Great developer experience
- 🟢 Built for startups

**Cons:**
- 🔴 US-only datacenters (East/West coast)
- 🔴 Newer service (less mature than AWS RDS)

---

### Option 2: Supabase (Good for Auth + DB combo)

**Why Supabase:**
- ✅ PostgreSQL + Auth + Storage + Realtime
- ✅ pgvector support
- ✅ Generous free tier
- ✅ Built-in Row Level Security (RLS)
- ✅ Auto-generated REST/GraphQL APIs
- ✅ Dashboard UI

**Pricing:**
- **Free:** $0/month (500 MB database, 2 GB bandwidth)
- **Pro:** $25/month (8 GB database, 50 GB bandwidth)
- **Team:** $599/month (unlimited)

**Setup:**
```bash
# 1. Create project at supabase.com
# 2. Get connection strings from project settings
# 3. Two URLs provided:
#    - Pooled (for serverless/edge): port 6543
#    - Direct (for long-running): port 5432

# 4. Update .env
DATABASE_URL="postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_DATABASE_URL="postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# 5. Enable pgvector
# (Already enabled by default in Supabase)
```

**Pros:**
- 🟢 All-in-one (database + auth + storage)
- 🟢 Could replace your custom auth service
- 🟢 Excellent documentation
- 🟢 Open source

**Cons:**
- 🔴 More expensive at scale
- 🔴 Opinionated stack (must use Supabase patterns)

---

### Option 3: Railway (Simple, Developer-Friendly)

**Why Railway:**
- ✅ Dead simple setup
- ✅ PostgreSQL + Redis + any service
- ✅ $5/month flat fee + usage
- ✅ Easy deployments
- ✅ Great for small teams

**Pricing:**
- **Free:** $5 free credit/month (covers small DB)
- **Pro:** $5/month + usage (~$10-30/month total)

**Setup:**
```bash
# 1. Create account at railway.app
# 2. New Project → Add PostgreSQL
# 3. Get connection string from variables tab

# 4. Install pgvector
railway run psql -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Update .env
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:7432/railway"
```

**Pros:**
- 🟢 Simplest setup
- 🟢 Can deploy entire stack (DB + services)
- 🟢 Affordable

**Cons:**
- 🔴 Less mature than AWS/GCP
- 🔴 Fewer regions

---

### Option 4: DigitalOcean Managed PostgreSQL

**Why DigitalOcean:**
- ✅ Predictable pricing
- ✅ Simple setup
- ✅ Good performance
- ✅ 99.95% uptime SLA

**Pricing:**
- **Basic:** $15/month (1 GB RAM, 10 GB disk, 1 vCPU)
- **Standard:** $60/month (4 GB RAM, 38 GB disk, 2 vCPU)
- **Premium:** $120/month (8 GB RAM, 115 GB disk, 4 vCPU)

**Setup:**
```bash
# 1. Create account at digitalocean.com
# 2. Databases → Create → PostgreSQL 16
# 3. Choose region (closest to your users)
# 4. Download CA certificate

# 5. Get connection details
DATABASE_URL="postgresql://doadmin:password@db-postgresql-nyc3-xxx.ondigitalocean.com:25060/defaultdb?sslmode=require"

# 6. Enable pgvector
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Pros:**
- 🟢 Traditional managed database
- 🟢 Predictable costs
- 🟢 Good documentation

**Cons:**
- 🔴 More expensive than serverless options
- 🔴 Must choose instance size upfront

---

### Option 5: AWS RDS (Enterprise-Grade)

**Why AWS RDS:**
- ✅ Industry standard
- ✅ Maximum reliability
- ✅ Global regions
- ✅ Enterprise features

**Pricing:**
- **db.t3.micro:** ~$15/month (1 GB RAM, 20 GB storage)
- **db.t3.small:** ~$30/month (2 GB RAM, 20 GB storage)
- **db.t3.medium:** ~$60/month (4 GB RAM, 20 GB storage)

**Setup:**
```bash
# 1. AWS Console → RDS → Create database
# 2. Choose PostgreSQL 16
# 3. Template: Free tier (12 months free if eligible)
# 4. Instance: db.t3.micro
# 5. Storage: 20 GB gp3
# 6. Security: Allow inbound from your app's IP
# 7. Enable pgvector:

psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Pros:**
- 🟢 Enterprise reliability
- 🟢 12-month free tier available
- 🟢 Most mature offering

**Cons:**
- 🔴 Complex setup
- 🔴 Expensive at scale
- 🔴 Requires VPC/security group config

---

## Recommendation Decision Matrix

| Use Case | Recommended | Monthly Cost | Why |
|----------|-------------|--------------|-----|
| **Development** | Neon Free | $0 | No-brainer, perfect for dev |
| **MVP Launch** | Neon Launch | $19 | Simple, scales with you |
| **Need Auth Too** | Supabase Pro | $25 | Auth + DB in one |
| **Small Team** | Railway | $10-30 | Dead simple, affordable |
| **Predictable** | DigitalOcean | $15+ | Fixed pricing, no surprises |
| **Enterprise** | AWS RDS | $30+ | Maximum reliability |

**My Recommendation for Autolytiq: Start with Neon**

**Why:**
1. **FREE for development** - Get started immediately
2. **$19/month when ready** - Affordable for launch
3. **Serverless** - Auto-scales as you grow
4. **pgvector built-in** - Required for AI agent RAG
5. **Easy migration** - Standard PostgreSQL, move anytime

---

## Database Schema Strategy

### Multi-Tenant Architecture

**Use Row-Level Security (RLS) for tenant isolation:**

```sql
-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their dealership's data
CREATE POLICY dealership_isolation_customers
  ON customers
  FOR ALL
  TO authenticated
  USING (dealership_id = current_setting('app.current_dealership_id')::uuid);

CREATE POLICY dealership_isolation_deals
  ON deals
  FOR ALL
  TO authenticated
  USING (dealership_id = current_setting('app.current_dealership_id')::uuid);

-- Set context at connection time
SET app.current_dealership_id = 'dealership-uuid-here';
```

### pgvector Setup for AI Agent

```sql
-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for RAG
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for similarity search
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Query similar documents
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM knowledge_base
WHERE dealership_id = $1
ORDER BY embedding <=> $2
LIMIT 5;
```

---

## Migration from Replit

### Step 1: Export Current Data

```bash
# On Replit, export current database
pg_dump $DATABASE_URL > autolytiq_backup_$(date +%Y%m%d).sql

# Download backup file
# (Use Replit's file browser to download)
```

### Step 2: Setup New Database

```bash
# Create database on chosen provider (Neon/Supabase/etc.)
# Get new DATABASE_URL

# Import data
psql $NEW_DATABASE_URL < autolytiq_backup_20251123.sql
```

### Step 3: Update Environment

```bash
# Update .env with new database URL
DATABASE_URL="postgresql://new-db-url"
DIRECT_DATABASE_URL="postgresql://new-db-url"

# Test connection
npm run db:studio
```

### Step 4: Run Migrations

```bash
# Apply any pending migrations
npm run db:push

# Or if using Drizzle migrations
npm run db:migrate
```

---

## Connection Pooling

**Important:** PostgreSQL has limited connections (~100). Use connection pooling.

### Option 1: Built-in Pooling (Neon, Supabase)

```typescript
// Already pooled - just use the pooled connection string
import postgres from 'postgres';

const db = postgres(process.env.DATABASE_URL, {
  // No pooling config needed
});
```

### Option 2: PgBouncer (Self-Managed)

```bash
# Install PgBouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
autolytiq = host=db.example.com port=5432 dbname=autolytiq

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Use pooled connection
DATABASE_URL="postgresql://user:pass@localhost:6432/autolytiq"
```

---

## Backup Strategy

### Automated Backups

**All recommended providers include automatic backups:**
- **Neon:** Point-in-time recovery (PITR) to any second
- **Supabase:** Daily backups, PITR on Pro plan
- **Railway:** Daily backups included
- **DigitalOcean:** Daily backups + on-demand
- **AWS RDS:** Automated backups + snapshots

### Manual Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/autolytiq_$TIMESTAMP.sql.gz"

pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://autolytiq-backups/

# Keep only last 30 days
find $BACKUP_DIR -name "autolytiq_*.sql.gz" -mtime +30 -delete
```

---

## Monitoring

### Database Health Checks

```typescript
// server/health.ts
export async function checkDatabaseHealth() {
  try {
    const result = await db.execute('SELECT 1 as health');
    return {
      status: 'healthy',
      latency: result.duration,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
}

// Endpoint
app.get('/health/db', async (req, res) => {
  const health = await checkDatabaseHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Key Metrics to Monitor

1. **Connection Count**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Slow Queries**
   ```sql
   SELECT query, calls, total_exec_time, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Database Size**
   ```sql
   SELECT pg_size_pretty(pg_database_size('autolytiq'));
   ```

4. **Table Sizes**
   ```sql
   SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

---

## Performance Optimization

### Indexes

```sql
-- Critical indexes for performance
CREATE INDEX idx_customers_dealership ON customers(dealership_id);
CREATE INDEX idx_deals_customer ON deals(customer_id);
CREATE INDEX idx_deals_dealership ON deals(dealership_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);

-- Composite indexes for common queries
CREATE INDEX idx_deals_dealership_status ON deals(dealership_id, status);
CREATE INDEX idx_deals_dealership_created ON deals(dealership_id, created_at DESC);
```

### Query Optimization

```typescript
// ❌ BAD: N+1 query problem
const deals = await db.select().from(schema.deals);
for (const deal of deals) {
  const customer = await db.select()
    .from(schema.customers)
    .where(eq(schema.customers.id, deal.customerId));
}

// ✅ GOOD: Single query with join
const dealsWithCustomers = await db.select()
  .from(schema.deals)
  .leftJoin(schema.customers, eq(schema.customers.id, schema.deals.customerId));
```

---

## Security

### SSL/TLS

```typescript
// Always use SSL in production
import postgres from 'postgres';

const db = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false
});
```

### Least Privilege

```sql
-- Create read-only user for analytics
CREATE USER analytics_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE autolytiq TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;

-- Create app user with limited permissions
CREATE USER autolytiq_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE autolytiq TO autolytiq_app;
GRANT USAGE, CREATE ON SCHEMA public TO autolytiq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO autolytiq_app;
```

---

## Cost Optimization

### Right-Sizing

**Start Small, Scale Up:**
1. **Month 1-3:** Neon Free ($0)
2. **Month 4-6:** Neon Launch ($19) or Railway ($10-15)
3. **Month 6+:** Based on metrics, scale to $50-100/month

### Cost Monitoring

```bash
# Track database costs monthly
echo "Database Cost Tracking" > db_costs.md
echo "Month | Provider | Plan | Actual Cost" >> db_costs.md
echo "Nov 2025 | Neon | Free | $0" >> db_costs.md
```

---

## Setup Checklist

- [ ] Choose database provider (Neon recommended)
- [ ] Create database instance
- [ ] Enable pgvector extension
- [ ] Configure connection pooling
- [ ] Set up automated backups
- [ ] Export data from Replit
- [ ] Import data to new database
- [ ] Update .env with new DATABASE_URL
- [ ] Test connection (npm run db:studio)
- [ ] Run migrations (npm run db:push)
- [ ] Set up monitoring
- [ ] Configure SSL/TLS
- [ ] Create read-only user (if needed)
- [ ] Document connection strings securely

---

## Summary

**Recommendation: Start with Neon**

**Setup:**
```bash
# 1. Create free account at neon.tech
# 2. Create project "autolytiq-production"
# 3. Get connection string
# 4. Enable pgvector:
psql $DATABASE_URL -c "CREATE EXTENSION vector;"

# 5. Update .env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/autolytiq"
DIRECT_DATABASE_URL="$DATABASE_URL"

# 6. Test
npm run db:studio
```

**Cost:** $0 now, $19/month when ready

**Next Steps:**
1. Set up database after completing foundation
2. Export Replit data before shutdown
3. Import to new database
4. Test thoroughly before going live
