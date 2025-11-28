/* eslint-disable no-magic-numbers, max-lines-per-function, max-lines, @typescript-eslint/no-unused-vars, no-unused-vars */
/**
 * Comprehensive Seed Data Script for Autolytiq Desk Studio
 *
 * Populates the database with realistic test data for development and testing.
 * Run with: npx tsx scripts/seed-data.ts
 *
 * This script is idempotent - safe to run multiple times.
 */

import pg from 'pg';
const { Pool } = pg;
type PoolClient = pg.PoolClient;
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// ===========================================
// Configuration
// ===========================================

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:autolytiq-dev-2024@localhost:5432/autolytiq';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
});

// ===========================================
// Static IDs for referential integrity
// ===========================================

const DEALERSHIP_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Users - keeping existing admin user ID
const ADMIN_USER_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEMO_USER_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// New user IDs
const userIds = {
  salesManager1: randomUUID(),
  salesManager2: randomUUID(),
  salesManager3: randomUUID(),
  salesperson1: randomUUID(),
  salesperson2: randomUUID(),
  salesperson3: randomUUID(),
  salesperson4: randomUUID(),
  salesperson5: randomUUID(),
};

// Customer IDs
const customerIds: string[] = [];
for (let i = 0; i < 25; i++) {
  customerIds.push(randomUUID());
}

// Vehicle IDs
const vehicleIds: string[] = [];
for (let i = 0; i < 40; i++) {
  vehicleIds.push(randomUUID());
}

// Deal IDs
const dealIds: string[] = [];
for (let i = 0; i < 20; i++) {
  dealIds.push(randomUUID());
}

// Conversation IDs
const conversationIds: string[] = [];
for (let i = 0; i < 8; i++) {
  conversationIds.push(randomUUID());
}

// ===========================================
// Utility Functions
// ===========================================

function log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const symbols = {
    info: '[*]',
    success: '[+]',
    warn: '[!]',
    error: '[-]',
  };
  console.log(`${symbols[type]} ${message}`);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

function generateStockNumber(index: number): string {
  return `STK${String(index + 100).padStart(4, '0')}`;
}

