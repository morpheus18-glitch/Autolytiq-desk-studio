# Autolytiq Updated Architecture - Complete System Design

**Last Updated:** 2025-11-23
**Status:** PROPOSED - Awaiting User Approval
**Phase:** Architecture Planning for Microservices Migration

---

## Executive Summary

This document outlines the complete microservices architecture for Autolytiq, incorporating:

- **8 backend services** (4 Go, 1 Rust, 2 Python, 1 Node.js gateway)
- **Existing ML capabilities** (WHACO, Prime Engine, Oscillator Network)
- **New requirements** (Auth, Admin, AI Chat, Expanded calculations)
- **Multi-tenant isolation** throughout all layers
- **Best-in-class performance targets** (< 1.5s TTI, < 100ms API responses)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│                  (Next.js 14 - React)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Deals   │  │Customers │  │Inventory │  │   Email  │   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   Tax    │  │   AI     │  │  Admin   │                  │
│  │  Module  │  │  Chat    │  │  Module  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTPS/REST API
                     │
┌────────────────────▼─────────────────────────────────────────┐
│              GATEWAY LAYER (BFF)                              │
│              (Node.js + Express)                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Middleware Stack                           │ │
│  │  • Authentication (JWT validation)                      │ │
│  │  • Request logging (Pino structured)                    │ │
│  │  • Rate limiting (per-user, per-tenant)                 │ │
│  │  • Error handling & normalization                       │ │
│  │  • Multi-tenant context injection                       │ │
│  │  • CORS & security headers                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Service Orchestration Layer                    │ │
│  │  • Auth client → auth-go                                │ │
│  │  • Deal client → deal-go                                │ │
│  │  • Customer client → customer-go                        │ │
│  │  • Inventory client → inventory-go                      │ │
│  │  • Admin client → admin-go                              │ │
│  │  • Tax/Calc client → calc-engine-rs (WASM)              │ │
│  │  • AI client → ai-agent-py                              │ │
│  │  • ML client → ml-pipeline-py                           │ │
│  └────────────────────────────────────────────────────────┘ │
└────┬─────┬──────┬──────┬──────┬──────┬──────┬──────────────┘
     │     │      │      │      │      │      │
     │     │      │      │      │      │      │
     │ HTTP│  HTTP│  HTTP│  HTTP│  HTTP│  HTTP│ HTTP
     │     │      │      │      │      │      │
┌────▼──┐┌─▼───┐┌─▼────┐┌─▼───┐┌─▼────┐┌─▼──┐┌▼──────┐
│ Auth  ││Deal ││Cust- ││Inv- ││Admin ││Calc││ AI    │
│  Go   ││ Go  ││omer  ││ent- ││ Go   ││-rs ││Agent  │
│       ││     ││ Go   ││ory  ││      ││WASM││ Py    │
└───┬───┘└──┬──┘└──┬───┘└──┬──┘└──┬───┘└────┘└───┬───┘
    │       │      │       │      │              │
    │       │      │       │      │              │
    └───────┴──────┴───────┴──────┴──────┬───────┘
                                         │
                     ┌───────────────────▼───────────────┐
                     │      PostgreSQL Database           │
                     │      (Multi-tenant)                │
                     │                                    │
                     │  Tables:                           │
                     │  • users                           │
                     │  • sessions                        │
                     │  • mfa_configs                     │
                     │  • dealerships                     │
                     │  • dealership_settings             │
                     │  • deals                           │
                     │  • customers                       │
                     │  • vehicles                        │
                     │  • inventory                       │
                     │  • deal_scenarios                  │
                     │  • tax_calculations                │
                     │  • email_messages                  │
                     │  • local_tax_rates                 │
                     │  • ...                             │
                     └────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│              ML/AI PIPELINE SERVICE                         │
