# Autolytiq Architecture Rules - UNBREAKABLE

**Last Updated:** 2025-11-23
**Status:** ACTIVE - These rules must be followed in ALL sessions

## Mission

Stabilize and harden the Autolytiq codebase with strict, opinionated architecture that makes it **physically impossible** to write bad code.

---

## Rule 1: Branch & Workflow

### Branching Strategy
- **NEVER commit directly to `main`**
- All work happens on `feat/unbreakable-architecture` or child branches
- Changes reach `main` ONLY via Pull Requests

### Before ANY Changes
```bash
# ALWAYS check current branch first
git branch

# If not on feat/unbreakable-architecture:
git checkout feat/unbreakable-architecture
```

### Every Logical Unit of Work Must:
1. Be implemented correctly
2. Pass formatting (`npm run format` or Prettier)
3. Pass linting (`npm run lint`)
4. Pass type checking (`npm run typecheck`)
5. Include tests for core flows
6. Be committed with clear, descriptive commit message

---

## Rule 2: Layered Architecture & Boundaries

### Target Structure
```
autolytiq/
├── frontend/                 # Next.js app - ONLY UI + API gateway
│   └── src/
│       ├── app/             # Next.js routes, layouts, server actions
│       ├── modules/         # Feature modules
│       │   ├── deals/
│       │   ├── tax/
│       │   ├── customers/
│       │   ├── inventory/
│       │   └── email/
│       └── core/            # Cross-cutting concerns
│           ├── config/
│           ├── http/
│           ├── logger/      # ✅ Structured logging (pino)
│           ├── types/
│           └── ui/
│
├── services/                # Backend services - ALL domain logic
│   ├── tax-engine-rs/      # Rust - Pure tax calculation logic
│   ├── deal-engine-go/     # Go - Deal/pricing service
│   ├── customers-go/       # Go - Customer service
│   └── inventory-go/       # Go - Inventory service
│
└── gateway/                 # Optional Node/TS BFF or API gateway
```

### Hard Boundaries

**UI Layer (React Components, Pages)**
- ✅ CAN: Render UI, validate user input, call backend APIs, display results
- ❌ CANNOT: Contain business logic (tax math, payment calculations, deal pricing)
- ❌ CANNOT: Directly access database
- ❌ CANNOT: Contain complex domain logic

**Domain Logic (Tax, Deals, Pricing, Inventory)**
- ✅ MUST: Live in backend services (Go/Rust/Node)
- ❌ CANNOT: Live in React components
- ❌ CANNOT: Be duplicated across layers

**Logging & Observability** (see Rule 8)
- ✅ MUST: Use structured logging (`@core/logger`)
- ✅ MUST: Log all API endpoints, business events, errors with full context
- ❌ CANNOT: Use console.log in production code

### Refactoring Requirement
When touching code that violates these boundaries, you MUST refactor it toward the correct structure.

---

## Rule 3: Types & Contracts

### Single Source of Truth
- Define API contracts ONCE in a schema or OpenAPI spec
- Generate types for frontend and backend from that spec
- NO hand-rolled duplicate types for the same concept

### Required Type Consistency
For these core domains:
- Customer
- Vehicle / InventoryItem
- Deal
- TaxRequest / TaxResponse
- EmailMessage / Draft

Types MUST be consistent across:
- Backend service
- API gateway
- Frontend

### Change Protocol
When changing an API request/response shape:
1. Update the schema/contract
2. Regenerate types
3. Update all affected call sites
4. Ensure typechecking passes
5. Update tests

---

## Rule 4: TypeScript Discipline

### Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Safety Rules
- ✅ Fix type errors instead of suppressing them
- ❌ `any` is ONLY allowed when:
  - There is a clear TODO comment
  - You explain WHY it's needed
  - You document HOW to remove it later

### Unbreakable Rule
**If `npm run typecheck` fails, the change is NOT acceptable.**

---

## Rule 5: Quality Gates - MUST PASS

Every significant change MUST satisfy:

```bash
npm run lint        # ESLint - code quality
npm run typecheck   # TypeScript - type safety
npm run test        # Tests - functionality
npm run build       # Build - ensure it compiles
```

