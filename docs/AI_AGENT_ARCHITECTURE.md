# AI Agent Architecture - Intelligent Deal Assistant

**Service:** ai-agent-py
**Technology:** Python 3.11+, FastAPI, LangChain, OpenAI/Anthropic
**Port:** 3006
**Database:** PostgreSQL + Vector DB (pgvector or Pinecone)
**Last Updated:** 2025-11-23

---

## Overview

The AI Agent is an **intelligent assistant** embedded in the Autolytiq platform that helps salespeople:

- **Structure deals** based on customer profile and market conditions
- **Answer questions** about tax rules, inventory, and financing
- **Provide coaching** on sales techniques and objection handling
- **Analyze patterns** across historical deals
- **Integrate ML insights** from WHACO, Prime Engine, and Oscillator Network

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React)                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            AI Chat Interface                            │ │
│  │                                                          │ │
│  │  [User Input Box]  ← Type: "How should I structure     │ │
│  │                             this deal?"                  │ │
│  │                                                          │ │
│  │  [AI Response]     ← "Based on John's FICO (680) and   │ │
│  │                       WHACO cluster (Motivated Shopper),│ │
│  │                       I recommend..."                   │ │
│  │                                                          │ │
│  │  [Context Pills]   ← Deal #12345, John Doe, $45k Toyota│ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ WebSocket (real-time) or HTTP POST
                     │
┌────────────────────▼─────────────────────────────────────────┐
│              Gateway (Node.js BFF)                            │
│                                                              │
│  • Validates user session                                   │
│  • Extracts tenant context                                  │
│  • Routes to AI agent                                       │
│  • Streams responses back to frontend                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     │
┌────────────────────▼─────────────────────────────────────────┐
│              AI Agent Service (FastAPI)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Conversation Manager                           │ │
│  │  • Session management                                   │ │
│  │  • Message history                                      │ │
│  │  • Context injection                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              LLM Chain (LangChain)                      │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │ Prompt   │→│   LLM    │→│  Parser  │              │ │
│  │  │ Template │  │(OpenAI/  │  │          │              │ │
│  │  │          │  │Anthropic)│  │          │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘             │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Context Retriever (RAG)                        │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                   │ │
│  │  │  Vector DB   │  │  Knowledge   │                   │ │
│  │  │  (pgvector)  │  │  Base        │                   │ │
│  │  │              │  │  • Tax rules │                   │ │
│  │  │  Embeddings  │  │  • Policies  │                   │ │
│  │  │  of docs     │  │  • Training  │                   │ │
│  │  └──────────────┘  └──────────────┘                   │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Service Integrations                           │ │
│  │                                                          │ │
│  │  • Deal Service      → Get deal details                │ │
│  │  • Customer Service  → Get customer profile            │ │
│  │  • Inventory Service → Search vehicles                 │ │
│  │  • Calc Engine       → Calculate scenarios             │ │
│  │  • ML Service        → WHACO, Prime, Oscillator        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               PostgreSQL + pgvector                          │
│                                                              │
│  Tables:                                                    │
│  • ai_conversations    - Conversation history               │
│  • ai_messages         - Individual messages                │
│  • ai_context          - Deal/customer context snapshots    │
│  • knowledge_base      - Documents (vector embeddings)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. FastAPI Application

```python
# main.py

from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .routers import chat, context, suggestions
from .services import llm_service, rag_service, service_client
from .config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize services
    await llm_service.initialize()
    await rag_service.load_knowledge_base()
    yield
    # Shutdown: Cleanup
    await llm_service.cleanup()

app = FastAPI(
    title="Autolytiq AI Agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/ai", tags=["chat"])
app.include_router(context.router, prefix="/ai", tags=["context"])
app.include_router(suggestions.router, prefix="/ai", tags=["suggestions"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-agent"}
```

### 2. Chat Router (WebSocket + HTTP)

