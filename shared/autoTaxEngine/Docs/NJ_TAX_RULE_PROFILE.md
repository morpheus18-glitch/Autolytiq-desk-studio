# New Jersey (NJ) Automotive Tax Rule Profile

**State Code:** NJ
**Version:** 2
**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Complete

---

## Executive Summary

New Jersey uses a **6.625% flat state sales tax** with **NO local add-ons**, plus a **0.4% luxury/fuel-inefficiency surcharge** on vehicles ≥$45,000 or <19 MPG.

### Key Rules for Dealerships

- **Rate:** 6.625% state-only (no local variations)
- **Luxury Surcharge:** 0.4% on vehicles ≥$45k OR <19 MPG (before trade-in)
- **Trade-In Credit:** FULL (reduces sales tax base, NOT luxury surcharge)
- **Manufacturer Rebates:** TAXABLE (do NOT reduce tax base)
- **Dealer Rebates:** TAXABLE (do NOT reduce tax base)
- **Doc Fee:** TAXABLE, NO cap (avg $335, range $400-800)
- **Service Contracts (VSC):** TAXABLE on retail and leases
- **GAP:** Dealer GAP waiver = TAXABLE, third-party insurance = NOT taxable
- **Negative Equity:** TAXABLE
- **Lease Method:** FULL_UPFRONT (dealer remits all tax at inception)
- **Reciprocity:** YES (credit for tax paid elsewhere, capped at NJ rate)

---

## Tax Rates

### Sales Tax: 6.625% Flat Statewide
- **State Rate:** 6.625%
- **Local Rates:** NONE
- **Combined Rate:** 6.625% everywhere in New Jersey

### Luxury and Fuel-Inefficient Surcharge (LFIS): 0.4%

**Triggers:**
- Vehicles with gross price ≥ $45,000 (before trade-in, rebates), OR
- Vehicles with EPA fuel efficiency < 19 MPG (city/highway average)

**Critical:** Assessed **BEFORE** trade-in, manufacturer rebates, or disability equipment deductions.

**Example:**
```
Vehicle Price:         $50,000
Luxury Surcharge:      $50,000 × 0.4% = $200 ✅ (≥$45k threshold)
Trade-In:              -$10,000
Taxable Base (sales):  $40,000
Sales Tax:             $40,000 × 6.625% = $2,650
Total Tax:             $200 + $2,650 = $2,850
```

### Special Rate: Zero-Emission Vehicles (ZEVs)
- **Reduced Rate:** 3.3125% (Oct 1, 2024 - Jun 30, 2025)
- **After July 1, 2025:** 6.625% (full rate)

**Vehicle Tax Scheme:** STATE_ONLY

---

## Retail Transactions

### Trade-In Policy: FULL CREDIT ✅

Trade-in value fully reduces the **sales tax** base, but **NOT** the luxury surcharge base.

**Example:**
```
Vehicle Price:         $50,000
Luxury Surcharge:      $200 (on $50,000)
Trade-In Value:        -$15,000
─────────────────────────────
Sales Tax Base:        $35,000
Sales Tax @ 6.625%:    $2,319
Total Tax:             $200 + $2,319 = $2,519
```

### Manufacturer Rebates: TAXABLE ❌

Manufacturer rebates **do NOT reduce** the tax base. Tax calculated on full price before rebate.

**Why:** Sales tax is charged on the amount the dealership ultimately receives (part from purchaser, balance from manufacturer).

**Example:**
```
Vehicle Price:         $28,000
Manufacturer Rebate:   -$ 2,000
Customer Pays:         $26,000
─────────────────────────────
Sales Tax Base:        $28,000 (NOT $26,000)
Tax @ 6.625%:          $ 1,855
```

**NJ is one of 7 states** (CT, ME, MD, NJ, NY, PA, RI) that tax the full price before manufacturer rebates.

### Dealer Rebates: TAXABLE ❌

Dealer rebates also do NOT reduce the tax base.

### Documentation Fee: TAXABLE, NO CAP

**Taxability:** YES
**State Cap:** NONE
**Average:** $335
**Range:** $400-$800

Doc fees are included in the sales price and subject to 6.625% tax.

**Example:**
```
Vehicle Price:     $30,000
Doc Fee:           +$  500
Trade-In:          -$10,000
─────────────────────────
Taxable Base:      $20,500
Tax @ 6.625%:      $ 1,358
```

---

## Backend Product Taxability

### Service Contracts (VSC): TAXABLE ✅

Service contracts (extended warranties) are **TAXABLE on both retail and leases**.

**Reason:** Considered prepayment for taxable services to tangible personal property.

### GAP Insurance: DEPENDS ⚠️

**Two Types:**
1. **Dealer GAP Waiver:** TAXABLE ✅
2. **Third-Party Insurance:** NOT taxable ❌

