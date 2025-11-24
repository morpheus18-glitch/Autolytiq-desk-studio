# Test-First, Validation-First Strategy

**Philosophy:** Write tests and validation infrastructure BEFORE writing a single line of implementation code.

**Last Updated:** November 23, 2025
**Status:** ACTIVE - This is how we build Autolytiq

---

## Core Principle

> "If you can't test it, don't build it. If you can't validate it, don't deploy it."

Every service, every module, every function gets:
1. **Tests written FIRST** (TDD)
2. **Validation infrastructure** (schema validation, contract tests)
3. **Quality gates** (type check, lint, test, build)
4. **THEN and ONLY THEN** → Implementation

---

## Phase 0: Testing Infrastructure (Week 1)

**BEFORE writing ANY service code, build the testing foundation:**

### 1. Testing Tools Setup

```bash
# Frontend testing
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event happy-dom

# API/Integration testing
npm install -D supertest msw

# Contract testing (API contracts validation)
npm install -D @apidevtools/swagger-cli openapi-typescript

# E2E testing
npm install -D playwright @playwright/test

# Code coverage
npm install -D @vitest/coverage-v8
```

### 2. Test Directory Structure

```
tests/
├── unit/                    # Unit tests (pure logic)
│   ├── tax/
│   ├── finance/
│   └── lease/
│
├── integration/             # API endpoint tests
│   ├── auth/
│   ├── deal/
│   └── customer/
│
├── contract/                # API contract validation
│   ├── schemas/
│   └── validators/
│
├── e2e/                     # End-to-end user flows
│   ├── deal-creation.spec.ts
│   ├── customer-workflow.spec.ts
│   └── tax-calculation.spec.ts
│
├── fixtures/                # Test data
│   ├── customers.json
│   ├── deals.json
│   └── vehicles.json
│
└── helpers/                 # Test utilities
    ├── setup.ts
    ├── factories.ts         # Test data factories
    └── assertions.ts        # Custom assertions
```

### 3. Quality Gate Scripts

**package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:contract": "npm run validate:openapi && npm run test:integration",

    "validate:openapi": "swagger-cli validate shared/contracts/api.yaml",
    "validate:types": "tsc --noEmit",
    "validate:lint": "eslint . --ext .ts,.tsx",
    "validate:all": "npm run validate:types && npm run validate:lint && npm run test && npm run validate:openapi",

    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",

    "precommit": "npm run validate:all",
    "ci": "npm run validate:all && npm run test:e2e"
  }
}
```

---

## Phase 1: Contract-First Development

### Step 1: Define API Contracts (OpenAPI)

**BEFORE any implementation, define the contract:**

```yaml
# shared/contracts/auth-service.yaml
openapi: 3.0.0
info:
  title: Auth Service API
  version: 1.0.0

paths:
  /api/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        401:
          description: Invalid credentials

  /api/auth/mfa/setup:
    post:
      summary: Setup TOTP MFA
      security:
        - bearerAuth: []
      responses:
        200:
          description: MFA setup initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  secret:
                    type: string
                  qrCode:
                    type: string
                    format: uri

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [admin, manager, salesperson, viewer]
```

### Step 2: Generate TypeScript Types from Contracts

```bash
# Generate types from OpenAPI spec
npx openapi-typescript shared/contracts/auth-service.yaml -o shared/types/auth-api.ts
```

### Step 3: Write Contract Tests FIRST

```typescript
// tests/contract/auth-service.spec.ts
import { describe, it, expect } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { paths } from '@/shared/types/auth-api';

describe('Auth Service API Contract', () => {
  it('should have valid OpenAPI spec', async () => {
    await expect(
      SwaggerParser.validate('shared/contracts/auth-service.yaml')
    ).resolves.toBeDefined();
  });

  it('should define login endpoint with correct request/response', () => {
    type LoginRequest = paths['/api/auth/login']['post']['requestBody']['content']['application/json'];
    type LoginResponse = paths['/api/auth/login']['post']['responses']['200']['content']['application/json'];

    // Type-level validation - will fail at compile time if contract changes
    const req: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };

    const res: LoginResponse = {
      token: 'jwt-token',
      user: {
        id: 'uuid',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
    };

    expect(req.email).toBeDefined();
    expect(res.token).toBeDefined();
  });
});
```

---

## Phase 2: Test-Driven Development (TDD)

### The Red-Green-Refactor Cycle

**For EVERY feature:**

#### 1. 🔴 RED - Write the failing test

```typescript
// tests/unit/tax/california-tax.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateTax } from '@/services/calc-engine-rs';

