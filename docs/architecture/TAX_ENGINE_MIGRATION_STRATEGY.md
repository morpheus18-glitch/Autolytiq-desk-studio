# Tax Engine Migration Strategy - TypeScript → Rust/WASM

**Status:** READY FOR EXECUTION (after approval)
**Phase:** 2 of 5
**Estimated Duration:** 5-7 days
**Critical Success Factor:** 100% calculation parity with existing TypeScript

---

## Executive Summary

The tax calculation engine is the **crown jewel** of Autolytiq. It contains complex, state-specific tax logic that must be preserved perfectly during migration from TypeScript to Rust/WASM.

**Why Rust/WASM:**
- 10-100x performance improvement for CPU-intensive calculations
- Memory safety prevents runtime errors
- WASM enables client-side and server-side execution
- Strong type system catches errors at compile time
- Future-proof: can be used in mobile apps, edge functions, etc.

**Migration Approach:**
1. **Preserve logic, change language** - Not a rewrite, but a port
2. **Test-driven migration** - Every function validated against TypeScript output
3. **Side-by-side comparison** - Both engines run in parallel until confidence is 100%
4. **Incremental cutover** - Feature flag enables gradual rollout

---

## Current Tax Engine Inventory

### Files to Migrate

| File | Lines | Purpose | Priority |
|------|-------|---------|----------|
| `server/services/tax-engine-service.ts` | 285 | Main tax calculation service | **CRITICAL** |
| `client/src/lib/tax-calculator.ts` | 563 | Client-side tax calculations | **CRITICAL** |
| `shared/types/tax-engine.ts` | 144 | Type definitions | **CRITICAL** |
| `shared/tax-data.ts` | ~2000 | State tax data | **CRITICAL** |
| `shared/autoTaxEngine/*.ts` | ~3000 | State-specific rules | **CRITICAL** |
| `server/tax-routes.ts` | ~150 | API endpoints | Medium |
| `server/local-tax-service.ts` | ~100 | Local tax rate lookup | Medium |

**Total:** ~6,242 lines of tax-related code

### Core Algorithms

1. **Trade-In Credit Calculation**
   - Different methods per state: `tax_on_difference`, `full`, `partial`, `none`
   - Caps and limits (e.g., Illinois $10,000 limit)
   - Payoff consideration

2. **Taxable Amount Computation**
   - Base vehicle price
   - Trade-in credit (if applicable)
   - Dealer fees (state-dependent taxability)
   - Aftermarket products (GAP, VSC, warranties)
   - Luxury tax threshold checks

3. **Tax Rate Determination**
   - State base rate
   - County rate
   - City rate
   - Special district rate
   - Combined rate calculation

4. **Tax Method Selection** (Lease vs Retail)
   - `TAX_ON_PRICE` - Standard retail
   - `TAX_ON_PAYMENT` - Monthly lease payments (CA, TX)
   - `TAX_ON_CAP_COST` - Upfront on capitalized cost (NY, NJ)
   - `TAX_ON_CAP_REDUCTION` - Only on cap reduction (IL)
   - `SPECIAL_TAVT` - Georgia Title Ad Valorem Tax
   - `SPECIAL_HUT` - North Carolina Highway Use Tax
   - `SPECIAL_PRIVILEGE` - West Virginia Privilege Tax

5. **State-Specific Rules**
   - Doc fee caps (varies by state)
   - Luxury tax thresholds and rates
   - EV incentives and fees
   - Military exemptions
   - Native American reservation rules

### Test Coverage Analysis

**Existing Tests:**
- **Location:** `server/__tests__/tax-*.test.ts`
- **Count:** ~30 test cases
- **Coverage:**
  - California: ✅ Comprehensive
  - Texas: ✅ Good
  - Georgia (TAVT): ✅ Good
  - New York: ⚠️ Limited
  - Other states: ❌ Minimal

**Test Gaps:**
- Multi-state reciprocity
- Edge cases (luxury tax, EV fees)
- ZIP code boundary conditions
- Negative values (trade payoff > allowance)

---

## Migration Plan - Step by Step

### Phase 2.1: Setup Rust Project (Day 1)

**Tasks:**
1. Create `services/tax-engine-rs/` directory structure
2. Initialize Cargo.toml with dependencies
3. Setup WASM build toolchain (wasm-pack)
4. Configure Rust formatting and linting
5. Setup GitHub Actions for Rust tests

**Deliverables:**
- [ ] `Cargo.toml` with all dependencies
- [ ] `build.sh` script for WASM compilation
- [ ] `test.sh` script for running tests
- [ ] CI/CD pipeline for Rust tests

### Phase 2.2: Data Structures Migration (Day 1-2)

**Tasks:**
1. Port TypeScript types to Rust structs
2. Add Serde serialization/deserialization
3. Implement Display and Debug traits
4. Add validation methods

**Files to Create:**
- `src/models/address.rs` - CustomerAddress struct
- `src/models/tax_profile.rs` - TaxProfile struct
- `src/models/tax_method.rs` - TaxMethod enum
- `src/models/jurisdiction.rs` - Jurisdiction struct
- `src/models/rates.rs` - Tax rate structs
- `src/models/rules.rs` - State rule structs

**Example: Address Migration**

```typescript
// TypeScript (shared/types/tax-engine.ts)
export interface CustomerAddress {
  line1: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  county?: string;
}
```

```rust
// Rust (src/models/address.rs)
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CustomerAddress {
    pub line1: String,
    pub city: String,
    pub state: String,
    pub state_code: String,
    pub postal_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub county: Option<String>,
}

impl CustomerAddress {
    pub fn validate(&self) -> Result<(), String> {
        if self.state_code.len() != 2 {
            return Err("State code must be 2 characters".to_string());
        }
        if self.postal_code.is_empty() {
            return Err("Postal code required".to_string());
        }
        Ok(())
    }
}
```

### Phase 2.3: State Rules Migration (Day 2-3)

**Tasks:**
1. Convert `shared/tax-data.ts` to JSON
2. Create Rust structs for state rules
3. Implement JSON loader
4. Add state-specific logic modules

**Files to Create:**
- `data/state_rules.json` - All 50 states + DC
- `src/state_rules/mod.rs` - State rule loader
- `src/state_rules/loader.rs` - JSON parsing
- `src/state_rules/ca.rs` - California-specific logic
- `src/state_rules/tx.rs` - Texas-specific logic
- `src/state_rules/ga.rs` - Georgia TAVT logic
- ... (50+ state modules)

**Data Migration:**

```typescript
// TypeScript (shared/tax-data.ts)
export const STATE_TAX_DATA = {
  CA: {
    baseTaxRate: 0.0725,
    hasLocalTax: true,
    tradeInCredit: 'full',
    docFeeTaxable: true,
    maxDocFee: 85,
    // ... 100+ fields
  },
  // ... 50+ states
};
```

```json
// JSON (data/state_rules.json)
{
  "CA": {
    "base_tax_rate": 0.0725,
    "has_local_tax": true,
    "trade_in_credit": "full",
    "doc_fee_taxable": true,
    "max_doc_fee": 85,
    "fees": {
      "title_fee": 15,
      "registration_fee_base": 46
    },
    "lease_rules": {
      "method": "MONTHLY",
      "tax_on_monthly_payment": true
    }
  }
}
```

```rust
// Rust (src/state_rules/mod.rs)
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct StateRules {
    pub base_tax_rate: f64,
    pub has_local_tax: bool,
    pub trade_in_credit: TradeInCreditType,
    pub doc_fee_taxable: bool,
    pub max_doc_fee: Option<f64>,
    pub fees: FeeRules,
    pub lease_rules: Option<LeaseRules>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TradeInCreditType {
    Full,
    Partial,
    TaxOnDifference,
    None,
}

pub fn load_state_rules(state_code: &str) -> Result<StateRules, String> {
    let json_data = include_str!("../../data/state_rules.json");
    let rules: HashMap<String, StateRules> = serde_json::from_str(json_data)
        .map_err(|e| format!("Failed to parse state rules: {}", e))?;

    rules.get(state_code)
        .cloned()
        .ok_or_else(|| format!("State {} not found", state_code))
}
```

### Phase 2.4: Core Calculation Logic (Day 3-4)