**Default assumption:** If dealer-provided, it's taxable.

### Summary Table

| Product | Retail (Purchase) | Lease |
|---------|------------------|-------|
| **Service Contracts (VSC)** | ✅ TAXABLE | ✅ TAXABLE |
| **GAP (Dealer Waiver)** | ✅ TAXABLE | ✅ TAXABLE |
| **GAP (Third-Party Insurance)** | ❌ NOT taxable | ❌ NOT taxable |
| **Doc Fee** | ✅ TAXABLE (no cap) | ✅ TAXABLE (upfront) |
| **Accessories** | ✅ TAXABLE | ✅ TAXABLE (in base) |
| **Negative Equity** | ✅ TAXABLE | ✅ TAXABLE |
| **Title/Registration** | ❌ NOT taxable | ❌ NOT taxable |

### Retail Purchase Example with Backend Products

```
Vehicle Price:        $35,000
VSC:                  +$ 2,800
GAP (Dealer):         +$   895
Doc Fee:              +$   500
Accessories:          +$ 1,800
Trade-In:             -$12,000
─────────────────────────────
Taxable Base:         $28,995
Tax @ 6.625%:         $ 1,921
Total Due:            $30,916
```

---

## Lease Taxation

### Method: FULL_UPFRONT ⚠️

**Critical:** Dealer must remit **FULL tax upfront** to the state at lease inception, regardless of customer payment arrangement.

### Two Calculation Methods Available

**Method 1: Total Lease Payments (most common)**
```
Tax Base = Total of all lease payments over term
```

**Method 2: Original Purchase Price**
```
Tax Base = Vehicle's original purchase price (cap cost)
```

Lessor and lessee can negotiate which method to use. Trade-in credit applies to **BOTH** methods.

### What is Taxed

**Upfront (Due at Inception):**
- Total lease payments (Method 1) OR Original purchase price (Method 2)
- Doc fee
- Service contracts (if capitalized)
- Dealer GAP waivers (if capitalized)

**NOT Taxed:**
- Cap cost reductions (down payment, trade equity, rebates applied to cap)
- Third-party GAP insurance
- Refundable security deposits
- Title/registration fees

### Customer Payment Flexibility

**Key Feature:** Dealer and customer may agree to **incorporate tax into monthly payments**, BUT dealer must still remit full tax to state upfront.

This means:
- Customer can pay tax over time (to dealer)
- Dealer pays state immediately
- Dealer carries the tax cost until reimbursed

### Luxury Surcharge on Leases

0.4% surcharge applies if:
- Gross cap cost ≥ $45,000 (BEFORE trade-in), OR
- Vehicle EPA fuel efficiency < 19 MPG

Calculated on gross price **BEFORE** trade-in or rebates.

### Lease Calculation Example (Method 1: Total Lease Payments)

**36-Month Lease:**
```
Gross Cap Cost:          $45,000
Trade-In Equity:         -$ 8,000
Adjusted Cap Cost:        $37,000

Monthly Payment:          $  525
Total Payments (36 mo):   $18,900

LUXURY SURCHARGE:
  $45,000 × 0.4%:         $  180 ✅ (≥$45k threshold, BEFORE trade-in)

SALES TAX (Method 1):
  Tax Base:               $18,900 (total payments)
  Tax @ 6.625%:           $ 1,252

TOTAL TAX DUE UPFRONT:    $  180 + $1,252 = $1,432

Due at Signing:
  First Payment:          $  525
  Doc Fee:                $  395
  Doc Fee Tax:            $   26
  Total Tax (upfront):    $1,432
  Down Payment:           $8,000
  ─────────────────────────
  Total:                  $10,378

Monthly (Months 2-36):
  Payment:                $  525 (NO additional tax)
```

### Lease Calculation Example (Method 2: Original Purchase Price)

```
Gross Cap Cost:          $45,000
Trade-In Equity:         -$ 8,000
Net Cap Cost:             $37,000

LUXURY SURCHARGE:
  $45,000 × 0.4%:         $  180

SALES TAX (Method 2):
  Tax Base:               $37,000 (cap cost after trade-in)
  Tax @ 6.625%:           $ 2,451

TOTAL TAX DUE UPFRONT:    $  180 + $2,451 = $2,631

Note: Method 2 results in higher upfront tax ($2,631 vs $1,432)
```

### Trade-In on Leases: FULL CREDIT ✅

Trade-in gets **FULL credit** under BOTH calculation methods:
- Method 1: Reduces total payments subject to tax
- Method 2: Reduces purchase price subject to tax

---

## Reciprocity

**Policy:** YES - Credit for sales/use tax paid to other states

**How It Works:**
- Credit capped at NJ's 6.625% + luxury surcharge (if applicable)
- Proof of tax paid required
- Applies to both retail and lease
- No refund if other state's tax was higher

