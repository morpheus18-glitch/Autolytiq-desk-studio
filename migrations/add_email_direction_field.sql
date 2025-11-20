-- Migration: Add direction field to email_messages table
-- Purpose: Distinguish between inbound and outbound emails for proper inbox/sent filtering
-- Date: November 20, 2025

-- Add the direction column with default value 'outbound'
ALTER TABLE email_messages
ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';

-- Create index for efficient filtering by direction
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);

-- Update existing emails based on folder
-- Assume emails in inbox are inbound, everything else is outbound
UPDATE email_messages
SET direction = CASE
  WHEN folder = 'inbox' AND user_id IS NULL THEN 'inbound'
  WHEN folder = 'sent' THEN 'outbound'
  WHEN folder = 'drafts' THEN 'outbound'
  ELSE 'outbound'
END
WHERE direction IS NULL OR direction = '';

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_email_messages_folder_direction
ON email_messages(folder, direction, dealership_id);

-- Add comment to document the column
COMMENT ON COLUMN email_messages.direction IS 'Email direction: inbound (received via webhook) or outbound (sent/drafts)';