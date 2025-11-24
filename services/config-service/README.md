# Config Service

Production-ready configuration and feature flag service for multi-tenant dealership management.

## Features

### Configuration Management
- **Multi-tenant**: Isolated config settings per dealership
- **Typed values**: Support for string, integer, boolean, and JSON types
- **Categories**: Organized by dealership, sales, financing, notifications, ui
- **CRUD operations**: Full create, read, update, delete support

### Feature Flags
- **Global toggle**: Enable/disable features globally
- **Gradual rollout**: Percentage-based rollout (0-100%)
- **Targeted rollout**: Constraint-based targeting by dealership IDs
- **Consistent hashing**: Deterministic rollout using dealership ID hash

### Integration Management
- **Provider support**: credit_bureau, inventory_feed, accounting, crm
- **Config storage**: JSON-based configuration per integration
- **Status tracking**: active, inactive, error states
- **Sync tracking**: Last sync timestamp for monitoring

## API Endpoints

### Health
- `GET /health` - Service health check

### Configuration Settings
- `GET /config/settings` - Get all settings (requires X-Dealership-ID header)
- `GET /config/settings/:key` - Get specific setting
- `PUT /config/settings/:key` - Create/update setting
- `DELETE /config/settings/:key` - Delete setting
- `GET /config/categories/:category` - Get settings by category

### Feature Flags
- `POST /config/features` - Create feature flag
- `GET /config/features` - List all feature flags
- `GET /config/features/:key` - Get feature flag
- `PUT /config/features/:key` - Update feature flag
- `DELETE /config/features/:key` - Delete feature flag
- `POST /config/features/:key/evaluate` - Evaluate flag for dealership

### Integrations
- `POST /config/integrations` - Create integration
- `GET /config/integrations` - List integrations (requires X-Dealership-ID header)
- `GET /config/integrations/:id` - Get integration
- `PUT /config/integrations/:id` - Update integration
- `DELETE /config/integrations/:id` - Delete integration

## Data Models

### DealershipConfig
```json
{
  "dealership_id": "dealer-123",
  "key": "dealership_name",
  "value": "Acme Motors",
  "type": "string",
  "category": "dealership",
  "description": "Official dealership name",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### FeatureFlag
```json
{
  "id": "uuid",
  "flag_key": "new_ui_redesign",
  "enabled": true,
  "rollout_percentage": 50,
  "constraints_json": {
    "dealerships": ["dealer-1", "dealer-2"]
  },
  "description": "New UI redesign feature",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Integration
```json
{
  "id": "uuid",
  "dealership_id": "dealer-123",
  "provider": "credit_bureau",
  "config_json": {
    "api_key": "xxx",
    "endpoint": "https://api.example.com"
  },
  "status": "active",
  "last_sync": "2025-01-15T10:00:00Z",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

## Configuration Categories

### dealership
- name, address, phone, email, hours, timezone, etc.

### sales
- default_term, doc_fee, dealer_fee, sales_tax_rate, etc.

### financing
- lender_integrations, rate_markup, default_apr, etc.

### notifications
- email_templates, sms_enabled, notification_preferences, etc.

### ui
- theme, logo_url, primary_color, accent_color, etc.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/autolytiq_config?sslmode=disable`)
- `PORT` - HTTP server port (default: `8083`)

## Running the Service

### Local Development
```bash
# Set database connection
export DATABASE_URL="postgres://user:pass@localhost:5432/autolytiq_config?sslmode=disable"

# Run the service
go run .
```

### Docker
```bash
# Build image
docker build -t config-service .

# Run container
docker run -p 8083:8083 \
  -e DATABASE_URL="postgres://user:pass@db:5432/autolytiq_config?sslmode=disable" \
  config-service
```

## Testing

```bash
# Run all tests
go test -v

# Run with coverage
go test -v -cover

# Generate coverage report
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Database Schema

### dealership_config
- Primary key: (dealership_id, key)
- Indexes: dealership_id, (dealership_id, category)

### feature_flags
- Primary key: id
- Unique: flag_key
- Indexes: flag_key, enabled

### integrations
- Primary key: id
- Indexes: dealership_id, (dealership_id, provider), status

## Feature Flag Evaluation Logic

1. Check if flag exists (return error if not)
2. Check if globally enabled (return false if not)
3. Check constraints if present:
   - If dealership constraints exist, verify dealership is in list
4. Apply rollout percentage:
   - Use consistent hash of dealership_id
   - Enable if hash % 100 < rollout_percentage
5. Return true if all checks pass

## Multi-Tenancy

All configuration settings are scoped to dealership_id. The service enforces isolation through:
- Database primary keys include dealership_id
- All queries filter by dealership_id
- X-Dealership-ID header required for tenant-specific endpoints

## Performance

- Connection pooling: 25 max open, 5 idle connections
- Indexes on all query paths
- JSONB for flexible JSON storage
- Consistent hashing for deterministic feature flag evaluation

## Security Considerations

- Validate all input types and categories
- Enforce multi-tenant isolation
- Sanitize JSON configuration
- Use prepared statements (protection against SQL injection)
- Validate rollout percentages (0-100 range)

## Integration Examples

### Setting a Config Value
```bash
curl -X PUT http://localhost:8083/config/settings/dealership_name \
  -H "X-Dealership-ID: dealer-123" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "Acme Motors",
    "type": "string",
    "category": "dealership",
    "description": "Official dealership name"
  }'
```

### Creating a Feature Flag
```bash
curl -X POST http://localhost:8083/config/features \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new_ui",
    "enabled": true,
    "rollout_percentage": 25,
    "description": "New UI redesign"
  }'
```

### Evaluating a Feature Flag
```bash
curl -X POST http://localhost:8083/config/features/new_ui/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "dealer-123"
  }'
```

### Creating an Integration
```bash
curl -X POST http://localhost:8083/config/integrations \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "dealer-123",
    "provider": "credit_bureau",
    "config_json": {
      "api_key": "xxx",
      "endpoint": "https://api.example.com"
    },
    "status": "active"
  }'
```

## Architecture

```
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Router │
    └────┬────┘
         │
    ┌────▼──────────┐
    │   Handlers    │
    └────┬──────────┘
         │
    ┌────▼──────────┐
    │   Database    │
    │   Interface   │
    └────┬──────────┘
         │
    ┌────▼──────────┐
    │  PostgreSQL   │
    └───────────────┘
```

## License

Proprietary - Autolytiq
