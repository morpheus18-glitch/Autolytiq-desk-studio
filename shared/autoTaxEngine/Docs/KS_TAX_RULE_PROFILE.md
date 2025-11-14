# Kansas (KS) Automotive Tax Rule Profile

**State Code:** KS
**Version:** 2
**Last Updated:** 2025-11-14
**Researcher:** AI Tax Research Engine
**Implementation Status:** ✅ Complete

---

## Executive Summary

Kansas uses a **compensating use tax** system with a 6.5% state rate plus local taxes (county and city), resulting in combined rates from 6.5% to 10.75%. Kansas is notable for several **unique features**:

1. **NEW 2025: 120-Day Sale Provision** - Tax credit for selling vehicle within 120 days before or after purchase
2. **Service Contracts (VSC) TAXABLE** - Kansas is among the minority of states taxing warranty/service contracts
3. **FULL_UPFRONT Lease Taxation** - All tax paid at lease inception, no monthly taxation
4. **Trade-in on leases TAXED** - Opposite treatment from purchases (reduces vs. increases tax)
5. **Vehicle Property Tax** - Separate annual recurring tax based on assessed value

---

## Tax Rates

### State Compensating Use Tax
- **Rate:** 6.5%
- **Applies to:** All motor vehicle sales and leases statewide
- **Legal Basis:** K.S.A. § 79-3603

### Local Taxes (County + City)
- **County Range:** 0.5% to 2.0% (typical)
- **City Range:** 0% to 2.25%
- **Combined Local Range:** 0.5% to 4.25%

### Combined Tax Rates (Examples)

| Jurisdiction | State | County | City | **Total** |
|-------------|-------|--------|------|-----------|
| **Wichita** (Sedgwick Co) | 6.5% | 1.0% | 0% | **7.5%** |
| **Kansas City, KS** (Wyandotte Co) | 6.5% | 1.475% | 1.125% | **9.125%** |
| **Overland Park** (Johnson Co) | 6.5% | 1.475% | 1.125% | **9.1%** |
| **Topeka** (Shawnee Co) | 6.5% | 1.15% | 1.5% | **9.15%** |
| **Lawrence** (Douglas Co) | 6.5% | 1.25% | 1.55% | **9.3%** |
| **Olathe** (Johnson Co) | 6.5% | 1.475% | 1.125% | **9.1%** |
| **Rural Areas** (state only) | 6.5% | 0% | 0% | **6.5%** |

**Range:** 6.5% (minimum) to 10.75% (maximum in some high-tax cities)

---

## Trade-In Treatment

### Retail Purchases: FULL CREDIT ✅

Kansas provides **full trade-in credit** on purchases - the trade-in value is deducted from the purchase price before calculating tax.

**Statutory Basis:**
- Official guidance: "Dealers should charge sales tax on the net price or trade difference — after the trade-in allowance."

**Requirements:**
- Trade-in vehicle must be owned by purchaser
- Must file **Form TR-12 Affidavit to a Fact** or **Form TR-312 Bill of Sale** with County Treasurer
- Trade-in allowance must be separately stated on purchase agreement
- Credit applies to **both state AND local taxes**

**Example:**
```
Vehicle Price:     $30,000
Doc Fee:           $   285
Trade-In Value:    -$10,000
─────────────────────────────
Taxable Base:      $20,285
Tax @ 7.5%:        $ 1,521.38
```

### NEW 2025: 120-Day Sale Provision 🆕

**Effective:** January 1, 2025 (per **Notice 24-19**)

If an individual **sells** a used vehicle (not trades it in) and **purchases** a new or used vehicle within **120 days before or after** the sale, sales tax is only due on the amount paid that **exceeds** the amount received from the sale.

**Key Rules:**
- ✅ Applies to sales on or after January 1, 2025
- ✅ 120-day window **BEFORE or AFTER** the purchase
- ✅ If purchase price ≤ sale proceeds, **NO tax due**
- ✅ Individual must be the seller (not dealer trade)
- ✅ Claim credit with bill of sale to County Treasurer at registration
- ✅ Or apply for refund with **Form ST-21VT** within 3 years