**Tasks:**
1. Port retail tax calculation
2. Port lease tax calculation
3. Port trade-in credit logic
4. Port luxury tax calculation
5. Implement high-precision decimal math

**Files to Create:**
- `src/calculator/mod.rs` - Main calculator interface
- `src/calculator/retail.rs` - Retail calculations
- `src/calculator/lease.rs` - Lease calculations
- `src/calculator/trade_in.rs` - Trade-in credit
- `src/calculator/luxury.rs` - Luxury tax
- `src/utils/decimal.rs` - Decimal math helpers

**Example: Retail Tax Calculation**

```typescript
// TypeScript (client/src/lib/tax-calculator.ts)
export function calculateAutomotiveTax(options: TaxCalculationOptions): TaxCalculationResult {
  let taxableAmount = new Decimal(options.vehiclePrice || 0);

  // Trade-in credit
  if (options.tradeValue && options.tradeValue > 0) {
    const tradeAllowance = new Decimal(options.tradeValue);
    const tradePayoff = new Decimal(options.tradePayoff || 0);
    const tradeEquity = tradeAllowance.minus(tradePayoff);

    if (stateTax.tradeInCredit === 'tax_on_difference') {
      const creditAmount = Decimal.min(tradeAllowance, basePrice);
      taxableAmount = taxableAmount.minus(creditAmount);
    }
  }

  // Calculate tax
  const stateTax = taxableAmount.times(stateTax.baseTaxRate).toNumber();
  const localTax = taxableAmount.times(localRate).toNumber();

  return {
    taxableAmount: taxableAmount.toNumber(),
    stateTax,
    localTax,
    totalTax: stateTax + localTax,
    // ...
  };
}
```

```rust
// Rust (src/calculator/retail.rs)
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::models::*;
use crate::state_rules::*;

pub struct RetailTaxCalculator {
    state_rules: StateRules,
}

impl RetailTaxCalculator {
    pub fn new(state_rules: StateRules) -> Self {
        Self { state_rules }
    }

    pub fn calculate(&self, input: &TaxQuoteInput) -> TaxCalculationResult {
        let mut taxable_amount = Decimal::from_f64_retain(input.vehicle_price)
            .unwrap_or(dec!(0));

        // Trade-in credit
        if let (Some(trade_value), Some(trade_payoff)) =
            (input.trade_allowance, input.trade_payoff) {

            let trade_allowance = Decimal::from_f64_retain(trade_value)
                .unwrap_or(dec!(0));
            let trade_payoff_dec = Decimal::from_f64_retain(trade_payoff)
                .unwrap_or(dec!(0));
            let trade_equity = trade_allowance - trade_payoff_dec;

            match self.state_rules.trade_in_credit {
                TradeInCreditType::TaxOnDifference => {
                    let credit = trade_allowance.min(taxable_amount);
                    taxable_amount -= credit;
                }
                TradeInCreditType::Full => {
                    let credit = trade_allowance.min(taxable_amount);
                    taxable_amount -= credit;
                }
                TradeInCreditType::Partial => {
                    // Handle partial credit with cap
                    if let Some(cap) = self.state_rules.trade_in_credit_cap {
                        let cap_dec = Decimal::from_f64_retain(cap).unwrap();
                        let credit = trade_allowance.min(cap_dec).min(taxable_amount);
                        taxable_amount -= credit;
                    }
                }
                TradeInCreditType::None => {
                    // No credit
                }
            }
        }

        // Calculate state tax
        let state_rate = Decimal::from_f64_retain(self.state_rules.base_tax_rate)
            .unwrap_or(dec!(0));
        let state_tax = taxable_amount * state_rate;

        // Calculate local tax (if applicable)
        let local_tax = if self.state_rules.has_local_tax {
            if let Some(local_rate) = input.local_tax_rate {
                let rate = Decimal::from_f64_retain(local_rate).unwrap_or(dec!(0));
                taxable_amount * rate
            } else {
                dec!(0)
            }
        } else {
            dec!(0)
        };

        TaxCalculationResult {
            taxable_amount: taxable_amount.to_f64().unwrap_or(0.0),
            state_tax: state_tax.to_f64().unwrap_or(0.0),
            local_tax: local_tax.to_f64().unwrap_or(0.0),
            total_tax: (state_tax + local_tax).to_f64().unwrap_or(0.0),
            // ... other fields
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_retail_tax_ca() {
        let state_rules = StateRules {
            base_tax_rate: 0.0725,
            has_local_tax: true,
            trade_in_credit: TradeInCreditType::Full,
            doc_fee_taxable: true,
            max_doc_fee: Some(85.0),
            // ... other fields
        };

        let calculator = RetailTaxCalculator::new(state_rules);

        let input = TaxQuoteInput {
            vehicle_price: 50000.0,
            trade_allowance: None,
            trade_payoff: None,
            local_tax_rate: Some(0.01),
            // ... other fields
        };

        let result = calculator.calculate(&input);

        // CA: 7.25% state + 1% local = 8.25%
        // 50000 * 0.0825 = 4125
        assert!((result.total_tax - 4125.0).abs() < 0.01);
    }

    #[test]
    fn test_trade_in_credit_ca() {
        let state_rules = StateRules {
            base_tax_rate: 0.0725,
            trade_in_credit: TradeInCreditType::Full,
            // ...
        };

        let calculator = RetailTaxCalculator::new(state_rules);

        let input = TaxQuoteInput {
            vehicle_price: 50000.0,
            trade_allowance: Some(15000.0),
            trade_payoff: Some(5000.0),
            local_tax_rate: Some(0.01),
            // ...
        };

        let result = calculator.calculate(&input);

        // Trade equity: 15000 - 5000 = 10000
        // Taxable: 50000 - 10000 = 40000
        // Tax: 40000 * 0.0825 = 3300
        assert!((result.total_tax - 3300.0).abs() < 0.01);
    }
}
```

