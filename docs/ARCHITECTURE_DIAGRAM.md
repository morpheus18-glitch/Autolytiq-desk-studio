# Autolytiq Clean Rebuild - Architecture Diagrams

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USERS & BROWSERS                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│                         (Next.js 14 - React)                             │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Deals     │  │  Customers  │  │  Inventory  │  │    Email    │   │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Core (UI Only)                             │  │
│  │  - HTTP Client (Fetch wrapper)                                   │  │
│  │  - React Query (State management)                                │  │
│  │  - UI Components (Radix, Design tokens)                          │  │
│  │  - Logger (Browser logging)                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ REST API (HTTPS)
                                 │ (OpenAPI contracts)
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                          GATEWAY LAYER (BFF)                             │
│                        (Node.js + Express)                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Middleware                                   │  │
│  │  - Authentication (JWT/Session)                                  │  │
│  │  - Request Logging (Pino)                                        │  │
│  │  - Rate Limiting                                                 │  │
│  │  - Error Handling                                                │  │
│  │  - CORS                                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Service Clients                                │  │
│  │  - Deal Service Client    → HTTP → deal-engine-go               │  │
│  │  - Customer Service Client → HTTP → customer-service-go         │  │
│  │  - Inventory Service Client → HTTP → inventory-service-go       │  │
│  │  - Tax Service Client     → WASM → tax-engine-rs (in-process)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────┬────────────┬───────────────┬──────────────────────────────┘
              │            │               │
              │ HTTP       │ HTTP          │ HTTP
              │            │               │
  ┌───────────▼──┐   ┌─────▼──────┐   ┌───▼──────────┐
  │              │   │            │   │              │
  │  Deal Engine │   │  Customer  │   │  Inventory   │
  │     (Go)     │   │  Service   │   │   Service    │
  │              │   │    (Go)    │   │     (Go)     │
  └──────┬───────┘   └─────┬──────┘   └───┬──────────┘
         │                 │              │
         │                 │              │
         └─────────────────┴──────────────┘
                          │
                          │ SQL
                          │
         ┌────────────────▼────────────────┐
         │                                 │
         │     PostgreSQL Database         │
         │   (Shared, Multi-tenant)        │
         │                                 │
         │  - deals table                  │
         │  - customers table              │
         │  - inventory table              │
         │  - vehicles table               │
         │  - deal_scenarios table         │
         │  - ...                          │
         └─────────────────────────────────┘
```

---

## Frontend Architecture (Next.js 14)

```
frontend/
│
├── src/app/                              ← Next.js App Router
│   ├── (auth)/                          ← Auth routes group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── (dashboard)/                     ← Dashboard routes group
│   │   ├── deals/
│   │   │   ├── page.tsx                 ← /deals
│   │   │   ├── [id]/page.tsx            ← /deals/123
│   │   │   └── new/page.tsx             ← /deals/new
│   │   │
│   │   ├── customers/page.tsx           ← /customers
│   │   ├── inventory/page.tsx           ← /inventory
│   │   └── layout.tsx                   ← Shared layout
│   │
│   ├── api/                             ← API routes (proxy to gateway)
│   │   ├── deals/route.ts
│   │   ├── customers/route.ts
│   │   └── tax/route.ts
│   │
│   └── layout.tsx                       ← Root layout
│
├── src/modules/                          ← Feature modules (UI ONLY)
│   │
│   ├── deals/
│   │   ├── components/                  ← React components
│   │   │   ├── DealCard.tsx
│   │   │   ├── DealWorkspace.tsx
│   │   │   ├── PricingPanel.tsx
│   │   │   └── index.ts                 ← Public API
│   │   │
│   │   ├── hooks/                       ← React hooks
│   │   │   ├── useDeal.ts               ← useQuery hook
│   │   │   ├── useCreateDeal.ts         ← useMutation hook
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                       ← UI-specific types
│   │   │   └── index.ts                 ← Re-exports from @shared/types
│   │   │
│   │   └── index.ts                     ← Module public API
│   │
│   ├── customers/                       ← Same structure
│   ├── inventory/                       ← Same structure
│   └── tax/                             ← Same structure
│
└── src/core/                            ← Cross-cutting concerns
    │
    ├── config/
    │   └── env.ts                       ← Environment variables
    │
    ├── http/
    │   ├── client.ts                    ← Fetch wrapper
    │   └── queryClient.ts               ← React Query config
    │
    ├── logger/
    │   └── logger.ts                    ← Pino browser logger
    │
    ├── types/
    │   └── common.ts                    ← Shared UI types
    │
    └── ui/                              ← Design system
        ├── components/                  ← Radix components
        │   ├── button.tsx
        │   ├── input.tsx
        │   ├── dialog.tsx
        │   └── [50+ components]
        │
        └── design-tokens/
            ├── colors.ts
            ├── spacing.ts
            └── typography.ts