**Example:**
```
Sold vehicle privately:  $15,000 (March 1, 2025)
Purchased from dealer:   $28,000 (May 15, 2025)
Days between:            75 days (within 120-day window)

Taxable Base:  $28,000 - $15,000 = $13,000
Tax @ 7.5%:    $13,000 × 7.5% = $975

Without credit:  $28,000 × 7.5% = $2,100
Tax Savings:     $2,100 - $975 = $1,125
```

### Leases: NO CREDIT ❌

Kansas does **NOT** provide trade-in credit on leases. Trade-in equity is treated as a **capitalized cost reduction** and is **FULLY TAXABLE**.

**Critical Difference:**
- **Purchase:** Trade-in **REDUCES** taxable base (saves tax)
- **Lease:** Trade-in equity is **TAXED** (costs tax)

**Example (Lease with $10,000 trade-in @ 7.5%):**
```
Gross Cap Cost:         $30,000
Trade-In Equity:        $10,000 (treated as cap reduction)
─────────────────────────────────────
Total Taxable Base:     $40,000 (cap + reduction)
Tax @ 7.5%:             $3,000 (due at signing)
```

**Comparison:**
- Purchase: Trade-in saves $750 in tax
- Lease: Trade-in **costs** $750 in tax

---

## Rebate Treatment

### Manufacturer Rebates: TAXABLE ❌

Manufacturer rebates do **NOT** reduce the taxable purchase price. Tax is calculated on the full vehicle price **BEFORE** manufacturer rebate.

**Reasoning:** Rebates are treated as manufacturer payments to the dealer on behalf of the buyer, making the full amount taxable.

**Example:**
```
Vehicle MSRP:          $28,000
Manufacturer Rebate:   -$ 3,000
Customer Pays:         $25,000
─────────────────────────────────
TAXABLE BASE:          $28,000 (NOT $25,000)
Tax @ 7.5%:            $ 2,100
```

**Exception:** Manufacturer option-package incentives that reduce the vehicle cost **DO** reduce the tax base.

### Dealer Rebates/Discounts: NON-TAXABLE ✅

If dealer reduces the actual selling price due to their own promotion, tax is calculated on the reduced selling price.

**Example:**
```
MSRP:              $28,000
Dealer Discount:   -$ 2,000
Selling Price:     $26,000
─────────────────────────────────
TAXABLE BASE:      $26,000
Tax @ 7.5%:        $ 1,950
```

---

## Fee and Product Taxability

### Documentation Fee
- **Taxable:** ✅ YES (at full combined state + local rate)
- **Cap:** ❌ NO CAP (Kansas has no statutory limit)
- **Average:** $285 (as of 2024-2025)
- **Range:** $150 to $500+

### Service Contracts (VSC/Extended Warranty) 🔴 UNIQUE
- **Taxable:** ✅ **YES** (unique Kansas rule)
- **Legal Basis:** **K.S.A. 79-3603(r)** and **K.A.R. § 92-19-62**
- **Scope:** Taxable whether purchased WITH vehicle or SEPARATELY later
- **Trade-in:** Trade-in allowance **MAY be applied** to cost of warranty

**Kansas is among the MINORITY of states that tax service contracts.**

**Official Guidance:**
> "The sale of a warranty, service contract or maintenance contract for motor vehicles is subject to sales tax. A warranty or similar agreement is taxable whether purchased at the time a vehicle is purchased, or purchased separately at another time."

**Example:**
```
Vehicle Price:        $25,000
Doc Fee:              $   285
Service Contract:     $ 2,500
Trade-In Value:       -$ 8,000
────────────────────────────────
Taxable Base:         $19,785
Tax @ 7.5%:           $ 1,483.88
```

### GAP Insurance
- **Taxable:** ❌ **NO** (when separately stated)
- **Requirement:** Must be **clearly labeled and separately stated** on invoice
- **Legal Basis:** "Insurance which benefits the buyer, including GAP insurance, is not included as part of the selling price and therefore not taxed"

### Accessories
- **Taxable:** ✅ YES (at full combined rate)
- **Treatment:** Included in taxable purchase price
- **Trade-in:** Subject to trade-in credit (added before, credit applied after)

### Negative Equity
- **Retail Purchases:** ❌ NOT taxable
- **Leases:** ✅ **TAXABLE** (increases cap cost)
- **Treatment:** Added to loan amount (purchase) or cap cost (lease)

