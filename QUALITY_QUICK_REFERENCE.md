# Code Quality Fortress - Quick Reference

## What Happens on Every Commit

```
git commit -m "your message"
  ↓
🔒 CODE QUALITY FORTRESS ACTIVATES
  ↓
6 VALIDATION CHECKS RUN AUTOMATICALLY
  ↓
✅ ALL PASS → Commit allowed
❌ ANY FAIL → Commit BLOCKED
```

---

## The 6 Enforcement Checks

| # | Check | What it Does | Can Fail? |
|---|-------|--------------|-----------|
| 1 | TypeScript | Compiles entire codebase | ❌ BLOCKS |
| 2 | Strict TS | Strict mode for new modules | ❌ BLOCKS |
| 3 | ESLint | Lints all code (zero warnings) | ❌ BLOCKS |
| 4 | Import Paths | Validates import patterns | ❌ BLOCKS |
| 5 | Any Types | Checks for `any` in new modules | ❌ BLOCKS |
| 6 | Boundaries | Validates module isolation | ❌ BLOCKS |

**TOTAL TIME:** ~30-60 seconds per commit

---

## What Gets Blocked

### ❌ INSTANT REJECTION

```typescript
// 1. Using 'any' type in new modules (src/modules/, src/core/)
function bad(data: any) { }  // BLOCKED ❌

// 2. Cross-module internal imports
import { Service } from 'src/modules/auth/services/auth.service';  // BLOCKED ❌

// 3. Deep relative imports
import { x } from '../../../src/core/utils';  // BLOCKED ❌

// 4. Wrong import aliases
import { formatCurrency } from '@/core/utils';  // BLOCKED ❌

// 5. Module boundary violations
// In src/core/file.ts
import { db } from 'server/db';  // BLOCKED ❌

// 6. Complexity violations
function tooComplex() {  // BLOCKED ❌
  if (a) {
    if (b) {
      if (c) {
        if (d) {  // Depth > 3
          // ...
        }
      }
    }
  }
}

// 7. Missing return types
function noType(x: string) {  // BLOCKED ❌
  return x.toUpperCase();
}

// 8. Unused variables
const unused = 123;  // BLOCKED ❌

// 9. Loose boolean checks
if (data) { }  // BLOCKED ❌ (use data !== null, data !== undefined, etc.)
```

---

## How to Write Code That Passes

### ✅ GOOD PATTERNS

```typescript
// 1. Proper typing (no 'any')
interface DataShape {
  id: string;
  value: number;
}

function good(data: DataShape): string {
  return data.id;
}

// 2. Module public API imports
import { AuthModule } from 'src/modules/auth';
const { authService } = AuthModule;

// 3. Path aliases (no relative imports)
import { formatCurrency } from '@/lib/utils';

// 4. Explicit return types
function typed(x: string): string {
  return x.toUpperCase();
}

// 5. Use unknowns before 'any'
function handleUnknown(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}

// 6. Strict boolean checks
if (data !== null && data !== undefined) {
  // Safe to use data
}

// Or use nullish coalescing
const value = data ?? 'default';

// 7. Prefix unused with underscore
const _unused = 123;  // OK
function handler(_event: Event) { }  // OK

// 8. Keep complexity low (max 10)
function simple(a: number, b: number): number {
  return a > b ? a : b;
}
```

---

## Emergency Bypass (Last Resort Only)

```bash
# ONLY for true emergencies (production down, critical hotfix)
git commit --no-verify -m "fix(EMERGENCY): production down - bypassing checks"

# Document why in commit message
# Create follow-up issue to fix properly
# Re-enable checks immediately after
```

**When to use:**
- Production is down
- Critical security patch needed immediately
- Build is completely broken

**When NOT to use:**
- "I don't want to fix the errors"
- "It's taking too long"
- "The rules are annoying"

---

## Quick Fixes

### Fix: Remove `any` Types