```python
# routers/chat.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict

router = APIRouter()

@router.post("/chat")
async def chat(
    message: str,
    deal_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    user_id: str = Depends(get_user_id),
):
    """
    Synchronous chat endpoint (HTTP POST)
    Returns full response after generation completes
    """
    # Get or create conversation
    conversation = await conversation_service.get_or_create(
        conversation_id=conversation_id,
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Build context from deal_id
    context = await build_deal_context(deal_id, tenant_id) if deal_id else {}

    # Generate response
    response = await llm_service.generate_response(
        message=message,
        context=context,
        conversation_history=conversation.messages,
    )

    # Save messages
    await conversation_service.add_messages(
        conversation_id=conversation.id,
        messages=[
            {"role": "user", "content": message},
            {"role": "assistant", "content": response},
        ],
    )

    return {
        "conversation_id": conversation.id,
        "response": response,
        "context": context,
    }


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    deal_id: Optional[str] = None,
):
    """
    WebSocket chat endpoint for streaming responses
    """
    await websocket.accept()

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message = data.get("message")

            # Build context
            context = await build_deal_context(deal_id, tenant_id) if deal_id else {}

            # Stream response chunks
            async for chunk in llm_service.generate_response_stream(
                message=message,
                context=context,
            ):
                await websocket.send_json({
                    "type": "chunk",
                    "content": chunk,
                })

            # Send completion signal
            await websocket.send_json({"type": "complete"})

    except WebSocketDisconnect:
        print("Client disconnected")
```

### 3. LLM Service (LangChain)

```python
# services/llm_service.py

from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, AsyncGenerator

class LLMService:
    def __init__(self):
        self.llm = None
        self.prompt_template = None

    async def initialize(self):
        """Initialize LLM based on config"""
        if settings.LLM_PROVIDER == "openai":
            self.llm = ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0.7,
                streaming=True,
            )
        elif settings.LLM_PROVIDER == "anthropic":
            self.llm = ChatAnthropic(
                model="claude-3-opus-20240229",
                temperature=0.7,
                streaming=True,
            )

        # Define system prompt
        self.system_prompt = """You are an expert automotive sales assistant for Autolytiq.

Your role is to help salespeople:
- Structure deals based on customer profiles and market conditions
- Answer questions about tax rules, financing, and inventory
- Provide coaching on sales techniques
- Analyze patterns across deals

You have access to:
- Deal details (customer, vehicle, pricing)
- WHACO customer clustering (identifies customer type: Prime Buyer, Tire Kicker, etc.)
- Prime Engine recommendations (ML-optimized deal strategies)
- Oscillator Network team coordination (optimal lead assignment)
- Tax rules for all 50 states
- Historical deal data

Always:
- Be concise and actionable
- Base recommendations on data (WHACO cluster, Prime strategy)
- Explain your reasoning
- Reference specific numbers (APR, payment, tax rates)
- Ask clarifying questions when needed

Context:
{context}

Conversation history:
{history}
"""

    async def generate_response(
        self,
        message: str,
        context: Dict,
        conversation_history: List[Dict],
    ) -> str:
        """Generate AI response (non-streaming)"""

        # Format conversation history
        history_messages = []
        for msg in conversation_history[-10:]:  # Last 10 messages
            if msg["role"] == "user":
                history_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                history_messages.append(AIMessage(content=msg["content"]))

        # Build prompt
        system_msg = SystemMessage(content=self.system_prompt.format(
            context=self._format_context(context),
            history=self._format_history(history_messages),
        ))

        user_msg = HumanMessage(content=message)

        # Generate
        response = await self.llm.ainvoke([system_msg, *history_messages, user_msg])

        return response.content

    async def generate_response_stream(
        self,
        message: str,
        context: Dict,
    ) -> AsyncGenerator[str, None]:
        """Generate AI response with streaming"""

        system_msg = SystemMessage(content=self.system_prompt.format(
            context=self._format_context(context),
            history="",
        ))

        user_msg = HumanMessage(content=message)

        # Stream chunks
        async for chunk in self.llm.astream([system_msg, user_msg]):
            if chunk.content:
                yield chunk.content

    def _format_context(self, context: Dict) -> str:
        """Format context for prompt injection"""
        if not context:
            return "No specific context provided."

        parts = []

        if "deal" in context:
            deal = context["deal"]
            parts.append(f"Deal #{deal['id']}: {deal['customer_name']} - {deal['vehicle_name']}")
            parts.append(f"Vehicle Price: ${deal['vehicle_price']:,.2f}")
            if deal.get("down_payment"):
                parts.append(f"Down Payment: ${deal['down_payment']:,.2f}")

        if "whaco_analysis" in context:
            whaco = context["whaco_analysis"]
            parts.append(f"\nWHACO Analysis:")
            parts.append(f"  Cluster: {whaco['cluster_name']} (confidence: {whaco['confidence']}%)")
            parts.append(f"  Recommendation: {whaco['recommendation']}")

        if "prime_recommendation" in context:
            prime = context["prime_recommendation"]
            parts.append(f"\nPrime Engine Strategy: {prime['strategy']}")
            parts.append(f"  Confidence: {prime['confidence']}%")
            for action in prime.get("recommendations", []):
                parts.append(f"  • {action['action']}: {action['reason']}")

        return "\n".join(parts)

llm_service = LLMService()
```

