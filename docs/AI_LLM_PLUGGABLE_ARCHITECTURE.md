# AI Agent - Pluggable LLM Architecture

**Purpose:** Build AI chat assistant with swappable LLM providers - start free, upgrade when ready.

**Last Updated:** November 23, 2025
**Status:** ACTIVE - Build abstraction first, choose provider later

---

## Problem Statement

**Challenge:** LLM APIs are expensive at scale:
- OpenAI GPT-4: $0.01-0.03 per request
- Anthropic Claude: $0.015-0.025 per request
- At 10,000 requests/month: $100-300/month

**Solution:** Build provider-agnostic architecture. Start with free local models, upgrade to paid APIs when ROI justifies cost.

---

## Architecture: Provider Abstraction Layer

### Core Principle

> "The AI agent doesn't know or care which LLM it's using. It just knows the interface."

```
┌──────────────────────────────────────────────┐
│         AI Agent Application Layer           │
│  (Chat UI, RAG, Context Management)          │
└─────────────────┬────────────────────────────┘
                  │
                  │ Uses interface:
                  │ - chat(messages, context)
                  │ - stream(messages, context)
                  │
┌─────────────────▼────────────────────────────┐
│          LLM Provider Abstraction            │
│       (Pluggable Interface Layer)            │
└─────────────────┬────────────────────────────┘
                  │
         ┌────────┼────────┬────────┐
         │        │        │        │
    ┌────▼───┐┌──▼───┐┌───▼──┐┌────▼────┐
    │ OpenAI ││Claude││Ollama││Replicate│
    │Provider││Provider│Local ││ etc.    │
    └────────┘└──────┘└──────┘└─────────┘
```

---

## Provider Interface (TypeScript)

```typescript
// shared/types/llm-provider.ts

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMContext {
  dealId?: string;
  customerId?: string;
  userId: string;
  dealershipId: string;
  conversationHistory?: LLMMessage[];
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
}

export interface LLMStreamChunk {
  delta: string;
  done: boolean;
}

/**
 * Core LLM Provider Interface
 * All providers MUST implement this interface
 */
export interface ILLMProvider {
  /**
   * Provider name (e.g., "openai", "anthropic", "ollama")
   */
  readonly name: string;

  /**
   * Model name (e.g., "gpt-4", "claude-3-sonnet", "llama3")
   */
  readonly model: string;

  /**
   * Send a chat completion request
   */
  chat(messages: LLMMessage[], context?: LLMContext): Promise<LLMResponse>;

  /**
   * Stream a chat completion (for real-time UI updates)
   */
  stream(messages: LLMMessage[], context?: LLMContext): AsyncGenerator<LLMStreamChunk>;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get cost estimate for a request (in USD)
   */
  estimateCost(promptTokens: number, completionTokens: number): number;
}
```

---

## Provider Implementations

### 1. OpenAI Provider (Paid)

```typescript
// services/ai-agent-py/src/providers/openai_provider.py
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI
from .base import LLMProvider, LLMMessage, LLMResponse, LLMStreamChunk

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.name = "openai"
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> LLMResponse:
        start_time = time.time()

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=0.7,
            max_tokens=2000
        )

        return LLMResponse(
            content=response.choices[0].message.content,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
            model=self.model,
            provider=self.name,
            latency_ms=int((time.time() - start_time) * 1000)
        )

    async def stream(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> AsyncGenerator[LLMStreamChunk, None]:
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield LLMStreamChunk(
                    delta=chunk.choices[0].delta.content,
                    done=False
                )

        yield LLMStreamChunk(delta="", done=True)

    async def is_available(self) -> bool:
        try:
            await self.client.models.list()
            return True
        except:
            return False

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        # GPT-4 Turbo pricing (as of 2024)
        prompt_cost = (prompt_tokens / 1000) * 0.01  # $0.01 per 1K tokens
        completion_cost = (completion_tokens / 1000) * 0.03  # $0.03 per 1K tokens
        return prompt_cost + completion_cost
```

### 2. Anthropic Claude Provider (Paid)

