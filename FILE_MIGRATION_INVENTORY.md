# FILE-BY-FILE MIGRATION INVENTORY
**Date:** November 20, 2025
**Total Files:** 408 TypeScript files
**Migration Status:** Planning Complete

---

## MIGRATION PRIORITY MATRIX

### Legend
- 🔴 **CRITICAL** - Blocking, must migrate first
- 🟡 **HIGH** - Important, migrate early
- 🟢 **MEDIUM** - Standard priority
- 🔵 **LOW** - Can wait, minimal dependencies

---

## PHASE 1: FOUNDATION LAYER (2 DAYS)

### Database Service Layer - 🔴 CRITICAL

| File | Lines | Target | Priority | Dependencies | Effort |
|------|-------|--------|----------|--------------|--------|
| `/server/storage.ts` | 1,424 | `/src/core/database/storage.service.ts` | 🔴 | None | 8h |
| `/server/db.ts` | 58 | `/src/core/database/connection.ts` | 🔴 | None | 1h |
| `/server/database/atomic-operations.ts` | 240 | `/src/core/database/atomic.ts` | 🟡 | db.ts | 2h |
| `/server/database/transaction-manager.ts` | 186 | `/src/core/database/transactions.ts` | 🟡 | db.ts | 2h |

**Total:** 4 files, 1,908 lines, 13 hours

### Core Utilities - 🟡 HIGH

| File | Lines | Target | Priority | Dependencies | Effort |
|------|-------|--------|----------|--------------|--------|
| `/server/auth-helpers.ts` | 108 | `/src/core/utils/crypto.ts` | 🟡 | None | 1h |
| `/server/address-validation.ts` | 195 | `/src/modules/customer/utils/address-validator.ts` | 🟢 | None | 2h |
| `/server/middleware.ts` | 82 | `/src/core/middleware/logging.ts` | 🟢 | None | 1h |

**Total:** 3 files, 385 lines, 4 hours

### Type Definitions & Schemas - 🟡 HIGH

| File | Lines | Target | Priority | Status | Effort |
|------|-------|--------|----------|--------|--------|
| `/shared/schema.ts` | 2,385 | Keep as-is | 🟢 | ✅ Good | 0h |
| `/shared/models/*.ts` | 600 | Expand Zod schemas | 🟡 | ⚠️ Partial | 4h |
| `/shared/types/*.ts` | 250 | Consolidate | 🟢 | ⚠️ Scattered | 2h |

**Total:** Multiple files, ~3,235 lines, 6 hours

**PHASE 1 TOTAL:** ~10 files, ~5,528 lines, **23 hours (2 days)**

---

## PHASE 2: MODULE MIGRATION (2-3 DAYS)

### Customer Module - 🟡 HIGH

#### Backend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/server/routes/customers.ts` | 428 | `/src/modules/customer/api/customer.routes.ts` | 🟡 | 3h |
| Customer queries from `/server/storage.ts` | ~200 | `/src/modules/customer/services/customer.service.ts` | 🟡 | 2h |
| `/server/address-validation.ts` | 195 | `/src/modules/customer/utils/address-validator.ts` | 🟢 | 1h |

#### Frontend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/client/src/components/customer-detail-sheet.tsx` | 280 | `/src/modules/customer/components/CustomerDetail.tsx` | 🟢 | 2h |
| `/client/src/components/customer-form-sheet.tsx` | 385 | `/src/modules/customer/components/CustomerForm.tsx` | 🟢 | 3h |
| `/client/src/components/customer-selector-sheet.tsx` | 220 | `/src/modules/customer/components/CustomerSelector.tsx` | 🟢 | 2h |
| `/client/src/components/kanban-customer-card.tsx` | 180 | `/src/modules/customer/components/CustomerCard.tsx` | 🔵 | 1h |

**Customer Module Total:** 7 files, ~1,888 lines, **14 hours**

### Email Module - 🔴 CRITICAL (High Breakage Rate)

#### Backend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/server/email-routes.ts` | 1,247 | `/src/modules/email/api/email.routes.ts` | 🔴 | 6h |
| `/server/email-service.ts` | 346 | `/src/modules/email/services/email.service.ts` | 🔴 | 3h |
| `/server/email-webhook-routes.ts` | 191 | `/src/modules/email/api/webhook.routes.ts` | 🔴 | 2h |
| `/server/email-config.ts` | 281 | `/src/modules/email/config/email.config.ts` | 🟡 | 1h |
| `/server/email-security.ts` | 370 | `/src/modules/email/utils/security.ts` | 🔴 | 2h |
| `/server/email-security-monitor.ts` | 305 | `/src/modules/email/utils/monitoring.ts` | 🟢 | 1h |