### 4. RAG Service (Retrieval-Augmented Generation)

```python
# services/rag_service.py

from langchain.vectorstores import PGVector
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List, Dict

class RAGService:
    def __init__(self):
        self.vectorstore = None
        self.embeddings = OpenAIEmbeddings()

    async def load_knowledge_base(self):
        """Initialize vector store from PostgreSQL"""
        connection_string = settings.DATABASE_URL

        self.vectorstore = PGVector(
            connection_string=connection_string,
            collection_name="autolytiq_knowledge",
            embedding_function=self.embeddings,
        )

    async def add_documents(self, documents: List[Dict]):
        """Add documents to knowledge base"""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )

        for doc in documents:
            # Split into chunks
            chunks = text_splitter.split_text(doc["content"])

            # Add to vector store
            self.vectorstore.add_texts(
                texts=chunks,
                metadatas=[{
                    "source": doc["source"],
                    "title": doc["title"],
                    "type": doc["type"],
                } for _ in chunks],
            )

    async def retrieve_relevant_docs(
        self,
        query: str,
        k: int = 5,
    ) -> List[Dict]:
        """Retrieve relevant documents for query"""
        results = self.vectorstore.similarity_search_with_score(query, k=k)

        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": score,
            }
            for doc, score in results
        ]

rag_service = RAGService()
```

### 5. Context Builder

```python
# services/context_builder.py

async def build_deal_context(deal_id: str, tenant_id: str) -> Dict:
    """Build comprehensive context for a deal"""

    # 1. Get deal details
    deal = await service_client.get_deal(deal_id, tenant_id)
    if not deal:
        return {}

    # 2. Get customer details
    customer = await service_client.get_customer(deal["customer_id"], tenant_id)

    # 3. Get WHACO analysis
    whaco_result = await service_client.classify_customer_whaco({
        "ficoScore": customer.get("fico_score"),
        "income": customer.get("income"),
        "downPaymentPercent": (deal.get("down_payment", 0) / deal["vehicle_price"]) * 100,
        "engagementScore": 0.7,  # TODO: Calculate from customer activity
    })

    # 4. Get Prime Engine recommendation
    prime_result = await service_client.get_prime_recommendation({
        "vehiclePrice": deal["vehicle_price"],
        "downPayment": deal.get("down_payment", 0),
        "termMonths": deal.get("term_months", 60),
        "customerFico": customer.get("fico_score"),
    })

    # 5. Get tax calculation
    tax_result = await service_client.calculate_tax({
        "state": customer["state"],
        "county": customer.get("county"),
        "zip_code": customer["zip_code"],
        "vehicle_price": deal["vehicle_price"],
        "trade_in_value": deal.get("trade_in_value"),
    })

    # 6. Retrieve relevant documents from RAG
    query = f"deal structuring for customer with FICO {customer.get('fico_score')} in {customer['state']}"
    relevant_docs = await rag_service.retrieve_relevant_docs(query, k=3)

    return {
        "deal": deal,
        "customer": customer,
        "whaco_analysis": whaco_result,
        "prime_recommendation": prime_result,
        "tax": tax_result,
        "knowledge": relevant_docs,
    }
```

### 6. Service Client (Integration Layer)

