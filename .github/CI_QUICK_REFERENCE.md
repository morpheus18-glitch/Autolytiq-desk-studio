# CI/CD Quick Reference Card

## Before Committing

```bash
# Run full validation
npm run ci

# Or detailed validation
npm run ci:validate
```

## Common Fixes

### TypeScript Errors
```bash
npm run typecheck
# Fix type errors, then re-run
```

### Linting Issues
```bash
npm run lint:fix  # Auto-fix
npm run lint      # Check remaining
```

### Formatting Issues
```bash
npm run format:fix  # Auto-fix all
```

### Build Errors
```bash
npm run build
# Check dist/ output
```

## CI Status Indicators

| Icon | Meaning |
|------|---------|
| ✅ | Passed - Good to merge |
| ❌ | Failed - Fix before merge |
| 🟡 | Running - Wait for completion |
| ⚫ | Skipped/Cancelled |

## Critical Checks (MUST PASS)

1. **TypeScript Strict Mode** - No type errors
2. **ESLint** - Code quality + architecture
3. **Prettier** - Consistent formatting
4. **No 'any' types** - In src/modules/, src/core/, shared/models/
5. **Module Boundaries** - No cross-module internal imports
6. **Build** - Production build succeeds
7. **Secrets** - No API keys in code

## Reading Failures

### TypeScript Error
```
src/file.ts:45:12 - error TS2322
```
- File: `src/file.ts`
- Line: 45
- Column: 12
- Error code: TS2322

### ESLint Error
```
src/file.ts
  23:15  error  '@typescript-eslint/no-explicit-any'
```
- Line 23, column 15
- Rule: no-explicit-any
- **Fix:** Replace `any` with proper type

### Build Error
```
[vite] Error: Could not resolve '@/components/...'
```
- **Fix:** Check import path or missing file

## Architectural Rules

### Imports
```typescript
// ❌ BAD - Relative parent import
import { X } from '../../../utils/helper';

// ✅ GOOD - Absolute import
import { X } from '@/utils/helper';

// ❌ BAD - Cross-module internal
import { AuthService } from 'src/modules/auth/services/auth.service';

// ✅ GOOD - Module public API
import { AuthService } from 'src/modules/auth';
```

### Types
```typescript
// ❌ BAD - 'any' type
function process(data: any) { }

// ✅ GOOD - Proper type
function process(data: UserData) { }

// ✅ GOOD - Generic
function process<T>(data: T): T { }
```

### File Size
- **Max:** 500 lines per file
- **Exceeding?** Break into smaller modules

## CI Run Times

| Job | Duration |
|-----|----------|
| Quality Gates | ~10 min |
| Build | ~15 min |
| Tests | ~20 min |
| Security | ~8 min |
| **Total** | **~15-20 min** (parallel) |

## Bypass Prevention

**You CANNOT bypass CI if:**
- TypeScript errors exist
- ESLint violations exist
- Formatting issues exist
- Build fails
- Secrets detected

**No exceptions.** Not even for administrators.

## Getting Help

1. Check job logs in GitHub Actions
2. Run `npm run ci:validate` locally
3. Read full docs: `/CI_CD_SETUP.md`

## Most Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Type error | Add type annotation |
| ESLint violation | `npm run lint:fix` |
| Format issue | `npm run format:fix` |
| Import error | Use `@/` absolute imports |
| 'any' type | Replace with proper type |
| Module boundary | Import from index.ts |
| Build failure | Check import paths |

## Optimization Tips

1. **Small PRs** = Faster CI runs
2. **Use draft PRs** to work without full CI
3. **Cancel in-progress** runs when pushing new commits
4. **Fix locally first** with `npm run ci`

---

**Print this and keep it handy!**
