# Calculator Kernel Scope Contract

## Indiana Lease Vehicle Tax Calculator

**Kernel ID:** `indiana-lease-v1.0.0`
**Version:** 1.0.0
**Status:** Certification In Progress
**Created:** 2025-12-24
**Last Updated:** 2025-12-24

---

## 1. JURISDICTION

| Property | Value |
|----------|-------|
| **State** | Indiana (IN) |
| **Counties** | All 92 counties (uniform statewide rate) |
| **Cities** | All municipalities (no local variations) |
| **Tax Authority** | Indiana Department of Revenue (DOR) |
| **Tax Type** | Vehicle Excise Tax (Lease) |
| **Effective Rate** | 7.00% flat statewide |
| **Lease Method** | MONTHLY (tax on each payment) |

---

## 2. TRANSACTION TYPE

| Property | Value |
|----------|-------|
| **Transaction Class** | Lease |
| **Vehicle Conditions** | New, Used, Certified Pre-Owned |
| **Vehicle Classes** | Passenger vehicles, light trucks, SUVs |

### Key Lease Taxation Method: MONTHLY

Indiana taxes vehicle leases on a **MONTHLY** basis:
- Tax is applied to each monthly lease payment as it's made
- Doc fee is taxed **upfront** at lease inception
- Cap cost reductions (down payment, rebates, trade-in) are **NOT taxed**
- This results in lower upfront costs compared to states with full upfront taxation

### Explicitly EXCLUDED Transaction Types

| Excluded Type | Reason |
|---------------|--------|
| **Retail purchases** | Use `indiana-retail-v1.0.0` kernel instead |
| **Commercial vehicle leases (>16,000 lbs GVWR)** | Subject to additional fees |
| **RV/Motor Home leases** | Special titling requirements |
| **Lease buyouts** | Different tax treatment |
| **Lease transfers/assumptions** | Different documentation |

---

## 3. INPUT SCHEMA

```typescript
interface IndianaLeaseInput {
  // === REQUIRED FIELDS ===

  /** Deal type indicator */
  dealType: 'LEASE';  // Must be exactly 'LEASE'

  /** Gross capitalized cost (vehicle + accessories + fees before reductions) */
  grossCapCost: number;  // Must be > 0

  /** Base monthly payment amount (before tax) */
  baseMonthlyPayment: number;  // Must be > 0

  /** Number of monthly payments in lease term */
  paymentCount: number;  // Must be > 0, typically 24, 36, 39, 48

  /** Residual value at lease end */
  residualValue: number;  // Must be >= 0

  // === OPTIONAL FIELDS (default to 0 if omitted) ===

  /** Dealer documentation fee ($0 - $250 statutory cap) */
  docFee?: number;  // Must be >= 0 and <= 250

  /** First month's payment due at signing */
  firstPaymentDueAtSigning?: boolean;  // Default: true

  // === CAP COST REDUCTIONS (all reduce cap cost, NOT taxed) ===

  /** Cash down payment */
  capReductionCash?: number;  // Must be >= 0

  /** Manufacturer rebate applied as cap reduction */
  capReductionRebateMfr?: number;  // Must be >= 0

  /** Dealer discount applied as cap reduction */
  capReductionRebateDealer?: number;  // Must be >= 0

  /** Trade-in equity (value minus payoff, if positive) */
  capReductionTradeIn?: number;  // Must be >= 0

  // === TRADE-IN DETAILS ===

  /** Trade-in vehicle gross value */
  tradeInValue?: number;  // Must be >= 0

  /** Trade-in payoff amount */
  tradeInPayoff?: number;  // Must be >= 0

  // === BACKEND PRODUCTS (NOT taxable on IN leases) ===

  /** Service contract amount (capitalized) - NOT taxable */
  serviceContracts?: number;  // Must be >= 0

  /** GAP insurance amount (capitalized) - NOT taxable */
  gap?: number;  // Must be >= 0

  // === RECIPROCITY ===

  /** Tax already paid to another state (on upfront portion) */
  originTaxInfo?: {
    stateCode: string;
    amount: number;
  };

  // === OUT OF SCOPE FLAGS ===
  isCommercialVehicle?: boolean;
  isTaxExempt?: boolean;
}
```

---

## 4. OUTPUT SCHEMA

```typescript
interface IndianaLeaseOutput {
  success: true;
  kernelVersion: string;

  breakdown: {
    // === UPFRONT TAXES (due at signing) ===
    upfront: {
      taxableBase: number;      // Doc fee (+ first payment if due at signing)
      taxRate: number;          // 0.07
      taxAmount: number;        // Upfront tax due
      components: {
        docFeeTax: number;
        firstPaymentTax: number;  // If first payment due at signing
      };
    };

    // === MONTHLY TAXES ===
    monthly: {
      basePayment: number;      // Pre-tax monthly payment
      taxRate: number;          // 0.07
      taxPerPayment: number;    // Tax per month
      totalPaymentWithTax: number;  // Payment + tax
    };

    // === TOTAL OVER LEASE TERM ===
    totalTaxOverTerm: number;   // Upfront + (monthly × count)

    // === INFORMATIONAL (not taxed) ===
    capCostReductions: {
      cash: number;
      rebateMfr: number;
      rebateDealer: number;
      tradeInEquity: number;
      total: number;
    };

    negativeEquity: number;  // If trade payoff > value

    // === RECIPROCITY ===
    reciprocity: {
      creditApplied: number;    // Applied to upfront only
      originState: string | null;
    };
  };

  audit: {
    rulesApplied: string[];
    notes: string[];
    calculatedAt: string;
  };
}
```

