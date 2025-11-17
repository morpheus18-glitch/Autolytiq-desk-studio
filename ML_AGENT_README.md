# AI Agent + ML Optimization System

## Overview

This automotive desking tool now includes a **local AI agent** and **ML optimization layer** that provides intelligent deal analysis and recommendations without expensive API calls.

### Key Features

✅ **Local Deal Analyzer** - Rule-based AI that runs on your server (no API costs)
✅ **Prime Engine** - ML optimization using Thompson Sampling (learns from outcomes)
✅ **Tax Knowledge Base** - Integrated with existing local tax service
✅ **Deal Recommendations** - Actionable suggestions to improve deal structure
✅ **Risk Assessment** - Identify red flags and potential issues
✅ **Sales Talking Points** - AI-generated conversation starters for salespeople

---

## Architecture

```
┌─────────────────────────────────────────┐
│         API Endpoints                    │
│  /api/ml/analyze                         │
│  /api/ml/feedback                        │
│  /api/ml/performance                     │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     Deal Analyzer (Local AI)            │
│  • Deal scoring (0-100)                  │
│  • Recommendations                       │
│  • Risk assessment                       │
│  • Talking points                        │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   Prime Engine (ML Optimization)        │
│  • Thompson Sampling                     │
│  • Strategy selection                    │
│  • Online learning                       │
│  • Performance tracking                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      Local Tax Service                   │
│  • ZIP code → tax rates                  │
│  • Jurisdiction breakdowns               │
│  • 50-state coverage                     │
└─────────────────────────────────────────┘
```

---

## Components

### 1. Deal Analyzer (`server/services/deal-analyzer.ts`)

**Local AI agent that analyzes deals using rules and patterns.**

**Capabilities:**
- **Deal Scoring**: 0-100 score with letter grade (A-F)
- **Comprehensive Metrics**: LTV, payment-to-income, interest ratios
- **Actionable Recommendations**: Prioritized list of improvements
- **Risk Assessment**: Red flags and warning signs
- **Talking Points**: AI-generated conversation starters

**Key Methods:**
```typescript
await dealAnalyzer.analyzeDeal({
  vehiclePrice: 25000,
  downPayment: 2500,
  tradeValue: 5000,
  tradePayoff: 3000,
  termMonths: 60,
  interestRate: 5.9,
  zipCode: "90001",
  customerFico: 720,
  customerMonthlyIncome: 5000
});
```

**No API calls, no costs, runs locally!**

---

### 2. Prime Engine (`server/ml/prime-engine.ts`)

**ML optimization using Thompson Sampling (Multi-Armed Bandit algorithm).**

**Strategies:**
- **High Down Payment**: Push for 20%+ down
- **Extend Term**: Use longer terms for lower payments
- **Optimize Rate**: Focus on rate shopping
- **Maximize Trade**: Push trade value higher
- **Reduce Price**: Guide to lower price point
- **Add Co-Signer**: Recommend co-signer
- **Balanced Structure**: Moderate approach

**How it learns:**
1. Selects strategy based on past performance
2. You apply the strategy to a deal
3. You report the outcome (success/failure)
4. Engine updates probabilities automatically

**Key Methods:**
```typescript
// Get strategy recommendation
const recommendation = primeEngine.getRecommendation(dealContext);

// Record outcome (this is how it learns!)
primeEngine.recordOutcome("high_down_payment", true);

// View performance
const report = primeEngine.getPerformanceReport();
```

**Gets smarter with every deal!**

---

## API Endpoints

### POST `/api/ml/analyze`

Analyze a deal with local AI + ML recommendations.

**Request:**
```json
{
  "vehiclePrice": 25000,
  "downPayment": 2500,
  "tradeValue": 5000,
  "tradePayoff": 3000,
  "termMonths": 60,
  "interestRate": 5.9,
  "zipCode": "90001",
  "customerFico": 720,
  "customerMonthlyIncome": 5000
}
```

