# CI/CD Pipeline Flow Diagram

## Visual Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRIGGER EVENTS                              │
├─────────────────────────────────────────────────────────────────────┤
│  • Push to main/develop/stabilization/feature                       │
│  • Pull Request to main/develop                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW 1: Main CI (ci.yml)                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │      JOB 1: QUALITY GATES (10 min)          │  ◄── CRITICAL
        │              MUST PASS                       │
        ├─────────────────────────────────────────────┤
        │  1. TypeScript Strict Mode                  │
        │  2. ESLint (code quality + architecture)    │
        │  3. Prettier (formatting)                   │
        │  4. No 'any' types in new modules           │
        │  5. Module boundaries enforced              │
        └─────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    QUALITY PASSED?        │
                    └─────────────┬─────────────┘
                                  │
                        ┌─────────┴─────────┐
                        │       YES         │
                        └─────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  JOB 2: BUILD   │   │  JOB 3: TESTS   │   │ JOB 4: SECURITY │
│    (15 min)     │   │    (20 min)     │   │    (10 min)     │
│   ◄── CRITICAL  │   │   ◄── WARNING   │   │   ◄── CRITICAL  │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ • Vite build    │   │ • Vitest tests  │   │ • npm audit     │
│ • esbuild       │   │ • Coverage      │   │ • Secret scan   │
│ • Verify dist/  │   │   report        │   │   - API keys    │
│ • Upload build  │   │                 │   │   - Passwords   │
│   artifacts     │   │                 │   │   - AWS keys    │
└────────┬────────┘   └─────────────────┘   └─────────────────┘
         │                                            │
         │            ┌─────────────────┐            │
         └────────────┤  JOB 5: DATABASE├────────────┘
                      │     (10 min)    │
                      │   ◄── WARNING   │
                      ├─────────────────┤
                      │ • Migration     │
                      │   naming check  │
                      │ • Conflict      │
                      │   detection     │
                      └────────┬────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ JOB 6: PERFORMANCE  │
                    │      (15 min)       │
                    │    ◄── WARNING      │
                    ├─────────────────────┤
                    │ • Download build    │
                    │ • Bundle size       │
                    │ • Large chunks      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ JOB 7: ALL CHECKS   │
                    │   (Final Summary)   │
                    ├─────────────────────┤
                    │ • Aggregate results │
                    │ • Pass/Fail report  │
                    │ • Detailed summary  │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
        ┌──────────────┐            ┌──────────────┐
        │   ✅ PASS    │            │   ❌ FAIL    │
        │              │            │              │
        │ Ready to     │            │ Fix issues   │
        │ merge        │            │ before merge │
        └──────────────┘            └──────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│               WORKFLOW 2: PR Checks (pr-checks.yml)                 │
│                    (Only on Pull Requests)                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │   PR ARCHITECTURAL VALIDATION (10 min)      │
        ├─────────────────────────────────────────────┤
        │  1. Get changed files (git diff)            │
        │  2. Validate import paths                   │
        │     • No relative parent imports            │
        │     • Use @/ aliases                        │
        │  3. Check for new 'any' types               │
        │  4. File size limits (500 lines)            │
        │  5. Circular dependencies in modules        │
        │  6. Commit message format                   │
        │  7. Console.log in client code              │
        │  8. PR complexity metrics                   │
        │     • Risk: LOW/MEDIUM/HIGH                 │
        └─────────────────────────────────────────────┘
```

## Job Dependency Flow

```
┌──────────────┐
│   TRIGGER    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   QUALITY    │  ◄── Runs first, everything else depends on this
└──────┬───────┘
       │
       ├───────────────┬──────────────┬──────────────┐
       │               │              │              │
       ▼               ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  BUILD   │   │  TESTS   │   │ SECURITY │   │ DATABASE │
└────┬─────┘   └──────────┘   └──────────┘   └──────────┘
     │
     │ (artifact shared)
     │
     ▼
