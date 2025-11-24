#!/bin/bash

# Week 1: Foundation Setup Script
# Sets up testing infrastructure, database, and quality gates BEFORE any code

set -e  # Exit on error

echo "=================================="
echo "Week 1: Foundation Setup"
echo "Setting up tests FIRST, code AFTER"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}→${NC} $1\n"; }

#========================================
# Step 1: Install Testing Dependencies
#========================================

step "1/7: Installing testing dependencies..."

npm install --save-dev \
  vitest@latest \
  @vitest/coverage-v8 \
  @vitest/ui \
  @testing-library/react@latest \
  @testing-library/jest-dom@latest \
  @testing-library/user-event@latest \
  happy-dom@latest \
  supertest@latest \
  @types/supertest \
  msw@latest \
  playwright@latest \
  @playwright/test@latest \
  @faker-js/faker@latest

success "Testing dependencies installed"

#========================================
# Step 2: Install OpenAPI/Contract Tools
#========================================

step "2/7: Installing API contract validation tools..."

npm install --save-dev \
  @apidevtools/swagger-cli \
  openapi-typescript \
  @openapitools/openapi-generator-cli

success "Contract validation tools installed"

#========================================
# Step 3: Create Test Directory Structure
#========================================

step "3/7: Creating test directory structure..."

mkdir -p tests/{unit,integration,contract,e2e,fixtures,helpers}
mkdir -p tests/unit/{tax,finance,lease,auth,deal}
mkdir -p tests/integration/{auth,deal,customer,inventory}
mkdir -p tests/contract/schemas
mkdir -p shared/contracts

success "Test directories created"

#========================================
# Step 4: Create Vitest Config
#========================================

step "4/7: Creating Vitest configuration..."

cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/',
        '.next/',
        'migrations/',
        'scripts/',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/server': path.resolve(__dirname, './server'),
      '@/client': path.resolve(__dirname, './client'),
      '@/shared': path.resolve(__dirname, './shared'),
    },
  },
});
EOF

success "Vitest config created"

#========================================
# Step 5: Create Playwright Config
#========================================

step "5/7: Creating Playwright E2E configuration..."

cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
EOF

success "Playwright config created"

#========================================
# Step 6: Create Test Helper Files
#========================================

step "6/7: Creating test helper files..."

# Test setup file
cat > tests/helpers/setup.ts << 'EOF'
import { beforeAll, afterAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(async () => {
  // Global test setup
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Global test teardown
});

beforeEach(() => {
  // Reset before each test
});
EOF

# Test factories
cat > tests/helpers/factories.ts << 'EOF'
import { faker } from '@faker-js/faker';

export function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'salesperson' as const,
    dealershipId: faker.string.uuid(),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomer(overrides = {}) {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: 'CA',
    zipCode: faker.location.zipCode(),
    dealershipId: faker.string.uuid(),
    ...overrides,
  };
}

export function createMockDeal(overrides = {}) {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    vehiclePrice: 50000_00,
    tradeInValue: 10000_00,
    downPayment: 5000_00,
    dealType: 'finance' as const,
    status: 'pending' as const,
    ...overrides,
  };
}
EOF

success "Test helper files created"

#========================================
# Step 7: Update package.json Scripts
#========================================

step "7/7: Updating package.json scripts..."

# Backup package.json
cp package.json package.json.backup

# Use Node.js to safely update package.json
node << 'NODESCRIPT'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add/update test scripts
pkg.scripts = {
  ...pkg.scripts,
  // Test scripts
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",

  // Validation scripts
  "validate:types": "tsc --noEmit",
  "validate:lint": "eslint . --ext .ts,.tsx",
  "validate:openapi": "swagger-cli validate shared/contracts/*.yaml || echo 'No OpenAPI specs yet'",
  "validate:all": "npm run validate:types && npm run validate:lint && npm test",

  // Quality gates
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write .",
  "format:check": "prettier --check .",

  // Pre-commit (run all validations)
  "precommit": "npm run validate:all",

  // CI (includes E2E tests)
  "ci": "npm run validate:all && npm run test:e2e",
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
NODESCRIPT

success "package.json scripts updated"

#========================================
# Summary
#========================================

echo ""
echo "=================================="
echo "Week 1 Foundation Setup Complete!"
echo "=================================="
echo ""
echo "Testing infrastructure is ready:"
echo ""
echo "  ✓ Vitest (unit + integration tests)"
echo "  ✓ Playwright (E2E tests)"
echo "  ✓ OpenAPI contract validation"
echo "  ✓ Test helpers and factories"
echo "  ✓ Quality gate scripts"
echo ""
echo "Available commands:"
echo ""
echo "  ${GREEN}npm test${NC}              - Run all tests"
echo "  ${GREEN}npm run test:watch${NC}    - Watch mode"
echo "  ${GREEN}npm run test:ui${NC}       - Visual test UI"
echo "  ${GREEN}npm run test:coverage${NC} - Coverage report"
echo "  ${GREEN}npm run test:e2e${NC}      - E2E tests"
echo "  ${GREEN}npm run validate:all${NC}  - All quality gates"
echo ""
echo "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Set up database (Neon.tech recommended)"
echo "  2. Write your first test (tests/unit/example.spec.ts)"
echo "  3. Watch it fail (RED)"
echo "  4. Write minimal code to pass (GREEN)"
echo "  5. Refactor (BLUE)"
echo ""
echo "Remember: ${RED}Tests FIRST${NC}, code ${GREEN}AFTER${NC}!"
echo ""