RULES:
❌ NO business logic in components
❌ NO direct database access
❌ NO API calls outside of hooks
✅ ONLY UI rendering, user input handling, API calls via hooks
✅ Components are PURE (presentational only)
```

---

## Backend Services Architecture (Go Microservices)

```
services/
│
├── deal-engine-go/
│   │
│   ├── cmd/server/
│   │   └── main.go                      ← Entry point
│   │
│   ├── internal/                        ← Private application code
│   │   │
│   │   ├── domain/                      ← Business logic
│   │   │   ├── deal.go                  ← Deal entity + rules
│   │   │   ├── pricing.go               ← Pricing calculations
│   │   │   └── validation.go            ← Domain validation
│   │   │
│   │   ├── handlers/                    ← HTTP handlers
│   │   │   ├── deals.go                 ← Deal endpoints
│   │   │   └── middleware.go
│   │   │
│   │   ├── repository/                  ← Database layer
│   │   │   ├── deal_repo.go             ← Deal CRUD
│   │   │   └── postgres.go              ← PostgreSQL client
│   │   │
│   │   └── service/                     ← Application services
│   │       ├── deal_service.go          ← Orchestration
│   │       └── tax_client.go            ← Calls tax engine
│   │
│   ├── pkg/                             ← Public libraries
│   │   ├── logger/                      ← Structured logging
│   │   ├── config/                      ← Configuration
│   │   └── middleware/                  ← Shared middleware
│   │
│   ├── api/
│   │   └── openapi.yaml                 ← API contract
│   │
│   └── tests/
│       ├── integration/
│       └── unit/
│
├── customer-service-go/                 ← Same structure
└── inventory-service-go/                ← Same structure

LAYERING:
┌──────────────┐
│   Handlers   │  ← HTTP layer (routes, middleware)
└──────┬───────┘
       │
┌──────▼───────┐
│   Services   │  ← Application logic (orchestration)
└──────┬───────┘
       │
┌──────▼───────┐
│    Domain    │  ← Business logic (rules, validations)
└──────┬───────┘
       │
┌──────▼───────┐
│  Repository  │  ← Data access (PostgreSQL)
└──────────────┘

RULES:
✅ Handlers only parse requests and call services
✅ Services orchestrate domain logic and repositories
✅ Domain contains ALL business rules
✅ Repositories only do database CRUD
❌ NO business logic in handlers or repositories
```

---

## Tax Engine Architecture (Rust → WASM)

```
services/tax-engine-rs/
│
├── src/
│   │
│   ├── lib.rs                           ← WASM entry point
│   │   │
│   │   ├── calculate_tax()              ← Main WASM export
│   │   ├── version()                    ← Version info
│   │   └── supported_states()           ← List of states
│   │
│   ├── models/                          ← Domain models
│   │   ├── address.rs                   ← CustomerAddress
│   │   ├── tax_profile.rs               ← TaxProfile
│   │   ├── tax_method.rs                ← TaxMethod enum
│   │   ├── jurisdiction.rs              ← Jurisdiction
│   │   └── mod.rs
│   │
│   ├── calculator/                      ← Tax calculations
│   │   ├── retail.rs                    ← Retail tax logic
│   │   ├── lease.rs                     ← Lease tax logic
│   │   ├── trade_in.rs                  ← Trade-in credit
│   │   ├── luxury.rs                    ← Luxury tax
│   │   └── mod.rs
│   │
│   ├── state_rules/                     ← State-specific rules
│   │   ├── loader.rs                    ← JSON loader
│   │   ├── ca.rs                        ← California logic
│   │   ├── tx.rs                        ← Texas logic
│   │   ├── ga.rs                        ← Georgia TAVT
│   │   └── [50 states...]
│   │
│   ├── local_rates/                     ← Local tax rates
│   │   ├── lookup.rs                    ← ZIP → rate
│   │   └── cache.rs                     ← In-memory cache
│   │
│   └── utils/
│       ├── decimal.rs                   ← High-precision math
│       └── validation.rs
│
├── data/
│   ├── state_rules.json                 ← All state rules
│   └── local_rates.json                 ← Local tax data
│
├── tests/
│   ├── integration/
│   │   ├── test_ca_retail.rs
│   │   ├── test_tx_lease.rs
│   │   └── test_parity.rs               ← TypeScript comparison
│   │
│   └── unit/
│       ├── test_calculator.rs
│       └── test_trade_in.rs
│
└── benches/
    └── tax_calculation.rs               ← Performance benchmarks

