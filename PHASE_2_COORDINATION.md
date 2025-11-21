# PHASE 2: MODULE MIGRATION - COORDINATION PLAN

**Date:** November 21, 2025
**Phase:** 2 of 5 - Module Migration
**Status:** READY TO EXECUTE
**Orchestrator:** Project Orchestrator Agent
**Branch:** `feature/phase1-foundation-migration`

---

## EXECUTIVE SUMMARY

### Phase 1 Status: ✅ COMPLETE
- **Database service layer:** Complete (`/src/core/database/`)
- **Core utilities:** Consolidated
- **Type definitions:** Complete
- **Work committed to:** `feature/phase1-foundation-migration`
- **Changes:** 62,792 lines added, 182 files changed

### Phase 2 Objective
Complete **4 business logic modules** in parallel over 3 days (66 hours estimated):
1. Customer Module (14h)
2. Email Module Integration (24h) - **CRITICAL**
3. Vehicle Module (17h)
4. Reporting Module (11h)

### Critical Discovery: MODULES MORE COMPLETE THAN EXPECTED

**Initial Assessment vs Reality:**
- ❌ **Expected:** Modules are "partially built, need completion"
- ✅ **Reality:** Modules are 80-90% complete, need WIRING and TESTING

**What Already Exists:**

#### Customer Module: ~90% Complete
- ✅ `/src/modules/customer/services/customer.service.ts` (21,583 lines)
- ✅ `/src/modules/customer/api/customer.routes.ts` (8,815 lines)
- ✅ Complete hooks, components, utilities, formatters
- ✅ **ALREADY WIRED:** Routes mounted in `/server/routes.ts` line 96-99
- ⚠️ **NEEDS:** Testing, validation, frontend integration

#### Email Module: ~95% Complete
- ✅ `/src/modules/email/` - Complete 2,500+ line module
- ✅ All services: email, template, resend, queue
- ✅ API routes with full CRUD operations
- ✅ Integration tests written
- ✅ **ALREADY WIRED:** Routes mounted in `/server/routes.ts` line 83-86
- ⚠️ **NEEDS:** Remove old email system, frontend migration, webhook handling

#### Vehicle Module: ~85% Complete
- ✅ `/src/modules/vehicle/services/` - 4 complete services (66,466 lines total)
  - vehicle.service.ts (22,421 lines)
  - inventory.service.ts (20,608 lines)
  - vin-decoder.service.ts (13,227 lines)
  - stock-number.service.ts (10,210 lines)
- ✅ `/src/modules/vehicle/api/vehicle.routes.ts` (14,782 lines)
- ✅ Complete hooks, components, utilities
- ⚠️ **NEEDS:** Wire routes, testing, frontend integration

#### Reporting Module: 0% Complete
- ❌ No module structure exists
- ❌ Analytics scattered in old code
- ⚠️ **NEEDS:** Full creation from scratch

---

## REVISED STRATEGY: WIRE → TEST → CLEAN

### New Approach
Since modules are mostly complete, we shift from "build" to "integrate":

**Day 1 (8h): WIRE + VALIDATE**
- Wire vehicle routes to Express
- Test all API endpoints manually
- Validate database queries work
- Document any issues

**Day 2 (8h): FRONTEND INTEGRATION**
- Update client components to use new APIs
- Migrate old code to use new hooks
- Test critical user flows

**Day 3 (8h): CLEANUP + REPORTING**
- Remove old email system completely
- Create reporting module
- Final testing and validation

---

## WORKSTREAM ASSIGNMENTS (REVISED)

### WORKSTREAM 1: Customer Module - VALIDATION ONLY (4h)
**Agent:** Workhorse Engineer
**Status:** 90% Complete, Already Wired

**Tasks:**
1. **Validation Testing (2h)**
   - Test customer CRUD operations via API
   - Verify search functionality
   - Test duplicate detection
   - Confirm multi-tenant isolation

2. **Frontend Integration Check (1h)**
   - Identify which client components use old customer code
   - Document migration path for each

3. **Documentation (1h)**
   - Document API endpoints
   - Create usage examples
   - List any bugs found

**Deliverable:** Customer module fully validated and documented

---

### WORKSTREAM 2: Email Module - CRITICAL CLEANUP (12h)
**Agent:** Workhorse Engineer
**Status:** 95% Complete, Already Wired, **OLD SYSTEM STILL PRESENT**

**⚠️ CRITICAL RISK:**
- Old email system files still exist in `/server/email-*.ts`
- History of breaking changes (5 fixes in last 24 hours)
- Must remove old system without breaking current functionality

**Tasks:**

