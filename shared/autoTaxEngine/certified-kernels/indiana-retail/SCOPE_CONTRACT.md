# Calculator Kernel Scope Contract

## Indiana Retail Vehicle Tax Calculator

**Kernel ID:** `indiana-retail-v1.0.0`
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
| **Tax Type** | Vehicle Excise Tax |
| **Effective Rate** | 7.00% flat statewide |

### Jurisdictional Simplicity

Indiana is one of approximately 5 US states with a **completely uniform vehicle tax rate**. There are:
- NO county taxes on vehicle purchases
- NO city/municipal taxes
- NO special district taxes
- NO destination-based variations

This makes Indiana an ideal first state for kernel certification.

---

## 2. TRANSACTION TYPE

| Property | Value |
|----------|-------|
| **Transaction Class** | Retail Purchase |
| **Deal Types** | Cash, Finance (loan) |
| **Vehicle Conditions** | New, Used, Certified Pre-Owned |
| **Vehicle Classes** | Passenger vehicles, light trucks, SUVs, motorcycles |

### Explicitly EXCLUDED Transaction Types

The following are **OUT OF SCOPE** for this kernel version:

| Excluded Type | Reason |
|---------------|--------|
| **Leases** | Separate kernel required (MONTHLY taxation method with different rules) |
| **Commercial vehicles (>16,000 lbs GVWR)** | Subject to additional fees/taxes |
| **RVs and Motor Homes** | Special titling requirements |
| **Trailers** | Different tax treatment |
| **Off-road vehicles / ATVs** | Not subject to standard vehicle excise tax |
| **Fleet purchases** | May have special dealer arrangements |
| **Government/exempt purchases** | Tax-exempt transactions |
| **Dealer-to-dealer transfers** | Wholesale transactions |
| **Private party sales (non-dealer)** | Different documentation requirements |

If any excluded transaction type is passed to this kernel, it **MUST** return a structured error, not a best guess.

---

## 3. INPUT SCHEMA

```typescript
interface IndianaRetailInput {
  // === REQUIRED FIELDS ===

  /** Vehicle sale price (negotiated price, not MSRP) */
  vehiclePrice: number;  // Must be > 0

  /** Deal type indicator */
  dealType: 'RETAIL';  // Must be exactly 'RETAIL'

  // === OPTIONAL FIELDS (default to 0 if omitted) ===

  /** Dealer documentation fee ($0 - $250 statutory cap) */
  docFee?: number;  // Must be >= 0 and <= 250

  /** Trade-in vehicle value (gross, before payoff) */
  tradeInValue?: number;  // Must be >= 0

  /** Trade-in payoff amount (loan balance) */
  tradeInPayoff?: number;  // Must be >= 0

  /** Manufacturer rebate amount */
  rebateManufacturer?: number;  // Must be >= 0

  /** Dealer rebate/discount amount */
  rebateDealer?: number;  // Must be >= 0

  /** Dealer-installed accessories total */
  accessoriesAmount?: number;  // Must be >= 0

  /** Service contract (extended warranty) amount */
  serviceContracts?: number;  // Must be >= 0

  /** GAP insurance amount */
  gap?: number;  // Must be >= 0

  /** Other taxable fees (array) */
  otherFees?: Array<{ code: string; amount: number }>;

  // === RECIPROCITY (cross-state credit) ===

  /** Tax already paid to another state */
  originTaxInfo?: {
    stateCode: string;  // 2-letter state code
    amount: number;     // Tax amount paid
  };
}
```

### Input Validation Rules

| Field | Validation | Error if violated |
|-------|------------|-------------------|
| `vehiclePrice` | Must be > 0 | `ERR_INVALID_VEHICLE_PRICE` |
| `dealType` | Must be exactly `'RETAIL'` | `ERR_UNSUPPORTED_DEAL_TYPE` |
| `docFee` | Must be 0-250 | `ERR_DOC_FEE_EXCEEDS_CAP` |
| `tradeInValue` | Must be >= 0 | `ERR_INVALID_TRADE_VALUE` |
| `rebateManufacturer` | Must be >= 0 | `ERR_INVALID_REBATE` |
| `rebateDealer` | Must be >= 0 | `ERR_INVALID_REBATE` |
| All currency fields | Must be finite numbers | `ERR_INVALID_AMOUNT` |

---

## 4. OUTPUT SCHEMA