WASM USAGE IN GATEWAY:

┌─────────────────────────────────────────┐
│          Gateway (Node.js)              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  taxService.ts                    │ │
│  │                                   │ │
│  │  const wasm = await import(      │ │
│  │    './wasm/tax-engine-node'      │ │
│  │  );                               │ │
│  │                                   │ │
│  │  const result = wasm.calculate_tax│ │
│  │    (JSON.stringify(input));      │ │
│  │                                   │ │
│  │  return JSON.parse(result);      │ │
│  └───────────────────────────────────┘ │
│               │                         │
│               │ WASM call               │
│               ▼                         │
│  ┌───────────────────────────────────┐ │
│  │  tax-engine.wasm                  │ │
│  │  (Compiled Rust)                  │ │
│  │                                   │ │
│  │  - 10-100x faster than JS         │ │
│  │  - Memory safe                    │ │
│  │  - No runtime errors              │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘

BENEFITS:
✅ 10-100x performance improvement
✅ Same code runs in browser, Node.js, mobile
✅ Memory safety (no null pointer errors)
✅ Deterministic (no floating-point errors)
```

---

## Data Flow - Deal Creation Example

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       │ 1. Click "Create Deal"
       │
┌──────▼────────────────────────────────────────┐
│   Frontend (Next.js)                          │
│                                               │
│   DealCreationForm.tsx                        │
│   ↓                                           │
│   const { mutate } = useCreateDeal()          │
│   ↓                                           │
│   mutate(dealData)                            │
│   ↓                                           │
│   POST /api/deals                             │
└──────┬────────────────────────────────────────┘
       │
       │ 2. HTTP POST (JSON)
       │
┌──────▼────────────────────────────────────────┐
│   Gateway (Node.js BFF)                       │
│                                               │
│   routes/deals.ts                             │
│   ↓                                           │
│   middleware: auth, logging, validation       │
│   ↓                                           │
│   dealService.createDeal(dealData)            │
│   ↓                                           │
│   HTTP POST → deal-engine-go                  │
└──────┬────────────────────────────────────────┘
       │
       │ 3. HTTP POST (JSON)
       │
┌──────▼────────────────────────────────────────┐
│   Deal Service (Go)                           │
│                                               │
│   handlers/deals.go                           │
│   ↓                                           │
│   service/deal_service.CreateDeal()           │
│   ↓                                           │
│   domain/deal.Validate()                      │
│   ↓                                           │
│   repository/deal_repo.Create()               │
│   ↓                                           │
│   INSERT INTO deals (...)                     │
└──────┬────────────────────────────────────────┘
       │
       │ 4. SQL INSERT
       │
┌──────▼────────────────────────────────────────┐
│   PostgreSQL Database                         │
│                                               │
│   deals table                                 │
│   ↓                                           │
│   Returns: deal with ID                       │
└──────┬────────────────────────────────────────┘
       │
       │ 5. deal object
       │
┌──────▼────────────────────────────────────────┐
│   Deal Service (Go)                           │
│                                               │
│   tax_client.CalculateTax(dealId)             │
│   ↓                                           │
│   HTTP POST → gateway/api/tax                 │
└──────┬────────────────────────────────────────┘
       │
       │ 6. HTTP POST (tax request)
       │
┌──────▼────────────────────────────────────────┐
│   Gateway (Node.js BFF)                       │
│                                               │
│   services/taxService.ts                      │
│   ↓                                           │
│   const wasm = await loadWasm()               │
│   ↓                                           │
│   wasm.calculate_tax(JSON.stringify(input))   │
│   ↓                                           │
│   Returns: tax calculation result             │
└──────┬────────────────────────────────────────┘
       │
       │ 7. tax result (JSON)
       │
┌──────▼────────────────────────────────────────┐
│   Deal Service (Go)                           │
│                                               │
│   Updates deal with tax amount                │
│   ↓                                           │
│   repository.Update(deal)                     │
└──────┬────────────────────────────────────────┘
       │
       │ 8. Return complete deal
       │
┌──────▼────────────────────────────────────────┐
│   Gateway (Node.js BFF)                       │
│                                               │
│   Returns: { deal, tax }                      │
└──────┬────────────────────────────────────────┘
       │
       │ 9. HTTP Response (JSON)
       │
┌──────▼────────────────────────────────────────┐
│   Frontend (Next.js)                          │
│                                               │
│   React Query cache updated                   │
│   ↓                                           │
│   UI re-renders with new deal                 │
│   ↓                                           │
│   User sees success message                   │
└───────────────────────────────────────────────┘

TOTAL TIME: < 500ms
- Frontend → Gateway: 10ms
- Gateway → Deal Service: 20ms
- Deal Service → Database: 50ms
- Deal Service → Tax Engine (WASM): 1ms
- Response back: 50ms
```