**Phase A: Validation (3h)**
1. Test new email module thoroughly:
   - Send email (POST /api/email/send)
   - List emails (GET /api/email/messages)
   - Read email (GET /api/email/messages/:id)
   - Mark as read (POST /api/email/messages/:id/read)
   - Delete email (DELETE /api/email/messages/:id)
   - Bulk operations
   - Draft saving
2. Document any missing functionality
3. Test email queue processing

**Phase B: Frontend Migration (5h)**
1. Identify all client components using old email APIs
2. Update to use new email module hooks:
   - Replace old API calls with new hooks
   - Update state management
   - Test email compose flow
   - Test inbox/folder navigation
3. Migrate email templates system

**Phase C: Old System Removal (4h)**
1. **CAREFULLY** remove old email files:
   - `/server/email-routes.ts` (47,964 lines)
   - `/server/email-service.ts` (13,327 lines)
   - `/server/email-config.ts` (10,810 lines)
   - `/server/email-security.ts` (14,215 lines)
   - `/server/email-security-monitor.ts` (11,724 lines)
   - `/server/email-webhook-routes.ts` (7,338 lines)
2. Remove old imports from `/server/routes.ts`
3. Update any remaining references
4. Final validation - ensure nothing breaks

**Quality Gate:**
- ✅ All email operations work via new module
- ✅ Frontend uses new email hooks
- ✅ Zero references to old email system
- ✅ Integration tests pass
- ✅ No production errors

**Deliverable:** Email module fully integrated, old system removed

---

### WORKSTREAM 3: Vehicle Module - WIRE + TEST (10h)
**Agent:** Workhorse Engineer
**Status:** 85% Complete, NOT WIRED

**Tasks:**

**Phase A: Route Wiring (3h)**
1. Update `/server/routes.ts`:
   ```typescript
   // Import vehicle module routes
   const vehicleRoutes = (await import('../src/modules/vehicle/api/vehicle.routes')).default;

   // Mount with authentication
   app.use('/api/vehicles', requireAuth, vehicleRoutes);
   ```
2. Handle the `createVehicleRouter` factory function correctly
3. Test basic connectivity

**Phase B: API Testing (4h)**
1. Test all vehicle endpoints:
   - Create vehicle (POST /api/vehicles)
   - List inventory (GET /api/vehicles)
   - Get vehicle (GET /api/vehicles/:id)
   - Update vehicle (PUT /api/vehicles/:id)
   - Delete vehicle (DELETE /api/vehicles/:id)
   - VIN decoder (POST /api/vehicles/decode-vin)
   - Stock number generation (POST /api/vehicles/generate-stock)
   - Reserve vehicle (POST /api/vehicles/:id/reserve)
2. Verify multi-tenant isolation
3. Test VIN decoder service
4. Document any issues

**Phase C: Frontend Integration (3h)**
1. Update client components to use new vehicle APIs
2. Test inventory page
3. Test vehicle creation/editing
4. Test VIN decoder in UI

**Quality Gate:**
- ✅ All vehicle CRUD operations work
- ✅ VIN decoder functional
- ✅ Stock numbers generate correctly
- ✅ Frontend uses new APIs
- ✅ Multi-tenant isolation confirmed

**Deliverable:** Vehicle module fully wired and functional

---

### WORKSTREAM 4: Reporting Module - CREATE FROM SCRATCH (11h)
**Agent:** Workhorse Engineer
**Status:** 0% Complete

**Tasks:**

**Phase A: Architecture (2h)**
1. Create module structure:
   ```
   /src/modules/reporting/
     /services/
       analytics.service.ts
     /api/
       reporting.routes.ts
     /types/
       reporting.types.ts
     index.ts
   ```
2. Define analytics queries:
   - Dashboard KPIs (deals, revenue, conversion)
   - Deal performance analytics
   - Sales rep leaderboards
   - Inventory metrics
   - Revenue forecasting

**Phase B: Analytics Service (5h)**
1. Create `/src/modules/reporting/services/analytics.service.ts`:
   - Dashboard statistics
   - Deal analytics (by status, rep, time period)
   - Revenue reports
   - Conversion metrics
   - Inventory aging
2. Use database service for all queries
3. Enforce multi-tenant isolation
4. Add caching for expensive queries

**Phase C: API Routes (2h)**
1. Create `/src/modules/reporting/api/reporting.routes.ts`:
   - GET /api/reporting/dashboard - Dashboard stats
   - GET /api/reporting/deals - Deal analytics
   - GET /api/reporting/revenue - Revenue reports
   - GET /api/reporting/leaderboard - Sales rep performance
   - GET /api/reporting/inventory - Inventory metrics
2. Wire routes in `/server/routes.ts`