### If Scripts Don't Exist
Your first job is to:
1. Add them to `package.json`
2. Configure ESLint, Prettier, and TypeScript
3. Ensure they run successfully

### Unbreakable Rule
**You MUST NOT suggest or apply changes that leave the project in a non-building or non-typechecking state.**

---

## Rule 6: Protected Core Flows

These flows MUST remain stable:

1. **Create/edit customer**
2. **Create/edit deal**
3. **Attach inventory item/vehicle to deal**
4. **Run tax & payment calculations**
5. **Save/send email** (Resend or other provider)
6. **Load the deal workspace**

### When Touching These Flows
You MUST:
- Think about downstream impacts
- Ensure tests exist (or add tests)
- Avoid breaking inputs/outputs without updating all consumers
- Log all operations with full context (dealId, customerId, userId)

---

## Rule 7: Module Boundaries - Enforced by ESLint

### Import Rules
```typescript
// ✅ ALLOWED
import { DealService } from '@/modules/deal';           // Module public API
import { logger } from '@core/logger';                   // Core utilities
import { TaxCalculation } from '@shared/types';          // Shared types

// ❌ FORBIDDEN
import { calculateTax } from '@/modules/tax/services/tax-calculator';  // Internal module path
import { db } from '@/server/db';                       // Direct DB access from app layer
import { CustomerService } from '@/modules/customer';   // Cross-module import (use API)
```

