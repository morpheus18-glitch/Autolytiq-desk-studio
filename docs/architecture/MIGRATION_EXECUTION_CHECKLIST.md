# Migration Execution Checklist

**Branch:** `feat/unbreakable-architecture`
**Status:** AWAITING USER APPROVAL
**Last Updated:** 2025-11-23

---

## Pre-Execution Checklist

Before starting any migration work:

### Planning Review
- [ ] **Read** `CLEAN_REBUILD_FOUNDATION_PLAN.md` in full
- [ ] **Read** `TAX_ENGINE_MIGRATION_STRATEGY.md` in full
- [ ] **Read** `ARCHITECTURE_RULES.md` for guardrails
- [ ] **Read** `AGENT_WORKFLOW_GUIDE.md` for workflow discipline
- [ ] **Understand** the 5-phase migration strategy
- [ ] **Confirm** timeline is acceptable (6-7 weeks)

### Critical Decisions Made
- [ ] **API Contract Format:** OpenAPI / tRPC / Protobuf (Recommendation: OpenAPI)
- [ ] **Database Strategy:** Shared DB / Separate per service (Recommendation: Shared)
- [ ] **Deployment Strategy:** Monorepo / Multi-repo (Recommendation: Monorepo)
- [ ] **Frontend Framework:** Next.js / Vite (Recommendation: Next.js 14)
- [ ] **Tax Engine Priority:** First / Later (Recommendation: First - Phase 2)

### Resource Allocation
- [ ] **Engineers assigned:** ___ (Recommended: 2-3 full-time)
- [ ] **Tax engine expert identified:** ___ (For validation)
- [ ] **Code review leads assigned:** ___
- [ ] **Project manager/coordinator:** ___
- [ ] **Daily standup time:** ___

### Environment Preparation
- [ ] **Branch confirmed:** On `feat/unbreakable-architecture`
- [ ] **Git status clean:** No uncommitted changes
- [ ] **Node.js version:** 20+ installed
- [ ] **Rust installed:** `rustc --version` works
- [ ] **Go installed:** `go version` works (1.22+)
- [ ] **wasm-pack installed:** `wasm-pack --version` works
- [ ] **Docker installed:** For local development
- [ ] **Database access:** PostgreSQL connection working

### Risk Mitigation Understood
- [ ] **Rollback plan** documented and understood
- [ ] **Feature flags** strategy agreed upon
- [ ] **Testing strategy** comprehensive
- [ ] **Performance benchmarks** defined
- [ ] **Production safety** measures in place

---

## Phase 1: Foundation Setup (3-4 days)

### Day 1: Directory Structure & Configuration

#### Morning
- [ ] Run `bash scripts/setup-clean-rebuild.sh`
- [ ] Verify all directories created
- [ ] Review directory structure: `tree -L 3 -d frontend services gateway`
- [ ] Commit: `git commit -m "feat(foundation): initialize clean rebuild directory structure"`

#### Afternoon
- [ ] Run `npm run setup:frontend`
- [ ] Verify frontend package.json created
- [ ] Install frontend dependencies: `cd frontend && npm install`
- [ ] Verify Next.js runs: `npm run dev` (should start on port 3000)
- [ ] Commit: `git commit -m "feat(frontend): initialize Next.js 14 application"`

#### End of Day
- [ ] Create frontend tsconfig.json (strict mode)
- [ ] Create frontend .eslintrc.json (architectural rules)
- [ ] Run `npm run typecheck` - should pass
- [ ] Run `npm run lint` - should pass
- [ ] Commit: `git commit -m "feat(frontend): add TypeScript and ESLint configuration"`

### Day 2: Logging & Quality Gates

#### Morning
- [ ] Create `frontend/src/core/logger/logger.ts` (Pino)
- [ ] Create `gateway/src/logger/logger.ts` (Pino)
- [ ] Add structured logging examples
- [ ] Write tests for logger
- [ ] Commit: `git commit -m "feat(core): add structured logging infrastructure"`