**Phase D: Frontend Hooks (2h)**
1. Create reporting hooks:
   - `useDashboardStats()`
   - `useDealAnalytics()`
   - `useRevenueReport()`
   - `useLeaderboard()`
2. Update dashboard page to use new hooks

**Quality Gate:**
- ✅ Dashboard loads with real data
- ✅ All analytics queries optimized
- ✅ Multi-tenant isolation enforced
- ✅ Caching implemented
- ✅ Performance < 500ms for all queries

**Deliverable:** Fully functional reporting module

---

## PARALLEL EXECUTION TIMELINE (REVISED)

### Day 1 (0-8h): VALIDATION + WIRING
```
Hour 0-4:
├─ Customer: API Testing ─────────────┐
├─ Email: New Module Validation ──────┤  All in parallel
├─ Vehicle: Route Wiring ─────────────┤
└─ Reporting: Architecture ───────────┘

Hour 4-8:
├─ Customer: Documentation ───────────┐
├─ Email: Frontend Migration Start ───┤  All in parallel
├─ Vehicle: API Testing ──────────────┤
└─ Reporting: Analytics Service ──────┘

CHECKPOINT T+8h:
- [ ] Customer module fully validated
- [ ] Email module validated, frontend 50% migrated
- [ ] Vehicle routes wired, APIs tested
- [ ] Reporting analytics service 60% complete
```

### Day 2 (8-16h): INTEGRATION + BUILD
```
Hour 8-12:
├─ Customer: Frontend Integration ────┐
├─ Email: Frontend Migration Finish ──┤  All in parallel
├─ Vehicle: Frontend Integration ─────┤
└─ Reporting: API Routes + Hooks ─────┘

Hour 12-16:
├─ Customer: Final Testing ───────────┐
├─ Email: Old System Removal Start ───┤  All in parallel
├─ Vehicle: Testing + Validation ─────┤
└─ Reporting: Dashboard Integration ──┘

CHECKPOINT T+16h:
- [ ] Customer module complete
- [ ] Email frontend migrated, old system removal in progress
- [ ] Vehicle module fully functional
- [ ] Reporting module 80% complete
```

### Day 3 (16-24h): CLEANUP + FINAL VALIDATION
```
Hour 16-20:
├─ Email: Old System Removal ─────────┐
├─ Email: Final Validation ───────────┤  Focus on email cleanup
├─ Reporting: Final touches ──────────┤
└─ All: Integration testing ──────────┘

Hour 20-24:
├─ Email: Documentation ──────────────┐
├─ Reporting: Performance testing ────┤
├─ All: Final validation ─────────────┤
└─ Phase 2 Report + Checkpoint ───────┘

CHECKPOINT T+24h - PHASE 2 COMPLETE:
- [ ] All 4 modules operational
- [ ] Old email system completely removed
- [ ] All frontend integrated
- [ ] Integration tests pass
- [ ] Git checkpoint created
```

---

## CHECKPOINT VALIDATION CRITERIA

### T+4h Checkpoint
**Validation Script:**
```bash
# Test customer API
curl -X GET http://localhost:5000/api/customers \
  -H "Cookie: connect.sid=$SESSION"

# Test email API
curl -X GET http://localhost:5000/api/email/messages \
  -H "Cookie: connect.sid=$SESSION"

# Test vehicle API
curl -X GET http://localhost:5000/api/vehicles \
  -H "Cookie: connect.sid=$SESSION"

# Check TypeScript compilation
npm run type-check

# Check ESLint
npm run lint
```

**Pass Criteria:**
- All API endpoints return 200 or appropriate error codes
- No TypeScript compilation errors
- No ESLint violations
- Services respond < 1s

### T+8h Checkpoint (Day 1 Complete)
**Validation:**
1. All backend services functional
2. Customer module validated
3. Email module frontend 50% migrated
4. Vehicle routes wired and tested
5. Reporting analytics service mostly complete

**Blocker Resolution:**
- Any failing tests must be fixed before Day 2
- Performance issues must be documented
- Integration problems escalated to Project Orchestrator

### T+16h Checkpoint (Day 2 Complete)
**Validation:**
1. All frontend components use new APIs
2. Email old system removed or removal in progress
3. Vehicle module fully functional
4. Reporting module nearly complete
5. Integration tests passing

**Quality Gates:**
- All modules have passing integration tests
- Multi-tenant isolation verified
- No breaking changes in production
- Performance within budget

### T+24h Final Validation (Phase 2 Complete)
**Comprehensive Checks:**
1. All 4 modules operational
2. Old email system completely removed
3. All frontend integrated
4. Zero TypeScript errors
5. Zero ESLint violations
6. All integration tests pass
7. Performance benchmarks met
8. Documentation complete