```typescript
interface IndianaRetailOutput {
  // === CALCULATION RESULT ===

  /** Indicates successful calculation */
  success: true;

  /** Kernel version that produced this result */
  kernelVersion: string;  // e.g., "indiana-retail-v1.0.0"

  // === TAX BREAKDOWN ===

  breakdown: {
    /** Final taxable base after all adjustments */
    taxableBase: number;

    /** Effective tax rate applied (always 0.07 for Indiana) */
    taxRate: number;

    /** Total tax due */
    totalTax: number;

    /** Components of the taxable base */
    baseComponents: {
      vehiclePrice: number;
      docFee: number;
      accessories: number;
      serviceContracts: number;
      gap: number;
      negativeEquity: number;
      otherTaxableFees: number;
    };

    /** Deductions from taxable base */
    deductions: {
      tradeInCredit: number;
      manufacturerRebate: number;
      // Note: dealerRebate is NOT a deduction in Indiana
    };

    /** Reciprocity credit (if applicable) */
    reciprocity: {
      creditApplied: number;
      originState: string | null;
      originalTax: number;
    };
  };

  // === AUDIT TRAIL ===

  audit: {
    /** Rule IDs exercised in this calculation */
    rulesApplied: string[];

    /** Step-by-step calculation notes */
    notes: string[];

    /** Timestamp of calculation */
    calculatedAt: string;  // ISO 8601
  };
}
```

### Error Output Schema

```typescript
interface IndianaRetailError {
  /** Indicates failed calculation */
  success: false;

  /** Error code for programmatic handling */
  errorCode: string;

  /** Human-readable error message */
  message: string;

  /** Which rule or scope boundary was violated */
  violatedRule: string | null;

  /** Kernel version */
  kernelVersion: string;
}
```

---

## 5. CALCULATION RULES

### Rule IN-R-001: Base Tax Rate
- **Rate:** 7.00% (0.07)
- **Application:** Flat rate applied to total taxable base
- **Citation:** IC 6-6-1.1-201; Indiana DOR

### Rule IN-R-002: Trade-In Credit (FULL)
- **Policy:** Full dollar-for-dollar credit
- **Cap:** None
- **Formula:** `taxableBase -= tradeInValue`
- **Citation:** IC 6-6-5.1-27

### Rule IN-R-003: Manufacturer Rebate Treatment
- **Taxable:** NO (reduces taxable base)
- **Formula:** `taxableBase -= rebateManufacturer`
- **Citation:** Indiana DOR Sales Tax Information Bulletin #8

### Rule IN-R-004: Dealer Rebate Treatment
- **Taxable:** YES (does NOT reduce taxable base)
- **Formula:** (no adjustment to taxable base)
- **Citation:** Indiana DOR Sales Tax Information Bulletin #8

### Rule IN-R-005: Doc Fee Taxability
- **Taxable:** YES
- **Cap:** $250 statutory maximum
- **Formula:** `taxableBase += min(docFee, 250)`
- **Citation:** IC 6-6-5.5

### Rule IN-R-006: Negative Equity Treatment
- **Taxable:** YES
- **Formula:** `negativeEquity = max(0, tradeInPayoff - tradeInValue)`; `taxableBase += negativeEquity`
- **Citation:** Indiana DOR

### Rule IN-R-007: Service Contracts (VSC)
- **Taxable:** YES (on retail purchases)
- **Formula:** `taxableBase += serviceContracts`
- **Note:** Non-taxable on leases (out of scope)
- **Citation:** Indiana DOR Sales Tax Information Bulletin #8

### Rule IN-R-008: GAP Insurance
- **Taxable:** YES (on retail purchases)
- **Formula:** `taxableBase += gap`
- **Note:** Non-taxable on leases (out of scope)
- **Citation:** Indiana DOR Sales Tax Information Bulletin #8

### Rule IN-R-009: Accessories
- **Taxable:** YES
- **Formula:** `taxableBase += accessoriesAmount`
- **Citation:** Indiana DOR

### Rule IN-R-010: Reciprocity Credit
- **Enabled:** YES
- **Behavior:** Credit for tax paid to other states, capped at Indiana's 7% rate
- **Formula:** `credit = min(originTaxPaid, calculatedTax)`; `finalTax = calculatedTax - credit`
- **Requirement:** Proof of payment required
- **Citation:** IC 6-6-5.1-23

---

## 6. INVARIANTS

These properties **MUST** hold for all valid inputs:

### Invariant INV-001: Non-Negative Tax
```
totalTax >= 0
```
Tax can never be negative, even with large trade-ins or rebates.

### Invariant INV-002: Non-Negative Taxable Base
```
taxableBase >= 0
```
The taxable base floors at zero.

### Invariant INV-003: Tax Rate Consistency
```
totalTax == taxableBase * 0.07 - reciprocityCredit (within rounding tolerance)
```
Tax is always 7% of the taxable base minus any reciprocity credit.