```typescript
// ❌ Before
function process(data: any) {
  return data.value;
}

// ✅ After
interface Data {
  value: string;
}

function process(data: Data): string {
  return data.value;
}
```

### Fix: Import Paths

```typescript
// ❌ Before
import { formatCurrency } from '@/core/utils';

// ✅ After
import { formatCurrency } from '@/lib/utils';
```

### Fix: Module Imports

```typescript
// ❌ Before
import { AuthService } from 'src/modules/auth/services/auth.service';

// ✅ After
import { AuthModule } from 'src/modules/auth';
const { authService } = AuthModule;
```

### Fix: Strict Booleans

```typescript
// ❌ Before
if (user) {
  console.log(user.name);
}

// ✅ After
if (user !== null && user !== undefined) {
  console.log(user.name);
}

// Or
if (user != null) {  // Checks both null and undefined
  console.log(user.name);
}
```

---

## Manual Validation (Before Committing)

```bash
# Run all checks manually
bash scripts/pre-commit-check.sh

# Run individual checks
npm run typecheck                    # TypeScript
npx eslint path/to/file.ts          # ESLint specific file
node scripts/validate-imports.js     # Import validation
node scripts/validate-module-boundaries.js  # Boundary validation

# Auto-fix what's fixable
npm run lint:fix    # Auto-fix ESLint issues
npm run format:fix  # Auto-format code
```

---

## Temporary Disable (Local Development)

```bash
# Disable pre-commit hooks for this terminal session
export HUSKY=0

# Your commits will skip checks
git commit -m "WIP: testing something"

# Re-enable before pushing
unset HUSKY
```

**Warning:** Never push code that bypassed checks without fixing issues first.

---

## Current Violations to Fix

### Priority 1: Import Paths (5 files)
```bash
# Files using @/core/utils instead of @/lib/utils
client/src/components/fee-package-selector.tsx
client/src/components/forms/accessories-form.tsx
client/src/components/forms/pricing-form.tsx
client/src/components/forms/trade-form.tsx
client/src/components/ui/currency-field.tsx
```

**Fix:** Change `@/core/utils` to `@/lib/utils`

### Priority 2: Any Types (19 files in src/)
```bash
# New modules with 'any' types
src/modules/email/api/webhook.routes.ts (3×)
src/modules/email/api/email.routes.ts (2×)
src/core/adapters/storage.adapter.ts (5×)
```

**Fix:** Replace `any` with proper interfaces

### Priority 3: Boundary Violations (41 files)
```bash
# src/core importing from server/client
src/core/adapters/storage.adapter.ts
src/core/database/storage.service.ts
src/core/utils/security-logging.ts
```

**Fix:** Use dependency injection or move to shared

---

## Rules Summary

### Architectural Boundaries

| From | Can Import From |
|------|-----------------|
| `client/` | client, shared, module APIs, core |
| `server/` | server, shared, module APIs, core |
| `shared/` | shared ONLY (must be pure) |
| `src/modules/` | own module, shared, core |
| `src/core/` | core, shared ONLY |

### Code Quality Limits

- Max complexity: **10**
- Max depth: **3**
- Max file lines: **500**
- Max function parameters: **5** (implied by complexity)

### TypeScript Requirements

- No `any` types in new code
- Explicit return types required
- Strict null checks enabled
- No unused variables
- No implicit returns

---

## Getting Help

1. **Check errors:** Read the error message carefully
2. **Run validators:** Use scripts to see details
3. **Check docs:** Review `/CODE_QUALITY_FORTRESS.md`
4. **Ask team:** Don't bypass if you're unsure
5. **Last resort:** Use `--no-verify` and document why

---

## Philosophy

**Goal:** Code that physically rejects bad patterns

**Why strict?** Prevention is easier than fixing

**Legacy code?** Excluded for now, will fix incrementally

**New code?** Must be perfect from day one

🛡️ **Quality is mandatory, not optional**
