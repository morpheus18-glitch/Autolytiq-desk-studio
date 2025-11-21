/**
 * Migration Runner Script
 * Runs SQL migrations directly against the database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log(`\n[Migration] Running ${migrationFile}...`);

    const migrationPath = join(process.cwd(), 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`[Migration] Executing SQL from ${migrationPath}`);
    console.log(`[Migration] SQL length: ${sql.length} characters`);

    // Split SQL into statements (CONCURRENTLY indexes must run separately)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`[Migration] Found ${statements.length} SQL statements`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--')) {
        skipCount++;
        continue;
      }

      try {
        // Add semicolon back
        const fullStatement = statement + ';';

        // Log statement type
        const statementType = fullStatement.split(' ')[0];
        console.log(
          `[Migration] [${i + 1}/${statements.length}] Executing ${statementType}...`
        );

        await pool.query(fullStatement);
        successCount++;
      } catch (error: any) {
        // Ignore "already exists" errors for idempotent migrations
        if (error.code === '42P07' || error.message?.includes('already exists')) {
          console.log(
            `[Migration] [${i + 1}/${statements.length}] ⚠ Already exists, skipping`
          );
          skipCount++;
          continue;
        }

        console.error(
          `[Migration] [${i + 1}/${statements.length}] ✗ Statement failed:`,
          error.message
        );
        throw error;
      }
    }

    console.log(`[Migration] ✓ Migration completed successfully`);
    console.log(
      `[Migration] Executed: ${successCount}, Skipped: ${skipCount}, Total: ${statements.length}`
    );
  } catch (error) {
    console.error(`[Migration] ✗ Migration failed:`, error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: tsx scripts/run-migration.ts <migration-file.sql>');
    console.error('Example: tsx scripts/run-migration.ts 0004_add_critical_indexes.sql');
    process.exit(1);
  }

  try {
    await runMigration(migrationFile);
    console.log('\n[Migration] All migrations completed successfully! ✓');
    process.exit(0);
  } catch (error) {
    console.error('\n[Migration] Migration failed! ✗');
    process.exit(1);
  }
}

main();