┌──────────────┐
│ PERFORMANCE  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ALL-CHECKS   │  ◄── Runs last, depends on all jobs
└──────────────┘
```

## Parallel Execution Timeline

```
Time (minutes)
│
0  ├─ Quality Gates START
│  │
5  │  │
│  │
10 ├─ Quality Gates END ✅
│  │
│  ├─ BUILD START
│  ├─ TESTS START
│  ├─ SECURITY START
│  ├─ DATABASE START
│  │
15 │  │ Security END ✅
│  │  │ Database END ✅
│  │
20 │  │ Tests END ✅
│  │
25 ├─ BUILD END ✅
│  │
│  ├─ Performance START (uses build artifacts)
│  │
30 │
│  │
35 │
│  │
40 ├─ Performance END ✅
│  │
│  ├─ All-Checks START
│  │
42 ├─ All-Checks END ✅
│
└─ TOTAL: ~15-20 minutes
```

## Decision Tree

```
                    ┌─────────────┐
                    │  Git Push   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Quality OK? │
                    └──────┬──────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
          YES│                           │NO
             │                           │
             ▼                           ▼
    ┌────────────────┐          ┌──────────────┐
    │ Run all jobs   │          │ ❌ STOP      │
    │ in parallel    │          │ Fix errors   │
    └────────┬───────┘          └──────────────┘
             │
      ┌──────▼──────┐
      │  Build OK?  │
      └──────┬──────┘
             │
       ┌─────┴─────┐
       │           │
    YES│           │NO
       │           │
       ▼           ▼
┌──────────┐  ┌──────────┐
│Continue  │  │❌ BLOCK  │
│pipeline  │  │  MERGE   │
└────┬─────┘  └──────────┘
     │
     ▼
┌──────────────┐
│ Security OK? │
└──────┬───────┘
       │
  ┌────┴────┐
  │         │
YES│        │NO
  │         │
  ▼         ▼
┌───┐   ┌──────────┐
│OK │   │❌ BLOCK  │
└─┬─┘   │  MERGE   │
  │     └──────────┘
  ▼
┌──────────────┐
│ Tests pass?  │
└──────┬───────┘
       │
  ┌────┴────┐
  │         │
YES│        │NO
  │         │
  ▼         ▼
┌───┐   ┌─────────┐
│OK │   │⚠️ WARN  │  ◄── Non-blocking during migration
└─┬─┘   │Continue │
  │     └─────────┘
  │
  ▼
┌──────────────┐
│ ✅ MERGE OK  │
└──────────────┘
```

## Critical Path

The **critical path** (longest dependency chain) determines total CI time:

```
Quality (10m) → Build (15m) → Performance (15m) → All-Checks (2m)
= 42 minutes maximum

But with parallelization:
Quality (10m) → [longest parallel job] (20m for Tests) → All-Checks (2m)
= 32 minutes theoretical

Actual observed: ~15-20 minutes due to:
- npm cache
- Artifact reuse
- Optimized build
```

## Status Check Requirements

For branch protection, require these checks:

```
Required Status Checks:
├─ quality           ◄── CRITICAL (blocks merge)
├─ build             ◄── CRITICAL (blocks merge)
├─ security          ◄── CRITICAL (blocks merge)
└─ all-checks        ◄── CRITICAL (blocks merge)

Optional (informational):
├─ tests             ◄── WARNING (will be critical later)
├─ database          ◄── WARNING
└─ performance       ◄── WARNING
```

## Local Development Flow

```
Developer
    │
    ├─ Write code
    │
    ├─ Pre-commit hook
    │  ├─ lint-staged
    │  ├─ prettier
    │  └─ eslint
    │
    ├─ Commit (blocked if hook fails)
    │
    ├─ Optional: npm run ci:validate
    │  └─ Full local CI simulation
    │
    ├─ Push to remote
    │
    └─ GitHub Actions CI runs
       │
       ├─ Passes → Ready to merge
       └─ Fails → Fix and push again
```

## Cost Optimization Strategy

```
┌─────────────────────────────────────┐
│ Optimization Techniques Applied:    │
├─────────────────────────────────────┤
│ 1. Concurrency cancellation         │
│    Old: 45 min × 3 pushes = 135 min │
│    New: 20 min (only latest)        │
│    Savings: 115 min (85%)           │
│                                     │
│ 2. npm cache                        │
│    Install: 2 min → 30 sec          │
│    Savings: 1.5 min per job × 6     │
│    Total: 9 min per run (45%)       │
│                                     │
│ 3. Parallel execution               │
│    Sequential: 90 min               │
│    Parallel: 20 min                 │
│    Savings: 70 min (78%)            │
│                                     │
│ 4. Artifact reuse                   │
│    Build once, use twice            │
│    Savings: 12 min (60% of build)   │
└─────────────────────────────────────┘

Monthly estimate:
100 PRs × 20 min = 2,000 minutes
Free tier: 2,000 minutes
Cost: $0
```

## Error Propagation

```
Quality Gate Failure
    │
    └─► All downstream jobs SKIPPED
        (no wasted compute time)

Build Failure
    │
    ├─► Performance job SKIPPED
    └─► Other jobs continue
        (parallel independence)

Test Failure
    │
    └─► Other jobs continue
        (non-blocking during migration)
```

---

**This diagram shows the complete CI/CD pipeline architecture, job dependencies, execution timeline, decision logic, and optimization strategies.**