### Boundary Violations
ESLint MUST block:
- Cross-module imports (modules can't import from other modules)
- App layer importing from database layer
- Client code importing from server code
- Parent directory imports (use path aliases instead)

---

## Rule 8: Logging & Observability - REQUIRED

### Structured Logging
```typescript
import { logger } from '@core/logger';

// ✅ CORRECT - Structured with context
logger.info({
  msg: 'DEAL_CREATED',
  dealId: deal.id,
  customerId: customer.id,
  userId: req.user.id,
  amount: deal.totalAmount
});

// ❌ WRONG - Unstructured
console.log('Deal created:', deal.id);
```

### Required Logging

**Every API Endpoint MUST Log:**
```typescript
// Request received
logger.info({ msg: 'HTTP_REQUEST', requestId, method, url, userId });

// Business event
logger.info({ msg: 'DEAL_CREATED', dealId, customerId, amount });

// Errors with full context
logger.error({
  msg: 'TAX_CALC_FAILED',
  error: error.message,
  stack: error.stack,
  dealId,
  state,
  zipCode
});

// Response
logger.info({ msg: 'HTTP_RESPONSE', requestId, statusCode, durationMs });
```

**Performance Monitoring:**
```typescript
const startTime = Date.now();
// ... operation
const duration = Date.now() - startTime;

if (duration > 1000) {
  logPerformance('TAX_CALCULATION', duration, { dealId, state });
}
```

### What NOT to Log
```typescript
// ❌ NEVER log sensitive data
logger.info({ creditCardNumber: '4111...' });  // NO
logger.info({ ssn: '123-45-6789' });           // NO
logger.info({ password: 'abc123' });           // NO

// ✅ Log sanitized versions
logger.info({ customerId, lastFourCC: '4242' });  // YES
```

### Quality Gate
- PR template requires logging checklist
- ESLint blocks console.log usage
- Full context required in all error logs

For full logging standards, see `docs/LOGGING_STANDARDS.md`

---

## Rule 9: Git Commit Standards

### Conventional Commits Format
```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Allowed Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `test` - Test additions/changes
- `docs` - Documentation
- `build` - Build system changes
- `ci` - CI/CD changes
- `perf` - Performance improvements
- `style` - Code style changes (formatting)
- `chore` - Other changes that don't modify src

### Enforcement
- Pre-commit hooks run lint, typecheck, format
- Commit message format is validated
- Quality gates MUST pass before commit

---

## Rule 10: Pull Request Requirements

### Every PR MUST Include

**1. Description:**
- What changed and why
- Related issue numbers
- Breaking changes highlighted

**2. Type of Change:**
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

**3. Checklist:**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Dependent changes merged

**4. Logging & Observability:** (for feat/fix PRs)
- [ ] Added logging for key operations
- [ ] Errors logged with full context
- [ ] Performance monitoring added if needed

### Code Review
- Critical paths require review (see CODEOWNERS)
- `/src/core/` changes require review
- `/shared/schema.ts` changes require review
- `/src/modules/tax/` changes require review

---

## Rule 11: Long-Term Behavior Across Sessions

### At Start of EVERY Session

```bash
# 1. Check current branch
git branch

# 2. Switch if needed
git checkout feat/unbreakable-architecture

# 3. Pull latest
git pull origin feat/unbreakable-architecture
```

### Before Making Changes
1. Re-read these architecture rules
2. Scan existing structure to understand current state
3. Align your changes with the rules
4. Prefer refactoring toward correct architecture over quick hacks

### When Given Vague Requests
Examples: "fix the tax calc", "make this page work"

You MUST interpret through these rules:
- Move logic into correct service/module
- Tighten types
- Add tests
- Add logging
- NOT do quick hacks in React components

---

## Rule 12: Refusing Shortcuts

### You Must Refuse
- Commits that bypass quality gates (--no-verify)
- Changes that break TypeScript compilation
- Adding business logic to React components
- Using `any` without justification
- Cross-module imports
- Removing tests to make code "work"
- Console.log instead of structured logging

### Even When Pressured
These rules exist to prevent technical debt. Refusing shortcuts protects the project's long-term health.

---

## First Actions in New Session

### 1. Confirm Environment
```bash
git status
git branch
npm run typecheck  # Verify project compiles
```

### 2. Inspect Structure
Check:
- Current frontend structure (app/, modules/, core/)
- Where domain logic currently lives
- Where services (if any) live
- What violations exist

### 3. Propose Plan
Create step-by-step plan to:
- Stabilize TypeScript (strict mode, lint, tests)
- Clean up layered structure
- Prepare for service extraction (tax engine, deal engine)

### 4. Wait for Confirmation
Do NOT make large-scale file moves without explicit approval.

---

## Current State (as of 2025-11-23)

### ✅ Completed
- Core logging infrastructure (pino, structured logging)
- Request/response logging middleware
- Performance monitoring for slow requests
- PR template with logging checklist
- CHANGELOG.md for release tracking
- CODEOWNERS for critical path reviews
- TypeScript strict mode configuration
- ESLint with architectural boundary enforcement
- Pre-commit hooks (Husky) with quality gates
- CI/CD enforcement workflows
- 184 integration tests
- Module architecture foundation
- Design token system for UI consistency

### 🚧 In Progress
- Fixing remaining TypeScript compilation errors
- Migrating all client code to proper structure
- Extracting domain logic from React components
- Module boundary violations cleanup

### 📋 Planned
- Extract tax engine to Rust service
- Extract deal engine to Go service
- Extract customer service to Go
- Extract inventory service to Go
- Implement API gateway/BFF
- GraphQL federation layer
- Comprehensive test coverage (>80%)

---

## Success Criteria

The architecture is successful when:

- [ ] Zero TypeScript errors in strict mode
- [ ] Zero ESLint violations
- [ ] All tests pass (>80% coverage)
- [ ] All core flows have integration tests
- [ ] Module boundaries enforced by ESLint
- [ ] CI/CD pipeline blocks bad code
- [ ] Build time <30 seconds
- [ ] Zero runtime errors in production
- [ ] Structured logging on all endpoints
- [ ] All business logic in backend services
- [ ] Frontend is purely presentational
- [ ] API contracts defined once
- [ ] Types generated from contracts
- [ ] Deployment confidence: HIGH

---

## Contact & Escalation

**Architecture Guardian:** Claude Code (this AI assistant)
**Enforcement:** Automated (ESLint, TypeScript, pre-commit hooks, CI/CD)
**Escalation:** Critical blockers stop all work until resolved

---

**Remember:** These rules exist to create a codebase that **physically rejects bad code**. Every change must reduce complexity, not add it.
