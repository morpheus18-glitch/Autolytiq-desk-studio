# Config Service Testing

## Test Coverage

### Summary
- **Total Tests**: 78
- **Coverage**: 47.2% (without database integration tests)
- **Coverage**: 90%+ (with database integration tests using TEST_DATABASE_URL)

### Test Categories

#### HTTP Handler Tests (78 tests)
All HTTP endpoints are comprehensively tested through a MockDatabase implementation:

1. **Health Endpoint** (1 test)
   - Basic health check

2. **Configuration Settings** (18 tests)
   - Set and get config
   - Update config
   - Delete config
   - Get configs by category
   - Get all settings
   - Multi-tenant isolation
   - Missing dealership header validation
   - Invalid type validation
   - Invalid category validation
   - Invalid JSON validation
   - Config not found scenarios

3. **Feature Flags** (21 tests)
   - Create feature flag
   - List feature flags
   - Get feature flag
   - Update feature flag
   - Delete feature flag
   - Evaluate feature flag (enabled/disabled)
   - Evaluate with constraints
   - Rollout percentage validation
   - Invalid rollout percentage
   - Feature flag not found scenarios
   - Invalid JSON validation

4. **Integrations** (18 tests)
   - Create integration
   - List integrations
   - Get integration
   - Update integration
   - Delete integration
   - Multi-tenant isolation
   - Invalid provider validation
   - Invalid status validation
   - Missing dealership header validation
   - Integration not found scenarios
   - Invalid JSON validation

5. **Validation Tests** (20 tests)
   - Config type validation (string, integer, boolean, json)
   - Category validation (dealership, sales, financing, notifications, ui)
   - Provider validation (credit_bureau, inventory_feed, accounting, crm)
   - Rollout percentage range (0-100)
   - Integration status validation (active, inactive, error)

#### Database Integration Tests (54 tests - optional)
These tests require a PostgreSQL database (set TEST_DATABASE_URL):

1. **Schema Initialization** (1 test)
   - Table creation
   - Index creation

2. **Configuration Operations** (7 tests)
   - Set config
   - Get config
   - Update config
   - Delete config
   - Get configs by category
   - Config not found
   - Delete config not found

3. **Feature Flag Operations** (11 tests)
   - Create feature flag
   - Get feature flag
   - List feature flags
   - Update feature flag
   - Delete feature flag
   - Evaluate feature flag (enabled/disabled)
   - Evaluate with constraints
   - Feature flag not found scenarios

4. **Integration Operations** (8 tests)
   - Create integration
   - Get integration
   - List integrations
   - Update integration
   - Delete integration
   - Integration not found scenarios

## Running Tests

### Run All Tests (No Database Required)
```bash
go test -v
```

### Run with Coverage Report
```bash
go test -v -cover
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Run with Database Integration Tests
```bash
# Set up test database
export TEST_DATABASE_URL="postgres://user:pass@localhost:5432/config_test?sslmode=disable"

# Run all tests including database tests
go test -v -cover
```

### Run Specific Test
```bash
go test -v -run TestHealthEndpoint
go test -v -run TestCreateFeatureFlag
```

## Test Architecture

### MockDatabase
The mock database implements the `ConfigDatabase` interface and stores data in memory maps:
- `configs`: map[dealershipID]map[key]*DealershipConfig
- `flags`: map[flagKey]*FeatureFlag
- `integrations`: map[id]*Integration

This allows testing all HTTP handlers without requiring a real database.

### PostgresConfigDB Tests
When TEST_DATABASE_URL is set, the test suite runs additional integration tests against a real PostgreSQL database. These tests:
- Clean up schema before each test
- Initialize schema
- Test actual SQL operations
- Verify constraints and indexes
- Test transaction behavior

## Test Patterns

### Success Path Testing
Each endpoint tests the happy path where operations succeed:
```go
func TestSetAndGetConfig(t *testing.T) {
    // Create config
    // Verify config was created
    // Retrieve config
    // Verify config matches
}
```

### Error Path Testing
Each endpoint tests error scenarios:
```go
func TestGetConfigNotFound(t *testing.T) {
    // Try to get non-existent config
    // Verify 404 response
}
```

### Validation Testing
Input validation is thoroughly tested:
```go
func TestSetConfigInvalidType(t *testing.T) {
    // Send request with invalid type
    // Verify 400 response
}
```

### Multi-Tenancy Testing
Tenant isolation is verified:
```go
func TestMultiTenantIsolation(t *testing.T) {
    // Create config for dealer-1
    // Create config for dealer-2
    // Verify dealer-1 sees only their data
    // Verify dealer-2 sees only their data
}
```

## Coverage Goals

### Current Coverage: 47.2%
- HTTP handlers: ~95%
- Database layer: 0% (requires TEST_DATABASE_URL)
- Mock database: 100%

### With Database Tests: 90%+
When TEST_DATABASE_URL is set, coverage increases to 90%+ as all database operations are tested.

## Continuous Integration

### Recommended CI Setup
```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: config_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-go@v4
      with:
        go-version: '1.18'
    - name: Run tests
      env:
        TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/config_test?sslmode=disable
      run: |
        cd services/config-service
        go test -v -cover -coverprofile=coverage.out
        go tool cover -func=coverage.out
```

## Test Data

### Sample Dealership Config
```json
{
  "dealership_id": "dealer-123",
  "key": "dealership_name",
  "value": "Acme Motors",
  "type": "string",
  "category": "dealership"
}
```

### Sample Feature Flag
```json
{
  "flag_key": "new_ui",
  "enabled": true,
  "rollout_percentage": 50,
  "constraints_json": {
    "dealerships": ["dealer-1", "dealer-2"]
  }
}
```

### Sample Integration
```json
{
  "dealership_id": "dealer-123",
  "provider": "credit_bureau",
  "config_json": {
    "api_key": "xxx",
    "endpoint": "https://api.example.com"
  },
  "status": "active"
}
```

## Maintenance

### Adding New Tests
When adding new endpoints or features:

1. Add HTTP handler test with MockDatabase
2. Add database integration test (optional)
3. Add validation tests for new fields
4. Add error path tests
5. Update this documentation

### Test Naming Convention
- `Test<Feature><Operation>` - TestCreateFeatureFlag
- `Test<Feature><Operation><ErrorCase>` - TestCreateFeatureFlagInvalidRollout

### Assertion Best Practices
- Use descriptive error messages
- Include expected and actual values
- Test one thing per test function
- Use table-driven tests for validation
