# Backend Services

This directory contains the microservices that power Autolytiq Desk Studio. The architecture separates concerns across specialized services, with a Rust-based tax engine compiled to WebAssembly for portable, high-performance calculations.

## Service Overview

```
Frontend (React)
       │
       ▼
┌─────────────────┐
│  API Gateway    │  :8080  -  Authentication, routing, tenant context
└───────┬─────────┘
        │
        ├─────────► Deal Service        :8081  -  Transaction lifecycle
        ├─────────► Customer Service    :8082  -  CRM, contacts
        ├─────────► Inventory Service   :8083  -  VIN decoding, stock
        ├─────────► Tax Service         :8087  -  WASM bridge to tax engine
        ├─────────► Email Service       :8084  -  SMTP, templates
        ├─────────► User Service        :8085  -  Authentication
        └─────────► Config Service      :8086  -  Feature flags, settings
                                 │
                                 └─────► tax-engine-rs (Rust → WASM)
                                         51-jurisdiction tax calculator
```

## Services by Language

| Service              | Language | Purpose                                              |
| -------------------- | -------- | ---------------------------------------------------- |
| `api-gateway/`       | Go       | JWT validation, request proxying, tenant isolation   |
| `deal-service/`      | Go       | Deal CRUD, financing workflows, payment calculations |
| `customer-service/`  | Go       | Customer profiles, credit applications               |
| `inventory-service/` | Go       | Vehicle inventory, VIN decoding                      |
| `tax-service/`       | Go       | REST API over the Rust WASM tax engine               |
| `email-service/`     | Go       | Transactional email, template management             |
| `auth-service/`      | Go       | User authentication, session management              |
| `tax-engine-rs/`     | Rust     | Tax calculation engine (compiled to WASM)            |

## Running Locally

### With Docker Compose (recommended)

```bash
docker-compose up
```

All services start with proper networking. The API Gateway is accessible at `http://localhost:8080`.

### Individual Service Development

Each Go service:

```bash
cd services/deal-service
go run .
```

Rust tax engine:

```bash
cd services/tax-engine-rs
cargo test                                           # Run tests
cargo build --target wasm32-unknown-unknown --release  # Build WASM
```

## Environment Variables

All services read configuration from environment variables. Common patterns:

| Variable       | Default | Description                        |
| -------------- | ------- | ---------------------------------- |
| `PORT`         | varies  | HTTP listen port                   |
| `DATABASE_URL` | —       | PostgreSQL connection string       |
| `JWT_SECRET`   | —       | Shared secret for token validation |
| `LOG_LEVEL`    | `info`  | Logging verbosity                  |

See individual service READMEs for service-specific configuration.

## Health Checks

Every service exposes `GET /health` returning:

```json
{ "status": "healthy", "service": "deal-service" }
```

## API Conventions

- All routes under `/api/v1/`
- JSON request/response bodies
- `X-Dealership-ID` header for tenant context (injected by API Gateway)
- `X-User-ID`, `X-User-Email`, `X-User-Role` headers for audit context

## License

Proprietary - Autolytiq
