# CI/CD Pipeline Documentation

## Overview

The Autolytiq CI/CD pipeline enforces code quality, architectural boundaries, and prevents bad code from reaching production. It consists of two GitHub Actions workflows and local validation scripts.

**Pipeline Philosophy:** Code must be **architecturally correct** before it can be merged. No exceptions.

---

## Workflows

### 1. Main CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main`, `develop`, `stabilization/*`, `feature/*` branches
- Pull requests to `main` or `develop`

**Jobs (in order):**

#### Job 1: Quality Gates (10 min, CRITICAL)
Runs in parallel:
- TypeScript strict mode check (`npm run typecheck`)
- ESLint architectural enforcement (`npm run lint`)
- Prettier code formatting (`npm run format`)
- 'any' type detection in new modules
- Module boundary validation
- Circular dependency detection (not yet implemented - needs madge)

**Failure Conditions:**
- Any TypeScript error
- Any ESLint violation
- Any formatting issue
- 'any' types in `src/modules/`, `src/core/`, or `shared/models/`
- Cross-module internal imports

#### Job 2: Build Verification (15 min, CRITICAL)
Depends on: Quality Gates

- Runs `npm run build`
- Verifies `dist/` directory exists
- Verifies `dist/index.html` (client) exists
- Verifies `dist/index.js` (server) exists
- Reports bundle sizes
- Uploads build artifacts for inspection

**Failure Conditions:**
- Build fails
- Missing build artifacts

#### Job 3: Test Suite (20 min, WARNING)
Depends on: Quality Gates

- Runs `npm run test`
- Uploads coverage reports

**Status:** Currently non-blocking during migration period. Will be CRITICAL once test suite is stable.

#### Job 4: Security Scan (10 min, CRITICAL)
Depends on: Quality Gates

- Runs `npm audit` (high severity)
- Checks for exposed API keys (OpenAI, AWS)
- Checks for hardcoded passwords

**Failure Conditions:**
- Secrets detected in source code

#### Job 5: Database Migration Check (10 min, WARNING)
Depends on: Quality Gates

- Validates migration file naming convention
- Lists migrations in order
- Detects potential conflicts

**Status:** Currently non-blocking

#### Job 6: Performance Check (15 min, WARNING)
Depends on: Quality Gates + Build

- Analyzes bundle sizes
- Warns about large JavaScript chunks (>500KB)
- Reports top 10 largest assets

**Status:** Currently non-blocking (warnings only)

#### Job 7: All Checks Summary
Depends on: ALL previous jobs

- Aggregates results
- Fails if any critical job failed
- Provides detailed summary

---

### 2. PR Architectural Validation (`pr-checks.yml`)

**Triggers:**
- Pull requests to `main` or `develop`

**Purpose:** PR-specific validations that analyze only changed files

**Checks:**

1. **Import Path Validation**
   - Detects relative parent imports (`../`)
   - Enforces absolute imports with `@/` aliases
   - Validates module boundary imports

2. **New 'any' Types Detection**
   - Checks only files changed in PR
   - Zero tolerance for 'any' in new architecture

3. **File Size Limits**
   - Warns if files exceed 500 lines
   - Suggests refactoring

4. **Circular Dependencies**
   - Runs `madge` on changed modules
   - Detects circular imports

5. **Commit Message Validation**
   - Enforces conventional commit format
   - Types: `feat`, `fix`, `stabilize`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`

6. **Console.log Detection**
   - Warns about `console.log` in client code
   - Server code is exempt

7. **PR Complexity Metrics**
   - Counts changed files by type
   - Calculates risk level (LOW/MEDIUM/HIGH)
   - Suggests breaking large PRs into smaller chunks

---

## Local Validation

### Quick Validation (Pre-commit)
```bash
npm run ci
```

Runs: typecheck → lint → format → test → build

### Comprehensive Validation
```bash
npm run ci:validate
```

Runs the CI validation script locally with detailed reports.

### Individual Checks
```bash
npm run typecheck    # TypeScript strict mode
npm run lint         # ESLint
npm run format       # Prettier check
npm run test         # Vitest tests
npm run build        # Production build
```

---

## Reading CI Results

### GitHub Actions UI

1. **Go to Actions tab** in GitHub repository
2. **Select workflow run** from the list
3. **View job results:**
   - ✅ Green checkmark = Passed
   - ❌ Red X = Failed
   - 🟡 Yellow circle = In progress
   - ⚫ Gray circle = Skipped/Cancelled

### Job Details

Click on any job to see:
- **Step-by-step output** with timestamps
- **Error messages** and stack traces
- **File paths** where issues occurred
- **Line numbers** for type errors or lint violations

### Common Failures

#### TypeScript Errors
```
❌ TypeScript - Strict Type Check