describe('California Tax Calculation', () => {
  it('should calculate LA County tax correctly', () => {
    const result = calculateTax({
      state: 'CA',
      county: 'Los Angeles',
      city: 'Los Angeles',
      amount: 50000_00 // $50,000.00 in cents
    });

    expect(result).toEqual({
      taxAmount: 4562_50, // $4,562.50
      rate: 0.09125,       // 9.125%
      breakdown: {
        stateTax: 3750_00,   // 7.5% state
        countyTax: 375_00,   // 0.75% LA county
        cityTax: 437_50      // 0.875% LA city
      }
    });
  });

  it('should handle SF County with district tax', () => {
    const result = calculateTax({
      state: 'CA',
      county: 'San Francisco',
      city: 'San Francisco',
      amount: 50000_00
    });

    expect(result.rate).toBeCloseTo(0.08625); // 8.625%
    expect(result.taxAmount).toBeCloseTo(4312_50);
  });

  it('should throw error for invalid county', () => {
    expect(() => {
      calculateTax({
        state: 'CA',
        county: 'Invalid County',
        city: '',
        amount: 50000_00
      });
    }).toThrow('Invalid county for California');
  });
});
```

**Run test - it SHOULD FAIL:**
```bash
npm test -- california-tax.spec.ts
# ❌ FAIL: calculateTax is not defined
```

#### 2. 🟢 GREEN - Write minimal code to pass

```typescript
// services/calc-engine-rs/src/tax/california.rs
pub fn calculate_tax(params: TaxParams) -> Result<TaxResult, TaxError> {
    match params.county.as_str() {
        "Los Angeles" => {
            let state_rate = 0.0750;
            let county_rate = 0.0075;
            let city_rate = 0.00875;
            let total_rate = state_rate + county_rate + city_rate;

            Ok(TaxResult {
                tax_amount: (params.amount as f64 * total_rate) as i64,
                rate: total_rate,
                breakdown: TaxBreakdown {
                    state_tax: (params.amount as f64 * state_rate) as i64,
                    county_tax: (params.amount as f64 * county_rate) as i64,
                    city_tax: (params.amount as f64 * city_rate) as i64,
                }
            })
        },
        "San Francisco" => {
            // Implementation for SF
            todo!()
        },
        _ => Err(TaxError::InvalidCounty(params.county))
    }
}
```

**Run test - it SHOULD PASS:**
```bash
npm test -- california-tax.spec.ts
# ✅ PASS: All tests passing
```

#### 3. 🔵 REFACTOR - Improve code quality

```typescript
// Extract to data structure, add more test cases, optimize
```

---

## Phase 3: Integration Test Infrastructure

### Setup Test Database

```typescript
// tests/helpers/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '@/server/db';
import postgres from 'postgres';

let testDb: postgres.Sql;

beforeAll(async () => {
  // Create test database
  testDb = postgres(process.env.TEST_DATABASE_URL!);
  await migrate(db, { migrationsFolder: './migrations' });
});

afterAll(async () => {
  // Cleanup
  await testDb.end();
});

beforeEach(async () => {
  // Clear all tables before each test
  await db.delete(schema.users);
  await db.delete(schema.deals);
  await db.delete(schema.customers);
  // ... etc
});
```

### Integration Test Example

```typescript
// tests/integration/auth/login.spec.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/server';
import { createTestUser } from '@/tests/helpers/factories';

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    // Arrange
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'password123'
    });

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: user.email
    });
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should reject invalid credentials', async () => {
    await createTestUser({
      email: 'test@example.com',
      password: 'password123'
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should rate limit after 5 failed attempts', async () => {
    // Test rate limiting
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts');
  });
});
```

---

## Phase 4: Test Data Factories

**Never write raw test data - use factories:**

```typescript
// tests/helpers/factories.ts
import { faker } from '@faker-js/faker';
import { db } from '@/server/db';
import { users, customers, deals } from '@/server/schema';
import { hashPassword } from '@/server/auth';

export async function createTestUser(overrides = {}) {
  const user = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password: await hashPassword('password123'),
    name: faker.person.fullName(),
    role: 'salesperson' as const,
    dealershipId: faker.string.uuid(),
    ...overrides
  };

  await db.insert(users).values(user);
  return user;
}

export async function createTestCustomer(overrides = {}) {
  const customer = {
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
    ...overrides
  };

  await db.insert(customers).values(customer);
  return customer;
}

