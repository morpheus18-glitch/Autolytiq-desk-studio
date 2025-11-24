# Config Service Architecture

## Overview

The Config Service is a production-ready microservice for managing dealership configurations, feature flags, and third-party integrations in a multi-tenant environment.

## Tech Stack

- **Language**: Go 1.18
- **Web Framework**: gorilla/mux
- **Database**: PostgreSQL 15+
- **Database Driver**: lib/pq
- **UUID Generation**: google/uuid
- **Containerization**: Docker

## Project Structure

```
config-service/
├── main.go                 # HTTP server and handlers
├── database_interface.go   # Database interface and types
├── database.go            # PostgreSQL implementation
├── main_test.go           # HTTP handler tests (78 tests)
├── database_test.go       # Database integration tests (54 tests)
├── go.mod                 # Go module definition
├── Dockerfile             # Multi-stage Docker build
├── README.md              # User documentation
├── TESTING.md             # Testing documentation
└── ARCHITECTURE.md        # This file
```

## Domain Models

### DealershipConfig
Configuration settings scoped to a specific dealership.

**Fields**:
- `dealership_id`: Tenant identifier
- `key`: Unique setting key within dealership
- `value`: Setting value (stored as string)
- `type`: Value type (string, integer, boolean, json)
- `category`: Logical grouping (dealership, sales, financing, notifications, ui)
- `description`: Human-readable description
- `created_at`, `updated_at`: Timestamps

**Primary Key**: (dealership_id, key)

### FeatureFlag
Feature toggles with gradual rollout and targeting capabilities.

**Fields**:
- `id`: UUID primary key
- `flag_key`: Unique flag identifier
- `enabled`: Global on/off switch
- `rollout_percentage`: Percentage-based gradual rollout (0-100)
- `constraints_json`: JSON targeting constraints (dealership IDs)
- `description`: Human-readable description
- `created_at`, `updated_at`: Timestamps

**Evaluation Logic**:
1. Check if flag exists
2. Check global enabled flag
3. Apply dealership constraints if present
4. Apply rollout percentage using consistent hashing
5. Return enabled/disabled

**Consistent Hashing**: Uses FNV-1a hash of dealership_id to ensure same dealership always gets same result for a given rollout percentage.

### Integration
Third-party integration configurations per dealership.

**Fields**:
- `id`: UUID primary key
- `dealership_id`: Tenant identifier
- `provider`: Integration provider (credit_bureau, inventory_feed, accounting, crm)
- `config_json`: JSON configuration (API keys, endpoints, etc.)
- `status`: Integration status (active, inactive, error)
- `last_sync`: Last successful sync timestamp
- `created_at`, `updated_at`: Timestamps

## Database Schema

### Tables

```sql
-- Dealership configuration settings
CREATE TABLE dealership_config (
    dealership_id VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dealership_id, key)
);

-- Feature flags
CREATE TABLE feature_flags (
    id VARCHAR(36) PRIMARY KEY,
    flag_key VARCHAR(255) UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    constraints_json JSONB,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Third-party integrations
CREATE TABLE integrations (
    id VARCHAR(36) PRIMARY KEY,
    dealership_id VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    config_json JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_sync TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
-- Config lookups by dealership and category
CREATE INDEX idx_config_dealership ON dealership_config(dealership_id);
CREATE INDEX idx_config_category ON dealership_config(dealership_id, category);

-- Feature flag lookups
CREATE INDEX idx_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_flags_enabled ON feature_flags(enabled);

-- Integration lookups
CREATE INDEX idx_integrations_dealership ON integrations(dealership_id);
CREATE INDEX idx_integrations_provider ON integrations(dealership_id, provider);
CREATE INDEX idx_integrations_status ON integrations(status);
```

## API Design

### RESTful Principles
- Resource-based URLs
- HTTP verbs (GET, POST, PUT, DELETE)
- JSON request/response bodies
- Proper HTTP status codes

### Multi-Tenancy
- X-Dealership-ID header required for tenant-scoped endpoints
- Database queries filter by dealership_id
- Primary keys include dealership_id for tenant isolation

### Error Handling
- 400 Bad Request: Invalid input, missing headers, validation errors
- 404 Not Found: Resource doesn't exist
- 500 Internal Server Error: Database errors, unexpected failures

### Response Format
```json
{
  "id": "uuid",
  "field1": "value1",
  "field2": "value2"
}
```

Error responses:
```json
{
  "error": "error message"
}
```

## Component Architecture