#### Afternoon
- [ ] Setup Husky pre-commit hooks
- [ ] Create `scripts/validate-all.sh`
- [ ] Test pre-commit hooks work
- [ ] Create `.github/workflows/ci.yml`
- [ ] Test CI workflow (push to trigger)
- [ ] Commit: `git commit -m "feat(ci): add quality gates and CI/CD pipeline"`

#### End of Day
- [ ] Document logging standards in `docs/LOGGING_STANDARDS.md`
- [ ] Create PR template (`.github/pull_request_template.md`)
- [ ] Update CODEOWNERS for new structure
- [ ] Commit: `git commit -m "docs: add logging standards and PR template"`

### Day 3: Gateway & API Client Setup

#### Morning
- [ ] Run `npm run setup:gateway`
- [ ] Create `gateway/src/index.ts` (Express setup)
- [ ] Add middleware (auth, logging, error handling)
- [ ] Create health check endpoint
- [ ] Test: `curl http://localhost:3000/health`
- [ ] Commit: `git commit -m "feat(gateway): initialize Express gateway with middleware"`

#### Afternoon
- [ ] Create `frontend/src/core/http/client.ts` (API client)
- [ ] Create `frontend/src/core/http/queryClient.ts` (React Query)
- [ ] Add error handling and logging
- [ ] Write tests for HTTP client
- [ ] Commit: `git commit -m "feat(frontend): add HTTP client and React Query setup"`

#### End of Day
- [ ] Create example API route in gateway: `GET /api/health`
- [ ] Call from frontend to test end-to-end
- [ ] Verify logging works on both sides
- [ ] Commit: `git commit -m "feat(integration): add end-to-end API communication"`

### Day 4: Testing Infrastructure

#### Morning
- [ ] Setup Vitest for frontend
- [ ] Create test setup files
- [ ] Write example component tests
- [ ] Run `npm run test` - should pass
- [ ] Commit: `git commit -m "feat(testing): add Vitest testing infrastructure"`

#### Afternoon
- [ ] Create integration test examples
- [ ] Setup test database (if needed)
- [ ] Document testing patterns
- [ ] Commit: `git commit -m "feat(testing): add integration test examples"`

#### End of Day
- [ ] Review all Phase 1 work
- [ ] Run `scripts/validate-all.sh` - should pass
- [ ] Update progress in `CLAUDE.md`
- [ ] **CHECKPOINT:** Push to GitHub, tag as `phase-1-complete`

### Day 5: Documentation & Preparation for Phase 2

- [ ] Document Phase 1 learnings
- [ ] Create architecture diagrams
- [ ] Write developer onboarding guide
- [ ] Review tax engine migration plan
- [ ] Prepare Rust development environment
- [ ] **APPROVAL GATE:** Review Phase 1 with team before proceeding

---

## Phase 2: Tax Engine Migration (5-7 days)

### Day 1: Rust Project Setup

#### Morning
- [ ] Run `npm run setup:rust`
- [ ] Verify Cargo.toml created
- [ ] Create `services/tax-engine-rs/src/lib.rs`
- [ ] Test: `cd services/tax-engine-rs && cargo build`
- [ ] Commit: `git commit -m "feat(tax): initialize Rust tax engine project"`

#### Afternoon
- [ ] Create all model files (address.rs, tax_profile.rs, etc.)
- [ ] Add Serde serialization
- [ ] Write basic tests
- [ ] Test: `cargo test` - should pass
- [ ] Commit: `git commit -m "feat(tax): add core data models"`

#### End of Day
- [ ] Install wasm-pack: `cargo install wasm-pack`
- [ ] Test WASM build: `./build.sh`
- [ ] Verify WASM output generated
- [ ] Commit: `git commit -m "feat(tax): add WASM build pipeline"`

### Day 2-3: State Rules & Data Migration