function generatePhone(): string {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${area}) ${prefix}-${line}`;
}

// ===========================================
// Data Definitions
// ===========================================

// Texas cities with zip codes for realistic addresses
const texasCities = [
  { city: 'Houston', zips: ['77001', '77002', '77003', '77004', '77005', '77006', '77007'] },
  { city: 'Dallas', zips: ['75201', '75202', '75203', '75204', '75205', '75206', '75207'] },
  { city: 'Austin', zips: ['78701', '78702', '78703', '78704', '78705', '78721', '78722'] },
  { city: 'San Antonio', zips: ['78201', '78202', '78203', '78204', '78205', '78207', '78208'] },
  { city: 'Fort Worth', zips: ['76101', '76102', '76103', '76104', '76105', '76106', '76107'] },
  { city: 'Arlington', zips: ['76001', '76002', '76003', '76004', '76005', '76006', '76010'] },
  { city: 'Plano', zips: ['75023', '75024', '75025', '75026', '75074', '75075', '75093'] },
  { city: 'Irving', zips: ['75014', '75015', '75016', '75017', '75038', '75039', '75060'] },
  { city: 'Frisco', zips: ['75033', '75034', '75035', '75036'] },
  { city: 'McKinney', zips: ['75069', '75070', '75071', '75072'] },
];

const streetNames = [
  'Main St',
  'Oak Ave',
  'Elm St',
  'Cedar Lane',
  'Maple Dr',
  'Pine Rd',
  'Pecan St',
  'Bluebonnet Way',
  'Ranch Rd',
  'Prairie View Dr',
  'Longhorn Blvd',
  'Congress Ave',
  'Lamar Blvd',
  'Guadalupe St',
  'Travis St',
  'Houston St',
  'Commerce St',
  'Market St',
  'Spring Creek Pkwy',
  'Legacy Dr',
];

const firstNames = [
  'James',
  'Maria',
  'Michael',
  'Jennifer',
  'David',
  'Linda',
  'Robert',
  'Patricia',
  'William',
  'Elizabeth',
  'Carlos',
  'Rosa',
  'Juan',
  'Ana',
  'Jose',
  'Miguel',
  'Sarah',
  'Christopher',
  'Ashley',
  'Matthew',
  'Emily',
  'Daniel',
  'Samantha',
  'Brandon',
  'Nicole',
  'Tyler',
  'Brittany',
  'Kevin',
  'Stephanie',
  'Jason',
];

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Martinez',
  'Rodriguez',
  'Davis',
  'Miller',
  'Wilson',
  'Anderson',
  'Taylor',
  'Thomas',
  'Hernandez',
  'Moore',
  'Jackson',
  'Lee',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Perez',
  'Hall',
  'Young',
];

const customerSources = ['WALK_IN', 'INTERNET', 'REFERRAL', 'PHONE', 'REPEAT'];

// Vehicle data
const vehicleMakes: Record<
  string,
  { models: string[]; trims: string[]; colors: string[]; priceRange: [number, number] }
> = {
  Honda: {
    models: ['Accord', 'Civic', 'CR-V', 'Pilot', 'HR-V', 'Odyssey'],
    trims: ['LX', 'Sport', 'EX', 'EX-L', 'Touring'],
    colors: ['Crystal Black', 'Platinum White', 'Modern Steel', 'Lunar Silver', 'Radiant Red'],
    priceRange: [24000, 48000],
  },
  Toyota: {
    models: ['Camry', 'Corolla', 'RAV4', 'Highlander', '4Runner', 'Tacoma', 'Tundra'],
    trims: ['L', 'LE', 'XLE', 'SE', 'XSE', 'Limited', 'TRD Sport', 'TRD Off-Road'],
    colors: ['Super White', 'Midnight Black', 'Celestial Silver', 'Blueprint', 'Ruby Flare'],
    priceRange: [22000, 55000],
  },
  Ford: {
    models: ['F-150', 'Explorer', 'Escape', 'Mustang', 'Bronco', 'Edge', 'Expedition'],
    trims: ['XL', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited', 'ST'],
    colors: ['Oxford White', 'Agate Black', 'Iconic Silver', 'Velocity Blue', 'Rapid Red'],
    priceRange: [28000, 78000],
  },
  Chevrolet: {
    models: ['Silverado 1500', 'Equinox', 'Tahoe', 'Suburban', 'Camaro', 'Traverse', 'Colorado'],
    trims: ['WT', 'LT', 'RST', 'LTZ', 'High Country', 'ZL1', 'Z71'],
    colors: ['Summit White', 'Black', 'Silver Ice', 'Northsky Blue', 'Cayenne Orange'],
    priceRange: [26000, 72000],
  },
  BMW: {
    models: ['3 Series', '5 Series', 'X3', 'X5', 'X7', '4 Series', '7 Series'],
    trims: ['330i', '530i', 'xDrive30i', 'xDrive40i', 'M50i', 'M Sport'],
    colors: ['Alpine White', 'Black Sapphire', 'Mineral Grey', 'Portimao Blue', 'Brooklyn Grey'],
    priceRange: [42000, 95000],
  },
  Mercedes: {
    models: ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class', 'A-Class', 'CLA'],
    trims: ['C300', 'E350', 'GLC300', 'GLE450', 'AMG Line', 'Premium', 'Exclusive'],
    colors: [
      'Polar White',
      'Obsidian Black',
      'Selenite Grey',
      'Brilliant Blue',
      'Designo Cardinal Red',
    ],
    priceRange: [45000, 110000],
  },
};

const interiorColors = [
  'Black',
  'Gray',
  'Tan',
  'Brown',
  'Ivory',
  'Saddle',
  'Red',
  'Cream',
  'Dark Gray',
  'Light Gray',
];

const vehicleStatuses = ['AVAILABLE', 'SOLD', 'PENDING', 'RESERVED'];

const dealStatuses = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'CANCELLED'];
const dealTypes = ['CASH', 'FINANCE'];
const financingTerms = [36, 48, 60, 72, 84];

// ===========================================
// Messaging Schema Creation
// ===========================================

async function createMessagingTables(client: PoolClient): Promise<void> {
  log('Creating messaging tables...');

  // Conversations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messaging_conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      dealership_id UUID NOT NULL REFERENCES dealerships(id),
      type VARCHAR(20) NOT NULL DEFAULT 'DIRECT',
      name VARCHAR(255),
      description TEXT,
      avatar_url VARCHAR(500),
      is_muted BOOLEAN NOT NULL DEFAULT false,
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_by_id UUID REFERENCES auth_users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_conversations_dealership
    ON messaging_conversations(dealership_id)
  `);

  // Participants table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messaging_participants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth_users(id),
      role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_read_at TIMESTAMP,
      UNIQUE(conversation_id, user_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_participants_conversation
    ON messaging_participants(conversation_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_participants_user
    ON messaging_participants(user_id)
  `);

  // Messages table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messaging_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES auth_users(id),
      type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
      content TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'SENT',
      reply_to_id UUID REFERENCES messaging_messages(id),
      is_edited BOOLEAN NOT NULL DEFAULT false,
      edited_at TIMESTAMP,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_at TIMESTAMP,
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      is_ephemeral BOOLEAN NOT NULL DEFAULT false,
      ephemeral_seconds INTEGER,
      ephemeral_expires_at TIMESTAMP,
      link_preview JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_messages_conversation
    ON messaging_messages(conversation_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_messages_sender
    ON messaging_messages(sender_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_messages_created
    ON messaging_messages(created_at DESC)
  `);

  // Reactions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messaging_reactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth_users(id),
      user_name VARCHAR(255),
      reaction_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id, reaction_type)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_reactions_message
    ON messaging_reactions(message_id)
  `);

  // Attachments table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messaging_attachments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      url VARCHAR(500) NOT NULL,
      thumbnail_url VARCHAR(500),
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      mime_type VARCHAR(100),
      width INTEGER,
      height INTEGER,
      duration_seconds INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messaging_attachments_message
    ON messaging_attachments(message_id)
  `);

  log('Messaging tables created', 'success');
}

