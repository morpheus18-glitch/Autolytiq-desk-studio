# South Carolina (SC) Vehicle Tax Rule Profile

**Last Updated:** November 14, 2025
**Rule Version:** 2
**Status:** ✅ Production Ready

---

## Executive Summary

South Carolina uses a unique **Infrastructure Maintenance Fee (IMF)** system instead of traditional sales tax for motor vehicles. Implemented on July 1, 2017, the IMF is a **5% fee capped at $500 maximum**, creating significant tax advantages for high-value vehicle purchases.

### Key Highlights

- **IMF Rate:** 5% of purchase price
- **Maximum Cap:** $500 (vehicles $10,000+ always pay $500 flat)
- **State-Only Fee:** No local city/county variations
- **Trade-in Credit:** FULL (reduces IMF base)
- **Rebates:** TAXABLE (do NOT reduce IMF base)
- **VSC/GAP:** NOT taxable (motor vehicle exemption)
- **Lease Tax:** Upfront IMF, capped at $500, no monthly tax
- **Reciprocity:** NONE (no credit for taxes paid elsewhere)

---

## IMF System Overview

### What is the IMF?

The **Infrastructure Maintenance Fee (IMF)** is a one-time state fee paid when purchasing or leasing a motor vehicle that will be titled/registered in South Carolina. It replaced the traditional sales tax system for vehicles effective July 1, 2017.

### IMF Calculation

```
Purchase Price $0-$9,999:     Pay 5% of purchase price
Purchase Price $10,000+:      Pay $500 flat (cap reached)
```

### Examples

| Vehicle Price | IMF Calculated | IMF Paid | Effective Rate |
|--------------|----------------|----------|----------------|
| $5,000       | $250           | $250     | 5.0%           |
| $8,000       | $400           | $400     | 5.0%           |
| $10,000      | $500           | $500     | 5.0%           |
| $20,000      | $1,000         | **$500** | 2.5%           |
| $35,000      | $1,750         | **$500** | 1.43%          |
| $50,000      | $2,500         | **$500** | 1.0%           |
| $100,000     | $5,000         | **$500** | 0.5%           |

**The cap creates a regressive tax benefit:** Higher-priced vehicles have lower effective tax rates.

---

## Retail Purchase Rules

### 1. Trade-In Policy: FULL CREDIT ✅

Trade-in value is **fully deducted** from the purchase price before IMF calculation.

#### Example (Trade-in Saves Tax)
```
Vehicle Price:     $12,000
Trade-In Value:    -$5,000
─────────────────────────
Net Price:         $7,000
IMF (5%):          $350

Without Trade-in:
Vehicle Price:     $12,000
IMF (5%):          $600 → capped at $500
```

**Savings:** $150 (trade-in brings base under $10,000 threshold)

#### Example (Both Hit Cap)
```
Vehicle Price:     $30,000
Trade-In Value:    -$10,000
─────────────────────────
Net Price:         $20,000
IMF:               $500 (capped)

Without Trade-in:
Vehicle Price:     $30,000
IMF:               $500 (capped)
```

**Savings:** $0 (both scenarios hit $500 cap)

### 2. Manufacturer Rebates: TAXABLE ❌

Manufacturer rebates **DO NOT reduce** the IMF base. The IMF is calculated on the full vehicle price **before** rebates.

#### Example
```
Vehicle MSRP:           $25,000
Manufacturer Rebate:    -$3,000
Customer Pays:          $22,000
─────────────────────────────────
IMF Base:               $25,000 (NOT $22,000)
IMF (5%):               $1,250 → capped at $500
```

**Customer pays IMF on $25,000, then receives $3,000 rebate.**

#### Critical Difference: Rebate vs. Trade-In

| Scenario | IMF Base | IMF Paid | Customer Benefit |
|----------|----------|----------|------------------|
| $5,000 Trade-in | $20,000 | $500 | Tax savings possible |
| $5,000 Rebate | $25,000 | $500 | No tax savings |

**Trade-ins reduce tax base. Rebates do not.**

### 3. Dealer Rebates: TAXABLE ❌

Same treatment as manufacturer rebates. Dealer incentives **do not reduce** the IMF base.

### 4. Documentation Fee: TAXABLE, NO CAP

- **Taxability:** Included in IMF base
- **State Cap:** NONE (dealers set their own fees)
- **Reporting Requirement:** Dealers must report to SCDMV if charging over $225
- **Typical Range:** $300-$600+

#### Example
```
Vehicle Price:     $20,000
Doc Fee:           +$495
─────────────────────────
Total Base:        $20,495
IMF (5%):          $1,024.75 → capped at $500
```

### 5. Service Contracts (VSC): NOT TAXABLE ✅

Motor vehicle service contracts are **EXEMPT** from IMF and sales tax.

