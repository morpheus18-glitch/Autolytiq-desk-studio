# Agent Workflow Guide - MANDATORY FOR ALL AI AGENTS

**Last Updated:** 2025-11-23
**Status:** ACTIVE - All AI agents MUST follow this guide in EVERY session
**Branch:** feat/unbreakable-architecture

---

## Mission Statement

This guide ensures **consistent, disciplined, systematic work** across all AI agent sessions. Every agent (Claude Code, GPT, Cursor, etc.) working on this codebase MUST follow these workflows without exception.

---

## Rule 0: Before ANYTHING Else

### At the Start of EVERY Session

```bash
# 1. Check where you are
git branch
git status

# 2. Ensure you're on the right branch
git checkout feat/unbreakable-architecture

# 3. Pull latest changes
git pull origin feat/unbreakable-architecture

# 4. Verify project compiles
npm run typecheck
```

### Read These Files FIRST (IN ORDER)
1. **MANDATORY_SESSION_START.md** - CRITICAL: Read this FIRST every session
2. **ARCHITECTURE_RULES.md** - Unbreakable architecture rules
3. **THIS FILE** (AGENT_WORKFLOW_GUIDE.md) - Workflow discipline
4. **CLAUDE.md** - Current project status and priorities
5. **docs/WEEK2_PLAN.md** - Current phase implementation plan

**DO NOT** start coding until you've read and understood ALL files.

---

## Rule 1: Planning Before Coding

### Every Task MUST Start With Planning

**Before writing ANY code:**

1. **Understand the request fully**
   - Ask clarifying questions if ambiguous
   - Identify which modules/services are affected
   - Check if it fits the architecture (frontend vs backend)

2. **Create a TODO list** (using TodoWrite tool if available)
   ```
   [ ] Research existing code
   [ ] Design the solution
   [ ] Write tests first (TDD)
   [ ] Implement solution
   [ ] Run quality gates (lint, typecheck, test)
   [ ] Document changes
   [ ] Commit with proper message
   ```

3. **Present the plan to the user**
   - "Here's what I'm going to do..."
   - Wait for confirmation on large changes
   - Explain tradeoffs if multiple approaches exist

### When NOT to Code

**STOP and ask for clarification if:**
- The request violates architecture rules (e.g., "add business logic to React component")
- The request requires breaking changes to core flows
- You don't understand where the code should live (frontend vs service)
- The request would bypass quality gates or introduce `any` types

**Example:**
```
User: "Add tax calculation to the DealCard component"

Agent: "I notice this request would add business logic to a UI component,
which violates our architecture rules (ARCHITECTURE_RULES.md, Rule 2).

Tax calculation belongs in the tax-engine-rs service. Instead, I propose:
1. Ensure tax-engine-rs has the calculation endpoint
2. Update DealCard to call that service
3. Display the result in the UI

Is this approach acceptable?"
```

---

## Rule 2: Code Location Discipline

### Always Ask: "Where Does This Belong?"

```
┌─────────────────────────────────────────────────────────┐
│ Decision Tree: Where Should This Code Live?            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Is it UI rendering, user input, or API calls?         │
│  ├─ YES → frontend/ (React components, pages)          │
│  └─ NO → Continue...                                   │
│                                                         │
│  Is it business logic (tax, pricing, rules)?           │
│  ├─ Tax calculation → services/tax-engine-rs/          │
│  ├─ Deal pricing → services/deal-go/                   │
│  ├─ Customer logic → services/customer-go/             │
│  ├─ Inventory logic → services/inventory-go/           │
│  └─ NO → Continue...                                   │
│                                                         │
│  Is it cross-cutting (logging, config, auth)?          │
│  ├─ YES → frontend/src/core/ OR gateway/               │
│  └─ NO → Continue...                                   │
│                                                         │
│  Is it API orchestration (multiple service calls)?     │
│  ├─ YES → gateway/ (BFF pattern)                       │
│  └─ NO → shared/contracts/ (types, schemas)            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Forbidden Patterns

**NEVER do these:**
```typescript
// ❌ Business logic in React component
function DealCard({ deal }) {
  const calculateTax = () => {
    return deal.price * 0.0725; // NO! Tax logic in UI
  };
}

