# API Gateway

Production-ready API Gateway for Autolytiq microservices architecture. Handles JWT authentication, request routing, and multi-tenant context injection.

## Features

- **JWT Authentication**: Validates and parses JWT tokens on all protected routes
- **Multi-Tenant Context**: Automatically injects `X-Dealership-ID` header from JWT claims
- **Transparent Proxying**: Forwards requests to backend services with all headers and query parameters
- **User Context Injection**: Adds `X-User-ID`, `X-User-Email`, and `X-User-Role` headers for audit trails
- **CORS Support**: Configurable CORS middleware
- **Request Logging**: Comprehensive logging of all proxied requests
- **Error Handling**: Graceful error handling with appropriate HTTP status codes
- **Health Checks**: `/health` endpoint for container orchestration

## Architecture

```
Client Request
    ↓
[API Gateway :8080]
    ↓ JWT Validation
    ↓ Extract Claims (dealership_id, user_id, role)
    ↓ Add Headers (X-Dealership-ID, X-User-ID, etc.)
    ↓
[Backend Service :808x]
```

## Supported Services

| Service | Port | Base Path | Purpose |
|---------|------|-----------|---------|
| Deal Service | 8081 | `/deals` | Deal management and calculations |
| Customer Service | 8082 | `/customers` | Customer and contact management |
| Inventory Service | 8083 | `/inventory` | Vehicle inventory and VIN validation |
| Email Service | 8084 | `/email` | Email sending and template management |
| User Service | 8085 | `/users` | User management and authentication |
| Config Service | 8086 | `/config` | Configuration and feature flags |

## API Routes

### Deal Service
```
GET    /api/v1/deals           # List deals
POST   /api/v1/deals           # Create deal
GET    /api/v1/deals/{id}      # Get deal
PUT    /api/v1/deals/{id}      # Update deal
DELETE /api/v1/deals/{id}      # Delete deal
```

### Customer Service
```
GET    /api/v1/customers       # List customers
POST   /api/v1/customers       # Create customer
GET    /api/v1/customers/{id}  # Get customer
PUT    /api/v1/customers/{id}  # Update customer
DELETE /api/v1/customers/{id}  # Delete customer
```

### Inventory Service
```
GET    /api/v1/inventory/vehicles              # List vehicles
POST   /api/v1/inventory/vehicles              # Add vehicle
GET    /api/v1/inventory/vehicles/{id}         # Get vehicle
PUT    /api/v1/inventory/vehicles/{id}         # Update vehicle
DELETE /api/v1/inventory/vehicles/{id}         # Delete vehicle
POST   /api/v1/inventory/vehicles/validate-vin # Validate VIN
GET    /api/v1/inventory/stats                 # Inventory statistics
```

### Email Service
```
POST   /api/v1/email/send              # Send email
POST   /api/v1/email/send-template     # Send templated email
GET    /api/v1/email/templates         # List templates
POST   /api/v1/email/templates         # Create template
GET    /api/v1/email/templates/{id}    # Get template
PUT    /api/v1/email/templates/{id}    # Update template
DELETE /api/v1/email/templates/{id}    # Delete template
GET    /api/v1/email/logs              # Email send logs
GET    /api/v1/email/logs/{id}         # Get log entry
```

### User Service
```
GET    /api/v1/users                     # List users
POST   /api/v1/users                     # Create user
GET    /api/v1/users/{id}                # Get user
PUT    /api/v1/users/{id}                # Update user
DELETE /api/v1/users/{id}                # Delete user
PUT    /api/v1/users/{id}/role           # Update user role
POST   /api/v1/users/{id}/password       # Change password
GET    /api/v1/users/{id}/activity       # User activity log
GET    /api/v1/users/{id}/preferences    # Get preferences
PUT    /api/v1/users/{id}/preferences    # Update preferences
POST   /api/v1/users/validate-email      # Validate email format
```

### Config Service
```
GET    /api/v1/config/settings                # List all settings
GET    /api/v1/config/settings/{key}          # Get setting
PUT    /api/v1/config/settings/{key}          # Update setting
DELETE /api/v1/config/settings/{key}          # Delete setting
GET    /api/v1/config/categories/{category}   # Get settings by category
GET    /api/v1/config/features                # List feature flags
POST   /api/v1/config/features                # Create feature flag
GET    /api/v1/config/features/{key}          # Get feature flag
PUT    /api/v1/config/features/{key}          # Update feature flag
DELETE /api/v1/config/features/{key}          # Delete feature flag
POST   /api/v1/config/features/{key}/evaluate # Evaluate feature flag
GET    /api/v1/config/integrations            # List integrations
POST   /api/v1/config/integrations            # Create integration
GET    /api/v1/config/integrations/{id}       # Get integration
PUT    /api/v1/config/integrations/{id}       # Update integration
DELETE /api/v1/config/integrations/{id}       # Delete integration
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API Gateway port |
| `JWT_SECRET` | ⚠️ Required | JWT signing secret (min 32 chars) |
| `JWT_ISSUER` | `autolytiq-api-gateway` | JWT issuer validation |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins |
| `DEAL_SERVICE_URL` | `http://localhost:8081` | Deal service endpoint |
| `CUSTOMER_SERVICE_URL` | `http://localhost:8082` | Customer service endpoint |
| `INVENTORY_SERVICE_URL` | `http://localhost:8083` | Inventory service endpoint |
| `EMAIL_SERVICE_URL` | `http://localhost:8084` | Email service endpoint |
| `USER_SERVICE_URL` | `http://localhost:8085` | User service endpoint |
| `CONFIG_SERVICE_URL` | `http://localhost:8086` | Config service endpoint |