│              (Python - FastAPI)                             │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    WHACO     │  │    Prime     │  │  Oscillator  │    │
│  │    Engine    │  │    Engine    │  │   Network    │    │
│  │              │  │              │  │              │    │
│  │  Customer    │  │  Deal Strat- │  │  Team        │    │
│  │  Clustering  │  │  egy Optim.  │  │  Coordination│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           Model Training & Serving                    │ │
│  │  • Thompson Sampling (online learning)                │ │
│  │  • Adaptive clustering (no retraining)                │ │
│  │  • Kuramoto synchronization (real-time)              │ │
│  │  • Persistent state management                        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## Service Catalog

### 1. Frontend (Next.js 14)
**Technology:** React 18, TypeScript, TanStack Query, Radix UI
**Responsibilities:**
- UI rendering and user interaction
- Client-side routing (App Router)
- Form validation (react-hook-form + Zod)
- State management (React Query)
- Design system (Radix + custom tokens)

**Rules:**
- ❌ NO business logic in components
- ❌ NO direct API calls (use React Query hooks)
- ✅ Pure presentational components only
- ✅ All API calls through gateway

---

### 2. Gateway (Node.js + Express)
**Technology:** Node.js, Express, TypeScript, Pino logger
**Port:** 3000
**Responsibilities:**
- BFF (Backend-for-Frontend) orchestration
- Authentication middleware (JWT validation)
- Request/response logging
- Rate limiting (per user, per tenant)
- Service coordination
- WASM tax engine hosting (calc-engine-rs)
- Error normalization
- Multi-tenant context injection

**Key Features:**
- Single entry point for frontend
- Aggregates multiple service calls
- Handles WASM tax calculations in-process (no network latency)
- Structured logging with Pino
- Request ID tracking across services

**Performance Targets:**
- < 50ms overhead per request
- < 1ms for WASM tax calculations
- Connection pooling to all services

---

### 3. Auth Service (Go)
**Technology:** Go 1.21+, JWT, bcrypt
**Port:** 3001
**Database:** PostgreSQL (users, sessions, mfa_configs)

**Endpoints:**
```
POST   /auth/login              - Authenticate user (username/password)
POST   /auth/logout             - Invalidate session
POST   /auth/refresh            - Refresh JWT token
POST   /auth/forgot-password    - Initiate password reset
POST   /auth/reset-password     - Complete password reset
POST   /auth/verify-email       - Verify email address
POST   /auth/setup-mfa          - Enable MFA for user
POST   /auth/verify-mfa         - Verify MFA code (TOTP)
POST   /auth/disable-mfa        - Disable MFA
GET    /auth/validate-token     - Validate JWT (for gateway)
POST   /auth/register           - User self-registration (limited)
```

**Features:**
- **Password Management:**
  - bcrypt hashing (cost factor 12)
  - Password reset via email token (30-min expiry)
  - New user password setup workflow
  - Password strength enforcement

- **MFA/2FA Support:**
  - TOTP (Time-based One-Time Password) via Google Authenticator
  - QR code generation for setup
  - Backup codes (10 single-use codes)
  - SMS fallback (optional, via Twilio)

- **Session Management:**
  - JWT tokens (15-min access, 7-day refresh)
  - Redis session store (optional)
  - Multi-device session tracking
  - Forced logout across all devices

- **Security:**
  - Account lockout (5 failed attempts, 15-min lockout)
  - Rate limiting (10 login attempts/min per IP)
  - Audit logging (all auth events)
  - CSRF protection

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  dealership_id UUID NOT NULL,  -- Multi-tenant
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL,     -- admin, manager, salesperson
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mfa_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,               -- TOTP secret
  backup_codes TEXT[],           -- Encrypted backup codes
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,      -- Hashed JWT for revocation
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50),        -- login, logout, mfa_enabled, etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. Admin Service (Go)
**Technology:** Go 1.21+
**Port:** 3002
**Database:** PostgreSQL (dealerships, dealership_settings, user_roles)