#### Frontend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| Email inbox components | ~800 | `/src/modules/email/components/` | 🟡 | 4h |
| Email composer | ~400 | `/src/modules/email/components/EmailComposer.tsx` | 🟡 | 3h |
| Email thread view | ~350 | `/src/modules/email/components/EmailThread.tsx` | 🟡 | 2h |

**Email Module Total:** 9+ files, ~4,290 lines, **24 hours**

### Vehicle Module - 🟡 HIGH

#### Backend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/server/rooftop-service.ts` | 233 | `/src/modules/vehicle/services/inventory.service.ts` | 🟡 | 3h |
| Vehicle routes from `/server/routes.ts` | ~500 | `/src/modules/vehicle/api/vehicle.routes.ts` | 🟡 | 4h |
| `/server/seed-vehicles.ts` | 282 | `/src/modules/vehicle/utils/seeder.ts` | 🔵 | 1h |

#### Frontend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/client/src/components/vin-decoder.tsx` | 320 | `/src/modules/vehicle/components/VinDecoder.tsx` | 🟡 | 2h |
| Vehicle search/selection | ~400 | `/src/modules/vehicle/components/` | 🟢 | 3h |
| Inventory management | ~600 | `/src/modules/vehicle/components/` | 🟢 | 4h |

**Vehicle Module Total:** 6+ files, ~2,335 lines, **17 hours**

### Reporting Module - 🟢 MEDIUM

#### Backend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| `/server/services/deal-analyzer.ts` | 268 | `/src/modules/reporting/services/analytics.service.ts` | 🟢 | 3h |
| Dashboard queries from `/server/storage.ts` | ~150 | `/src/modules/reporting/services/dashboard.service.ts` | 🟢 | 2h |

#### Frontend Files

| File | Lines | Target | Priority | Effort |
|------|-------|--------|----------|--------|
| Dashboard components | ~800 | `/src/modules/reporting/components/` | 🟢 | 4h |
| Chart components | ~400 | `/src/modules/reporting/components/charts/` | 🟢 | 2h |

**Reporting Module Total:** 4+ files, ~1,618 lines, **11 hours**

**PHASE 2 TOTAL:** ~26 files, ~10,131 lines, **66 hours (3 days with 2 engineers)**

---

## PHASE 3: UI PATTERN MIGRATION (2-3 DAYS)

### Page Files - 🟡 HIGH (27 files)

#### Priority 1: High-Traffic Pages (Migrate First)

| File | Components | Pattern Issues | Effort |
|------|-----------|----------------|--------|
| `/client/src/pages/dashboard.tsx` | 12 | Layout, loading, cards | 3h |
| `/client/src/pages/deals-list.tsx` | 8 | Layout, grid, status badges | 2h |
| `/client/src/pages/deal-details.tsx` | 15 | Layout, forms, cards | 4h |
| `/client/src/pages/customers.tsx` | 6 | Layout, table, empty state | 2h |
| `/client/src/pages/inbox.tsx` | 10 | Layout, list, loading | 3h |

**Subtotal:** 5 files, 51 components, **14 hours**

#### Priority 2: Deal Management

| File | Components | Pattern Issues | Effort |
|------|-----------|----------------|--------|
| `/client/src/pages/kanban.tsx` | 8 | Cards, drag-drop, badges | 3h |
| `/client/src/pages/scenarios.tsx` | 10 | Forms, calculations, cards | 3h |
| `/client/src/pages/quick-quotes.tsx` | 7 | Forms, validation | 2h |

**Subtotal:** 3 files, 25 components, **8 hours**

#### Priority 3: Management & Settings

| File | Components | Pattern Issues | Effort |
|------|-----------|----------------|--------|
| `/client/src/pages/inventory.tsx` | 6 | Layout, grid, filters | 2h |
| `/client/src/pages/lenders.tsx` | 5 | Layout, table, forms | 2h |
| `/client/src/pages/settings.tsx` | 12 | Forms, tabs | 3h |
| `/client/src/pages/users.tsx` | 7 | Table, modals, forms | 2h |
| `/client/src/pages/dealership-settings.tsx` | 8 | Forms, validation | 2h |