### JWT Claims Structure

The API Gateway expects JWTs with the following claims:

```json
{
  "user_id": "usr_123",
  "dealership_id": "dlr_456",
  "email": "user@example.com",
  "role": "admin",
  "iss": "autolytiq-api-gateway",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Running the Service

### Development

```bash
# Set required environment variables
export JWT_SECRET="your-super-secret-key-min-32-characters-long"

# Run the service
go run .
```

### Production

```bash
# Build binary
go build -o api-gateway .

# Run with production config
JWT_SECRET="prod-secret" \
ALLOWED_ORIGINS="https://app.autolytiq.com" \
DEAL_SERVICE_URL="http://deal-service:8081" \
CUSTOMER_SERVICE_URL="http://customer-service:8082" \
INVENTORY_SERVICE_URL="http://inventory-service:8083" \
EMAIL_SERVICE_URL="http://email-service:8084" \
USER_SERVICE_URL="http://user-service:8085" \
CONFIG_SERVICE_URL="http://config-service:8086" \
./api-gateway
```

### Docker

```bash
# Build image
docker build -t autolytiq/api-gateway .

# Run container
docker run -p 8080:8080 \
  -e JWT_SECRET="your-secret" \
  -e DEAL_SERVICE_URL="http://deal-service:8081" \
  -e CUSTOMER_SERVICE_URL="http://customer-service:8082" \
  -e INVENTORY_SERVICE_URL="http://inventory-service:8083" \
  -e EMAIL_SERVICE_URL="http://email-service:8084" \
  -e USER_SERVICE_URL="http://user-service:8085" \
  -e CONFIG_SERVICE_URL="http://config-service:8086" \
  autolytiq/api-gateway
```

## Testing

```bash
# Run all tests
go test -v ./...

# Run with coverage
go test -v -cover ./...

# Run specific test
go test -v -run TestProxyRequest_Success
```

## Request Flow Example

### Client Request
```http
POST /api/v1/deals HTTP/1.1
Host: api.autolytiq.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "customer_id": "cust_123",
  "vehicle_id": "veh_456"
}
```

### Proxied Request to Deal Service
```http
POST /api/v1/deals HTTP/1.1
Host: deal-service:8081
Authorization: Bearer eyJhbGc...
Content-Type: application/json
X-Dealership-ID: dlr_456
X-User-ID: usr_123
X-User-Email: user@example.com
X-User-Role: admin

{
  "customer_id": "cust_123",
  "vehicle_id": "veh_456"
}
```

## Multi-Tenant Security

The API Gateway enforces multi-tenancy by:

1. **Extracting `dealership_id` from JWT**: Every authenticated request has a validated dealership context
2. **Injecting `X-Dealership-ID` header**: Backend services receive the dealership context in every request
3. **Rejecting requests without dealership context**: Requests without valid `dealership_id` return `400 Bad Request`
4. **Audit trail headers**: User context headers enable complete audit logging

## Performance

- **HTTP Client Pooling**: Shared HTTP client with connection pooling
- **Timeout**: 30-second request timeout
- **Connection Pool**: 100 max idle connections, 10 per host
- **Idle Timeout**: 90 seconds

## Error Handling

| Error | Status Code | Response |
|-------|-------------|----------|
| Missing Authorization header | 401 | `{"error":"Missing authorization header"}` |
| Invalid JWT format | 401 | `{"error":"Invalid authorization format..."}` |
| Invalid/expired JWT | 401 | `{"error":"Invalid token: ..."}` |
| Missing dealership context | 400 | `{"error":"Missing dealership context"}` |
| Service unavailable | 503 | `{"error":"Service unavailable: ..."}` |
| Backend service error | (pass-through) | (backend response) |

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2025-11-24T16:00:00Z"
}
```

### Logs

All proxied requests are logged:
```
2025/11/24 16:00:00 PROXY: POST /api/v1/deals -> http://localhost:8081/api/v1/deals [200]
2025/11/24 16:00:01 PROXY: GET /api/v1/customers -> http://localhost:8082/api/v1/customers [200]
```

## Security Best Practices

1. **JWT Secret**: Use a strong random key (min 32 characters)
2. **HTTPS Only**: Always use HTTPS in production
3. **CORS**: Configure `ALLOWED_ORIGINS` to specific domains
4. **Network Isolation**: Backend services should only be accessible from API Gateway
5. **Rate Limiting**: Consider adding rate limiting middleware
6. **Request Size Limits**: Consider adding request body size limits

## Next Steps

- [ ] Add rate limiting middleware
- [ ] Add request/response size limits
- [ ] Add circuit breaker for backend services
- [ ] Add metrics collection (Prometheus)
- [ ] Add distributed tracing (OpenTelemetry)
- [ ] Add API key authentication for service-to-service calls
- [ ] Add request caching for read-heavy endpoints

## License

Proprietary - Autolytiq, Inc.
