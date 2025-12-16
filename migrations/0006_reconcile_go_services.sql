-- Migration: Reconcile database schema with Go service expectations
-- This adds missing columns that Go services expect while keeping existing data

-- ============================================================================
-- CUSTOMERS TABLE: Add columns Go service expects
-- ============================================================================

-- Add legacy address columns (Go expects these names)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Sync data from new columns to legacy columns
UPDATE customers
SET
  address = address_street,
  city = address_city,
  state = address_state,
  zip_code = address_zip
WHERE address IS NULL;

-- Add encryption-related columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_score INTEGER,
  ADD COLUMN IF NOT EXISTS ssn_last4 TEXT,
  ADD COLUMN IF NOT EXISTS drivers_license_number TEXT,
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS ssn_last4_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS drivers_license_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS credit_score_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS monthly_income_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS pii_encryption_version TEXT DEFAULT 'v1';

-- ============================================================================
-- USERS TABLE: Add auth-service columns
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
  ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT,
  ADD COLUMN IF NOT EXISTS mfa_failed_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mfa_last_attempt TIMESTAMP;

-- Split name into first_name and last_name for existing users
UPDATE users
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1
    THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL AND name IS NOT NULL;

-- ============================================================================
-- VEHICLES TABLE: Ensure compatibility
-- ============================================================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- ============================================================================
-- DEALS TABLE: Add any missing columns
-- ============================================================================

-- Deals table looks complete based on schema audit