export async function createTestDeal(overrides = {}) {
  const customer = await createTestCustomer();

  const deal = {
    id: faker.string.uuid(),
    customerId: customer.id,
    vehiclePrice: 50000_00,
    tradeInValue: 10000_00,
    downPayment: 5000_00,
    dealType: 'finance' as const,
    status: 'pending' as const,
    dealershipId: customer.dealershipId,
    ...overrides
  };

  await db.insert(deals).values(deal);
  return { deal, customer };
}
```

---

## Phase 5: Coverage Requirements

### Coverage Thresholds

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        'tests/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/**',
        'node_modules/**'
      ]
    }
  }
});
```

### What Must Be Tested (100% coverage):

1. **Tax calculations** - All 50 states + DC
2. **Finance calculations** - Payment, APR, amortization
3. **Lease calculations** - Payment, residual, money factor
4. **Auth flows** - Login, logout, MFA, password reset
5. **RBAC** - All permission checks

### What Should Be Tested (80%+ coverage):

1. **API endpoints** - All request/response scenarios
2. **Business logic** - Deal state machine, validations
3. **Data transformations** - Formatters, serializers

### What Can Skip Tests (<50% coverage):

1. **UI components** - Focus on integration tests instead
2. **Configuration files** - Static configs
3. **Type definitions** - TypeScript compiler handles this

---

## Phase 6: E2E Test Strategy

### Critical User Journeys (Must Pass)

```typescript
// tests/e2e/deal-creation.spec.ts
import { test, expect } from '@playwright/test';

test('Complete deal creation flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'salesperson@dealer.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // 2. Navigate to new deal
  await page.click('text=New Deal');
  await expect(page).toHaveURL('/deals/new');

  // 3. Select customer
  await page.click('[data-testid="customer-search"]');
  await page.fill('[data-testid="customer-search"]', 'John Doe');
  await page.click('text=John Doe');

  // 4. Select vehicle
  await page.click('[data-testid="vehicle-search"]');
  await page.fill('[data-testid="vehicle-search"]', '2024 Honda');
  await page.click('text=2024 Honda Accord');

  // 5. Enter deal details
  await page.fill('[name="vehiclePrice"]', '50000');
  await page.fill('[name="downPayment"]', '5000');
  await page.selectOption('[name="dealType"]', 'finance');

  // 6. Calculate payments
  await page.click('button:has-text("Calculate")');
  await expect(page.locator('[data-testid="monthly-payment"]')).toBeVisible();

  // 7. Verify tax calculation
  const taxAmount = await page.locator('[data-testid="tax-amount"]').textContent();
  expect(parseFloat(taxAmount!)).toBeGreaterThan(0);

  // 8. Save deal
  await page.click('button:has-text("Save Deal")');
  await expect(page).toHaveURL(/\/deals\/[a-f0-9-]+/);
  await expect(page.locator('text=Deal saved successfully')).toBeVisible();
});
```

---

## Phase 7: Continuous Validation

### Pre-Commit Hook (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-commit validation..."

# 1. Type check
npm run typecheck || {
  echo "❌ TypeScript errors found"
  exit 1
}

# 2. Lint
npm run lint || {
  echo "❌ ESLint errors found"
  exit 1
}

# 3. Tests
npm test || {
  echo "❌ Tests failed"
  exit 1
}

# 4. OpenAPI validation
npm run validate:openapi || {
  echo "❌ OpenAPI contract validation failed"
  exit 1
}

echo "✅ All validations passed!"
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: E2E tests
        run: npm run test:e2e

      - name: Coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Success Criteria

**Before ANY production deployment:**

- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing (>80% coverage)
- [ ] All E2E tests passing (100% critical flows)
- [ ] All OpenAPI contracts validated
- [ ] TypeScript strict mode: 0 errors
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Build succeeds
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## Implementation Order

### Week 1: Testing Infrastructure
- Set up Vitest, Playwright, test utilities
- Create test database setup/teardown
- Write test data factories
- Configure coverage reporting

### Week 2: Contract-First Auth Service
- Write OpenAPI spec for auth
- Generate TypeScript types
- Write contract tests
- Write integration tests
- THEN implement auth service

### Week 3: Contract-First Calculation Engine
- Write Rust test suite for all 50 states
- Write WASM integration tests
- Write performance benchmarks
- THEN implement Rust calculations

### Week 4: Integration & E2E
- Write all critical E2E flows
- Set up CI/CD pipeline
- Performance testing
- Load testing

---

**Remember:** Tests are not overhead. Tests ARE the specification. Tests ARE the documentation. Tests ARE the safety net.

**"No test, no merge. No validation, no deploy."**
