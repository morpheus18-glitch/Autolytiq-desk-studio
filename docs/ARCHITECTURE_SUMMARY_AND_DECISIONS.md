# Autolytiq Architecture - Summary & Critical Decisions

**Last Updated:** 2025-11-23
**Status:** AWAITING USER APPROVAL
**Phase:** Architecture Planning Complete

---

## Executive Summary

I've completed a comprehensive analysis of Autolytiq's requirements and created a **complete microservices architecture** incorporating:

✅ **8 backend services** designed and specified
✅ **Existing ML capabilities discovered** and preserved (WHACO, Prime Engine, Oscillator)
✅ **New requirements integrated** (Auth, Admin, AI Chat, Expanded Calc Engine)
✅ **Multi-tenant architecture** with strict isolation
✅ **Performance targets** defined (< 1.5s TTI, < 100ms API, < 5ms calcs)

---

## Discovered Assets (IMPORTANT!)

While analyzing the codebase, I discovered **three sophisticated ML engines already implemented** in TypeScript:

### 1. WHACO Engine (`/server/ml/whaco-engine.ts` - 535 lines)
**What it does:**
- Real-time customer clustering and segmentation
- Adaptive clustering (learns and evolves with each customer)
- Outlier detection (fraud signals, unusual patterns)
- Customer profiling (Prime Buyers, Tire Kickers, Credit Challenged, etc.)

**How it works:**
- Weighted Heuristic Adaptive Clustering with Outliers
- Incremental online learning (no retraining needed)
- Classifies customers into 5 clusters based on 10 features
- 85-95% confidence scoring

**Business Value:**
- Instant customer segmentation when they walk in
- Recommended approach for each customer type
- Priority scoring for lead routing
- Fraud/anomaly detection

### 2. Prime Engine (`/server/ml/prime-engine.ts` - 649 lines)
**What it does:**
- ML-powered deal strategy optimization
- Thompson Sampling (Multi-Armed Bandit) for online learning
- Learns which deal strategies work best from actual outcomes
- Context-aware recommendations

**How it works:**
- 7 deal strategies (high down payment, extend term, optimize rate, etc.)
- Each strategy has win/trial statistics
- Thompson Sampling balances exploration vs exploitation
- Updates automatically as deals close (success/failure)

**Business Value:**
- ML-optimized deal structuring recommendations
- Learns from every deal (gets smarter over time)
- Context-aware (matches strategy to customer FICO, down payment, etc.)
- 70-85% success rates per strategy