```python
# services/ai-agent-py/src/providers/anthropic_provider.py
from anthropic import AsyncAnthropic

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.name = "anthropic"
        self.model = model
        self.client = AsyncAnthropic(api_key=api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> LLMResponse:
        # Convert messages to Claude format
        system_msg = next((m.content for m in messages if m.role == "system"), "")
        user_messages = [m for m in messages if m.role != "system"]

        response = await self.client.messages.create(
            model=self.model,
            system=system_msg,
            messages=[{"role": m.role, "content": m.content} for m in user_messages],
            max_tokens=2000
        )

        return LLMResponse(
            content=response.content[0].text,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
            model=self.model,
            provider=self.name,
            latency_ms=0  # Calculate from timing
        )

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        # Claude 3 Sonnet pricing
        prompt_cost = (prompt_tokens / 1000) * 0.003
        completion_cost = (completion_tokens / 1000) * 0.015
        return prompt_cost + completion_cost
```

### 3. Ollama Provider (FREE - Local)

```python
# services/ai-agent-py/src/providers/ollama_provider.py
import httpx

class OllamaProvider(LLMProvider):
    """
    Local LLM provider using Ollama
    FREE - runs on your hardware
    Models: llama3, mistral, codellama, etc.
    """

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.name = "ollama"
        self.model = model
        self.base_url = base_url

    async def chat(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> LLMResponse:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
                    "stream": False
                }
            )

            data = response.json()

            return LLMResponse(
                content=data["message"]["content"],
                usage={
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0),
                    "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
                },
                model=self.model,
                provider=self.name,
                latency_ms=data.get("total_duration", 0) // 1_000_000  # ns to ms
            )

    async def stream(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> AsyncGenerator[LLMStreamChunk, None]:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
                    "stream": True
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        yield LLMStreamChunk(
                            delta=data["message"]["content"],
                            done=data.get("done", False)
                        )

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return 0.0  # FREE!
```

### 4. Mock Provider (Testing)

```python
# services/ai-agent-py/src/providers/mock_provider.py
class MockProvider(LLMProvider):
    """For testing - returns canned responses"""

    def __init__(self):
        self.name = "mock"
        self.model = "test-model"

    async def chat(
        self,
        messages: list[LLMMessage],
        context: Optional[dict] = None
    ) -> LLMResponse:
        # Return canned response based on last user message
        last_message = next((m.content for m in reversed(messages) if m.role == "user"), "")

        if "tax" in last_message.lower():
            content = "The tax for this deal in California would be approximately 9.125%."
        elif "payment" in last_message.lower():
            content = "Based on the deal parameters, the monthly payment would be $847."
        else:
            content = "I can help you with that. What would you like to know?"

        return LLMResponse(
            content=content,
            usage={"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
            model=self.model,
            provider=self.name,
            latency_ms=50
        )

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return 0.0
```

---

## Provider Factory

```python
# services/ai-agent-py/src/providers/factory.py
from enum import Enum
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .ollama_provider import OllamaProvider
from .mock_provider import MockProvider

class LLMProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    MOCK = "mock"

class LLMProviderFactory:
    @staticmethod
    def create(
        provider_type: LLMProviderType,
        config: dict
    ) -> LLMProvider:
        if provider_type == LLMProviderType.OPENAI:
            return OpenAIProvider(
                api_key=config.get("api_key"),
                model=config.get("model", "gpt-4-turbo-preview")
            )

        elif provider_type == LLMProviderType.ANTHROPIC:
            return AnthropicProvider(
                api_key=config.get("api_key"),
                model=config.get("model", "claude-3-sonnet-20240229")
            )

        elif provider_type == LLMProviderType.OLLAMA:
            return OllamaProvider(
                base_url=config.get("base_url", "http://localhost:11434"),
                model=config.get("model", "llama3")
            )

        elif provider_type == LLMProviderType.MOCK:
            return MockProvider()

        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
```

---

## Configuration (Environment-Based)

```bash
# .env.development
LLM_PROVIDER=ollama  # FREE for development
LLM_MODEL=llama3
OLLAMA_BASE_URL=http://localhost:11434

# .env.staging
LLM_PROVIDER=openai  # Paid for staging (testing costs)
LLM_MODEL=gpt-3.5-turbo  # Cheaper model for staging
OPENAI_API_KEY=sk-...

# .env.production
LLM_PROVIDER=anthropic  # When you're ready to pay for best quality
LLM_MODEL=claude-3-opus-20240229
ANTHROPIC_API_KEY=sk-ant-...
```