**Subtotal:** 5 files, 38 components, **11 hours**

#### Priority 4: Other Pages

| Files | Components | Pattern Issues | Effort |
|-------|-----------|----------------|--------|
| 14 remaining pages | ~70 | Various | 20h |

**Pages Total:** 27 files, **53 hours**

### Component Files - 🟢 MEDIUM (157 files)

#### By Category:

| Category | Count | Pattern Issues | Avg Effort | Total |
|----------|-------|----------------|-----------|-------|
| Card components | 32 | Premium classes, colors | 20min | 11h |
| Form components | 24 | react-hook-form, Zod | 30min | 12h |
| List/Table components | 18 | Loading, empty state | 30min | 9h |
| Modal/Dialog components | 15 | Already good | 10min | 3h |
| Status/Badge components | 28 | Color tokens | 15min | 7h |
| Navigation components | 8 | Layout tokens | 20min | 3h |
| UI components (shadcn) | 48 | ✅ No changes needed | 0min | 0h |
| Misc components | 24 | Various | 20min | 8h |

**Components Total:** 157 files, **53 hours**

**PHASE 3 TOTAL:** 184 files, **106 hours (3 days with 2 engineers)**

---

## PHASE 4: TYPESCRIPT STRICT ENFORCEMENT (1 DAY)

### Files with 'any' Types - 🔴 CRITICAL (10 files)

| File | 'any' Count | Type | Effort |
|------|-------------|------|--------|
| `/src/modules/auth/services/auth.service.ts` | 5 | Session, Passport | 2h |
| `/src/modules/deal/services/deal.service.ts` | 3 | Calculations | 1h |
| `/src/core/adapters/storage.adapter.ts` | 2 | Generic adapters | 1h |
| `/server/email-routes.ts` | 8 | Webhook, API responses | 3h |
| `/server/email-webhook-routes.ts` | 4 | Svix payloads | 2h |
| `/src/integration-example.ts` | 3 | Example code | 1h |
| `/scripts/run-migration.ts` | 2 | Database migrations | 1h |
| `/server/database/atomic-operations.ts` | 3 | Transaction types | 1h |
| `/server/database/transaction-manager.ts` | 2 | Callback types | 1h |
| `/shared/schema.ts` | 1 | Drizzle types | 0.5h |

**Total:** 10 files, 33 'any' instances, **13.5 hours**

### API Response Types - 🟡 HIGH (~50 endpoints)

| Endpoint Group | Count | Effort |
|----------------|-------|--------|
| Auth endpoints | 5 | 1h |
| Customer endpoints | 8 | 2h |
| Deal endpoints | 12 | 3h |
| Vehicle endpoints | 7 | 2h |
| Email endpoints | 10 | 2h |
| Tax endpoints | 4 | 1h |
| Reporting endpoints | 4 | 1h |

**Total:** 50 endpoints, **12 hours**

**PHASE 4 TOTAL:** 60 items, **25.5 hours (1 day with 2 engineers)**

---

## PHASE 5: TESTING & VALIDATION (1-2 DAYS)

### Integration Tests - 🔴 CRITICAL

| Test Suite | Test Count | Effort |
|------------|-----------|--------|
| Authentication flow | 5 tests | 3h |
| Deal creation flow | 8 tests | 4h |
| Email system | 6 tests | 3h |
| Customer management | 5 tests | 2h |
| Vehicle management | 4 tests | 2h |
| Multi-tenant isolation | 10 tests | 4h |

**Total:** 38 tests, **18 hours**

### End-to-End Tests - 🟡 HIGH

| User Journey | Screens | Effort |
|--------------|---------|--------|
| Sales Manager journey | 8 | 4h |
| Finance Manager journey | 6 | 3h |
| Salesperson journey | 5 | 3h |

**Total:** 3 journeys, **10 hours**

### Validation Scripts - 🟡 HIGH

| Script | Purpose | Effort |
|--------|---------|--------|
| Design token validator | Scan for hardcoded values | 2h |
| Module boundary checker | Detect import violations | 2h |
| Performance benchmarker | TTI, API response times | 2h |
| Type safety validator | Detect 'any' types | 1h |

**Total:** 4 scripts, **7 hours**

**PHASE 5 TOTAL:** ~50 test cases + 4 scripts, **35 hours (2 days with 2 engineers)**

---

## OVERALL SUMMARY

### By Phase

