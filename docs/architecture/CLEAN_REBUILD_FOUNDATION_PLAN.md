# Autolytiq Clean Rebuild - Foundation & Migration Plan

**Branch:** `feat/unbreakable-architecture`
**Created:** 2025-11-23
**Status:** AWAITING APPROVAL - DO NOT EXECUTE WITHOUT USER CONFIRMATION

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Target Architecture](#target-architecture)
3. [Complete Directory Structure](#complete-directory-structure)
4. [Foundation Setup - Phase 1](#foundation-setup---phase-1)
5. [Tax Engine Migration - Phase 2](#tax-engine-migration---phase-2)
6. [Backend Services - Phase 3](#backend-services---phase-3)
7. [Frontend Migration - Phase 4](#frontend-migration---phase-4)
8. [Integration & Testing - Phase 5](#integration--testing---phase-5)
9. [Critical Decisions Required](#critical-decisions-required)
10. [Execution Timeline](#execution-timeline)
11. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### Current State Analysis

**Existing Codebase:**
- Monolithic Express + React application
- ~408 TypeScript files with mixed concerns
- Business logic scattered across frontend and backend
- **Valuable tax engine logic** in TypeScript (must preserve calculations)
- 184 React components with UI/logic coupling
- Some quality gates in place (ESLint, TypeScript, tests)

**Critical Assets to Preserve:**
1. **Tax calculation logic** (`server/services/tax-engine-service.ts`, `client/src/lib/tax-calculator.ts`)
2. **Tax data and state rules** (`shared/tax-data.ts`, `shared/autoTaxEngine/`)
3. **Domain models and schemas** (`shared/schema.ts`)
4. **184 integration tests** (valuable test coverage)

### Vision: Clean Rebuild with Proper Architecture

**Goals:**
1. **Strict separation of concerns:** UI (Next.js) → Gateway (Node) → Services (Go/Rust)
2. **Preserve tax engine logic:** Migrate TypeScript → Rust/WASM (logic stays identical)
3. **All guardrails from day 1:** Linting, testing, logging, observability
4. **Type-safe contracts:** OpenAPI/Protobuf → generated types
5. **Incremental migration:** No big-bang rewrites, gradual cutover

### Why This Approach?

- **Stability:** Existing code continues working while we migrate
- **Safety:** Tests validate behavior is preserved
- **Quality:** Guardrails prevent new technical debt
- **Performance:** Rust/WASM for CPU-intensive tax calculations
- **Scalability:** Go microservices for business logic
- **Maintainability:** Clear boundaries, single responsibility

---

## Target Architecture

```
autolytiq-clean/
│
├── frontend/                     # Next.js 14+ App Router - PURE UI LAYER
│   ├── src/
│   │   ├── app/                 # Next.js routes + layouts
│   │   │   ├── (auth)/          # Auth routes
│   │   │   ├── (dashboard)/     # Main app routes
│   │   │   ├── api/             # API routes (calls gateway)
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── page.tsx         # Homepage
│   │   │
│   │   ├── modules/             # Feature modules (UI only)
│   │   │   ├── deals/
│   │   │   │   ├── components/  # DealCard, DealWorkspace, etc.
│   │   │   │   ├── hooks/       # useDeal, useDealQuery, etc.
│   │   │   │   ├── types/       # Generated from contracts
│   │   │   │   └── index.ts     # Public API
│   │   │   │
│   │   │   ├── customers/
│   │   │   ├── inventory/
│   │   │   ├── tax/
│   │   │   └── email/
│   │   │
│   │   └── core/                # Cross-cutting concerns
│   │       ├── config/          # Environment config
│   │       ├── http/            # API client, fetch utils
│   │       ├── logger/          # Browser logging (pino-pretty)
│   │       ├── types/           # Shared UI types
│   │       └── ui/              # Radix components, design system
│   │
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json            # Strict mode
│   ├── .eslintrc.json           # Architectural rules
│   ├── .prettierrc.json
│   ├── vitest.config.ts         # Component tests
│   └── README.md
│
├── services/                     # Backend services - ALL BUSINESS LOGIC
│   │
│   ├── tax-engine-rs/           # Rust → WASM tax calculation service
│   │   ├── Cargo.toml
│   │   ├── Cargo.lock
│   │   │
│   │   ├── src/
│   │   │   ├── lib.rs           # WASM exports
│   │   │   ├── calculator.rs    # Core tax calculations
│   │   │   ├── models.rs        # Tax domain models
│   │   │   ├── state_rules.rs   # State-specific rules
│   │   │   ├── local_rates.rs   # Local tax rate lookups
│   │   │   └── utils.rs         # Helper functions
│   │   │
│   │   ├── tests/
│   │   │   ├── integration/     # Integration tests
│   │   │   └── unit/            # Unit tests per module
│   │   │
│   │   ├── benches/             # Performance benchmarks
│   │   ├── build.sh             # Build to WASM
│   │   └── README.md
│   │
│   ├── deal-engine-go/          # Go - Deal/pricing service
│   │   ├── go.mod
│   │   ├── go.sum
│   │   │
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go      # Entry point
│   │   │
│   │   ├── internal/
│   │   │   ├── domain/          # Business logic
│   │   │   │   ├── deal.go
│   │   │   │   ├── pricing.go
│   │   │   │   └── scenario.go
│   │   │   │
│   │   │   ├── handlers/        # HTTP handlers
│   │   │   ├── repository/      # Database layer
│   │   │   └── service/         # Application services
│   │   │
│   │   ├── pkg/                 # Public libraries
│   │   │   ├── logger/
│   │   │   ├── config/
│   │   │   └── middleware/
│   │   │
│   │   ├── api/                 # API contracts
│   │   │   └── openapi.yaml
│   │   │
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── customer-service-go/     # Go - Customer service
│   │   └── [same structure as deal-engine-go]
│   │
│   └── inventory-service-go/    # Go - Inventory service
│       └── [same structure as deal-engine-go]
│
├── gateway/                      # Node.js BFF (Backend for Frontend)
│   ├── src/
│   │   ├── routes/              # REST endpoints
│   │   │   ├── deals.ts
│   │   │   ├── customers.ts
│   │   │   ├── inventory.ts
│   │   │   └── tax.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── requestLogger.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimit.ts
│   │   │
│   │   ├── services/            # Service clients
│   │   │   ├── dealService.ts   # Calls deal-engine-go
│   │   │   ├── taxService.ts    # Calls tax-engine-rs WASM
│   │   │   └── customerService.ts
│   │   │
│   │   ├── types/               # Generated from OpenAPI
│   │   ├── config/
│   │   ├── logger/              # Pino structured logging
│   │   └── index.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   └── README.md
│
├── shared/                       # Shared contracts and types
│   ├── contracts/
│   │   ├── openapi/             # OpenAPI specs
│   │   │   ├── deal.yaml
│   │   │   ├── customer.yaml
│   │   │   ├── inventory.yaml
│   │   │   └── tax.yaml
│   │   │
│   │   └── protobuf/            # gRPC contracts (optional)
│   │       ├── deal.proto
│   │       └── customer.proto
│   │
│   ├── types/                   # Generated TypeScript types
│   │   ├── deal.ts              # Generated from deal.yaml
│   │   ├── customer.ts
│   │   └── index.ts
│   │
│   └── scripts/
│       └── generate-types.sh    # OpenAPI → TypeScript codegen
│
├── infrastructure/               # Docker, K8s, CI/CD
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── Dockerfile.*
│   │
│   ├── k8s/                     # Kubernetes manifests
│   │   ├── frontend.yaml
│   │   ├── gateway.yaml
│   │   └── services/
│   │
│   └── ci/                      # GitHub Actions
│       ├── test.yml
│       ├── build.yml
│       └── deploy.yml
│
├── scripts/                      # Automation scripts
│   ├── setup-frontend.sh
│   ├── setup-rust.sh
│   ├── setup-go-service.sh
│   ├── generate-types.sh
│   ├── validate-all.sh
│   └── migrate-component.sh     # Helper for migration
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── LOGGING_STANDARDS.md
│   ├── MIGRATION_GUIDE.md
│   └── TROUBLESHOOTING.md
│
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── workflows/
│       ├── ci.yml
│       ├── test-coverage.yml
│       └── enforce-quality.yml
│
├── package.json                  # Root workspace
├── .gitignore
├── .prettierrc.json
├── .nvmrc
├── turbo.json                    # Turborepo for monorepo (optional)
├── ARCHITECTURE_RULES.md         # ✅ Already exists
├── AGENT_WORKFLOW_GUIDE.md       # ✅ Already exists
└── README.md
```

---

## Complete Directory Structure

### Detailed File Breakdown

#### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── deals/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx          # Deal workspace
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx          # New deal
│   │   │   │   └── page.tsx              # Deals list
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── inventory/
│   │   │   ├── email/
│   │   │   ├── reports/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── route.ts
│   │   │   ├── deals/
│   │   │   │   └── route.ts              # Proxies to gateway
│   │   │   └── tax/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                     # Root layout
│   │   ├── page.tsx                       # Homepage
│   │   ├── error.tsx                      # Error boundary
│   │   └── loading.tsx                    # Loading state
│   │
│   ├── modules/
│   │   ├── deals/
│   │   │   ├── components/
│   │   │   │   ├── DealCard.tsx
│   │   │   │   ├── DealWorkspace.tsx
│   │   │   │   ├── DealSidebar.tsx
│   │   │   │   ├── PricingPanel.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useDeal.ts
│   │   │   │   ├── useDealQuery.ts
│   │   │   │   ├── useDealMutation.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── index.ts               # Re-export from shared
│   │   │   │   └── ui.ts                  # UI-specific types
│   │   │   │
│   │   │   └── index.ts                   # Module public API
│   │   │
│   │   ├── customers/
│   │   │   └── [same structure]
│   │   │
│   │   ├── inventory/
│   │   ├── tax/
│   │   └── email/
│   │
│   └── core/
│       ├── config/
│       │   ├── env.ts                     # Environment variables
│       │   └── index.ts
│       │
│       ├── http/
│       │   ├── client.ts                  # Fetch wrapper
│       │   ├── queryClient.ts             # React Query config
│       │   └── index.ts
│       │
│       ├── logger/
│       │   ├── logger.ts                  # Browser logger
│       │   └── index.ts
│       │
│       ├── types/
│       │   ├── common.ts
│       │   └── index.ts
│       │
│       └── ui/
│           ├── components/                # Radix primitives
│           │   ├── button.tsx
│           │   ├── input.tsx
│           │   ├── dialog.tsx
│           │   └── [... 50+ components]
│           │
│           ├── design-tokens/
│           │   ├── colors.ts
│           │   ├── spacing.ts
│           │   └── typography.ts
│           │
│           └── index.ts
│
├── public/
│   ├── favicon.ico
│   └── images/
│
├── package.json
├── next.config.js
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc.json
├── postcss.config.js
├── tailwind.config.js
├── vitest.config.ts
└── README.md
```

#### Tax Engine Rust (`services/tax-engine-rs/`)

```
tax-engine-rs/
├── Cargo.toml
├── Cargo.lock
│
├── src/
│   ├── lib.rs                             # WASM exports + module declarations
│   │
│   ├── models/
│   │   ├── mod.rs
│   │   ├── address.rs
│   │   ├── tax_profile.rs
│   │   ├── tax_method.rs
│   │   └── jurisdiction.rs
│   │
│   ├── calculator/
│   │   ├── mod.rs
│   │   ├── retail.rs                      # Retail deal tax calculations
│   │   ├── lease.rs                       # Lease deal tax calculations
│   │   ├── trade_in.rs                    # Trade-in credit logic
│   │   └── luxury.rs                      # Luxury tax calculations
│   │
│   ├── state_rules/
│   │   ├── mod.rs
│   │   ├── loader.rs                      # Load state rules from JSON
│   │   ├── ca.rs                          # California-specific logic
│   │   ├── tx.rs                          # Texas-specific logic
│   │   ├── ga.rs                          # Georgia TAVT
│   │   └── [... 50 states]
│   │
│   ├── local_rates/
│   │   ├── mod.rs
│   │   ├── lookup.rs                      # ZIP code → rate lookup
│   │   └── cache.rs                       # In-memory caching
│   │
│   ├── utils/
│   │   ├── mod.rs
│   │   ├── decimal.rs                     # High-precision math
│   │   └── validation.rs                  # Input validation
│   │
│   └── wasm/
│       ├── mod.rs
│       └── bindings.rs                    # JS/TS bindings
│
├── tests/
│   ├── integration/
│   │   ├── test_ca_retail.rs
│   │   ├── test_tx_lease.rs
│   │   └── test_ga_tavt.rs
│   │
│   └── unit/
│       ├── test_calculator.rs
│       ├── test_trade_in.rs
│       └── test_local_rates.rs
│
├── benches/
│   └── tax_calculation.rs                 # Performance benchmarks
│
├── data/
│   ├── state_rules.json                   # Migrated from autoTaxEngine
│   └── local_rates.json                   # Local tax rate database
│
├── build.sh                               # Build to WASM
├── test.sh                                # Run all tests
├── .rustfmt.toml
└── README.md
```

#### Deal Service Go (`services/deal-engine-go/`)

```
deal-engine-go/
├── go.mod
├── go.sum
│
├── cmd/
│   └── server/
│       └── main.go                        # Application entry point
│
├── internal/
│   ├── domain/
│   │   ├── deal.go                        # Deal entity + business logic
│   │   ├── scenario.go                    # Scenario entity
│   │   ├── pricing.go                     # Pricing calculations
│   │   └── validation.go                  # Domain validation
│   │
│   ├── handlers/
│   │   ├── deals.go                       # HTTP handlers
│   │   ├── scenarios.go
│   │   └── middleware.go
│   │
│   ├── repository/
│   │   ├── deal_repo.go                   # Database layer
│   │   ├── scenario_repo.go
│   │   └── postgres.go                    # PostgreSQL connection
│   │
│   └── service/
│       ├── deal_service.go                # Application services
│       ├── pricing_service.go
│       └── tax_client.go                  # Calls tax-engine-rs WASM
│
├── pkg/
│   ├── logger/
│   │   └── logger.go                      # Structured logging (zerolog)
│   │
│   ├── config/
│   │   └── config.go                      # Environment config
│   │
│   └── middleware/
│       ├── auth.go
│       ├── logging.go
│       └── recovery.go
│
├── api/
│   └── openapi.yaml                       # OpenAPI 3.0 spec
│
├── tests/
│   ├── integration/
│   │   └── deal_test.go
│   │
│   └── unit/
│       ├── domain_test.go
│       └── pricing_test.go
│
├── migrations/
│   └── [database migrations]
│
├── Dockerfile
├── Makefile
└── README.md
```

#### Gateway (`gateway/`)

```
gateway/
├── src/
│   ├── routes/
│   │   ├── deals.ts                       # Deal endpoints
│   │   ├── customers.ts                   # Customer endpoints
│   │   ├── inventory.ts                   # Inventory endpoints
│   │   ├── tax.ts                         # Tax endpoints
│   │   └── index.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts                        # JWT/session auth
│   │   ├── requestLogger.ts               # Pino request logging
│   │   ├── errorHandler.ts                # Centralized error handling
│   │   ├── rateLimit.ts                   # Rate limiting
│   │   ├── cors.ts
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── dealService.ts                 # Client for deal-engine-go
│   │   ├── customerService.ts             # Client for customer-service-go
│   │   ├── inventoryService.ts            # Client for inventory-service-go
│   │   ├── taxService.ts                  # WASM tax-engine-rs wrapper
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── index.ts                       # Generated from OpenAPI
│   │   ├── request.ts
│   │   └── response.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── index.ts
│   │
│   ├── logger/
│   │   ├── logger.ts                      # Pino logger
│   │   └── index.ts
│   │
│   └── index.ts                           # Express app setup
│
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

---

## Foundation Setup - Phase 1

### Duration: 3-4 days

### 1.1 Directory Structure Creation

**Create all directories:**

```bash
# Script: scripts/setup-directory-structure.sh

mkdir -p frontend/src/{app,modules,core}
mkdir -p frontend/src/app/{auth,dashboard,api}
mkdir -p frontend/src/modules/{deals,customers,inventory,tax,email}
mkdir -p frontend/src/core/{config,http,logger,types,ui}
mkdir -p frontend/public

mkdir -p services/tax-engine-rs/src/{models,calculator,state_rules,local_rates,utils,wasm}
mkdir -p services/tax-engine-rs/{tests,benches,data}
mkdir -p services/deal-engine-go/{cmd/server,internal,pkg,api,tests,migrations}
mkdir -p services/customer-service-go/{cmd/server,internal,pkg,api,tests,migrations}
mkdir -p services/inventory-service-go/{cmd/server,internal,pkg,api,tests,migrations}

mkdir -p gateway/src/{routes,middleware,services,types,config,logger}

mkdir -p shared/{contracts/openapi,types,scripts}
mkdir -p infrastructure/{docker,k8s,ci}
mkdir -p scripts
mkdir -p docs

mkdir -p .github/workflows
```

### 1.2 Package Configuration

#### Root `package.json` (Workspace)

```json
{
  "name": "autolytiq-clean",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "gateway"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=frontend & npm run dev --workspace=gateway",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "validate": "npm run lint && npm run typecheck && npm run test",
    "generate-types": "bash shared/scripts/generate-types.sh"
  },
  "devDependencies": {
    "prettier": "^3.1.0",
    "turbo": "^1.11.0"
  }
}
```

#### Frontend `package.json`

```json
{
  "name": "@autolytiq/frontend",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.60.5",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.2",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^3.10.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.453.0",
    "pino": "^9.5.0",
    "pino-pretty": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.16.11",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.6.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "vitest": "^4.0.8",
    "@vitejs/plugin-react": "^4.7.0",
    "@vitest/ui": "^4.0.8"
  }
}
```

#### Gateway `package.json`

```json
{
  "name": "@autolytiq/gateway",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.21.2",
    "pino": "^9.5.0",
    "pino-http": "^10.0.0",
    "pino-pretty": "^13.0.0",
    "helmet": "^8.1.0",
    "express-rate-limit": "^8.2.1",
    "dotenv": "^17.2.3",
    "zod": "^3.24.2",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.16.11",
    "typescript": "^5.6.3",
    "tsx": "^4.20.5",
    "esbuild": "^0.25.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "vitest": "^4.0.8"
  }
}
```

### 1.3 TypeScript Configuration

#### Frontend `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@modules/*": ["./src/modules/*"],
      "@core/*": ["./src/core/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### Gateway `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 ESLint Configuration

#### Frontend `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",

    // Architectural rules
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../**/modules/*"],
            "message": "Cross-module imports forbidden. Use module public API."
          },
          {
            "group": ["**/gateway/**", "**/services/**"],
            "message": "Frontend cannot import from backend."
          }
        ]
      }
    ]
  }
}
```

#### Gateway `.eslintrc.json`

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["error", { "allow": ["error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 1.5 Prettier Configuration

#### Root `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 1.6 Git Hooks (Husky)

```bash
# Already exists, ensure it runs for new structure
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

### 1.7 GitHub Actions CI/CD

#### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [feat/unbreakable-architecture, main]
  pull_request:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

  rust-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown

      - name: Run Rust tests
        run: cd services/tax-engine-rs && cargo test

      - name: Build WASM
        run: cd services/tax-engine-rs && ./build.sh

  go-tests:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        service: [deal-engine-go, customer-service-go, inventory-service-go]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests
        run: cd services/${{ matrix.service }} && go test ./...
```

### 1.8 Logging Infrastructure

#### Gateway `src/logger/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: {
    service: 'gateway',
    env: process.env.NODE_ENV || 'development',
  },
});

export function createRequestLogger() {
  return require('pino-http')({
    logger,
    autoLogging: {
      ignore: (req: any) => req.url === '/health',
    },
  });
}
```

#### Frontend `src/core/logger/logger.ts`

```typescript
import pino from 'pino';

const isServer = typeof window === 'undefined';

export const logger = pino({
  level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  browser: {
    asObject: true,
  },
  transport: isServer
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  base: {
    service: 'frontend',
    env: process.env.NODE_ENV || 'development',
  },
});
```

---

## Tax Engine Migration - Phase 2

### Duration: 5-7 days

### 2.1 Analysis of Existing Tax Logic

**Files to migrate:**
1. `/server/services/tax-engine-service.ts` (285 lines) - Main tax calculation
2. `/client/src/lib/tax-calculator.ts` (563 lines) - Client-side tax calculations
3. `/shared/types/tax-engine.ts` (144 lines) - Type definitions
4. `/shared/tax-data.ts` - State tax data
5. `/shared/autoTaxEngine/` - State-specific rules

**Key algorithms to preserve:**
- Trade-in credit calculation (different methods per state)
- Local tax rate lookup (ZIP code → rate)
- Luxury tax calculation
- Lease vs retail tax method determination
- Taxable amount computation (with dealer fees, aftermarket products)
- State-specific rules (TAVT for GA, HUT for NC, etc.)

### 2.2 Rust Project Setup

#### `services/tax-engine-rs/Cargo.toml`

```toml
[package]
name = "tax-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rust_decimal = "1.36"
rust_decimal_macros = "1.36"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = 3
lto = true
```

#### Build Script `services/tax-engine-rs/build.sh`

```bash
#!/bin/bash
set -e

echo "Building tax-engine to WASM..."

# Install wasm-pack if not present
if ! command -v wasm-pack &> /dev/null; then
    cargo install wasm-pack
fi

# Build for web
wasm-pack build --target web --out-dir ../../gateway/src/wasm/tax-engine

# Build for Node.js
wasm-pack build --target nodejs --out-dir ../../gateway/src/wasm/tax-engine-node

echo "WASM build complete!"
```

### 2.3 Core Data Structures (Rust)

#### `services/tax-engine-rs/src/models/mod.rs`

```rust
use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;

pub mod address;
pub mod tax_profile;
pub mod tax_method;
pub mod jurisdiction;

pub use address::*;
pub use tax_profile::*;
pub use tax_method::*;
pub use jurisdiction::*;
```

#### `services/tax-engine-rs/src/models/address.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerAddress {
    pub line1: String,
    pub line2: Option<String>,
    pub city: String,
    pub state: String,
    pub state_code: String,
    pub postal_code: String,
    pub country: String,
    pub county: Option<String>,
    pub county_fips: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub place_id: Option<String>,
    pub validated_at: Option<String>,
    pub validation_source: Option<String>,
}
```

#### `services/tax-engine-rs/src/models/tax_method.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaxMethod {
    #[serde(rename = "TAX_ON_PRICE")]
    TaxOnPrice,

    #[serde(rename = "TAX_ON_PAYMENT")]
    TaxOnPayment,

    #[serde(rename = "TAX_ON_CAP_COST")]
    TaxOnCapCost,

    #[serde(rename = "TAX_ON_CAP_REDUCTION")]
    TaxOnCapReduction,

    #[serde(rename = "SPECIAL_TAVT")]
    SpecialTavt,

    #[serde(rename = "SPECIAL_HUT")]
    SpecialHut,

    #[serde(rename = "SPECIAL_PRIVILEGE")]
    SpecialPrivilege,
}
```

### 2.4 Tax Calculation Logic (Rust)

#### `services/tax-engine-rs/src/calculator/retail.rs`

```rust
use rust_decimal::Decimal;
use crate::models::*;

pub struct RetailTaxCalculator;

impl RetailTaxCalculator {
    /// Calculate tax for a retail deal
    pub fn calculate(
        vehicle_price: Decimal,
        trade_allowance: Decimal,
        trade_payoff: Decimal,
        dealer_fees: Decimal,
        aftermarket_products: Decimal,
        state_rate: Decimal,
        local_rate: Decimal,
        trade_in_reduces_base: bool,
        doc_fee_taxable: bool,
    ) -> Decimal {
        let mut taxable_amount = vehicle_price;

        // Apply trade-in credit if state allows
        if trade_in_reduces_base {
            let trade_equity = trade_allowance - trade_payoff;
            if trade_equity > Decimal::ZERO {
                taxable_amount -= trade_equity.min(vehicle_price);
            }
        }

        // Add taxable fees
        if doc_fee_taxable {
            taxable_amount += dealer_fees;
        }

        // Add aftermarket products (assumed taxable)
        taxable_amount += aftermarket_products;

        // Calculate total tax
        let combined_rate = state_rate + local_rate;
        taxable_amount * combined_rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_basic_retail_tax() {
        let tax = RetailTaxCalculator::calculate(
            dec!(50000.00),  // vehicle price
            dec!(0),         // trade allowance
            dec!(0),         // trade payoff
            dec!(500.00),    // dealer fees
            dec!(0),         // aftermarket
            dec!(0.0725),    // state rate (CA)
            dec!(0.01),      // local rate
            false,           // trade in reduces base
            true,            // doc fee taxable
        );

        // (50000 + 500) * 0.0825 = 4166.25
        assert_eq!(tax, dec!(4166.25));
    }

    #[test]
    fn test_trade_in_credit() {
        let tax = RetailTaxCalculator::calculate(
            dec!(50000.00),  // vehicle price
            dec!(15000.00),  // trade allowance
            dec!(5000.00),   // trade payoff
            dec!(0),         // dealer fees
            dec!(0),         // aftermarket
            dec!(0.0725),    // state rate
            dec!(0.01),      // local rate
            true,            // trade in reduces base
            false,           // doc fee taxable
        );

        // Trade equity: 15000 - 5000 = 10000
        // Taxable: 50000 - 10000 = 40000
        // Tax: 40000 * 0.0825 = 3300
        assert_eq!(tax, dec!(3300.00));
    }
}
```

### 2.5 WASM Bindings

#### `services/tax-engine-rs/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

mod models;
mod calculator;
mod state_rules;
mod local_rates;
mod utils;

use models::*;
use calculator::*;

#[derive(Deserialize)]
pub struct TaxQuoteInput {
    pub customer_id: String,
    pub deal_type: String,
    pub vehicle_price: f64,
    pub trade_allowance: Option<f64>,
    pub trade_payoff: Option<f64>,
    pub dealer_fees: Option<f64>,
    pub state_code: String,
    pub zip_code: Option<String>,
}

#[derive(Serialize)]
pub struct TaxQuoteResponse {
    pub tax_amount: f64,
    pub tax_rate: f64,
    pub taxable_amount: f64,
    pub state_tax: f64,
    pub local_tax: f64,
    pub method: String,
}

#[wasm_bindgen]
pub fn calculate_tax(input_json: &str) -> Result<String, JsValue> {
    let input: TaxQuoteInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Load state rules
    let state_rules = state_rules::load_state_rules(&input.state_code)
        .map_err(|e| JsValue::from_str(&e))?;

    // Get local tax rate
    let local_rate = if let Some(zip) = &input.zip_code {
        local_rates::lookup_rate(zip).unwrap_or(0.0)
    } else {
        0.0
    };

    // Calculate tax based on deal type
    let result = if input.deal_type == "RETAIL" {
        let tax_amount = retail::RetailTaxCalculator::calculate(
            input.vehicle_price.into(),
            input.trade_allowance.unwrap_or(0.0).into(),
            input.trade_payoff.unwrap_or(0.0).into(),
            input.dealer_fees.unwrap_or(0.0).into(),
            0.0.into(), // aftermarket (add later)
            state_rules.base_rate.into(),
            local_rate.into(),
            state_rules.trade_in_reduces_base,
            state_rules.doc_fee_taxable,
        );

        TaxQuoteResponse {
            tax_amount: tax_amount.try_into().unwrap(),
            tax_rate: (state_rules.base_rate + local_rate),
            taxable_amount: input.vehicle_price,
            state_tax: (input.vehicle_price * state_rules.base_rate),
            local_tax: (input.vehicle_price * local_rate),
            method: "TAX_ON_PRICE".to_string(),
        }
    } else {
        // Lease calculation (implement later)
        todo!("Lease calculation not yet implemented")
    };

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_tax() {
        let input = r#"{
            "customer_id": "cust_123",
            "deal_type": "RETAIL",
            "vehicle_price": 50000.0,
            "state_code": "CA",
            "zip_code": "90210"
        }"#;

        let result = calculate_tax(input).unwrap();
        let response: TaxQuoteResponse = serde_json::from_str(&result).unwrap();

        assert!(response.tax_amount > 0.0);
    }
}
```

### 2.6 Integration with Gateway

#### `gateway/src/services/taxService.ts`

```typescript
import { logger } from '../logger';

// Import WASM module
let wasmModule: any;

async function loadWasmModule() {
  if (!wasmModule) {
    // @ts-ignore
    const wasm = await import('../wasm/tax-engine-node');
    wasmModule = wasm;
  }
  return wasmModule;
}

export interface TaxQuoteInput {
  customerId: string;
  dealType: 'RETAIL' | 'LEASE';
  vehiclePrice: number;
  tradeAllowance?: number;
  tradePayoff?: number;
  dealerFees?: number;
  stateCode: string;
  zipCode?: string;
}

export interface TaxQuoteResponse {
  taxAmount: number;
  taxRate: number;
  taxableAmount: number;
  stateTax: number;
  localTax: number;
  method: string;
}

export async function calculateTax(input: TaxQuoteInput): Promise<TaxQuoteResponse> {
  const startTime = Date.now();

  try {
    const wasm = await loadWasmModule();

    logger.info({
      msg: 'TAX_CALC_STARTED',
      customerId: input.customerId,
      stateCode: input.stateCode,
      zipCode: input.zipCode,
    });

    const inputJson = JSON.stringify({
      customer_id: input.customerId,
      deal_type: input.dealType,
      vehicle_price: input.vehiclePrice,
      trade_allowance: input.tradeAllowance,
      trade_payoff: input.tradePayoff,
      dealer_fees: input.dealerFees,
      state_code: input.stateCode,
      zip_code: input.zipCode,
    });

    const resultJson = wasm.calculate_tax(inputJson);
    const result: TaxQuoteResponse = JSON.parse(resultJson);

    const duration = Date.now() - startTime;

    logger.info({
      msg: 'TAX_CALC_SUCCESS',
      customerId: input.customerId,
      taxAmount: result.taxAmount,
      durationMs: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      msg: 'TAX_CALC_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      customerId: input.customerId,
      stateCode: input.stateCode,
      durationMs: duration,
    });

    throw error;
  }
}
```

### 2.7 Migration Validation Tests

Create integration tests that compare old TypeScript implementation with new Rust/WASM:

#### `services/tax-engine-rs/tests/integration/test_migration_parity.rs`

```rust
#[cfg(test)]
mod migration_parity_tests {
    use tax_engine::*;
    use serde_json::json;

    // Test cases from existing TypeScript tests
    const TEST_CASES: &[(&str, f64, f64)] = &[
        ("CA", 50000.0, 3625.0),  // CA: 7.25% base
        ("TX", 40000.0, 2500.0),  // TX: 6.25% base
        ("FL", 30000.0, 1800.0),  // FL: 6% base
        // Add 50+ test cases covering all states
    ];

    #[test]
    fn test_all_states_match_typescript() {
        for (state, price, expected_tax) in TEST_CASES {
            let input = json!({
                "customer_id": "test",
                "deal_type": "RETAIL",
                "vehicle_price": price,
                "state_code": state,
            });

            let result_json = calculate_tax(&input.to_string()).unwrap();
            let result: serde_json::Value = serde_json::from_str(&result_json).unwrap();

            let tax_amount = result["tax_amount"].as_f64().unwrap();

            assert!(
                (tax_amount - expected_tax).abs() < 0.01,
                "State {} mismatch: expected {}, got {}",
                state,
                expected_tax,
                tax_amount
            );
        }
    }
}
```

---

## Backend Services - Phase 3

### Duration: 6-8 days

### 3.1 Go Service Template

#### `services/deal-engine-go/cmd/server/main.go`

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "deal-engine/internal/handlers"
    "deal-engine/pkg/config"
    "deal-engine/pkg/logger"
    "deal-engine/pkg/middleware"
)

func main() {
    // Load configuration
    cfg := config.Load()

    // Initialize logger
    logger.Init(cfg.LogLevel)

    // Setup router
    mux := http.NewServeMux()

    // Health check
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    // API routes
    dealHandler := handlers.NewDealHandler()
    mux.HandleFunc("POST /api/deals", dealHandler.Create)
    mux.HandleFunc("GET /api/deals/{id}", dealHandler.Get)
    mux.HandleFunc("PUT /api/deals/{id}", dealHandler.Update)
    mux.HandleFunc("DELETE /api/deals/{id}", dealHandler.Delete)

    // Wrap with middleware
    handler := middleware.Chain(
        mux,
        middleware.RequestLogger,
        middleware.Recovery,
        middleware.CORS,
    )

    // Create server
    server := &http.Server{
        Addr:         fmt.Sprintf(":%d", cfg.Port),
        Handler:      handler,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server
    go func() {
        logger.Info("Starting deal-engine-go", "port", cfg.Port)
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Fatal("Server failed", "error", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logger.Info("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        logger.Fatal("Server forced to shutdown", "error", err)
    }

    logger.Info("Server exited")
}
```

#### `services/deal-engine-go/pkg/logger/logger.go`

```go
package logger

import (
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func Init(level string) {
    zerolog.TimeFieldFormat = time.RFC3339

    // Pretty logging for development
    if os.Getenv("ENV") == "development" {
        log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
    }

    // Set log level
    switch level {
    case "debug":
        zerolog.SetGlobalLevel(zerolog.DebugLevel)
    case "info":
        zerolog.SetGlobalLevel(zerolog.InfoLevel)
    case "warn":
        zerolog.SetGlobalLevel(zerolog.WarnLevel)
    case "error":
        zerolog.SetGlobalLevel(zerolog.ErrorLevel)
    default:
        zerolog.SetGlobalLevel(zerolog.InfoLevel)
    }
}

func Info(msg string, keysAndValues ...interface{}) {
    event := log.Info()
    addFields(event, keysAndValues)
    event.Msg(msg)
}

func Error(msg string, keysAndValues ...interface{}) {
    event := log.Error()
    addFields(event, keysAndValues)
    event.Msg(msg)
}

func Fatal(msg string, keysAndValues ...interface{}) {
    event := log.Fatal()
    addFields(event, keysAndValues)
    event.Msg(msg)
}

func addFields(event *zerolog.Event, keysAndValues []interface{}) {
    for i := 0; i < len(keysAndValues); i += 2 {
        if i+1 < len(keysAndValues) {
            key := keysAndValues[i].(string)
            value := keysAndValues[i+1]
            event.Interface(key, value)
        }
    }
}
```

### 3.2 Deal Domain Logic (Go)

#### `services/deal-engine-go/internal/domain/deal.go`

```go
package domain

import (
    "errors"
    "time"
)

type Deal struct {
    ID           string    `json:"id"`
    CustomerID   string    `json:"customerId"`
    VehicleID    string    `json:"vehicleId"`
    Status       string    `json:"status"`
    TotalAmount  float64   `json:"totalAmount"`
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
}

type DealScenario struct {
    ID            string  `json:"id"`
    DealID        string  `json:"dealId"`
    ScenarioType  string  `json:"scenarioType"`
    VehiclePrice  float64 `json:"vehiclePrice"`
    TradeAllowance float64 `json:"tradeAllowance"`
    TradePayoff   float64 `json:"tradePayoff"`
    DownPayment   float64 `json:"downPayment"`
    Term          int     `json:"term"`
}

func (d *Deal) Validate() error {
    if d.CustomerID == "" {
        return errors.New("customer_id required")
    }
    if d.VehicleID == "" {
        return errors.New("vehicle_id required")
    }
    if d.TotalAmount < 0 {
        return errors.New("total_amount must be positive")
    }
    return nil
}
```

### 3.3 OpenAPI Contract

#### `services/deal-engine-go/api/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: Deal Engine API
  version: 1.0.0
  description: Deal management and pricing service

servers:
  - url: http://localhost:3001
    description: Development server

paths:
  /api/deals:
    post:
      summary: Create a new deal
      operationId: createDeal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateDealRequest'
      responses:
        '201':
          description: Deal created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Deal'
        '400':
          description: Invalid input
        '500':
          description: Server error

  /api/deals/{id}:
    get:
      summary: Get deal by ID
      operationId: getDeal
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Deal found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Deal'
        '404':
          description: Deal not found

components:
  schemas:
    Deal:
      type: object
      properties:
        id:
          type: string
          format: uuid
        customerId:
          type: string
          format: uuid
        vehicleId:
          type: string
          format: uuid
        status:
          type: string
          enum: [draft, active, closed, cancelled]
        totalAmount:
          type: number
          format: double
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required:
        - id
        - customerId
        - vehicleId
        - status
        - totalAmount

    CreateDealRequest:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
        vehicleId:
          type: string
          format: uuid
        initialScenario:
          $ref: '#/components/schemas/DealScenario'
      required:
        - customerId
        - vehicleId

    DealScenario:
      type: object
      properties:
        scenarioType:
          type: string
          enum: [RETAIL_SALE, LEASE_DEAL, BALLOON_FINANCE]
        vehiclePrice:
          type: number
          format: double
        tradeAllowance:
          type: number
          format: double
        tradePayoff:
          type: number
          format: double
        downPayment:
          type: number
          format: double
        term:
          type: integer
```

### 3.4 Type Generation from OpenAPI

#### `shared/scripts/generate-types.sh`

```bash
#!/bin/bash
set -e

echo "Generating TypeScript types from OpenAPI specs..."

# Install openapi-typescript if not present
npm install -g openapi-typescript

# Generate types for each service
openapi-typescript services/deal-engine-go/api/openapi.yaml \
  --output shared/types/deal.ts

openapi-typescript services/customer-service-go/api/openapi.yaml \
  --output shared/types/customer.ts

openapi-typescript services/inventory-service-go/api/openapi.yaml \
  --output shared/types/inventory.ts

echo "Type generation complete!"
```

---

## Frontend Migration - Phase 4

### Duration: 8-10 days

### 4.1 Next.js Setup

#### `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  webpack: (config) => {
    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

module.exports = nextConfig;
```

### 4.2 Core HTTP Client

#### `frontend/src/core/http/client.ts`

```typescript
import { logger } from '@core/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = new URL(endpoint, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const startTime = Date.now();

  logger.info({
    msg: 'HTTP_REQUEST',
    method: fetchOptions.method || 'GET',
    url: url.toString(),
  });

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      logger.error({
        msg: 'HTTP_ERROR',
        status: response.status,
        url: url.toString(),
        error: error.message,
        durationMs: duration,
      });

      throw new ApiError(
        error.message || response.statusText,
        response.status,
        error.code
      );
    }

    const data = await response.json();

    logger.info({
      msg: 'HTTP_RESPONSE',
      status: response.status,
      url: url.toString(),
      durationMs: duration,
    });

    return data as T;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({
      msg: 'HTTP_NETWORK_ERROR',
      url: url.toString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });

    throw new ApiError(
      'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}
```

### 4.3 React Query Setup

#### `frontend/src/core/http/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import { logger } from '@core/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        logger.error({
          msg: 'QUERY_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      },
    },
    mutations: {
      onError: (error) => {
        logger.error({
          msg: 'MUTATION_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      },
    },
  },
});
```

### 4.4 Example Module: Deals

#### `frontend/src/modules/deals/hooks/useDeal.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/http/client';
import type { Deal, CreateDealRequest } from '@shared/types/deal';

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => apiClient<Deal>(`/api/deals/${dealId}`),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealRequest) =>
      apiClient<Deal>('/api/deals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDeal(dealId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Deal>) =>
      apiClient<Deal>(`/api/deals/${dealId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}
```

#### `frontend/src/modules/deals/components/DealCard.tsx`

```typescript
import { useDeal } from '../hooks/useDeal';
import { Card, CardHeader, CardTitle, CardContent } from '@core/ui/components/card';
import { Skeleton } from '@core/ui/components/skeleton';

interface DealCardProps {
  dealId: string;
}

export function DealCard({ dealId }: DealCardProps) {
  const { data: deal, isLoading, error } = useDeal(dealId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <CardContent className="pt-6">
          <p className="text-red-600">Failed to load deal</p>
        </CardContent>
      </Card>
    );
  }

  if (!deal) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal #{deal.id.slice(0, 8)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Customer</span>
            <span className="font-medium">{deal.customerId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicle</span>
            <span className="font-medium">{deal.vehicleId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-bold text-lg">
              ${deal.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.5 Component Migration Strategy

**Priority Order:**
1. Core UI components (Button, Input, Dialog) - Already exist in Radix
2. Layout components (PageHeader, PageContent)
3. Feature components (DealCard, CustomerCard, VehicleCard)
4. Complex pages (DealWorkspace, EmailInbox)

**Migration Pattern:**
```typescript
// OLD: /client/src/components/deal-card.tsx (business logic in UI)
function DealCard({ deal }) {
  const [tax, setTax] = useState(0);

  useEffect(() => {
    // BAD: Tax calculation in component
    const calculatedTax = deal.price * 0.0725;
    setTax(calculatedTax);
  }, [deal]);

  return <div>Tax: ${tax}</div>;
}

// NEW: /frontend/src/modules/deals/components/DealCard.tsx (pure UI)
function DealCard({ dealId }: DealCardProps) {
  const { data: deal } = useDeal(dealId);
  const { data: tax } = useTaxCalculation(dealId);

  return <div>Tax: ${tax?.amount || 0}</div>;
}
```

---

## Integration & Testing - Phase 5

### Duration: 4-5 days

### 5.1 End-to-End Test Setup

#### `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
```

### 5.2 Integration Tests

#### `tests/integration/deal-creation.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '@core/http/client';
import type { Deal, CreateDealRequest } from '@shared/types/deal';

describe('Deal Creation Flow', () => {
  let dealId: string;

  it('should create a new deal', async () => {
    const request: CreateDealRequest = {
      customerId: 'cust_123',
      vehicleId: 'veh_456',
      initialScenario: {
        scenarioType: 'RETAIL_SALE',
        vehiclePrice: 50000,
        tradeAllowance: 10000,
        tradePayoff: 5000,
        downPayment: 5000,
        term: 72,
      },
    };

    const deal = await apiClient<Deal>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    expect(deal).toBeDefined();
    expect(deal.id).toBeDefined();
    expect(deal.customerId).toBe(request.customerId);
    expect(deal.vehicleId).toBe(request.vehicleId);

    dealId = deal.id;
  });

  it('should calculate tax for the deal', async () => {
    const taxResult = await apiClient('/api/tax/calculate', {
      method: 'POST',
      body: JSON.stringify({
        dealId,
        stateCode: 'CA',
        zipCode: '90210',
      }),
    });

    expect(taxResult).toBeDefined();
    expect(taxResult.taxAmount).toBeGreaterThan(0);
    expect(taxResult.taxRate).toBeGreaterThan(0);
  });

  it('should retrieve the deal', async () => {
    const deal = await apiClient<Deal>(`/api/deals/${dealId}`);

    expect(deal).toBeDefined();
    expect(deal.id).toBe(dealId);
  });
});
```

### 5.3 Performance Benchmarks

#### `tests/performance/tax-calculation-benchmark.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateTax } from 'gateway/src/services/taxService';

describe('Tax Calculation Performance', () => {
  it('should calculate tax in < 100ms', async () => {
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await calculateTax({
        customerId: 'perf_test',
        dealType: 'RETAIL',
        vehiclePrice: 50000,
        stateCode: 'CA',
        zipCode: '90210',
      });
    }

    const duration = Date.now() - startTime;
    const avgDuration = duration / iterations;

    console.log(`Average tax calculation: ${avgDuration.toFixed(2)}ms`);
    expect(avgDuration).toBeLessThan(100);
  });
});
```

### 5.4 Module Boundary Validation

#### `scripts/validate-boundaries.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function validateModuleBoundaries() {
  console.log('Validating module boundaries...');

  // Check for forbidden imports
  const checks = [
    {
      pattern: 'frontend/.*gateway',
      message: 'Frontend cannot import from gateway',
    },
    {
      pattern: 'frontend/.*services',
      message: 'Frontend cannot import from backend services',
    },
    {
      pattern: 'modules/deals/.*modules/customer',
      message: 'Cross-module imports forbidden',
    },
  ];

  for (const check of checks) {
    const { stdout } = await execAsync(
      `grep -r "${check.pattern}" frontend/src --include="*.ts" --include="*.tsx" || true`
    );

    if (stdout.trim()) {
      console.error(`❌ ${check.message}`);
      console.error(stdout);
      process.exit(1);
    }
  }

  console.log('✅ All module boundaries valid');
}

validateModuleBoundaries();
```

---

## Critical Decisions Required

### Decision 1: API Contract Format

**Options:**
1. **OpenAPI 3.0** (REST)
   - ✅ Industry standard
   - ✅ Great tooling (Swagger UI, type generation)
   - ✅ Easy to understand
   - ❌ More verbose

2. **tRPC**
   - ✅ End-to-end type safety
   - ✅ No code generation needed
   - ✅ Great DX for TypeScript
   - ❌ Requires Node.js backend
   - ❌ Not language-agnostic

3. **Protobuf + gRPC**
   - ✅ High performance
   - ✅ Language-agnostic
   - ✅ Strong typing
   - ❌ Steeper learning curve
   - ❌ Requires more tooling

**Recommendation:** Start with **OpenAPI 3.0** for REST APIs. Easy to adopt, great tooling, works with Go services. Can add gRPC later for inter-service communication if needed.

### Decision 2: Database Access Pattern

**Options:**
1. **Each service has its own database** (microservices pattern)
   - ✅ True service independence
   - ✅ Scalable
   - ❌ Complex data consistency
   - ❌ More databases to manage

2. **Shared database, domain-driven access** (pragmatic monolith)
   - ✅ Simpler to start
   - ✅ ACID transactions
   - ✅ Easier to migrate incrementally
   - ❌ Tight coupling

**Recommendation:** Start with **shared database** (keep existing PostgreSQL). Each service owns specific tables. Can split databases later if needed.

### Decision 3: Deployment Strategy

**Options:**
1. **Monorepo with Turborepo** (all code in one repo)
   - ✅ Easier cross-repo changes
   - ✅ Shared tooling
   - ✅ Atomic commits
   - ❌ Large repo size

2. **Separate repos per service**
   - ✅ Clear service boundaries
   - ✅ Independent versioning
   - ❌ Harder to coordinate changes

**Recommendation:** **Monorepo** during migration, can split later if needed. Use Turborepo for build caching.

### Decision 4: Tax Engine Migration Timing

**Options:**
1. **Migrate tax engine first** (Rust/WASM before Go services)
   - ✅ Validates WASM approach
   - ✅ High-value, performance-critical
   - ✅ Standalone functionality
   - ❌ Frontend still depends on it

2. **Migrate backend services first, tax engine later**
   - ✅ Establishes Go patterns
   - ✅ More business value
   - ❌ Still using TypeScript tax logic

**Recommendation:** **Migrate tax engine first** (Phase 2). It's the most critical, performance-sensitive, and self-contained. Validates the architecture before building other services.

### Decision 5: Frontend Framework

**Options:**
1. **Next.js 14+ (App Router)**
   - ✅ Modern React framework
   - ✅ Server components
   - ✅ File-based routing
   - ✅ Great DX
   - ❌ Learning curve for App Router

2. **Keep Vite + Wouter** (current setup)
   - ✅ Familiar
   - ✅ Simpler
   - ❌ Less structure
   - ❌ No server components

**Recommendation:** **Next.js 14+**. Industry standard, better structure, server components enable new patterns. Worth the migration effort.

---

## Execution Timeline

### Week 1: Foundation
- **Days 1-2:** Directory structure, package configs, TypeScript/ESLint setup
- **Days 3-4:** Logging infrastructure, CI/CD pipelines, testing framework
- **Day 5:** Validation scripts, documentation, team training

### Week 2: Tax Engine Migration
- **Days 1-2:** Rust project setup, data structures, state rules migration
- **Days 3-4:** Tax calculation logic ported to Rust, unit tests
- **Day 5:** WASM build, gateway integration, validation tests

### Week 3: Backend Services
- **Days 1-2:** Go project templates, OpenAPI contracts, type generation
- **Days 3-4:** Deal service implementation, database layer
- **Day 5:** Customer and inventory services (basic CRUD)

### Week 4: Frontend Setup
- **Days 1-2:** Next.js setup, core HTTP client, React Query
- **Days 3-4:** UI component library migration, design tokens
- **Day 5:** First module (deals) migrated, integration tests

### Week 5: Frontend Migration
- **Days 1-5:** Migrate 20-30 components, pages, hooks (parallel work possible)

### Week 6: Integration & Testing
- **Days 1-2:** End-to-end tests, integration tests
- **Days 3-4:** Performance testing, bug fixes
- **Day 5:** Documentation, deployment prep

### Week 7: Deployment & Stabilization
- **Days 1-2:** Staging deployment, smoke tests
- **Days 3-4:** Production deployment, monitoring
- **Day 5:** Retrospective, next phase planning

**Total Duration:** 6-7 weeks with 2-3 engineers

---

## Risk Mitigation

### Risk 1: Breaking Production During Migration
**Mitigation:**
- All work on feature branch (`feat/unbreakable-architecture`)
- Old code continues running
- Incremental cutover (feature flags, A/B testing)
- Comprehensive integration tests before switching

### Risk 2: Tax Calculation Logic Errors
**Mitigation:**
- Side-by-side comparison tests (TypeScript vs Rust)
- 100% test coverage for tax calculations
- Preserve all existing tax test cases
- Manual QA for 10+ states before cutover

### Risk 3: Performance Regression
**Mitigation:**
- Benchmark before and after
- Set performance budgets (< 100ms for tax calc, < 500ms for API)
- Monitor in staging before production
- Easy rollback plan

### Risk 4: Developer Resistance
**Mitigation:**
- Clear documentation and examples
- Gradual adoption (not big-bang)
- Pair programming sessions
- Champion early wins (tax engine speed improvement)

### Risk 5: Timeline Slippage
**Mitigation:**
- Aggressive but realistic estimates
- Daily standups to track progress
- Flexible scope (core features first, nice-to-haves later)
- Checkpoint every 2-3 days for course correction

---

## Next Steps (AWAITING USER APPROVAL)

### Immediate Actions (After Approval):

1. **Review this plan thoroughly**
   - Validate architecture decisions
   - Confirm timeline is acceptable
   - Identify any missing pieces

2. **Make critical decisions**
   - API contract format (OpenAPI recommended)
   - Database strategy (shared DB recommended)
   - Deployment approach (monorepo recommended)

3. **Assign resources**
   - 2-3 engineers full-time
   - Identify tax engine expert for migration validation
   - Designate code review leads

4. **Kickoff Phase 1**
   - Run `scripts/setup-directory-structure.sh`
   - Initialize package.json files
   - Setup CI/CD pipelines
   - First commit: "feat(foundation): initialize clean rebuild architecture"

### DO NOT PROCEED UNTIL:
- [ ] User has reviewed full plan
- [ ] Critical decisions confirmed
- [ ] Resources allocated
- [ ] Timeline approved
- [ ] Risk mitigation strategies accepted

---

## Questions for User

1. **Timeline:** Is 6-7 weeks acceptable, or do you need faster/slower pace?
2. **Resources:** Can you allocate 2-3 engineers full-time?
3. **API Contracts:** OpenAPI, tRPC, or Protobuf? (Recommend OpenAPI)
4. **Database:** Shared DB or separate per service? (Recommend shared initially)
5. **Deployment:** When do you want to start deploying to staging?
6. **Tax Engine:** Are there specific tax calculation edge cases we must preserve?
7. **Testing:** What's the minimum test coverage you require before production?
8. **Monitoring:** Any specific observability tools to integrate (Datadog, New Relic, etc.)?

---

**Remember:** This is a **clean slate rebuild**, not a refactor. We're building the right architecture from day 1, then systematically migrating functionality. Quality over speed. Unbreakable architecture is the goal.
