# Ohio (OH) Automotive Tax Rule Profile

**State Code:** OH
**Version:** 2
**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Complete

---

## Executive Summary

Ohio uses a **5.75% state rate plus county rates (up to 2.25%)** for a combined range of **5.75% to 8.25%**.

### Key Rules for Dealerships

- **Rate:** 5.75% state + county (up to 2.25%), combined 5.75%-8.25%
- **Trade-In Credit:** FULL for NEW vehicles, NONE for USED vehicles ⚠️
- **Manufacturer Rebates:** NON-taxable (reduce tax base)
- **Dealer Rebates:** TAXABLE (do NOT reduce tax base)
- **Doc Fee:** NOT taxable, capped at $387 OR 10% of price (whichever is lower)
- **Service Contracts (VSC):** TAXABLE on retail AND leases
- **GAP:** TAXABLE on retail AND leases
- **Negative Equity:** TAXABLE
- **Lease Method:** FULL_UPFRONT (tax on all payments at signing)
- **Reciprocity:** YES (credit for tax paid elsewhere)
- **Special:** 7 reciprocal states (AZ, CA, FL, IN, MA, MI, SC) - must collect OH tax

---

## Tax Rates

### State Rate: 5.75%

### County Rates: 0% to 2.25%

**Major County Examples:**
- **Cuyahoga (Cleveland):** 8.0% (5.75% + 2.25%) - Highest
- **Franklin (Columbus):** 7.5% (5.75% + 1.75%)
- **Hamilton (Cincinnati):** 7.5% (5.75% + 1.75%)
- **Summit (Akron):** 6.75% (5.75% + 1.0%)
- **Montgomery (Dayton):** 7.25% (5.75% + 1.5%)
- **COTA Districts:** 8.25% (5.75% + 2.5%) - Maximum

**Tax Based On:** Point of sale (dealer location), NOT buyer's residence

**Rate Changes:** County rates can change April 1st annually

**Vehicle Tax Scheme:** STATE_PLUS_LOCAL

---

## Retail Transactions

### Trade-In Policy: FULL for NEW, NONE for USED ⚠️

**CRITICAL:** Ohio provides trade-in credit ONLY for **NEW vehicles** per ORC 5739.029.
For **USED vehicles**, NO trade-in credit is allowed.

**NEW Vehicle Example:**
```
Vehicle Price (NEW):   $30,000
Trade-In Value:        -$10,000
─────────────────────────────
Taxable Base:          $20,000
Tax @ 7.5%:            $ 1,500
```

**USED Vehicle Example:**
```
Vehicle Price (USED):  $20,000
Trade-In Value:        -$ 5,000 ⚠️ NO CREDIT ALLOWED
─────────────────────────────
Taxable Base:          $20,000 (full price)
Tax @ 7.5%:            $ 1,500
```

**Dealer Must:** Always verify if vehicle is NEW or USED before applying trade-in credit.

### Manufacturer Rebates: NON-TAXABLE ✅

Manufacturer rebates reduce the purchase price before tax.

**Example:**
```
Vehicle Price:         $28,000
Manufacturer Rebate:   -$ 2,500
─────────────────────────────
Net Price:             $25,500
Tax @ 7.5%:            $ 1,913
```

### Dealer Rebates: TAXABLE ❌

Dealer rebates and vendor credits from third parties are TAXABLE per ORC 5739.02.

**Exception:** Only unreimbursed dealer discounts are non-taxable.

### Documentation Fee: NOT TAXABLE ✅

**Taxability:** NO
**Cap:** $387 OR 10% of vehicle price, whichever is LOWER
**Cap Effective Date:** October 24, 2024 (was $250 before)
**Adjustment:** Annually on September 30th based on CPI

**Examples:**
```
$10,000 vehicle → max doc fee is $387 (cap applies)
$3,500 vehicle → max doc fee is $350 (10% rule: $3,500 × 10% = $350)
```

---

## Backend Product Taxability

### Service Contracts (VSC): TAXABLE on Retail AND Leases ⚠️

**UNIQUE:** Ohio is one of few states where VSC remains taxable even on leases.

### GAP Insurance: TAXABLE on Retail AND Leases ⚠️

**UNIQUE:** Ohio taxes GAP on leases (most states exempt).

### Summary Table

| Product | Retail (Purchase) | Lease |
|---------|------------------|-------|
| **Service Contracts (VSC)** | ✅ TAXABLE | ✅ TAXABLE (UNIQUE) |
| **GAP** | ✅ TAXABLE | ✅ TAXABLE (UNIQUE) |
| **Doc Fee** | ❌ NOT taxable (cap $387 or 10%) | ❌ NOT taxable |
| **Accessories** | ✅ TAXABLE | ✅ TAXABLE |
| **Negative Equity** | ✅ TAXABLE | ✅ TAXABLE |
| **Title/Registration** | ❌ NOT taxable | ❌ NOT taxable |
| **Acquisition Fee** | N/A | ✅ TAXABLE (upfront) |
| **Disposition Fee** | N/A | ✅ TAXABLE (when billed) |
| **Excess Mileage** | N/A | ✅ TAXABLE (when billed) |

