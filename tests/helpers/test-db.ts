/**
 * Test Database Helper
 *
 * Provides in-memory SQLite database for integration tests.
 * No external PostgreSQL required - tests run completely isolated.
 *
 * Uses better-sqlite3 with drizzle-orm for Drizzle schema compatibility.
 */

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from '@/shared/schema';

export type TestDb = BetterSQLite3Database<typeof schema>;

interface TestDatabaseOptions {
  /** Log SQL queries for debugging */
  verbose?: boolean;
  /** Seed with default test data */
  seedData?: boolean;
}

/**
 * Create an in-memory SQLite database for testing.
 * Each test gets a fresh, isolated database instance.
 */
export function createTestDb(options: TestDatabaseOptions = {}): {
  db: TestDb;
  sqlite: Database.Database;
  close: () => void;
} {
  const sqlite = new Database(':memory:', {
    verbose: options.verbose ? console.log : undefined,
  });

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');

  const db = drizzle(sqlite, { schema });

  // Initialize schema (SQLite-compatible version of our tables)
  initializeSchema(sqlite);

  if (options.seedData) {
    seedTestData(db);
  }

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}

/**
 * Initialize SQLite schema (compatible subset of PostgreSQL schema)
 */
function initializeSchema(sqlite: Database.Database) {
  // Users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      dealership_id TEXT,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dealerships table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS dealerships (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      dealership_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      ssn TEXT,
      drivers_license TEXT,
      date_of_birth TEXT,
      address_street TEXT,
      address_city TEXT,
      address_state TEXT,
      address_zip TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    )
  `);

  // Vehicles table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      dealership_id TEXT NOT NULL,
      vin TEXT UNIQUE NOT NULL,
      stock_number TEXT,
      year INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      trim TEXT,
      color TEXT,
      mileage INTEGER,
      price INTEGER NOT NULL,
      cost INTEGER,
      status TEXT DEFAULT 'available',
      condition TEXT DEFAULT 'used',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    )
  `);

  // Deals table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      dealership_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT,
      salesperson_id TEXT,
      deal_type TEXT NOT NULL DEFAULT 'finance',
      status TEXT NOT NULL DEFAULT 'draft',
      vehicle_price INTEGER NOT NULL,
      trade_in_value INTEGER DEFAULT 0,
      trade_in_payoff INTEGER DEFAULT 0,
      down_payment INTEGER DEFAULT 0,
      rebates INTEGER DEFAULT 0,
      apr REAL DEFAULT 0,
      term_months INTEGER DEFAULT 60,
      tax_rate REAL DEFAULT 0,
      amount_financed INTEGER,
      monthly_payment INTEGER,
      total_of_payments INTEGER,
      total_interest INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealership_id) REFERENCES dealerships(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (salesperson_id) REFERENCES users(id)
    )
  `);

  // Credit profiles table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS credit_profiles (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      ssn TEXT,
      credit_score INTEGER,
      credit_bureau TEXT,
      risk_tier TEXT,
      monthly_income INTEGER,
      total_debt INTEGER,
      debt_to_income REAL,
      employment_status TEXT,
      employer_name TEXT,
      years_employed INTEGER,
      last_checked_at TEXT,
      expires_at TEXT,
      raw_report TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Create indexes for common queries
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_customers_dealership ON customers(dealership_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
    CREATE INDEX IF NOT EXISTS idx_deals_dealership ON deals(dealership_id);
    CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);
    CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_dealership ON users(dealership_id);
  `);
}

/**
 * Seed the database with minimal test data
 */
function seedTestData(db: TestDb) {
  const now = new Date().toISOString();
  const testDealershipId = 'test-dealership-001';
  const testUserId = 'test-user-001';
  const testCustomerId = 'test-customer-001';

  db.run(sql`
    INSERT INTO dealerships (id, name, address, city, state, zip_code, phone, email, created_at, updated_at)
    VALUES (${testDealershipId}, 'Test Motors', '123 Main St', 'Austin', 'TX', '78701', '512-555-0100', 'test@testmotors.com', ${now}, ${now})
  `);

  db.run(sql`
    INSERT INTO users (id, email, name, password_hash, role, dealership_id, created_at, updated_at)
    VALUES (${testUserId}, 'admin@testmotors.com', 'Test Admin', '$2a$10$dummyhash', 'admin', ${testDealershipId}, ${now}, ${now})
  `);

  db.run(sql`
    INSERT INTO customers (id, dealership_id, first_name, last_name, email, phone, address_state, created_at, updated_at)
    VALUES (${testCustomerId}, ${testDealershipId}, 'John', 'Doe', 'john@example.com', '512-555-0200', 'TX', ${now}, ${now})
  `);
}

/**
 * Transaction helper for tests that need rollback capability
 */
export async function withTransaction<T>(
  db: TestDb,
  sqlite: Database.Database,
  fn: () => Promise<T>
): Promise<T> {
  sqlite.exec('BEGIN');
  try {
    const result = await fn();
    sqlite.exec('COMMIT');
    return result;
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Clean all tables (useful between tests)
 */
export function cleanTables(sqlite: Database.Database) {
  const tables = ['credit_profiles', 'deals', 'vehicles', 'customers', 'users', 'dealerships'];
  for (const table of tables) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
}

/**
 * Create isolated test context with fresh database
 */
export function createTestContext() {
  const { db, sqlite, close } = createTestDb({ seedData: true });

  return {
    db,
    sqlite,
    cleanup: () => {
      cleanTables(sqlite);
      close();
    },
    reset: () => {
      cleanTables(sqlite);
      seedTestData(db);
    },
    testIds: {
      dealershipId: 'test-dealership-001',
      userId: 'test-user-001',
      customerId: 'test-customer-001',
    },
  };
}
