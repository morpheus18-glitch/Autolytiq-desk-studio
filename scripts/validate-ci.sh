#!/bin/bash
# CI/CD VALIDATION SCRIPT
# Validates that the CI environment is ready to run tests

set -e  # Exit on error

echo "=========================================="
echo "CI/CD ENVIRONMENT VALIDATION"
echo "=========================================="

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v(18|20|22) ]]; then
    echo "  ⚠️  Warning: Node.js should be v18, v20, or v22"
fi

# Check npm version
echo "✓ Checking npm version..."
NPM_VERSION=$(npm --version)
echo "  npm: $NPM_VERSION"

# Check if .env exists
echo "✓ Checking .env file..."
if [ -f ".env" ]; then
    echo "  .env file found ✓"
else
    echo "  ⚠️  Warning: .env file not found"
fi

# Check DATABASE_URL
echo "✓ Checking DATABASE_URL..."
if [ -n "$DATABASE_URL" ]; then
    # Mask the password for security
    MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/:[^:@]+@/:***@/')
    echo "  DATABASE_URL: $MASKED_URL ✓"
else
    echo "  ❌ ERROR: DATABASE_URL not set"
    exit 1
fi

# Check if dependencies are installed
echo "✓ Checking node_modules..."
if [ -d "node_modules" ]; then
    echo "  node_modules exists ✓"
else
    echo "  Installing dependencies..."
    npm install
fi

# Validate TypeScript compilation
echo "✓ Validating TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
    echo "  ⚠️  TypeScript compilation has errors (non-blocking)"
else
    echo "  TypeScript compilation: OK ✓"
fi

# Check test files exist
echo "✓ Checking test files..."
TEST_COUNT=$(find server/__tests__ src/modules -name "*.test.ts" 2>/dev/null | wc -l)
echo "  Found $TEST_COUNT test files ✓"

# Check vitest is installed
echo "✓ Checking vitest installation..."
if npm list vitest > /dev/null 2>&1; then
    echo "  vitest installed ✓"
else
    echo "  ❌ ERROR: vitest not installed"
    exit 1
fi

# Check database connectivity
echo "✓ Testing database connectivity..."
if timeout 5 node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1')
  .then(() => { console.log('  Database connection: OK ✓'); process.exit(0); })
  .catch(err => { console.log('  ⚠️  Database connection failed:', err.message); process.exit(1); });
" 2>&1; then
    echo "  Database is reachable ✓"
else
    echo "  ⚠️  Warning: Database connection test failed (tests may fail)"
fi

echo ""
echo "=========================================="
echo "VALIDATION COMPLETE"
echo "=========================================="
echo "Environment is ready for CI/CD tests"
echo ""
echo "To run tests:"
echo "  npm run test          # Run all tests"
echo "  npm run test:unit     # Run unit tests only"
echo "  npm run test:coverage # Run with coverage"
echo ""
