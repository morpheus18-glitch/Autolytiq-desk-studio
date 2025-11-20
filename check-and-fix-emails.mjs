import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { dealershipSettings, emailMessages } from './shared/schema.ts';
import { desc, eq } from 'drizzle-orm';

// Use the Neon database URL from .env file
const DATABASE_URL = 'postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

async function checkAndFixEmails() {
  try {
    console.log('=== EMAIL SYSTEM DIAGNOSTIC ===\n');

    // 1. Check dealership settings
    console.log('1. Checking dealership settings...');
    const dealerships = await db.select().from(dealershipSettings);
    console.log(`   Found ${dealerships.length} dealership(s)`);

    if (dealerships.length === 0) {
      console.log('   ⚠️  No dealerships found! Creating default dealership...');

      // Create a default dealership with a proper email address
      const newDealership = await db.insert(dealershipSettings).values({
        name: 'Autolytiq Demo Dealership',
        email: 'support@autolytiq.com',
        phone: '(555) 123-4567',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        taxRate: 8.875,
        docFee: 199,
        isActive: true
      }).returning();

      console.log('   ✅ Created default dealership:', newDealership[0].name);
      console.log(`      Email: ${newDealership[0].email}`);
      console.log(`      ID: ${newDealership[0].id}`);
      dealerships.push(newDealership[0]);
    } else {
      dealerships.forEach(d => {
        console.log(`   - ${d.name}`);
        console.log(`     Email: ${d.email || '(no email set)'}`);
        console.log(`     ID: ${d.id}`);

        if (!d.email) {
          console.log('     ⚠️  WARNING: Dealership has no email configured!');
        }
      });
    }

    // 2. Check all emails in database
    console.log('\n2. Checking all emails in database...');
    const allEmails = await db.select({
      id: emailMessages.id,
      subject: emailMessages.subject,
      fromAddress: emailMessages.fromAddress,
      folder: emailMessages.folder,
      createdAt: emailMessages.createdAt,
      dealershipId: emailMessages.dealershipId
    }).from(emailMessages).orderBy(desc(emailMessages.createdAt)).limit(10);

    console.log(`   Found ${allEmails.length} recent email(s)`);
    if (allEmails.length > 0) {
      console.log('   Recent emails:');
      allEmails.forEach(e => {
        console.log(`   - "${e.subject}"`);
        console.log(`     From: ${e.fromAddress} | Folder: ${e.folder}`);
        console.log(`     Dealership: ${e.dealershipId}`);
        console.log(`     Created: ${e.createdAt}`);
      });
    }

    // 3. Check inbox emails specifically
    console.log('\n3. Checking inbox emails...');
    const inboxEmails = await db.select({
      id: emailMessages.id,
      subject: emailMessages.subject,
      fromAddress: emailMessages.fromAddress,
      createdAt: emailMessages.createdAt
    }).from(emailMessages)
      .where(eq(emailMessages.folder, 'inbox'))
      .orderBy(desc(emailMessages.createdAt))
      .limit(10);

    console.log(`   Found ${inboxEmails.length} inbox email(s)`);
    if (inboxEmails.length > 0) {
      console.log('   Inbox emails:');
      inboxEmails.forEach(e => {
        console.log(`   - "${e.subject}" from ${e.fromAddress}`);
      });
    }

    // 4. Summary and recommendations
    console.log('\n=== SUMMARY ===');

    if (dealerships.length === 0 || !dealerships.some(d => d.email)) {
      console.log('❌ CRITICAL: No dealerships with email addresses configured');
      console.log('   - Webhook cannot route emails without dealership email addresses');
      console.log('   - Update dealership settings with proper email addresses');
    } else {
      console.log('✅ Dealerships configured with email addresses');
    }

    if (inboxEmails.length === 0) {
      console.log('⚠️  No emails in inbox');
      console.log('   - Webhook may be failing to save emails');
      console.log('   - Check webhook logs for errors');
      console.log('   - Verify Resend webhook is configured correctly');
    } else {
      console.log('✅ Emails found in inbox');
    }

    console.log('\n=== WEBHOOK CONFIGURATION ===');
    console.log('Webhook URL: https://autolytiq.com/api/webhooks/resend');
    console.log('Expected recipient emails:');
    dealerships.forEach(d => {
      if (d.email) {
        console.log(`  - ${d.email} (routes to ${d.name})`);
      }
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkAndFixEmails();