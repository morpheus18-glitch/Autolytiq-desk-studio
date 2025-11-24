# Service Specifications - Quick Reference

**Last Updated:** 2025-11-23
**Purpose:** Quick-start guides for each service

---

## Service 1: auth-go

### Purpose
Complete authentication service with JWT, MFA, password management, and session handling.

### Tech Stack
- Go 1.21+
- JWT (golang-jwt/jwt)
- bcrypt (password hashing)
- TOTP (pquerna/otp for MFA)

### Key Dependencies
```go
github.com/golang-jwt/jwt/v5
github.com/google/uuid
golang.org/x/crypto/bcrypt
github.com/pquerna/otp
github.com/go-chi/chi/v5  // HTTP router
```

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'salesperson')),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- MFA configuration
CREATE TABLE mfa_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,                -- TOTP secret (encrypted)
  backup_codes TEXT[],            -- Array of backup codes (hashed)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Active sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,       -- SHA256 hash of JWT for revocation
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,       -- Hashed token
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL, -- login, logout, mfa_enabled, password_reset, etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_created_at ON auth_audit_log(created_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### API Endpoints
```
POST   /auth/register              - User registration
POST   /auth/login                 - Login (username/password)
POST   /auth/logout                - Logout (invalidate session)
POST   /auth/refresh               - Refresh JWT token
GET    /auth/validate              - Validate token (for gateway)

POST   /auth/forgot-password       - Request password reset
POST   /auth/reset-password        - Complete password reset
POST   /auth/change-password       - Change password (authenticated)

POST   /auth/mfa/setup             - Enable MFA (returns QR code)
POST   /auth/mfa/verify            - Verify MFA code during login
POST   /auth/mfa/disable           - Disable MFA
POST   /auth/mfa/regenerate-backup - Generate new backup codes

GET    /auth/sessions              - List active sessions
DELETE /auth/sessions/:id          - Revoke specific session
DELETE /auth/sessions/all          - Logout all sessions
```

### JWT Claims
```go
type JWTClaims struct {
  UserID       string `json:"user_id"`
  DealershipID string `json:"dealership_id"`
  Username     string `json:"username"`
  Role         string `json:"role"`
  jwt.RegisteredClaims
}
```

### Environment Variables
```bash
JWT_SECRET=your-secret-key-min-32-chars
JWT_ISSUER=autolytiq
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_COST=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15m
DATABASE_URL=postgresql://...
PORT=3001
```

---

## Service 2: admin-go

### Purpose
User management, dealership settings, RBAC, and audit logging.

### Tech Stack
- Go 1.21+
- Chi router
- PostgreSQL

### Database Schema
```sql
-- Dealerships
CREATE TABLE dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  legal_name VARCHAR(100),
  tax_id VARCHAR(20),
  address JSONB,
  contact JSONB,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dealership settings
CREATE TABLE dealership_settings (
  dealership_id UUID PRIMARY KEY REFERENCES dealerships(id),
  settings JSONB NOT NULL DEFAULT '{}',
  tax_config JSONB,
  email_templates JSONB,
  branding JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User roles (RBAC)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,     -- Array like ['deals.read', 'deals.write']
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dealership_id, name)
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR(50) NOT NULL,  -- deal, customer, user, setting
  resource_id UUID,
  action VARCHAR(50) NOT NULL,         -- create, update, delete, view
  changes JSONB,                       -- { before: {...}, after: {...} }
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_dealership_id ON audit_logs(dealership_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

### API Endpoints
```
# User Management
GET    /admin/users                - List all users (tenant-scoped)
POST   /admin/users                - Create user (admin only)
GET    /admin/users/:id            - Get user details
PUT    /admin/users/:id            - Update user
DELETE /admin/users/:id            - Deactivate user
PUT    /admin/users/:id/role       - Change user role
PUT    /admin/users/:id/approve    - Approve pending user

# Dealership Settings
GET    /admin/dealerships/:id      - Get dealership details
PUT    /admin/dealerships/:id      - Update dealership

GET    /admin/settings             - Get tenant settings
PUT    /admin/settings             - Update settings
GET    /admin/settings/tax         - Get tax configuration
PUT    /admin/settings/tax         - Update tax rules

# Roles (RBAC)
GET    /admin/roles                - List all roles
POST   /admin/roles                - Create custom role
PUT    /admin/roles/:id            - Update role
DELETE /admin/roles/:id            - Delete role

# Audit Logs
GET    /admin/audit-logs           - Query audit logs (paginated)
GET    /admin/audit-logs/users/:id - User activity
GET    /admin/audit-logs/export    - Export as CSV
```

### Permissions List
```go
var AllPermissions = []string{
  "deals.read",
  "deals.write",
  "deals.delete",
  "deals.approve",
  "customers.read",
  "customers.write",
  "customers.delete",
  "inventory.read",
  "inventory.write",
  "reports.view",
  "reports.export",
  "users.read",
  "users.write",
  "settings.read",
  "settings.write",
  "audit.read",
}
```

---

## Service 3: calc-engine-rs

### Purpose
High-performance financial calculations (tax, cash, finance, lease) for all 50 states.

### Tech Stack
- Rust 2021 edition
- wasm-pack (WASM build tool)
- rust_decimal (exact decimal math)
- serde (JSON serialization)

### Cargo.toml
```toml
[package]
name = "calc-engine"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
rust_decimal = "1.33"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = "0.2"

[dev-dependencies]
criterion = "0.5"

[profile.release]
opt-level = "z"      # Optimize for size
lto = true           # Link-time optimization
codegen-units = 1    # Better optimization
```

### WASM Exports
```rust
// lib.rs

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_tax(request_json: &str) -> String {
  // Parse JSON, calculate, return JSON
}

#[wasm_bindgen]
pub fn calculate_cash_deal(request_json: &str) -> String {
  // ...
}

#[wasm_bindgen]
pub fn calculate_finance(request_json: &str) -> String {
  // ...
}

#[wasm_bindgen]
pub fn calculate_lease(request_json: &str) -> String {
  // ...
}
```

### Build Commands
```bash
# Install wasm-pack
cargo install wasm-pack

# Build for Node.js (gateway)
wasm-pack build --target nodejs --out-dir ../gateway/src/wasm

# Build for browser (frontend)
wasm-pack build --target web --out-dir ../frontend/public/wasm

# Run tests
cargo test

# Run benchmarks
cargo bench
```

### Performance Targets
- Tax calculation: < 1ms
- Cash deal: < 2ms
- Finance (with amortization): < 5ms
- Lease: < 3ms

---

## Service 4: ai-agent-py

### Purpose
Conversational AI assistant for deal structuring, tax questions, and sales coaching.

### Tech Stack
- Python 3.11+
- FastAPI
- LangChain
- OpenAI (or Anthropic)
- pgvector (PostgreSQL extension)

### requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
langchain==0.1.0
langchain-openai==0.0.2
pgvector==0.2.4
psycopg2-binary==2.9.9
pydantic==2.5.3
python-dotenv==1.0.0
httpx==0.26.0
structlog==24.1.0
```

### API Endpoints
```
POST   /ai/chat                - Synchronous chat
WS     /ai/ws/chat             - WebSocket chat (streaming)
GET    /ai/context/:deal_id    - Get deal context
POST   /ai/suggest             - Get AI suggestions

GET    /ai/conversations       - List user's conversations
GET    /ai/conversations/:id   - Get conversation history
DELETE /ai/conversations/:id   - Delete conversation

GET    /health                 - Health check
```

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7
DATABASE_URL=postgresql://...
VECTOR_DIMENSIONS=1536

DEAL_SERVICE_URL=http://deal-go:3003
CUSTOMER_SERVICE_URL=http://customer-go:3004
ML_SERVICE_URL=http://ml-py:3007

RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_TENANT=1000
```

### Database Setup
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),          -- OpenAI ada-002 dimensions
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  deal_id UUID,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Service 5: ml-pipeline-py

### Purpose
ML engines (WHACO, Prime, Oscillator) for customer clustering, deal optimization, and team coordination.

### Tech Stack
- Python 3.11+
- FastAPI
- NumPy
- scikit-learn (optional, for advanced features)

### requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
numpy==1.26.3
pydantic==2.5.3
structlog==24.1.0
psycopg2-binary==2.9.9
```

### API Endpoints
```
# WHACO Engine
POST   /ml/whaco/classify          - Classify customer
GET    /ml/whaco/clusters          - Get cluster profiles
GET    /ml/whaco/outliers          - Recent outliers
POST   /ml/whaco/reset             - Reset clustering

# Prime Engine
POST   /ml/prime/recommend         - Get strategy recommendation
POST   /ml/prime/record-outcome    - Record success/failure
GET    /ml/prime/performance       - Performance report

# Oscillator Network
POST   /ml/oscillator/assign-lead  - Assign lead to salesperson
GET    /ml/oscillator/team-status  - Team coherence status
POST   /ml/oscillator/deal-closed  - Record deal closure
GET    /ml/oscillator/bottlenecks  - Identify bottlenecks

# State Management
POST   /ml/state/save              - Save all model states
POST   /ml/state/load              - Load model states

GET    /health                     - Health check
```

### Model State Persistence
```sql
-- Model state table
CREATE TABLE ml_model_states (
  model_name VARCHAR(50) PRIMARY KEY,  -- whaco, prime, oscillator
  state JSONB NOT NULL,
  version INT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Service 6: deal-go, customer-go, inventory-go

These are existing services that need to be **extracted and formalized** from the current monolithic backend.

### General Structure (all three services)
```
service-name-go/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── domain/                  # Business logic
│   │   ├── deal.go              # Domain entities
│   │   └── validation.go        # Business rules
│   ├── handlers/                # HTTP handlers
│   │   ├── deals.go
│   │   └── middleware.go
│   ├── repository/              # Database layer
│   │   ├── deal_repo.go
│   │   └── postgres.go
│   └── service/                 # Application services
│       └── deal_service.go      # Orchestration
├── pkg/                         # Public libraries
│   ├── logger/
│   ├── config/
│   └── middleware/
├── api/
│   └── openapi.yaml             # API contract
├── tests/
│   ├── integration/
│   └── unit/
└── go.mod
```

### Common Dependencies (all Go services)
```go
github.com/go-chi/chi/v5          // HTTP router
github.com/google/uuid
github.com/lib/pq                  // PostgreSQL driver
github.com/rs/zerolog              // Logging
github.com/joho/godotenv           // .env files
```

---

## Development Workflow

### 1. Start Development Environment
```bash
docker-compose up -d postgres redis
```

### 2. Run Services Locally
```bash
# Gateway
cd gateway
npm install
npm run dev           # Port 3000

# Auth service
cd services/auth-go
go run cmd/server/main.go   # Port 3001

# Admin service
cd services/admin-go
go run cmd/server/main.go   # Port 3002

# AI Agent
cd services/ai-agent-py
pip install -r requirements.txt
uvicorn main:app --reload --port 3006

# ML Pipeline
cd services/ml-pipeline-py
pip install -r requirements.txt
uvicorn main:app --reload --port 3007
```

### 3. Build Rust WASM
```bash
cd services/calc-engine-rs
wasm-pack build --target nodejs --out-dir ../../gateway/src/wasm
```

### 4. Run Tests
```bash
# All services
make test

# Specific service
cd services/auth-go
go test ./...

cd services/ai-agent-py
pytest
```

---

## Docker Compose (Complete Stack)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: autolytiq
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  auth-go:
    build: ./services/auth-go
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/autolytiq
      JWT_SECRET: dev-secret-key-min-32-characters
    depends_on:
      - postgres

  admin-go:
    build: ./services/admin-go
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/autolytiq
    depends_on:
      - postgres

  ai-agent-py:
    build: ./services/ai-agent-py
    ports:
      - "3006:3006"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/autolytiq
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - postgres

  ml-py:
    build: ./services/ml-pipeline-py
    ports:
      - "3007:3007"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/autolytiq
    depends_on:
      - postgres

  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      AUTH_SERVICE_URL: http://auth-go:3001
      ADMIN_SERVICE_URL: http://admin-go:3002
      AI_SERVICE_URL: http://ai-agent-py:3006
      ML_SERVICE_URL: http://ml-py:3007
    depends_on:
      - auth-go
      - admin-go
      - ai-agent-py
      - ml-py

volumes:
  pgdata:
```

---

## Database Migration Strategy

### 1. Create Migration Scripts
```sql
-- migrations/001_create_users.sql
CREATE TABLE users (...);

-- migrations/002_create_sessions.sql
CREATE TABLE sessions (...);

-- etc.
```

### 2. Run Migrations
```bash
# Using golang-migrate
migrate -path migrations -database "postgresql://..." up

# Or use Prisma
npx prisma migrate deploy
```

---

## Monitoring & Logging

### Structured Logging (All Services)

**Go (zerolog):**
```go
log.Info().
  Str("tenant_id", tenantID).
  Str("user_id", userID).
  Str("deal_id", dealID).
  Int("duration_ms", duration).
  Msg("DEAL_CREATED")
```

**Python (structlog):**
```python
logger.info(
  "CUSTOMER_CLASSIFIED",
  tenant_id=tenant_id,
  customer_id=customer_id,
  cluster_id=cluster_id,
)
```

### Health Checks (All Services)
```
GET /health

Response:
{
  "status": "healthy",
  "service": "auth-go",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected"
}
```

---

## Security Checklist

- [ ] All services validate JWT tokens
- [ ] All database queries scoped to tenantId
- [ ] All passwords hashed with bcrypt (cost 12+)
- [ ] All secrets in environment variables (not code)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (sanitized outputs)
- [ ] HTTPS in production
- [ ] Audit logging for sensitive operations

---

**Next:** Choose one service to start with (recommended: **auth-go** as foundation)