**Endpoints:**
```
# User Management
GET    /admin/users                - List all users (tenant-scoped)
POST   /admin/users                - Create new user (admin only)
GET    /admin/users/:id            - Get user details
PUT    /admin/users/:id            - Update user
DELETE /admin/users/:id            - Deactivate user
PUT    /admin/users/:id/role       - Change user role
PUT    /admin/users/:id/approve    - Approve pending user

# Dealership Settings
GET    /admin/dealerships          - List dealerships (super-admin)
GET    /admin/dealerships/:id      - Get dealership details
PUT    /admin/dealerships/:id      - Update dealership settings

# System Configuration
GET    /admin/settings             - Get tenant settings
PUT    /admin/settings             - Update tenant settings
GET    /admin/settings/tax         - Get tax configuration
PUT    /admin/settings/tax         - Update tax rules

# Role Management (RBAC)
GET    /admin/roles                - List all roles
POST   /admin/roles                - Create custom role
PUT    /admin/roles/:id            - Update role permissions
DELETE /admin/roles/:id            - Delete role

# Audit Logs
GET    /admin/audit-logs           - Query audit logs
GET    /admin/audit-logs/users/:id - User-specific audit trail
```

**Features:**
- **User Management:**
  - CRUD operations for users
  - Role assignment (admin, manager, salesperson, custom)
  - User approval workflow (for self-registrations)
  - Bulk user import (CSV)
  - User activity monitoring

- **Dealership Settings:**
  - Business info (name, address, tax ID)
  - Operating hours
  - Regional settings (timezone, currency)
  - Tax configuration (state rules, local rates)
  - Email templates
  - Logo and branding

- **RBAC (Role-Based Access Control):**
  - Pre-defined roles: admin, manager, salesperson
  - Custom role creation
  - Granular permissions (deals.read, deals.write, reports.view, etc.)
  - Permission inheritance

- **Audit Logging:**
  - All user actions logged
  - Deal state changes
  - Configuration changes
  - Compliance reporting (GDPR, SOC2)

**Database Schema:**
```sql
CREATE TABLE dealerships (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  legal_name VARCHAR(100),
  tax_id VARCHAR(20),
  address JSONB,
  contact JSONB,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dealership_settings (
  dealership_id UUID PRIMARY KEY REFERENCES dealerships(id),
  settings JSONB NOT NULL,       -- Flexible JSON config
  tax_config JSONB,
  email_templates JSONB,
  branding JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  dealership_id UUID REFERENCES dealerships(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  permissions TEXT[],            -- Array of permission strings
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  dealership_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR(50),     -- deal, customer, user, etc.
  resource_id UUID,
  action VARCHAR(50),            -- create, update, delete, view
  changes JSONB,                 -- Before/after state
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 5. Deal Service (Go)
**Technology:** Go 1.21+
**Port:** 3003
**Database:** PostgreSQL (deals, deal_scenarios)

**Endpoints:**
```
GET    /deals                  - List deals (tenant-scoped, paginated)
POST   /deals                  - Create new deal
GET    /deals/:id              - Get deal details
PUT    /deals/:id              - Update deal
DELETE /deals/:id              - Delete deal
POST   /deals/:id/scenarios    - Create scenario
GET    /deals/:id/calculate    - Calculate deal (calls calc-engine)
POST   /deals/:id/submit       - Submit deal for approval
PUT    /deals/:id/approve      - Approve deal (manager only)
```

**Features:**
- Deal CRUD operations
- Scenario management (cash, finance, lease)
- Deal calculations (via calc-engine-rs)
- Deal state machine (draft → submitted → approved → closed)
- Multi-tenant isolation (all queries filtered by dealership_id)

---

### 6. Customer Service (Go)
**Technology:** Go 1.21+
**Port:** 3004
**Database:** PostgreSQL (customers, credit_applications)

**Endpoints:**
```
GET    /customers              - List customers
POST   /customers              - Create customer
GET    /customers/:id          - Get customer details
PUT    /customers/:id          - Update customer
POST   /customers/:id/validate-address  - Validate address (Google API)
POST   /customers/:id/credit-app        - Submit credit application
```

**Features:**
- Customer CRUD
- Address validation (Google Places API integration)
- Credit application management
- Customer search (by name, email, phone)

---

### 7. Inventory Service (Go)
**Technology:** Go 1.21+
**Port:** 3005
**Database:** PostgreSQL (vehicles, inventory)

**Endpoints:**
```
GET    /inventory              - List inventory
POST   /inventory              - Add vehicle to inventory
GET    /inventory/:id          - Get vehicle details
PUT    /inventory/:id          - Update vehicle
POST   /inventory/:id/vin-decode  - Decode VIN
DELETE /inventory/:id          - Remove from inventory
```

**Features:**
- Vehicle inventory management
- VIN decoding (via external API)
- Pricing and availability
- Vehicle search and filtering

---

### 8. Calculation Engine (Rust → WASM)
**Technology:** Rust, wasm-pack, wasm-bindgen
**Deployment:** Embedded in Gateway (in-process WASM)
**Performance:** < 1ms per calculation

**Scope:** This is now a COMPREHENSIVE financial calculation engine, not just tax!

**Calculations Supported:**

#### A. Tax Calculations
- **50 states + DC** tax rules
- **County/local tax** lookups (ZIP-based)
- **State-specific rules:**
  - California: Sales tax + county + district
  - Georgia: TAVT (Title Ad Valorem Tax)
  - Texas: Sales tax + county + city
  - New York: DMV fees + sales tax
  - ... (48 more states)

#### B. Cash Deal Calculations
```rust
pub struct CashDealParams {
    pub vehicle_price: Decimal,
    pub trade_in_value: Decimal,
    pub down_payment: Decimal,
    pub state: String,
    pub county: String,
    pub zip_code: String,
}

