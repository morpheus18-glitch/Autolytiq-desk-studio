-- Migration: Drop plaintext PII columns after encryption migration is complete
-- WARNING: Only run this migration after ALL data has been migrated to encrypted columns
-- and verified. This is an irreversible operation.

-- Pre-flight checks (these will fail if data hasn't been migrated)
DO $$
DECLARE
    unmigrated_count INTEGER;
BEGIN
    -- Check for rows that haven't been migrated
    SELECT COUNT(*) INTO unmigrated_count
    FROM customers
    WHERE pii_encryption_version IS NULL
      AND (ssn_last4 IS NOT NULL
           OR drivers_license_number IS NOT NULL
           OR credit_score IS NOT NULL
           OR monthly_income IS NOT NULL);

    IF unmigrated_count > 0 THEN
        RAISE EXCEPTION 'Cannot drop plaintext columns: % rows have not been migrated to encrypted columns', unmigrated_count;
    END IF;
END $$;

-- Step 1: Drop the plaintext columns
ALTER TABLE customers
    DROP COLUMN IF EXISTS ssn_last4,
    DROP COLUMN IF EXISTS drivers_license_number,
    DROP COLUMN IF EXISTS credit_score,
    DROP COLUMN IF EXISTS monthly_income;

-- Step 2: Rename encrypted columns to original names for backward compatibility
ALTER TABLE customers
    RENAME COLUMN ssn_last4_encrypted TO ssn_last4;

ALTER TABLE customers
    RENAME COLUMN drivers_license_number_encrypted TO drivers_license_number;

ALTER TABLE customers
    RENAME COLUMN credit_score_encrypted TO credit_score;

ALTER TABLE customers
    RENAME COLUMN monthly_income_encrypted TO monthly_income;

-- Step 3: Drop the migration tracking index (no longer needed)
DROP INDEX IF EXISTS idx_customers_pii_encryption_version;

-- Step 4: Update column comments
COMMENT ON COLUMN customers.ssn_last4 IS 'AES-256-GCM encrypted SSN last 4 digits';
COMMENT ON COLUMN customers.drivers_license_number IS 'AES-256-GCM encrypted drivers license number';
COMMENT ON COLUMN customers.credit_score IS 'AES-256-GCM encrypted credit score';
COMMENT ON COLUMN customers.monthly_income IS 'AES-256-GCM encrypted monthly income';