| Phase | Files | Lines | Hours | Days (2 eng) |
|-------|-------|-------|-------|--------------|
| Phase 1: Foundation | 10 | 5,528 | 23 | 2 |
| Phase 2: Modules | 26 | 10,131 | 66 | 3 |
| Phase 3: UI Patterns | 184 | ~15,000 | 106 | 3 |
| Phase 4: Type Safety | 60 | ~2,000 | 25.5 | 1 |
| Phase 5: Testing | - | - | 35 | 2 |
| **TOTAL** | **280** | **~32,659** | **255.5** | **11** |

### With 3 Engineers

| Phase | Days |
|-------|------|
| Phase 1: Foundation | 1.5 |
| Phase 2: Modules | 2 |
| Phase 3: UI Patterns | 2 |
| Phase 4: Type Safety | 0.5 |
| Phase 5: Testing | 1 |
| **TOTAL** | **7 days** |

### Critical Path

```
Day 1-2: Database Service (BLOCKING)
  ↓
Day 3-4: Customer & Email Modules (PARALLEL)
  ↓
Day 5-6: UI Migration (PARALLEL - Pages + Components)
  ↓
Day 7: Type Safety + Vehicle Module (PARALLEL)
  ↓
Day 8-9: Testing & Validation
  ↓
Day 10: Final validation, documentation, deployment prep
```

---

## FILES NOT REQUIRING MIGRATION

### Already Compliant (Keep As-Is)

**New Module System:** ✅ Already follows strict framework
- `/src/modules/auth/*` (7 files) - Complete
- `/src/modules/deal/*` (5 files) - Complete
- `/src/modules/tax/*` (3 files) - Complete
- `/src/core/adapters/*` (1 file) - Needs 'any' type fixes only

**UI Core Components:** ✅ Already follow design pattern
- `/client/src/components/core/*` (12 files) - Complete
- `/client/src/lib/design-tokens.ts` - Complete
- `/client/src/lib/query-patterns.ts` - Complete
- `/client/src/lib/queryClient.ts` - Complete

**shadcn/ui Components:** ✅ No changes needed
- `/client/src/components/ui/*` (48 files) - Standard library

**Configuration:** ✅ Keep as-is
- `tsconfig.json`, `tsconfig.strict.json`
- `.eslintrc.json`
- `.prettierrc.json`
- `package.json`
- `vite.config.ts`

**Total Compliant:** ~76 files already follow strict framework

---

## RISK MATRIX

### High Risk Files (Test Extensively)

| File | Risk | Reason | Mitigation |
|------|------|--------|-----------|
| `/server/storage.ts` | 🔴 HIGH | Core dependency, 1,424 lines | Phased migration, comprehensive tests |
| `/server/email-routes.ts` | 🔴 HIGH | Recent breakage history | Extra validation, E2E tests |
| `/server/routes.ts` | 🟡 MEDIUM | 4,000+ lines, multiple domains | Split into modules gradually |
| `/server/calculations.ts` | 🟡 MEDIUM | Complex business logic | Unit tests for all edge cases |

### Medium Risk Files (Standard Testing)

All module migrations, UI component updates

### Low Risk Files (Light Testing)

Utility functions, configuration, documentation

---

## CHECKPOINT STRATEGY

### Every 6 Hours
1. Git commit with tag: `checkpoint-YYYYMMDD-HHMM`
2. Run validation suite
3. Update progress in CLAUDE.md
4. Document any blockers

### Every 24 Hours
1. Full integration test run
2. Performance benchmark
3. Code review
4. Update FILE_MIGRATION_INVENTORY.md status

### Rollback Plan
- Each checkpoint is a rollback point
- Keep old files until phase complete
- Use feature flags for new modules

---

## EXECUTION NOTES

### Parallel Workstreams

**Stream 1: Database + Backend (Database Architect)**
- Phase 1: Foundation
- Phase 2: Module backend logic

**Stream 2: Frontend + UI (Frontend Design Specialist)**
- Phase 3: UI migration
- Phase 2: Module frontend components

**Stream 3: Types + Testing (Workhorse Engineer + Grandmaster Debugger)**
- Phase 4: Type safety
- Phase 5: Testing

**Orchestration:** Project Orchestrator coordinates, reviews, validates

### Quality Gates

**Cannot proceed to next phase until:**
- [ ] All files in current phase migrated
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code review approved

---

**Status:** READY FOR EXECUTION
**Next Step:** Begin Phase 1 - Database Service Layer
**ETA to Completion:** 7-10 days with 2-3 engineers
