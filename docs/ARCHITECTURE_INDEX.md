# Autolytiq Architecture Documentation - Index

**Last Updated:** 2025-11-23
**Status:** Complete - Awaiting User Approval

---

## Overview

This directory contains the **complete architecture specification** for Autolytiq's microservices migration. The architecture incorporates all user requirements and preserves existing ML capabilities while modernizing the stack.

---

## Documents

### 1. [UPDATED_ARCHITECTURE.md](./UPDATED_ARCHITECTURE.md)
**The main architecture document**

**Contents:**
- Complete system overview with diagrams
- 8 service catalog (auth, admin, deal, customer, inventory, calc, AI, ML)
- Service-by-service detailed specs
- Data flow examples
- Multi-tenant isolation strategy
- Logging and observability
- Deployment architecture
- Performance targets
- Security model

**Read this FIRST** for the big picture.

**Key Sections:**
- Service architecture diagrams
- Auth service design (complete MFA workflow)
- Admin service design (RBAC, settings, audit logs)
- Calculation engine scope (tax + cash + finance + lease)
- AI agent design (chat, RAG, service integration)
- ML pipeline design (WHACO, Prime, Oscillator)

---

### 2. [CALC_ENGINE_DESIGN.md](./CALC_ENGINE_DESIGN.md)
**Detailed Rust/WASM calculation engine specification**

**Contents:**
- Module architecture (tax, cash, finance, lease, state rules)
- 50-state tax rules implementation
- Financial calculation formulas
- WASM export layer
- Testing strategy (100+ test cases per state)
- Performance benchmarks
- Migration plan from TypeScript

**Why this is important:**
The calculation engine is the **financial heart of Autolytiq**. It's expanding from just tax calculations to a comprehensive financial engine handling:
- Tax (50 states, county/local variations)
- Cash deals (total cost with fees)
- Finance (payment + amortization schedules)
- Lease (lease payments + residual)

**Effort:** 3-4 weeks (vs 1 week for tax-only)

---

### 3. [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md)
**Complete AI chat assistant specification**

**Contents:**
- FastAPI + LangChain architecture
- LLM integration (OpenAI/Anthropic)
- RAG (Retrieval-Augmented Generation) with pgvector
- Service integration layer (calls deal, customer, ML services)
- Context building (WHACO analysis, Prime recommendations)
- Use case examples (deal structuring, tax questions, objection handling)
- Cost estimation (~$260/month for GPT-4)

**Key Features:**
- Conversational AI for sales coaching
- Context-aware (knows about current deal, customer profile)
- Integrates ML insights (WHACO clusters, Prime strategies)
- Knowledge base (tax rules, sales training, policies)
- WebSocket streaming for real-time responses

---

### 4. [ARCHITECTURE_SUMMARY_AND_DECISIONS.md](./ARCHITECTURE_SUMMARY_AND_DECISIONS.md)
**Summary document with critical decisions**

**Contents:**
- Executive summary
- Discovery of existing ML engines (WHACO, Prime, Oscillator)
- 7 critical questions requiring user input
- Recommendations for each decision
- Updated migration timeline (12 weeks)
- Cost estimates (~$1,000-1,300/month ops cost)
- Risk analysis and mitigation

**CRITICAL QUESTIONS (REQUIRES USER ANSWERS):**
1. ML engine migration approach (TypeScript → Python)
2. LLM provider (OpenAI vs Anthropic vs local)
3. MFA method (TOTP, SMS, email)
4. Auth strategy (custom vs Auth0/Supabase)
5. Vector DB (pgvector vs Pinecone)
6. Address validation location (customer service vs gateway)
7. Service communication (HTTP vs gRPC vs message queue)

**Read this SECOND** for decision guidance.

---

### 5. [SERVICE_SPECIFICATIONS.md](./SERVICE_SPECIFICATIONS.md)
**Quick-start guides for each service**

**Contents:**
- auth-go: Database schema, API endpoints, JWT claims
- admin-go: RBAC model, audit logs, settings
- calc-engine-rs: Cargo config, WASM exports, build commands
- ai-agent-py: Dependencies, API endpoints, RAG setup
- ml-pipeline-py: Model state persistence, endpoints
- Docker Compose for complete stack
- Development workflow
- Security checklist