**Response:**
```json
{
  "analysis": {
    "dealScore": 78,
    "scoreGrade": "C",
    "monthlyPayment": 432.50,
    "amountFinanced": 22350,
    "taxBreakdown": {
      "taxAmount": 1850,
      "totalRate": 9.25,
      "jurisdiction": "Los Angeles, Los Angeles County, CA"
    },
    "recommendations": [
      {
        "type": "down_payment",
        "priority": "high",
        "current": 2500,
        "suggested": 5000,
        "reason": "Increase to 20% for optimal deal structure",
        "impact": "Qualify for better rates, lower monthly payment",
        "estimatedScoreIncrease": 15
      }
    ],
    "risks": [
      "⚠️ Low down payment (<5%) - increases lender risk"
    ],
    "talkingPoints": [
      "💰 Monthly payment: $433",
      "✅ Good credit - you have access to competitive financing",
      "👍 Solid deal - good approval potential"
    ],
    "dealMetrics": {
      "downPaymentPercent": 10,
      "loanToValue": 89.4,
      "paymentToIncome": 8.65,
      "totalInterest": 3650,
      "totalCost": 25950
    }
  },
  "mlOptimization": {
    "strategy": "Maximize Down Payment",
    "strategyKey": "high_down_payment",
    "confidence": 85,
    "description": "Push for 20%+ down payment...",
    "recommendations": [
      {
        "action": "increase_down",
        "from": 2500,
        "to": 5000,
        "reason": "ML model suggests maximizing down payment",
        "expectedImpact": "Improves approval odds by 25-30%"
      }
    ],
    "allStrategies": {
      "high_down_payment": {
        "name": "Maximize Down Payment",
        "successRate": 85,
        "trials": 20,
        "confidence": 85
      }
    }
  }
}
```

---

### POST `/api/ml/feedback`

Record deal outcome to train the ML engine.

**Request:**
```json
{
  "dealId": "123e4567-e89b-12d3-a456-426614174000",
  "strategyKey": "high_down_payment",
  "success": true,
  "metadata": {
    "closeDate": "2025-01-17",
    "finalPayment": 450.00,
    "customerSatisfaction": 5
  }
}
```

**Response:**
```json
{
  "status": "recorded",
  "strategyKey": "high_down_payment",
  "success": true,
  "timestamp": "2025-01-17T12:00:00.000Z"
}
```

**Call this when you know if a deal closed or not!**

---

### GET `/api/ml/performance`

Get ML engine performance metrics.

**Response:**
```json
{
  "strategies": {
    "high_down_payment": {
      "name": "Maximize Down Payment",
      "successRate": 85.5,
      "trials": 47,
      "confidence": 92,
      "confidenceInterval": [78.2, 92.8]
    },
    "extend_term": {
      "name": "Extend Term",
      "successRate": 72.3,
      "trials": 31,
      "confidence": 88,
      "confidenceInterval": [59.1, 85.5]
    }
  },
  "bestStrategy": "high_down_payment",
  "totalTrials": 156,
  "overallSuccessRate": 79.5,
  "lastUpdated": "2025-01-17T12:00:00.000Z"
}
```

---

### POST `/api/ml/reset` (Admin Only)

Reset ML statistics for testing.

**Response:**
```json
{
  "status": "reset",
  "message": "ML engine statistics have been reset",
  "timestamp": "2025-01-17T12:00:00.000Z"
}
```

---

## Data Files

### `server/data/ml_state.json`

Persists ML engine state (strategies and their performance).

**Auto-saved** every time you record feedback.

### `server/data/learned_patterns.json`

Stores learned patterns from deal outcomes.

**Updated** as the system learns from successful deals.

---

## Integration Examples

### Frontend Integration

```typescript
// Analyze a deal
const response = await fetch('/api/ml/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehiclePrice: 25000,
    downPayment: 2500,
    // ... other fields
  })
});

const { analysis, mlOptimization } = await response.json();

// Display deal score
console.log(`Deal Score: ${analysis.dealScore}/100 (${analysis.scoreGrade})`);

// Show recommendations
analysis.recommendations.forEach(rec => {
  console.log(`${rec.priority.toUpperCase()}: ${rec.reason}`);
});

// Show ML strategy
console.log(`ML recommends: ${mlOptimization.strategy}`);
```