// ===========================================
// Seeding Functions
// ===========================================

async function seedUsers(client: PoolClient): Promise<void> {
  log('Seeding users...');

  const defaultPassword = await hashPassword('Password123!');

  const users = [
    // Sales Managers
    {
      id: userIds.salesManager1,
      email: 'mike.johnson@autolytiq.com',
      first_name: 'Mike',
      last_name: 'Johnson',
      role: 'MANAGER',
    },
    {
      id: userIds.salesManager2,
      email: 'sarah.williams@autolytiq.com',
      first_name: 'Sarah',
      last_name: 'Williams',
      role: 'MANAGER',
    },
    {
      id: userIds.salesManager3,
      email: 'david.chen@autolytiq.com',
      first_name: 'David',
      last_name: 'Chen',
      role: 'MANAGER',
    },
    // Salespeople
    {
      id: userIds.salesperson1,
      email: 'alex.rodriguez@autolytiq.com',
      first_name: 'Alex',
      last_name: 'Rodriguez',
      role: 'SALESPERSON',
    },
    {
      id: userIds.salesperson2,
      email: 'emily.davis@autolytiq.com',
      first_name: 'Emily',
      last_name: 'Davis',
      role: 'SALESPERSON',
    },
    {
      id: userIds.salesperson3,
      email: 'marcus.thompson@autolytiq.com',
      first_name: 'Marcus',
      last_name: 'Thompson',
      role: 'SALESPERSON',
    },
    {
      id: userIds.salesperson4,
      email: 'jessica.martinez@autolytiq.com',
      first_name: 'Jessica',
      last_name: 'Martinez',
      role: 'SALESPERSON',
    },
    {
      id: userIds.salesperson5,
      email: 'ryan.wilson@autolytiq.com',
      first_name: 'Ryan',
      last_name: 'Wilson',
      role: 'SALESPERSON',
    },
  ];

  for (const user of users) {
    await client.query(
      `
      INSERT INTO auth_users (id, email, password_hash, first_name, last_name, role, dealership_id, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        updated_at = NOW()
    `,
      [
        user.id,
        user.email,
        defaultPassword,
        user.first_name,
        user.last_name,
        user.role,
        DEALERSHIP_ID,
      ]
    );
  }

  log(`Seeded ${users.length} users`, 'success');
}

