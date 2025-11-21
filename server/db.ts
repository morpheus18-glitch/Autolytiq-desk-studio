/**
 * DATABASE CONFIGURATION
 *
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should import from './database/db-service.ts' instead.
 *
 * Migration guide:
 * - Replace: import { db, pool } from './db'
 * - With: import { db, pool } from './database/db-service'
 *
 * The new database service provides:
 * - Connection pooling with health checks
 * - Transaction management with automatic retry
 * - Query monitoring and performance tracking
 * - Graceful shutdown handling
 */

import { db as dbService, pool as poolService } from './database/db-service';

// Re-export for backward compatibility
export const db = dbService;
export const pool = poolService;

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATION WARNING] Importing from server/db.ts is deprecated. ' +
    'Please import from server/database/db-service.ts instead.'
  );
}
