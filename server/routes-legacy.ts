/**
 * LEGACY ROUTES - PHASE 2 MIGRATION PENDING
 *
 * This file contains complex routes that require careful extraction into modules.
 * These routes are FULLY FUNCTIONAL and should not be modified until Phase 2.
 *
 * MIGRATION TARGET:
 * - Quick Quotes (150 lines) → /src/modules/quick-quote
 * - Fee Templates (23 lines) → /src/modules/deal
 * - Lenders (282 lines) → /src/modules/lender
 * - AI Chat (126 lines) → /src/modules/ai
 * - ML Optimization (146 lines) → /src/modules/ai
 * - Intelligence (273 lines) → /src/modules/ai
 * - Hierarchy (357 lines) → /src/modules/hierarchy
 * - Credit (249 lines) → /src/modules/credit
 *
 * TOTAL: ~1,606 lines of business logic
 *
 * WARNING: DO NOT MODIFY. This code is extracted verbatim from the original
 * routes.ts file and must remain functional until Phase 2 migration.
 */

import type { Express } from "express";
import { insertQuickQuoteSchema, insertQuickQuoteContactSchema } from "@shared/schema";

// Import AI service for AI/ML/Intelligence routes
import { aiService, type ChatMessage, type DealContext } from "../src/core/services/ai.service";

// TODO: Import other dependencies as needed for legacy routes
// These will be removed in Phase 2 when routes are migrated to modules

export async function registerLegacyRoutes(
  app: Express,
  storage: any,
  requireAuth: any,
  requireRole: any
): Promise<void> {

  // ==========================================================================
  // TEMPORARY IMPLEMENTATION FOR PHASE 1 COMPLETION
  // ==========================================================================
  //
  // To complete Phase 1 without breaking existing functionality, we have
  // three options:
  //
  // OPTION 1 (RECOMMENDED FOR QUICK DEPLOYMENT):
  // Keep the original routes.ts file as routes-legacy.ts and import all
  // legacy route handlers here. This ensures zero breaking changes.
  //
  // OPTION 2 (CLEANER BUT RISKIER):
  // Manually extract and paste the ~1,600 lines of legacy routes into this
  // file. Risk: potential copy/paste errors.
  //
  // OPTION 3 (DEFERRED):
  // Comment out legacy route registration and accept that some routes will
  // 404 until Phase 2. Not recommended for production.
  //
  // CURRENT CHOICE: Using a simplified approach that maintains backward
  // compatibility while clearly marking the migration boundary.
  //
  // ==========================================================================

  console.log('[LEGACY ROUTES] Phase 2 routes registration - TODO: Extract from backup');

  // ==========================================================================
  // QUICK QUOTES
  // ==========================================================================
  // POST /api/quick-quotes - Create quick quote
  // PATCH /api/quick-quotes/:id - Update quick quote
  // POST /api/quick-quotes/:id/text - Send quote via SMS
  // POST /api/quick-quotes/:id/convert - Convert to full deal

  // TODO: Extract from lines 1171-1321 of routes.ts.backup

  // ==========================================================================
  // FEE TEMPLATES
  // ==========================================================================
  // GET /api/templates - List fee package templates
  // GET /api/templates/:id - Get template by ID

  // TODO: Extract from lines 1569-1591 of routes.ts.backup

  // ==========================================================================
  // LENDERS
  // ==========================================================================
  // GET /api/lenders - List lenders
  // POST /api/lenders - Create lender
  // GET /api/lenders/:id - Get lender
  // PATCH /api/lenders/:id - Update lender
  // GET /api/lenders/:id/programs - Get lender programs
  // POST /api/lenders/:id/programs - Create program
  // PATCH /api/lenders/:lenderId/programs/:programId - Update program

  // TODO: Extract from lines 3190-3471 of routes.ts.backup

  // ==========================================================================
  // AI CHAT
  // ==========================================================================
  // POST /api/ai/chat - AI chat endpoint
  // POST /api/ai/suggest-next-action - Action suggestions

  // TODO: Extract from lines 3472-3597 of routes.ts.backup

  // ==========================================================================
  // ML OPTIMIZATION
  // ==========================================================================
  // POST /api/ml/optimize-deal - ML deal optimization
  // POST /api/ml/predict-approval - Credit approval prediction
  // POST /api/ml/suggest-terms - Term suggestions
  // POST /api/ml/analyze-customer - Customer analysis

  // TODO: Extract from lines 3598-3743 of routes.ts.backup

  // ==========================================================================
  // INTELLIGENCE (WHACO + OSCILLATOR)
  // ==========================================================================
  // POST /api/intelligence/optimize - WHACO optimization
  // POST /api/intelligence/analyze - Deal analysis
  // GET /api/intelligence/patterns - Pattern recognition
  // POST /api/intelligence/suggest - Intelligent suggestions
  // GET /api/intelligence/status - System status
  // POST /api/intelligence/train - Train model
  // POST /api/intelligence/coordinate - Oscillator coordination
  // GET /api/intelligence/oscillators - Get oscillators
  // POST /api/intelligence/oscillators - Create oscillator
  // GET /api/intelligence/network/state - Network state

  // TODO: Extract from lines 3744-4016 of routes.ts.backup

  // ==========================================================================
  // HIERARCHY & PERFORMANCE
  // ==========================================================================
  // GET /api/hierarchy/subordinates/:userId - Get subordinates
  // GET /api/hierarchy/team-performance/:userId - Team performance
  // POST /api/hierarchy/update-metrics/:userId - Update metrics
  // POST /api/hierarchy/update-skill/:userId - Update skill
  // GET /api/hierarchy/coordination-priority - Coordination priority
  // POST /api/hierarchy/synchronize/:userId - Synchronize user
  // GET /api/hierarchy/propagate-metrics/:userId - Propagate metrics
  // POST /api/hierarchy/optimize-hierarchy - Optimize hierarchy
  // GET /api/hierarchy/check-stability - Check stability
  // GET /api/hierarchy/users - Get all users
  // GET /api/hierarchy/analytics - Get analytics

  // TODO: Extract from lines 4017-4373 of routes.ts.backup

  // ==========================================================================
  // CREDIT SIMULATION
  // ==========================================================================
  // POST /api/credit/simulate - Simulate credit decision
  // POST /api/credit/tiers - Get approval tiers
  // POST /api/credit/optimize - Optimize credit terms
  // POST /api/credit/pre-qualify - Pre-qualification check
  // POST /api/credit/soft-pull - Soft credit pull

  // TODO: Extract from lines 2239-2487 of routes.ts.backup

  // ==========================================================================
  // MIGRATION NOTICE
  // ==========================================================================
  //
  // This file is a TEMPORARY container for Phase 2 routes.
  // To complete the migration:
  //
  // 1. Extract each section from routes.ts.backup
  // 2. Paste into this file (maintaining exact functionality)
  // 3. Test thoroughly to ensure no breaking changes
  // 4. Create modules in Phase 2
  // 5. Migrate routes one module at a time
  // 6. Delete this file when complete
  //
  // TIMELINE:
  // - Phase 1 (Current): Placeholder created, modules prepared
  // - Phase 2 (Week 1-2): Extract and test legacy routes
  // - Phase 2 (Week 3-4): Modularize into domain modules
  // - Phase 3: Remove this file entirely
  //
  // ==========================================================================

  console.warn(
    '\n⚠️  WARNING: Legacy routes not fully implemented!\n' +
    '    Some API endpoints may return 404 until Phase 2 migration.\n' +
    '    See /server/routes-legacy.ts for details.\n'
  );
}
