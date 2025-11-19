# Database Schema Fixes - November 19, 2025

## Summary
Fixed critical database schema mismatches that were causing 500 errors in the application. The schema definitions in `shared/schema.ts` had evolved beyond the actual database structure. Added appointments table integration for scheduling functionality.

## Issues Fixed

### 1. Missing Columns in `deal_scenarios` Table
**Problem**: Drizzle ORM expected 9 lease-specific columns that didn't exist in the database.
**Error**: `column deals_scenarios.msrp does not exist`

**Columns Added**:
```sql
ALTER TABLE deal_scenarios
ADD COLUMN IF NOT EXISTS msrp NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_fee NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_fee_capitalized BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS doc_fee_capitalized BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS government_fees JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cash_down NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS manufacturer_rebate NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_incentives NUMERIC(12,2) DEFAULT 0;
```

### 2. Column Name Mismatch in `customer_notes` Table
**Problem**: Schema defined `content` but database had `note_text`.
**Error**: `column "content" does not exist`

**Fix Applied**:
```sql
-- Rename column to match schema
ALTER TABLE customer_notes 
RENAME COLUMN note_text TO content;

-- Add missing dealId column
ALTER TABLE customer_notes
ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
```

### 3. Missing `status` Column in `customers` Table (Fixed Earlier)
**Problem**: Schema defined `status` column but database didn't have it.
**Error**: Drizzle ORM failed when loading customer relations.

**Fix Applied**:
```sql
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'prospect';
```

## Migration Strategy

Due to **Replit 2GB RAM constraints** and **Drizzle migration journal drift**, the recommended approach is:

1. **For Immediate Fixes**: Use manual SQL via `execute_sql_tool`
2. **For CI/CD**: Use `drizzle-kit push --yes --force` after schema validation
3. **For Production**: Generate proper migrations with `drizzle-kit generate` when RAM allows

## Impact

**Before Fix**:
- ❌ GET /api/deals returned 500 errors
- ❌ GET /api/customers/:id/notes returned 500 errors  
- ❌ Deal creation failed with "msrp column does not exist"
- ❌ Customer relations couldn't load

**After Fix**:
- ✅ All API endpoints working
- ✅ Application running successfully on port 5000
- ✅ Customer relations loading correctly
- ✅ Deal scenarios storing lease-specific data

### 4. Appointments Table Integration (November 19, 2025)
**Problem**: Drizzle schema had appointments table defined but needed database table creation.

**Fix Applied**:
```sql
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "customer_id" uuid,
    "user_id" uuid NOT NULL,
    "dealership_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "appointment_type" text NOT NULL DEFAULT 'consultation',
    "scheduled_at" timestamp NOT NULL,
    "duration" integer NOT NULL DEFAULT 30,
    "end_time" timestamp,
    "status" text NOT NULL DEFAULT 'scheduled',
    "location" text DEFAULT 'dealership',
    "deal_id" uuid,
    "vehicle_id" uuid,
    "reminder_sent" boolean NOT NULL DEFAULT false,
    "confirmation_sent" boolean NOT NULL DEFAULT false,
    "notes" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Added foreign key constraints
ALTER TABLE appointments
ADD CONSTRAINT appointments_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
[... additional foreign keys for user_id, dealership_id, deal_id, vehicle_id]

-- Added indexes for performance
CREATE INDEX appointments_customer_idx ON appointments(customer_id);
CREATE INDEX appointments_user_idx ON appointments(user_id);
CREATE INDEX appointments_dealership_idx ON appointments(dealership_id);
CREATE INDEX appointments_scheduled_at_idx ON appointments(scheduled_at);
CREATE INDEX appointments_status_idx ON appointments(status);
```

**Relations Added**:
- `appointmentsRelations` - Links to customers, users, deals, and vehicles
- Updated `usersRelations` and `customersRelations` to include appointments

## Testing Performed

1. ✅ Verified all columns exist in database
2. ✅ Restarted application - no schema errors
3. ✅ Confirmed API endpoints return 200/304 (or 401 for unauth)
4. ✅ No more "column does not exist" errors in logs
5. ✅ Appointments table created with all 19 columns
6. ✅ All foreign key constraints properly configured
7. ✅ All indexes created for query performance

## Architect Review

Architect confirmed:
- ✅ Runtime functionality restored
- ⚠️ Manual SQL bypassed Drizzle's migration journal (expected trade-off)
- ⚠️ Database Push workflow still blocks on interactive prompts (requires `--yes --force`)
- ✅ 139 failing tax tests are expected given CALCULATION_ISSUES_CRITICAL.md

## Recommendations

1. **Schema Validation**: Implement nightly `drizzle-kit pull --destination tmp` with diff checking
2. **Migration Reconciliation**: Generate migration file to capture these fixes when RAM allows
3. **Prevent Drift**: Add pre-commit hook to validate schema matches database before allowing changes
4. **Documentation**: Keep this file updated with all manual schema changes

## Related Files
- `shared/schema.ts` - Schema definitions (source of truth)
- `server/storage.ts` - Database access layer
- `CALCULATION_ISSUES_CRITICAL.md` - Documents why tax tests are failing
- `replit.md` - Updated with migration workflow workaround
