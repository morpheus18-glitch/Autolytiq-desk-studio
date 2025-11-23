# AutolytiQ Desk Studio

**Enterprise automotive financing software for modern dealerships.**

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-3178C6?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green)

## Overview

AutolytiQ Desk Studio is a comprehensive financing and deal management platform purpose-built for automotive dealerships. It enables rapid deal creation, intelligent financing calculations, multi-state tax compliance, customer relationship management, and seamless email integration—all within a single, intuitive interface.

### Key Features

- **Rapid Deal Creation** - Create and price financing deals in minutes with intelligent calculation engine
- **Multi-State Tax Compliance** - Automatic local and state tax calculations with regional customization
- **Customer Management** - Complete CRM for customer profiles, credit applications, and communication history
- **Email Integration** - Native inbox sync, threading, templates, and audit logging with Resend
- **Vehicle Management** - VIN decoding, inventory tracking, and pricing history
- **Advanced Analytics** - Reporting dashboard with deal performance metrics and financial analysis
- **AI-Powered Intelligence** - WHACO Engine, Prime Engine, and Oscillator Network for deal optimization
- **Enterprise Security** - Multi-tenant isolation, PII handling compliance, SSO/2FA support

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- Redis (optional, for session management)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd autolytiq-desk-studio

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL, API keys, etc.

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000` with the frontend at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm start
```

## Tech Stack

### Frontend
- **Framework:** React 18.3 with TypeScript 5.6
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS with design tokens
- **UI Components:** Radix UI
- **Forms:** react-hook-form with Zod validation
- **State Management:** Zustand
- **Data Fetching:** TanStack React Query
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Rich Editor:** TipTap

### Backend
- **Runtime:** Node.js 20+ (ESM)
- **Framework:** Express 4.21
- **Database ORM:** Drizzle ORM 0.39
- **Database:** PostgreSQL (DigitalOcean managed)
- **Authentication:** Passport.js with session support
- **Rate Limiting:** express-rate-limit
- **Security:** Helmet for HTTP headers
- **Email:** Resend SDK 6.4+
- **PDF Generation:** Puppeteer

### Cross-Platform
- **Type Safety:** TypeScript with strict mode
- **Schema Validation:** Zod
- **API Contracts:** Shared TypeScript interfaces
- **Utilities:** Lodash, date-fns, decimal.js

## Project Structure

```
autolytiq-desk-studio/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utilities, hooks, queries
│   │   ├── styles/            # Global styles and tokens
│   │   └── index.tsx          # React entry point
│   └── vite.config.ts         # Vite configuration
│
├── server/                    # Express backend
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API routes
│   ├── auth-routes.ts         # Authentication endpoints
│   ├── auth.ts                # Auth middleware
│   ├── db.ts                  # Database configuration
│   └── storage.ts             # Persistent storage layer
│
├── src/                       # Shared modules and business logic
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   ├── deal/              # Deal creation & pricing
│   │   ├── customer/          # Customer management
│   │   ├── tax/               # Tax calculations
│   │   ├── email/             # Email integration
│   │   ├── vehicle/           # Vehicle management
│   │   └── reporting/         # Analytics and reporting
│   ├── models/                # Zod schemas (canonical domain models)
│   └── core/                  # Shared utilities and types
│
├── migrations/                # Database migrations
│   └── *.sql                  # Schema definition files
│
├── scripts/                   # Build and utility scripts
│   ├── run-migration.ts       # Database migration runner
│   ├── validate-migration.ts  # Migration validation
│   └── ci-validation.ts       # CI/CD validation
│
├── docs/                      # Comprehensive documentation
│   ├── modules/               # Module-specific guides
│   ├── architecture/          # System design docs
│   ├── security/              # Security documentation
│   ├── testing/               # Testing guides
│   ├── deployment/            # Deployment guides
│   └── PROJECT_STATUS.md      # Detailed project status
│
└── package.json               # Dependencies and scripts
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run dev:server       # Start backend only
npm run dev:client       # Start frontend only

# Type Checking & Linting
npm run typecheck        # Full TypeScript validation
npm run check            # Quick type check
npm run lint             # Run ESLint (max warnings: 0)
npm run lint:fix         # Auto-fix linting violations
npm run format           # Check code formatting
npm run format:fix       # Auto-format code

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch       # Watch mode
npm run test:ui          # Visual test runner
npm run test:coverage    # Coverage report

# Database
npm run db:push          # Push schema to database
npm run db:generate      # Generate migration files
npm run db:studio        # Open Drizzle Studio (visual DB editor)
npm run db:migrate       # Run pending migrations

# Production
npm run build            # Full build (frontend + backend)
npm run start            # Start production server

# Utilities
npm run clean            # Remove build artifacts
npm run fresh            # Clean install and build
npm run ci:validate      # Local CI validation (lint + typecheck + test + build)
```