### Record Outcome

```typescript
// When a deal closes (or is lost)
await fetch('/api/ml/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealId: deal.id,
    strategyKey: mlOptimization.strategyKey,
    success: dealClosed, // true if closed, false if lost
  })
});
```

---

## Testing

### Run Test Script

```bash
# First, login and save cookies
curl -X POST http://localhost:5000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"your_username","password":"your_password"}' \
  -c cookies.txt

# Run ML tests
./test-ml.sh
```

### Manual Testing

```bash
# Test 1: Analyze a deal
curl -X POST http://localhost:5000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "vehiclePrice": 25000,
    "downPayment": 2500,
    "zipCode": "90001",
    "customerFico": 720
  }' | jq .

# Test 2: Check performance
curl http://localhost:5000/api/ml/performance -b cookies.txt | jq .

# Test 3: Record feedback
curl -X POST http://localhost:5000/api/ml/feedback \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "dealId": "123e4567-e89b-12d3-a456-426614174000",
    "strategyKey": "high_down_payment",
    "success": true
  }' | jq .
```

---

## Benefits

### 💰 Cost Savings
- **No external API calls** (OpenAI, Anthropic, etc.)
- **No per-request fees**
- **Runs on your server** for free

### 🚀 Performance
- **Fast response times** (no network latency)
- **Always available** (no API rate limits)
- **Privacy-preserving** (data stays on your server)

### 🧠 Smart & Learning
- **Gets better over time** as it learns from outcomes
- **Contextual recommendations** based on customer profile
- **Confidence tracking** so you know which strategies work

### 📊 Actionable Insights
- **Deal scoring** helps prioritize efforts
- **Risk assessment** identifies problems early
- **Talking points** help salespeople communicate value

---

## How Thompson Sampling Works

Thompson Sampling is a **Multi-Armed Bandit** algorithm that balances:

1. **Exploitation**: Use strategies that have worked well in the past
2. **Exploration**: Try strategies we're uncertain about

### Example

After 50 deals:
- **High Down Payment**: 40 wins / 50 trials = 80% success
- **Extend Term**: 15 wins / 25 trials = 60% success
- **Optimize Rate**: 5 wins / 10 trials = 50% success

Thompson Sampling will:
- **Mostly select** "High Down Payment" (proven winner)
- **Sometimes try** "Optimize Rate" (uncertain, needs more data)
- **Occasionally use** "Extend Term" (decent, but not best)

As you record more outcomes, the engine gets smarter!

---

## Roadmap

### Short Term
- [ ] Add deal analyzer to deal worksheet UI
- [ ] Display ML recommendations in sidebar
- [ ] Auto-record feedback when deals close
- [ ] Performance dashboard for admins

### Medium Term
- [ ] Contextual strategies (by credit tier, vehicle type)
- [ ] A/B testing of different approaches
- [ ] Integration with CRM for outcome tracking
- [ ] Email summaries of ML insights

### Long Term
- [ ] Predictive models for approval likelihood
- [ ] Customer churn prediction
- [ ] Automated deal structuring
- [ ] Natural language insights

---

## Support

For questions or issues:

1. Check the API responses for detailed error messages
2. Review server logs for debugging
3. Examine `server/data/ml_state.json` to see learning progress
4. Reset statistics with `/api/ml/reset` if needed (admin only)

---

## Summary

You now have:

✅ **Local AI agent** for deal analysis (no API costs)
✅ **ML optimization** that learns from outcomes
✅ **Tax knowledge base** integrated with local service
✅ **4 API endpoints** ready to use
✅ **Test scripts** for validation

**Next steps:**
1. Integrate into your deal worksheet UI
2. Display recommendations to salespeople
3. Record outcomes when deals close
4. Watch the ML engine get smarter!

**Cost: $0/month** (everything runs locally) 🎉
