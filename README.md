# Autolytiq Desk Studio

**Enterprise Automotive Deal Management Platform**

Autolytiq is a comprehensive dealership management system designed for automotive retail, providing tools for deal structuring, tax calculations, customer management, inventory tracking, and AI-assisted closing.

---

## 🏗️ Project Status: Clean Rebuild in Progress

**Branch:** `feat/unbreakable-architecture`
**Status:** Foundation phase - building enterprise-grade architecture from scratch
**Last Updated:** November 23, 2025

We are currently executing a systematic rebuild with:
- ✅ Enterprise observability (structured logging, OpenTelemetry)
- ✅ Unbreakable architecture rules (ESLint enforced boundaries)
- ✅ Type safety (TypeScript strict mode, generated types)
- ✅ Comprehensive testing (TDD, >80% coverage target)
- 🚧 Microservices migration (Go, Rust/WASM, Python)

---

## 🎯 Core Features

### Deal Management
- Multi-scenario deal structuring (cash, finance, lease)
- Real-time payment calculations
- State-specific tax and fee calculations
- Trade-in valuation
- Deal worksheet generation

### Financial Calculations
- **Tax Engine**: 50-state tax calculation with county/local lookup
- **Cash Deals**: Total cost, fees, taxes
- **Finance**: APR, monthly payment, amortization schedules
- **Leasing**: Money factor, residual value, lease payments
- State-specific calculation rules

### Customer Management
- Customer profiles with credit applications
- Address validation (Google Places API)
- Contact management
- Deal history tracking

### Inventory Management
- Vehicle inventory with VIN decoding
- Pricing management
- Availability tracking
- Multi-location support

### AI Assistant
- In-app chat interface for deal assistance
- Context-aware help (inventory, tax, desking)
- RAG-powered knowledge base
- Integration with deal workflows

### ML Pipeline
- Customer clustering (WHACO engine)
- Deal optimization (Prime Engine)
- Team coordination (Oscillator Network)

---

## 🏛️ Architecture

### Target Architecture (In Development)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  Next.js 14 + React + TypeScript (Pure UI)             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 API Gateway (Node.js)                    │
│  Authentication, Rate Limiting, Request Logging         │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ auth-go │  │ deal-go  │  │customer-go│  │admin-go │
│         │  │          │  │          │  │         │
│ Login   │  │ CRUD     │  │ CRUD     │  │ Users   │
│ MFA     │  │ Pricing  │  │ Address  │  │ Config  │
│ Sessions│  │ Scenarios│  │ Credit   │  │ Roles   │
└─────────┘  └──────────┘  └──────────┘  └──────────┘

┌──────────┐  ┌──────────────┐  ┌────────────────┐
│inventory-│  │ calc-rs      │  │ ai-agent-py    │
│go        │  │ (Rust/WASM)  │  │                │
│          │  │              │  │ Chat UI        │
│ Vehicles │  │ Tax calc     │  │ RAG            │
│ VIN      │  │ Finance calc │  │ LLM            │
│ Pricing  │  │ Lease calc   │  │ Service calls  │
└──────────┘  └──────────────┘  └────────────────┘

                ┌─────────────────┐
                │ ml-pipeline-py  │
                │                 │
                │ WHACO engine    │
                │ Prime engine    │
                │ Oscillator      │
                └─────────────────┘

                ┌─────────────────┐
                │ PostgreSQL 16   │
                │ + pgvector      │
                │ Multi-tenant    │
                └─────────────────┘