```python
# services/service_client.py

import httpx
from typing import Dict, Optional

class ServiceClient:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=10.0)
        self.deal_service_url = settings.DEAL_SERVICE_URL
        self.customer_service_url = settings.CUSTOMER_SERVICE_URL
        self.ml_service_url = settings.ML_SERVICE_URL
        self.calc_service_url = settings.CALC_SERVICE_URL

    async def get_deal(self, deal_id: str, tenant_id: str) -> Optional[Dict]:
        """Get deal from deal service"""
        response = await self.http_client.get(
            f"{self.deal_service_url}/deals/{deal_id}",
            headers={"X-Tenant-ID": tenant_id},
        )
        if response.status_code == 200:
            return response.json()
        return None

    async def get_customer(self, customer_id: str, tenant_id: str) -> Optional[Dict]:
        """Get customer from customer service"""
        response = await self.http_client.get(
            f"{self.customer_service_url}/customers/{customer_id}",
            headers={"X-Tenant-ID": tenant_id},
        )
        if response.status_code == 200:
            return response.json()
        return None

    async def classify_customer_whaco(self, features: Dict) -> Dict:
        """Classify customer using WHACO engine"""
        response = await self.http_client.post(
            f"{self.ml_service_url}/ml/whaco/classify",
            json=features,
        )
        return response.json()

    async def get_prime_recommendation(self, context: Dict) -> Dict:
        """Get deal strategy recommendation from Prime Engine"""
        response = await self.http_client.post(
            f"{self.ml_service_url}/ml/prime/recommend",
            json=context,
        )
        return response.json()

    async def calculate_tax(self, params: Dict) -> Dict:
        """Calculate tax via calc service"""
        response = await self.http_client.post(
            f"{self.calc_service_url}/calc/tax",
            json=params,
        )
        return response.json()

service_client = ServiceClient()
```

---

## Use Case Examples

### Use Case 1: Deal Structuring Advice

**User Input:**
```
"How should I structure this deal for John? He has a 680 FICO and wants to
keep payments under $500/month."
```

**AI Response (with context):**
```
Based on John's profile and our ML analysis, here's my recommendation:

**WHACO Analysis:**
John is classified as a "Motivated Shopper" (85% confidence).
This cluster has good credit, is actively engaged, and ready to buy.

**Prime Engine Strategy:**
Our ML model recommends the "balanced_structure" approach (78% success rate):
- Target 15% down payment ($6,750 on the $45k vehicle)
- 60-month term (sweet spot for approval odds vs. total cost)
- Shop for rates around 5.5-6.5% APR (appropriate for 680 FICO)

**Payment Projection:**
Amount financed: $38,250 ($45k - $6,750 down)
APR: 6.0% (target)
Term: 60 months
**Monthly Payment: $487** ✓ (under $500 target)

**Tax Calculation:**
California tax (7.25% state + 1% county): $3,262
No trade-in, so full tax on $45k.

**Next Steps:**
1. Present the 15% down / 60-month option
2. Explain total cost savings vs. 72-month term
3. Shop rates with 2-3 lenders (credit unions often best for 680 FICO)
4. If John balks at down payment, can extend to 72 months:
   Payment drops to $420/month, but adds $1,800 in interest

Want me to calculate other scenarios?
```

### Use Case 2: Tax Question

**User Input:**
```
"What's the tax on a $40k vehicle in Texas for a customer with a $5k trade-in?"
```

**AI Response:**
```
Texas Tax Breakdown:

**Taxable Amount:** $35,000
($40k vehicle - $5k trade-in credit)

Texas allows full trade-in credit, so you only pay tax on the net amount.

**Tax Calculation:**
- State tax: 6.25% × $35k = $2,187.50
- County tax: ~1.0% average × $35k = $350 (varies by county)
- City tax: ~1.0% average × $35k = $350 (varies by city)

**Total Tax: ~$2,888** (effective rate: 8.25%)

Note: Exact rate depends on county and city. Texas rates range from 6.25% (state only) to 8.25% (with local taxes).

Need the exact rate? Provide the customer's ZIP code and I'll calculate precisely.
```

### Use Case 3: Objection Handling

