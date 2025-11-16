// Simple admin creation using standard pg library (no WebSocket)
const { Client } = require('pg');
const crypto = require('crypto');

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Create dealership
    console.log('📦 Creating dealership...');
    await client.query(`
      INSERT INTO dealership_settings (id, name, email)
      VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Dealership ready\n');

    // Generate password hash
    console.log('🔐 Generating password hash...');
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.scryptSync('Admin123!', Buffer.from(salt, 'hex'), 64).toString('hex');
    const passwordHash = salt + ':' + key;
    console.log('✅ Password hashed\n');

    // Delete existing admin if any
    console.log('🗑️  Removing any existing admin user...');
    await client.query(`DELETE FROM users WHERE username = 'admin@autolytiq.com'`);
    console.log('✅ Cleaned up\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    await client.query(`
      INSERT INTO users (
        username, email, password, role,
        first_name, last_name, dealership_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'admin@autolytiq.com',
      'admin@autolytiq.com',
      passwordHash,
      'admin',
      'Admin',
      'User',
      'default',
      true
    ]);
    console.log('✅ Admin user created!\n');

    // Verify
    const result = await client.query(`
      SELECT username, email, role, is_active
      FROM users
      WHERE username = 'admin@autolytiq.com'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified in database:');
      console.log('   Username:', result.rows[0].username);
      console.log('   Email:', result.rows[0].email);
      console.log('   Role:', result.rows[0].role);
      console.log('   Active:', result.rows[0].is_active);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@autolytiq.com');
    console.log('🔑 Password: Admin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: https://autolytiq.com\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.end();
  }
}

createAdmin();
