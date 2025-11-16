import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🚀 Creating admin user in production database...\n');

    // Create dealership if needed
    await pool.query(`
      INSERT INTO dealership_settings (id, name, email)
      VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Dealership ready\n');

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword('Admin123!');

    // Create admin user
    console.log('💾 Creating user in database...');
    const result = await pool.query(`
      INSERT INTO users (
        username, email, password, role,
        first_name, last_name, dealership_id, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, email
    `, [
      'admin@autolytiq.com',
      'admin@autolytiq.com',
      hashedPassword,
      'admin',
      'Admin',
      'User',
      'default',
      true
    ]);

    if (result.rowCount > 0) {
      console.log('\n✅ SUCCESS! Admin user created!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:    admin@autolytiq.com');
      console.log('🔑 Password: Admin123!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER LOGIN!\n');
    } else {
      console.log('\n⚠️  Admin user already exists!');
      console.log('📧 Email: admin@autolytiq.com\n');
      console.log('If you forgot the password, delete the user first:');
      console.log('  1. Go to https://console.neon.tech');
      console.log('  2. Open SQL Editor');
      console.log('  3. Run: DELETE FROM users WHERE username = \'admin@autolytiq.com\';');
      console.log('  4. Run this script again\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nCheck:');
    console.error('  - DATABASE_URL is set in Replit Secrets');
    console.error('  - Database schema exists (run: npm run db:push)');
    console.error('  - Network connectivity to Neon database\n');
  } finally {
    await pool.end();
  }
}

createAdmin();
