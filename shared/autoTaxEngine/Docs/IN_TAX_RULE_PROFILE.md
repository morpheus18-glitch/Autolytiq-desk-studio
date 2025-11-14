# Indiana (IN) Automotive Tax Rule Profile

**State Code:** IN
**Version:** 2
**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Complete

---

## Executive Summary

Indiana uses a **7% flat vehicle excise tax** with **NO local add-ons**, making it one of the simplest states for tax calculation.

### Key Rules for Dealerships

- **Rate:** 7% flat statewide (no local variations)
- **Trade-In Credit:** FULL (reduces tax base)
- **Manufacturer Rebates:** NON-taxable (reduce tax base)
- **Dealer Rebates:** TAXABLE (do NOT reduce tax base)
- **Doc Fee:** TAXABLE
- **Service Contracts (VSC):** TAXABLE on retail, NON-taxable on leases
- **GAP Insurance:** TAXABLE on retail, NON-taxable on leases
- **Negative Equity:** TAXABLE
- **Lease Method:** MONTHLY (tax each payment)
- **Reciprocity:** YES (credit up to 7%)

---

## Tax Rates

### Retail: 7% Flat Statewide
- **State Rate:** 7%
- **Local Rates:** NONE
- **Combined Rate:** 7% everywhere in Indiana

**Vehicle Tax Scheme:** STATE_ONLY (no jurisdiction lookup needed)

---

## Retail Transactions

### Trade-In Policy: FULL CREDIT ✅

Trade-in value fully reduces the taxable base.

**Example:**
```
Vehicle Price:     $30,000
Doc Fee:           +$  299
Trade-In Value:    -$10,000
─────────────────────────
Taxable Base:      $20,299
Tax @ 7%:          $ 1,421
```

### Manufacturer Rebates: NON-TAXABLE ✅

Manufacturer rebates reduce the tax base.

**Example:**
```
Vehicle MSRP:          $28,000
Manufacturer Rebate:   -$ 2,000
─────────────────────────────
Net Price:             $26,000
Tax @ 7%:              $ 1,820
```

### Dealer Rebates/Discounts: TAXABLE ❌

Dealer rebates do NOT reduce the tax base - tax is on full price before dealer discount.

**Example:**
```
Vehicle Price:     $28,000 (before dealer discount)
Dealer Rebate:     -$ 2,000 (customer receives this)
─────────────────────────────
Taxable Base:      $28,000 (NOT $26,000)
Tax @ 7%:          $ 1,960
```

### Documentation Fee: TAXABLE ✅

**Taxability:** YES
**Cap:** $250 maximum (Indiana law)
**Treatment:** Included in taxable base

**Example:**
```
Vehicle Price:     $25,000
Doc Fee:           +$  250
Trade-In:          -$ 8,000
─────────────────────────
Taxable Base:      $17,250
Tax @ 7%:          $ 1,208
```

---

## Backend Product Taxability

### Critical Difference: Retail vs Lease

| Product | Retail (Purchase) | Lease |
|---------|------------------|-------|
| **Service Contracts (VSC)** | ✅ TAXABLE | ❌ NON-taxable |
| **GAP Insurance** | ✅ TAXABLE | ❌ NON-taxable |
| **Doc Fee** | ✅ TAXABLE ($250 cap) | ✅ TAXABLE (upfront) |
| **Accessories** | ✅ TAXABLE | ✅ TAXABLE (in cap cost) |
| **Negative Equity** | ✅ TAXABLE | ✅ TAXABLE (in cap cost) |
| **Title/Registration** | ❌ NON-taxable | ❌ NON-taxable |

### Retail Purchase Example with Backend Products

```
Vehicle Price:        $28,000
VSC:                  +$ 2,500
GAP:                  +$   895
Doc Fee:              +$   250
Accessories:          +$ 1,500
Trade-In:             -$ 9,000
─────────────────────────────
Taxable Base:         $24,145
Tax @ 7%:             $ 1,690

Total Due:            $25,835
```

---

## Lease Taxation

### Method: MONTHLY

Tax is applied to **each monthly payment**, not upfront.

### What is Taxed

**Monthly Payments:**
- Base monthly payment × 7%
- Tax collected each month over lease term

**Upfront (Due at Signing):**
- Doc fee × 7%
- First month payment × 7%

**NOT Taxed:**
- Service contracts (VSC) - NON-taxable on leases
- GAP insurance - NON-taxable on leases
- Refundable security deposit
- Cap cost reductions (down payment, rebates, trade equity)

### Trade-In on Leases: FULL CREDIT ✅

Trade-in reduces the capitalized cost, which lowers monthly payment and therefore lowers monthly tax.