### Phase 2.5: WASM Bindings (Day 4)

**Tasks:**
1. Create WASM entry points with wasm-bindgen
2. Implement JSON serialization for inputs/outputs
3. Add error handling for JavaScript interop
4. Build WASM modules for web and Node.js

**Files to Create:**
- `src/wasm/mod.rs` - WASM module
- `src/wasm/bindings.rs` - JavaScript bindings

**Example:**

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_tax(input_json: &str) -> Result<String, JsValue> {
    // Parse input
    let input: TaxQuoteInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid input: {}", e)))?;

    // Load state rules
    let state_rules = state_rules::load_state_rules(&input.state_code)
        .map_err(|e| JsValue::from_str(&e))?;

    // Calculate tax
    let calculator = calculator::RetailTaxCalculator::new(state_rules);
    let result = calculator.calculate(&input);

    // Serialize output
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

// Export version info
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Export supported states
#[wasm_bindgen]
pub fn supported_states() -> Vec<JsValue> {
    vec![
        JsValue::from_str("CA"),
        JsValue::from_str("TX"),
        // ... all 50 states
    ]
}
```

### Phase 2.6: Integration with Gateway (Day 5)

**Tasks:**
1. Load WASM module in gateway
2. Create wrapper service
3. Add caching for WASM instance
4. Implement error handling and logging

**Files to Create:**
- `gateway/src/services/taxService.ts` - WASM wrapper
- `gateway/src/wasm/` - Compiled WASM modules (auto-generated)

**Example:**

```typescript
// gateway/src/services/taxService.ts
import { logger } from '../logger';

let wasmModule: any = null;

async function loadWasmModule() {
  if (!wasmModule) {
    try {
      // Dynamic import of WASM module
      const wasm = await import('../wasm/tax-engine-node/tax_engine.js');
      await wasm.default(); // Initialize WASM
      wasmModule = wasm;
      logger.info({ msg: 'WASM_MODULE_LOADED' });
    } catch (error) {
      logger.error({
        msg: 'WASM_LOAD_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  return wasmModule;
}

export async function calculateTax(input: TaxQuoteInput): Promise<TaxQuoteResponse> {
  const startTime = Date.now();

  try {
    const wasm = await loadWasmModule();

    logger.info({
      msg: 'TAX_CALC_STARTED',
      customerId: input.customerId,
      stateCode: input.stateCode,
    });

    const inputJson = JSON.stringify({
      customer_id: input.customerId,
      deal_type: input.dealType,
      vehicle_price: input.vehiclePrice,
      trade_allowance: input.tradeAllowance,
      trade_payoff: input.tradePayoff,
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

    if (duration > 100) {
      logger.warn({
        msg: 'TAX_CALC_SLOW',
        durationMs: duration,
        customerId: input.customerId,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      msg: 'TAX_CALC_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      customerId: input.customerId,
      stateCode: input.stateCode,
      durationMs: duration,
    });

    throw error;
  }
}
```

### Phase 2.7: Validation & Testing (Day 5-6)

**Tasks:**
1. Create comparison tests (TypeScript vs Rust)
2. Run all existing tax tests against Rust implementation
3. Add 50+ new test cases for edge cases
4. Performance benchmarks
5. Memory leak testing

**Test Strategy:**

```rust
// tests/integration/parity_tests.rs
use tax_engine::*;
use serde_json::json;

struct TestCase {
    name: &'static str,
    state: &'static str,
    vehicle_price: f64,
    trade_allowance: Option<f64>,
    trade_payoff: Option<f64>,
    expected_tax: f64,
}

const TEST_CASES: &[TestCase] = &[
    TestCase {
        name: "CA - Basic retail, no trade",
        state: "CA",
        vehicle_price: 50000.0,
        trade_allowance: None,
        trade_payoff: None,
        expected_tax: 3625.0, // 7.25% of 50000
    },
    TestCase {
        name: "CA - With trade-in credit",
        state: "CA",
        vehicle_price: 50000.0,
        trade_allowance: Some(15000.0),
        trade_payoff: Some(5000.0),
        expected_tax: 2900.0, // 7.25% of (50000 - 10000)
    },
    // ... 100+ test cases
];

#[test]
fn test_all_scenarios() {
    for test_case in TEST_CASES {
        let input = json!({
            "customer_id": "test",
            "deal_type": "RETAIL",
            "vehicle_price": test_case.vehicle_price,
            "trade_allowance": test_case.trade_allowance,
            "trade_payoff": test_case.trade_payoff,
            "state_code": test_case.state,
        });

        let result_json = calculate_tax(&input.to_string()).unwrap();
        let result: serde_json::Value = serde_json::from_str(&result_json).unwrap();

        let tax_amount = result["total_tax"].as_f64().unwrap();

        assert!(
            (tax_amount - test_case.expected_tax).abs() < 0.01,
            "{}: expected {}, got {}",
            test_case.name,
            test_case.expected_tax,
            tax_amount
        );
    }
}
```

**Performance Benchmark:**

```rust
// benches/tax_calculation.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use tax_engine::*;

fn benchmark_tax_calculation(c: &mut Criterion) {
    let input = r#"{
        "customer_id": "bench",
        "deal_type": "RETAIL",
        "vehicle_price": 50000.0,
        "state_code": "CA"
    }"#;

    c.bench_function("calculate_tax_ca", |b| {
        b.iter(|| calculate_tax(black_box(input)))
    });
}

criterion_group!(benches, benchmark_tax_calculation);
criterion_main!(benches);
```

### Phase 2.8: Side-by-Side Deployment (Day 7)

**Tasks:**
1. Feature flag for Rust vs TypeScript
2. Log comparison results
3. Monitor for discrepancies
4. Gradual rollout (10% → 50% → 100%)

**Gateway Implementation:**

```typescript
// gateway/src/services/taxService.ts
import { calculateTax as calculateTaxRust } from './taxServiceRust';
import { calculateTax as calculateTaxTypeScript } from './taxServiceTypeScript';

const USE_RUST_TAX_ENGINE = process.env.USE_RUST_TAX_ENGINE === 'true';
const RUST_ROLLOUT_PERCENTAGE = parseInt(process.env.RUST_ROLLOUT_PERCENTAGE || '0', 10);

export async function calculateTax(input: TaxQuoteInput): Promise<TaxQuoteResponse> {
  // Feature flag
  const useRust = USE_RUST_TAX_ENGINE ||
    (RUST_ROLLOUT_PERCENTAGE > 0 && Math.random() * 100 < RUST_ROLLOUT_PERCENTAGE);

  if (useRust) {
    try {
      const rustResult = await calculateTaxRust(input);

      // Also call TypeScript for comparison (in background)
      if (process.env.COMPARE_TAX_ENGINES === 'true') {
        calculateTaxTypeScript(input)
          .then((tsResult) => {
            const diff = Math.abs(rustResult.taxAmount - tsResult.taxAmount);
            if (diff > 0.01) {
              logger.warn({
                msg: 'TAX_CALC_MISMATCH',
                rustTax: rustResult.taxAmount,
                tsTax: tsResult.taxAmount,
                difference: diff,
                input,
              });
            }
          })
          .catch((error) => {
            logger.error({
              msg: 'TAX_CALC_TS_COMPARISON_FAILED',
              error: error.message,
            });
          });
      }

      return rustResult;
    } catch (error) {
      logger.error({
        msg: 'RUST_TAX_ENGINE_FAILED_FALLBACK_TO_TS',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to TypeScript
      return await calculateTaxTypeScript(input);
    }
  } else {
    return await calculateTaxTypeScript(input);
  }
}
```

---

## Validation Checklist

Before declaring Rust tax engine ready for production:

### Functional Validation
- [ ] All 50 states + DC have state rules
- [ ] All existing TypeScript tests pass with Rust
- [ ] 100+ new test cases added
- [ ] Edge cases covered (negative values, zero amounts, etc.)
- [ ] Luxury tax calculations verified
- [ ] Lease calculations match TypeScript
- [ ] Trade-in credit calculation parity
- [ ] Local tax rate lookups working

### Performance Validation
- [ ] Single calculation < 10ms (target: < 1ms)
- [ ] 1000 calculations < 1 second
- [ ] No memory leaks after 10,000 calculations
- [ ] WASM module loads < 50ms

### Integration Validation
- [ ] Gateway successfully loads WASM
- [ ] API endpoints return correct format
- [ ] Error handling works correctly
- [ ] Logging captures all events
- [ ] Feature flag toggles work

### Production Readiness
- [ ] Side-by-side comparison shows < 0.01 difference
- [ ] 7-day comparison in staging with zero discrepancies
- [ ] Load testing at 10x normal traffic
- [ ] Rollback plan tested and documented
- [ ] Monitoring and alerts configured

---

## Rollback Plan

If Rust tax engine causes issues:

1. **Immediate:** Set `USE_RUST_TAX_ENGINE=false` environment variable
2. **Fast:** Set `RUST_ROLLOUT_PERCENTAGE=0` to disable gradually
3. **Emergency:** Revert gateway deployment to previous version

All changes are backward-compatible. TypeScript engine remains fully functional.

---

## Success Metrics

**Performance:**
- Calculation time: < 1ms (vs 10-50ms TypeScript)
- 100x throughput improvement
- 90% reduction in CPU usage

**Accuracy:**
- 100% parity with TypeScript (< $0.01 difference)
- Zero production calculation errors
- Zero customer complaints about tax amounts

**Reliability:**
- 99.99% uptime
- Zero WASM crashes
- < 0.1% fallback to TypeScript

---

## Post-Migration Cleanup

After 30 days of successful Rust tax engine:

1. Remove TypeScript tax calculation code
2. Archive old tests
3. Update documentation
4. Remove feature flags
5. Celebrate 🎉

**Estimated savings:** 10,000+ lines of code removed

---

## Questions & Answers

**Q: What if we find a bug in the Rust implementation?**
A: Feature flag allows instant fallback to TypeScript. Fix in Rust, re-deploy with gradual rollout.

**Q: How do we handle state rule updates?**
A: Edit `data/state_rules.json`, rebuild WASM, redeploy gateway. Hot-reload capability can be added.

**Q: Can we use this for mobile apps?**
A: Yes! WASM runs on iOS/Android via JavaScriptCore. Same tax engine everywhere.

**Q: What about offline calculations?**
A: WASM can be bundled with the frontend for offline use. No server required.

**Q: Performance on older devices?**
A: WASM is highly optimized. Benchmarks show even on older phones, calculations take < 10ms.

---

**Next Steps:** Await approval, then begin Phase 2.1 (Rust project setup).
