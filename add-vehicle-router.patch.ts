/**
 * PATCH SCRIPT: Add Vehicle Router to server/routes.ts
 * This script adds the vehicle module router integration
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const routesPath = resolve(__dirname, 'server/routes.ts');
const content = readFileSync(routesPath, 'utf-8');

// Check if already added
if (content.includes('createVehicleRouter')) {
  console.log('✓ Vehicle router already mounted');
  process.exit(0);
}

// Find the insertion point (after customer module)
const searchString = `  // Mount customer routes (all require authentication via router middleware)
  app.use('/api/customers', requireAuth, customerModuleRoutes);`;

const insertionString = `  // Mount customer routes (all require authentication via router middleware)
  app.use('/api/customers', requireAuth, customerModuleRoutes);

  // ============================================================================
  // VEHICLE & INVENTORY MODULE (NEW MODULAR SYSTEM)
  // ============================================================================
  // Import vehicle module with CRUD, VIN decoder, inventory management, stock numbers
  const { createVehicleRouter } = await import('../src/modules/vehicle/api/vehicle.routes');

  // Mount vehicle routes (all require authentication via router middleware)
  app.use('/api/vehicles', requireAuth, createVehicleRouter());`;

if (!content.includes(searchString)) {
  console.error('✗ Could not find insertion point');
  console.error('Expected to find customer module mount point');
  process.exit(1);
}

const updated = content.replace(searchString, insertionString);

writeFileSync(routesPath, updated, 'utf-8');

console.log('✓ Vehicle router successfully mounted in server/routes.ts');
console.log('✓ Route: /api/vehicles');
console.log('✓ Authentication: Required');