**Deliverables:**
- Phase 2 completion report
- Git checkpoint/tag
- Updated CLAUDE.md
- Migration lessons learned

---

## RISK MITIGATION

### Risk 1: Email System Removal Breaks Production
**Likelihood:** HIGH (5 fixes in last 24 hours)
**Impact:** CRITICAL
**Mitigation:**
- Test new module exhaustively BEFORE removing old system
- Remove old files one at a time
- Keep git checkpoints every 2 hours during removal
- Have rollback plan ready
- Test after each file removal

### Risk 2: Frontend Integration Reveals Missing APIs
**Likelihood:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Validate new APIs match old API contracts
- Create compatibility adapters if needed
- Document all breaking changes
- Update client code incrementally

### Risk 3: Performance Degradation
**Likelihood:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Benchmark before/after for each module
- Add database indexes if needed
- Implement caching in reporting module
- Monitor query performance

### Risk 4: Multi-Tenant Isolation Bugs
**Likelihood:** LOW (modules use database service)
**Impact:** CRITICAL
**Mitigation:**
- Every query must use tenantId filter
- Integration tests verify isolation
- Code review all database queries
- Manual testing with multiple tenants

---

## SUCCESS CRITERIA

Phase 2 is complete when:
- [ ] Customer module: Fully validated and documented
- [ ] Email module: Old system removed, new module fully integrated
- [ ] Vehicle module: Wired, tested, frontend integrated
- [ ] Reporting module: Created, dashboard functional
- [ ] All integration tests pass
- [ ] Zero TypeScript compilation errors
- [ ] Zero ESLint violations
- [ ] All frontend uses new module APIs
- [ ] Performance benchmarks met (< 1s API, < 1.5s TTI)
- [ ] Documentation complete for all modules
- [ ] Git checkpoint created with tag

---

## IMMEDIATE NEXT STEPS

### For User (PROJECT APPROVAL)
1. **Review this coordination plan**
2. **Approve execution timeline** (3 days)
3. **Confirm resource allocation** (Workhorse Engineer availability)
4. **Authorize old email system removal** (HIGH RISK operation)

### For Orchestrator (AFTER APPROVAL)
1. **Create work branch:** `feature/phase2-module-integration`
2. **Assign Workstream 1** to Workhorse Engineer (customer validation)
3. **Set up monitoring dashboard** for progress tracking
4. **Prepare validation scripts** for checkpoints
5. **Document rollback procedures**

### For Workhorse Engineer (DAY 1 KICKOFF)
1. **Start with Customer Module validation** (lowest risk)
2. **Document testing procedure** as you go
3. **Report progress** at T+2h and T+4h
4. **Flag blockers immediately** to Orchestrator

---

## FILES TO MONITOR

### Critical Files (DO NOT BREAK)
- `/server/routes.ts` - Central route registry
- `/server/auth.ts` - Authentication system
- `/shared/schema.ts` - Database schema
- All `/src/modules/*/index.ts` - Public APIs

### High-Risk Removal Targets
- `/server/email-routes.ts` - 47,964 lines
- `/server/email-service.ts` - 13,327 lines
- `/server/email-config.ts` - 10,810 lines
- `/server/email-security.ts` - 14,215 lines
- `/server/email-security-monitor.ts` - 11,724 lines
- `/server/email-webhook-routes.ts` - 7,338 lines

**Total lines to remove:** ~105,000 lines (must be done carefully)

### Integration Points
- Client components in `/client/src/components/`
- Client pages in `/client/src/pages/`
- API hooks in modules' `/hooks/` directories

---

## COMMUNICATION PROTOCOL

### Progress Updates
- **Every 2 hours:** Brief status update to Orchestrator
- **Every 4 hours:** Formal checkpoint with validation
- **Immediately:** Flag blockers and critical issues

### Escalation Path
1. **Blocker identified** → Report to Orchestrator immediately
2. **Orchestrator assessment** → Determine severity
3. **If critical** → Pause other workstreams, focus on resolution
4. **If non-critical** → Document, continue, address at next checkpoint

### Status Report Format
```
Time: T+Xh
Workstream: [Name]
Status: [On Track | At Risk | Blocked]
Completed: [List of completed tasks]
In Progress: [Current task]
Blockers: [Any issues]
Next: [Next 2h plan]
```

---

**Orchestrator Status:** Ready to launch Phase 2
**Awaiting:** User approval to proceed
**Branch:** feature/phase1-foundation-migration (will create phase2 branch on approval)
**Confidence:** HIGH (modules more complete than expected)
