# Calculation Engine Design - Rust/WASM Financial Engine

**Service:** calc-engine-rs
**Technology:** Rust → WebAssembly (WASM)
**Deployment:** Embedded in Gateway (in-process, zero network latency)
**Performance Target:** < 5ms for any calculation
**Last Updated:** 2025-11-23

---

## Overview

The Calculation Engine is the **financial heart** of Autolytiq. It handles all monetary calculations with:

- **Precision:** No floating-point errors (uses `rust_decimal` for exact decimal arithmetic)
- **Performance:** < 1ms for tax, < 5ms for complex amortization
- **Portability:** Runs in browser, Node.js, mobile (WASM)
- **State Rules:** 50 states + DC, each with unique calculation logic
- **Zero Dependencies:** No external API calls (all rules embedded)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    calc-engine-rs/                          │
│                                                             │
│  src/                                                       │
│  ├── lib.rs                  ← WASM exports                │
│  │                                                          │
│  ├── tax/                    ← Tax calculation engine      │
│  │   ├── mod.rs              ← Tax module root             │
│  │   ├── calculator.rs       ← Main tax logic              │
│  │   ├── state_rules.rs      ← State-specific rules        │
│  │   ├── local_tax.rs        ← County/city tax lookups     │
│  │   └── types.rs            ← Tax data types              │
│  │                                                          │
│  ├── cash/                   ← Cash deal calculations      │
│  │   ├── mod.rs                                            │
│  │   └── calculator.rs       ← Cash deal total             │
│  │                                                          │
│  ├── finance/                ← Finance calculations        │
│  │   ├── mod.rs                                            │
│  │   ├── payment.rs          ← Monthly payment calc        │
│  │   ├── amortization.rs     ← Payment schedule            │
│  │   └── apr.rs              ← APR calculations            │
│  │                                                          │
│  ├── lease/                  ← Lease calculations          │
│  │   ├── mod.rs                                            │
│  │   ├── payment.rs          ← Lease payment calc          │
│  │   └── residual.rs         ← Residual value              │
│  │                                                          │
│  ├── state_rules/            ← State-specific logic (50)   │
│  │   ├── mod.rs              ← State rule loader           │
│  │   ├── california.rs       ← CA-specific logic           │
│  │   ├── georgia.rs          ← GA TAVT logic               │
│  │   ├── texas.rs            ← TX rules                    │
│  │   ├── new_york.rs         ← NY DMV fees                 │
│  │   └── ... (46 more)                                     │
│  │                                                          │
│  ├── fees/                   ← Fee calculations            │
│  │   ├── mod.rs                                            │
│  │   ├── dmv_fees.rs         ← State DMV/registration      │
│  │   ├── doc_fees.rs         ← Documentation fees          │
│  │   └── dealer_fees.rs      ← Dealer-specific fees        │
│  │                                                          │
│  ├── models/                 ← Data models                 │
│  │   ├── deal.rs             ← Deal parameters             │
│  │   ├── vehicle.rs          ← Vehicle data                │
│  │   ├── customer.rs         ← Customer data               │
│  │   └── results.rs          ← Calculation results         │
│  │                                                          │
│  └── utils/                  ← Utilities                   │
│      ├── decimal.rs          ← Decimal helpers             │
│      ├── validation.rs       ← Input validation            │
│      └── formatting.rs       ← Currency formatting         │
│                                                             │
│  data/                       ← Embedded data files         │
│  ├── tax_rules.json          ← All 50 state tax rules      │
│  ├── local_rates.json        ← County/city tax rates       │
│  └── dmv_fees.json           ← State DMV fee schedules     │
│                                                             │
│  tests/                      ← Test suites                 │
│  ├── tax_tests.rs            ← Tax calculation tests       │
│  ├── finance_tests.rs        ← Finance tests               │
│  ├── lease_tests.rs          ← Lease tests                 │
│  ├── parity_tests.rs         ← Compare to TS implementation│
│  └── state_tests/            ← State-specific test cases   │
│      ├── test_california.rs                                │
│      ├── test_georgia.rs                                   │
│      └── ... (50 files)                                    │
│                                                             │
│  benches/                    ← Performance benchmarks      │
│  └── calculations.rs         ← Benchmark all calcs         │
└─────────────────────────────────────────────────────────────┘
```

---

## Module 1: Tax Calculations

### Input Types
```rust
use rust_decimal::Decimal;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TaxRequest {
    pub state: String,               // 2-letter code: "CA", "TX", etc.
    pub county: Option<String>,      // County name
    pub zip_code: String,            // ZIP code for local tax lookup
    pub vehicle_price: Decimal,
    pub trade_in_value: Option<Decimal>,
    pub is_lease: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaxResult {
    pub total_tax: Decimal,
    pub breakdown: TaxBreakdown,
    pub effective_rate: Decimal,     // As percentage
    pub method: TaxMethod,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaxBreakdown {
    pub state_tax: Decimal,
    pub county_tax: Option<Decimal>,
    pub city_tax: Option<Decimal>,
    pub district_tax: Option<Decimal>,  // CA special districts
    pub trade_in_credit: Option<Decimal>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TaxMethod {
    SalesTax,        // Most states
    TAVT,            // Georgia Title Ad Valorem Tax
    ExciseTax,       // Some states for used vehicles
    UsesTax,         // Out-of-state purchases
}
```

### Implementation

```rust
// src/tax/calculator.rs

pub fn calculate_tax(request: &TaxRequest) -> Result<TaxResult, CalcError> {
    // Validate inputs
    validate_state(&request.state)?;
    validate_zip(&request.zip_code)?;

    // Get state-specific rules
    let state_rules = get_state_rules(&request.state)?;

    // Calculate based on state method
    match state_rules.method {
        TaxMethod::SalesTax => calculate_sales_tax(request, state_rules),
        TaxMethod::TAVT => calculate_georgia_tavt(request, state_rules),
        TaxMethod::ExciseTax => calculate_excise_tax(request, state_rules),
        TaxMethod::UsesTax => calculate_uses_tax(request, state_rules),
    }
}

fn calculate_sales_tax(
    request: &TaxRequest,
    rules: StateTaxRules,
) -> Result<TaxResult, CalcError> {
    let mut breakdown = TaxBreakdown::default();

    // Calculate taxable amount (net of trade-in in most states)
    let taxable_amount = if rules.allows_trade_in_credit {
        request.vehicle_price - request.trade_in_value.unwrap_or_default()
    } else {
        request.vehicle_price
    };

    // State tax
    breakdown.state_tax = taxable_amount * rules.state_rate;

    // County tax (if applicable)
    if let Some(county) = &request.county {
        let county_rate = lookup_county_rate(&request.state, county)?;
        breakdown.county_tax = Some(taxable_amount * county_rate);
    }

    // Local tax (ZIP-based)
    let local_rates = lookup_local_rates(&request.zip_code)?;
    if let Some(city_rate) = local_rates.city_rate {
        breakdown.city_tax = Some(taxable_amount * city_rate);
    }
    if let Some(district_rate) = local_rates.district_rate {
        breakdown.district_tax = Some(taxable_amount * district_rate);
    }

    // Trade-in credit
    if rules.allows_trade_in_credit {
        let trade_credit = request.trade_in_value.unwrap_or_default() * rules.state_rate;
        breakdown.trade_in_credit = Some(trade_credit);
    }

    let total_tax = breakdown.state_tax
        + breakdown.county_tax.unwrap_or_default()
        + breakdown.city_tax.unwrap_or_default()
        + breakdown.district_tax.unwrap_or_default();

    let effective_rate = (total_tax / request.vehicle_price) * Decimal::from(100);

    Ok(TaxResult {
        total_tax,
        breakdown,
        effective_rate,
        method: TaxMethod::SalesTax,
    })
}
```

### State-Specific Examples

#### California
```rust
// src/state_rules/california.rs

pub struct CaliforniaRules;

impl CaliforniaRules {
    pub fn calculate_tax(request: &TaxRequest) -> Result<TaxResult, CalcError> {
        // CA state sales tax: 7.25%
        const CA_STATE_RATE: Decimal = Decimal::from_parts(725, 0, 0, false, 4);

        let mut breakdown = TaxBreakdown::default();

        // Taxable amount (CA allows trade-in credit)
        let taxable = request.vehicle_price - request.trade_in_value.unwrap_or_default();

        // State tax (7.25%)
        breakdown.state_tax = taxable * CA_STATE_RATE;

        // County tax (varies by county)
        if let Some(county) = &request.county {
            let county_rate = match county.as_str() {
                "Los Angeles" => Decimal::from_parts(100, 0, 0, false, 4), // 1.00%
                "San Diego" => Decimal::from_parts(50, 0, 0, false, 4),     // 0.50%
                "Orange" => Decimal::from_parts(100, 0, 0, false, 4),       // 1.00%
                _ => lookup_ca_county_rate(county)?,
            };
            breakdown.county_tax = Some(taxable * county_rate);
        }

        // District tax (special districts, varies by ZIP)
        let district_rate = lookup_ca_district_rate(&request.zip_code)?;
        if district_rate > Decimal::ZERO {
            breakdown.district_tax = Some(taxable * district_rate);
        }

        // Total tax
        let total_tax = breakdown.state_tax
            + breakdown.county_tax.unwrap_or_default()
            + breakdown.district_tax.unwrap_or_default();

        // Effective rate (can be 7.25% to 10.25% depending on location)
        let effective_rate = (total_tax / request.vehicle_price) * Decimal::from(100);

        Ok(TaxResult {
            total_tax,
            breakdown,
            effective_rate,
            method: TaxMethod::SalesTax,
        })
    }
}
```

#### Georgia (TAVT)
```rust
// src/state_rules/georgia.rs

pub struct GeorgiaRules;

impl GeorgiaRules {
    pub fn calculate_tavt(request: &TaxRequest) -> Result<TaxResult, CalcError> {
        // Georgia TAVT (Title Ad Valorem Tax): 7% one-time tax
        // Replaces annual ad valorem tax (property tax on vehicles)
        const GA_TAVT_RATE: Decimal = Decimal::from_parts(700, 0, 0, false, 4); // 7%

        // TAVT is on FULL vehicle price (no trade-in credit)
        let tavt = request.vehicle_price * GA_TAVT_RATE;

        let breakdown = TaxBreakdown {
            state_tax: tavt,
            county_tax: None,
            city_tax: None,
            district_tax: None,
            trade_in_credit: None,
        };

        Ok(TaxResult {
            total_tax: tavt,
            breakdown,
            effective_rate: Decimal::from(7), // Always 7%
            method: TaxMethod::TAVT,
        })
    }
}
```

#### Texas
```rust
// src/state_rules/texas.rs

pub struct TexasRules;

impl TexasRules {
    pub fn calculate_tax(request: &TaxRequest) -> Result<TaxResult, CalcError> {
        // TX state sales tax: 6.25%
        const TX_STATE_RATE: Decimal = Decimal::from_parts(625, 0, 0, false, 4);

        let mut breakdown = TaxBreakdown::default();

        // Texas allows trade-in credit
        let taxable = request.vehicle_price - request.trade_in_value.unwrap_or_default();

        // State tax (6.25%)
        breakdown.state_tax = taxable * TX_STATE_RATE;

        // County tax (varies, typically 0.5% - 2%)
        if let Some(county) = &request.county {
            let county_rate = lookup_tx_county_rate(county)?;
            breakdown.county_tax = Some(taxable * county_rate);
        }

        // City tax (varies, typically 0% - 2%)
        let city_rate = lookup_tx_city_rate(&request.zip_code)?;
        if city_rate > Decimal::ZERO {
            breakdown.city_tax = Some(taxable * city_rate);
        }

        let total_tax = breakdown.state_tax
            + breakdown.county_tax.unwrap_or_default()
            + breakdown.city_tax.unwrap_or_default();

        // TX total can be 6.25% to 8.25%
        let effective_rate = (total_tax / request.vehicle_price) * Decimal::from(100);

        Ok(TaxResult {
            total_tax,
            breakdown,
            effective_rate,
            method: TaxMethod::SalesTax,
        })
    }
}
```

---

## Module 2: Cash Deal Calculations

### Input/Output
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CashDealRequest {
    pub vehicle_price: Decimal,
    pub trade_in_value: Decimal,
    pub down_payment: Decimal,
    pub state: String,
    pub county: Option<String>,
    pub zip_code: String,
    pub doc_fee: Option<Decimal>,       // Dealer documentation fee
    pub dealer_fees: Vec<DealerFee>,    // Other dealer fees
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashDealResult {
    pub vehicle_price: Decimal,
    pub trade_in_value: Decimal,
    pub down_payment: Decimal,
    pub subtotal: Decimal,              // vehicle_price - trade_in - down
    pub tax: TaxResult,
    pub dmv_fees: DMVFees,
    pub dealer_fees: Vec<FeeLineItem>,
    pub total_due: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DMVFees {
    pub registration_fee: Decimal,
    pub title_fee: Decimal,
    pub plate_fee: Decimal,
    pub smog_fee: Option<Decimal>,      // CA, some other states
    pub inspection_fee: Option<Decimal>,// Some states require inspection
    pub total: Decimal,
}
```

### Implementation
```rust
// src/cash/calculator.rs

pub fn calculate_cash_deal(request: &CashDealRequest) -> Result<CashDealResult, CalcError> {
    // 1. Calculate tax
    let tax_request = TaxRequest {
        state: request.state.clone(),
        county: request.county.clone(),
        zip_code: request.zip_code.clone(),
        vehicle_price: request.vehicle_price,
        trade_in_value: Some(request.trade_in_value),
        is_lease: false,
    };
    let tax = calculate_tax(&tax_request)?;

    // 2. Calculate DMV/registration fees (state-specific)
    let dmv_fees = calculate_dmv_fees(&request.state, &request.vehicle_price)?;

    // 3. Sum dealer fees
    let dealer_fees_total = request.dealer_fees.iter()
        .map(|f| f.amount)
        .sum::<Decimal>();

    // 4. Calculate total due
    let subtotal = request.vehicle_price - request.trade_in_value;
    let total_due = subtotal
        + tax.total_tax
        + dmv_fees.total
        + dealer_fees_total
        - request.down_payment;

    Ok(CashDealResult {
        vehicle_price: request.vehicle_price,
        trade_in_value: request.trade_in_value,
        down_payment: request.down_payment,
        subtotal,
        tax,
        dmv_fees,
        dealer_fees: request.dealer_fees.clone(),
        total_due,
    })
}

fn calculate_dmv_fees(state: &str, vehicle_price: &Decimal) -> Result<DMVFees, CalcError> {
    match state {
        "CA" => calculate_ca_dmv_fees(vehicle_price),
        "TX" => calculate_tx_dmv_fees(vehicle_price),
        "NY" => calculate_ny_dmv_fees(vehicle_price),
        _ => calculate_default_dmv_fees(vehicle_price),
    }
}
```

---

## Module 3: Finance Calculations

### Input/Output
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceRequest {
    pub vehicle_price: Decimal,
    pub down_payment: Decimal,
    pub trade_in_value: Decimal,
    pub apr: Decimal,                   // Annual percentage rate (as decimal, e.g., 0.06 for 6%)
    pub term_months: u32,
    pub state: String,
    pub county: Option<String>,
    pub zip_code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceResult {
    pub amount_financed: Decimal,
    pub monthly_payment: Decimal,
    pub total_interest: Decimal,
    pub total_cost: Decimal,            // Total paid over life of loan
    pub total_due_at_signing: Decimal,  // Down payment + fees
    pub tax: TaxResult,
    pub dmv_fees: DMVFees,
    pub amortization_schedule: Vec<PaymentPeriod>,
    pub apr: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentPeriod {
    pub period: u32,
    pub payment: Decimal,
    pub principal: Decimal,
    pub interest: Decimal,
    pub balance: Decimal,
}
```

### Monthly Payment Calculation
```rust
// src/finance/payment.rs

pub fn calculate_monthly_payment(
    principal: Decimal,
    annual_rate: Decimal,
    term_months: u32,
) -> Decimal {
    if annual_rate == Decimal::ZERO {
        // No interest - simple division
        return principal / Decimal::from(term_months);
    }

    // Monthly interest rate
    let monthly_rate = annual_rate / Decimal::from(12);

    // Formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    // where P = principal, r = monthly rate, n = number of payments

    let one_plus_rate = Decimal::ONE + monthly_rate;
    let rate_power_n = one_plus_rate.powi(term_months as i64);

    let numerator = principal * monthly_rate * rate_power_n;
    let denominator = rate_power_n - Decimal::ONE;

    numerator / denominator
}
```

### Amortization Schedule
```rust
// src/finance/amortization.rs

pub fn generate_amortization_schedule(
    principal: Decimal,
    monthly_payment: Decimal,
    annual_rate: Decimal,
    term_months: u32,
) -> Vec<PaymentPeriod> {
    let monthly_rate = annual_rate / Decimal::from(12);
    let mut schedule = Vec::with_capacity(term_months as usize);
    let mut balance = principal;

    for period in 1..=term_months {
        // Interest for this period
        let interest = balance * monthly_rate;

        // Principal portion
        let principal_payment = monthly_payment - interest;

        // New balance
        balance -= principal_payment;

        // Handle final payment rounding
        let payment_amount = if period == term_months {
            monthly_payment + balance  // Pay off remaining balance
        } else {
            monthly_payment
        };

        schedule.push(PaymentPeriod {
            period,
            payment: payment_amount,
            principal: principal_payment,
            interest,
            balance: if period == term_months { Decimal::ZERO } else { balance },
        });

        if period == term_months {
            balance = Decimal::ZERO;
        }
    }

    schedule
}
```

---

## Module 4: Lease Calculations

### Input/Output
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct LeaseRequest {
    pub vehicle_price: Decimal,         // MSRP or agreed price
    pub residual_percent: Decimal,      // e.g., 0.55 for 55% residual
    pub money_factor: Decimal,          // e.g., 0.00125 (equiv to ~3% APR)
    pub term_months: u32,
    pub down_payment: Decimal,
    pub acquisition_fee: Option<Decimal>,
    pub state: String,
    pub zip_code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LeaseResult {
    pub capitalized_cost: Decimal,      // Net cap cost after down payment
    pub residual_value: Decimal,
    pub depreciation: Decimal,          // Total depreciation over lease
    pub base_payment: Decimal,          // Depreciation + finance charge
    pub tax_on_payment: Decimal,        // Monthly tax (most states)
    pub total_monthly_payment: Decimal,
    pub total_due_at_signing: Decimal,
    pub total_lease_cost: Decimal,      // All payments + due at signing
    pub money_factor: Decimal,
    pub equivalent_apr: Decimal,        // Money factor as APR
}
```

### Lease Payment Formula
```rust
// src/lease/payment.rs

pub fn calculate_lease_payment(request: &LeaseRequest) -> Result<LeaseResult, CalcError> {
    // Capitalized cost (net of down payment)
    let cap_cost = request.vehicle_price - request.down_payment
        + request.acquisition_fee.unwrap_or_default();

    // Residual value
    let residual_value = request.vehicle_price * request.residual_percent;

    // Total depreciation
    let depreciation = cap_cost - residual_value;

    // Depreciation portion of payment
    let depreciation_payment = depreciation / Decimal::from(request.term_months);

    // Finance charge (money factor × (cap cost + residual))
    let finance_charge = (cap_cost + residual_value) * request.money_factor;

    // Base payment (before tax)
    let base_payment = depreciation_payment + finance_charge;

    // Tax on lease payment (varies by state)
    let tax_rate = get_lease_tax_rate(&request.state, &request.zip_code)?;
    let tax_on_payment = base_payment * tax_rate;

    // Total monthly payment
    let total_monthly = base_payment + tax_on_payment;

    // Due at signing
    let due_at_signing = request.down_payment + total_monthly;  // First month + down

    // Total lease cost
    let total_cost = (total_monthly * Decimal::from(request.term_months)) + request.down_payment;

    // Convert money factor to APR (money_factor × 2400)
    let equivalent_apr = request.money_factor * Decimal::from(2400);

    Ok(LeaseResult {
        capitalized_cost: cap_cost,
        residual_value,
        depreciation,
        base_payment,
        tax_on_payment,
        total_monthly_payment: total_monthly,
        total_due_at_signing: due_at_signing,
        total_lease_cost: total_cost,
        money_factor: request.money_factor,
        equivalent_apr,
    })
}
```

---

## WASM Export Layer

### JavaScript Bindings
```rust
// src/lib.rs

use wasm_bindgen::prelude::*;
use serde_json;

#[wasm_bindgen]
pub fn calculate_tax_wasm(request_json: &str) -> String {
    let request: TaxRequest = serde_json::from_str(request_json)
        .expect("Invalid tax request JSON");

    let result = calculate_tax(&request)
        .expect("Tax calculation failed");

    serde_json::to_string(&result).unwrap()
}

#[wasm_bindgen]
pub fn calculate_cash_deal_wasm(request_json: &str) -> String {
    let request: CashDealRequest = serde_json::from_str(request_json)
        .expect("Invalid cash deal request JSON");

    let result = calculate_cash_deal(&request)
        .expect("Cash deal calculation failed");

    serde_json::to_string(&result).unwrap()
}

#[wasm_bindgen]
pub fn calculate_finance_wasm(request_json: &str) -> String {
    let request: FinanceRequest = serde_json::from_str(request_json)
        .expect("Invalid finance request JSON");

    let result = calculate_finance_deal(&request)
        .expect("Finance calculation failed");

    serde_json::to_string(&result).unwrap()
}

#[wasm_bindgen]
pub fn calculate_lease_wasm(request_json: &str) -> String {
    let request: LeaseRequest = serde_json::from_str(request_json)
        .expect("Invalid lease request JSON");

    let result = calculate_lease_payment(&request)
        .expect("Lease calculation failed");

    serde_json::to_string(&result).unwrap()
}

#[wasm_bindgen]
pub fn get_supported_states() -> String {
    let states = vec![
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
    ];
    serde_json::to_string(&states).unwrap()
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
```

### Usage from Gateway (Node.js)
```typescript
// gateway/src/services/calcService.ts

import { calculate_tax_wasm, calculate_finance_wasm, calculate_lease_wasm } from './wasm/calc_engine';

export class CalcService {
  async calculateTax(params: TaxParams): Promise<TaxResult> {
    const startTime = Date.now();

    // Call WASM function
    const resultJson = calculate_tax_wasm(JSON.stringify(params));
    const result = JSON.parse(resultJson);

    const duration = Date.now() - startTime;

    // Log performance
    logger.info({
      msg: 'TAX_CALCULATED',
      state: params.state,
      amount: params.vehicle_price,
      tax: result.total_tax,
      duration_ms: duration,
    });

    return result;
  }

  async calculateFinance(params: FinanceParams): Promise<FinanceResult> {
    const resultJson = calculate_finance_wasm(JSON.stringify(params));
    return JSON.parse(resultJson);
  }

  async calculateLease(params: LeaseParams): Promise<LeaseResult> {
    const resultJson = calculate_lease_wasm(JSON.stringify(params));
    return JSON.parse(resultJson);
  }
}
```

---

## Testing Strategy

### 1. Unit Tests (Per State)
```rust
// tests/state_tests/test_california.rs

#[test]
fn test_ca_basic_tax() {
    let request = TaxRequest {
        state: "CA".to_string(),
        county: Some("Los Angeles".to_string()),
        zip_code: "90001".to_string(),
        vehicle_price: Decimal::from(30000),
        trade_in_value: Some(Decimal::from(5000)),
        is_lease: false,
    };

    let result = calculate_tax(&request).unwrap();

    // CA: 7.25% state + 1% county = 8.25%
    // Taxable: $30k - $5k = $25k
    // Tax: $25k × 8.25% = $2,062.50
    assert_eq!(result.total_tax, Decimal::from_str("2062.50").unwrap());
}

#[test]
fn test_ca_no_trade_in() {
    let request = TaxRequest {
        state: "CA".to_string(),
        county: Some("San Diego".to_string()),
        zip_code: "92101".to_string(),
        vehicle_price: Decimal::from(40000),
        trade_in_value: None,
        is_lease: false,
    };

    let result = calculate_tax(&request).unwrap();

    // CA: 7.25% state + 0.5% county = 7.75%
    // Taxable: $40k
    // Tax: $40k × 7.75% = $3,100
    assert_eq!(result.total_tax, Decimal::from_str("3100.00").unwrap());
}
```

### 2. Parity Tests (Compare to TypeScript)
```rust
// tests/parity_tests.rs

#[test]
fn test_parity_with_typescript_tax_engine() {
    // Load test cases from TypeScript implementation
    let test_cases = load_typescript_test_cases();

    for case in test_cases {
        let rust_result = calculate_tax(&case.input).unwrap();

        // Compare results (within 1 cent tolerance for rounding)
        assert_approx_eq!(rust_result.total_tax, case.expected_tax, Decimal::from_str("0.01").unwrap());
    }
}
```

### 3. Property-Based Tests
```rust
// tests/property_tests.rs

use proptest::prelude::*;

proptest! {
    #[test]
    fn test_finance_payment_never_negative(
        principal in 10000.0..100000.0,
        apr in 0.01..0.20,
        term in 12u32..84u32,
    ) {
        let payment = calculate_monthly_payment(
            Decimal::from_f64(principal).unwrap(),
            Decimal::from_f64(apr).unwrap(),
            term,
        );

        assert!(payment > Decimal::ZERO);
    }
}
```

### 4. Performance Benchmarks
```rust
// benches/calculations.rs

use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_tax_calculation(c: &mut Criterion) {
    let request = TaxRequest {
        state: "CA".to_string(),
        county: Some("Los Angeles".to_string()),
        zip_code: "90001".to_string(),
        vehicle_price: Decimal::from(30000),
        trade_in_value: Some(Decimal::from(5000)),
        is_lease: false,
    };

    c.bench_function("calculate_tax_ca", |b| {
        b.iter(|| calculate_tax(black_box(&request)))
    });
}

criterion_group!(benches, benchmark_tax_calculation);
criterion_main!(benches);
```

---

## Build & Deployment

### Build for WASM
```bash
# Install wasm-pack
cargo install wasm-pack

# Build for Node.js (used by gateway)
wasm-pack build --target nodejs --out-dir ../gateway/src/wasm/calc_engine

# Build for browser (used by frontend)
wasm-pack build --target web --out-dir ../frontend/public/wasm

# Optimize for size
wasm-opt -Oz calc_engine_bg.wasm -o calc_engine_bg.wasm
```

### Cargo.toml
```toml
[package]
name = "calc-engine"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
rust_decimal = "1.33"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = "0.2"

[dev-dependencies]
proptest = "1.0"
criterion = "0.5"

[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
```

---

## Performance Targets

| Operation | Target | Measured |
|-----------|--------|----------|
| Tax calculation (simple) | < 1ms | TBD |
| Tax calculation (complex) | < 2ms | TBD |
| Cash deal total | < 2ms | TBD |
| Finance payment | < 3ms | TBD |
| Amortization schedule (84 months) | < 5ms | TBD |
| Lease payment | < 3ms | TBD |
| WASM load time | < 10ms | TBD |

---

## Migration from TypeScript

### Current Implementation
- `/shared/autoTaxEngine/taxCalculator.ts` (~1,500 lines)
- `/server/calculations.ts` (~800 lines)

### Migration Plan
1. **Phase 1:** Tax calculations (1 week)
   - Port core tax logic to Rust
   - Implement all 50 state rules
   - Write parity tests

2. **Phase 2:** Finance calculations (3 days)
   - Monthly payment formula
   - Amortization schedule generation

3. **Phase 3:** Lease calculations (2 days)
   - Lease payment formula
   - Money factor conversions

4. **Phase 4:** Integration (2 days)
   - WASM build pipeline
   - Gateway integration
   - Performance testing

---

## Next Steps

1. **User Approval** - Confirm scope and approach
2. **Create Repository** - `/services/calc-engine-rs/`
3. **Implement Core Types** - Data models and interfaces
4. **Port Tax Engine** - Start with simple states, add complex ones
5. **Write Tests** - 100+ test cases covering all states
6. **Build WASM** - Compile and integrate with gateway
7. **Performance Tuning** - Optimize for < 5ms targets
8. **Documentation** - API docs and state-specific rules

---

**Status:** AWAITING USER APPROVAL