#### Tasks
- [ ] Convert `shared/tax-data.ts` to `data/state_rules.json`
- [ ] Create state rule loader in Rust
- [ ] Migrate California rules first (test case)
- [ ] Add all 50 states + DC
- [ ] Test: Load all states successfully
- [ ] Commit: `git commit -m "feat(tax): migrate state tax rules to JSON"`

#### Validation
- [ ] Compare JSON data with TypeScript data
- [ ] Verify all fields present
- [ ] Check for typos or missing data
- [ ] **Manual review:** Tax expert validates CA, TX, FL, NY rules

### Day 4: Core Calculation Logic

#### Tasks
- [ ] Create `src/calculator/retail.rs`
- [ ] Port retail tax calculation from TypeScript
- [ ] Add trade-in credit logic
- [ ] Write 20+ unit tests
- [ ] Test: `cargo test calculator` - all pass
- [ ] Commit: `git commit -m "feat(tax): implement retail tax calculation"`

#### Validation
- [ ] Side-by-side comparison with TypeScript
- [ ] Test all 50 states with known values
- [ ] Verify precision (< $0.01 difference)

### Day 5: WASM Integration

#### Tasks
- [ ] Create WASM bindings in `src/lib.rs`
- [ ] Build for Node.js: `wasm-pack build --target nodejs`
- [ ] Create `gateway/src/services/taxServiceRust.ts`
- [ ] Load WASM module in gateway
- [ ] Test: Call Rust tax engine from gateway
- [ ] Commit: `git commit -m "feat(tax): integrate Rust WASM with gateway"`

#### Validation
- [ ] WASM loads successfully
- [ ] API call returns correct format
- [ ] Error handling works
- [ ] Performance: < 10ms per calculation

### Day 6-7: Testing & Validation

#### Tasks
- [ ] Create 100+ test cases (all states, edge cases)
- [ ] Run side-by-side comparison tests
- [ ] Performance benchmarks: `cargo bench`
- [ ] Memory leak testing
- [ ] Load testing (1000+ calculations)
- [ ] Document discrepancies and fix

#### Deliverables
- [ ] All tests pass
- [ ] Performance: < 1ms average
- [ ] 100% parity with TypeScript (< $0.01 diff)
- [ ] **CHECKPOINT:** Tag as `tax-engine-rust-ready`

### Phase 2 Approval Gate
- [ ] Tax expert validates calculations
- [ ] Performance benchmarks meet targets
- [ ] Feature flag implementation tested
- [ ] Rollback plan verified
- [ ] **APPROVAL:** Ready for Phase 3

---

## Phase 3: Backend Services (6-8 days)

### Day 1-2: Go Project Templates

#### Deal Service
- [ ] Run `npm run setup:go deal-engine-go`
- [ ] Create domain models
- [ ] Create handlers
- [ ] Create OpenAPI spec
- [ ] Test: `make run` - server starts
- [ ] Commit: `git commit -m "feat(deal): initialize Go deal service"`

#### Customer Service
- [ ] Run `npm run setup:go customer-service-go`
- [ ] Repeat pattern from deal service
- [ ] Commit: `git commit -m "feat(customer): initialize Go customer service"`

### Day 3-4: Database Layer

- [ ] Create repository interfaces
- [ ] Implement PostgreSQL repositories
- [ ] Add migrations
- [ ] Write repository tests
- [ ] Commit: `git commit -m "feat(services): add database repositories"`

### Day 5-6: Business Logic

- [ ] Implement deal creation logic
- [ ] Implement pricing calculations
- [ ] Add validation
- [ ] Write integration tests
- [ ] Commit: `git commit -m "feat(services): implement core business logic"`

### Day 7-8: API Integration

- [ ] Update gateway to call Go services
- [ ] Generate TypeScript types from OpenAPI
- [ ] Test end-to-end flow
- [ ] Commit: `git commit -m "feat(integration): connect gateway to Go services"`

### Phase 3 Approval Gate
- [ ] All services start successfully
- [ ] API contracts validated
- [ ] Integration tests pass
- [ ] **APPROVAL:** Ready for Phase 4

---

## Phase 4: Frontend Migration (8-10 days)