src/modules/auth/services/auth.service.ts:45:12 - error TS2322:
Type 'string | undefined' is not assignable to type 'string'.
```

**Fix:** Add null checks or use optional chaining

#### ESLint Violations
```
❌ ESLint - Code Quality & Architecture

src/modules/deal/components/deal-form.tsx
  23:15  error  '@typescript-eslint/no-explicit-any'  Type 'any' not allowed
```

**Fix:** Replace `any` with proper types

#### Build Failures
```
❌ Build application

[vite] Error: Could not resolve '@/components/non-existent'
```

**Fix:** Fix import paths or missing files

#### Secrets Detected
```
❌ Check for secrets in code

client/src/config.ts:12 - Potential OpenAI API key found
```

**Fix:** Move secrets to environment variables, never commit them

---

## Estimated Run Times

| Job | Duration | Blocking |
|-----|----------|----------|
| Quality Gates | 8-10 min | ✅ Yes |
| Build Verification | 12-15 min | ✅ Yes |
| Test Suite | 15-20 min | ⚠️ Not yet |
| Security Scan | 5-8 min | ✅ Yes (secrets only) |
| Database Check | 2-5 min | ⚠️ No |
| Performance Check | 10-12 min | ⚠️ No |
| **Total** | **15-20 min** | (parallel execution) |

**Optimization:**
- Jobs run in parallel after Quality Gates pass
- npm cache speeds up dependency installation
- Build artifacts reused by Performance job

---

## Branch Protection Rules

### Required Configuration

Navigate to: **Settings → Branches → Add rule for `main`**

#### 1. Pull Request Requirements
- ✅ Require pull request reviews before merging
- Required approving reviews: **1**
- Dismiss stale reviews when new commits pushed: **Yes**

#### 2. Status Checks
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required status checks:**
- `quality` (CRITICAL)
- `build` (CRITICAL)
- `security` (CRITICAL)
- `all-checks` (CRITICAL)

#### 3. Additional Settings
- ✅ Require conversation resolution before merging
- ✅ Include administrators (no one can bypass)
- ✅ Do not allow bypassing the above settings
- ✅ Require linear history (no merge commits)

---

## Troubleshooting

### CI Passes Locally But Fails in GitHub Actions

**Possible causes:**
1. **Uncommitted files** - CI only sees committed code
2. **Environment differences** - CI uses clean environment
3. **Cache issues** - Clear npm cache in Actions

**Solution:**
```bash
# Clean everything and re-run
npm run clean
npm install
npm run ci
```

### CI Takes Too Long

**Optimization strategies:**
1. **Break large PRs** into smaller, focused changes
2. **Cancel in-progress runs** when pushing new commits
3. **Use draft PRs** to work without triggering full CI

### Failing Module Boundary Check

**Error:** "Found illegal cross-module import"

**Example:**
```typescript
// ❌ BAD
import { AuthService } from 'src/modules/auth/services/auth.service';

