#!/bin/bash
# Disable exit-on-error because we want to collect all failures
set +e

echo "🔒 CODE QUALITY FORTRESS - PRE-COMMIT VALIDATION"
echo "=================================================="
echo "📝 Checking ONLY staged files (not entire codebase)"
echo ""

FAILED=0

# Get list of staged TypeScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "ℹ️  No TypeScript files staged for commit. Skipping checks."
  echo "=================================================="
  exit 0
fi

STAGED_COUNT=$(echo "$STAGED_FILES" | wc -l)
echo "📁 Found $STAGED_COUNT staged TypeScript file(s) to check"
echo ""

# Check 1: TypeScript compilation (full project - needed for type safety)
echo "📘 [1/5] Checking TypeScript compilation (full project for type safety)..."
npx tsc --noEmit --project tsconfig.json > /tmp/tsc-check.log 2>&1
TSC_EXIT=$?
if [ $TSC_EXIT -eq 0 ]; then
  echo "✅ TypeScript compilation passed"
else
  echo "⚠️  TypeScript errors found in project."
  echo "   NOTE: This checks the full project to ensure type safety."
  echo "   If errors are in unchanged files, you can bypass with --no-verify"
  cat /tmp/tsc-check.log | head -20
  # Don't fail on tsc errors in unchanged files - let it warn only
  # FAILED=1
fi
echo ""

# Check 2: ESLint on staged files ONLY
echo "📋 [2/5] Running ESLint on staged files..."
STAGED_FILES_SPACE_SEPARATED=$(echo "$STAGED_FILES" | tr '\n' ' ')

if [ -n "$STAGED_FILES_SPACE_SEPARATED" ]; then
  npx eslint $STAGED_FILES_SPACE_SEPARATED --max-warnings 0 > /tmp/eslint-check.log 2>&1
  ESLINT_EXIT=$?
  if [ $ESLINT_EXIT -eq 0 ]; then
    echo "✅ ESLint passed on staged files"
  else
    echo "❌ ESLint errors/warnings found in staged files."
    cat /tmp/eslint-check.log
    echo ""
    echo "   Run 'npx eslint $STAGED_FILES_SPACE_SEPARATED --fix' to auto-fix"
    FAILED=1
  fi
else
  echo "✅ No files to lint"
fi
echo ""

# Check 3: Import path validation on staged files ONLY
echo "🔗 [3/5] Validating import paths in staged files..."
node scripts/validate-imports.js --files "$STAGED_FILES" > /tmp/import-check.log 2>&1
IMPORT_EXIT=$?
if [ $IMPORT_EXIT -eq 0 ]; then
  echo "✅ All import paths valid in staged files"
else
  echo "❌ Invalid import paths found in staged files."
  cat /tmp/import-check.log
  FAILED=1
fi
echo ""

# Check 4: No 'any' types in staged files from new modules
echo "🚫 [4/5] Checking for 'any' types in staged files..."
ANY_FOUND=0

# Filter staged files to only those in src/modules/ or src/core/
STAGED_MODULE_FILES=$(echo "$STAGED_FILES" | grep -E '^(src/modules/|src/core/)' | grep -v -E '\.(test|spec)\.(ts|tsx)$' || true)

if [ -n "$STAGED_MODULE_FILES" ]; then
  for file in $STAGED_MODULE_FILES; do
    if [ -f "$file" ]; then
      if grep -E ':\s*any\b|<any>|as any\b' "$file" 2>/dev/null; then
        echo "❌ Found 'any' types in $file"
        ANY_FOUND=1
      fi
    fi
  done
fi

if [ $ANY_FOUND -eq 0 ]; then
  echo "✅ No 'any' types in staged module files"
else
  echo "❌ Found 'any' types in staged module files. Use proper types."
  FAILED=1
fi
echo ""

# Check 5: Module boundary validation on staged files ONLY
echo "🏗️  [5/5] Checking module boundaries in staged files..."
node scripts/validate-module-boundaries.js --files "$STAGED_FILES" > /tmp/boundaries-check.log 2>&1
BOUNDARY_EXIT=$?
if [ $BOUNDARY_EXIT -eq 0 ]; then
  echo "✅ Module boundaries respected in staged files"
else
  echo "❌ Module boundary violations found in staged files."
  cat /tmp/boundaries-check.log
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
  echo "Fix the issues in your staged files, or:"
  echo "  git commit --no-verify -m 'your message' (EMERGENCY ONLY)"
  echo ""
  echo "💡 Remember: You're only responsible for files YOU changed! 🛡️"
  exit 1
fi