---

## 5. CALCULATION RULES

### Rule IN-L-001: Monthly Tax Method
- **Method:** MONTHLY - Tax applied to each payment
- **Rate:** 7% on monthly payment
- **Citation:** IC 6-6-5.1; Indiana DOR Information Bulletin #8

### Rule IN-L-002: Doc Fee Taxability (Upfront)
- **Taxable:** YES, at lease inception
- **Cap:** $250 statutory maximum
- **Citation:** IC 6-6-5.5

### Rule IN-L-003: First Payment Tax
- **Taxable:** YES, if due at signing
- **Timing:** Taxed upfront with doc fee
- **Citation:** Indiana DOR

### Rule IN-L-004: Cap Cost Reductions NOT Taxed
- **Cash down payments:** NOT taxed
- **Manufacturer rebates:** NOT taxed (applied as cap reduction)
- **Dealer discounts:** NOT taxed (applied as cap reduction)
- **Trade-in equity:** NOT taxed
- **Citation:** Indiana DOR Information Bulletin #8

### Rule IN-L-005: Trade-In Credit (FULL)
- **Policy:** Full credit as cap cost reduction
- **Tax effect:** Reduces monthly payment, reducing monthly tax
- **Citation:** IC 6-6-5.1-27

### Rule IN-L-006: Negative Equity
- **Taxable:** YES (increases cap cost → higher payments → higher tax)
- **Formula:** `negativeEquity = max(0, tradeInPayoff - tradeInValue)`
- **Citation:** Indiana DOR

### Rule IN-L-007: Service Contracts (VSC) - NOT Taxable
- **Taxable on leases:** NO
- **Critical difference:** Taxable on retail, NOT on leases
- **Tax savings:** 7% of VSC amount
- **Citation:** Indiana DOR Information Bulletin #8

### Rule IN-L-008: GAP Insurance - NOT Taxable
- **Taxable on leases:** NO
- **Critical difference:** Taxable on retail, NOT on leases
- **Citation:** Indiana DOR Information Bulletin #8

### Rule IN-L-009: Reciprocity Credit
- **Applies to:** Upfront taxes only
- **Behavior:** Credit for tax paid to other states, capped at Indiana's rate
- **Citation:** IC 6-6-5.1-23

---

## 6. INVARIANTS

### INV-L-001: Non-Negative Taxes
```
upfrontTax >= 0
monthlyTax >= 0
totalTaxOverTerm >= 0
```

### INV-L-002: Tax Rate Consistency
```
monthlyTax == baseMonthlyPayment * 0.07
```

### INV-L-003: Total Tax Additivity
```
totalTaxOverTerm == upfrontTax + (monthlyTax * paymentCount)
  // Adjusted for first payment if included in upfront
```

### INV-L-004: Cap Reductions Not Taxed
```
No direct tax on capReductionCash, capReductionRebateMfr,
capReductionRebateDealer, or capReductionTradeIn
```

### INV-L-005: Doc Fee Cap
```
If docFee > 250, return ERR_DOC_FEE_EXCEEDS_CAP
```

### INV-L-006: Backend Products Not Taxed
```
No tax component from serviceContracts or gap on leases
```

---

## 7. EDGE CASES HANDLED

| Edge Case | Handling |
|-----------|----------|
| Zero monthly payment | Return `ERR_INVALID_PAYMENT` |
| Zero payment count | Return `ERR_INVALID_TERM` |
| Doc fee > $250 | Return `ERR_DOC_FEE_EXCEEDS_CAP` |
| First payment not at signing | Only doc fee taxed upfront |
| Large cap reductions | Cap reductions not taxed, just reduce payment |
| Trade-in with negative equity | Increases cap cost, increases payment tax |

---

## 8. EXCLUDED (Out of Scope)

- ❌ Retail purchases (use retail kernel)
- ❌ Lease buyouts at end of term
- ❌ Lease transfers/assumptions
- ❌ Commercial vehicle leases
- ❌ Tax-exempt organizations

---

## 9. CITATIONS

1. **IC 6-6-5.1** - Vehicle Excise Tax (Leases)
2. **IC 6-6-5.5** - Doc Fee Cap ($250)
3. **IC 6-6-5.1-27** - Trade-in Credit
4. **IC 6-6-5.1-23** - Reciprocity
5. **Indiana DOR Sales Tax Information Bulletin #8** - Motor Vehicles

---

## 10. ACCEPTANCE CRITERIA

- [ ] All golden test cases pass (100%)
- [ ] All invariants verified
- [ ] Out-of-scope inputs return structured errors
- [ ] VSC and GAP confirmed NOT taxable on leases
- [ ] Doc fee capped at $250
- [ ] Monthly tax calculation verified
- [ ] Version tag: `calculator-kernel-indiana-lease-v1.0.0`