**Use this** when starting implementation of a specific service.

---

## Quick Navigation

### If you want to...

**Understand the overall architecture:**
→ Read [UPDATED_ARCHITECTURE.md](./UPDATED_ARCHITECTURE.md)

**Understand the Rust calculation engine:**
→ Read [CALC_ENGINE_DESIGN.md](./CALC_ENGINE_DESIGN.md)

**Understand the AI chat assistant:**
→ Read [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md)

**Make critical decisions:**
→ Read [ARCHITECTURE_SUMMARY_AND_DECISIONS.md](./ARCHITECTURE_SUMMARY_AND_DECISIONS.md)

**Start building a specific service:**
→ Read [SERVICE_SPECIFICATIONS.md](./SERVICE_SPECIFICATIONS.md)

---

## Key Discoveries

### Existing ML Engines (IMPORTANT!)

While analyzing the codebase, I discovered **three sophisticated ML engines** already implemented:

1. **WHACO Engine** (`/server/ml/whaco-engine.ts` - 535 lines)
   - Customer clustering/segmentation
   - Adaptive online learning
   - Outlier detection
   - 5 customer clusters (Prime Buyers, Tire Kickers, etc.)

2. **Prime Engine** (`/server/ml/prime-engine.ts` - 649 lines)
   - Deal strategy optimization
   - Thompson Sampling (Multi-Armed Bandit)
   - Learns from deal outcomes
   - 7 strategies with success tracking

3. **Oscillator Network** (`/server/ml/oscillator-network.ts` - 513 lines)
   - Team coordination
   - Optimal lead assignment
   - Bottleneck detection
   - Mentoring recommendations

**Recommendation:** Migrate these to Python ML Pipeline Service for better ML ecosystem support.

---

## Architecture Principles

### 1. Multi-Tenant Isolation
Every service enforces tenant isolation:
- All database queries filtered by `dealership_id`
- PostgreSQL row-level security (RLS)
- JWT tokens contain `dealership_id`
- Zero data leakage between tenants

### 2. Performance First
- Rust/WASM for calculations (< 5ms)
- Go for services (< 100ms API responses)
- Redis caching
- Frontend TTI < 1.5s

### 3. Type Safety End-to-End
- TypeScript strict mode
- OpenAPI contracts
- Generated types
- Zod validation at API boundaries

### 4. Observability
- Structured logging (Pino, zerolog, structlog)
- Request ID tracing
- Performance monitoring
- Audit logs

### 5. Security
- JWT authentication
- MFA/2FA support
- RBAC (role-based access control)
- Encrypted secrets
- Audit logging

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (React 18, App Router)
- **State:** TanStack Query (React Query)
- **Forms:** react-hook-form + Zod
- **UI:** Radix UI + custom design tokens

### Gateway (BFF)
- **Runtime:** Node.js 20+
- **Framework:** Express
- **Logging:** Pino
- **WASM:** calc-engine-rs hosted in-process

### Services
- **Go Services:** auth-go, admin-go, deal-go, customer-go, inventory-go
  - Go 1.21+, Chi router, PostgreSQL
- **Rust Service:** calc-engine-rs
  - Rust 2021, compiled to WASM
- **Python Services:** ai-agent-py, ml-pipeline-py
  - Python 3.11+, FastAPI, LangChain, NumPy

### Data Layer
- **Database:** PostgreSQL 16 (multi-tenant, RLS, pgvector)
- **Cache:** Redis 7
- **Vector DB:** pgvector (for AI RAG)

---

## Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 3000 | HTTP |
| Gateway | 3000 | HTTP |
| auth-go | 3001 | HTTP |
| admin-go | 3002 | HTTP |
| deal-go | 3003 | HTTP |
| customer-go | 3004 | HTTP |
| inventory-go | 3005 | HTTP |
| ai-agent-py | 3006 | HTTP + WebSocket |
| ml-pipeline-py | 3007 | HTTP |
| PostgreSQL | 5432 | PostgreSQL |
| Redis | 6379 | Redis |

---

## Migration Timeline

### Phase 1: Foundation (Week 1-2)
- Create auth-go service
- Create admin-go service
- Update gateway for JWT validation
- Database migrations