### Code Quality Standards

This project enforces strict code quality through automated guardrails:

#### TypeScript Strict Mode
- `noImplicitAny` - All types must be explicit
- `strictNullChecks` - Null safety enforced
- `noUnusedLocals` - No dead code
- `noUnusedParameters` - Function parameters used or documented
- `noUncheckedIndexedAccess` - Safe array access

#### ESLint Architectural Rules
- **No cross-module imports** - Modules are isolated and composable
- **No circular dependencies** - Clean dependency graph
- **No `any` types** - Type safety non-negotiable
- **Max complexity: 10** - Functions must be focused
- **Max file lines: 500** - Files must be cohesive

#### Git Hooks (Husky)
Every commit automatically:
- Validates code with TypeScript
- Runs ESLint (zero warnings)
- Checks code formatting
- Runs relevant tests
- Validates commit messages

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `stabilize`, `refactor`, `test`, `docs`, `build`, `ci`

Example:
```
feat(deal): Add lease calculation engine

Implements complete lease pricing with customizable term and rate scenarios.
Supports residual value calculations per NADA guidelines.

Closes #123
```

## Documentation

Comprehensive documentation is available in `/docs/`:

### Module Documentation
- [Authentication Module](docs/modules/auth/README.md) - User management, SSO, 2FA
- [Deal Module](docs/modules/deal/README.md) - Deal creation, pricing, calculations
- [Customer Module](docs/modules/customer/README.md) - CRM, credit applications
- [Tax Module](docs/modules/tax/README.md) - Multi-state tax calculations
- [Email Module](docs/modules/email/README.md) - Inbox sync, threading, templates
- [Vehicle Module](docs/modules/vehicle/README.md) - VIN decoding, inventory
- [Reporting Module](docs/modules/reporting/README.md) - Analytics and dashboards

### Architecture & Design
- [Module Architecture](docs/architecture/MODULAR_ARCHITECTURE_IMPLEMENTATION.md)
- [Database Layer Design](docs/architecture/DATABASE_LAYER_INVENTORY.md)
- [System Workflows](docs/architecture/WORKFLOWS.md)
- [Design Guidelines](docs/guides/DESIGN_GUIDELINES.md)
- [UI Patterns](docs/guides/FRONTEND_PATTERN_GUIDE.md)

### Security & Operations
- [Security Overview](SECURITY.md)
- [Email Security](docs/security/EMAIL_SECURITY_ARCHITECTURE.md)
- [PII Handling](docs/security/SECURITY_PII_HANDLING.md)
- [Deployment Guide](docs/deployment/REPLIT_DEPLOYMENT_GUIDE.md)
- [Project Status](docs/PROJECT_STATUS.md)

### Testing & Quality
- [Testing Framework](docs/testing/TESTING_README.md)
- [Testing Checklist](docs/testing/TESTING_CHECKLIST.md)
- [Type Safety Patterns](docs/TYPE_PATTERNS.md)

