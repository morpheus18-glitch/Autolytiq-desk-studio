-- EMERGENCY HOTFIX: Fix Email Direction Field
-- Purpose: Immediate fix for broken email folders due to NULL direction values
-- This script can be run directly against the production database
--
-- IMPORTANT: This is safe to run multiple times and will not damage existing data
-- Run this IMMEDIATELY to restore email functionality

-- Quick fix to ensure all emails have a direction value
UPDATE email_messages
SET direction = CASE
    WHEN folder = 'inbox' THEN 'inbound'
    WHEN folder = 'sent' THEN 'outbound'
    WHEN folder = 'drafts' THEN 'outbound'
    WHEN folder IN ('trash', 'archive') AND user_id IS NOT NULL THEN 'outbound'
    WHEN folder IN ('trash', 'archive') AND user_id IS NULL THEN 'inbound'
    WHEN folder = 'spam' THEN 'inbound'
    ELSE 'outbound'
END
WHERE direction IS NULL OR direction = '';

-- Verify the fix
SELECT
    folder,
    direction,
    COUNT(*) as email_count,
    COUNT(CASE WHEN direction IS NULL THEN 1 END) as null_count
FROM email_messages
GROUP BY folder, direction
ORDER BY folder, direction;