pub struct CashDealResult {
    pub vehicle_price: Decimal,
    pub trade_in_value: Decimal,
    pub down_payment: Decimal,
    pub subtotal: Decimal,
    pub tax: TaxBreakdown,
    pub fees: Vec<FeeLineItem>,
    pub total_due: Decimal,
}
```

**Features:**
- Total cash price calculation
- Tax breakdown (state, county, local)
- DMV/registration fees (state-specific)
- Doc fees and dealer fees

#### C. Finance Deal Calculations
```rust
pub struct FinanceParams {
    pub vehicle_price: Decimal,
    pub down_payment: Decimal,
    pub trade_in_value: Decimal,
    pub apr: Decimal,
    pub term_months: u32,
    pub state: String,
    pub county: String,
}

pub struct FinanceResult {
    pub amount_financed: Decimal,
    pub monthly_payment: Decimal,
    pub total_interest: Decimal,
    pub total_cost: Decimal,
    pub amortization_schedule: Vec<PaymentPeriod>,
    pub apr: Decimal,
    pub tax: TaxBreakdown,
}
```

**Features:**
- Monthly payment calculation (exact, not approximation)
- Amortization schedule generation
- Total interest over loan term
- APR calculations
- State-specific finance rules

#### D. Lease Calculations
```rust
pub struct LeaseParams {
    pub vehicle_price: Decimal,
    pub residual_percent: Decimal,
    pub money_factor: Decimal,
    pub term_months: u32,
    pub down_payment: Decimal,
    pub state: String,
}

