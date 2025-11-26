-- Migration: Add encrypted PII columns to customers table
-- This migration adds encrypted versions of PII fields for AES-256-GCM encryption at rest
-- The migration is designed to be run incrementally with zero downtime

-- Step 1: Add new encrypted columns (text type to store base64-encoded ciphertext)
-- These columns will store the format: enc:v1:<key_version>:<base64(nonce + ciphertext + tag)>
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS ssn_last4_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS drivers_license_number_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS credit_score_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS monthly_income_encrypted TEXT;

-- Step 2: Add a migration status tracking column
-- This helps track which rows have been migrated
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS pii_encryption_version TEXT DEFAULT NULL;

-- Step 3: Create index for tracking migration progress
CREATE INDEX IF NOT EXISTS idx_customers_pii_encryption_version
    ON customers(pii_encryption_version)
    WHERE pii_encryption_version IS NULL;

-- Step 4: Add comment to document the encryption scheme
COMMENT ON COLUMN customers.ssn_last4_encrypted IS 'AES-256-GCM encrypted SSN last 4 digits. Format: enc:v1:<key_version>:<base64_ciphertext>';
COMMENT ON COLUMN customers.drivers_license_number_encrypted IS 'AES-256-GCM encrypted drivers license number. Format: enc:v1:<key_version>:<base64_ciphertext>';
COMMENT ON COLUMN customers.credit_score_encrypted IS 'AES-256-GCM encrypted credit score (stored as encrypted integer string). Format: enc:v1:<key_version>:<base64_ciphertext>';
COMMENT ON COLUMN customers.monthly_income_encrypted IS 'AES-256-GCM encrypted monthly income (stored as encrypted decimal string). Format: enc:v1:<key_version>:<base64_ciphertext>';
COMMENT ON COLUMN customers.pii_encryption_version IS 'Tracks which encryption key version was used. NULL means data is not yet encrypted.';

-- Note: The actual data migration (encrypting existing plaintext data) must be done
-- by the application code using the encryption service. See the data migration script.
-- After all data is migrated, run migration 0005 to drop the plaintext columns.
