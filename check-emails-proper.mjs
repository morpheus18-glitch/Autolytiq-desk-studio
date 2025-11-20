import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import dotenv from 'dotenv';
import { dealershipSettings, emailMessages } from './shared/schema.ts';
import { desc, eq } from 'drizzle-orm';

dotenv.config();

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function checkEmails() {
  try {
    console.log('Checking dealership settings...');
    const dealerships = await db.select().from(dealershipSettings);
    console.log('Dealerships found:', dealerships.length);
    dealerships.forEach(d => {
      console.log(`  - ${d.name}: ${d.email} (ID: ${d.id})`);
    });

    console.log('\nChecking all emails in database...');
    const allEmails = await db.select({
      id: emailMessages.id,
      subject: emailMessages.subject,
      fromAddress: emailMessages.fromAddress,
      folder: emailMessages.folder,
      createdAt: emailMessages.createdAt,
      dealershipId: emailMessages.dealershipId
    }).from(emailMessages).orderBy(desc(emailMessages.createdAt)).limit(10);

    console.log('Total recent emails:', allEmails.length);
    allEmails.forEach(e => {
      console.log(`  - ${e.subject} | From: ${e.fromAddress} | Folder: ${e.folder} | Created: ${e.createdAt}`);
    });

    console.log('\nChecking inbox emails...');
    const inboxEmails = await db.select({
      id: emailMessages.id,
      subject: emailMessages.subject,
      fromAddress: emailMessages.fromAddress,
      createdAt: emailMessages.createdAt
    }).from(emailMessages)
      .where(eq(emailMessages.folder, 'inbox'))
      .orderBy(desc(emailMessages.createdAt))
      .limit(10);

    console.log('Inbox emails:', inboxEmails.length);
    inboxEmails.forEach(e => {
      console.log(`  - ${e.subject} | From: ${e.fromAddress} | Created: ${e.createdAt}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkEmails();