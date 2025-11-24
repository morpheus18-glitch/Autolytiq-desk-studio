# User Service

Production-ready User Service with Role-Based Access Control (RBAC) for managing dealership users.

## Features

- **Complete User Management**: Create, read, update, and soft delete users
- **Role-Based Access Control (RBAC)**: Admin, Manager, and Salesperson roles with granular permissions
- **Password Security**: Bcrypt hashing with cost factor 10, minimum 8 character requirement
- **User Preferences**: Theme, language, notifications, and custom JSON preferences
- **Activity Logging**: Track user actions and resource interactions
- **Multi-tenant Isolation**: Enforce dealership-level data separation
- **Email Validation**: Check email availability before registration
- **Soft Deletes**: Deactivate users without data loss

## Roles and Permissions

### Admin
Full dealership access:
- `view_all` - View all resources
- `edit_all` - Edit all resources
- `view_own` - View own resources
- `edit_own` - Edit own resources
- `manage_users` - Create/update/delete users
- `manage_settings` - Configure system settings

### Manager
Team management access:
- `view_all` - View all team resources
- `view_own` - View own resources
- `edit_own` - Edit own resources

### Salesperson
Individual contributor access:
- `view_own` - View own deals and customers
- `edit_own` - Edit own deals and customers

## API Endpoints

### Health Check
```
GET /health
```

### User Management
```
POST   /users                      - Create new user
GET    /users                      - List users (filter by role, status)
GET    /users/{id}                 - Get user details
PUT    /users/{id}                 - Update user
DELETE /users/{id}                 - Deactivate user (soft delete)
```

### Role Management
```
PUT /users/{id}/role - Update user role (admin only)
```

### Password Management
```
POST /users/{id}/password - Change password (requires old password)
```

### Activity Tracking
```
GET /users/{id}/activity - Get user activity log (default 100, max via ?limit=N)
```

### Preferences
```
PUT /users/{id}/preferences - Save user preferences
GET /users/{id}/preferences - Get user preferences
```

### Email Validation
```
POST /users/validate-email - Check if email exists
```

## Request/Response Examples

### Create User
```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "password": "secure_password123",
    "role": "salesperson",
    "phone": "+1-555-0123"
  }'
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "dealership_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "salesperson",
  "status": "active",
  "phone": "+1-555-0123",
  "created_at": "2025-11-24T10:00:00Z",
  "updated_at": "2025-11-24T10:00:00Z"
}
```

### List Users
```bash
curl "http://localhost:8080/users?dealership_id=550e8400-e29b-41d4-a716-446655440000&role=admin"
```

### Update User
```bash
curl -X PUT "http://localhost:8080/users/{id}?dealership_id={dealership_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "+1-555-9999"
  }'
```

### Update Role (Admin Only)
```bash
curl -X PUT "http://localhost:8080/users/{id}/role?dealership_id={dealership_id}" \
  -H "Content-Type: application/json" \
  -d '{"role": "manager"}'
```

### Change Password
```bash
curl -X POST "http://localhost:8080/users/{id}/password?dealership_id={dealership_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "current_password",
    "new_password": "new_secure_password"
  }'
```

### Save Preferences
```bash
curl -X PUT http://localhost:8080/users/{id}/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "theme": "dark",
    "language": "en",
    "notifications_enabled": true,
    "preferences_json": {
      "dashboard_layout": "compact",
      "show_notifications": true
    }
  }'
```

### Get Activity Log
```bash
curl "http://localhost:8080/users/{id}/activity?limit=50"
```

### Validate Email
```bash
curl -X POST http://localhost:8080/users/validate-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "check@example.com",
    "dealership_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Response:
```json
{
  "exists": false
}
```

## Database Schema

### users table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    dealership_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(dealership_id, email)
);
```

### user_preferences table
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL DEFAULT 'light',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    preferences_json JSONB
);
```

### user_activity table
```sql
CREATE TABLE user_activity (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=autolytiq_users
PORT=8080
```

## Running the Service

### Development
```bash
# Install dependencies
go mod download

# Run the service
go run .

# Run tests
go test -v

# Run tests with coverage
go test -v -cover
```

### Production
```bash
# Build binary
go build -o user-service

# Run with environment variables
DB_HOST=db.example.com \
DB_PORT=5432 \
DB_USER=prod_user \
DB_PASSWORD=prod_password \
DB_NAME=autolytiq_users \
PORT=8080 \
./user-service
```

### Docker
```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=autolytiq_users \
  user-service
```

## Testing

The service includes comprehensive tests covering:
- User CRUD operations
- Password hashing and validation
- Role management and permissions
- User preferences
- Activity logging
- Multi-tenant isolation
- Email validation
- Soft deletes

Run tests:
```bash
go test -v -cover
```

Expected output:
```
=== RUN   TestHealthCheck
--- PASS: TestHealthCheck
=== RUN   TestCreateUser
--- PASS: TestCreateUser
=== RUN   TestCreateUserInvalidRole
--- PASS: TestCreateUserInvalidRole
...
PASS
coverage: 90%+
```

## Security Features

1. **Password Hashing**: Bcrypt with cost factor 10
2. **Password Requirements**: Minimum 8 characters
3. **Multi-tenant Isolation**: All queries enforce dealership_id
4. **Soft Deletes**: Users are deactivated, not deleted
5. **Activity Logging**: Track all user actions
6. **Password Hash Protection**: Never returned in API responses
7. **Old Password Verification**: Required for password changes

## Status Values

- `active` - User can log in and use the system
- `inactive` - Soft deleted, cannot log in
- `pending` - Email verification needed

## Connection Pool Configuration

- Max Open Connections: 25
- Max Idle Connections: 5
- Connection Max Lifetime: 5 minutes

## Dependencies

- `github.com/google/uuid` v1.6.0 - UUID generation
- `github.com/gorilla/mux` v1.8.1 - HTTP routing
- `github.com/lib/pq` v1.10.9 - PostgreSQL driver
- `golang.org/x/crypto` v0.17.0 - Password hashing

## Architecture

- **database_interface.go** - Domain models and interface definitions
- **database.go** - PostgreSQL implementation with connection pooling
- **roles.go** - RBAC system with role and permission definitions
- **main.go** - HTTP server and request handlers
- **main_test.go** - Comprehensive test suite with MockDatabase

## License

Proprietary - Autolytiq
