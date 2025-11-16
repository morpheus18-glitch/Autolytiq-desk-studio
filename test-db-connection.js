// Quick test to verify Neon connection works
import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({ connectionString });

async function testConnection() {
  try {
    console.log('🔗 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful!');
    console.log('   Server time:', result.rows[0].now);

    await client.end();
    console.log('\n🎉 Your Neon database connection is WORKING!');
    console.log('\n📝 Next step: Update DATABASE_URL in Replit Secrets');
    console.log('   Then run: npm run db:push');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