## Contributing

### Before You Code

1. **Read the architecture docs** - Understand module boundaries
2. **Check the design guidelines** - Follow established patterns
3. **Review recent commits** - Match the code style
4. **Run the guardrails** - `npm run ci:validate` must pass

### Making Changes

1. **Create a feature branch** - `git checkout -b feat/your-feature`
2. **Write code with type safety** - Use strict TypeScript
3. **Follow module boundaries** - No cross-module imports
4. **Test your changes** - New features need tests
5. **Commit with proper messages** - Use conventional format
6. **Push and create PR** - Link related issues

### Code Style

The project uses:
- **Prettier** for formatting (auto-fix with `npm run format:fix`)
- **ESLint** for patterns (auto-fix with `npm run lint:fix`)
- **TypeScript strict mode** for type safety

Pre-commit hooks prevent commits that don't pass checks.

## Testing Strategy

### Test Types

- **Unit Tests** (`*.test.ts`) - Individual functions and components
- **Integration Tests** (`*.integration.ts`) - Multi-component flows and API contracts
- **E2E Tests** (`*.e2e.ts`) - Complete user journeys through the application

### Running Tests

```bash
# All tests
npm run test

# Specific suite
npm run test -- auth.test.ts

# Watch mode (recommended during development)
npm run test:watch

# Coverage report
npm run test:coverage

# Visual UI
npm run test:ui
```

### Critical Test Coverage

- **Auth Module** - Login, SSO, 2FA flows
- **Deal Module** - Creation, pricing, calculations
- **Tax Module** - Multi-state calculations
- **Email Module** - Inbox sync, threading, sending
- **API Contracts** - Request/response validation

## Deployment

### Development Environment
```bash
npm run dev
```

Runs both frontend (Vite on :5173) and backend (Express on :5000) with hot reload.

### Production Build
```bash
npm run build
npm start
```

Creates optimized bundles and starts the production server.

### Environment Variables

Required `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/autolytiq

# Email
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@autolytiq.com

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# API Keys (optional)
OPENAI_API_KEY=your-openai-key
GOOGLE_MAPS_API_KEY=your-maps-key

# Environment
NODE_ENV=production
PORT=5000
```

See `.env.example` for complete list.

## Performance

### Optimization Targets

- **Build Time:** <30 seconds
- **Page Load:** <3 seconds (Lighthouse)
- **API Response:** <200ms (p95)
- **Database Queries:** <50ms (p95)

### Monitoring

- Application logs: `/tmp/server.log`
- Database metrics: Drizzle Studio (`npm run db:studio`)
- Frontend performance: Vite dev server stats

## Troubleshooting

### Common Issues

**TypeScript errors after pulling?**
```bash
npm run clean && npm install && npm run typecheck
```

**Database connection failing?**
```bash
# Check your .env DATABASE_URL
npm run db:push
```

**Port already in use?**
```bash
npm run restart  # Kills existing processes and restarts
```

**Tests failing?**
```bash
# Ensure database is migrated
npm run db:push

# Run tests with verbose output
npm run test:watch
```

## Getting Help

1. **Check the documentation** - Start in `/docs/`
2. **Review recent commits** - See how similar features were built
3. **Check the issue tracker** - Someone may have solved your problem
4. **Ask in the team channel** - Get help from other developers

## License

MIT - See LICENSE file for details

## Project Status

**Current Phase:** Stabilization & Architectural Rebuild (Phase 4 of 5)

- ✅ Guardrails established (ESLint, TypeScript strict, Husky)
- ✅ Core modules complete (Auth, Deal, Tax)
- ⏳ Complete migration in progress (7-10 day timeline)
- ⏳ UI pattern consolidation underway
- ⏳ Test coverage expansion

See [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for detailed progress.

---

**Built by an elite team of engineers. Maintained with precision. Deployed with confidence.**

For questions or contributions, see the [Contributing Guide](#contributing).