### Retail Purchase Example with Backend Products

```
Vehicle Price (NEW):  $30,000
VSC:                  +$ 2,800
GAP:                  +$   995
Doc Fee:              +$   387 (NOT taxed)
Accessories:          +$ 1,500
Trade-In (NEW):       -$12,000
─────────────────────────────
Taxable Base:         $23,295
Tax @ 7.5%:           $ 1,747

Total Due:            $25,429 (includes $387 doc fee, not taxed)
```

---

## Lease Taxation

### Method: FULL_UPFRONT ⚠️

**Tax on all lease payments collected at signing.**

Per ORC 5739.02(A)(2): Tax collected by dealer at lease consummation, calculated on **total amount to be paid under lease agreement**.

**How It Works:**
1. Calculate total of all monthly payments (payment × term)
2. Apply sales tax rate to this total
3. Collect full tax amount at lease signing

**Example:**
```
Monthly Payment:       $  450
Lease Term:            36 months
Total Payments:        $16,200
Tax Rate:              7.5%
Tax Due at Signing:    $ 1,215 (all upfront, no monthly tax)
```

### What is Taxed

**Upfront:**
- Total of all lease payments
- Service contracts (if capitalized) ⚠️ TAXABLE
- GAP (if capitalized) ⚠️ TAXABLE
- Acquisition fees

**NOT Taxed:**
- Cap cost reductions (down payment, trade equity, rebates)
- Doc fee (NOT taxable in Ohio)
- Title/registration fees
- Refundable security deposits

**Billed Later (taxed when billed):**
- Disposition fees
- Excess mileage charges
- Wear and tear fees

### Trade-In on Leases: NEW Only ⚠️

**Same rule as retail:** Trade-in credit ONLY for NEW vehicle leases, NOT for USED.

Trade-in reduces capitalized cost → reduces monthly payment → reduces total payments → reduces tax base.

**NEW Vehicle Lease Example:**
```
Gross Cap Cost (NEW):  $35,000
Trade-In Equity:       -$ 8,000
─────────────────────────────
Adjusted Cap Cost:      $27,000

Monthly Payment:        $  425
Total Payments (36):    $15,300
Tax @ 7.5%:             $ 1,148 (due at signing)

Without trade-in:
Monthly Payment:        $  520
Total Payments (36):    $18,720
Tax @ 7.5%:             $ 1,404
Tax Savings:            $   256
```

### Lease Calculation Example

**36-Month Lease (Franklin County - 7.5%):**
```
Gross Cap Cost:        $40,000
Trade-In Equity (NEW): -$10,000
Cash Down:             -$ 5,000
Adjusted Cap Cost:      $25,000

Monthly Payment:        $  550
Term:                   36 months
Total Payments:         $19,800

VSC (capitalized):      $ 2,500 ⚠️ TAXABLE
GAP (capitalized):      $   895 ⚠️ TAXABLE
Acquisition Fee:        $   595
Doc Fee:                $   387 (NOT taxed)

TAX CALCULATION:
  Base (Total Payments):$19,800
  VSC:                  $ 2,500
  GAP:                  $   895
  Acquisition Fee:      $   595
  ─────────────────────────────
  Taxable Base:         $23,790
  Tax @ 7.5%:           $ 1,784 ✅ DUE AT SIGNING

Due at Signing:
  First Payment:        $   550
  Downpayment:          $ 5,000
  Tax (upfront):        $ 1,784
  Doc Fee:              $   387
  ─────────────────────────────
  Total:                $ 7,721

Monthly (Months 2-36):
  Payment:              $   550 (NO additional tax)
```

---

## Reciprocity

### Policy: YES - Credit for Taxes Paid Elsewhere

**How It Works:**
- Ohio residents purchasing out-of-state can get credit for tax paid there
- Credit capped at Ohio tax amount
- Proof of tax paid required (sales receipt)

**Example 1: Lower Out-of-State Tax**
```
OH resident buys in Michigan: $30,000
Michigan tax paid (6%):       $ 1,800
Ohio tax due (7.5%):          $ 2,250
Credit for MI tax:            -$ 1,800
Additional OH tax owed:       $   450
```

**Example 2: Higher Out-of-State Tax**
```
OH resident buys in Indiana:  $30,000
Indiana tax paid (7%):        $ 2,100
Ohio tax due (6.75%):         $ 2,025
Credit (capped at OH rate):   -$ 2,025
Additional OH tax owed:       $     0
No refund for $75 excess
```

### Nonresident Exemption

