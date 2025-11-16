import { db } from './server/db';
import { users, dealershipSettings } from './shared/schema';
import { hashPassword } from './server/auth';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  try {
    console.log('🚀 Creating admin user...\n');

    // Check if dealership exists
    const existingDealerships = await db.select().from(dealershipSettings).limit(1);

    let dealershipId: string;

    if (existingDealerships.length === 0) {
      console.log('📦 Creating default dealership...');
      const newDealership = await db.insert(dealershipSettings).values({
        id: 'default',
        name: 'Autolytiq Dealership',
        email: 'support@autolytiq.com',
      }).returning();
      dealershipId = newDealership[0].id;
      console.log('✅ Dealership created\n');
    } else {
      dealershipId = existingDealerships[0].id;
      console.log(`✅ Using existing dealership: ${existingDealerships[0].name}\n`);
    }

    // Check if admin exists
    const existingAdmin = await db.select().from(users).where(
      eq(users.username, 'admin@autolytiq.com')
    ).limit(1);

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email: admin@autolytiq.com');
      console.log('🔑 If you forgot the password, delete this user from the database and run this script again.\n');
      process.exit(0);
    }

    // Create admin user
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword('Admin123!');

    console.log('💾 Creating admin user in database...');
    await db.insert(users).values({
      username: 'admin@autolytiq.com',
      email: 'admin@autolytiq.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      dealershipId,
      isActive: true,
    });

    console.log('\n✅ SUCCESS! Admin user created!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@autolytiq.com');
    console.log('🔑 Password: Admin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Change this password immediately after login!');
    console.log('   Go to Settings → Account → Change Password\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR creating admin user:');
    console.error(error);
    console.error('\nPossible causes:');
    console.error('  - Database connection failed (check DATABASE_URL)');
    console.error('  - Database schema not created (run: npm run db:push)');
    console.error('  - Network connectivity issues\n');
    process.exit(1);
  }
}

createAdmin();