### Day 1-2: Core Module Setup

- [ ] Create `src/modules/deals/` structure
- [ ] Create hooks (useDeal, useCreateDeal)
- [ ] Create components (DealCard, DealWorkspace)
- [ ] Write component tests
- [ ] Commit: `git commit -m "feat(deals): migrate deal module to new structure"`

### Day 3-4: UI Components

- [ ] Migrate Radix UI components
- [ ] Setup design tokens
- [ ] Create component library
- [ ] Document patterns
- [ ] Commit: `git commit -m "feat(ui): establish design system"`

### Day 5-7: Page Migration

- [ ] Migrate DealWorkspace page
- [ ] Migrate Customers page
- [ ] Migrate Inventory page
- [ ] Test all routes work
- [ ] Commit: `git commit -m "feat(pages): migrate core pages"`

### Day 8-10: Integration & Polish

- [ ] Connect all features
- [ ] Add loading states
- [ ] Add error handling
- [ ] Visual QA
- [ ] Commit: `git commit -m "feat(frontend): complete migration"`

### Phase 4 Approval Gate
- [ ] All pages render correctly
- [ ] No console errors
- [ ] Performance: < 2s page load
- [ ] **APPROVAL:** Ready for Phase 5

---

## Phase 5: Integration & Testing (4-5 days)

### Day 1-2: End-to-End Tests

- [ ] Write E2E tests for critical flows
- [ ] Test deal creation flow
- [ ] Test tax calculation flow
- [ ] Test customer management
- [ ] All tests pass

### Day 3: Performance Testing

- [ ] Load testing (100+ concurrent users)
- [ ] Benchmark all API endpoints
- [ ] Memory profiling
- [ ] Fix performance issues

### Day 4: Production Readiness

- [ ] Final code review
- [ ] Security audit
- [ ] Documentation review
- [ ] Deployment checklist

### Day 5: Deployment Prep

- [ ] Staging deployment
- [ ] Smoke tests
- [ ] Monitoring setup
- [ ] **GO/NO-GO DECISION**

---

## Post-Migration Checklist

### Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Monitor for 24 hours
- [ ] Deploy to production (gradual rollout)
- [ ] Monitor for 7 days

### Cleanup
- [ ] Remove old code (after 30 days)
- [ ] Archive old tests
- [ ] Update documentation
- [ ] Remove feature flags

### Retrospective
- [ ] What went well?
- [ ] What could improve?
- [ ] Lessons learned
- [ ] Next phase planning

---

## Emergency Procedures

### If Production Breaks
1. **IMMEDIATELY:** Revert to previous deployment
2. **Check logs:** Gateway and services
3. **Identify issue:** Which component?
4. **Hotfix:** Fix on hotfix branch
5. **Test:** Comprehensive testing
6. **Redeploy:** With caution

### If Tests Fail
1. **STOP:** Don't proceed to next phase
2. **Investigate:** Root cause
3. **Fix:** Address the issue
4. **Re-test:** Verify fix
5. **Document:** Update checklist

---

## Success Metrics

Track these throughout migration:

### Code Quality
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: 0
- [ ] Test coverage: > 80%
- [ ] Build time: < 30s

### Performance
- [ ] API response: < 500ms (p95)
- [ ] Page load: < 2s
- [ ] Tax calculation: < 1ms
- [ ] Memory usage: Stable

### Stability
- [ ] Production errors: 0
- [ ] Downtime: 0
- [ ] Customer complaints: 0
- [ ] Rollbacks: 0

---

## Contact & Support

**Project Lead:** ___
**Tax Engine Expert:** ___
**Code Review Lead:** ___
**DevOps Lead:** ___

**Escalation Path:**
1. Team lead (within 1 hour)
2. Engineering manager (within 4 hours)
3. CTO (critical issues)

---

**IMPORTANT:** This checklist is a living document. Update it as you progress. Check off items only when 100% complete and validated.

**Good luck! You're building the future of Autolytiq. 🚀**