Ohio dealers selling to nonresidents do NOT collect Ohio sales tax if:
- Customer completes Form STEC NR
- Customer certifies intent to immediately remove vehicle from Ohio
- Vehicle will be registered in customer's home state

### EXCEPTION: 7 Reciprocal States ⚠️

**Ohio dealers MUST collect Ohio tax from residents of:**
- Arizona (AZ)
- California (CA)
- Florida (FL)
- Indiana (IN)
- Massachusetts (MA)
- Michigan (MI)
- South Carolina (SC)

**These states have reciprocal collection agreements with Ohio.**

**Example:**
```
California resident buys from Ohio dealer
Dealer MUST collect Ohio tax (no nonresident exemption)
Customer cannot use Form STEC NR
```

---

## Tax Calculation Formulas

### Retail Purchase (NEW Vehicle)

```
Taxable Base = Vehicle Price
             + VSC
             + GAP
             + Accessories
             + Negative Equity
             - Trade-In Value (NEW only)
             - Manufacturer Rebate

Sales Tax = Taxable Base × (State 5.75% + County Rate)

(Doc fee, title, registration NOT included - not taxable)
```

### Retail Purchase (USED Vehicle)

```
Taxable Base = Vehicle Price
             + VSC
             + GAP
             + Accessories
             + Negative Equity
             (NO Trade-In Credit for USED)
             - Manufacturer Rebate

Sales Tax = Taxable Base × (State 5.75% + County Rate)
```

### Lease (FULL_UPFRONT)

```
Total Lease Payments = Monthly Payment × Term

Taxable Base = Total Lease Payments
             + VSC (if capitalized)
             + GAP (if capitalized)
             + Acquisition Fee

Sales Tax (due upfront) = Taxable Base × (State 5.75% + County Rate)

(Doc fee, cap reductions NOT taxed)
```

---

## Compliance Notes

### Common Errors to Avoid

1. ❌ Applying trade-in credit to USED vehicle sales (NOT ALLOWED)
2. ❌ Taxing doc fee (doc fee is NOT taxable in Ohio)
3. ❌ Exempting VSC/GAP on leases (they ARE taxable in Ohio)
4. ❌ Calculating lease tax monthly instead of upfront
5. ❌ Exceeding doc fee cap ($387 or 10% rule)
6. ❌ Granting nonresident exemption to reciprocal state residents (7 states)

### Critical Rules for Dealers

**ALWAYS:**
- ✅ Verify if vehicle is NEW or USED before applying trade-in credit
- ✅ Enforce doc fee cap ($387 OR 10%, whichever is lower)
- ✅ Calculate lease tax on TOTAL payments upfront
- ✅ Include VSC and GAP in taxable base on leases
- ✅ Collect Ohio tax from AZ, CA, FL, IN, MA, MI, SC residents

**NEVER:**
- ❌ Give trade-in credit on used vehicles
- ❌ Tax the doc fee
- ❌ Exempt VSC/GAP on leases

---

## Official Sources

### Primary Sources
1. **Ohio Department of Taxation** (tax.ohio.gov)
2. **Ohio Revised Code 5739.02** - Sales and Use Tax
3. **Ohio Revised Code 5739.029** - Trade-in Credit
4. **Ohio Revised Code 4517.261** - Documentary Service Charge
5. **Ohio Admin Code 5703-9-23** - Motor Vehicle Sales
6. **Ohio Admin Code 5703-9-36** - Negative Equity Rules
7. **Senate Bill 94 (2024)** - Doc Fee Inflation Adjustment
8. **Info Release ST 2007-04** - Nonresident Sales

### Implementation
- **Rules File:** `/shared/autoTaxEngine/rules/US_OH.ts`
- **Version:** 2 (implemented)

---

## Summary

Ohio's tax system has several unique features that require dealer attention:

⚠️ **Trade-in credit ONLY for NEW vehicles** (USED get NO credit)
✅ **Doc fee NOT taxable** (capped at $387 or 10%)
✅ **Manufacturer rebates reduce tax** (non-taxable)
⚠️ **VSC/GAP taxable on retail AND leases** (UNIQUE - most states exempt on leases)
⚠️ **FULL_UPFRONT lease taxation** (all tax due at signing)
⚠️ **7 reciprocal states** (must collect OH tax from AZ, CA, FL, IN, MA, MI, SC)
✅ **Reciprocity available** (credit for tax paid elsewhere)

### Key Differences from Other States

**Trade-In Credit:**
- NEW vehicles: FULL credit (like most states)
- USED vehicles: NO credit (UNIQUE to Ohio)

**Lease Taxation:**
- Tax paid UPFRONT (not monthly like CA, IN, MI)
- VSC/GAP TAXABLE on leases (most states exempt)

**Doc Fee:**
- NOT taxable (differs from many states)
- Capped and adjusted annually for CPI

---

**Last Updated:** 2025-11-14
**Implementation Status:** ✅ Production Ready