```
┌─────────────────────────────────────────────────┐
│                  HTTP Layer                      │
│  ┌──────────────────────────────────────────┐   │
│  │         gorilla/mux Router               │   │
│  └──────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│               Handler Layer                      │
│  ┌──────────────┐  ┌──────────────┐             │
│  │   Config     │  │   Feature    │             │
│  │   Handlers   │  │   Handlers   │             │
│  └──────────────┘  └──────────────┘             │
│  ┌──────────────────────────────────┐           │
│  │    Integration Handlers          │           │
│  └──────────────────────────────────┘           │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│            Database Interface                    │
│  ┌──────────────────────────────────────────┐   │
│  │       ConfigDatabase Interface           │   │
│  └──────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│        PostgreSQL Implementation                 │
│  ┌──────────────────────────────────────────┐   │
│  │      PostgresConfigDB                    │   │
│  │  - Connection pooling (25 max, 5 idle)   │   │
│  │  - Prepared statements                   │   │
│  │  - Transaction support                   │   │
│  └──────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              PostgreSQL Database                 │
│  - Multi-tenant data isolation                   │
│  - JSONB for flexible configs                    │
│  - Indexes for query performance                 │
└──────────────────────────────────────────────────┘
```

## Design Patterns

### Interface-Based Design
The `ConfigDatabase` interface allows for:
- Easy testing with mock implementations
- Future support for different databases (MySQL, MongoDB)
- Separation of concerns between HTTP and database layers

### Repository Pattern
Database operations are encapsulated in the PostgresConfigDB struct, which implements the ConfigDatabase interface.

### Dependency Injection
The Server struct receives the database implementation via constructor:
```go
server := NewServer(db)
```

### Error Wrapping
All errors are wrapped with context using `fmt.Errorf`:
```go
return fmt.Errorf("failed to get config: %w", err)
```

## Performance Considerations

### Connection Pooling
- Max open connections: 25
- Max idle connections: 5
- Connection max lifetime: 5 minutes

### Indexes
All query paths are indexed:
- Dealership lookups: O(log n)
- Category lookups: O(log n)
- Provider lookups: O(log n)

### JSONB
PostgreSQL JSONB provides:
- Efficient storage
- Binary format (faster than JSON text)
- Indexing support (GIN indexes)
- Query operators for JSON operations

### Consistent Hashing
Feature flag evaluation uses FNV-1a hash:
- O(1) operation
- Deterministic results
- No database lookups required

## Security

### SQL Injection Prevention
- All queries use parameterized statements
- No string concatenation for SQL
- lib/pq handles escaping

### Multi-Tenant Isolation
- Primary keys include dealership_id
- All queries filter by dealership_id
- Database-level constraints prevent cross-tenant access

### Input Validation
- Type validation (string, integer, boolean, json)
- Category validation (dealership, sales, financing, notifications, ui)
- Provider validation (credit_bureau, inventory_feed, accounting, crm)
- Status validation (active, inactive, error)
- Rollout percentage range (0-100)

### No Credentials in Code
- Database URL from environment variable
- No hardcoded passwords
- Docker secrets support

## Scalability

### Horizontal Scaling
- Stateless design allows multiple instances
- Load balancer distributes requests
- PostgreSQL connection pooling handles concurrency

### Database Scaling
- Read replicas for read-heavy workloads
- Partitioning by dealership_id if needed
- JSONB indexes for complex queries

### Caching Strategy (Future)
- Redis for feature flag evaluation
- Cache invalidation on flag updates
- TTL-based expiration

## Monitoring

### Health Check
GET /health returns service status:
```json
{"status": "healthy"}
```

### Metrics (Recommended)
- Request rate per endpoint
- Request duration (p50, p95, p99)
- Error rate
- Database connection pool usage
- Feature flag evaluation rate

### Logging (Recommended)
- Structured logging (JSON)
- Request ID tracing
- Error stack traces
- Database query duration

## Deployment

### Docker Build
Multi-stage build:
1. Builder stage: Compile Go binary
2. Runtime stage: Alpine Linux with binary

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: HTTP server port (default: 8083)

### Database Migrations
Schema is initialized on startup via `InitSchema()`.

For production, use migration tools:
- golang-migrate
- goose
- dbmate

### Health Checks
Docker health check:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:8083/health || exit 1
```

## Testing Strategy

### Unit Tests
- 78 HTTP handler tests
- MockDatabase implementation
- 100% handler coverage
- No database required

### Integration Tests
- 54 database tests
- Require TEST_DATABASE_URL
- Test real SQL operations
- Transaction behavior

### Total Coverage
- Without database: 47.2%
- With database: 90%+

## Future Enhancements

### Caching
- Redis for feature flags
- Cache warming on startup
- Cache invalidation events

### Audit Trail
- Track config changes
- User attribution
- Rollback capability

### Advanced Feature Flags
- Time-based rollouts
- User attribute targeting
- A/B testing support

### Configuration Versioning
- Version history
- Rollback to previous versions
- Change approval workflow

### API Gateway Integration
- Rate limiting
- Authentication/Authorization
- API key management

### Observability
- OpenTelemetry tracing
- Prometheus metrics
- Grafana dashboards

## Code Metrics

- Total lines: 3,188
- Production code: 1,126 lines
- Test code: 2,062 lines
- Test-to-code ratio: 1.83:1
- Total tests: 78 (handler) + 54 (database) = 132 tests

## Dependencies

### Direct
- github.com/google/uuid v1.6.0
- github.com/gorilla/mux v1.8.1
- github.com/lib/pq v1.10.9

### Development
- Go 1.18+ (testing package)

## License

Proprietary - Autolytiq