---

## AI Agent Service (Provider-Agnostic)

```python
# services/ai-agent-py/src/agent.py
from .providers.factory import LLMProviderFactory, LLMProviderType
from .rag import RAGEngine
from .context import ContextBuilder

class AIAgent:
    def __init__(self, config: dict):
        # Create LLM provider from config (swappable!)
        self.llm = LLMProviderFactory.create(
            provider_type=LLMProviderType(config["llm_provider"]),
            config=config
        )

        self.rag = RAGEngine(config)
        self.context_builder = ContextBuilder(config)

    async def chat(
        self,
        user_message: str,
        user_id: str,
        conversation_id: str,
        context: dict
    ) -> str:
        # 1. Build context from deal/customer/inventory data
        system_context = await self.context_builder.build(context)

        # 2. Retrieve relevant knowledge from RAG
        rag_context = await self.rag.retrieve(user_message, context)

        # 3. Build message list
        messages = [
            {"role": "system", "content": system_context + "\n\n" + rag_context},
            {"role": "user", "content": user_message}
        ]

        # 4. Call LLM (doesn't know which provider!)
        response = await self.llm.chat(messages, context)

        # 5. Log usage and cost
        await self.log_usage(response, user_id, conversation_id)

        return response.content

    async def log_usage(self, response: LLMResponse, user_id: str, conversation_id: str):
        # Track usage for billing/analytics
        cost = self.llm.estimate_cost(
            response.usage["prompt_tokens"],
            response.usage["completion_tokens"]
        )

        logger.info({
            "event": "LLM_USAGE",
            "provider": response.provider,
            "model": response.model,
            "user_id": user_id,
            "conversation_id": conversation_id,
            "tokens": response.usage["total_tokens"],
            "cost_usd": cost,
            "latency_ms": response.latency_ms
        })
```

---

## Switching Providers (Runtime)

### Option 1: Environment Variable (Deploy-Time)

```bash
# Start with free local model
export LLM_PROVIDER=ollama
export LLM_MODEL=llama3

# When ready to upgrade
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4-turbo-preview
export OPENAI_API_KEY=sk-...

# Restart service - no code changes needed!
```

### Option 2: Admin UI (Runtime)

```python
# API endpoint to change provider
@app.post("/api/admin/llm-config")
async def update_llm_config(config: LLMConfig):
    # Update config in database
    await db.settings.update_one(
        {"key": "llm_provider"},
        {"$set": {"value": config.provider, "model": config.model}}
    )

    # Reload agent with new provider
    global ai_agent
    ai_agent = AIAgent(config.dict())

    return {"status": "LLM provider updated", "provider": config.provider}
```

---

## Cost Comparison & Recommendations

### Development Phase (Month 1-3)

**Recommendation: Ollama (FREE)**
- Models: Llama 3 (8B), Mistral (7B), CodeLlama
- Cost: $0
- Quality: Good enough for development
- Speed: Fast (runs locally)

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download model
ollama pull llama3

