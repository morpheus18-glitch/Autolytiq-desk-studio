/**
 * Run Scenario Change Log Migration
 *
 * Executes the scenario_change_log table migration using the database connection.
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('================================================');
  console.log('Scenario Change Log Migration');
  console.log('================================================\n');

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0005_scenario_change_log.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Migration file loaded: 0005_scenario_change_log.sql\n');

    // Execute migration
    console.log('Executing migration...');
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration successful!\n');

    // Verify table exists
    console.log('Verifying table structure...');
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'scenario_change_log'
      ORDER BY ordinal_position;
    `);

    console.log('\nTable: scenario_change_log');
    console.log('Columns:');
    result.rows.forEach((row: any) => {
      console.log(`  • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Verify indexes
    console.log('\nVerifying indexes...');
    const indexResult = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'scenario_change_log'
      ORDER BY indexname;
    `);

    console.log('Indexes:');
    indexResult.rows.forEach((row: any) => {
      console.log(`  • ${row.indexname}`);
    });

    console.log('\n✅ Migration complete and verified!');
    console.log('\nNext steps:');
    console.log('  1. Restart the application server');
    console.log('  2. Test scenario creation and updates');
    console.log('  3. Verify audit trail is logging changes');
    console.log('  4. Review /DEAL_CALCULATION_BULLETPROOF_DELIVERY.md\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

runMigration();