pub struct LeaseResult {
    pub base_payment: Decimal,
    pub tax_on_payment: Decimal,
    pub total_monthly_payment: Decimal,
    pub total_due_at_signing: Decimal,
    pub residual_value: Decimal,
    pub depreciation: Decimal,
    pub total_lease_cost: Decimal,
}
```

**Features:**
- Lease payment calculation
- Money factor to APR conversion
- Residual value calculations
- Capitalized cost reduction
- Tax on lease payments (state-specific)

#### E. State-Specific Rules Engine
Each state has unique calculation rules:

**Example - California:**
```rust
pub fn calculate_ca_deal(params: &DealParams) -> DealResult {
    // CA-specific tax (state + county + district)
    let state_tax = params.amount * Decimal::from_str("0.0725").unwrap();
    let county_tax = lookup_county_tax(&params.county);
    let district_tax = lookup_district_tax(&params.zip);

    // CA-specific DMV fees
    let registration_fee = calculate_ca_registration_fee(&params.vehicle);
    let smog_fee = Decimal::from(50); // CA smog abatement fee

    // ... CA-specific calculation logic
}
```

**Example - Georgia (TAVT):**
```rust
pub fn calculate_ga_deal(params: &DealParams) -> DealResult {
    // Georgia uses TAVT instead of annual ad valorem tax
    let tavt_rate = Decimal::from_str("0.07").unwrap(); // 7% TAVT
    let tavt = params.vehicle_price * tavt_rate;

    // No annual property tax after TAVT paid
    // ... GA-specific logic
}
```

**WASM Exports:**
```typescript
// Generated TypeScript bindings
export function calculate_tax(params: TaxParams): TaxResult;
export function calculate_cash_deal(params: CashDealParams): CashDealResult;
export function calculate_finance_deal(params: FinanceParams): FinanceResult;
export function calculate_lease_deal(params: LeaseParams): LeaseResult;
export function get_supported_states(): string[];
export function get_state_tax_rules(state: string): StateTaxRules;
```

**Performance Targets:**
- Tax calculation: < 1ms
- Cash deal: < 2ms
- Finance deal (with amortization): < 5ms
- Lease calculation: < 3ms

**Testing Requirements:**
- 100+ test cases per state
- Parity tests (compare to existing TypeScript implementation)
- Edge case coverage (negative equity, high LTV, etc.)
- Performance benchmarks

---

### 9. AI Agent Service (Python FastAPI)
**Technology:** Python 3.11+, FastAPI, LangChain, OpenAI/Anthropic
**Port:** 3006
**Database:** Vector DB (for RAG)

**Endpoints:**
```
POST   /ai/chat                - Send message to AI agent
GET    /ai/context/:deal_id    - Get deal context for AI
POST   /ai/suggest             - Get AI suggestions for deal
WS     /ai/ws/chat             - WebSocket for real-time chat
```

**Features:**

#### A. Conversational AI
- **In-app chat interface**
- Natural language understanding
- Context-aware responses
- Memory across conversation

#### B. Deal Intelligence
```python
# AI knows about current deal
user: "What's the best way to structure this deal for John?"

ai: "Based on John's credit score (680) and down payment (15%),
     I recommend:
     1. 72-month term to keep payment under $500/month
     2. Shop for rates around 5.5% APR
     3. Consider maximizing trade value to reduce LTV

     Current WHACO analysis shows John as a 'Motivated Shopper'
     (cluster 2, 85% priority). Prime Engine suggests the
     'balanced_structure' strategy has 78% success rate for this
     profile."
```

#### C. RAG (Retrieval-Augmented Generation)
- **Vector DB:** Pinecone, Weaviate, or Qdrant
- **Knowledge Base:**
  - Tax rules for all 50 states
  - Dealership policies
  - Product brochures
  - Sales training materials
  - Historical deal patterns

#### D. Context Awareness
```python
class DealContext:
    deal_id: str
    customer: Customer
    vehicle: Vehicle
    scenarios: List[DealScenario]
    whaco_analysis: WHACOResult
    prime_recommendation: PrimeEngineResult
    conversation_history: List[Message]
```

AI has access to:
- Current deal details
- Customer profile and WHACO cluster
- Prime Engine strategy recommendations
- Inventory availability
- Tax calculations
- Historical similar deals

#### E. Service Integration
AI agent calls other services:
```python
# Get deal details
deal = await deal_service.get_deal(deal_id)

# Get tax calculation
tax = await calc_engine.calculate_tax(deal.customer.state, deal.customer.zip, amount)

# Get ML recommendations
whaco_result = await ml_service.classify_customer(customer_features)
prime_result = await ml_service.get_deal_strategy(deal_context)

