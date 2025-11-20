#!/usr/bin/env node

import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkInboxEmails() {
  try {
    console.log('Checking Inbox Emails\n');
    console.log('=====================\n');

    // Get dealership ID
    const dealershipResult = await pool.query('SELECT id, name FROM dealership_settings LIMIT 1');
    if (dealershipResult.rows.length === 0) {
      console.error('❌ No dealership found');
      process.exit(1);
    }
    const dealership = dealershipResult.rows[0];
    console.log('Dealership:', dealership.name);
    console.log('Dealership ID:', dealership.id);

    // Check inbox emails
    console.log('\n📥 Inbox Emails (last 10):');
    const inboxResult = await pool.query(`
      SELECT
        id,
        from_address,
        subject,
        folder,
        user_id,
        created_at,
        html_body IS NOT NULL as has_html,
        text_body IS NOT NULL as has_text
      FROM email_messages
      WHERE dealership_id = $1
        AND folder = 'inbox'
      ORDER BY created_at DESC
      LIMIT 10
    `, [dealership.id]);

    if (inboxResult.rows.length === 0) {
      console.log('   No emails in inbox');
    } else {
      inboxResult.rows.forEach(email => {
        console.log(`   ---`);
        console.log(`   From: ${email.from_address}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   User ID: ${email.user_id || 'NULL (inbound)'}`);
        console.log(`   Has HTML: ${email.has_html ? 'Yes' : 'No'}`);
        console.log(`   Has Text: ${email.has_text ? 'Yes' : 'No'}`);
        console.log(`   Created: ${email.created_at}`);
      });
    }

    // Check ALL recent emails
    console.log('\n📧 All Recent Emails (last 10):');
    const allResult = await pool.query(`
      SELECT
        folder,
        COUNT(*) as count
      FROM email_messages
      WHERE dealership_id = $1
      GROUP BY folder
      ORDER BY folder
    `, [dealership.id]);

    console.log('   Email counts by folder:');
    allResult.rows.forEach(row => {
      console.log(`   ${row.folder}: ${row.count}`);
    });

    // Check last webhook-saved email
    console.log('\n🔍 Last Email with NULL user_id (webhook emails):');
    const webhookResult = await pool.query(`
      SELECT
        id,
        from_address,
        subject,
        folder,
        created_at
      FROM email_messages
      WHERE dealership_id = $1
        AND user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `, [dealership.id]);

    if (webhookResult.rows.length === 0) {
      console.log('   No webhook emails found');
    } else {
      webhookResult.rows.forEach(email => {
        console.log(`   [${email.folder}] "${email.subject}" from ${email.from_address} at ${email.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkInboxEmails();