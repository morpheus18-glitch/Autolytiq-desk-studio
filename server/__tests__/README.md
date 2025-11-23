# Integration Tests - Critical Business Flows

This directory contains integration tests for the Autolytiq platform's critical business flows. These tests ensure that core functionality works correctly and provide a safety net during refactoring.

## Test Coverage

### 1. Deal Creation Tests (`deal-creation.test.ts`)
Tests the complete deal creation flow:
- ✅ Atomic deal creation (customer + vehicle + deal + scenario)
- ✅ Deal number generation (unique, sequential)
- ✅ Multi-tenant isolation
- ✅ Validation and error handling
- ✅ Vehicle availability checks
- ✅ Referential integrity
- ✅ Concurrent deal creation
- ✅ Rollback on failure

**Coverage**: 60+ test cases

### 2. Tax Calculation Tests (`tax-calculation.test.ts`)
Tests tax calculations across different scenarios:
- ✅ State tax rules (CA, IN, TX, etc.)
- ✅ Local tax rates (county + city)
- ✅ Trade-in tax credit
- ✅ Taxable vs non-taxable fees
- ✅ Lease vs retail tax calculations
- ✅ Customer-based tax calculation
- ✅ Penny-accurate precision
- ✅ Edge cases (zero price, high price, invalid data)

**Coverage**: 40+ test cases

### 3. Payment Calculation Tests (`payment-calculation.test.ts`)
Tests payment calculations for finance and lease deals:
- ✅ Monthly payment formulas
- ✅ APR/Interest rate calculations
- ✅ Lease payment calculations
- ✅ Negative equity handling
- ✅ Down payment impact
- ✅ Different term lengths (12-84 months)
- ✅ Rebates and incentives
- ✅ Zero APR and high APR scenarios

**Coverage**: 25+ test cases

### 4. Email Operations Tests (`email-operations.test.ts`)
Tests email functionality:
- ✅ Save draft emails
- ✅ Send emails via Resend (mocked)
- ✅ Load email threads
- ✅ Email validation
- ✅ HTML vs plain text
- ✅ Multi-tenant isolation
- ✅ Send failure handling
- ✅ Email history tracking

**Coverage**: 20+ test cases

## Test Infrastructure

### Setup & Teardown (`setup.ts`)
- Database initialization
- Test dealership creation
- Test user creation
- Data cleanup between tests
- Connection management

### Test Data Factories (`helpers/test-data.ts`)
- `createCustomerData()` - Generate realistic customers
- `createVehicleData()` - Generate realistic vehicles
- `createDealData()` - Generate realistic deals
- `createScenarioData()` - Generate realistic scenarios
- `COMMON_SCENARIOS` - Pre-defined test scenarios
- `EDGE_CASE_SCENARIOS` - Edge case scenarios

### Custom Assertions (`helpers/assertions.ts`)
- Domain-specific assertions
- Validation helpers
- Error message matchers
- Data format validators

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
# Deal creation only
npx vitest run server/__tests__/deal-creation.test.ts

# Tax calculation only
npx vitest run server/__tests__/tax-calculation.test.ts

# Payment calculation only
npx vitest run server/__tests__/payment-calculation.test.ts

# Email operations only
npx vitest run server/__tests__/email-operations.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Database

Tests use the same database as development but:
- Use a dedicated test dealership (`TEST_DEALERSHIP_ID`)
- Clean up data between tests
- Preserve dealership and test user

**IMPORTANT**: Tests will DELETE data in the test dealership between runs. Never use production data.

## Environment Variables

Tests use the same `.env` as development:
- `DATABASE_URL` - Database connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis config (for sessions)

## Test Patterns

### Given-When-Then Pattern
```typescript
it('should create deal with customer and vehicle', async () => {
  // GIVEN: Existing customer and vehicle
  const [customer] = await db.insert(customers).values(...).returning();
  const [vehicle] = await db.insert(vehicles).values(...).returning();

  // WHEN: Creating deal
  const result = await createDeal({...});

  // THEN: Deal created successfully
  expect(result.deal).toBeDefined();
  assertValidDeal(result.deal);
});
```

### Use Custom Assertions
```typescript
// Instead of:
expect(deal.id).toBeDefined();
expect(deal.dealNumber).toBeDefined();
expect(deal.dealState).toBeDefined();

// Use:
assertValidDeal(deal);
```

### Use Test Data Factories
```typescript
// Instead of:
const customer = {
  dealershipId,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  // ...many more fields
};

// Use:
const customer = createCustomerData(dealershipId, {
  firstName: 'John', // Only override what you need
});
```

## Debugging Tests

### Enable Console Logs
```bash
DEBUG=* npx vitest run server/__tests__/deal-creation.test.ts
```

### Run Single Test
```typescript
it.only('should create deal', async () => {
  // Only this test will run
});
```

### Skip Flaky Test
```typescript
it.skip('flaky test', async () => {
  // This test will be skipped
});
```

## Adding New Tests

1. Create test file in `/root/autolytiq-desk-studio/server/__tests__/`
2. Import setup utilities:
   ```typescript
   import { setupTestDatabase, cleanupTestData, teardownTestDatabase, getTestContext } from './setup';
   import { createCustomerData } from './helpers/test-data';
   import { assertValidDeal } from './helpers/assertions';
   ```
3. Add setup/teardown hooks:
   ```typescript
   beforeAll(async () => {
     await setupTestDatabase();
     testContext = getTestContext();
   });

   beforeEach(async () => {
     await cleanupTestData();
   });

   afterAll(async () => {
     await cleanupTestData();
     await teardownTestDatabase();
   });
   ```
4. Write tests using Given-When-Then pattern
5. Use test data factories and custom assertions

## Known Issues

1. **Bcrypt Import**: Setup.ts uses `bcrypt` for password hashing. Make sure it's installed.
2. **Database Cleanup**: Cleanup deletes ALL data for test dealership. Don't use production data.
3. **Redis Connection**: Email tests may require Redis for session storage.
4. **Concurrent Tests**: Tests clean up between runs, so parallel test execution may have conflicts.

## Test Results

Current Status: **NOT YET RUN**

Expected Results:
- ✅ Most tests should pass
- ⚠️ Some tax tests may fail if ZIP code data is missing
- ⚠️ Some email tests may fail if Resend API key is not configured
- ⚠️ Some deal creation tests may fail if atomic operations have bugs

## Next Steps

1. Run tests: `npm run test:integration`
2. Fix any failures
3. Add missing test coverage
4. Integrate into CI/CD pipeline
5. Set coverage thresholds (aim for 80%+)

## Maintenance

- **Update tests** when business logic changes
- **Add new tests** for new features
- **Remove obsolete tests** when features are removed
- **Keep factories updated** with schema changes
- **Review test failures** - they indicate real problems!

---

**Remember**: These tests are your safety net. If a test fails after refactoring, you know EXACTLY what broke. Invest in maintaining them.
