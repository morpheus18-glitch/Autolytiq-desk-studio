#!/usr/bin/env node

/**
 * Email Direction Status Check
 *
 * This script checks the current state of email direction values
 * to diagnose issues with empty email folders.
 *
 * Usage:
 *   node scripts/check-email-direction.mjs
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function checkEmailDirection() {
  try {
    const queryClient = neon(process.env.DATABASE_URL);
    const db = drizzle(queryClient);

    console.log('📧 Email Direction Status Check\n');
    console.log('=' .repeat(60));

    // Check total email count
    const totalEmails = await db.execute(sql`
      SELECT COUNT(*) as total FROM email_messages
    `);
    console.log(`\n📊 Total emails in database: ${totalEmails.rows[0].total}`);

    // Check for NULL direction values
    const nullDirections = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM email_messages
      WHERE direction IS NULL OR direction = ''
    `);

    const nullCount = nullDirections.rows[0].count;
    if (nullCount > 0) {
      console.log(`\n⚠️  WARNING: ${nullCount} emails have NULL or empty direction!`);
      console.log('   This will cause folders to appear empty.');
      console.log('   Run: node scripts/fix-email-direction.mjs to fix\n');
    } else {
      console.log('\n✅ All emails have direction values set\n');
    }

    // Show breakdown by folder and direction
    console.log('📁 Email Distribution by Folder and Direction:');
    console.log('-' .repeat(60));

    const distribution = await db.execute(sql`
      SELECT
        folder,
        direction,
        COUNT(*) as count
      FROM email_messages
      GROUP BY folder, direction
      ORDER BY folder, direction
    `);

    // Format as a nice table
    const folders = {};
    distribution.rows.forEach(row => {
      if (!folders[row.folder]) {
        folders[row.folder] = {};
      }
      folders[row.folder][row.direction || 'NULL'] = row.count;
    });

    // Display the table
    Object.entries(folders).forEach(([folder, directions]) => {
      console.log(`\n${folder.toUpperCase()}:`);
      Object.entries(directions).forEach(([direction, count]) => {
        const icon = direction === 'NULL' ? '⚠️ ' : '  ';
        console.log(`  ${icon}${direction}: ${count} emails`);
      });
    });

    // Check what queries would return
    console.log('\n🔍 Query Results (what the app sees):');
    console.log('-' .repeat(60));

    const inboxQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM email_messages
      WHERE folder = 'inbox' AND direction = 'inbound'
    `);
    console.log(`Inbox (folder='inbox' AND direction='inbound'): ${inboxQuery.rows[0].count} emails`);

    const sentQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM email_messages
      WHERE folder = 'sent' AND direction = 'outbound'
    `);
    console.log(`Sent (folder='sent' AND direction='outbound'): ${sentQuery.rows[0].count} emails`);

    const draftsQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM email_messages
      WHERE folder = 'drafts' AND direction = 'outbound'
    `);
    console.log(`Drafts (folder='drafts' AND direction='outbound'): ${draftsQuery.rows[0].count} emails`);

    // Show recent emails as examples
    console.log('\n📋 Recent Emails (last 3):');
    console.log('-' .repeat(60));

    const recentEmails = await db.execute(sql`
      SELECT
        id,
        folder,
        direction,
        subject,
        created_at
      FROM email_messages
      ORDER BY created_at DESC
      LIMIT 3
    `);

    recentEmails.rows.forEach(email => {
      const directionDisplay = email.direction || 'NULL ⚠️';
      console.log(`\n[${email.folder}] ${email.subject || '(no subject)'}`);
      console.log(`  Direction: ${directionDisplay}`);
      console.log(`  Created: ${new Date(email.created_at).toLocaleString()}`);
    });

    // Final recommendation
    console.log('\n' + '=' .repeat(60));
    if (nullCount > 0) {
      console.log('\n🔧 ACTION REQUIRED:');
      console.log('   Your email folders are likely showing as empty.');
      console.log('   Fix this by running:');
      console.log('   > node scripts/fix-email-direction.mjs\n');
    } else {
      console.log('\n✅ Email system appears to be functioning correctly.\n');
    }

  } catch (error) {
    console.error('\n❌ Error checking email direction:', error);
    process.exit(1);
  }
}

checkEmailDirection().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});