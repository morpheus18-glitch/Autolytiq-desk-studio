import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkEmails() {
  try {
    console.log('Checking dealership settings...');
    const dealerships = await sql`SELECT id, name, email FROM dealership_settings`;
    console.log('Dealerships:', dealerships);

    console.log('\nChecking emails in database...');
    const emails = await sql`SELECT id, subject, from_address, folder, created_at FROM email_messages ORDER BY created_at DESC LIMIT 10`;
    console.log('Recent emails:', emails);

    console.log('\nChecking inbox emails...');
    const inboxEmails = await sql`SELECT id, subject, from_address, created_at FROM email_messages WHERE folder = 'inbox' ORDER BY created_at DESC LIMIT 10`;
    console.log('Inbox emails:', inboxEmails);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmails();