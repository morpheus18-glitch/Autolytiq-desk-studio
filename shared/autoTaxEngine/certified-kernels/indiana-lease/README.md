# Indiana Lease Vehicle Tax Kernel

**Kernel ID:** `indiana-lease-v1.0.0`
**Version:** 1.0.0
**Tax Method:** MONTHLY (tax on each payment)
**Last Updated:** 2025-12-24

---

## Overview

A **pure, deterministic, liability-critical** calculator kernel for Indiana vehicle leases. Uses MONTHLY taxation method where tax is applied to each payment as it's made.

### Critical Differences from Retail

| Item | Retail | Lease | Savings on Lease |
|------|--------|-------|------------------|
| **Service Contracts (VSC)** | TAXABLE | NOT taxable | 7% of VSC amount |
| **GAP Insurance** | TAXABLE | NOT taxable | 7% of GAP amount |
| **Cap Cost Reductions** | N/A | NOT taxed | - |
| **When Tax Collected** | Upfront | Monthly | Lower inception cost |

**Example Savings:** $2,500 VSC + $895 GAP = **$237.65 saved** by leasing vs buying.

---

## Quick Start

```typescript
import { calculateIndianaLeaseTax } from './kernel';

const result = calculateIndianaLeaseTax({
  dealType: 'LEASE',
  grossCapCost: 35000,
  baseMonthlyPayment: 450,
  paymentCount: 36,
  residualValue: 18000,
  docFee: 250,
  serviceContracts: 2500,  // NOT taxed on leases!
  gap: 895,                 // NOT taxed on leases!
});

if (result.success) {
  console.log(`Upfront Tax: $${result.breakdown.upfront.taxAmount}`);
  console.log(`Monthly Tax: $${result.breakdown.monthly.taxPerPayment}`);
  console.log(`Total Over Term: $${result.breakdown.totalTaxOverTerm}`);
  console.log(`Savings vs Retail: $${result.breakdown.backendProductsNotTaxed.taxSavingsVsRetail}`);
}
```

### Example Output

```json
{
  "success": true,
  "kernelVersion": "indiana-lease-v1.0.0",
  "breakdown": {
    "upfront": {
      "taxableBase": 700,
      "taxAmount": 49.00,
      "components": {
        "docFeeTax": 17.50,
        "firstPaymentTax": 31.50
      }
    },
    "monthly": {
      "basePayment": 450,
      "taxPerPayment": 31.50,
      "totalPaymentWithTax": 481.50
    },
    "totalTaxOverTerm": 1151.50,
    "backendProductsNotTaxed": {
      "serviceContracts": 2500,
      "gap": 895,
      "taxSavingsVsRetail": 237.65
    }
  }
}
```

---

## Running Tests

```bash
# From project root
npx vitest run shared/autoTaxEngine/certified-kernels/indiana-lease/kernel.spec.ts
```

---

## Indiana Lease Tax Rules Summary

### Tax Method: MONTHLY
- Tax applied to each monthly payment at 7%
- Doc fee taxed **upfront** at signing
- First payment taxed if due at signing

### What's NOT Taxed on Leases
- **Service Contracts (VSC)** - Saves 7%
- **GAP Insurance** - Saves 7%
- **Cap Cost Reductions** - Cash, rebates, trade-in equity

### Doc Fee
- **Taxable** upfront at 7%
- **$250 cap** per IC 6-6-5.5

### Calculation Formula

```
Upfront Tax = (Doc Fee + First Payment*) × 7%
Monthly Tax = Base Payment × 7%
Total Tax = Upfront + (Monthly × Remaining Payments)

* If first payment due at signing
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `ERR_INVALID_PAYMENT` | Zero or negative monthly payment |
| `ERR_INVALID_TERM` | Zero or negative payment count |
| `ERR_INVALID_CAP_COST` | Invalid gross cap cost |
| `ERR_DOC_FEE_EXCEEDS_CAP` | Doc fee > $250 |
| `ERR_RETAIL_NOT_SUPPORTED` | Use retail kernel instead |
| `ERR_LEASE_BUYOUT_NOT_SUPPORTED` | Buyouts out of scope |

---

## Legal Authority

1. **IC 6-6-5.1** - Vehicle Excise Tax (Leases)
2. **IC 6-6-5.5** - Doc Fee Cap ($250)
3. **Indiana DOR Sales Tax Information Bulletin #8** - Motor Vehicles

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-24 | Initial certified release |