### Phase 2: Calculation Engine (Week 3-5)
- Build Rust calculation engine
- Port tax calculations (50 states)
- Add cash, finance, lease calculations
- WASM integration

### Phase 3: AI Agent (Week 6-7)
- Build ai-agent-py FastAPI app
- LangChain + OpenAI integration
- RAG setup with pgvector
- Service integrations

### Phase 4: ML Pipeline (Week 8-9)
- Build ml-pipeline-py FastAPI app
- Port WHACO, Prime, Oscillator to Python
- Persistent state management

### Phase 5: Integration & Testing (Week 10-11)
- E2E testing
- Performance testing
- Security audit

### Phase 6: Production (Week 12)
- Gradual rollout
- Monitoring setup
- Documentation

**Total:** 12 weeks with 2-3 engineers

---

## Cost Estimates

### Infrastructure (Monthly)
- PostgreSQL (managed): $100-200
- Redis (managed): $50-100
- Kubernetes cluster: $200-400
- Load balancer: $20-40
- **Subtotal:** ~$400-750

### Third-Party APIs
- OpenAI GPT-4: ~$260 (1000 conversations)
- Google Maps API: ~$200 (address validation)
- **Subtotal:** ~$460

### Total Operating Cost
**~$1,000-1,300/month** or **$1-1.30 per user/month** (1000 users)

---

## Success Metrics

### Performance
- [ ] TTI (Time to Interactive): < 1.5s
- [ ] API response: < 100ms (p95)
- [ ] Tax calc: < 1ms
- [ ] Finance calc: < 5ms
- [ ] AI response: < 2s

### Quality
- [ ] Zero TypeScript errors (strict mode)
- [ ] Zero ESLint violations
- [ ] Test coverage: > 80%
- [ ] All critical flows have E2E tests

### Security
- [ ] 100% tenant isolation
- [ ] All endpoints authenticated
- [ ] MFA for admin users
- [ ] Audit logs for all actions

---

## Next Steps

### 1. User Reviews Documentation
Read the documents in this order:
1. [ARCHITECTURE_SUMMARY_AND_DECISIONS.md](./ARCHITECTURE_SUMMARY_AND_DECISIONS.md) - Decisions needed
2. [UPDATED_ARCHITECTURE.md](./UPDATED_ARCHITECTURE.md) - Complete architecture
3. [CALC_ENGINE_DESIGN.md](./CALC_ENGINE_DESIGN.md) - Calculation engine details
4. [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md) - AI assistant details

### 2. Answer Critical Questions
Provide answers to the 7 critical questions in [ARCHITECTURE_SUMMARY_AND_DECISIONS.md](./ARCHITECTURE_SUMMARY_AND_DECISIONS.md):
1. ML engine migration approach
2. LLM provider choice
3. MFA method
4. Auth strategy
5. Vector DB choice
6. Address validation location
7. Service communication pattern

### 3. Approve Architecture
- Confirm service breakdown
- Confirm technology choices
- Confirm timeline (12 weeks)
- Allocate resources (2-3 engineers)
- Allocate budget (~$1,300/month)

### 4. Begin Implementation
- Create repositories for new services
- Set up Docker Compose development environment
- Start with auth-go (foundation service)

---

## Contact & Support

**Project Orchestrator:** This AI assistant (Project Orchestrator role)
**Status Updates:** Every 4 hours during active development
**Escalation:** Critical blockers stop work until resolved

---

## Appendix: File Locations

All architecture documents are in `/root/autolytiq-desk-studio/docs/`:

- `ARCHITECTURE_INDEX.md` (this file)
- `UPDATED_ARCHITECTURE.md`
- `CALC_ENGINE_DESIGN.md`
- `AI_AGENT_ARCHITECTURE.md`
- `ARCHITECTURE_SUMMARY_AND_DECISIONS.md`
- `SERVICE_SPECIFICATIONS.md`

Existing docs:
- `ARCHITECTURE_DIAGRAM.md` - Original architecture (pre-expansion)
- `ARCHITECTURE_RULES.md` - Coding standards and rules
- `LOGGING_STANDARDS.md` - Structured logging requirements

---

**Status:** DOCUMENTATION COMPLETE - AWAITING USER REVIEW

**Last Updated:** 2025-11-23

**Next Action:** User reviews documents and provides answers to 7 critical questions
