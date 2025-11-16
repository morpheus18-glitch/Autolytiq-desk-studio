import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function fixAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Checking for admin user...\n');

    // Check if admin user exists
    const checkResult = await pool.query(`
      SELECT id, username, email, role, is_active, password
      FROM users
      WHERE username = 'admin@autolytiq.com'
    `);

    if (checkResult.rowCount === 0) {
      console.log('❌ Admin user does NOT exist in database!\n');
      console.log('Creating admin user...\n');

      // Create dealership if needed
      await pool.query(`
        INSERT INTO dealership_settings (id, name, email)
        VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
        ON CONFLICT (id) DO NOTHING
      `);

      // Hash password
      const hashedPassword = await hashPassword('Admin123!');

      // Create admin user
      await pool.query(`
        INSERT INTO users (
          username, email, password, role,
          first_name, last_name, dealership_id, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

      console.log('✅ Admin user created!\n');
    } else {
      const user = checkResult.rows[0];
      console.log('✅ Admin user EXISTS in database:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
      console.log('');

      // Check if password hash looks correct (should be salt:hash format)
      const passwordParts = user.password.split(':');
      if (passwordParts.length !== 2) {
        console.log('⚠️  Password hash format looks WRONG!');
        console.log('   Expected format: salt:hash (two parts separated by colon)');
        console.log(`   Got: ${passwordParts.length} part(s)\n`);
        console.log('🔧 Fixing password hash...\n');
      } else {
        console.log('✅ Password hash format looks correct\n');
        console.log('🔧 Resetting password anyway to be sure...\n');
      }

      // Reset password to known value
      const hashedPassword = await hashPassword('Admin123!');

      await pool.query(`
        UPDATE users
        SET password = $1, updated_at = NOW()
        WHERE username = 'admin@autolytiq.com'
      `, [hashedPassword]);

      console.log('✅ Password has been reset!\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@autolytiq.com');
    console.log('🔑 Password: Admin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Try logging in now at https://autolytiq.com\n');
    console.log('If login still fails, check:');
    console.log('  1. Browser console (F12) for errors');
    console.log('  2. Replit console logs for authentication errors');
    console.log('  3. Make sure you\'re using the correct URL\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();