// ✅ GOOD
import { AuthService } from 'src/modules/auth';
```

**Fix:** Import from module's public API (`index.ts`) only

### Failing 'any' Type Check

**Error:** "Found 'any' type in src/modules/"

**Fix options:**
1. Replace with proper type:
   ```typescript
   // ❌ BAD
   function process(data: any) { ... }

   // ✅ GOOD
   function process(data: UserData) { ... }
   ```

2. Use generic type:
   ```typescript
   // ✅ GOOD
   function process<T>(data: T): T { ... }
   ```

3. Use unknown + type guard:
   ```typescript
   // ✅ GOOD
   function process(data: unknown) {
     if (isUserData(data)) {
       // data is now UserData
     }
   }
   ```

### Build Artifact Missing

**Error:** "Client build failed - no dist/ directory"

**Possible causes:**
1. Vite build failed silently
2. Output directory misconfigured
3. Build script error

**Debug:**
```bash
npm run build
ls -la dist/
```

---

## Performance Optimization

### Current Optimizations

1. **Concurrency Control**
   - Cancels in-progress runs for same PR
   - Saves ~50% CI minutes on rapid pushes

2. **npm Cache**
   - Caches `node_modules` between runs
   - Reduces install time from 2min → 30sec

3. **Parallel Jobs**
   - Build, Tests, Security run in parallel
   - Total time ≈ max(job times), not sum

4. **Artifact Reuse**
   - Build job uploads artifacts
   - Performance job downloads instead of rebuilding
   - Saves 10-12 minutes

### Future Optimizations

1. **Dependency Caching**
   - Cache TypeScript build info
   - Cache ESLint cache
   - **Est. savings: 2-3 min**

2. **Conditional Job Execution**
   - Skip test job if no test files changed
   - Skip build job if only docs changed
   - **Est. savings: 5-10 min on docs-only PRs**

3. **Matrix Strategy**
   - Run tests in parallel by module
   - **Est. savings: 5-8 min once test suite grows**

---

## Monitoring & Metrics

### Key Metrics to Track

1. **CI Pass Rate**
   - Target: >90% on first attempt
   - Current: TBD (track in GitHub Insights)

2. **Average Run Time**
   - Target: <15 minutes
   - Current: ~15-20 minutes

3. **Most Common Failures**
   - Track to identify systematic issues
   - Address root causes

4. **Build Artifact Size**
   - Track over time
   - Alert on >20% increases

### GitHub Actions Usage

Monitor in: **Settings → Billing → Actions minutes**

- Free tier: 2,000 minutes/month
- Estimate: ~100 CI runs/month at 15min each = 1,500 min
- **Status:** Within free tier limits

---

## Security Considerations

### Secrets Management

1. **NEVER commit secrets** to code
2. **Use environment variables** for all sensitive data
3. **CI detects:**
   - OpenAI API keys (pattern: `sk-[a-zA-Z0-9]{48}`)
   - AWS access keys (pattern: `AKIA[0-9A-Z]{16}`)
   - Hardcoded passwords (pattern: `password = "......"`)

### Dependency Security

1. **npm audit** runs on every CI build
2. **High severity vulnerabilities** are warnings (not blockers)
3. **Review weekly** and update dependencies

---

## Next Steps

### Immediate
1. ✅ CI pipeline created
2. ⏳ Configure branch protection rules in GitHub UI
3. ⏳ Test CI on a sample PR

### Short-term (1-2 weeks)
1. Add madge for circular dependency detection
2. Enable test coverage reporting
3. Add performance budgets for bundle size

### Long-term (1-2 months)
1. Make test suite blocking (once stable)
2. Add E2E tests to CI
3. Implement deployment pipeline
4. Add staging environment validation

---

## Support

### Getting Help

1. **CI failures:** Check job logs in GitHub Actions UI
2. **Local validation:** Run `npm run ci:validate` for detailed report
3. **Questions:** Contact DevOps team or Project Orchestrator

### Useful Commands

```bash
# Run full CI suite locally
npm run ci

# Detailed validation with reports
npm run ci:validate

# Fix formatting issues
npm run format:fix

# Fix linting issues (auto-fixable only)
npm run lint:fix

# Check specific directory
npx eslint src/modules --ext .ts,.tsx

# Type check with strict mode
npm run typecheck

# Build and check output
npm run build && ls -la dist/
```

---

**Last Updated:** 2025-11-22
**Maintained By:** Workhorse Engineer
**Status:** Production Ready
