# Getting Started with Autolytiq Desk Studio

Welcome to Autolytiq Desk Studio! This guide will help you set up your development environment and get started contributing to the project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Running Services](#running-services)
6. [Testing](#testing)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Go | 1.21+ | [go.dev](https://go.dev/dl/) |
| Rust | 1.75+ | [rustup.rs](https://rustup.rs/) |
| PostgreSQL | 16+ | [postgresql.org](https://www.postgresql.org/download/) |
| Redis | 7+ | [redis.io](https://redis.io/download/) |
| Docker | 24+ | [docker.com](https://www.docker.com/get-started/) |

### Verify Installation

```bash
# Check versions
node --version    # Should be 20.x or higher
go version        # Should be 1.21 or higher
rustc --version   # Should be 1.75 or higher
psql --version    # Should be 16.x or higher
redis-cli --version
docker --version
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd autolytiq-desk-studio
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies (includes all workspaces)
npm install

# Install Go dependencies for all services
cd services/auth-service && go mod download && cd ../..
cd services/deal-service && go mod download && cd ../..
cd services/customer-service && go mod download && cd ../..
cd services/api-gateway && go mod download && cd ../..
```

### 3. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your local settings
# At minimum, configure:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL and Redis using Docker
docker-compose up -d postgres redis

# Verify they're running
docker-compose ps
```

### 5. Initialize Database

```bash
# Run migrations
npm run db:push

# Seed development data (optional)
npm run db:seed
```

### 6. Start Development

```bash
# Terminal 1: Start frontend development server
npm run dev

# Terminal 2: Start API Gateway
cd services/api-gateway && go run .

# Terminal 3: Start Auth Service
cd services/auth-service && go run .

# Terminal 4: Start Deal Service
cd services/deal-service && go run .

# Terminal 5: Start Customer Service
cd services/customer-service && go run .
```

### 7. Verify Setup

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8080/health
- **Swagger Docs**: http://localhost:8080/swagger/

Demo credentials:
- Email: `demo@autolytiq.com`
- Password: `demo123`

---

## Project Structure

```
autolytiq-desk-studio/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (auth, theme)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Page layout components
│   │   ├── lib/            # Utilities and API client
│   │   └── pages/          # Page components
│   ├── public/             # Static assets
│   └── index.html          # Entry point
│
├── services/               # Backend microservices
│   ├── api-gateway/        # API Gateway (Go)
│   ├── auth-service/       # Authentication service (Go)
│   ├── deal-service/       # Deal management service (Go)
│   ├── customer-service/   # Customer management service (Go)
│   ├── tax-engine-rs/      # Tax calculation engine (Rust/WASM)
│   ├── pqc-engine-rs/      # Post-quantum cryptography (Rust/WASM)
│   └── shared/             # Shared Go packages
│       ├── encryption/     # PII encryption utilities
│       ├── errors/         # Standardized error handling
│       ├── logging/        # Structured logging
│       └── metrics/        # Prometheus metrics
│
├── shared/                 # Shared TypeScript code
│   ├── contracts/          # OpenAPI specifications
│   ├── schema.ts           # Database schema (Drizzle ORM)
│   └── types/              # Shared TypeScript types
│
├── tests/                  # Test suites
│   ├── e2e/                # End-to-end tests (Playwright)
│   ├── integration/        # Integration tests
│   └── helpers/            # Test utilities
│
├── docs/                   # Documentation
│   ├── ACCESSIBILITY.md    # Accessibility guidelines
│   ├── GETTING_STARTED.md  # This file
│   └── api/                # API documentation
│
└── docker-compose.yml      # Development infrastructure
```

---

## Development Workflow

### Code Style

- **TypeScript/JavaScript**: ESLint + Prettier (auto-formatted on save)
- **Go**: `gofmt` and `go vet`
- **Rust**: `rustfmt` and `clippy`

### Git Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make changes and commit with conventional commits:
   ```bash
   git commit -m "feat(scope): add new feature"
   git commit -m "fix(scope): resolve bug"
   git commit -m "docs(scope): update documentation"
   ```

3. Push and create a pull request:
   ```bash
   git push -u origin feat/your-feature-name
   ```

### Type Checking

```bash
# TypeScript type checking
npm run typecheck

# Go type checking (builds all services)
npm run build:go
```

### Linting

```bash
# Lint frontend code
npm run lint

# Lint Go code
cd services/auth-service && go vet ./...
```

---

## Running Services

### Frontend Only

```bash
npm run dev
```

Frontend runs on http://localhost:5173 with hot reload.

### Full Stack Development

Use multiple terminal windows or a process manager like `tmux`:

```bash
# All services (requires all terminals)
npm run dev              # Frontend
cd services/api-gateway && go run .     # Port 8080
cd services/auth-service && go run .    # Port 8081
cd services/deal-service && go run .    # Port 8083
cd services/customer-service && go run . # Port 8082
```

### Using Docker Compose (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Start specific services
docker-compose up postgres redis api-gateway
```

---

## Testing

### Unit Tests

```bash
# Frontend unit tests
npm run test

# Go service tests
cd services/auth-service && go test -v ./...
cd services/customer-service && go test -v ./...
cd services/deal-service && go test -v ./...
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts
```

### Test Coverage

```bash
# Frontend coverage
npm run test:coverage

# Go coverage
cd services/auth-service && go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Define the handler** in the appropriate service:
   ```go
   // services/deal-service/handlers.go
   func (s *Server) newEndpoint(w http.ResponseWriter, r *http.Request) {
       // Implementation
   }
   ```

2. **Register the route**:
   ```go
   // services/deal-service/main.go
   s.router.HandleFunc("/path", s.newEndpoint).Methods("GET")
   ```

3. **Update OpenAPI spec** in `shared/contracts/`

4. **Add frontend API call**:
   ```typescript
   // client/src/lib/api.ts
   export const newApiCall = async () => {
     return api.get('/path');
   };
   ```

### Adding a Database Migration

```bash
# Generate migration after schema changes
npm run db:generate

# Apply migrations
npm run db:push

# View database with Drizzle Studio
npm run db:studio
```

### Building WASM Modules

```bash
# Build tax engine
cd services/tax-engine-rs
wasm-pack build --target web

# Build PQC engine
cd services/pqc-engine-rs
wasm-pack build --target web
```

### Adding a New Component

1. Create component file:
   ```bash
   touch client/src/components/ui/NewComponent.tsx
   ```

2. Follow existing patterns:
   ```typescript
   import { type JSX } from 'react';
   import { cn } from '@/lib/utils';

   interface NewComponentProps {
     className?: string;
     // props
   }

   export function NewComponent({ className, ...props }: NewComponentProps): JSX.Element {
     return (
       <div className={cn('base-styles', className)}>
         {/* content */}
       </div>
     );
   }
   ```

3. Export from `client/src/components/ui/index.ts`

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Verify connection string in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/autolytiq
   ```

3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

#### Go Module Issues

```bash
# Clear module cache
go clean -modcache

# Re-download dependencies
go mod download

# Tidy dependencies
go mod tidy
```

#### Node.js Module Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### WASM Build Fails

```bash
# Ensure wasm-pack is installed
cargo install wasm-pack

# Clear Cargo cache
cargo clean

# Rebuild
wasm-pack build --target web
```

### Getting Help

- **Documentation**: Check the `/docs` folder
- **API Docs**: Visit http://localhost:8080/swagger/
- **Issues**: Create a GitHub issue with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Error messages/logs
  - Environment details

---

## Next Steps

After setup, explore these resources:

1. **[ACCESSIBILITY.md](./ACCESSIBILITY.md)** - Accessibility guidelines
2. **[API Documentation](./api/)** - OpenAPI specifications
3. **[Architecture Overview](../CLAUDE.md)** - System architecture
4. **Component Library** - Run `npm run storybook` (if available)

Happy coding!