```

### Tech Stack

**Frontend:**
- Next.js 14 (React 18, TypeScript)
- TailwindCSS + shadcn/ui
- React Query (data fetching)
- React Hook Form + Zod (validation)

**Backend Services:**
- Go (auth, deal, customer, inventory, admin)
- Rust → WASM (calculation engine)
- Python (AI agent, ML pipeline)
- Node.js (API gateway)

**Database:**
- PostgreSQL 16 with pgvector
- Row-level security (RLS)
- Multi-tenant architecture

**Infrastructure:**
- Redis (caching, sessions)
- OpenTelemetry (observability)
- Kubernetes (orchestration)

---

## 📚 Documentation

### Quick Start
- [Quick Start Guide](docs/guides/QUICK_START_GUIDE.md)
- [Architecture Index](docs/ARCHITECTURE_INDEX.md)

### Architecture
- [Architecture Rules (MANDATORY)](ARCHITECTURE_RULES.md) - Unbreakable rules for all code
- [Agent Workflow Guide](AGENT_WORKFLOW_GUIDE.md) - AI agent discipline
- [Updated Architecture](docs/UPDATED_ARCHITECTURE.md) - Complete system design
- [Architecture Summary](docs/ARCHITECTURE_SUMMARY_AND_DECISIONS.md) - Executive overview

### Services
- [Calculation Engine Design](docs/CALC_ENGINE_DESIGN.md) - Rust/WASM financial engine
- [AI Agent Architecture](docs/AI_AGENT_ARCHITECTURE.md) - Python AI assistant
- [Service Specifications](docs/SERVICE_SPECIFICATIONS.md) - All services quick-start

### Features
- [Tax System](docs/features/tax/)
- [Email System](docs/features/email/)
- [ML Pipeline](docs/features/ml/)

### Development
- [Testing Guide](docs/testing/TESTING_README.md)
- [Design Guidelines](docs/design/design_guidelines.md)
- [Security & PII](docs/security/SECURITY_PII_HANDLING.md)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 16+
- Redis
- Go 1.21+ (for backend services)
- Rust 1.75+ (for calculation engine)
- Python 3.11+ (for AI/ML services)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/autolytiq-desk-studio.git
cd autolytiq-desk-studio

# Switch to the rebuild branch
git checkout feat/unbreakable-architecture

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:push

# Run development server
npm run dev
```

### Development Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint code quality
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run db:studio    # Database UI
```

---

## 🛡️ Quality Gates

All code MUST pass these gates before committing:

```bash
npm run typecheck    # ✅ Zero TypeScript errors
npm run lint         # ✅ Zero ESLint violations
npm run test         # ✅ All tests passing
npm run build        # ✅ Successful build
```

Pre-commit hooks automatically enforce these standards.

---

## 📐 Architecture Principles

### 1. Separation of Concerns
- **Frontend:** UI rendering, user input, API calls ONLY
- **Services:** ALL business logic, calculations, data operations
- **Gateway:** Authentication, routing, orchestration

### 2. Type Safety
- TypeScript strict mode everywhere
- API contracts defined once (OpenAPI)
- Types generated from schemas
- No `any` types without justification

### 3. Observable
- Structured logging (Pino) on every operation
- Request/response logging on all endpoints
- Performance monitoring for slow operations (>1s)
- Full error context for debugging

### 4. Testable
- Test-Driven Development (TDD)
- Unit tests for all business logic
- Integration tests for all API endpoints
- E2E tests for critical user journeys
- >80% code coverage target

### 5. Secure
- Multi-tenant with row-level security
- RBAC (role-based access control)
- PII handling standards
- No secrets in code
- MFA/2FA support

---

## 🤝 Contributing

### Workflow

1. Read [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md) - MANDATORY
2. Read [AGENT_WORKFLOW_GUIDE.md](AGENT_WORKFLOW_GUIDE.md) - MANDATORY
3. Create feature branch from `feat/unbreakable-architecture`
4. Write tests first (TDD)
5. Implement feature
6. Ensure quality gates pass
7. Create PR with proper description
8. Wait for review

### Commit Convention

```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, refactor, test, docs, build, ci, perf, style, chore

### Code Review

- All PRs require review
- Critical paths require CODEOWNERS approval
- CI/CD must pass
- Test coverage must not decrease

---

## 📊 Project Metrics

### Current Status
- **Type Safety:** TypeScript strict mode enabled
- **Test Coverage:** Building towards >80%
- **Code Quality:** ESLint enforced boundaries
- **Build Time:** <30s target
- **Bundle Size:** Monitoring in progress

### Performance Targets
- API endpoints: <500ms p95
- Page load: <2s
- Tax calculation: <10ms (Rust/WASM)
- Deal calculation: <50ms

---

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="..."
SESSION_SECRET="..."

# External APIs
GOOGLE_MAPS_API_KEY="..."
OPENAI_API_KEY="..."

# Email
RESEND_API_KEY="..."

# Observability
LOG_LEVEL="info"
ENABLE_TELEMETRY="true"
```

---

## 📞 Support

- **Documentation:** [docs/ARCHITECTURE_INDEX.md](docs/ARCHITECTURE_INDEX.md)
- **Issues:** GitHub Issues
- **Architecture Questions:** See ARCHITECTURE_RULES.md
- **Agent Workflow:** See AGENT_WORKFLOW_GUIDE.md

---

## 📜 License

MIT

---

## 🙏 Acknowledgments

Built with:
- Next.js, React, TypeScript
- PostgreSQL, Drizzle ORM
- Go, Rust, Python
- shadcn/ui, TailwindCSS
- Pino, OpenTelemetry

---

**Status:** Active development on `feat/unbreakable-architecture`
**Last Updated:** November 23, 2025