**Example:**
```
Gross Cap Cost:       $35,000
Trade-In Equity:      -$ 8,000
─────────────────────────────
Adjusted Cap Cost:     $27,000

Monthly Payment:       $450
Monthly Tax @ 7%:      $ 31.50
Total Monthly:         $481.50

Without Trade-In:
Monthly Payment:       $550
Monthly Tax @ 7%:      $ 38.50
Monthly Savings:       $ 7.00/month
```

### Lease Calculation Example

**36-Month Lease:**
```
Gross Cap Cost:        $35,000
Cash Down:             $ 5,000
Trade-In:              $ 3,000
Adjusted Cap Cost:     $27,000

Monthly Payment:       $450
Doc Fee (upfront):     $250

Due at Signing:
  First Payment:       $450
  Doc Fee:             $250
  Doc Fee Tax @ 7%:    $ 18
  First Payment Tax:   $ 32
  Down Payment:        $5,000
  ─────────────────────────
  Total:               $5,750

Monthly (Months 2-36):
  Payment:             $450
  Tax @ 7%:            $ 32
  ─────────────────────────
  Total:               $482/month

Total Tax Over Term:
  Upfront:             $ 50 (doc + first payment)
  Monthly:             $ 32 × 35 months = $1,120
  ─────────────────────────────────────
  Total Tax:           $1,170
```

---

## Reciprocity

**Policy:** YES - Credit for taxes paid to other states

**How It Works:**
- Indiana gives credit for tax paid in another state
- Credit capped at Indiana's 7% rate
- Proof of payment required
- Applies to both retail and lease

**Example 1: Other State Higher**
```
Vehicle purchased in Illinois: $30,000
Illinois tax paid (varies):    $ 2,250 (7.5%)
Indiana tax would be:          $ 2,100 (7%)
Credit allowed:                $ 2,100 (capped at IN rate)
Additional IN tax due:         $     0
```

**Example 2: Other State Lower**
```
Vehicle purchased in Montana:  $30,000
Montana tax paid:              $     0 (no sales tax)
Indiana tax due:               $ 2,100 (7%)
Credit allowed:                $     0
Additional IN tax due:         $ 2,100
```

---

## Tax Calculation Formulas

### Retail Purchase
```
Taxable Base = Vehicle Price
             + Doc Fee (up to $250)
             + VSC (taxable)
             + GAP (taxable)
             + Accessories
             + Negative Equity
             - Trade-In Value
             - Manufacturer Rebate

Tax = Taxable Base × 7%

(Title and registration fees NOT included)
```

### Lease
```
Upfront Tax = (Doc Fee + First Payment) × 7%

Monthly Tax = Monthly Payment × 7%

Total Tax = Upfront Tax + (Monthly Tax × Remaining Months)

(VSC, GAP, cap reductions NOT taxed on leases)
```

---

## Compliance Notes

### Common Errors to Avoid

1. ❌ Taxing dealer rebates as non-taxable (dealer rebates are TAXABLE)
2. ❌ Not taxing doc fee (doc fee IS taxable, $250 cap)
3. ❌ Taxing VSC/GAP on leases (they're NON-taxable on leases)
4. ❌ Not taxing VSC/GAP on retail (they ARE taxable on retail)
5. ❌ Applying local tax rates (Indiana is STATE_ONLY, 7% everywhere)

### Key Differences from Other States

**Retail vs Lease Backend Products:**
- VSC and GAP are **TAXABLE on retail** but **NON-taxable on leases**
- This is unusual - most states treat them the same

**Dealer vs Manufacturer Rebates:**
- Manufacturer rebates reduce tax base
- Dealer rebates do NOT reduce tax base

---

## Official Sources

### Primary Sources
1. **Indiana Department of Revenue** (dor.in.gov)
2. **Indiana Code Title 6, Article 6** (Vehicle Excise Tax)
3. **IC 6-6-5.5** (Dealer documentation fee cap - $250 maximum)

### Implementation
- **Rules File:** `/shared/autoTaxEngine/rules/US_IN.ts`
- **Version:** 1 (implemented)

---

## Summary

Indiana's 7% flat vehicle excise tax is straightforward to calculate, but dealerships must pay attention to:

✅ **Simple:** No local rates, 7% everywhere
✅ **Full trade-in credit** (reduces tax)
✅ **Manufacturer rebates reduce tax**
⚠️ **Dealer rebates do NOT reduce tax**
⚠️ **Doc fee IS taxable** ($250 cap)
⚠️ **VSC/GAP taxable on RETAIL, non-taxable on LEASES**
✅ **Monthly lease taxation** (tax each payment)

---

**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Production Ready