**Legal Basis:** SC Code § 12-36-2120(52)

This exemption applies **ONLY to motor vehicles**. General merchandise extended warranties ARE taxable in SC.

### 6. GAP Insurance: NOT TAXABLE ✅

GAP (Guaranteed Asset Protection) is **NOT subject** to IMF or sales tax.

**Treatment:** Considered insurance product, exempt for motor vehicles.

### 7. Accessories: TAXABLE

Dealer-installed accessories are included in the IMF base.

#### Example
```
Vehicle Price:     $28,000
Accessories:       +$2,500
─────────────────────────
Total Base:        $30,500
IMF (5%):          $1,525 → capped at $500
```

### 8. Negative Equity: TAXABLE

Negative equity rolled into a purchase increases the IMF base.

#### Example
```
Vehicle Price:         $25,000
Trade-In Value:        $12,000
Trade-In Payoff:       $15,000
Negative Equity:       +$3,000
──────────────────────────────
IMF Base:              $25,000 - $12,000 + $3,000 = $16,000
IMF (5%):              $800 → capped at $500
```

### 9. Title and Registration Fees: NOT TAXABLE

- **Title Fee:** $15 (not subject to IMF)
- **Registration Fees:** Not taxable (government fees)

---

## Retail Deal Examples

### Example 1: Entry-Level Vehicle (Under Cap)

```
Vehicle Price:         $6,000
Doc Fee:               +$300
Trade-In:              -$1,000
────────────────────────────
IMF Base:              $5,300
IMF (5%):              $265 ✅ (under cap)
```

### Example 2: Mid-Range Vehicle (At Cap)

```
Vehicle Price:         $28,000
Doc Fee:               +$495
Trade-In:              -$8,000
────────────────────────────
IMF Base:              $20,495
IMF (5%):              $1,024.75 → $500 ✅ (capped)
```

### Example 3: Luxury Vehicle with Full Deal

```
Vehicle Price:         $65,000
Accessories:           +$3,500
Doc Fee:               +$495
VSC:                   +$2,800 (NOT taxable)
GAP:                   +$895 (NOT taxable)
Trade-In:              -$15,000
Manufacturer Rebate:   -$5,000 (does NOT reduce base)
Negative Equity:       +$2,000
────────────────────────────────────────────
IMF Base:              $65,000 + $3,500 + $495 - $15,000 + $2,000
                       = $55,995
IMF (5%):              $2,799.75 → $500 ✅ (capped)

Customer Cost Summary:
  Vehicle + Accessories + Doc:  $68,995
  VSC:                          $2,800
  GAP:                          $895
  Trade Payoff:                 -$15,000
  Negative Equity:              $2,000
  Manufacturer Rebate:          -$5,000
  IMF:                          $500
  Title:                        $15
  ────────────────────────────────
  Total Due at Signing:         ~$55,205
```

---

## Lease Rules

### Lease Tax Method: FULL_UPFRONT

South Carolina applies IMF to leases as a **one-time upfront fee** on the agreed value/capitalized cost.

**Key Points:**
- IMF calculated **once** at lease inception
- Capped at **$500 maximum**
- **Monthly payments are NOT separately taxed**
- Trade-in reduces IMF base
- Cap cost reductions (cash, rebates) are NOT separately taxed

### IMF Calculation for Leases

```
IMF Base = (Gross Cap Cost - Trade-In Value + Negative Equity + Doc Fee)
IMF = MIN(IMF Base × 5%, $500)
```

**Note:** Cash down and rebates do NOT reduce IMF base (rebates are taxable).

### Lease Example 1: Basic Lease

```
Gross Cap Cost:        $40,000
Trade-In:              -$8,000
────────────────────────────
IMF Base:              $32,000
IMF (5%):              $1,600 → $500 ✅ (capped)

Monthly Payment:       $450 (NOT taxed)
Term:                  36 months
Total IMF Over Term:   $500 (one-time upfront)
```

### Lease Example 2: With Cap Reduction

```
Gross Cap Cost:        $42,000
Cash Down:             $5,000 (does NOT reduce IMF base)
Manufacturer Rebate:   $2,000 (does NOT reduce IMF base)
Trade-In:              -$8,000 (DOES reduce IMF base)
Doc Fee:               +$495
────────────────────────────────────────
IMF Base:              $42,000 - $8,000 + $495 = $34,495
IMF (5%):              $1,724.75 → $500 ✅ (capped)

Net Cap Cost:          $42,000 - $5,000 - $2,000 - $8,000 = $27,000
Monthly Payment:       $425 (calculated on net cap cost, NOT taxed)
```

### Lease Example 3: Under Cap

