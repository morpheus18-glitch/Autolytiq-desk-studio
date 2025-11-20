import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { emailMessages } from './shared/schema.ts';
import { desc, eq } from 'drizzle-orm';

const DATABASE_URL = 'postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

async function verifyEmails() {
  try {
    console.log('Checking recent inbox emails...\n');

    const inboxEmails = await db.select({
      id: emailMessages.id,
      subject: emailMessages.subject,
      fromAddress: emailMessages.fromAddress,
      fromName: emailMessages.fromName,
      createdAt: emailMessages.createdAt,
      sentAt: emailMessages.sentAt
    }).from(emailMessages)
      .where(eq(emailMessages.folder, 'inbox'))
      .orderBy(desc(emailMessages.createdAt))
      .limit(5);

    console.log(`Found ${inboxEmails.length} recent inbox emails:\n`);

    inboxEmails.forEach((email, index) => {
      console.log(`${index + 1}. "${email.subject}"`);
      console.log(`   From: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}`);
      console.log(`   Created: ${new Date(email.createdAt).toLocaleString()}`);
      console.log(`   Sent: ${email.sentAt ? new Date(email.sentAt).toLocaleString() : 'N/A'}`);
      console.log();
    });

    if (inboxEmails.some(e => e.subject === 'Test Email from Webhook')) {
      console.log('✅ SUCCESS: Test webhook email was successfully saved to the database!');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

verifyEmails();