### Invariant INV-004: Component Additivity
```
taxableBase == vehiclePrice + docFee + accessories + serviceContracts + gap + negativeEquity + otherTaxableFees - tradeInCredit - manufacturerRebate
```

### Invariant INV-005: Reciprocity Cap
```
reciprocityCredit <= min(originTaxPaid, calculatedTaxBeforeCredit)
```
Credit never exceeds tax paid OR tax due.

### Invariant INV-006: Doc Fee Cap
```
If docFee > 250, return ERR_DOC_FEE_EXCEEDS_CAP
```
Kernel refuses doc fees exceeding statutory cap.

### Invariant INV-007: Monotonicity
```
If vehiclePrice increases (all else equal), totalTax increases
```
Higher vehicle price always means more tax.

---

## 7. ROUNDING RULES

| Context | Rounding Rule | Rationale |
|---------|---------------|-----------|
| Taxable base calculation | Round to 2 decimal places (half-up) at final step | Intermediate precision preserved |
| Tax calculation | Round to 2 decimal places (half-up) | Standard currency rounding |
| Display values | 2 decimal places | Currency display |

**Example:**
```
taxableBase = 26145.00
tax = 26145.00 * 0.07 = 1830.15 (exact)
```

---

## 8. EDGE CASES EXPLICITLY HANDLED

| Edge Case | Handling |
|-----------|----------|
| Trade-in exceeds vehicle price | Taxable base floors at 0, tax = 0 |
| Zero vehicle price | Return `ERR_INVALID_VEHICLE_PRICE` |
| Negative vehicle price | Return `ERR_INVALID_VEHICLE_PRICE` |
| Doc fee > $250 | Return `ERR_DOC_FEE_EXCEEDS_CAP` |
| Manufacturer rebate > vehicle price | Taxable base floors at 0 after rebate |
| Reciprocity credit > calculated tax | Credit capped at calculated tax, final tax = 0 |
| All optional fields omitted | Calculate with defaults (0) |
| Non-RETAIL deal type | Return `ERR_UNSUPPORTED_DEAL_TYPE` |
| NaN or Infinity in inputs | Return `ERR_INVALID_AMOUNT` |

---

## 9. EDGE CASES EXPLICITLY EXCLUDED

The kernel **MUST** return an error for these scenarios:

| Scenario | Error Code | Message |
|----------|------------|---------|
| Lease transaction | `ERR_UNSUPPORTED_DEAL_TYPE` | "Indiana leases require separate kernel (monthly taxation)" |
| Commercial vehicle flag | `ERR_UNSUPPORTED_VEHICLE_CLASS` | "Commercial vehicles (>16k GVWR) out of scope" |
| Government/exempt flag | `ERR_TAX_EXEMPT_NOT_SUPPORTED` | "Tax-exempt transactions out of scope" |
| Private party sale flag | `ERR_PRIVATE_PARTY_NOT_SUPPORTED` | "Private party sales out of scope" |

---

## 10. REQUIRED CITATIONS

All rules in this kernel are backed by the following authoritative sources:

### Primary Legal Authority
1. **Indiana Code Title 6, Article 6** - Vehicle Excise Tax
2. **IC 6-6-1.1-101 through 6-6-1.1-801** - Vehicle Excise Tax Act
3. **IC 6-6-5.5** - Dealer Documentation Fee Cap ($250)
4. **IC 6-6-5.1-27** - Trade-in Exemption
5. **IC 6-6-5.1-23** - Reciprocity Credit

### Administrative Guidance
6. **Indiana Administrative Code (IAC) 45 IAC 2.2** - Sales Tax Regulations
7. **Indiana DOR Sales Tax Information Bulletin #8** - Motor Vehicles

### Official Resources
8. **Indiana Department of Revenue (dor.in.gov)** - Official tax guidance
9. **Indiana BMV (bmv.in.gov)** - Title and registration information

---

## 11. ACCEPTANCE CRITERIA

This kernel is considered **CERTIFIED** when:

- [ ] All golden test cases pass (100%)
- [ ] All invariants verified via property-based tests
- [ ] All edge cases return correct output/errors
- [ ] Out-of-scope inputs reliably return structured errors
- [ ] No external dependencies (pure function)
- [ ] No hidden state or side effects
- [ ] All rules traceable to citations
- [ ] README with "how to run tests" and "how to call kernel"
- [ ] Version tag created: `calculator-kernel-indiana-retail-v1.0.0`

---

## 12. CHANGE LOG

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-24 | Initial scope contract |

---

## SIGNATURES

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | Claude Code | 2025-12-24 | Draft |
| Tax SME | _Pending_ | | |
| Engineering Lead | _Pending_ | | |
| QA Lead | _Pending_ | | |
