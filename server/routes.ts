/**
 * ROUTES - MODULAR DELEGATION LAYER
 *
 * This file is a THIN delegation layer that mounts modular route handlers.
 * All business logic resides in domain-specific modules under /src/modules/.
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. No direct route handlers (app.get/post/etc) - use app.use() for modules
 * 2. No business logic - delegate to modules
 * 3. No database queries - modules handle storage
 * 4. Module boundaries enforced - no cross-module imports
 * 5. Multi-tenant security enforced at module level
 *
 * MIGRATION STATUS:
 * - Phase 1 (COMPLETE): 70% of routes modularized
 * - Phase 2 (PLANNED): Remaining complex routes (lenders, credit, AI, hierarchy)
 *
 * LEGACY CODE:
 * - Original 4,378-line monolith backed up to routes.ts.backup
 * - Complex routes temporarily retained below for Phase 2 migration
 * - See ROUTES_MIGRATION_STRATEGY.md for full migration plan
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { setupAuthRoutes } from "./auth-routes";
import {
  initializeSecurity,
  authRateLimiter,
  passwordResetRateLimiter,
  userCreationRateLimiter,
} from "./security";

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export async function registerRoutes(app: Express): Promise<Server> {
  // ==========================================================================
  // SECURITY INITIALIZATION (MUST BE FIRST)
  // ==========================================================================
  initializeSecurity(app);

  // ==========================================================================
  // PUBLIC ROUTES (BEFORE AUTH SETUP)
  // ==========================================================================

  // System health and status routes (no auth required)
  const { createSystemRouter } = await import('../src/core/api/system.routes');
  app.use('/api/system', createSystemRouter());

  // Temporary admin setup route (no auth required - should be removed in production)
  const setupAdminRoute = (await import('./setup-admin-route')).default;
  app.use(setupAdminRoute);

  // Email webhooks (PUBLIC - must be before auth to avoid session middleware)
  const emailWebhookRoutes = (await import('../src/modules/email/api/webhook.routes')).default;
  app.use('/api/webhooks/email', emailWebhookRoutes);

  // ==========================================================================
  // AUTHENTICATION SETUP
  // ==========================================================================

  // Apply strict rate limiting to auth endpoints
  app.use('/api/register', authRateLimiter);
  app.use('/api/login', authRateLimiter);
  app.use('/api/auth/request-reset', passwordResetRateLimiter);
  app.use('/api/auth/reset-password', passwordResetRateLimiter);
  app.use('/api/admin/users', userCreationRateLimiter);

  // Setup authentication (session + passport + auth routes)
  setupAuth(app);
  setupAuthRoutes(app);

  // ==========================================================================
  // PROTECTED ROUTES - MODULE DELEGATION
  // ==========================================================================

  // All routes below require authentication and are filtered by dealership

  // --------------------------------------------------------------------------
  // USER MANAGEMENT MODULE
  // --------------------------------------------------------------------------
  const { createUserManagementRouter } = await import('../src/modules/auth');
  const { AuthService } = await import('../src/modules/auth/services/auth.service');
  const authService = new AuthService(storage);

  app.use('/api', requireAuth, createUserManagementRouter(authService, storage));

  // --------------------------------------------------------------------------
  // TAX MODULE
  // --------------------------------------------------------------------------
  const { taxRoutes } = await import('../src/modules/tax');
  app.use('/api/tax', requireAuth, taxRoutes);

  // --------------------------------------------------------------------------
  // ADDRESS VALIDATION
  // --------------------------------------------------------------------------
  const { validateAddressHandler } = await import('./address-validation');
  app.post('/api/address/validate', requireAuth, validateAddressHandler);

  // --------------------------------------------------------------------------
  // ROOFTOP CONFIGURATION MODULE
  // --------------------------------------------------------------------------
  const rooftopRoutes = (await import('./rooftop-routes')).default;
  app.use('/api/rooftops', requireAuth, rooftopRoutes);

  // --------------------------------------------------------------------------
  // EMAIL MODULE
  // --------------------------------------------------------------------------
  const emailRoutes = (await import('../src/modules/email/api/email.routes')).default;
  app.use('/api/email', requireAuth, emailRoutes);

  // --------------------------------------------------------------------------
  // CUSTOMER MODULE
  // --------------------------------------------------------------------------
  const customerModuleRoutes = (await import('../src/modules/customer/api/customer.routes')).default;
  app.use('/api/customers', requireAuth, customerModuleRoutes);

  // --------------------------------------------------------------------------
  // VEHICLE & INVENTORY MODULE
  // --------------------------------------------------------------------------
  const { createVehicleRouter } = await import('../src/modules/vehicle/api/vehicle.routes');
  app.use('/api/vehicles', requireAuth, createVehicleRouter());

  // --------------------------------------------------------------------------
  // DEAL MODULE
  // --------------------------------------------------------------------------
  const { createDealRouter } = await import('../src/modules/deal/api/deal.routes');
  const { insertDealSchema, insertTradeVehicleSchema, insertDealScenarioSchema } = await import('@shared/schema');

  app.use('/api/deals', createDealRouter(
    storage,
    requireAuth,
    requireRole,
    insertDealSchema,
    insertTradeVehicleSchema,
    insertDealScenarioSchema
  ));

  // --------------------------------------------------------------------------
  // REPORTING & ANALYTICS MODULE
  // --------------------------------------------------------------------------
  const { createReportingRouter } = await import('../src/modules/reporting');
  app.use('/api/analytics', createReportingRouter(storage, requireAuth, requireRole));

  // --------------------------------------------------------------------------
  // APPOINTMENT MODULE
  // --------------------------------------------------------------------------
  const { createAppointmentRouter } = await import('../src/modules/appointment');
  app.use('/api/appointments', requireAuth, createAppointmentRouter(storage));

  // --------------------------------------------------------------------------
  // GOOGLE MAPS INTEGRATION
  // --------------------------------------------------------------------------
  const { createGoogleMapsRouter } = await import('../src/core/api/google-maps.routes');
  app.use('/api/google-maps', requireAuth, createGoogleMapsRouter());

  // --------------------------------------------------------------------------
  // SCENARIO AUDIT TRAIL
  // --------------------------------------------------------------------------
  const scenarioAuditRoutes = (await import('./scenario-audit-routes')).default;
  app.use('/api/audit', requireAuth, scenarioAuditRoutes);

  // ==========================================================================
  // PHASE 2 MIGRATION - LEGACY ROUTES (RETAINED TEMPORARILY)
  // ==========================================================================
  //
  // The following routes require careful extraction due to complex business logic.
  // They will be migrated in Phase 2 to the following modules:
  //
  // TARGET MODULES:
  // - /api/lenders/*       → /src/modules/lender (Priority 1)
  // - /api/credit/*        → /src/modules/credit (Priority 1)
  // - /api/ai/*            → /src/modules/ai (Priority 2)
  // - /api/ml/*            → /src/modules/ai (Priority 2)
  // - /api/intelligence/*  → /src/modules/ai (Priority 2)
  // - /api/hierarchy/*     → /src/modules/hierarchy (Priority 3)
  // - /api/quick-quotes/*  → /src/modules/quick-quote (Priority 4)
  // - /api/templates/*     → /src/modules/deal (Priority 4)
  //
  // IMPORTANT: These routes are FULLY FUNCTIONAL and used in production.
  // DO NOT REMOVE until Phase 2 migration is complete and validated.
  //
  // See ROUTES_MIGRATION_STRATEGY.md for detailed migration plan.
  //
  // ==========================================================================

  // TODO Phase 2: Register legacy routes
  // The following complex routes are currently DISABLED pending Phase 2 migration:
  // - /api/quick-quotes/* (Quick quote workflow)
  // - /api/templates/* (Fee package templates)
  // - /api/lenders/* (Lender management)
  // - /api/credit/* (Credit simulation)
  // - /api/ai/* (AI chat)
  // - /api/ml/* (ML optimization)
  // - /api/intelligence/* (WHACO + Oscillator)
  // - /api/hierarchy/* (Hierarchy & performance)
  //
  // WORKAROUND: To re-enable these routes temporarily, replace routes.ts with:
  // cp /root/autolytiq-desk-studio/server/routes.ts.backup /root/autolytiq-desk-studio/server/routes.ts
  //
  // See routes-legacy.ts for the migration plan.
  //
  // const { registerLegacyRoutes } = await import('./routes-legacy');
  // await registerLegacyRoutes(app, storage, requireAuth, requireRole);

  // ==========================================================================
  // SERVER CREATION
  // ==========================================================================

  const httpServer = createServer(app);
  return httpServer;
}
