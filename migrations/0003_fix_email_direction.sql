-- Migration: Fix email direction field and backfill existing data
-- Purpose: Properly configure direction field with correct defaults and backfill existing rows
-- Date: November 20, 2025
-- Author: Database Migration System
--
-- This migration is IDEMPOTENT and safe to run multiple times
-- It handles the critical issue where existing emails have NULL direction values

BEGIN;

-- Step 1: Add the direction column if it doesn't exist (idempotent)
-- Using DO block to handle the case where column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'email_messages'
        AND column_name = 'direction'
    ) THEN
        ALTER TABLE email_messages
        ADD COLUMN direction TEXT;
    END IF;
END $$;

-- Step 2: Set a temporary default to handle existing NULL values
-- This ensures all rows have a value before we add NOT NULL constraint
UPDATE email_messages
SET direction = 'outbound'
WHERE direction IS NULL;

-- Step 3: Alter the column to add NOT NULL constraint and default
-- Using DO block to handle cases where constraint might already exist
DO $$
BEGIN
    -- First check if column exists and is already NOT NULL
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'email_messages'
        AND column_name = 'direction'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE email_messages
        ALTER COLUMN direction SET NOT NULL;
    END IF;

    -- Set the default value
    ALTER TABLE email_messages
    ALTER COLUMN direction SET DEFAULT 'outbound';
END $$;

-- Step 4: Intelligently backfill existing data based on folder and other context
-- This is idempotent - we only update rows that need correction
UPDATE email_messages
SET direction = CASE
    -- Emails in inbox folder are typically inbound
    WHEN folder = 'inbox' THEN 'inbound'

    -- Emails in sent folder are always outbound
    WHEN folder = 'sent' THEN 'outbound'

    -- Drafts are always outbound (will be sent)
    WHEN folder = 'drafts' THEN 'outbound'

    -- Trash and archive: determine based on original folder hints
    -- If we have a user_id (sender), it's likely outbound
    -- If no user_id and in trash/archive, likely inbound
    WHEN folder IN ('trash', 'archive') AND user_id IS NOT NULL THEN 'outbound'
    WHEN folder IN ('trash', 'archive') AND user_id IS NULL THEN 'inbound'

    -- Spam is always inbound
    WHEN folder = 'spam' THEN 'inbound'

    -- Default for any other cases
    ELSE 'outbound'
END
WHERE
    -- Only update if the current direction doesn't match what it should be
    direction != CASE
        WHEN folder = 'inbox' THEN 'inbound'
        WHEN folder = 'sent' THEN 'outbound'
        WHEN folder = 'drafts' THEN 'outbound'
        WHEN folder IN ('trash', 'archive') AND user_id IS NOT NULL THEN 'outbound'
        WHEN folder IN ('trash', 'archive') AND user_id IS NULL THEN 'inbound'
        WHEN folder = 'spam' THEN 'inbound'
        ELSE 'outbound'
    END;

-- Step 5: Create indexes for efficient querying (idempotent)
CREATE INDEX IF NOT EXISTS idx_email_messages_direction
ON email_messages(direction);

CREATE INDEX IF NOT EXISTS idx_email_messages_folder_direction
ON email_messages(folder, direction, dealership_id);

CREATE INDEX IF NOT EXISTS idx_email_messages_user_folder_direction
ON email_messages(user_id, folder, direction)
WHERE user_id IS NOT NULL;

-- Step 6: Add helpful comment to document the column
COMMENT ON COLUMN email_messages.direction IS
'Email direction: "inbound" for received emails (via webhook/IMAP), "outbound" for sent emails and drafts. Critical for folder filtering.';

-- Step 7: Analyze the table to update statistics for query planner
ANALYZE email_messages;

COMMIT;

-- Verification queries (commented out, but useful for manual verification)
-- SELECT folder, direction, COUNT(*)
-- FROM email_messages
-- GROUP BY folder, direction
-- ORDER BY folder, direction;

-- SELECT COUNT(*) AS null_direction_count
-- FROM email_messages
-- WHERE direction IS NULL;