### 3. Oscillator Network (`/server/ml/oscillator-network.ts` - 513 lines)
**What it does:**
- Team coordination and optimal lead assignment
- Workload balancing across salespeople
- Bottleneck detection (who's struggling)
- Mentoring recommendations

**How it works:**
- Kuramoto model (coupled oscillators)
- Treats salespeople as oscillators that synchronize
- Assigns leads based on phase, workload, and skill level
- Measures team coherence (0-1 scale)

**Business Value:**
- Optimal lead routing (right lead to right person)
- Prevents overload/idle situations
- Identifies who needs help or mentoring
- Team performance monitoring

**RECOMMENDATION:** These engines should be migrated to the Python ML Pipeline Service as part of the architecture update.

---

## Architecture Overview

### Service Catalog

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | Next.js 14 + React | 3000 | UI layer (presentational only) |
| **Gateway** | Node.js + Express | 3000 | BFF, auth, orchestration, WASM hosting |
| **auth-go** | Go 1.21+ | 3001 | Authentication, MFA, sessions |
| **admin-go** | Go 1.21+ | 3002 | User mgmt, settings, RBAC, audit |
| **deal-go** | Go 1.21+ | 3003 | Deal CRUD, scenarios, state machine |
| **customer-go** | Go 1.21+ | 3004 | Customer CRUD, address validation |
| **inventory-go** | Go 1.21+ | 3005 | Vehicle inventory, VIN decode |
| **calc-engine-rs** | Rust → WASM | N/A | Tax, cash, finance, lease calcs |
| **ai-agent-py** | Python + FastAPI | 3006 | AI chat assistant, RAG |
| **ml-pipeline-py** | Python + FastAPI | 3007 | WHACO, Prime, Oscillator engines |

### Data Layer
- **PostgreSQL 16** (multi-tenant, row-level security)
- **Redis** (sessions, caching)
- **pgvector** (vector embeddings for AI RAG)

---

## Key Design Decisions

### 1. Why Rust for Calculations?
- **Performance:** 10-100x faster than JavaScript
- **Precision:** No floating-point errors (uses `rust_decimal`)
- **Portability:** Same WASM runs in browser, Node, mobile
- **Safety:** Memory-safe, no null pointer errors

**Trade-off:**
- ✅ Extreme performance (< 1ms tax calc, < 5ms finance calc)
- ❌ Rust learning curve for team (but WASM isolates this)

### 2. Why Python for AI/ML?
- **Ecosystem:** LangChain, OpenAI SDK, NumPy, scikit-learn
- **Rapid development:** Faster iteration on ML models
- **Libraries:** Best-in-class for NLP, embeddings, vector ops

**Trade-off:**
- ✅ Rich ecosystem, fast development
- ❌ Slower than Go (but acceptable for ML workloads)

### 3. Why Go for Core Services?
- **Performance:** Fast, compiled, low memory footprint
- **Concurrency:** Built-in goroutines for handling many requests
- **Simplicity:** Easy to learn, maintain, deploy
- **Tooling:** Excellent for microservices (gRPC, HTTP, JSON)

**Trade-off:**
- ✅ Great balance of speed, simplicity, ecosystem
- ❌ Less rich than Python for ML, less safe than Rust

### 4. Why Node.js for Gateway?
- **Existing codebase:** Already in Node/TypeScript
- **WASM hosting:** Excellent WASM support for calc engine
- **Familiar:** Team already knows Node.js ecosystem
- **Fast iteration:** TypeScript development velocity

**Trade-off:**
- ✅ Familiar, fast dev, WASM integration
- ❌ Slower than Go (but acceptable for orchestration layer)

---

## Expanded Calculation Engine (MAJOR CHANGE)

The Rust calculation engine is **much bigger than originally scoped**. It's now a comprehensive financial engine:

### Scope Expansion

**Original Scope (Tax Only):**
- 50 states + DC tax rules
- County/local tax lookups

**NEW Scope (Financial Engine):**
- ✅ Tax calculations (50 states)
- ✅ Cash deal totals (vehicle + tax + fees)
- ✅ Finance calculations (monthly payment + amortization)
- ✅ Lease calculations (lease payment + residual)
- ✅ State-specific rules (CA vs TX vs GA vs NY, etc.)
- ✅ DMV fee calculations (state-specific)
- ✅ Self-adjusting (customer address determines calculation method)

### Why This Matters
This is essentially a **financial pricing engine** - the core calculation brain of Autolytiq. It needs:
- 100+ test cases per state
- Parity tests (compare to existing TypeScript)
- Performance benchmarks
- State-specific logic modules

**Effort Estimate:** 3-4 weeks (vs 1 week for tax-only)

---

## Critical Questions (REQUIRES USER INPUT)

### 1. ML Engines (Whaco, Prime, Oscillator)
**Question:** I discovered these ML engines already exist in TypeScript. Should we:

**Option A:** Port to Python and move to ml-pipeline-py service
- ✅ Better ML ecosystem
- ✅ Easier to extend with new models
- ❌ Migration effort (1-2 weeks)

**Option B:** Keep in TypeScript, expose as API from current backend
- ✅ No migration needed
- ✅ Already working
- ❌ TypeScript not ideal for ML
- ❌ Harder to add advanced features (GPU, training, etc.)

**Option C:** Hybrid - keep working, migrate incrementally
- ✅ No disruption
- ✅ Gradual improvement
- ❌ Technical debt during transition

**MY RECOMMENDATION:** **Option A** - Port to Python. These are sophisticated ML systems that will benefit from Python's ecosystem (NumPy, scikit-learn, advanced sampling). The migration is clean since they're already well-isolated.

---

### 2. AI Agent LLM Provider
**Question:** Which LLM should power the AI agent?

**Option A: OpenAI GPT-4**
- ✅ Best quality responses
- ✅ Excellent function calling
- ✅ 128k context window
- ❌ Expensive (~$0.03/1k tokens)
- ❌ Data sent to OpenAI (privacy concerns?)

**Option B: Anthropic Claude**
- ✅ Excellent quality (rival to GPT-4)
- ✅ 200k context window
- ✅ Strong on reasoning/analysis
- ❌ Expensive (~$0.025/1k tokens)
- ❌ Data sent to Anthropic

**Option C: Local Model (Llama 2, Mistral)**
- ✅ Free (after setup)
- ✅ Complete data privacy
- ✅ No API limits
- ❌ Requires GPU infrastructure
- ❌ Lower quality than GPT-4/Claude
- ❌ Operational complexity

**Option D: User Configurable**
- ✅ Maximum flexibility
- ✅ Can switch based on cost/quality needs
- ❌ More complex code
- ❌ Need to support multiple providers

**MY RECOMMENDATION:** **Option A (OpenAI GPT-4)** for launch, with **Option D (configurable)** as future enhancement. GPT-4 is the proven choice, and we can add other providers later.

**Cost Estimate:** ~$260/month for 1,000 conversations (10 exchanges each)

---

### 3. MFA/2FA Method
**Question:** Which MFA methods should we support?

**Option A: TOTP Only (Google Authenticator)**
- ✅ Secure, standard, free
- ✅ Works offline
- ❌ Requires user to install app

**Option B: TOTP + SMS Fallback**
- ✅ User-friendly fallback
- ❌ SMS costs (~$0.01/message via Twilio)
- ❌ SMS less secure (SIM swapping attacks)

**Option C: TOTP + Email Fallback**
- ✅ Free fallback option
- ✅ More secure than SMS
- ❌ Requires email infrastructure

**Option D: All Three (TOTP, SMS, Email)**
- ✅ Maximum flexibility
- ✅ User choice
- ❌ Most complex

**MY RECOMMENDATION:** **Option C (TOTP + Email)** - Secure primary method with free, secure fallback. Skip SMS to avoid costs and security issues.

---

### 4. Authentication Strategy
**Question:** Build custom auth service or use third-party?

**Option A: Custom Auth Service (as designed)**
- ✅ Full control
- ✅ No vendor lock-in
- ✅ Custom workflows
- ❌ Maintenance burden
- ❌ Security responsibility

**Option B: Auth0**
- ✅ Proven, secure, maintained
- ✅ MFA built-in
- ✅ Social login (Google, Microsoft)
- ❌ Expensive ($240+/month for 1000 users)
- ❌ Vendor lock-in

**Option C: Supabase Auth**
- ✅ Open source
- ✅ Free tier (up to 50k users)
- ✅ MFA built-in
- ❌ Less mature than Auth0
- ❌ Tied to Supabase ecosystem

**Option D: Clerk**
- ✅ Excellent DX
- ✅ Beautiful prebuilt UI
- ✅ Generous free tier
- ❌ Expensive beyond free tier
- ❌ Vendor lock-in

**MY RECOMMENDATION:** **Option A (Custom)** - You already have 80% of the auth code working. Building the remaining 20% (complete MFA, password reset) gives you full control and zero ongoing costs. Only switch to third-party if auth becomes a maintenance burden.

---

### 5. Vector Database for AI RAG
**Question:** Where to store document embeddings?

**Option A: pgvector (PostgreSQL Extension)**
- ✅ Free (uses existing PostgreSQL)
- ✅ Simplicity (one less service)
- ✅ Good performance for < 1M vectors
- ❌ Not specialized for vectors

**Option B: Pinecone**
- ✅ Managed, scalable
- ✅ Excellent performance
- ✅ Purpose-built for vectors
- ❌ Expensive ($70+/month)
- ❌ Vendor lock-in

**Option C: Weaviate**
- ✅ Open source
- ✅ Self-hostable
- ✅ Advanced features (hybrid search)
- ❌ Operational complexity
- ❌ Another service to manage

**Option D: Qdrant**
- ✅ Open source (Rust-based, fast)
- ✅ Self-hostable
- ✅ Great performance
- ❌ Newer, less mature
- ❌ Another service to manage

**MY RECOMMENDATION:** **Option A (pgvector)** for MVP, migrate to **Option B (Pinecone)** if you exceed 100k documents or need better performance. Start simple, scale when needed.

---

### 6. Address Validation Strategy
**Question:** You already have Google Places API integration. Should we:

**Option A: Keep in Customer Service (current)**
- ✅ Already implemented
- ✅ Simple architecture
- ❌ Couples customer service to Google API

**Option B: Move to Gateway Middleware**
- ✅ All services can use it
- ✅ Centralized caching
- ❌ Gateway becomes heavier

**Option C: Separate address-service-go**
- ✅ Microservice pattern
- ✅ Independently scalable
- ❌ Another service to manage
- ❌ Overkill for one API call

**MY RECOMMENDATION:** **Option A (Keep in Customer Service)** - It's working, it's simple, and address validation is inherently tied to customer data. Don't over-engineer. If other services need address validation, they can call customer service.

---

### 7. Service-to-Service Communication
**Question:** How should services communicate?

**Option A: Direct HTTP REST**
- ✅ Simple, standard
- ✅ Easy debugging
- ❌ Tight coupling

**Option B: gRPC**
- ✅ Fast, efficient
- ✅ Type-safe
- ❌ Complexity
- ❌ Harder debugging

**Option C: Message Queue (RabbitMQ, Kafka)**
- ✅ Async, decoupled
- ✅ Resilient
- ❌ Complexity
- ❌ Eventual consistency issues

**Option D: Gateway as Single Entry Point**
- ✅ Frontend simplicity
- ✅ One auth point
- ❌ Gateway as SPOF
- ❌ All traffic through gateway

**MY RECOMMENDATION:** **Option D (Gateway as Single Entry Point)** for frontend → services. **Option A (HTTP REST)** for service-to-service (rare, mostly AI agent calling others). Keep it simple. Add gRPC or message queues only if performance demands it.

---

## Updated Directory Structure

```
autolytiq/
├── frontend/                     # Next.js 14 app
│   └── src/
│       ├── app/                  # Next.js App Router
│       ├── modules/              # Feature modules (deals, tax, etc.)
│       └── core/                 # UI components, http client
│
├── gateway/                      # Node.js BFF
│   └── src/
│       ├── middleware/           # Auth, logging, rate limiting
│       ├── services/             # Service clients
│       ├── wasm/                 # calc-engine WASM binaries
│       └── routes/               # API routes
│
├── services/
│   ├── auth-go/                  # Authentication service
│   │   ├── cmd/server/
│   │   ├── internal/
│   │   │   ├── domain/           # Auth domain logic
│   │   │   ├── handlers/         # HTTP handlers
│   │   │   ├── repository/       # Database layer
│   │   │   └── services/         # Application services
│   │   └── api/
│   │       └── openapi.yaml
│   │
│   ├── admin-go/                 # Admin/settings service
│   │   ├── cmd/server/
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   ├── handlers/
│   │   │   ├── repository/
│   │   │   └── services/
│   │   └── api/
│   │       └── openapi.yaml
│   │
│   ├── deal-go/                  # Deal service (existing, to migrate)
│   ├── customer-go/              # Customer service (existing, to migrate)
│   ├── inventory-go/             # Inventory service (existing, to migrate)
│   │
│   ├── calc-engine-rs/           # Rust calculation engine
│   │   ├── src/
│   │   │   ├── lib.rs            # WASM exports
│   │   │   ├── tax/              # Tax calculations
│   │   │   ├── cash/             # Cash deal calcs
│   │   │   ├── finance/          # Finance calcs
│   │   │   ├── lease/            # Lease calcs
│   │   │   ├── state_rules/      # 50 state modules
│   │   │   └── fees/             # Fee calculations
│   │   ├── data/                 # Embedded tax rules JSON
│   │   ├── tests/                # Unit + integration tests
│   │   └── benches/              # Performance benchmarks
│   │
│   ├── ai-agent-py/              # AI chat assistant
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── chat.py           # Chat endpoints
│   │   │   └── context.py        # Context endpoints
│   │   ├── services/
│   │   │   ├── llm_service.py    # LangChain integration
│   │   │   ├── rag_service.py    # Vector DB / RAG
│   │   │   └── service_client.py # Call other services
│   │   └── requirements.txt
│   │
│   └── ml-pipeline-py/           # ML engines service
│       ├── main.py
│       ├── engines/
│       │   ├── whaco_engine.py   # Customer clustering
│       │   ├── prime_engine.py   # Deal optimization
│       │   └── oscillator.py     # Team coordination
│       ├── routers/
│       │   ├── whaco.py          # WHACO endpoints
│       │   ├── prime.py          # Prime endpoints
│       │   └── oscillator.py     # Oscillator endpoints
│       └── requirements.txt
│
├── shared/                       # Shared types/schemas
│   └── types/                    # TypeScript types (OpenAPI-generated)
│
└── infrastructure/
    ├── docker-compose.yml        # Dev environment
    ├── k8s/                      # Kubernetes manifests
    └── terraform/                # Infrastructure as code
```

---

## Migration Timeline (Updated)

### Phase 1: Foundation (Week 1-2)
- [ ] Create auth-go service (complete MFA workflow)
- [ ] Create admin-go service (user mgmt, settings, RBAC)
- [ ] Update gateway to validate JWT tokens
- [ ] Database migrations (users, sessions, mfa_configs, dealerships)

### Phase 2: Calculation Engine (Week 3-5)
- [ ] Create calc-engine-rs project structure
- [ ] Port tax calculations (50 states)
- [ ] Add cash deal calculations
- [ ] Add finance calculations (payment + amortization)
- [ ] Add lease calculations
- [ ] Write 100+ test cases
- [ ] Build WASM, integrate with gateway

### Phase 3: AI Agent (Week 6-7)
- [ ] Create ai-agent-py FastAPI app
- [ ] Integrate LangChain + OpenAI
- [ ] Set up pgvector for RAG
- [ ] Ingest knowledge base (tax rules, training materials)
- [ ] Build service clients (deal, customer, ML)
- [ ] WebSocket chat endpoint

### Phase 4: ML Pipeline (Week 8-9)
- [ ] Create ml-pipeline-py FastAPI app
- [ ] Port WHACO engine from TypeScript to Python
- [ ] Port Prime Engine from TypeScript to Python
- [ ] Port Oscillator Network from TypeScript to Python
- [ ] Add persistent state management (PostgreSQL)
- [ ] Write integration tests

### Phase 5: Integration & Testing (Week 10-11)
- [ ] End-to-end testing (full user journeys)
- [ ] Performance testing (load tests)
- [ ] Security audit (penetration testing)
- [ ] Documentation (API docs, deployment guides)
- [ ] Deployment pipeline (CI/CD)

### Phase 6: Production Deployment (Week 12)
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitoring dashboards
- [ ] Alerting setup
- [ ] User training
- [ ] Celebrate! 🎉

**Total Timeline:** ~12 weeks (3 months) with 2-3 engineers

---

## Success Metrics

### Performance
- [ ] TTI (Time to Interactive): < 1.5s
- [ ] API response time: < 100ms (p95)
- [ ] Tax calculation: < 1ms
- [ ] Finance calculation: < 5ms
- [ ] AI response: < 2s (non-streaming)

### Quality
- [ ] Zero TypeScript errors (strict mode)
- [ ] Zero ESLint violations
- [ ] Test coverage: > 80%
- [ ] All critical flows have E2E tests

### Security
- [ ] Multi-tenant isolation: 100% enforced
- [ ] All endpoints require auth
- [ ] All passwords hashed (bcrypt)
- [ ] MFA enabled for admin users
- [ ] Audit logs for all actions

### Business
- [ ] Zero downtime during migration
- [ ] No data loss
- [ ] Same or better performance
- [ ] New features unlocked (AI chat, ML insights)

---

## Cost Estimate (Monthly)

### Infrastructure
- **PostgreSQL (RDS):** $100-200
- **Redis (ElastiCache):** $50-100
- **Kubernetes cluster:** $200-400
- **Load balancer:** $20-40
- **Total:** ~$400-750/month

### Third-Party APIs
- **OpenAI (GPT-4):** $260/month (1000 convos)
- **Google Maps API:** $200/month (address validation)
- **Twilio (SMS - optional):** $100/month (if using SMS 2FA)
- **Total:** ~$560/month (or $360 without SMS)

### Total Operating Cost: ~$1,000-1,300/month

**Per User (1000 users):** ~$1-1.30/month

---

## Risks & Mitigations

### Risk 1: Rust Learning Curve
**Impact:** Slow development of calc engine
**Mitigation:**
- Hire Rust contractor for initial setup
- Extensive test suite (catch errors early)
- WASM isolates complexity (team only needs to use it, not modify it)

### Risk 2: LLM API Costs
**Impact:** Unexpected high costs from AI agent usage
**Mitigation:**
- Rate limiting (100 messages/hour per user)
- Caching (identical questions → cached responses)
- Fallback to cheaper models for simple queries
- Monthly budget alerts

### Risk 3: Migration Complexity
**Impact:** Breaking existing functionality
**Mitigation:**
- Incremental migration (not big bang)
- Feature flags (gradual rollout)
- Comprehensive testing (unit, integration, E2E)
- Rollback plan (every checkpoint git-tagged)

### Risk 4: Multi-Tenant Data Leaks
**Impact:** Users seeing other tenants' data (catastrophic)
**Mitigation:**
- Tenant ID in every query (enforced by repository layer)
- PostgreSQL row-level security (RLS)
- Automated tests for tenant isolation
- Security audit before production

---

## Immediate Next Steps

1. **User Reviews Documents:**
   - Read `/docs/UPDATED_ARCHITECTURE.md`
   - Read `/docs/CALC_ENGINE_DESIGN.md`
   - Read `/docs/AI_AGENT_ARCHITECTURE.md`

2. **User Answers Critical Questions (Above):**
   - ML engine migration approach
   - LLM provider choice
   - MFA method
   - Auth strategy (custom vs third-party)
   - Vector DB choice
   - Address validation location
   - Service communication pattern

3. **Approve or Adjust Architecture:**
   - Confirm service breakdown
   - Confirm technology choices
   - Confirm timeline (12 weeks)

4. **Resource Allocation:**
   - Assign 2-3 engineers full-time
   - Allocate budget ($1,000-1,300/month ops cost)
   - Schedule daily standups

5. **Kickoff Phase 1:**
   - Create auth-go repository
   - Create admin-go repository
   - Begin database schema design

---

## Appendix: Technology Justification

### Why This Stack?

**Frontend: Next.js 14 + React**
- Already in use
- Best React framework (SSR, SSG, App Router)
- Excellent DX and performance

**Gateway: Node.js + Express**
- Already in use
- Great for WASM hosting (calc engine)
- Team familiarity

**Services: Go**
- Fast, simple, excellent for microservices
- Compiled (catch errors at build time)
- Great tooling (gRPC, HTTP, JSON)
- Low memory footprint

**Calculations: Rust → WASM**
- Extreme performance (10-100x faster than JS)
- Memory safety (no crashes)
- Deterministic (no floating-point errors)
- Portable (same code, any platform)

**AI/ML: Python + FastAPI**
- Best ecosystem for AI/ML
- LangChain, OpenAI, NumPy, scikit-learn
- Fast development iteration

**Database: PostgreSQL 16**
- Proven, reliable, feature-rich
- Excellent JSON support (JSONB)
- Vector extension (pgvector) for AI
- Multi-tenant support (row-level security)

---

## Final Recommendation

**I recommend proceeding with this architecture** because:

1. **Leverages existing assets** (ML engines, address validation, auth)
2. **Addresses all requirements** (auth, admin, AI, expanded calcs)
3. **Performance-focused** (Rust calcs, Go services, caching)
4. **Scalable** (microservices, multi-tenant, horizontal scaling)
5. **Maintainable** (clear boundaries, single responsibility)
6. **Cost-effective** (~$1,000/month ops, reasonable for B2B SaaS)

**Critical Path:**
1. Get answers to 7 critical questions (above)
2. Approve architecture
3. Allocate resources (2-3 engineers, 12 weeks)
4. Start Phase 1 (auth + admin services)

---

**Status:** READY FOR USER REVIEW AND APPROVAL

**Contact:** Project Orchestrator (this AI assistant)

**Next Interaction:** User provides answers to 7 critical questions