**User Input:**
```
"Customer says the payment is too high. What should I do?"
```

**AI Response:**
```
Payment Objection - Here's your playbook:

**1. Isolate the Objection:**
"I understand. Is the monthly payment the only concern, or are there other factors?"

**2. Discover the Target:**
"What monthly payment would work for your budget?"

**3. Options to Lower Payment:**

**Option A: Extend Term** (easiest)
- Current: $527/month (60 months)
- Extended: $451/month (72 months)
- Trade-off: +$1,620 total interest

**Option B: Increase Down Payment**
- Current: 10% down ($4,500)
- Increase to: 20% down ($9,000)
- New payment: $469/month (60 months)

**Option C: Adjust Vehicle** (if needed)
- Current vehicle: $45k
- Target vehicle: $38k (saves $82/month)
- Keeps 60-month term, similar total cost

**Best Practice:**
Don't just jump to 84-month term. That's often a band-aid.
Instead, use the "payment range" technique:

"Most customers in your situation are comfortable in the $450-$500 range.
Does that align with your budget?"

This anchors them at a realistic number before you present solutions.

**WHACO Insight:**
This customer is a "Motivated Shopper" - they WANT to buy.
Payment concerns are usually negotiation tactics, not deal-killers.
Stay confident and present options without pressure.

Want me to calculate specific scenarios?
```

---

## Knowledge Base (RAG)

### Document Types
1. **Tax Rules:** All 50 states, local tax variations
2. **Dealership Policies:** Doc fees, warranties, add-ons
3. **Sales Training:** Objection handling, closing techniques
4. **Product Brochures:** Vehicle features, trim levels, pricing
5. **Financing Guides:** APR ranges by credit tier, lender policies
6. **Compliance:** State laws, FTC regulations, truth-in-lending

### Document Ingestion
```python
# scripts/ingest_knowledge.py

async def ingest_tax_rules():
    """Ingest tax rule documents"""
    for state in ALL_STATES:
        doc = {
            "content": load_state_tax_rules(state),
            "source": f"tax_rules/{state}.md",
            "title": f"{state} Tax Rules",
            "type": "tax_rules",
        }
        await rag_service.add_documents([doc])

async def ingest_sales_training():
    """Ingest sales training materials"""
    training_docs = load_training_materials()
    for doc in training_docs:
        await rag_service.add_documents([{
            "content": doc["content"],
            "source": doc["filename"],
            "title": doc["title"],
            "type": "training",
        }])
```

---

## Database Schema

```sql
-- Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  deal_id UUID,                   -- Optional: if conversation is about specific deal
  title TEXT,                     -- Auto-generated from first message
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL,      -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  context JSONB,                  -- Snapshot of context at message time
  created_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge base (vector embeddings using pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),         -- OpenAI ada-002 embeddings
  metadata JSONB,                 -- { source, title, type, tags }
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```

---

## Performance & Scalability

### Response Times
- **Simple Q&A:** < 2s (no RAG retrieval)
- **Complex Q&A with RAG:** < 3s
- **Deal analysis:** < 5s (multiple service calls)
- **Streaming:** First token < 500ms

### Caching Strategy
```python
# Cache expensive operations
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
async def get_whaco_classification_cached(features_hash: str):
    """Cache WHACO classifications"""
    features = deserialize_features(features_hash)
    return await service_client.classify_customer_whaco(features)

def hash_features(features: Dict) -> str:
    """Create hash of features for cache key"""
    return hashlib.md5(json.dumps(features, sort_keys=True).encode()).hexdigest()
```

### Rate Limiting
- 100 messages/hour per user
- 1,000 messages/hour per tenant
- Burst allowance: 10 messages/minute

---

## Monitoring & Observability

### Metrics to Track
```python
from prometheus_client import Counter, Histogram

# Request metrics
ai_requests_total = Counter('ai_requests_total', 'Total AI requests', ['endpoint'])
ai_request_duration = Histogram('ai_request_duration_seconds', 'Request duration')
ai_llm_tokens = Counter('ai_llm_tokens_total', 'LLM tokens used', ['model'])
ai_errors = Counter('ai_errors_total', 'AI errors', ['error_type'])

# Usage metrics
ai_conversations_created = Counter('ai_conversations_created_total', 'Conversations created')
ai_messages_sent = Counter('ai_messages_sent_total', 'Messages sent', ['role'])

# Cost tracking
ai_llm_cost_usd = Counter('ai_llm_cost_usd_total', 'LLM API cost in USD')
```

