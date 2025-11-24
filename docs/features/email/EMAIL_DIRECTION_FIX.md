# Email Direction Field Fix Documentation

## Problem Summary

The email system was broken due to a critical issue with the `direction` field in the `email_messages` table:

1. **Schema Issue**: The `direction` column was added to the schema with a default value, but existing rows in the database had NULL values
2. **Filtering Issue**: The application code filters emails by `direction='outbound'` for sent folder and `direction='inbound'` for inbox
3. **Result**: All email folders appeared empty because no emails matched the filter conditions

## Root Cause

When the `direction` column was added to support inbound/outbound email filtering:
- New emails would get the default value `'outbound'`
- Existing emails retained NULL values
- The WHERE clause `direction='outbound'` doesn't match NULL values
- Result: Empty folders

## Solution Overview

### 1. Immediate Hotfix (Production Emergency)

Run one of these options to fix the issue immediately:

#### Option A: Direct SQL (Fastest)
```bash
# Connect to your database and run:
psql $DATABASE_URL < scripts/emergency-fix-email-direction.sql
```

#### Option B: Node.js Script (Safer, with verification)
```bash
node scripts/fix-email-direction.mjs
```

### 2. Proper Migration (For permanent fix)

Run the migration through your normal deployment process:
```bash
# Using drizzle-kit
npx drizzle-kit push:pg

# Or apply the migration directly
psql $DATABASE_URL < migrations/0003_fix_email_direction.sql
```

## Files Created

### 1. `/migrations/0003_fix_email_direction.sql`
- **Purpose**: Proper migration file with full safety checks
- **Features**:
  - Idempotent (safe to run multiple times)
  - Adds column if missing
  - Sets NOT NULL constraint
  - Intelligently backfills based on folder
  - Creates performance indexes
  - Includes documentation

### 2. `/scripts/emergency-fix-email-direction.sql`
- **Purpose**: Quick SQL hotfix for immediate production fix
- **Usage**: Run directly against database
- **Safety**: Only updates NULL values, preserves existing data

### 3. `/scripts/fix-email-direction.mjs`
- **Purpose**: Node.js script with verification and reporting
- **Features**:
  - Shows before/after statistics
  - Verifies the fix worked
  - Displays sample emails
  - Error handling and rollback info

### 4. `/migrations/0003_fix_email_direction_rollback.sql`
- **Purpose**: Rollback script if needed
- **Usage**: Only if you need to revert the migration

## Backfill Logic

The migration uses intelligent logic to determine email direction:

| Folder   | Direction | Logic                                    |
|----------|-----------|------------------------------------------|
| inbox    | inbound   | Received emails always go to inbox      |
| sent     | outbound  | Sent folder only contains sent emails   |
| drafts   | outbound  | Drafts will be sent (outbound)          |
| trash    | varies    | Based on user_id presence               |
| archive  | varies    | Based on user_id presence               |
| spam     | inbound   | Spam is always received mail            |

For trash/archive folders:
- If `user_id` is present → `outbound` (user sent it)
- If `user_id` is NULL → `inbound` (received email)

## Verification

After running the fix, verify it worked:

### Check email counts by folder and direction:
```sql
SELECT
    folder,
    direction,
    COUNT(*) as count
FROM email_messages
GROUP BY folder, direction
ORDER BY folder, direction;
```

### Check for any remaining NULL values:
```sql
SELECT COUNT(*)
FROM email_messages
WHERE direction IS NULL;
```

Result should be 0.

### Test in application:
1. Navigate to Inbox - should show received emails
2. Navigate to Sent - should show sent emails
3. Navigate to Drafts - should show draft emails

## Prevention

To prevent this issue in the future:

1. **Migration Testing**: Always test migrations against a copy of production data
2. **Backfill Strategy**: When adding new required columns, always include backfill logic
3. **Default Values**: Consider nullable columns with application-level defaults during transition
4. **Monitoring**: Add alerts for unexpected empty result sets

## Performance Considerations

The migration creates three indexes:
1. `idx_email_messages_direction` - For filtering by direction
2. `idx_email_messages_folder_direction` - Composite for folder+direction queries
3. `idx_email_messages_user_folder_direction` - For user-specific folder queries

These indexes ensure queries remain performant even with large email volumes.

## Rollback Procedure

If you need to rollback (not recommended):

```bash
psql $DATABASE_URL < migrations/0003_fix_email_direction_rollback.sql
```

Note: Rolling back will break email folder filtering again.

## Support

If you encounter issues:
1. Check the verification queries above
2. Review application logs for SQL errors
3. Ensure the database user has ALTER TABLE permissions
4. Contact database team if indexes fail to create

## Timeline

- **Issue Detected**: Email folders showing empty
- **Root Cause Found**: NULL direction values not matching filters
- **Fix Deployed**: Migration 0003_fix_email_direction.sql
- **Verification**: All folders now showing correct emails