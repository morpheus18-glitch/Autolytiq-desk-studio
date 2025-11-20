#!/usr/bin/env node

/**
 * Emergency Fix Script for Email Direction Field
 *
 * This script fixes the critical issue where email_messages table has NULL
 * direction values, causing email folders to appear empty.
 *
 * Usage:
 *   node scripts/fix-email-direction.mjs
 *
 * Or make it executable and run directly:
 *   chmod +x scripts/fix-email-direction.mjs
 *   ./scripts/fix-email-direction.mjs
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function fixEmailDirection() {
  console.log('🔧 Starting Email Direction Fix...\n');

  try {
    // Create database connection
    const queryClient = neon(process.env.DATABASE_URL);
    const db = drizzle(queryClient);

    // Step 1: Check current state
    console.log('📊 Checking current email state...');
    const beforeStats = await db.execute(sql`
      SELECT
        folder,
        direction,
        COUNT(*) as count
      FROM email_messages
      GROUP BY folder, direction
      ORDER BY folder, direction
    `);

    console.log('\nBefore fix:');
    console.table(beforeStats.rows);

    const nullCount = await db.execute(sql`
      SELECT COUNT(*) as null_count
      FROM email_messages
      WHERE direction IS NULL OR direction = ''
    `);

    const totalNulls = nullCount.rows[0]?.null_count || 0;
    console.log(`\n⚠️  Found ${totalNulls} emails with NULL or empty direction\n`);

    if (totalNulls === 0) {
      console.log('✅ No emails need fixing - all have direction values!');
      return;
    }

    // Step 2: Apply the fix
    console.log('🔨 Applying direction fix based on folder logic...');

    const updateResult = await db.execute(sql`
      UPDATE email_messages
      SET direction = CASE
        -- Emails in inbox are inbound
        WHEN folder = 'inbox' THEN 'inbound'

        -- Emails in sent folder are outbound
        WHEN folder = 'sent' THEN 'outbound'

        -- Drafts are outbound (will be sent)
        WHEN folder = 'drafts' THEN 'outbound'

        -- Trash/archive: check if has user_id (sender)
        WHEN folder IN ('trash', 'archive') AND user_id IS NOT NULL THEN 'outbound'
        WHEN folder IN ('trash', 'archive') AND user_id IS NULL THEN 'inbound'

        -- Spam is always inbound
        WHEN folder = 'spam' THEN 'inbound'

        -- Default to outbound for any other cases
        ELSE 'outbound'
      END
      WHERE direction IS NULL OR direction = ''
    `);

    console.log(`\n✅ Updated ${updateResult.rowCount} email records\n`);

    // Step 3: Verify the fix
    console.log('📊 Verifying the fix...');
    const afterStats = await db.execute(sql`
      SELECT
        folder,
        direction,
        COUNT(*) as count
      FROM email_messages
      GROUP BY folder, direction
      ORDER BY folder, direction
    `);

    console.log('\nAfter fix:');
    console.table(afterStats.rows);

    // Step 4: Final verification
    const stillNullCount = await db.execute(sql`
      SELECT COUNT(*) as null_count
      FROM email_messages
      WHERE direction IS NULL OR direction = ''
    `);

    const remainingNulls = stillNullCount.rows[0]?.null_count || 0;

    if (remainingNulls === 0) {
      console.log('\n✅ SUCCESS! All emails now have direction values.');
      console.log('📧 Email folders should now display correctly.');
    } else {
      console.error(`\n⚠️  WARNING: ${remainingNulls} emails still have NULL direction.`);
      console.error('Please investigate these records manually.');
    }

    // Step 5: Show sample emails for verification
    console.log('\n📋 Sample emails after fix (first 5 from each folder):');

    const folders = ['inbox', 'sent', 'drafts'];
    for (const folder of folders) {
      const samples = await db.execute(sql`
        SELECT
          id,
          folder,
          direction,
          subject,
          created_at
        FROM email_messages
        WHERE folder = ${folder}
        ORDER BY created_at DESC
        LIMIT 5
      `);

      if (samples.rows.length > 0) {
        console.log(`\n${folder.toUpperCase()}:`);
        samples.rows.forEach(email => {
          console.log(`  - [${email.direction}] ${email.subject || '(no subject)'}`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Error fixing email direction:', error);
    console.error('\nPlease check your database connection and try again.');
    process.exit(1);
  }
}

// Run the fix
fixEmailDirection().then(() => {
  console.log('\n🎉 Email direction fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});