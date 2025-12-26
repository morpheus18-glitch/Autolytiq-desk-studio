# Indiana Retail Vehicle Tax Kernel

**Kernel ID:** `indiana-retail-v1.0.0`
**Version:** 1.0.0
**Status:** Certified
**Last Updated:** 2025-12-24

---

## Overview

A **pure, deterministic, liability-critical** calculator kernel for Indiana retail vehicle purchases. This kernel calculates the 7% Indiana Vehicle Excise Tax with strict input validation and explicit out-of-scope refusal behavior.

### Key Features

- **Pure function**: No side effects, no external dependencies
- **Deterministic**: Same inputs → same outputs, always
- **Fail-loud**: Out-of-scope inputs return structured errors, not guesses
- **Fully auditable**: Step-by-step calculation notes and rule tracking
- **Legally sourced**: All rules cite Indiana Code and DOR guidance

---

## Quick Start

### Basic Usage

```typescript
import { calculateIndianaRetailTax } from './kernel';

const result = calculateIndianaRetailTax({
  vehiclePrice: 30000,
  dealType: 'RETAIL',
  docFee: 250,
  tradeInValue: 10000,
  rebateManufacturer: 2000,
});

if (result.success) {
  console.log(`Tax Due: $${result.breakdown.totalTax}`);
  console.log(`Taxable Base: $${result.breakdown.taxableBase}`);
} else {
  console.error(`Error: ${result.errorCode} - ${result.message}`);
}
```

### Example Output

```json
{
  "success": true,
  "kernelVersion": "indiana-retail-v1.0.0",
  "breakdown": {
    "taxableBase": 18250,
    "taxRate": 0.07,
    "totalTax": 1277.50,
    "baseComponents": {
      "vehiclePrice": 30000,
      "docFee": 250,
      "accessories": 0,
      "serviceContracts": 0,
      "gap": 0,
      "negativeEquity": 0,
      "otherTaxableFees": 0
    },
    "deductions": {
      "tradeInCredit": 10000,
      "manufacturerRebate": 2000
    },
    "reciprocity": {
      "creditApplied": 0,
      "originState": null,
      "originalTaxBeforeCredit": 1277.50
    }
  },
  "audit": {
    "rulesApplied": ["IN-RATE-001", "IN-R-001", "IN-R-002", "IN-R-004"],
    "notes": ["Step 1: Starting vehicle price: $30000.00", "..."],
    "calculatedAt": "2025-12-24T00:00:00.000Z"
  }
}
```

---

## Running Tests

### Prerequisites

Ensure you have the project dependencies installed:

```bash
cd /root/autolytiq-desk-studio
npm install
```

### Run All Tests

```bash
# From project root
npx vitest run shared/autoTaxEngine/certified-kernels/indiana-retail/kernel.spec.ts

# Or with watch mode
npx vitest watch shared/autoTaxEngine/certified-kernels/indiana-retail/kernel.spec.ts
```

### Run Specific Test Categories

```bash
# Golden test corpus only
npx vitest run -t "Golden Test Corpus"

# Invariant tests only
npx vitest run -t "Invariants"

# Critical bug regressions only
npx vitest run -t "Critical Bug Regressions"
```

### Expected Output

All 25+ tests should pass:

```
✓ Indiana Retail Kernel - Golden Test Corpus (25 tests)
✓ Indiana Retail Kernel - Invariants (7 tests)
✓ Indiana Retail Kernel - Edge Cases (15 tests)
✓ Indiana Retail Kernel - Audit Trail (4 tests)
✓ Indiana Retail Kernel - Determinism (2 tests)
✓ Indiana Retail Kernel - Critical Bug Regressions (4 tests)
```

---