---

## Type Safety Flow (OpenAPI → TypeScript)

```
┌──────────────────────────────────────────────────────────┐
│  1. Define API Contract (OpenAPI)                        │
│                                                          │
│  services/deal-engine-go/api/openapi.yaml                │
│                                                          │
│  components:                                             │
│    schemas:                                              │
│      Deal:                                               │
│        type: object                                      │
│        properties:                                       │
│          id:                                             │
│            type: string                                  │
│            format: uuid                                  │
│          customerId:                                     │
│            type: string                                  │
│          totalAmount:                                    │
│            type: number                                  │
│        required:                                         │
│          - id                                            │
│          - customerId                                    │
│          - totalAmount                                   │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ 2. Generate TypeScript types
                   │    (npm run generate-types)
                   │
┌──────────────────▼───────────────────────────────────────┐
│  shared/types/deal.ts                                    │
│                                                          │
│  export interface Deal {                                │
│    id: string;                                          │
│    customerId: string;                                  │
│    totalAmount: number;                                 │
│  }                                                       │
│                                                          │
│  export interface CreateDealRequest {                   │
│    customerId: string;                                  │
│    vehicleId: string;                                   │
│  }                                                       │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ├─────────────────┬─────────────────────┐
                   │                 │                     │
         ┌─────────▼─────┐  ┌────────▼─────┐  ┌──────────▼──────┐
         │   Frontend    │  │   Gateway    │  │   Go Service    │
         │               │  │              │  │                 │
         │  import type  │  │  import type │  │  (same schema   │
         │  { Deal }     │  │  { Deal }    │  │   via OpenAPI)  │
         │  from         │  │  from        │  │                 │
         │  '@shared/    │  │  '@shared/   │  │                 │
         │   types/deal' │  │   types/deal'│  │                 │
         │               │  │              │  │                 │
         │  ✅ Type safe │  │  ✅ Type safe│  │  ✅ Validated   │
         │     API calls │  │     routing  │  │     by OpenAPI  │
         └───────────────┘  └──────────────┘  └─────────────────┘

BENEFITS:
✅ Single source of truth (OpenAPI schema)
✅ Types auto-generated for frontend and gateway
✅ Changes to backend API immediately fail TypeScript compilation
✅ No manual type duplication
✅ IntelliSense works perfectly
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                           │
│                  (HTTPS Termination)                        │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           │                          │
┌──────────▼──────────┐    ┌──────────▼──────────┐
│  Frontend (Next.js) │    │  Frontend (Next.js) │
│    Instance 1       │    │    Instance 2       │
│  Port: 3000         │    │  Port: 3000         │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           └──────────┬───────────────┘
                      │
                      │ Calls Gateway
                      │
           ┌──────────▼───────────┐
           │  Gateway (Node.js)   │
           │  Port: 3000          │
           │                      │
           │  - Auth middleware   │
           │  - Rate limiting     │
           │  - Request logging   │
           │  - Tax Engine (WASM) │
           └──────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼───┐  ┌──────▼────┐  ┌────▼──────┐
│  Deal     │  │ Customer  │  │ Inventory │
│  Service  │  │  Service  │  │  Service  │
│   (Go)    │  │   (Go)    │  │   (Go)    │
│ Port: 3001│  │ Port: 3002│  │ Port: 3003│
└───────┬───┘  └──────┬────┘  └────┬──────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
           ┌──────────▼───────────┐
           │   PostgreSQL         │
           │   (Multi-tenant)     │
           │                      │
           │   - deals            │
           │   - customers        │
           │   - inventory        │
           │   - vehicles         │
           └──────────────────────┘

DOCKER COMPOSE (Development):

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://gateway:3000

  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      - DEAL_SERVICE_URL=http://deal-service:3001
      - CUSTOMER_SERVICE_URL=http://customer-service:3002

  deal-service:
    build: ./services/deal-engine-go
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgres://...

  customer-service:
    build: ./services/customer-service-go
    ports:
      - "3002:3002"

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│              Security Layers                    │
└─────────────────────────────────────────────────┘

1. HTTPS/TLS
   ✅ All communication encrypted
   ✅ Certificate management (Let's Encrypt)

2. Authentication (Gateway Layer)
   ┌──────────────────────────────────────┐
   │  JWT or Session-based auth           │
   │  ↓                                   │
   │  User login → JWT issued             │
   │  ↓                                   │
   │  JWT attached to all requests        │
   │  ↓                                   │
   │  Gateway validates JWT               │
   │  ↓                                   │
   │  User ID extracted from token        │
   └──────────────────────────────────────┘

3. Authorization (Service Layer)
   ┌──────────────────────────────────────┐
   │  Multi-tenant isolation              │
   │  ↓                                   │
   │  Every request includes tenantId     │
   │  ↓                                   │
   │  All DB queries filtered by tenant   │
   │  ↓                                   │
   │  Users can ONLY see their tenant data│
   └──────────────────────────────────────┘

4. Rate Limiting
   ✅ 100 requests/minute per user
   ✅ 1000 requests/minute per tenant
   ✅ DDoS protection

5. Input Validation
   ✅ Zod schemas on API boundaries
   ✅ SQL injection protection (parameterized queries)
   ✅ XSS protection (sanitized outputs)

6. Logging & Monitoring
   ✅ All requests logged (who, what, when)
   ✅ Failed auth attempts tracked
   ✅ Anomaly detection
   ✅ Audit trail for compliance

7. Secrets Management
   ❌ NO secrets in code
   ✅ Environment variables
   ✅ AWS Secrets Manager / HashiCorp Vault
```

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────┐
│          Structured Logging (Pino)              │
└─────────────────────────────────────────────────┘

