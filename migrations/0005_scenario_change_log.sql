-- Migration: Add Scenario Change Log for Complete Audit Trail
-- Created: 2025-11-21
-- Description: Granular audit trail for every scenario field change to enable playback, rollback, and compliance

CREATE TABLE IF NOT EXISTS "scenario_change_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "scenario_id" UUID NOT NULL REFERENCES "deal_scenarios"("id") ON DELETE CASCADE,
  "deal_id" UUID NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),

  -- What changed
  "field_name" TEXT NOT NULL, -- e.g., "vehiclePrice", "apr", "term", "monthlyPayment"
  "old_value" TEXT, -- Previous value (NULL for initial creation)
  "new_value" TEXT NOT NULL, -- New value
  "change_type" TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'recalculation')),

  -- Calculation snapshot (for recalculations)
  "calculation_snapshot" JSONB, -- Full calculation breakdown at time of change
  -- Example: {"monthlyPayment": "564.87", "amountFinanced": "30000.00", "totalTax": "2100.00", ...}

  -- Context
  "metadata" JSONB, -- Additional context (IP address, session ID, etc.)
  "timestamp" TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS "scenario_change_log_scenario_idx" ON "scenario_change_log"("scenario_id");
CREATE INDEX IF NOT EXISTS "scenario_change_log_deal_idx" ON "scenario_change_log"("deal_id");
CREATE INDEX IF NOT EXISTS "scenario_change_log_user_idx" ON "scenario_change_log"("user_id");
CREATE INDEX IF NOT EXISTS "scenario_change_log_timestamp_idx" ON "scenario_change_log"("timestamp");
CREATE INDEX IF NOT EXISTS "scenario_change_log_field_idx" ON "scenario_change_log"("field_name");

-- Composite index for common query pattern: scenario + timestamp (for history playback)
CREATE INDEX IF NOT EXISTS "scenario_change_log_scenario_time_idx" ON "scenario_change_log"("scenario_id", "timestamp" DESC);

-- Comment explaining the purpose
COMMENT ON TABLE "scenario_change_log" IS 'Complete audit trail of scenario changes for deal calculation compliance and playback';
COMMENT ON COLUMN "scenario_change_log"."calculation_snapshot" IS 'Full calculation state at time of change - enables exact recreation of deal at any point in time';
COMMENT ON COLUMN "scenario_change_log"."change_type" IS 'create: initial value, update: user change, recalculation: auto-computed field update';