## Input Schema

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `vehiclePrice` | number | Yes | - | Must be > 0 |
| `dealType` | `'RETAIL'` | Yes | - | Must be exactly `'RETAIL'` |
| `docFee` | number | No | 0 | 0-250 (statutory cap) |
| `tradeInValue` | number | No | 0 | ≥ 0 |
| `tradeInPayoff` | number | No | 0 | ≥ 0 |
| `rebateManufacturer` | number | No | 0 | ≥ 0 |
| `rebateDealer` | number | No | 0 | ≥ 0 (does NOT reduce tax) |
| `accessoriesAmount` | number | No | 0 | ≥ 0 |
| `serviceContracts` | number | No | 0 | ≥ 0 |
| `gap` | number | No | 0 | ≥ 0 |
| `otherFees` | array | No | [] | Fee entries |
| `originTaxInfo` | object | No | null | For reciprocity |

---

## Indiana Tax Rules Summary

### Rate
- **7% flat statewide** - No local variations (IC 6-6-1.1)

### Trade-In
- **FULL credit** - Dollar-for-dollar reduction (IC 6-6-5.1-27)

### Rebates (Critical Difference!)
- **Manufacturer**: Reduces taxable base (saves customer 7%)
- **Dealer**: Does NOT reduce taxable base (no tax savings)

### Doc Fee
- **Taxable** at 7%
- **$250 cap** per IC 6-6-5.5

### Backend Products (Retail)
- **Service Contracts**: Taxable
- **GAP Insurance**: Taxable
- Note: Both are NON-taxable on leases (out of scope)

### Negative Equity
- **Taxable** - Rolled into purchase price

### Reciprocity
- **Credit allowed** for tax paid to other states
- **Capped** at Indiana's 7% rate

---

## Error Codes

| Code | Description |
|------|-------------|
| `ERR_INVALID_VEHICLE_PRICE` | Vehicle price is zero, negative, or invalid |
| `ERR_UNSUPPORTED_DEAL_TYPE` | Not a RETAIL transaction |
| `ERR_DOC_FEE_EXCEEDS_CAP` | Doc fee > $250 (IC 6-6-5.5 violation) |
| `ERR_INVALID_TRADE_VALUE` | Invalid trade-in value |
| `ERR_INVALID_REBATE` | Invalid rebate amount |
| `ERR_INVALID_AMOUNT` | NaN, Infinity, or negative currency value |
| `ERR_LEASE_NOT_SUPPORTED` | Lease transaction (out of scope) |
| `ERR_COMMERCIAL_VEHICLE_NOT_SUPPORTED` | Commercial vehicle (out of scope) |
| `ERR_TAX_EXEMPT_NOT_SUPPORTED` | Tax-exempt transaction (out of scope) |
| `ERR_PRIVATE_PARTY_NOT_SUPPORTED` | Private party sale (out of scope) |

---

## Out of Scope

This kernel explicitly refuses (returns error for):

- ❌ Lease transactions (require MONTHLY tax method)
- ❌ Commercial vehicles (>16,000 lbs GVWR)
- ❌ RVs and motor homes
- ❌ Tax-exempt purchases
- ❌ Private party sales
- ❌ Dealer-to-dealer transfers
- ❌ Fleet purchases

---

## File Structure

```
indiana-retail/
├── README.md                 # This file
├── SCOPE_CONTRACT.md         # Detailed scope and invariants
├── RULE_SPECIFICATION.yaml   # Machine-readable rules with citations
├── kernel.ts                 # The certified kernel implementation
├── kernel.spec.ts            # Test suite (golden + invariant + edge)
└── golden-tests.json         # 25 deterministic test cases
```

---

## Legal Authority

All rules are sourced from:

1. **Indiana Code Title 6, Article 6** - Vehicle Excise Tax
2. **IC 6-6-5.5** - Dealer Doc Fee Cap ($250)
3. **IC 6-6-5.1-27** - Trade-in Exemption
4. **IC 6-6-5.1-23** - Reciprocity Credit
5. **Indiana DOR Sales Tax Information Bulletin #8** - Motor Vehicles

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-24 | Initial certified release |

---

## License

Internal use only. Part of Autolytiq Desk Studio.