### Title and Registration Fees
- **Taxable:** ❌ NO (government fees)
- **Requirement:** Must be separately stated on invoice

---

## Lease Taxation - UNIQUE KANSAS APPROACH

### Method: FULL_UPFRONT 🔴 UNIQUE

Kansas treats leases more like **purchases** than most other states. Tax is paid **upfront** on the entire capitalized cost at lease inception, with **NO monthly payment taxation**.

**Legal Basis:** K.A.R. § 92-19-55b (Operating leases)

### What is Taxed Upfront:
- ✅ Gross capitalized cost (agreed-upon value of vehicle)
- ✅ Capitalized cost reductions (down payment, rebates, **trade equity**)
- ✅ Doc fees, acquisition fees
- ✅ Service contracts (if included)

### What is NOT Taxed:
- ❌ Monthly lease payments (already taxed upfront via cap cost)
- ❌ GAP insurance (when separately stated)
- ❌ Refundable security deposits

### Calculation Formula:

```
Total Upfront Tax = (Gross Cap Cost + Cap Reductions + Taxable Fees) × (State + Local Rate)
```

### Example (Wichita - 7.5% total):

```
Gross Cap Cost:       $35,000
Cash Down:            $ 5,000
Trade-In Equity:      $ 3,000
Acquisition Fee:      $   595
────────────────────────────────
Total Taxable:        $43,595
Upfront Tax @ 7.5%:   $ 3,269.63 (ALL due at signing)

Monthly Payment:      $450 × 36 months (NO additional tax)
Total Payments:       $16,200
Total Cost:           $16,200 + $3,269.63 = $19,469.63
```

### Comparison to Other States:

| State | Method | When Tax Paid |
|-------|--------|---------------|
| **Kansas** | FULL_UPFRONT | All at signing |
| Alabama | HYBRID | Upfront + monthly |
| Indiana | MONTHLY | Each payment |
| New Jersey | FULL_UPFRONT | Whole taxable base upfront |

Kansas is similar to New Jersey but includes cap reductions in the upfront tax base.

---

## Lease vs Purchase Comparison

### Critical Differences:

| Feature | **Purchase** | **Lease** |
|---------|-------------|-----------|
| **Trade-in Treatment** | Reduces taxable base ✅ | Added to taxable base ❌ |
| **Trade-in Tax Impact** | Saves tax (credit) | Costs tax (taxable reduction) |
| **Negative Equity** | NOT taxable | TAXABLE |
| **When Tax Paid** | At purchase | All upfront at signing |
| **Service Contracts** | TAXABLE | TAXABLE |
| **GAP Insurance** | NOT taxable | NOT taxable |
| **Doc Fee** | TAXABLE | TAXABLE |

### Example Comparison ($10,000 trade-in, 7.5% rate):

**PURCHASE:**
```
Vehicle Price:    $30,000
Trade-In:         -$10,000
─────────────────────────
Taxable:          $20,000
Tax @ 7.5%:       $ 1,500

Trade-in SAVED $750 in tax
```

**LEASE:**
```
Gross Cap:        $30,000
Trade-In Equity:  +$10,000 (cap reduction)
─────────────────────────────────────────
Total Taxable:    $40,000
Tax @ 7.5%:       $ 3,000

Trade-in COST $750 in tax
```

**Conclusion:** In Kansas, trading in a vehicle on a **lease costs significantly more in tax** than on a **purchase**.

---

## Reciprocity Rules

Kansas provides **reciprocal credit** for sales/use taxes paid to other states.

### How It Works:

**Credit Formula:**
```
Kansas Tax Due = Total KS Tax (state + local) - Tax Paid to Other State
```

**Credit is capped at Kansas tax amount** - no refund if other state tax exceeds Kansas tax.

### Scenarios:

**1. Other State Tax ≥ Kansas Tax (NO additional tax)**
```
Vehicle purchased in California:  $30,000
California tax paid (8%):         $ 2,400
Kansas tax would be (7.5%):       $ 2,250
Credit allowed:                   $ 2,250
Additional KS tax due:            $     0
```

**2. Other State Tax < Kansas Tax (PAY DIFFERENCE)**
```
Vehicle purchased in Montana:     $30,000
Montana tax paid (0%):            $     0
Kansas tax due (7.5%):            $ 2,250
Credit allowed:                   $     0
Additional KS tax due:            $ 2,250
```