# Get inventory suggestions
similar_vehicles = await inventory_service.search_similar(deal.vehicle_id)
```

#### F. Use Cases
1. **Deal Structuring Help:**
   - "How should I structure this deal?"
   - "What APR should I target for this customer?"
   - "Should I recommend a co-signer?"

2. **Tax and Compliance:**
   - "What's the tax in Georgia for a $40k vehicle?"
   - "Does this deal comply with Texas lending laws?"

3. **Inventory Recommendations:**
   - "What vehicles match this customer's budget?"
   - "Show me similar cars with better profit margins"

4. **Training and Coaching:**
   - "How do I handle objections about monthly payment?"
   - "Best practices for closing a subprime deal"

**Tech Stack:**
```python
# FastAPI for REST and WebSocket
from fastapi import FastAPI, WebSocket
from langchain import OpenAI, ConversationChain
from langchain.vectorstores import Pinecone
from langchain.embeddings import OpenAIEmbeddings

app = FastAPI()

# Initialize LLM
llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize vector DB
embeddings = OpenAIEmbeddings()
vectorstore = Pinecone.from_existing_index("autolytiq-knowledge", embeddings)

@app.post("/ai/chat")
async def chat(message: str, deal_id: str):
    # Get deal context
    context = await get_deal_context(deal_id)

    # Retrieve relevant knowledge
    docs = vectorstore.similarity_search(message, k=5)

    # Generate response with context
    response = llm.predict(
        f"Context: {context}\nKnowledge: {docs}\nQuestion: {message}"
    )

    return {"response": response}
```

---

### 10. ML Pipeline Service (Python FastAPI)
**Technology:** Python 3.11+, FastAPI, NumPy, scikit-learn
**Port:** 3007
**Database:** PostgreSQL (for model state persistence)

**Purpose:** Houses the existing ML engines (WHACO, Prime, Oscillator) with proper API layer

**Endpoints:**
```
# WHACO Engine - Customer Clustering
POST   /ml/whaco/classify          - Classify customer into cluster
GET    /ml/whaco/clusters          - Get all cluster profiles
GET    /ml/whaco/outliers          - Get recent outliers
POST   /ml/whaco/reset             - Reset clustering (admin only)

# Prime Engine - Deal Strategy Optimization
POST   /ml/prime/recommend         - Get strategy recommendation
POST   /ml/prime/record-outcome    - Record strategy success/failure
GET    /ml/prime/performance       - Get performance report
GET    /ml/prime/best-strategy     - Get current best strategy

# Oscillator Network - Team Coordination
POST   /ml/oscillator/assign-lead  - Get optimal salesperson for lead
GET    /ml/oscillator/team-status  - Get team coherence status
POST   /ml/oscillator/deal-closed  - Record deal closure
GET    /ml/oscillator/bottlenecks  - Identify struggling salespeople
GET    /ml/oscillator/mentoring    - Get mentoring recommendations

# Model Management
GET    /ml/health                  - Service health check
POST   /ml/state/save              - Save all model states
POST   /ml/state/load              - Load model states
```

**Migration from Existing Code:**

The three ML engines are already implemented in TypeScript:
- `/server/ml/whaco-engine.ts` (535 lines)
- `/server/ml/prime-engine.ts` (649 lines)
- `/server/ml/oscillator-network.ts` (513 lines)

**Migration Strategy:**
1. **Port to Python** - Rewrite in Python with NumPy (better ML ecosystem)
2. **Add FastAPI layer** - Expose as REST API
3. **Persistent state** - Save/load model state to PostgreSQL
4. **Enhanced monitoring** - Add Prometheus metrics for model performance

**Python Implementation Example:**

```python
# whaco_engine.py
from fastapi import FastAPI
import numpy as np
from typing import Dict, List

