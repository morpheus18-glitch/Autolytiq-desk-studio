# Autolytiq Desk Studio Architecture

This document provides an overview of the Autolytiq Desk Studio architecture, design decisions, and key patterns used throughout the codebase.

## System Overview

Autolytiq Desk Studio is an automotive dealership management platform built with a microservices architecture. The system handles deal processing, customer management, inventory tracking, and tax calculations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      React SPA (Vite + TypeScript)                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │Dashboard │ │  Deals   │ │Customers │ │Inventory │ │ Settings │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │ │
│  │                              │                                            │ │
│  │  ┌───────────────────────────┴───────────────────────────────┐           │ │
│  │  │                     WASM Modules                           │           │ │
│  │  │  ┌─────────────────┐  ┌─────────────────────────────────┐ │           │ │
│  │  │  │ Tax Engine (RS) │  │ PQC Encryption Engine (RS)      │ │           │ │
│  │  │  └─────────────────┘  └─────────────────────────────────┘ │           │ │
│  │  └───────────────────────────────────────────────────────────┘           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (Go)                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │   Router    │ │    Auth     │ │ Rate Limit  │ │ Request Logging     │    │
│  │  (Gorilla)  │ │ Middleware  │ │ Middleware  │ │ & Metrics           │    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Auth Service (Go)     │ │  Deal Service (Go)  │ │ Customer Service(Go)│
│  ┌───────────────────┐  │ │  ┌───────────────┐  │ │ ┌───────────────┐  │
│  │ JWT Generation    │  │ │  │ Calculations  │  │ │ │ Credit Check  │  │
│  │ MFA (TOTP)        │  │ │  │ Workflows     │  │ │ │ Prequalify    │  │
│  │ Password Reset    │  │ │  │ State Machine │  │ │ │ PII Encryption│  │
│  │ Session Mgmt      │  │ │  └───────────────┘  │ │ └───────────────┘  │
│  └───────────────────┘  │ └─────────────────────┘ └─────────────────────┘
└─────────────────────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │      PostgreSQL 16              │  │         Redis 7                  │   │
│  │  - Customers                    │  │  - Sessions                      │   │
│  │  - Deals                        │  │  - Rate Limiting                 │   │
│  │  - Inventory                    │  │  - Cache                         │   │
│  │  - Users (with PII encryption)  │  │  - Password Reset Tokens         │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Technologies

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| TanStack Query | Server state management |
| Wouter | Routing |
| Tailwind CSS | Styling |
| Zod | Schema validation |

### Backend

| Technology | Purpose |
|------------|---------|
| Go 1.21+ | Microservices |
| Gorilla Mux | HTTP routing |
| PostgreSQL 16 | Primary database |
| Redis 7 | Caching & sessions |
| Prometheus | Metrics |
| Zerolog | Structured logging |

### Special Purpose

| Technology | Purpose |
|------------|---------|
| Rust + WASM | Tax calculations, PQC encryption |
| Drizzle ORM | TypeScript database schema |
| Playwright | E2E testing |

## Microservices

### API Gateway (Port 8080)

The API Gateway is the single entry point for all client requests.

**Responsibilities:**
- Route requests to appropriate services
- JWT validation
- Rate limiting
- Request logging
- CORS handling
- API documentation (Swagger)

### Auth Service (Port 8081)

Handles all authentication and authorization.

**Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `POST /auth/mfa/setup` - MFA setup
- `POST /auth/mfa/verify` - MFA verification
- `POST /auth/password/reset` - Password reset

**Security Features:**
- JWT with RS256 signing
- TOTP-based MFA
- Secure password hashing (bcrypt)
- Session management via Redis

### Deal Service (Port 8083)

Manages automotive deals and financing calculations.

**Endpoints:**
- `GET/POST /deals` - List/create deals
- `GET/PUT/DELETE /deals/{id}` - Deal CRUD
- `POST /deals/{id}/calculate` - Calculate financing
- `POST /deals/{id}/transition` - State transitions

**Features:**
- Finance/lease/cash deal types
- Payment calculations
- State machine (draft → pending → approved → funded → delivered)
- Tax integration via WASM

### Customer Service (Port 8082)

Manages customer data with PII encryption.

**Endpoints:**
- `GET/POST /customers` - List/create customers
- `GET/PUT/DELETE /customers/{id}` - Customer CRUD
- `POST /customers/{id}/credit-check` - Run credit check
- `GET /customers/{id}/credit-profile` - Get credit profile
- `GET /customers/{id}/financing-options` - Get financing options
- `POST /customers/{id}/prequalify` - Prequalification

