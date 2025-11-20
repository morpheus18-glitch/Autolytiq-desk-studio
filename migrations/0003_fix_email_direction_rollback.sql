-- Rollback Migration: Revert email direction field changes
-- Purpose: Safely rollback the direction field migration if needed
-- Date: November 20, 2025
--
-- WARNING: Only use this if you need to rollback the migration
-- This will remove the direction-based filtering capability

BEGIN;

-- Step 1: Drop the indexes created by the migration
DROP INDEX IF EXISTS idx_email_messages_user_folder_direction;
DROP INDEX IF EXISTS idx_email_messages_folder_direction;
DROP INDEX IF EXISTS idx_email_messages_direction;

-- Step 2: Remove the comment
COMMENT ON COLUMN email_messages.direction IS NULL;

-- Step 3: Set all direction values to NULL (original state)
-- Note: We keep the column but nullify values to match original state
UPDATE email_messages
SET direction = NULL;

-- Step 4: Remove the default constraint
ALTER TABLE email_messages
ALTER COLUMN direction DROP DEFAULT;

-- Step 5: Allow NULL values again
ALTER TABLE email_messages
ALTER COLUMN direction DROP NOT NULL;

-- Note: We don't drop the column entirely as the application code
-- may still reference it. This rollback puts it in a neutral state.

COMMIT;

-- Verification
-- SELECT COUNT(*) AS emails_with_null_direction
-- FROM email_messages
-- WHERE direction IS NULL;