**Example 1: Lower Out-of-State Tax**
```
Vehicle purchased in PA:   $30,000
PA tax paid (6%):          $ 1,800
NJ tax due (6.625%):       $ 1,988
Credit for PA tax:         -$ 1,800
Additional NJ tax owed:    $   188
```

**Example 2: Higher Out-of-State Tax**
```
Vehicle purchased in CA:   $30,000
CA tax paid (7.25%):       $ 2,175
NJ tax due (6.625%):       $ 1,988
Credit (capped at NJ):     -$ 1,988
Additional NJ tax owed:    $     0
No refund for $187 excess
```

---

## Tax Calculation Formulas

### Retail Purchase

**Step 1: Luxury Surcharge (if applicable)**
```
If Vehicle Price ≥ $45,000 OR MPG < 19:
  Luxury Surcharge = Vehicle Price × 0.4%
Else:
  Luxury Surcharge = $0
```

**Step 2: Sales Tax**
```
Taxable Base = Vehicle Price
             + Doc Fee
             + VSC (taxable)
             + GAP (if dealer waiver)
             + Accessories
             + Negative Equity
             - Trade-In Value
             (Rebates do NOT reduce base)

Sales Tax = Taxable Base × 6.625%
```

**Total Tax = Luxury Surcharge + Sales Tax**

### Lease (Method 1: Total Lease Payments)

```
Luxury Surcharge = (Gross Cap Cost × 0.4%) if ≥$45k OR <19 MPG

Tax Base = Total of all lease payments over term
         (after trade-in credit applied)

Sales Tax = Tax Base × 6.625%

Total Tax (due upfront) = Luxury Surcharge + Sales Tax
```

### Lease (Method 2: Original Purchase Price)

```
Luxury Surcharge = (Gross Cap Cost × 0.4%) if ≥$45k OR <19 MPG

Tax Base = Gross Cap Cost
         - Trade-In Value

Sales Tax = Tax Base × 6.625%

Total Tax (due upfront) = Luxury Surcharge + Sales Tax
```

---

## Compliance Notes

### Common Errors to Avoid

1. ❌ Deducting trade-in from luxury surcharge base (trade-in does NOT reduce surcharge)
2. ❌ Treating manufacturer rebates as non-taxable (rebates ARE taxable in NJ)
3. ❌ Not taxing doc fee (doc fee IS taxable, no cap)
4. ❌ Not taxing VSC on leases (VSC IS taxable on leases in NJ)
5. ❌ Treating all GAP as taxable or non-taxable (depends on provider)
6. ❌ Not remitting full lease tax upfront (dealer must pay state immediately)

### Key Differences from Other States

**vs. New York:**
- NJ: Manufacturer rebates TAXABLE
- NY: Manufacturer rebates NON-taxable (reduce base)
- NJ: Reciprocity YES
- NY: Reciprocity NO

**vs. Pennsylvania:**
- NJ: 6.625% + luxury surcharge
- PA: 6% flat, no surcharge

**vs. California:**
- NJ: STATE_ONLY (no local)
- CA: State + local (varies)
- NJ: FULL_UPFRONT leases
- CA: MONTHLY leases

---

## Official Sources

### Primary Sources
1. **New Jersey Division of Taxation** (nj.gov/treasury/taxation)
2. **Consumer Automotive Tax Guide** (2025)
3. **Tax Topic Bulletin S&U-12:** Leases and Rentals
4. **NJ MVC:** Luxury and Fuel Inefficient Surcharge (LFIS) Overview
5. **N.J. Admin. Code § 18:24-6.5:** Sales of accessories

### Implementation
- **Rules File:** `/shared/autoTaxEngine/rules/US_NJ.ts`
- **Version:** 1 (implemented)

---

## Summary

New Jersey's tax system requires careful attention to:

✅ **Simple state-only rate:** 6.625% everywhere
⚠️ **Luxury surcharge:** 0.4% on vehicles ≥$45k OR <19 MPG (before trade-in)
✅ **Full trade-in credit** (for sales tax, not luxury surcharge)
❌ **Rebates are TAXABLE** (do NOT reduce base)
⚠️ **Doc fee IS taxable** (no cap, avg $335)
⚠️ **VSC/GAP taxable on retail AND leases** (except third-party GAP insurance)
⚠️ **FULL_UPFRONT lease taxation** (dealer remits all tax immediately)
✅ **Reciprocity available** (credit for tax paid elsewhere)

### Critical for Lease Deals:
- Dealer must remit **FULL tax upfront** to state
- Customer may pay over time to dealer (if negotiated)
- Two calculation methods available (negotiate with customer)
- Trade-in gets full credit under both methods

---

**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Production Ready