class WHACOEngine:
    """
    Weighted Heuristic Adaptive Clustering with Outliers
    Real-time incremental clustering for customer segmentation
    """
    def __init__(self, n_clusters=5, feature_dim=10):
        self.n_clusters = n_clusters
        self.feature_dim = feature_dim
        self.centroids = np.random.rand(n_clusters, feature_dim)
        self.feature_weights = np.ones(feature_dim) / feature_dim
        self.variances = np.ones((n_clusters, feature_dim)) * 0.1

    def classify_customer(self, features: Dict) -> Dict:
        """Classify customer and return cluster + recommendations"""
        # Convert features to vector
        feature_vector = self._features_to_vector(features)

        # Find nearest cluster
        cluster_id = self._find_nearest_cluster(feature_vector)

        # Check for outliers
        is_outlier = self._is_outlier(feature_vector, cluster_id)

        # Update cluster (online learning)
        if not is_outlier:
            self._update_cluster(cluster_id, feature_vector)

        return {
            "cluster_id": cluster_id,
            "cluster_name": self._get_cluster_profile(cluster_id)["name"],
            "is_outlier": is_outlier,
            "confidence": self._calculate_confidence(feature_vector, cluster_id),
            "recommendations": self._get_cluster_profile(cluster_id)["approach"]
        }
```

**Performance Targets:**
- Customer classification: < 10ms
- Strategy recommendation: < 15ms
- Team status update: < 20ms
- Model state save: < 100ms

---

## Cross-Cutting Concerns

### 1. Multi-Tenant Isolation
**Every service enforces tenant isolation:**

```go
// Go middleware example
func TenantMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract tenant ID from JWT
        tenantID := extractTenantFromJWT(r)

        // Inject into context
        ctx := context.WithValue(r.Context(), "tenantID", tenantID)

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Repository layer - all queries scoped
func (r *DealRepository) GetDeals(ctx context.Context) ([]Deal, error) {
    tenantID := ctx.Value("tenantID").(string)

    return r.db.Query(
        "SELECT * FROM deals WHERE dealership_id = $1",
        tenantID,
    )
}
```

### 2. Logging & Observability
**Structured logging across all services:**

```go
// Go example
log.Info().
    Str("tenant_id", tenantID).
    Str("user_id", userID).
    Str("deal_id", dealID).
    Int("duration_ms", duration).
    Msg("DEAL_CREATED")
```

```python
# Python example
logger.info(
    "CUSTOMER_CLASSIFIED",
    extra={
        "tenant_id": tenant_id,
        "customer_id": customer_id,
        "cluster_id": cluster_id,
        "confidence": confidence,
    }
)
```

### 3. Error Handling
**Consistent error responses:**

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: any;
  requestId: string;
}
```

### 4. Authentication Flow
```
1. User logs in → Auth Service
2. Auth Service returns JWT (contains: userId, dealershipId, role)
3. Frontend includes JWT in all requests
4. Gateway validates JWT → extracts tenant context
5. Gateway forwards to services with tenant context
6. Services enforce tenant isolation in all queries
```

---

## Data Flow Examples

### Example 1: Create Deal with AI Assistance

```
1. User: "Create deal for John Doe"
   Frontend → Gateway → Deal Service → PostgreSQL

2. AI Agent: "Who is this customer?"
   Frontend → Gateway → AI Agent → Customer Service
   AI Agent → ML Service (WHACO classification)

3. AI Agent: "Recommended approach for this customer:"
   AI Agent → ML Service (Prime Engine recommendation)

4. User: "Calculate finance scenario"
   Frontend → Gateway → Calc Engine (WASM)
   < 1ms calculation

5. User: "Looks good, assign to best salesperson"
   Frontend → Gateway → ML Service (Oscillator assignment)

6. Deal created, salesperson notified
```

### Example 2: Address Validation

```
1. User enters address
   Frontend → Gateway → Customer Service

2. Customer Service → Google Places API
   Returns: normalized address, lat/lng, county

3. Customer Service → Calc Engine (tax lookup by county)
   Returns: applicable tax rates

4. Frontend displays: validated address + tax info
```

---

## Deployment Architecture

