# Autolytiq Desk Studio

A dealership management platform built for automotive retail finance operations. Handles deal structuring, multi-state tax calculations, customer lifecycle management, and inventory tracking.

## Overview

Autolytiq serves as the operational backbone for automotive dealerships, replacing legacy DMS (Dealer Management System) workflows with a modern, multi-tenant architecture. The system emphasizes calculation accuracy—particularly for the notoriously complex domain of state-by-state vehicle taxation—while maintaining the flexibility required by diverse dealership operations.

The platform currently supports:

- **Deal Structuring**: Cash, finance (retail installment), and lease transactions with real-time payment calculations
- **Tax Calculation Engine**: All 50 states plus DC, including special schemes (GA TAVT, NC Highway Use Tax, WV Privilege Tax)
- **Customer Management**: Profiles, credit applications, address validation
- **Inventory**: VIN decoding, pricing, multi-location support
- **Operational Runbooks**: Database, deployment, incident response, scaling

## Architecture

```
Frontend (React/Vite)
        │
        ▼
API Gateway (Go) ──────► Auth Service (Go)
        │
        ├──► Deal Service (Go)
        ├──► Customer Service (Go)
        ├──► Inventory Service (Go)
        ├──► Tax Service (Go + WASM)
        │           │
        │           └──► Tax Engine (Rust → WASM)
        │                    └──► 51 jurisdiction rules
        │                    └──► Bilateral reciprocity matrix
        │                    └──► Special scheme calculators
        │
        └──► Email Service (Go)

PostgreSQL 16 (multi-tenant, row-level security)
```

The tax calculation engine warrants specific mention. Rather than maintaining brittle lookup tables, the system implements a domain-specific language for expressing tax rules, compiled to WebAssembly for portable, high-performance execution. This approach emerged from the observation that automotive tax law varies not just by rate but by fundamental structure—trade-in credit policies, rebate taxability, lease taxation methods—requiring expressive rather than tabular configuration.

## Technology

| Layer       | Stack                                                   |
| ----------- | ------------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite, TailwindCSS, React Query    |
| API Gateway | Go 1.21+, gorilla/mux, JWT                              |
| Services    | Go (CRUD), Rust (calculations), Python (planned: AI/ML) |
| Tax Engine  | Rust compiled to WebAssembly, wazero runtime            |
| Database    | PostgreSQL 16, Drizzle ORM, row-level security          |
| Caching     | Redis                                                   |

## Getting Started

Prerequisites:

- Node.js 18+
- Go 1.21+
- Rust 1.75+ (for tax engine development)
- PostgreSQL 16+
- Redis

```bash
git clone https://github.com/your-org/autolytiq-desk-studio.git
cd autolytiq-desk-studio
npm install
cp .env.example .env
npm run db:push
npm run dev
```

For backend services:

```bash
cd services/api-gateway && go run .
cd services/tax-service && go run .
```

For tax engine development:

```bash
cd services/tax-engine-rs
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## Project Structure

```
autolytiq-desk-studio/
├── client/                 # React frontend
├── services/
│   ├── api-gateway/        # Request routing, auth
│   ├── auth-service/       # Authentication
│   ├── deal-service/       # Deal CRUD
│   ├── customer-service/   # Customer management
│   ├── inventory-service/  # Vehicle inventory
│   ├── tax-service/        # Tax API (Go + WASM bridge)
│   └── tax-engine-rs/      # Tax calculation engine (Rust)
├── shared/
│   ├── autoTaxEngine/      # TypeScript tax engine (legacy)
│   └── design-system/      # UI components
├── docs/                   # Architecture, runbooks, security
└── infrastructure/         # Terraform, Kubernetes
```

## Documentation

Core documentation lives in `/docs`:

- `SERVICE_SPECIFICATIONS.md` - API contracts for all services
- `DATABASE_INFRASTRUCTURE.md` - Schema, migrations, multi-tenancy
- `GDPR_COMPLIANCE.md` - Data handling requirements
- `runbooks/` - Operational procedures (deployment, incidents, scaling)
- `features/tax/TAX_API_DOCUMENTATION.md` - Tax service API reference

The tax engine has its own documentation in `services/tax-engine-rs/README.md`, covering the DSL design and state rule configuration.

## Development

Quality gates enforced via pre-commit hooks:

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test         # Jest
cargo test           # Rust (in tax-engine-rs/)
```

Commits follow conventional format:

```
<type>(<scope>): <subject>
```

Where type is one of: feat, fix, refactor, test, docs, build, ci, perf, style, chore.

## License

MIT