```
Gross Cap Cost:        $14,000
Trade-In:              -$6,000
────────────────────────────
IMF Base:              $8,000
IMF (5%):              $400 ✅ (under cap)
```

**Trade-in saves:** Without trade → $14,000 × 5% = $700 → capped at $500
With trade → $400
**Savings:** $100

### Lease Backend Products

- **VSC:** NOT taxable (motor vehicle exemption)
- **GAP:** NOT taxable (motor vehicle exemption)
- **Doc Fee:** TAXABLE (included in IMF base)

---

## Special Scenarios

### 1. New Residents: $250 IMF

If you **move to South Carolina** with a vehicle you already own, you pay a **reduced $250 IMF** instead of the full $500.

**Requirements:**
- Vehicle already owned when becoming SC resident
- Not a new purchase
- Paid at time of SC registration/titling

**Example:**
```
Own vehicle, move to SC from NC
SC IMF (new resident):     $250
Title Fee:                 +$15
Registration:              +varies
────────────────────────────────
Total Due:                 ~$265+
```

### 2. Out-of-State Purchases: Double Taxation

South Carolina has **NO reciprocity** with other states. If you purchase a vehicle in another state and pay that state's sales tax, you **still owe** the full SC IMF when registering.

**Example:**
```
SC resident buys in Georgia
  Georgia vehicle price:     $30,000
  Georgia tax (7%):          $2,100 ✅ paid to GA
  ───────────────────────────────────
  SC IMF when registering:   $500 ✅ paid to SC
  ───────────────────────────────────
  Total Tax Paid:            $2,600 (double taxation)
```

**No credit given for GA tax paid.**

### 3. Effective Tax Rates by Vehicle Price

| Vehicle Price | IMF Paid | Effective Rate | Savings vs. 5% |
|--------------|----------|----------------|----------------|
| $10,000      | $500     | 5.0%           | $0             |
| $20,000      | $500     | 2.5%           | $500           |
| $30,000      | $500     | 1.67%          | $1,000         |
| $50,000      | $500     | 1.0%           | $2,000         |
| $80,000      | $500     | 0.625%         | $3,500         |
| $100,000     | $500     | 0.5%           | $4,500         |

**High-value vehicles benefit significantly from the $500 cap.**

---

## Comparison: SC vs. Other States

### SC vs. Alabama

| Feature | South Carolina | Alabama |
|---------|----------------|---------|
| Base Rate | 5% IMF | 2% state + local |
| Cap | $500 | None |
| Trade-in | Full credit | State only (2%), not local |
| Rebates | Taxable | Taxable |
| VSC/GAP | NOT taxable | NOT taxable |
| Lease | Upfront IMF ($500 cap) | Hybrid (upfront + monthly) |

**SC Advantage:** $500 cap saves massive tax on luxury vehicles
**AL Advantage:** Lower base rate (2% vs 5%) on vehicles under $10,000

### SC vs. North Carolina

| Feature | South Carolina | North Carolina |
|---------|----------------|----------------|
| Tax Type | IMF (5% cap $500) | Highway Use Tax (3%) |
| Cap | $500 maximum | None |
| Trade-in | Full credit | Full credit |
| Rebates | Taxable | Non-taxable |
| Reciprocity | None | 90-day window |

**SC Advantage:** $500 cap on high-value vehicles
**NC Advantage:** 3% rate (vs SC 5%), rebates non-taxable

---

## Implementation Notes

### Tax Calculation Logic

```typescript
// Retail IMF Calculation
const imfBase =
  vehiclePrice +
  accessories +
  docFee +
  negativeEquity -
  tradeInValue;
  // Rebates do NOT reduce base
  // VSC and GAP are NOT included

const imfCalculated = imfBase * 0.05;
const imfFinal = Math.min(imfCalculated, 500);
```

```typescript
// Lease IMF Calculation
const imfBase =
  grossCapCost +
  docFee +
  negativeEquity -
  tradeInValue;
  // Cash down does NOT reduce base
  // Rebates do NOT reduce base
  // VSC and GAP are NOT included

const imfCalculated = imfBase * 0.05;
const imfFinal = Math.min(imfCalculated, 500);

// Monthly payments: NOT taxed
```

### Critical Rules for Tax Engine

1. **Always apply $500 cap:** `Math.min(imfBase * 0.05, 500)`
2. **Trade-in reduces base:** Subtract from vehicle price
3. **Rebates do NOT reduce base:** IMF on full price before rebates
4. **VSC/GAP excluded:** Never include in IMF base
5. **Doc fee included:** Add to IMF base, no cap on amount
6. **Lease: one-time IMF:** No monthly tax component
7. **No reciprocity:** Never credit taxes paid elsewhere

---

## Legal Sources