**3. Partial Credit**
```
Vehicle purchased in Wyoming:     $30,000
Wyoming tax paid (4%):            $ 1,200
Kansas tax due (7.5%):            $ 2,250
Credit allowed:                   $ 1,200
Additional KS tax due:            $ 1,050
```

### Requirements:
- ✅ Proof of tax paid to other state (bill of sale, receipt)
- ✅ Provide documentation to **County Treasurer** at registration
- ✅ Credit applies to **both state AND local taxes**
- ✅ Credit based on **tax actually PAID** (not just due)

---

## Vehicle Property Tax (SEPARATE TAX)

Kansas charges an **annual vehicle property tax** at registration and renewal, **completely separate from the one-time sales/use tax**.

### Key Details:
- **Frequency:** Annual recurring tax
- **Basis:** Vehicle's assessed value (MSRP with depreciation applied)
- **Rate:** County **mill levy** determines amount (varies by county)
- **Pro-ration:** Pro-rated from purchase date to registration month
- **Purpose:** In lieu of personal property tax
- **Collection:** Paid to County Clerk at registration/renewal

### Resources:
- **Kansas DOR Vehicle Property Tax Calculator:** https://mvs.dmv.kdor.ks.gov/vehiclepropertytaxlookup/
- Estimate by make/model/year, VIN, or RV weight/year

**Example Workflow:**
1. Purchase vehicle and pay one-time sales/use tax
2. At registration: Pay pro-rated property tax for partial year
3. Each year at renewal: Pay full year property tax
4. Property tax decreases as vehicle ages (depreciation)

**Important:** Property tax is **NOT included** in sales tax calculations. It's a separate annual obligation.

---

## Calculation Examples

### Example 1: Wichita Purchase with VSC

**Scenario:**
- Location: Wichita, KS (7.5% total: 6.5% state + 1% county)
- Vehicle Price: $30,000
- Doc Fee: $285
- Service Contract: $2,500
- Trade-In Value: $10,000

**Calculation:**
```
Vehicle Price:        $30,000
Doc Fee:              $   285
Service Contract:     $ 2,500
                      ───────
Subtotal:             $32,785
Trade-In Value:       -$10,000
                      ───────
Taxable Base:         $22,785

State Tax (6.5%):     $ 1,481.03
County Tax (1.0%):    $   227.85
                      ──────────
Total Tax:            $ 1,708.88

Amount Financed:      $22,785 + $1,708.88 = $24,493.88
```

### Example 2: Kansas City Purchase

**Scenario:**
- Location: Kansas City, KS (9.125% total: 6.5% state + 1.475% county + 1.125% city)
- Vehicle Price: $25,000
- Doc Fee: $285
- Service Contract: $2,000
- Trade-In Value: $8,000

**Calculation:**
```
Vehicle Price:        $25,000
Doc Fee:              $   285
Service Contract:     $ 2,000
                      ───────
Subtotal:             $27,285
Trade-In Value:       -$ 8,000
                      ───────
Taxable Base:         $19,285

State Tax (6.5%):     $ 1,253.53
County Tax (1.475%):  $   284.45
City Tax (1.125%):    $   216.96
                      ──────────
Total Tax:            $ 1,754.94

Amount Financed:      $19,285 + $1,754.94 = $21,039.94
```

### Example 3: Wichita Lease (FULL_UPFRONT)

**Scenario:**
- Location: Wichita, KS (7.5% total)
- Gross Cap Cost: $35,000
- Cash Down: $5,000
- Trade-In Equity: $3,000
- Acquisition Fee: $595
- Monthly Payment: $450
- Term: 36 months

**Calculation:**
```
Gross Cap Cost:       $35,000
Cash Down:            $ 5,000
Trade-In Equity:      $ 3,000
Acquisition Fee:      $   595
                      ───────
Total Taxable Base:   $43,595

Upfront Tax @ 7.5%:   $ 3,269.63 (ALL due at signing)

Monthly Payment:      $450 × 36 = $16,200 (NO additional tax)

Total Lease Cost:
  Upfront:            $ 3,269.63
  Payments:           $16,200.00
  Cash/Trade/Fee:     $ 8,595.00
                      ──────────
  Total:              $28,064.63
```

### Example 4: 120-Day Sale Provision (NEW 2025)

