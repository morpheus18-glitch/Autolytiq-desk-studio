# Automotive Tax Intelligence Engine (ATIE)

A high-performance tax calculation engine written in Rust, compiled to WebAssembly for portable execution across browser, server, and embedded environments.

## What It Does

ATIE handles the computational complexity of automotive retail finance—specifically, the notoriously difficult problem of calculating taxes across 51 U.S. jurisdictions (50 states plus D.C.), each with its own rules for trade-in credits, rebate taxability, lease structures, and local surcharges.

The engine supports:

- **Retail installment sales** (traditional vehicle financing)
- **Lease transactions** (monthly vs. upfront tax, cap cost reduction handling)
- **Cash deals** (straightforward price-to-tax calculation)
- **Cross-state transactions** (bilateral reciprocity with credit/collection rules)

## Architecture

The engine uses a three-stage directed acyclic graph (DAG) for deterministic calculation:

```
Stage 1: BASE_COMPUTE      Stage 2: RECIP_RESOLVE      Stage 3: PAYMENT_CALC
─────────────────────  →   ────────────────────────  →  ─────────────────────
Transaction base (B_T)     Reciprocity regime           Monthly payment
Home-state base (B_H)      Credit factor (κ)            Total due at signing
Raw tax amounts            Origin credit                Interest/rent charge
```

This pipeline ensures consistent results regardless of input order and makes the calculation logic auditable.

### Key Components

| Module                     | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `bilateral.rs`             | 51×51 state reciprocity matrix with O(1) lookup            |
| `dag.rs`                   | Three-stage calculation pipeline                           |
| `jurisdiction_resolver.rs` | Address-to-tax-context resolution                          |
| `special_schemes.rs`       | State-specific calculators (GA TAVT, NC HUT, WV Privilege) |
| `swarm.rs`                 | Parallel multi-jurisdiction resolution                     |
| `glyphs.rs`                | Compact symbolic encoding of tax rules                     |
| `chunks.rs`                | Versioned, atomic rule composition                         |

## Building

Prerequisites:

- Rust 1.75+ (`rustup install stable`)
- `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown`)

```bash
# Run the test suite (100 tests)
cargo test

# Build WASM module for browsers
cargo build --target wasm32-unknown-unknown --release

# Optional: Use wasm-pack for JS bindings
wasm-pack build --target web --out-dir pkg
```

The release build applies size optimizations (`opt-level = "z"`, LTO, symbol stripping) resulting in a module under 100KB gzipped.

## Usage

### From JavaScript/TypeScript

```javascript
import init, { calculate_deal, resolve_state_reciprocity } from './pkg/tax_engine_rs.js';

await init();

// Calculate a financed deal
const result = calculate_deal(
  JSON.stringify({
    deal_type: 'FINANCE',
    state_code: 'TX',
    selling_price: 35000.0,
    trade_in: { gross_allowance: 8000.0, payoff_amount: 5000.0 },
    finance_input: { apr: 5.9, term_months: 60 },
  })
);

const deal = JSON.parse(result);
console.log(deal.payment.monthly); // $442.xx
console.log(deal.tax_breakdown.total); // $2,187.xx

// Check reciprocity between states
const recip = JSON.parse(resolve_state_reciprocity('IN', 'TX', '', 'RETAIL'));
console.log(recip.regime); // "CREDIT_CAP_THIS"
console.log(recip.kappa); // 0.0 (no adjustment needed)
```

### From Rust (Native)

```rust
use tax_engine_rs::{calculate_deal_native, DealInput, FinanceInput};

let input = DealInput {
    deal_type: DealType::Finance,
    state_code: "IN".to_string(),
    selling_price: 38000.0,
    // ... other fields
    finance_input: Some(FinanceInput {
        apr: 5.9,
        term_months: 60,
        payment_frequency: PaymentFrequency::Monthly,
    }),
    lease_input: None,
};

let result = calculate_deal_native(&input, None)?;
println!("Monthly payment: ${:.2}", result.payment.monthly);
```

### From Go (via wazero)

The companion `tax-service` uses [wazero](https://wazero.io/) for pure-Go WASM execution:

```go
result, err := taxEngine.CalculateDeal(ctx, dealInput)
if err != nil {
    return fmt.Errorf("tax calculation failed: %w", err)
}
```

## Testing

The test suite covers all major calculation paths:

```bash
cargo test

# Output:
# test result: ok. 100 passed; 0 failed; 0 ignored
```

Tests are organized by module:

- Unit tests for individual calculators
- Integration tests for the DAG pipeline
- Reciprocity matrix coverage for common state pairs
- Special scheme tests (GA, NC, WV, SC)

## State Coverage

All 50 states plus D.C. are implemented. Each state includes:

- Base state tax rate
- Trade-in credit policy (full, capped, none, percentage)
- Document fee taxability
- F&I product taxability (service contracts, GAP)
- Local tax applicability for vehicles
- Lease-specific rules
- Reciprocity behavior

Special schemes handled:

- **Georgia TAVT**: Title Ad Valorem Tax (7% on FMV, replaces sales tax)
- **North Carolina HUT**: Highway Use Tax (3% on purchase price)
- **West Virginia Privilege**: 5% privilege tax
- **South Carolina Cap**: Maximum $500 tax

## Why Rust + WASM

The previous TypeScript implementation accumulated 400+ type errors and exhibited floating-point inconsistencies across browsers. The Rust rewrite provides:

1. **Correctness**: The compiler catches off-by-one errors, null pointer dereferences, and type mismatches at compile time.
2. **Portability**: The same binary runs in Chrome, Safari, Firefox, Node.js, Deno, and server-side Go/Rust.
3. **Performance**: Native-speed execution (5-10× faster than interpreted JS for complex calculations).
4. **Auditability**: Strong types serve as documentation; the DAG structure makes data flow explicit.

## License

Proprietary - Autolytiq