### Development (Docker Compose)
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  gateway:
    build: ./gateway
    ports: ["3000:3000"]
    depends_on: [auth-go, deal-go, customer-go, inventory-go, admin-go, ai-agent-py, ml-py]

  auth-go:
    build: ./services/auth-go
    ports: ["3001:3001"]

  admin-go:
    build: ./services/admin-go
    ports: ["3002:3002"]

  deal-go:
    build: ./services/deal-go
    ports: ["3003:3003"]

  customer-go:
    build: ./services/customer-go
    ports: ["3004:3004"]

  inventory-go:
    build: ./services/inventory-go
    ports: ["3005:3005"]

  ai-agent-py:
    build: ./services/ai-agent-py
    ports: ["3006:3006"]

  ml-py:
    build: ./services/ml-pipeline-py
    ports: ["3007:3007"]

  postgres:
    image: postgres:16
    ports: ["5432:5432"]

  redis:
    image: redis:7
    ports: ["6379:6379"]
```

### Production (Kubernetes)
- Each service as separate Deployment
- Horizontal Pod Autoscaler for all services
- Service mesh (Istio or Linkerd) for observability
- PostgreSQL on managed service (RDS, Cloud SQL)
- Redis for session store and caching

---

## Performance Targets

### API Response Times
- Auth operations: < 100ms
- CRUD operations: < 100ms
- Tax calculations (WASM): < 1ms
- Finance calculations (WASM): < 5ms
- AI chat responses: < 2s (streaming)
- ML classifications: < 20ms

### Frontend Performance
- Time to Interactive (TTI): < 1.5s
- First Contentful Paint: < 800ms
- Largest Contentful Paint: < 1.2s

### Database Performance
- Query response time: < 50ms (p95)
- Connection pool: 20 connections per service
- Read replicas for heavy queries

---

## Security

### Authentication
- JWT tokens (RS256 signing)
- 15-min access token expiry
- 7-day refresh token expiry
- Token rotation on refresh

### Authorization
- Role-based access control (RBAC)
- Tenant isolation enforced at DB layer
- Row-level security (PostgreSQL RLS)

### Data Protection
- All passwords hashed with bcrypt (cost 12)
- MFA secrets encrypted at rest
- TLS 1.3 for all service communication
- API keys rotated every 90 days

### Audit Logging
- All user actions logged
- All deal state changes logged
- Compliance reports (GDPR, SOC2)

---

## Critical Questions for User

Before finalizing this architecture, please clarify:

1. **Whaco & Prime Engine Oscillator:**
   - ✅ ANSWERED: These are the ML engines already implemented
   - WHACO = Customer clustering
   - Prime Engine = Deal strategy optimization
   - Oscillator = Team coordination

2. **AI Agent LLM Provider:**
   - OpenAI (GPT-4)?
   - Anthropic (Claude)?
   - Local model (Llama 2, Mistral)?
   - User configurable?

3. **MFA Method:**
   - TOTP only (Google Authenticator)?
   - TOTP + SMS backup?
   - Email-based codes?
   - All three options?

4. **Auth Strategy:**
   - Build custom auth service (as specified)?
   - OR use Auth0/Supabase/Clerk with custom wrapper?

5. **Vector DB for AI Agent:**
   - Pinecone (managed, expensive)?
   - Weaviate (self-hosted)?
   - Qdrant (Rust, fast)?
   - pgvector (PostgreSQL extension)?

6. **Address Validation:**
   - Google Places API only (existing implementation)?
   - Add USPS fallback (free but slower)?
   - Add Smarty (paid, very accurate)?

7. **Google API Integration:**
   - Embed in Customer Service (current approach)?
   - Separate address-service-go?
   - Gateway middleware?

---

## Next Steps

After user approval of this architecture:

1. **Detailed service specifications** (see separate documents)
2. **Updated migration plan** (revised 5-phase timeline)
3. **Rust calculation engine expansion** (detailed design)
4. **AI agent architecture** (LangChain setup, RAG strategy)
5. **ML pipeline migration** (TypeScript → Python)

---

**Status:** AWAITING USER FEEDBACK

Please review and provide answers to the 7 critical questions above.