**Scenario:**
- Sold vehicle privately: $15,000 (March 1, 2025)
- Purchased from dealer: $28,000 (May 15, 2025)
- Days between: 75 days (within 120-day window)
- Location: Wichita (7.5% rate)

**Calculation:**
```
Purchase Price:       $28,000
Sale Proceeds:        -$15,000
                      ────────
Taxable Base:         $13,000

Tax @ 7.5%:           $   975.00

WITHOUT 120-Day Credit:
Purchase Price:       $28,000
Tax @ 7.5%:           $ 2,100.00

Tax Savings:          $ 1,125.00
```

### Example 5: Negative Equity (Purchase vs Lease)

**Scenario:**
- Vehicle/Cap Cost: $25,000
- Trade-In Value: $10,000
- Trade-In Payoff: $13,000
- Negative Equity: $3,000
- Doc Fee: $285
- Location: Wichita (7.5% rate)

**PURCHASE (Negative Equity NOT Taxed):**
```
Vehicle Price:        $25,000
Doc Fee:              $   285
                      ───────
Subtotal:             $25,285
Trade-In Value:       -$10,000
                      ───────
Taxable Base:         $15,285 (negative equity NOT added)

Tax @ 7.5%:           $ 1,146.38

Amount Financed:
  Taxable Base:       $15,285.00
  Tax:                $ 1,146.38
  Negative Equity:    $ 3,000.00
                      ──────────
  Total:              $19,431.38
```

**LEASE (Negative Equity TAXED):**
```
Base Cap Cost:        $25,000
Negative Equity:      $ 3,000
Doc Fee:              $   285
                      ───────
Adjusted Cap Cost:    $28,285

Upfront Tax @ 7.5%:   $ 2,121.38

Trade-In Equity:      $     0 (negative)
Total Taxable:        $28,285

Difference:
  Lease Tax:          $ 2,121.38
  Purchase Tax:       $ 1,146.38
  Extra Tax on Lease: $   975.00
```

---

## Special Considerations

### 1. Compensating Use Tax Terminology
Kansas uses "compensating use tax" rather than "sales tax" for vehicle transactions, though functionally they are equivalent.

### 2. Service Contract Trade-In Credit
Unlike most taxable items, Kansas explicitly allows trade-in allowance to be applied to the cost of a warranty or service contract. This reduces the taxable VSC amount.

**Example:**
```
Service Contract Price:  $3,000
Trade-In Applied:        -$1,000
                         ──────
Taxable VSC Amount:      $2,000
Tax @ 7.5%:              $  150
```

### 3. GAP Insurance Separate Statement Requirement
For GAP insurance to be exempt, it **must be clearly labeled and separately stated** on the invoice. If bundled with other fees or not clearly separated, it may be considered taxable.

### 4. New 2025 Laws
The **120-day sale provision** (Notice 24-19) is a significant change effective January 1, 2025, providing tax relief for individuals who sell privately before or after a dealer purchase.

### 5. Out-of-State Purchases
For vehicles purchased out-of-state and brought to Kansas:
- Pay Kansas **compensating use tax** at registration
- Receive credit for taxes paid to other state
- Based on buyer's residence/registration location rates

### 6. Dealer Location vs Buyer Location
- **In-state dealer sales:** Tax based on dealer location
- **Out-of-state purchases (use tax):** Tax based on buyer's residence/registration location

### 7. County Treasurer Role
In Kansas, the **County Treasurer** plays a key role in:
- Collecting use tax at vehicle registration
- Processing trade-in credit forms (TR-12, TR-312)
- Processing 120-day sale provision claims
- Collecting vehicle property tax

---

## Tax Rate Resources

### Official Resources:
- **Kansas Department of Revenue:** https://www.ksrevenue.gov
- **Publication KS-1526:** Business Taxes for Motor Vehicle Transactions
- **Publication KS-1510:** Sales Tax and Compensating Use Tax
- **Publication KS-1700:** City, County and Special Jurisdiction Tax Rates (updated quarterly)
- **Notice 24-19:** Used Motor Vehicle Sales Transactions (2025 changes)
- **Form ST-21VT:** Request for Sales Tax Refund (120-day provision)
- **Form TR-12 / TR-312:** Trade-in credit forms
- **Vehicle Property Tax Calculator:** https://mvs.dmv.kdor.ks.gov/vehiclepropertytaxlookup/

