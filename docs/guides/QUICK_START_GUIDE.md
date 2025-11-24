# Quick Start Guide - Autolytiq Clean Rebuild

**For:** Developers joining the migration project
**Branch:** `feat/unbreakable-architecture`
**Last Updated:** 2025-11-23

---

## TL;DR

We're rebuilding Autolytiq with proper architecture:
- **Frontend:** Next.js 14 (pure UI, zero business logic)
- **Backend:** Go microservices (deal, customer, inventory)
- **Tax Engine:** Rust → WASM (10-100x faster)
- **Gateway:** Node.js BFF (API orchestration)
- **Types:** Generated from OpenAPI (single source of truth)

---

## Essential Reading (30 minutes)

**Read these in order:**

1. **CLEAN_REBUILD_SUMMARY.md** (5 min) ← Start here
2. **docs/ARCHITECTURE_DIAGRAM.md** (10 min) ← Visual overview
3. **CLEAN_REBUILD_FOUNDATION_PLAN.md** (10 min skimming, 1 hour deep dive)
4. **ARCHITECTURE_RULES.md** (5 min) ← Critical rules

**Reference when needed:**
- **TAX_ENGINE_MIGRATION_STRATEGY.md** - Tax engine specifics
- **MIGRATION_EXECUTION_CHECKLIST.md** - Day-by-day plan
- **AGENT_WORKFLOW_GUIDE.md** - Development workflow

---

## Setup Your Environment (30 minutes)

### 1. Prerequisites

```bash
# Check Node.js (need 20+)
node --version  # Should be v20.x.x or higher

# Check Rust (for tax engine)
rustc --version  # Should be 1.70+ or install from https://rustup.rs

# Check Go (for backend services)
go version  # Should be 1.22+ or install from https://go.dev

# Check Git
git --version

# Check Docker (for local development)
docker --version
docker-compose --version
```

### 2. Clone and Setup

```bash
# Ensure you're on the right branch
git checkout feat/unbreakable-architecture
git pull origin feat/unbreakable-architecture

# Install root dependencies
npm install

# Install wasm-pack (for Rust → WASM)
cargo install wasm-pack

# Verify setup
npm run validate  # Should pass (or fail if not set up yet)
```

### 3. Run Setup Scripts

**IMPORTANT:** Only run these after Phase 1 approval!

```bash
# Create directory structure
bash scripts/setup-clean-rebuild.sh

# Setup frontend
npm run setup:frontend

# Setup Rust tax engine
npm run setup:rust

# Setup Go services (example)
npm run setup:go deal-engine-go
```

---

## Daily Workflow

### Morning Routine (5 minutes)

```bash
# 1. Pull latest changes
git checkout feat/unbreakable-architecture
git pull origin feat/unbreakable-architecture

# 2. Verify everything compiles
npm run typecheck

# 3. Run tests
npm test

# 4. Check your assigned tasks
# Open MIGRATION_EXECUTION_CHECKLIST.md
# Find your name, see what's assigned for today
```

### Before Making Changes

```bash
# 1. Read ARCHITECTURE_RULES.md for the area you're working on
# 2. Read AGENT_WORKFLOW_GUIDE.md for workflow discipline
# 3. Ask yourself: "Where does this code belong?"
#    - UI rendering? → frontend/
#    - Business logic? → services/
#    - API orchestration? → gateway/
```

### Making Changes

```bash
# 1. Create feature branch (optional, for large features)
git checkout -b feat/your-feature-name

# 2. Make your changes
# Follow the patterns in existing code

# 3. Run quality gates BEFORE committing
npm run lint       # Should pass
npm run typecheck  # Should pass
npm test           # Should pass

# 4. Commit with conventional commits format
git add .
git commit -m "feat(module): description of change"

# Commit types:
# - feat: New feature
# - fix: Bug fix
# - refactor: Code restructure
# - test: Add/update tests
# - docs: Documentation
```

### End of Day

```bash
# 1. Push your work
git push origin feat/unbreakable-architecture

# 2. Update MIGRATION_EXECUTION_CHECKLIST.md
# Check off completed tasks

# 3. Update team (Slack, standup notes, etc.)
# - What you completed today
# - What you're working on tomorrow
# - Any blockers
```

---

## Common Tasks

### Adding a New Frontend Component

