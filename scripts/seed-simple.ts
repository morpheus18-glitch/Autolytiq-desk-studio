/**
 * Simple seed script using Drizzle ORM
 * This automatically stays in sync with the schema
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:autolytiq-dev-2024@localhost:5432/autolytiq';

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('\n=== Seeding Database ===\n');

  // 1. Create dealership
  console.log('[1/4] Seeding dealership...');
  const [dealership] = await db.insert(schema.dealerships).values({
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Autolytiq Demo Dealership',
  }).onConflictDoUpdate({
    target: schema.dealerships.id,
    set: { name: 'Autolytiq Demo Dealership' },
  }).returning();

  // 2. Create users
  console.log('[2/4] Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  await db.insert(schema.users).values([
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'admin@autolytiq.com',
      name: 'Admin User',
      passwordHash,
      role: 'admin',
      dealershipId: dealership.id,
    },
    {
      email: 'demo@autolytiq.com',
      name: 'Demo User',
      passwordHash,
      role: 'manager',
      dealershipId: dealership.id,
    },
    {
      email: 'sales@autolytiq.com',
      name: 'Sales Person',
      passwordHash,
      role: 'salesperson',
      dealershipId: dealership.id,
    },
  ]).onConflictDoNothing();

  // 3. Create customers
  console.log('[3/4] Seeding customers...');
  await db.insert(schema.customers).values([
    {
      dealershipId: dealership.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '5551234567',
      addressStreet: '123 Main St',
      addressCity: 'Austin',
      addressState: 'TX',
      addressZip: '78701',
      source: 'walk-in',
    },
    {
      dealershipId: dealership.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@email.com',
      phone: '5559876543',
      addressStreet: '456 Oak Ave',
      addressCity: 'Dallas',
      addressState: 'TX',
      addressZip: '75201',
      source: 'referral',
    },
    {
      dealershipId: dealership.id,
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@email.com',
      phone: '5555555555',
      addressStreet: '789 Pine Rd',
      addressCity: 'Houston',
      addressState: 'TX',
      addressZip: '77001',
      source: 'online',
    },
  ]).onConflictDoNothing();

  // 4. Create vehicles
  console.log('[4/4] Seeding vehicles...');
  await db.insert(schema.vehicles).values([
    {
      dealershipId: dealership.id,
      vin: '1HGCM82633A123456',
      stockNumber: 'A001',
      year: 2024,
      make: 'Honda',
      model: 'Accord',
      trim: 'Sport',
      exteriorColor: 'Modern Steel Metallic',
      interiorColor: 'Black',
      mileage: 12,
      condition: 'new',
      askingPrice: '32500.00',
      cost: '28000.00',
      status: 'available',
    },
    {
      dealershipId: dealership.id,
      vin: '5YJSA1E26HF123456',
      stockNumber: 'A002',
      year: 2023,
      make: 'Tesla',
      model: 'Model S',
      trim: 'Long Range',
      exteriorColor: 'Pearl White',
      interiorColor: 'Black and White',
      mileage: 15420,
      condition: 'used',
      askingPrice: '68900.00',
      cost: '62000.00',
      status: 'available',
    },
    {
      dealershipId: dealership.id,
      vin: '1FTFW1E50MFC12345',
      stockNumber: 'T001',
      year: 2024,
      make: 'Ford',
      model: 'F-150',
      trim: 'Lariat',
      exteriorColor: 'Antimatter Blue',
      interiorColor: 'Black',
      mileage: 8,
      condition: 'new',
      askingPrice: '58900.00',
      cost: '52000.00',
      status: 'available',
    },
  ]).onConflictDoNothing();

  console.log('\n✓ Seeding complete!\n');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