Every request logged:
{
  "level": "info",
  "time": 1700000000000,
  "msg": "HTTP_REQUEST",
  "requestId": "req_abc123",
  "method": "POST",
  "url": "/api/deals",
  "userId": "user_123",
  "tenantId": "tenant_456"
}

Every business event logged:
{
  "level": "info",
  "msg": "DEAL_CREATED",
  "dealId": "deal_789",
  "customerId": "cust_012",
  "amount": 50000,
  "durationMs": 123
}

Every error logged with full context:
{
  "level": "error",
  "msg": "TAX_CALC_FAILED",
  "error": "State CA not found",
  "stack": "...",
  "dealId": "deal_789",
  "stateCode": "CA",
  "zipCode": "90210"
}

┌─────────────────────────────────────────────────┐
│          Performance Monitoring                 │
└─────────────────────────────────────────────────┘

Metrics tracked:
- API response times (p50, p95, p99)
- Tax calculation duration
- Database query performance
- Memory usage
- CPU usage
- Error rates

Alerts triggered when:
- Response time > 1s
- Error rate > 1%
- Memory usage > 80%
- Database connections exhausted

┌─────────────────────────────────────────────────┐
│          Tracing (Optional: OpenTelemetry)      │
└─────────────────────────────────────────────────┘

End-to-end request tracing:

Frontend Request ID: req_abc123
  ↓
Gateway Span: gateway_span_1 (50ms)
  ↓
Deal Service Span: deal_service_span_1 (100ms)
  ↓
Database Span: db_span_1 (40ms)
  ↓
Tax Engine Span: tax_wasm_span_1 (1ms)

Total: 191ms

Visualized in Jaeger/Zipkin
```

---

## Summary

This architecture provides:

✅ **Clear separation of concerns** - Frontend (UI), Gateway (orchestration), Services (logic)
✅ **Type safety end-to-end** - OpenAPI → TypeScript
✅ **Performance** - Rust/WASM for CPU-intensive, Go for I/O
✅ **Scalability** - Microservices can scale independently
✅ **Observability** - Structured logging, metrics, tracing
✅ **Security** - Authentication, authorization, multi-tenancy
✅ **Maintainability** - Clear boundaries, single responsibility

**Next:** Read the full implementation plan in `CLEAN_REBUILD_FOUNDATION_PLAN.md`