// ❌ Direct database access from frontend
import { db } from '@/server/db';
const customers = await db.select().from(customers); // NO!

// ❌ Cross-module imports
import { CustomerService } from '@/modules/customer'; // NO!

// ❌ Using 'any' without justification
function processData(data: any) { // NO!
```

**ALWAYS do this:**
```typescript
// ✅ UI calls backend service
function DealCard({ deal }) {
  const { data: taxData } = useQuery(['tax', deal.id], () =>
    fetch('/api/tax/calculate', {
      method: 'POST',
      body: JSON.stringify({ dealId: deal.id })
    }).then(r => r.json())
  );
}

// ✅ Types are explicit and generated from schema
interface TaxResponse {
  dealId: string;
  taxAmount: number;
  rate: number;
  jurisdiction: string;
}
```

---

## Rule 3: Test-Driven Development

### Write Tests BEFORE Implementation

**For every new feature or bug fix:**

1. **Write the failing test first**
   ```typescript
   // tests/services/tax-engine.test.ts
   describe('TaxEngine', () => {
     it('should calculate CA sales tax correctly', () => {
       const result = calculateTax({
         state: 'CA',
         county: 'Los Angeles',
         amount: 50000
       });

       expect(result.taxAmount).toBeCloseTo(3625);
       expect(result.rate).toBe(0.0725);
     });
   });
   ```

2. **Run the test - it should FAIL**
   ```bash
   npm test -- tax-engine.test.ts
   # Should show: FAIL ✗ should calculate CA sales tax correctly
   ```

3. **Implement the solution**
   ```typescript
   // Implementation in services/tax-engine-rs/
   ```

4. **Run the test - it should PASS**
   ```bash
   npm test -- tax-engine.test.ts
   # Should show: PASS ✓ should calculate CA sales tax correctly
   ```

### Test Coverage Requirements

- **Core flows (tax, deals, pricing):** >90% coverage
- **UI components:** >70% coverage
- **Utilities:** >80% coverage

**Before committing, check coverage:**
```bash
npm run test:coverage
```

---

## Rule 4: Quality Gates - NEVER SKIP

### Every Change MUST Pass These

```bash
# 1. TypeScript type checking
npm run typecheck
# MUST show: No errors found

# 2. Linting
npm run lint
# MUST show: No errors, no warnings

# 3. Tests
npm test
# MUST show: All tests passed

# 4. Build
npm run build
# MUST succeed without errors
```

### If Quality Gates Fail

**DO NOT:**
- Suppress the error with `@ts-ignore` or `eslint-disable`
- Comment out the failing test
- Commit with `--no-verify` to bypass hooks
- Use `any` type to make it pass

**DO:**
- Fix the root cause
- Refactor if necessary
- Ask for help if stuck
- Propose architecture changes if rules are wrong

---

## Rule 5: Structured Logging - ALWAYS

### Every API Endpoint, Every Service Call

```typescript
import { logger } from '@core/logger';

// ✅ Log the request
logger.info({
  msg: 'TAX_CALC_STARTED',
  dealId,
  state,
  zipCode,
  userId,
  requestId
});

try {
  const result = await calculateTax(params);

  // ✅ Log success with metrics
  logger.info({
    msg: 'TAX_CALC_SUCCESS',
    dealId,
    taxAmount: result.amount,
    rate: result.rate,
    durationMs: Date.now() - startTime
  });

  return result;
} catch (error) {
  // ✅ Log errors with FULL context
  logger.error({
    msg: 'TAX_CALC_FAILED',
    error: error.message,
    stack: error.stack,
    dealId,
    state,
    zipCode,
    userId
  });

  throw error;
}
```

### What to Log

**Always log:**
- Request received (HTTP_REQUEST)
- Business events (DEAL_CREATED, TAX_CALCULATED)
- Errors with full context
- Response sent (HTTP_RESPONSE)
- Performance metrics for slow operations (>1s)

**Never log:**
- Passwords, API keys, secrets
- Credit card numbers, SSNs
- Unredacted PII

---

## Rule 6: Git Commit Discipline

### Conventional Commits Format

```
<type>(<scope>): <subject>

<optional body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure (no behavior change)
- `test`: Add/update tests
- `docs`: Documentation
- `build`: Build system changes
- `ci`: CI/CD changes
- `perf`: Performance improvement
- `style`: Code style (formatting)

### Examples

```bash
# ✅ Good commits
git commit -m "feat(tax): add CA county tax lookup service"
git commit -m "fix(deals): correct payment calculation rounding"
git commit -m "refactor(ui): extract DealCard into presentational component"
git commit -m "test(tax): add integration tests for multi-state calculations"

# ❌ Bad commits
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "asdf"
git commit -m "final final FINAL version"
```

### Commit Checklist

Before every commit:
- [ ] Quality gates pass (typecheck, lint, test, build)
- [ ] Code follows architecture rules
- [ ] Tests added/updated
- [ ] Logging added for new operations
- [ ] Documentation updated if needed
- [ ] No sensitive data included
- [ ] Commit message follows convention

---

## Rule 7: Migration Strategy

### When Migrating Existing Files

**Follow this process:**

1. **Identify the file's purpose**
   - Is it UI? → `frontend/src/`
   - Is it business logic? → `services/`
   - Is it shared types? → `shared/contracts/`

2. **Check dependencies**
   - What does it import?
   - What imports it?
   - Can it be moved independently?

3. **Write tests for current behavior**
   ```bash
   # Capture current behavior first
   npm test -- old-file.test.ts
   ```

4. **Move/rewrite the file**
   ```bash
   # Example: Moving tax calculation
   # OLD: server/tax-calculator.ts
   # NEW: services/tax-engine-rs/src/calculator.rs
   ```

5. **Ensure tests still pass**
   ```bash
   npm test
   ```

6. **Update all imports**
   ```bash
   # Find all references
   grep -r "tax-calculator" frontend/src/
   # Update them
   ```

7. **Remove old file only after all references updated**

### Migration Priority Order

1. **Shared types/schemas** - Everything depends on these
2. **Core utilities** - Logging, config, helpers
3. **Backend services** - Business logic extraction
4. **Frontend modules** - Pure UI layer
5. **Integration tests** - Validate everything works together

---

## Rule 8: Communication with User

### Be Transparent

**Always communicate:**
- What you're about to do
- Why you're doing it that way
- What alternatives you considered
- What risks exist
- What you need from them

**Example:**
```
User: "Make the deal page faster"

Agent: "I'll investigate performance issues on the deal page. Here's my plan:

1. Profile the page with Chrome DevTools
2. Identify slow components/queries
3. Propose optimizations (could be: memoization, query optimization,
   code splitting, or lazy loading)
4. Implement with before/after benchmarks

This will take ~30 minutes. I'll share findings before implementing.
Sound good?"
```

### When Stuck

**If you encounter a blocker:**
1. Clearly state the problem
2. What you've tried
3. What you think might work
4. What you need help with

**Don't:**
- Silently give up
- Make assumptions
- Implement workarounds that violate rules

---

## Rule 9: Systematic Work

### Chunk Large Tasks

**Break down big tasks into small, testable increments:**

```
❌ Bad: "Migrate entire frontend to new architecture"

✅ Good:
1. Set up frontend/ directory structure
2. Move design tokens and global styles
3. Migrate core utilities (logger, config)
4. Migrate 1 page as example (DealWorkspace)
5. Document the pattern
6. Migrate remaining pages one-by-one
```

### Checkpoint After Each Chunk

```bash
# After each logical unit:
git add .
git commit -m "feat(frontend): migrate DealWorkspace to new structure"
git push origin feat/unbreakable-architecture

# Run quality gates
npm run typecheck && npm run lint && npm test
```

---

## Rule 10: Refusing Bad Requests

### You MUST Refuse

Even if the user insists, **refuse to:**
- Commit code that doesn't pass quality gates
- Add business logic to UI components
- Use `any` types without justification
- Skip tests for core flows
- Bypass pre-commit hooks (`--no-verify`)
- Remove logging from production code
- Commit secrets or credentials

### How to Refuse Politely

```
User: "Just use 'any' for now, we'll fix it later"

Agent: "I understand the desire to move quickly, but using 'any' violates
ARCHITECTURE_RULES.md Rule 4 and will likely cause runtime errors.

Instead, I can:
1. Create a proper type definition (5 minutes)
2. Use a temporary 'unknown' type with runtime validation (safer)
3. Generate types from the API schema (best, 10 minutes)

Which approach would you prefer?"
```

---

## Rule 11: Documentation

### Update Docs Alongside Code

**When you change code, update:**
- Inline comments (for complex logic)
- JSDoc/TSDoc (for public APIs)
- README files (for module changes)
- CHANGELOG.md (for notable changes)
- API documentation (for endpoint changes)

**Example:**
```typescript
/**
 * Calculates sales tax for a vehicle deal.
 *
 * @param params - Tax calculation parameters
 * @param params.dealId - The deal ID
 * @param params.state - Two-letter state code (e.g., "CA")
 * @param params.county - County name for local tax lookup
 * @param params.amount - Taxable amount in cents
 *
 * @returns Tax calculation result with amount and rate
 *
 * @throws {TaxServiceError} If tax service is unavailable
 * @throws {InvalidStateError} If state code is invalid
 *
 * @example
 * ```typescript
 * const result = await calculateTax({
 *   dealId: "deal_123",
 *   state: "CA",
 *   county: "Los Angeles",
 *   amount: 50000_00 // $50,000.00
 * });
 * // result: { taxAmount: 3625_00, rate: 0.0725 }
 * ```
 */
export async function calculateTax(params: TaxParams): Promise<TaxResult>
```

---

## Rule 12: Performance Awareness

### Monitor Performance

**For expensive operations:**

```typescript
const startTime = Date.now();

const result = await expensiveOperation();

const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn({
    msg: 'SLOW_OPERATION',
    operation: 'calculateTax',
    durationMs: duration,
    dealId,
    state
  });
}
```

### Set Performance Budgets

- **API endpoints:** <500ms p95
- **Page load:** <2s
- **Build time:** <30s
- **Test suite:** <10s

**If you exceed budget, investigate and optimize.**

---

## Emergency Procedures

### If Production is Broken

1. **STOP all other work**
2. **Check logs immediately**
   ```bash
   npm run logs
   ```
3. **Identify the breaking change**
   ```bash
   git log --oneline -10
   ```
4. **Create hotfix branch from main**
   ```bash
   git checkout main
   git checkout -b hotfix/production-critical
   ```
5. **Fix the issue**
6. **Deploy immediately after minimal testing**
7. **Notify team**

### If You Break the Build

1. **Don't commit more code**
2. **Fix it immediately**
3. **Run all quality gates**
4. **Force push if needed (only on feature branch)**
   ```bash
   git commit --amend
   git push -f origin feat/unbreakable-architecture
   ```

---

## Success Metrics

### You're Following This Guide When:

- ✅ Every PR passes all quality gates on first try
- ✅ Test coverage increases with each change
- ✅ Zero production errors from your changes
- ✅ Code reviews have minimal feedback
- ✅ Documentation is always up-to-date
- ✅ User trusts your work without double-checking
- ✅ Future agents can pick up your work seamlessly

---

## Contact & Support

**For Questions About This Guide:**
- Read ARCHITECTURE_RULES.md first
- Check existing code for examples
- Ask user for clarification if still unclear

**For Architecture Decisions:**
- Propose options with tradeoffs
- Wait for user confirmation
- Document the decision in code comments

---

**Remember:** This guide exists to ensure **predictable, high-quality, consistent work** across all sessions and all agents. Following it protects the codebase and earns trust.

**When in doubt, ask. Never guess.**