```typescript
// frontend/src/modules/deals/components/DealCard.tsx

import { useDeal } from '../hooks/useDeal';

interface DealCardProps {
  dealId: string;
}

export function DealCard({ dealId }: DealCardProps) {
  const { data: deal, isLoading } = useDeal(dealId);

  if (isLoading) return <div>Loading...</div>;
  if (!deal) return <div>Deal not found</div>;

  return (
    <div>
      <h2>Deal #{deal.id}</h2>
      <p>Amount: ${deal.totalAmount}</p>
    </div>
  );
}
```

**Rules:**
- ❌ NO business logic in components
- ❌ NO API calls directly (use hooks)
- ✅ ONLY UI rendering
- ✅ Use hooks from `hooks/` for data

### Adding a New API Hook

```typescript
// frontend/src/modules/deals/hooks/useDeal.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/http/client';
import type { Deal } from '@shared/types/deal';

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => apiClient<Deal>(`/api/deals/${dealId}`),
  });
}
```

**Rules:**
- ✅ Use React Query for data fetching
- ✅ Use `apiClient` from `@core/http/client`
- ✅ Import types from `@shared/types`

### Adding a New API Endpoint (Go Service)

```go
// services/deal-engine-go/internal/handlers/deals.go

func (h *DealHandler) GetDeal(w http.ResponseWriter, r *http.Request) {
    // 1. Extract ID from path
    id := r.PathValue("id")

    // 2. Call service
    deal, err := h.dealService.GetByID(r.Context(), id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    // 3. Return JSON
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(deal)
}
```

**Rules:**
- ✅ Handlers only parse requests and call services
- ✅ Services contain business logic
- ✅ Log all operations
- ❌ NO database access in handlers

### Running the Tax Engine Locally

```bash
# 1. Build Rust to WASM
cd services/tax-engine-rs
./build.sh

# 2. WASM output will be in gateway/src/wasm/tax-engine-node

# 3. Use in gateway
cd ../../gateway
npm run dev

# 4. Test
curl -X POST http://localhost:3000/api/tax/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test",
    "dealType": "RETAIL",
    "vehiclePrice": 50000,
    "stateCode": "CA"
  }'
```

### Running Tests

```bash
# Run all tests
npm test

# Run frontend tests only
cd frontend && npm test

# Run Rust tests
cd services/tax-engine-rs && cargo test

# Run Go tests
cd services/deal-engine-go && go test ./...

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

---

## Architecture Patterns

### Frontend Module Structure

```
modules/deals/
├── components/       # React components (UI only)
│   ├── DealCard.tsx
│   └── index.ts     # Export all components
│
├── hooks/           # Data fetching hooks
│   ├── useDeal.ts   # Read operations (useQuery)
│   ├── useCreateDeal.ts  # Write operations (useMutation)
│   └── index.ts
│
├── types/           # UI-specific types
│   └── index.ts     # Re-export from @shared/types
│
└── index.ts         # Module public API
```

**Import pattern:**
```typescript
// ✅ Good: Use module public API
import { DealCard, useDeal } from '@modules/deals';

// ❌ Bad: Deep import into module internals
import { DealCard } from '@modules/deals/components/DealCard';
```

### Go Service Layering

```
Handlers → Services → Domain → Repositories