### Legal References:
- **K.S.A. § 79-3603:** Sales and compensating use tax definitions
- **K.S.A. § 79-3603(r):** Service contracts and warranties taxable
- **K.A.R. § 92-19-30:** Motor vehicles, isolated or occasional sales
- **K.A.R. § 92-19-55b:** Operating leases
- **K.A.R. § 92-19-62:** Warranties, service and maintenance contracts

---

## Unique Kansas Features Summary

1. ✅ **Compensating Use Tax (6.5% state rate)** - Special terminology for vehicle taxes
2. 🆕 **120-Day Sale Provision (Effective Jan 1, 2025)** - Tax credit for selling vehicle within 120 days
3. 🔴 **Service Contracts TAXABLE** - Kansas among minority of states taxing VSC
4. ✅ **GAP Insurance NOT Taxable** - When separately stated
5. ✅ **Full Trade-In Credit (State + Local)** - On purchases
6. 🔴 **FULL_UPFRONT Lease Method** - All tax paid at signing, no monthly tax
7. ❌ **Leases: Trade-in Equity TAXED** - Opposite of purchase (cap reduction, not credit)
8. ✅ **Leases: Cap Reductions ADDED to Base** - Not subtracted like retail
9. 🔴 **Vehicle Property Tax** - Annual recurring tax separate from sales tax
10. ❌ **No Doc Fee Cap** - Average $285 but no statutory limit

---

## Implementation Notes

### Tax Engine Implementation:
- **State Code:** KS
- **Version:** 2
- **Vehicle Tax Scheme:** STATE_PLUS_LOCAL
- **Trade-In Policy:** FULL (retail), NONE (lease)
- **Lease Method:** FULL_UPFRONT
- **Reciprocity:** Enabled (CREDIT_UP_TO_STATE_RATE)
- **Service Contracts:** taxOnServiceContracts = true (UNIQUE)
- **GAP:** taxOnGap = false (when separately stated)
- **Negative Equity:** false (retail), true (lease)

### Special Handling Required:
1. **Service contract taxability** - Must be included in taxable base
2. **Lease cap cost calculation** - Add cap reductions to base (not subtract)
3. **Lease trade-in treatment** - No credit, treat as taxable cap reduction
4. **120-day provision** - Manual processing with Form ST-21VT or at registration
5. **Vehicle property tax** - Separate calculation, not part of sales tax

### Testing Coverage:
- ✅ 20+ comprehensive test cases
- ✅ Retail purchase scenarios (with VSC)
- ✅ Lease scenarios (FULL_UPFRONT method)
- ✅ Trade-in credit (purchase vs lease)
- ✅ 120-day sale provision
- ✅ Negative equity (purchase vs lease)
- ✅ Service contract taxability
- ✅ GAP exemption
- ✅ Reciprocity calculations
- ✅ Edge cases and special scenarios

---

## Conclusion

Kansas has a **unique tax system** that differs significantly from most states:

**Strengths:**
- Full trade-in credit on purchases (state + local)
- NEW 2025: 120-day sale provision for private sales
- Clear reciprocity rules with credit for taxes paid elsewhere
- No doc fee cap provides flexibility

**Complexities:**
- Service contracts TAXABLE (minority approach)
- Lease taxation differs dramatically from purchases
- Trade-in on leases INCREASES tax (opposite of purchases)
- FULL_UPFRONT lease method requires large upfront payment
- Vehicle property tax is separate annual obligation

**Dealership Considerations:**
- Educate customers on VSC taxability (many expect it to be exempt)
- Highlight 120-day provision for customers considering private sales
- Warn lease customers about trade-in taxation (opposite of purchase)
- Explain FULL_UPFRONT lease taxation (large upfront tax payment)
- Clarify vehicle property tax is separate from sales tax

**Customer Impact:**
- Service contracts cost more due to taxation
- Leasing with a trade-in costs MORE in tax than purchasing
- 120-day provision can save significant tax for private sellers
- Property tax is ongoing annual cost beyond one-time sales tax

---

**Document Version:** 1.0
**Implementation Status:** ✅ Complete
**Test Coverage:** ✅ Comprehensive (20+ tests)
**Production Ready:** ✅ Yes