async function seedCustomers(client: PoolClient): Promise<void> {
  log('Seeding customers...');

  for (let i = 0; i < customerIds.length; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const cityData = randomElement(texasCities);
    const streetNumber = randomInt(100, 9999);
    const street = randomElement(streetNames);
    const creditScore = randomInt(550, 850);
    const source = randomElement(customerSources);

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@email.com`;
    const phone = generatePhone();

    await client.query(
      `
      INSERT INTO customers (id, dealership_id, first_name, last_name, email, phone, address, city, state, zip_code, credit_score, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW()
    `,
      [
        customerIds[i],
        DEALERSHIP_ID,
        firstName,
        lastName,
        email,
        phone,
        `${streetNumber} ${street}`,
        cityData.city,
        'TX',
        randomElement(cityData.zips),
        creditScore,
        source,
      ]
    );
  }

  log(`Seeded ${customerIds.length} customers`, 'success');
}

async function seedVehicles(client: PoolClient): Promise<void> {
  log('Seeding vehicles...');

  const makes = Object.keys(vehicleMakes);
  const years = [2020, 2021, 2022, 2023, 2024, 2025];

  for (let i = 0; i < vehicleIds.length; i++) {
    const make = randomElement(makes);
    const makeData = vehicleMakes[make];
    const model = randomElement(makeData.models);
    const trim = randomElement(makeData.trims);
    const year = randomElement(years);
    const exteriorColor = randomElement(makeData.colors);
    const interiorColor = randomElement(interiorColors);

    const isNew = year >= 2024;
    const condition = isNew ? 'NEW' : 'USED';
    const mileage = isNew ? randomInt(0, 50) : randomInt(5000, 65000);

    const basePrice = randomDecimal(makeData.priceRange[0], makeData.priceRange[1], 0);
    const listPrice = isNew ? basePrice : basePrice * 0.85;
    const msrp = isNew ? basePrice * 1.05 : null;
    const invoicePrice = isNew ? basePrice * 0.92 : null;

    // Distribute statuses - mostly available, some sold/pending/reserved
    let status: string;
    if (i < vehicleIds.length * 0.6) {
      status = 'AVAILABLE';
    } else if (i < vehicleIds.length * 0.8) {
      status = 'SOLD';
    } else if (i < vehicleIds.length * 0.9) {
      status = 'PENDING';
    } else {
      status = 'RESERVED';
    }

    const features = JSON.stringify([
      'Bluetooth',
      'Backup Camera',
      'Apple CarPlay',
      'Android Auto',
      randomElement(['Leather Seats', 'Heated Seats', 'Sunroof', 'Navigation', 'Premium Audio']),
    ]);

    await client.query(
      `
      INSERT INTO vehicles (id, dealership_id, vin, stock_number, year, make, model, trim, exterior_color, interior_color, mileage, condition, status, msrp, list_price, invoice_price, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (dealership_id, vin) DO UPDATE SET
        status = EXCLUDED.status,
        list_price = EXCLUDED.list_price,
        updated_at = NOW()
    `,
      [
        vehicleIds[i],
        DEALERSHIP_ID,
        generateVIN(),
        generateStockNumber(i),
        year,
        make,
        model,
        trim,
        exteriorColor,
        interiorColor,
        mileage,
        condition,
        status,
        msrp,
        listPrice,
        invoicePrice,
        features,
      ]
    );
  }

  log(`Seeded ${vehicleIds.length} vehicles`, 'success');
}

async function seedDeals(client: PoolClient): Promise<void> {
  log('Seeding deals...');

  const salespersonIds = [
    DEMO_USER_ID,
    userIds.salesperson1,
    userIds.salesperson2,
    userIds.salesperson3,
    userIds.salesperson4,
    userIds.salesperson5,
  ];

  // Get sold/pending vehicles for deals
  const soldVehicleIds = vehicleIds.slice(
    Math.floor(vehicleIds.length * 0.6),
    Math.floor(vehicleIds.length * 0.9)
  );

  for (let i = 0; i < dealIds.length && i < soldVehicleIds.length; i++) {
    const customerId = customerIds[i % customerIds.length];
    const vehicleId = soldVehicleIds[i];
    const salespersonId = randomElement(salespersonIds);

    const dealType = randomElement(dealTypes);
    const status = randomElement(dealStatuses);

    // Generate realistic sale price (90-100% of list price)
    const salePrice = randomDecimal(25000, 75000, 2);
    const taxes = salePrice * 0.0625; // 6.25% Texas sales tax
    const fees = randomDecimal(500, 1500, 2);

    let downPayment: number | null = null;
    let financingTerm: number | null = null;
    let interestRate: number | null = null;
    let monthlyPayment: number | null = null;
    let tradeInValue: number | null = null;
    let tradeInVehicle: string | null = null;

    if (dealType === 'FINANCE') {
      downPayment = randomDecimal(0, 10000, 2);
      financingTerm = randomElement(financingTerms);
      interestRate = randomDecimal(3.9, 12.9, 3);

      // Calculate monthly payment
      const principal = salePrice + taxes + fees - downPayment - (tradeInValue || 0);
      const monthlyRate = interestRate / 100 / 12;
      monthlyPayment =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, financingTerm))) /
        (Math.pow(1 + monthlyRate, financingTerm) - 1);
      monthlyPayment = Number(monthlyPayment.toFixed(2));

      // 30% chance of trade-in
      if (Math.random() < 0.3) {
        tradeInValue = randomDecimal(5000, 25000, 2);
        tradeInVehicle = `${randomInt(2015, 2021)} ${randomElement(Object.keys(vehicleMakes))} ${randomElement(['Sedan', 'SUV', 'Truck'])}`;
      }
    }

    const totalPrice = salePrice + taxes + fees - (tradeInValue || 0);

    const closedAt = status === 'COMPLETED' ? new Date() : null;

    await client.query(
      `
      INSERT INTO deals (id, dealership_id, customer_id, vehicle_id, salesperson_id, type, status, sale_price, trade_in_value, trade_in_vehicle, down_payment, financing_term, interest_rate, monthly_payment, taxes, fees, total_price, closed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `,
      [
        dealIds[i],
        DEALERSHIP_ID,
        customerId,
        vehicleId,
        salespersonId,
        dealType,
        status,
        salePrice,
        tradeInValue,
        tradeInVehicle,
        downPayment,
        financingTerm,
        interestRate,
        monthlyPayment,
        taxes,
        fees,
        totalPrice,
        closedAt,
      ]
    );
  }

  log(`Seeded ${dealIds.length} deals`, 'success');
}

async function seedConversationsAndMessages(client: PoolClient): Promise<void> {
  log('Seeding conversations and messages...');

  const allUserIds = [
    ADMIN_USER_ID,
    DEMO_USER_ID,
    userIds.salesManager1,
    userIds.salesManager2,
    userIds.salesperson1,
    userIds.salesperson2,
    userIds.salesperson3,
    userIds.salesperson4,
  ];

  // Conversation definitions
  const conversations = [
    {
      id: conversationIds[0],
      type: 'GROUP',
      name: 'Sales Team',
      description: 'General sales team discussion',
      participants: [
        ADMIN_USER_ID,
        userIds.salesManager1,
        userIds.salesperson1,
        userIds.salesperson2,
        userIds.salesperson3,
      ],
      createdBy: userIds.salesManager1,
    },
    {
      id: conversationIds[1],
      type: 'GROUP',
      name: 'Morning Huddle',
      description: 'Daily standup and announcements',
      participants: allUserIds,
      createdBy: ADMIN_USER_ID,
    },
    {
      id: conversationIds[2],
      type: 'DIRECT',
      name: null,
      description: null,
      participants: [userIds.salesManager1, userIds.salesperson1],
      createdBy: userIds.salesManager1,
    },
    {
      id: conversationIds[3],
      type: 'DIRECT',
      name: null,
      description: null,
      participants: [userIds.salesperson1, userIds.salesperson2],
      createdBy: userIds.salesperson1,
    },
    {
      id: conversationIds[4],
      type: 'GROUP',
      name: 'Hot Leads',
      description: 'Discuss active hot leads and opportunities',
      participants: [
        userIds.salesManager1,
        userIds.salesManager2,
        userIds.salesperson1,
        userIds.salesperson2,
      ],
      createdBy: userIds.salesManager1,
    },
    {
      id: conversationIds[5],
      type: 'DIRECT',
      name: null,
      description: null,
      participants: [ADMIN_USER_ID, userIds.salesManager1],
      createdBy: ADMIN_USER_ID,
    },
    {
      id: conversationIds[6],
      type: 'GROUP',
      name: 'Finance Questions',
      description: 'Questions about financing and F&I',
      participants: [
        userIds.salesManager2,
        userIds.salesperson3,
        userIds.salesperson4,
        DEMO_USER_ID,
      ],
      createdBy: userIds.salesManager2,
    },
    {
      id: conversationIds[7],
      type: 'BROADCAST',
      name: 'Company Announcements',
      description: 'Important company-wide announcements',
      participants: allUserIds,
      createdBy: ADMIN_USER_ID,
    },
  ];

  // Create conversations
  for (const conv of conversations) {
    await client.query(
      `
      INSERT INTO messaging_conversations (id, dealership_id, type, name, description, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `,
      [conv.id, DEALERSHIP_ID, conv.type, conv.name, conv.description, conv.createdBy]
    );

    // Add participants
    for (const participantId of conv.participants) {
      const role = participantId === conv.createdBy ? 'ADMIN' : 'MEMBER';
      await client.query(
        `
        INSERT INTO messaging_participants (id, conversation_id, user_id, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
        [randomUUID(), conv.id, participantId, role]
      );
    }
  }

  // Sample messages for conversations
  const sampleMessages: { conversationId: string; senderId: string; content: string }[] = [
    // Sales Team conversation
    {
      conversationId: conversationIds[0],
      senderId: userIds.salesManager1,
      content: "Good morning team! Let's crush it today!",
    },
    {
      conversationId: conversationIds[0],
      senderId: userIds.salesperson1,
      content: "I've got three appointments lined up this morning.",
    },
    {
      conversationId: conversationIds[0],
      senderId: userIds.salesperson2,
      content: "Nice! I'm working on a hot lead from yesterday - they're looking at the new F-150.",
    },
    {
      conversationId: conversationIds[0],
      senderId: userIds.salesManager1,
      content: 'Perfect. Let me know if you need any support on pricing.',
    },
    {
      conversationId: conversationIds[0],
      senderId: userIds.salesperson3,
      content: 'Just closed a deal on the Camry! Customer was super happy.',
    },

    // Morning Huddle
    {
      conversationId: conversationIds[1],
      senderId: ADMIN_USER_ID,
      content: 'Team, we have a special incentive running this month on all Honda models.',
    },
    {
      conversationId: conversationIds[1],
      senderId: userIds.salesManager1,
      content: "Great news! What's the additional discount?",
    },
    {
      conversationId: conversationIds[1],
      senderId: ADMIN_USER_ID,
      content: '$1,500 dealer cash on Accord and CR-V, $1,000 on Civic.',
    },
    {
      conversationId: conversationIds[1],
      senderId: userIds.salesperson4,
      content: "That should help close a few deals I've been working on!",
    },

    // Direct conversation between manager and salesperson
    {
      conversationId: conversationIds[2],
      senderId: userIds.salesManager1,
      content: "Hey Alex, how's the Henderson deal coming along?",
    },
    {
      conversationId: conversationIds[2],
      senderId: userIds.salesperson1,
      content: "They're coming back this afternoon to finalize paperwork.",
    },
    {
      conversationId: conversationIds[2],
      senderId: userIds.salesManager1,
      content: 'Excellent! Let me know if you need help with the F&I presentation.',
    },
    {
      conversationId: conversationIds[2],
      senderId: userIds.salesperson1,
      content: 'Will do, thanks Mike!',
    },

    // Direct conversation between salespeople
    {
      conversationId: conversationIds[3],
      senderId: userIds.salesperson1,
      content: 'Hey Emily, did that customer ever come back for the test drive?',
    },
    {
      conversationId: conversationIds[3],
      senderId: userIds.salesperson2,
      content: "Not yet, but they said they'd be in this weekend.",
    },
    {
      conversationId: conversationIds[3],
      senderId: userIds.salesperson1,
      content: 'Cool, good luck! Let me know if you need backup.',
    },

    // Hot Leads conversation
    {
      conversationId: conversationIds[4],
      senderId: userIds.salesManager1,
      content:
        'Just got a lead from the website - customer looking for a luxury SUV, budget $60-70K.',
    },
    {
      conversationId: conversationIds[4],
      senderId: userIds.salesperson1,
      content: 'I can take it! We have a nice BMW X5 that just came in.',
    },
    {
      conversationId: conversationIds[4],
      senderId: userIds.salesManager2,
      content: "Don't forget about the Mercedes GLE - it's been sitting a while.",
    },
    {
      conversationId: conversationIds[4],
      senderId: userIds.salesperson2,
      content: 'Maybe show both and let them decide?',
    },

    // Admin and Manager conversation
    {
      conversationId: conversationIds[5],
      senderId: ADMIN_USER_ID,
      content: 'Mike, can you pull together the sales numbers for this week?',
    },
    {
      conversationId: conversationIds[5],
      senderId: userIds.salesManager1,
      content: "Sure thing! I'll have them ready by end of day.",
    },
    {
      conversationId: conversationIds[5],
      senderId: ADMIN_USER_ID,
      content: 'Great, we need to discuss the Q4 goals at the leadership meeting.',
    },

    // Finance Questions
    {
      conversationId: conversationIds[6],
      senderId: userIds.salesperson3,
      content:
        "Quick question - what's the current rate on 60-month financing for credit scores 700+?",
    },
    {
      conversationId: conversationIds[6],
      senderId: userIds.salesManager2,
      content: "We're at 5.9% right now, but we can sometimes get 4.9% through Honda Financial.",
    },
    {
      conversationId: conversationIds[6],
      senderId: DEMO_USER_ID,
      content: 'Does that apply to used vehicles too?',
    },
    {
      conversationId: conversationIds[6],
      senderId: userIds.salesManager2,
      content: 'Used is typically 1% higher. So 6.9% is our standard.',
    },

    // Company Announcements
    {
      conversationId: conversationIds[7],
      senderId: ADMIN_USER_ID,
      content:
        'Reminder: The dealership will be closed next Thursday for the Thanksgiving holiday.',
    },
    {
      conversationId: conversationIds[7],
      senderId: ADMIN_USER_ID,
      content:
        'Congratulations to our top performers this month! Alex, Emily, and Marcus all exceeded their targets.',
    },
  ];

  // Insert messages with proper timing
  let messageTime = new Date();
  messageTime.setHours(messageTime.getHours() - 24); // Start 24 hours ago

  for (const msg of sampleMessages) {
    messageTime = new Date(messageTime.getTime() + randomInt(5, 60) * 60000); // Add 5-60 minutes

    await client.query(
      `
      INSERT INTO messaging_messages (id, conversation_id, sender_id, type, content, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'TEXT', $4, 'DELIVERED', $5, $5)
      ON CONFLICT (id) DO NOTHING
    `,
      [randomUUID(), msg.conversationId, msg.senderId, msg.content, messageTime]
    );
  }

  log(
    `Seeded ${conversations.length} conversations with ${sampleMessages.length} messages`,
    'success'
  );
}

// ===========================================
// Main Execution
// ===========================================

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  Autolytiq Desk Studio - Seed Data');
  console.log('========================================\n');

  log(`Database: ${DATABASE_URL.replace(/\/\/.*:.*@/, '//***:***@')}`);

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Create messaging tables first
    await createMessagingTables(client);

    // Seed data in order
    await seedUsers(client);
    await seedCustomers(client);
    await seedVehicles(client);
    await seedDeals(client);
    await seedConversationsAndMessages(client);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n========================================');
    log('Seed data completed successfully!', 'success');
    console.log('========================================\n');

    // Summary
    console.log('Summary:');
    console.log('  - 8 new users (3 managers, 5 salespeople)');
    console.log('  - 25 customers (Texas addresses, various credit scores)');
    console.log('  - 40 vehicles (6 makes, mixed new/used)');
    console.log('  - 20 deals (mixed cash/finance, various statuses)');
    console.log('  - 8 conversations with sample messages');
    console.log('\nDefault password for new users: Password123!');
    console.log('');
  } catch (error) {
    await client.query('ROLLBACK');
    log(`Error during seeding: ${error}`, 'error');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