### Logging
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "AI_RESPONSE_GENERATED",
    conversation_id=conversation_id,
    deal_id=deal_id,
    user_id=user_id,
    message_length=len(message),
    response_length=len(response),
    duration_ms=duration,
    llm_model=settings.LLM_MODEL,
    tokens_used=tokens,
)
```

---

## Security & Privacy

### Data Handling
- **No PII in logs:** Redact customer names, SSN, credit card numbers
- **Conversation encryption:** Encrypt sensitive messages at rest
- **Tenant isolation:** All queries filtered by tenant_id
- **Access control:** Users can only access their own conversations

### LLM Provider Security
```python
# Sanitize inputs before sending to LLM
def sanitize_message(message: str) -> str:
    """Remove/redact sensitive data from messages"""
    # Redact SSN patterns
    message = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN REDACTED]', message)
    # Redact credit card patterns
    message = re.sub(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b', '[CC REDACTED]', message)
    return message
```

---

## Deployment

### Environment Variables
```bash
# LLM Configuration
LLM_PROVIDER=openai                    # openai, anthropic, or local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7

# Vector DB
DATABASE_URL=postgresql://...
VECTOR_DIMENSIONS=1536                 # OpenAI ada-002

# Service URLs
DEAL_SERVICE_URL=http://deal-go:3003
CUSTOMER_SERVICE_URL=http://customer-go:3004
ML_SERVICE_URL=http://ml-py:3007
CALC_SERVICE_URL=http://gateway:3000/calc

# Rate Limiting
RATE_LIMIT_PER_USER=100               # Messages per hour
RATE_LIMIT_PER_TENANT=1000

# Caching
REDIS_URL=redis://redis:6379
CACHE_TTL_SECONDS=3600
```

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3006"]
```

---

## Testing Strategy

### Unit Tests
```python
# tests/test_llm_service.py

@pytest.mark.asyncio
async def test_generate_response():
    llm_service = LLMService()
    await llm_service.initialize()

    response = await llm_service.generate_response(
        message="What's the tax in California?",
        context={},
        conversation_history=[],
    )

    assert "California" in response
    assert "7.25%" in response or "tax" in response.lower()
```

### Integration Tests
```python
# tests/test_integration.py

@pytest.mark.asyncio
async def test_deal_context_building():
    """Test that context builder integrates all services"""
    context = await build_deal_context(
        deal_id="test-deal-123",
        tenant_id="test-tenant",
    )

    assert "deal" in context
    assert "whaco_analysis" in context
    assert "prime_recommendation" in context
    assert "tax" in context
```

---

## Cost Estimation

### LLM API Costs (OpenAI GPT-4)
- Input: $10 per 1M tokens
- Output: $30 per 1M tokens

**Typical conversation:**
- User message: ~50 tokens
- Context injection: ~500 tokens
- AI response: ~300 tokens
- **Total per exchange: ~850 tokens**

**Cost per exchange:** ~$0.026

**Monthly cost (1000 conversations, avg 10 exchanges each):**
- 10,000 exchanges × $0.026 = **$260/month**

### Vector DB (pgvector in PostgreSQL)
- Free (uses existing PostgreSQL)
- Storage: ~10GB for 100k documents

---

## Next Steps

1. **User Decisions:**
   - LLM provider choice (OpenAI vs Anthropic)
   - Vector DB choice (pgvector vs Pinecone)
   - Budget allocation for LLM API costs

2. **Implementation:**
   - Set up FastAPI project structure
   - Integrate LangChain
   - Build service clients
   - Ingest initial knowledge base

3. **Testing:**
   - Define test conversations
   - Validate responses
   - Load testing (concurrent users)

---

**Status:** AWAITING USER APPROVAL

**Critical Decision:** LLM Provider (OpenAI GPT-4 vs Anthropic Claude vs Local Model)