# Verify
ollama run llama3 "Hello!"
```

### Testing/Staging Phase (Month 4-6)

**Recommendation: OpenAI GPT-3.5 Turbo**
- Cost: $0.0005-0.002 per request (~$5-20/month for testing)
- Quality: Good
- Speed: Fast

### Production Phase (Month 6+)

**Option A: OpenAI GPT-4 Turbo**
- Cost: $0.01-0.03 per request (~$100-300/month at 10K requests)
- Quality: Excellent
- Speed: Medium

**Option B: Anthropic Claude 3 Sonnet**
- Cost: $0.003-0.015 per request (~$50-150/month)
- Quality: Excellent
- Speed: Medium

**Option C: Hybrid (Smart)**
- Simple queries → Ollama (FREE)
- Complex queries → GPT-4 (Paid)
- Route based on complexity/cost threshold

---

## Migration Path

### Phase 1: Development (Now - FREE)
```
Ollama + Llama 3
├─ Cost: $0/month
├─ Quality: 7/10
└─ Good for: Feature development, testing
```

### Phase 2: Beta Testing ($5-20/month)
```
OpenAI GPT-3.5 Turbo
├─ Cost: $5-20/month
├─ Quality: 8/10
└─ Good for: Real user testing, feedback
```

### Phase 3: Production Launch ($100-300/month)
```
Anthropic Claude 3 Sonnet (or GPT-4)
├─ Cost: $100-300/month
├─ Quality: 9.5/10
└─ Good for: Production with paying customers
```

### Phase 4: Scale Optimization
```
Hybrid Routing:
├─ 70% queries → Fine-tuned local model (FREE)
├─ 20% queries → GPT-3.5 ($20/month)
└─ 10% queries → Claude 3 Opus ($30/month)
Total: ~$50/month vs $300/month
```

---

## Testing Strategy

### 1. Unit Tests (Provider-Agnostic)

```python
# tests/unit/test_agent.py
import pytest
from ai_agent.agent import AIAgent
from ai_agent.providers.mock_provider import MockProvider

@pytest.fixture
def agent():
    config = {"llm_provider": "mock"}
    return AIAgent(config)

async def test_chat_responds(agent):
    response = await agent.chat(
        user_message="What's the tax in California?",
        user_id="user-123",
        conversation_id="conv-456",
        context={"dealId": "deal-789"}
    )

    assert "tax" in response.lower()
    assert len(response) > 0
```

### 2. Integration Tests (Real Providers)

```python
# tests/integration/test_providers.py
@pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="Requires OpenAI API key"
)
async def test_openai_provider():
    provider = OpenAIProvider(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-3.5-turbo"
    )

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is 2+2?"}
    ]

    response = await provider.chat(messages)

    assert "4" in response.content
    assert response.usage["total_tokens"] > 0
    assert provider.estimate_cost(
        response.usage["prompt_tokens"],
        response.usage["completion_tokens"]
    ) > 0
```

---

## Monitoring & Cost Control

### Track LLM Usage

```python
# Log every LLM call
logger.info({
    "event": "LLM_CALL",
    "provider": "openai",
    "model": "gpt-4",
    "user_id": "user-123",
    "tokens": 1500,
    "cost_usd": 0.045,
    "latency_ms": 2300
})
```

### Cost Alerts

```python
# Alert if daily cost exceeds threshold
daily_cost = await get_daily_llm_cost()
if daily_cost > 10.0:  # $10/day = $300/month
    await send_alert(f"LLM cost alert: ${daily_cost:.2f} today")
```

### Rate Limiting

```python
# Limit queries per user
@app.post("/api/chat")
@rate_limit(max_requests=20, window=3600)  # 20/hour
async def chat_endpoint(request: ChatRequest):
    ...
```

---

## Decision Matrix

| Criteria | Ollama (FREE) | OpenAI GPT-3.5 | GPT-4 | Claude 3 |
|----------|---------------|----------------|-------|----------|
| **Cost** | 🟢 $0 | 🟡 $5-20/mo | 🔴 $100-300/mo | 🟡 $50-150/mo |
| **Quality** | 🟡 7/10 | 🟡 8/10 | 🟢 9.5/10 | 🟢 9.5/10 |
| **Speed** | 🟢 Fast | 🟢 Fast | 🟡 Medium | 🟡 Medium |
| **Setup** | 🟡 Local install | 🟢 API key | 🟢 API key | 🟢 API key |
| **Privacy** | 🟢 Fully local | 🔴 Cloud | 🔴 Cloud | 🔴 Cloud |

**Recommendation for Autolytiq:**
1. **Now:** Ollama (Llama 3) - FREE, build features
2. **Beta (Month 4):** OpenAI GPT-3.5 - Cheap, test with users
3. **Production (Month 6):** Claude 3 Sonnet - Best quality, reasonable cost

---

## Summary

**You get:**
- ✅ Build AI agent NOW with $0 cost
- ✅ Swap providers anytime (env var change)
- ✅ Test all providers independently
- ✅ Choose based on ROI, not sunk cost
- ✅ Scale down cost later with hybrid routing

**No commitment to expensive APIs until you're ready.**
