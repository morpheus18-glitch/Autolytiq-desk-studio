-- Migration: Schema Consistency Improvements
-- Purpose: Add missing columns, constraints, and improve data integrity
-- Risk: Low-Medium (adds columns and constraints, non-breaking)

-- ============================================================================
-- ADD MISSING updatedAt COLUMNS
-- ============================================================================
-- These tables track data changes but lack updatedAt timestamps

ALTER TABLE vehicle_images
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE vehicle_features
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE vehicle_valuations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE vehicle_comparables
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE quick_quote_contacts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE email_attachments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- ============================================================================
-- ADD CHECK CONSTRAINTS FOR ENUM-LIKE COLUMNS
-- ============================================================================
-- Validate that categorical data matches expected values

-- Customer status validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_customer_status'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT check_customer_status
      CHECK (status IN ('prospect', 'qualified', 'active', 'sold', 'lost', 'inactive'));
  END IF;
END $$;

-- Deal state validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_deal_state'
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT check_deal_state
      CHECK (deal_state IN ('DRAFT', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'FUNDED', 'CANCELLED'));
  END IF;
END $$;

-- Vehicle condition validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_vehicle_condition'
  ) THEN
    ALTER TABLE vehicles
      ADD CONSTRAINT check_vehicle_condition
      CHECK (condition IN ('new', 'used', 'certified'));
  END IF;
END $$;

-- Vehicle status validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_vehicle_status'
  ) THEN
    ALTER TABLE vehicles
      ADD CONSTRAINT check_vehicle_status
      CHECK (status IN ('available', 'hold', 'sold', 'in_transit'));
  END IF;
END $$;

-- ============================================================================
-- UPDATE JSONB COLUMNS TO USE PROPER DEFAULTS
-- ============================================================================
-- Ensure JSONB columns have proper array/object defaults

-- This is handled in schema.ts, but let's ensure consistency
-- for any existing null values

UPDATE vehicles SET images = '[]'::jsonb WHERE images IS NULL;
UPDATE vehicles SET features = '[]'::jsonb WHERE features IS NULL;

-- ============================================================================
-- CREATE TRIGGER FOR updatedAt AUTO-UPDATE
-- ============================================================================
-- This trigger automatically updates updatedAt on row modification

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables that need automatic updatedAt management
-- Only add if not exists to prevent errors on re-run

DO $$
DECLARE
  tables text[] := ARRAY[
    'dealership_settings',
    'users',
    'customers',
    'vehicles',
    'deals',
    'deal_scenarios',
    'appointments',
    'lenders',
    'vehicle_images',
    'vehicle_features',
    'vehicle_valuations',
    'vehicle_comparables',
    'email_messages',
    'email_attachments'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'update_' || t || '_updated_at'
    ) THEN
      EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()', t, t);
    END IF;
  END LOOP;
END $$;