### Primary Sources
- South Carolina Department of Revenue (dor.sc.gov)
- South Carolina Department of Motor Vehicles (scdmvonline.com)
- SC Code § 12-36-2120: Exemptions
  - § 12-36-2120(52): Motor vehicle service contracts exempt
  - § 12-36-2120(83): Lease exemption from sales tax (subject to IMF)
- SC Act No. 40 of 2017 (Roads Bill - established IMF system)

### Guidance Documents
- SC DOR Sales and Use Tax Guide for Automobile and Truck Dealers
- SCDMV Dealer Connection (dealer guidance)
- SCDMV Infrastructure Maintenance Fee guidance (July 1, 2017)

### Key Statutes
- **SC Code § 12-36-2120(52):** Motor vehicle extended service contracts exempt
- **SC Code § 12-36-2120(83):** Leases subject to IMF, exempt from sales tax
- **SC Act No. 40 of 2017:** Infrastructure Maintenance Fee implementation

---

## Frequently Asked Questions

### 1. Why does SC have IMF instead of sales tax?

The IMF was implemented on July 1, 2017, as part of SC Act No. 40 (the "Roads Bill") to fund infrastructure maintenance. It replaced the traditional sales tax system for motor vehicles.

### 2. Is the $500 cap per vehicle or per transaction?

**Per vehicle.** Each vehicle in a transaction has its own IMF calculation, each capped at $500.

### 3. Can I avoid the IMF by buying out-of-state?

**No.** SC residents must pay the IMF when registering the vehicle in SC, regardless of where it was purchased. No credit is given for taxes paid to other states.

### 4. Do I pay IMF on a private party sale?

**Yes.** The IMF applies to all vehicle purchases (dealer and private party) that will be titled/registered in SC.

### 5. Are there any exemptions to the IMF?

Certain exemptions exist:
- Government vehicles
- Vehicles already subject to property tax in SC
- Farm vehicles (under certain conditions)
- Vehicles transferred between immediate family members (under certain conditions)

Consult SCDMV for specific exemption requirements.

### 6. What happens if I trade in a lease?

If you're trading in a leased vehicle with positive equity (buyout less than value), the equity is treated as a trade-in credit and reduces the IMF base on your new purchase or lease.

### 7. How is IMF different from general sales tax?

| Feature | IMF (Vehicles) | General Sales Tax |
|---------|----------------|-------------------|
| Rate | 5% | 6% state |
| Local taxes | None | 1-3% local |
| Cap | $500 | None |
| What it applies to | Motor vehicles only | Most tangible goods |

### 8. Can I finance the IMF?

The IMF must typically be paid upfront at the time of registration. Check with your dealer about financing options that may include the IMF in the total amount financed.

---

## Test Coverage

The South Carolina tax rules have been validated with **46 comprehensive test cases** covering:

- ✅ IMF cap scenarios (under, at, over threshold)
- ✅ Trade-in credit calculations
- ✅ Rebate treatment (taxable, no base reduction)
- ✅ Doc fee handling (taxable, no cap)
- ✅ VSC and GAP exemptions
- ✅ Accessories and negative equity
- ✅ Complex retail deals
- ✅ Lease upfront IMF calculations
- ✅ Lease trade-in and cap reductions
- ✅ Lease backend products
- ✅ Edge cases (zero purchase, thresholds)
- ✅ Effective tax rate analysis
- ✅ Double taxation scenarios

**Test File:** `/tests/autoTaxEngine/US_SC.test.ts`
**All tests passing:** ✅ 46/46

---

## Change Log

### Version 2 (November 14, 2025)
- Complete rewrite with comprehensive IMF system documentation
- Added detailed examples for retail and lease scenarios
- Documented VSC/GAP motor vehicle exemption (SC Code § 12-36-2120(52))
- Added new resident $250 IMF rule
- Clarified rebate treatment (taxable, no base reduction)
- Added 46 comprehensive test cases
- Documented no reciprocity policy

### Version 1 (Prior)
- Initial stub implementation
- Basic IMF structure

---

## Summary

South Carolina's IMF system is **one of the most taxpayer-friendly** for high-value vehicle purchases due to the $500 cap. However, it's **less favorable** for lower-priced vehicles (under $10,000) compared to states with lower base rates.

### Key Advantages
✅ $500 cap saves thousands on luxury vehicles
✅ Full trade-in credit
✅ VSC/GAP not taxable
✅ No local tax variations (state-only)
✅ Simple, predictable calculation

### Key Disadvantages
❌ Higher 5% rate on vehicles under $10,000
❌ Manufacturer rebates don't reduce tax base
❌ No reciprocity (double taxation possible)
❌ No doc fee cap
❌ New residents pay $250 IMF on existing vehicles

**Effective Date:** July 1, 2017
**Rule Implementation:** Production Ready
**Last Reviewed:** November 14, 2025