**Security:**
- PII fields encrypted at rest
- GDPR compliance (soft delete, anonymization)

## Security Architecture

### Post-Quantum Cryptography (PQC)

The system implements NIST-standardized post-quantum algorithms for future-proof security:

- **ML-KEM (Kyber-1024)**: Key encapsulation for PII encryption
- **ML-DSA (Dilithium)**: Digital signatures
- **Hybrid Mode**: Classical (X25519) + PQC for defense-in-depth

```
PII Encryption Flow:
┌──────────────┐    ┌────────────────────┐    ┌──────────────┐
│  Plaintext   │ -> │ Hybrid Encryption  │ -> │ Ciphertext   │
│  (SSN, etc.) │    │ Kyber + X25519 +   │    │ Stored in DB │
│              │    │ ChaCha20-Poly1305  │    │              │
└──────────────┘    └────────────────────┘    └──────────────┘
```

### Authentication Flow

```
1. User submits credentials
   └─> Auth Service validates
       └─> If MFA enabled: return challenge
           └─> User submits TOTP code
               └─> Auth Service validates
                   └─> Issue JWT + Refresh Token

JWT Structure:
{
  "sub": "user_id",
  "dealership_id": "...",
  "role": "admin|sales|finance",
  "exp": "...",
  "iat": "..."
}
```

## Data Flow Patterns

### Request Flow

```
Client Request
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ API Gateway                                                   │
│  1. Parse request                                             │
│  2. Validate JWT (if protected route)                         │
│  3. Rate limit check                                          │
│  4. Log request                                               │
│  5. Forward to service                                        │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ Target Service                                                │
│  1. Parse request body                                        │
│  2. Validate input (Zod-style validation)                     │
│  3. Execute business logic                                    │
│  4. Interact with database                                    │
│  5. Return response                                           │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
Response to Client
```

### Error Handling

All services use a standardized error format:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Email is invalid",
  "details": {
    "fields": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  },
  "request_id": "abc123",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Error codes are consistent across frontend and backend for unified handling.

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/              # Primitive UI components (Button, Input, etc.)
│   ├── accessibility/   # Accessibility helpers (SkipLink, FocusTrap)
│   ├── forms/           # Form components (DealForm, CustomerForm)
│   └── ErrorBoundary/   # Error handling components
├── hooks/
│   ├── useAuth.ts       # Authentication hook
│   ├── useErrorHandler.ts # Error handling hook
│   └── use*.ts          # Feature-specific hooks
├── contexts/
│   ├── AuthContext.tsx  # Auth state management
│   └── ThemeContext.tsx # Theme management
├── pages/
│   ├── Dashboard/
│   ├── Deals/
│   └── ...
└── lib/
    ├── api.ts           # API client
    ├── errors.ts        # Error utilities
    └── utils.ts         # General utilities
```

### State Management

- **Server State**: TanStack Query (React Query)
- **Client State**: React Context + useState
- **Form State**: React Hook Form + Zod

### Accessibility

WCAG 2.1 Level AA compliance:
- Skip links for keyboard navigation
- ARIA live regions for dynamic content
- Focus management in modals
- Proper form labeling and error announcements

## Testing Strategy

### Test Pyramid

```
        ┌─────────────────┐
       /                   \
      /    E2E Tests        \    <- Playwright
     /   (Critical paths)    \
    /─────────────────────────\
   /                           \
  /    Integration Tests        \  <- Service integration
 /   (Service boundaries)        \
/─────────────────────────────────\
│                                 │
│        Unit Tests               │  <- Functions, components
│    (Business logic)             │
└─────────────────────────────────┘
```

### Test Commands

```bash
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests
go test ./...             # Go service tests
```

## Deployment

### Environment Variables

See `.env.example` for required configuration:

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_EXPIRY=15m

# Encryption
PII_ENCRYPTION_KEY=...

# Services
AUTH_SERVICE_URL=http://localhost:8081
DEAL_SERVICE_URL=http://localhost:8083
CUSTOMER_SERVICE_URL=http://localhost:8082
```

### Health Checks

All services expose `/health` endpoint:

```json
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Performance Considerations

- **Database**: Indexed queries, connection pooling
- **Caching**: Redis for sessions and frequently accessed data
- **Frontend**: Code splitting, lazy loading, React Query caching
- **WASM**: Computation-heavy tasks offloaded to Rust

## Future Considerations

1. **GraphQL Gateway**: Unified API for complex data fetching
2. **Event Sourcing**: Audit trail for deals
3. **Real-time Updates**: WebSocket for live notifications
4. **Multi-tenancy**: Dealership isolation at database level
