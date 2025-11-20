import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { dealershipSettings } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Use the Neon database URL from .env file
const DATABASE_URL = 'postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

async function fixDealershipEmail() {
  try {
    console.log('Updating dealership with email address...');

    const dealershipId = 'fa136a38-696a-47b6-ac26-c184cc6ebe46';

    // Update the dealership with the support email
    const updated = await db.update(dealershipSettings)
      .set({
        name: 'Autolytiq Demo Dealership',
        email: 'support@autolytiq.com'
      })
      .where(eq(dealershipSettings.id, dealershipId))
      .returning();

    if (updated.length > 0) {
      console.log('✅ Successfully updated dealership:');
      console.log(`   Name: ${updated[0].name}`);
      console.log(`   Email: ${updated[0].email}`);
      console.log(`   ID: ${updated[0].id}`);
    } else {
      console.log('❌ Failed to update dealership');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

fixDealershipEmail();