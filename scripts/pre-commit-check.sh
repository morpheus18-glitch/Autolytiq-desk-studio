#!/bin/bash
set -e

echo "🔒 CODE QUALITY FORTRESS - PRE-COMMIT VALIDATION"
echo "=================================================="
echo ""

FAILED=0

# Check 1: TypeScript compilation
echo "📘 [1/6] Checking TypeScript compilation..."
if npx tsc --noEmit --project tsconfig.json 2>&1 | tee /tmp/tsc-check.log; then
  echo "✅ TypeScript compilation passed"
else
  echo "❌ TypeScript errors found. Fix them before committing."
  echo "   View errors: cat /tmp/tsc-check.log"
  FAILED=1
fi
echo ""

# Check 2: Strict mode for new modules
echo "📘 [2/6] Checking strict TypeScript for new modules..."
if npx tsc --noEmit --project tsconfig.strict.json 2>&1 | tee /tmp/tsc-strict-check.log; then
  echo "✅ Strict TypeScript passed for new modules"
else
  echo "❌ Strict TypeScript errors in new modules. Fix them before committing."
  echo "   View errors: cat /tmp/tsc-strict-check.log"
  FAILED=1
fi
echo ""

# Check 3: ESLint
echo "📋 [3/6] Running ESLint..."
if npx eslint . --max-warnings 0 2>&1 | tee /tmp/eslint-check.log; then
  echo "✅ ESLint passed with zero warnings"
else
  echo "❌ ESLint errors/warnings found. Fix them before committing."
  echo "   View errors: cat /tmp/eslint-check.log"
  echo "   Run 'npm run lint:fix' to auto-fix some issues"
  FAILED=1
fi
echo ""

# Check 4: Import path validation
echo "🔗 [4/6] Validating import paths..."
if node scripts/validate-imports.js 2>&1 | tee /tmp/import-check.log; then
  echo "✅ All import paths valid"
else
  echo "❌ Invalid import paths found. Use proper path aliases."
  echo "   View errors: cat /tmp/import-check.log"
  FAILED=1
fi
echo ""

# Check 5: No 'any' types in new modules
echo "🚫 [5/6] Checking for 'any' types in new modules..."
ANY_FOUND=0

# Check src/modules/
if [ -d "src/modules" ]; then
  if grep -r ":\s*any\|<any>\|as any" src/modules/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|spec" | head -5; then
    echo "❌ Found 'any' types in src/modules/. Use proper types."
    ANY_FOUND=1
  fi
fi

# Check src/core/
if [ -d "src/core" ]; then
  if grep -r ":\s*any\|<any>\|as any" src/core/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|spec" | head -5; then
    echo "❌ Found 'any' types in src/core/. Use proper types."
    ANY_FOUND=1
  fi
fi

if [ $ANY_FOUND -eq 0 ]; then
  echo "✅ No 'any' types in new modules"
else
  FAILED=1
fi
echo ""

# Check 6: Module boundary validation
echo "🏗️  [6/6] Checking module boundaries..."
if node scripts/validate-module-boundaries.js 2>&1 | tee /tmp/boundaries-check.log; then
  echo "✅ Module boundaries respected"
else
  echo "❌ Module boundary violations found."
  echo "   View errors: cat /tmp/boundaries-check.log"
  FAILED=1
fi
echo ""

# Summary
echo "=================================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL QUALITY CHECKS PASSED! Commit allowed."
  echo "=================================================="
  exit 0
else
  echo "❌ QUALITY CHECKS FAILED! Commit blocked."
  echo "=================================================="
  echo ""
  echo "To bypass this check (EMERGENCY ONLY):"
  echo "  git commit --no-verify -m 'your message'"
  echo ""
  echo "But seriously, fix the issues instead. 🛡️"
  exit 1
fi