✅ Handlers: Parse HTTP, call services
✅ Services: Orchestrate domain logic
✅ Domain: Business rules and validation
✅ Repositories: Database CRUD only
```

**Example:**
```go
// Handler
func (h *Handler) CreateDeal(w http.ResponseWriter, r *http.Request) {
    var req CreateDealRequest
    json.NewDecoder(r.Body).Decode(&req)

    deal, err := h.service.CreateDeal(r.Context(), req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(deal)
}

// Service
func (s *Service) CreateDeal(ctx context.Context, req CreateDealRequest) (*Deal, error) {
    // 1. Create domain entity
    deal := domain.NewDeal(req.CustomerID, req.VehicleID)

    // 2. Validate
    if err := deal.Validate(); err != nil {
        return nil, err
    }

    // 3. Save to database
    if err := s.repo.Create(ctx, deal); err != nil {
        return nil, err
    }

    return deal, nil
}

// Domain
func (d *Deal) Validate() error {
    if d.CustomerID == "" {
        return errors.New("customer_id required")
    }
    // ... more validation
    return nil
}

// Repository
func (r *Repo) Create(ctx context.Context, deal *Deal) error {
    query := "INSERT INTO deals (id, customer_id, ...) VALUES ($1, $2, ...)"
    _, err := r.db.ExecContext(ctx, query, deal.ID, deal.CustomerID, ...)
    return err
}
```

---

## Debugging Tips

### Frontend Issues

```bash
# Check browser console
# - API errors?
# - Type errors?
# - React errors?

# Check React Query DevTools
# - What queries are running?
# - What's the cache state?

# Check network tab
# - Are API calls going to the right endpoint?
# - What's the response status?

# Enable verbose logging
# frontend/src/core/logger/logger.ts
logger.level = 'debug';
```

### Backend Issues

```bash
# Check logs
tail -f /tmp/gateway.log
tail -f /tmp/deal-service.log

# Check if services are running
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/health  # Deal service

# Check database connection
psql -h localhost -U postgres -d autolytiq

# Enable Go race detector
go run -race cmd/server/main.go
```

### Tax Engine Issues

```bash
# Run Rust tests with verbose output
cd services/tax-engine-rs
cargo test -- --nocapture

# Build WASM and check for errors
./build.sh

# Check WASM output
ls -lh ../../gateway/src/wasm/tax-engine-node/

# Test WASM in Node.js REPL
node
> const wasm = require('./gateway/src/wasm/tax-engine-node/tax_engine.js');
> wasm.calculate_tax('{"state_code": "CA", ...}');
```

---

## Getting Help

### Documentation
1. **CLEAN_REBUILD_FOUNDATION_PLAN.md** - Architecture details
2. **TAX_ENGINE_MIGRATION_STRATEGY.md** - Tax engine specifics
3. **ARCHITECTURE_RULES.md** - Development rules
4. **AGENT_WORKFLOW_GUIDE.md** - Workflow discipline

### Code Examples
- Look at existing code in the same module
- Check tests for usage examples
- Read OpenAPI specs for API contracts

### Team
- **Project Lead:** ___
- **Tax Engine Expert:** ___
- **Code Review Lead:** ___
- **DevOps Lead:** ___

### Escalation
1. Ask team in Slack
2. Ask project lead
3. Escalate to engineering manager

---

## Checklist for Your First Contribution

- [ ] Read CLEAN_REBUILD_SUMMARY.md
- [ ] Read docs/ARCHITECTURE_DIAGRAM.md
- [ ] Skim CLEAN_REBUILD_FOUNDATION_PLAN.md
- [ ] Read ARCHITECTURE_RULES.md
- [ ] Setup development environment
- [ ] Run `npm run validate` successfully
- [ ] Understand module boundaries (no cross-module imports)
- [ ] Understand layering (Handlers → Services → Domain → Repositories)
- [ ] Know where business logic goes (NOT in UI components)
- [ ] Commit format: `feat(module): description`
- [ ] Quality gates pass before committing
- [ ] Structured logging added for new code
- [ ] Tests written for new code
- [ ] Ready to contribute! 🚀

---

## Anti-Patterns to Avoid

### ❌ Business Logic in React Components

```typescript
// ❌ Bad
function DealCard({ deal }) {
  const tax = deal.price * 0.0725;  // NO! Tax logic in UI
  return <div>Tax: ${tax}</div>;
}

// ✅ Good
function DealCard({ dealId }) {
  const { data: tax } = useTaxCalculation(dealId);
  return <div>Tax: ${tax?.amount || 0}</div>;
}
```

### ❌ Using `any` Type

```typescript
// ❌ Bad
function processData(data: any) {
  return data.something;  // NO! Type safety bypassed
}

// ✅ Good
interface Data {
  something: string;
}

function processData(data: Data) {
  return data.something;
}
```

### ❌ Cross-Module Imports

```typescript
// ❌ Bad
import { CustomerService } from '@modules/customer/services/CustomerService';

// ✅ Good
import { useCustomer } from '@modules/customer';
// OR call via API
const customer = await apiClient('/api/customers/123');
```

### ❌ Database Access from Frontend

```typescript
// ❌ Bad
import { db } from '@/server/db';
const deals = await db.select().from(deals);  // NO!

// ✅ Good
const { data: deals } = useQuery({
  queryKey: ['deals'],
  queryFn: () => apiClient('/api/deals'),
});
```

---

## Success Metrics

Track your progress:

- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] Commits follow conventional format
- [ ] No `any` types in new code
- [ ] All new features logged
- [ ] All APIs have OpenAPI specs
- [ ] No business logic in UI components

---

## Remember

1. **Quality over speed** - Take time to do it right
2. **Ask questions early** - Don't guess
3. **Follow the patterns** - Consistency is key
4. **Test everything** - No untested code
5. **Log everything** - Observability is critical
6. **Read the docs** - Answers are documented
7. **Trust the process** - This architecture will work

---

**Welcome to the team! Let's build something great. 🚀**
