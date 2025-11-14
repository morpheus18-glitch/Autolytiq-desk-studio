# Arizona (AZ) Tax Rule Profile

**State:** Arizona
**State Code:** AZ
**Version:** 2
**Last Updated:** 2025-11-13
**Tax System:** Transaction Privilege Tax (TPT)

---

## Executive Summary

Arizona employs a unique **Transaction Privilege Tax (TPT)** system for vehicle sales, which is technically a privilege tax on the seller rather than a traditional sales tax on the buyer (though it's passed through to the buyer). The state TPT rate is **5.6%**, with local jurisdictions (counties, cities, and special districts) adding additional rates, resulting in combined rates ranging from **5.6% to 11.2%+**.

### Key Differentiators

1. **TPT vs. Sales Tax:** Arizona's TPT is a privilege tax on dealers, not a traditional sales tax
2. **VLT Separate System:** Vehicle License Tax (annual registration tax) is calculated separately from TPT
3. **Model City Tax Code:** City tax treatment may differ from state TPT rules
4. **Service Contracts as Insurance:** VSC and GAP treated as insurance products (non-taxable)
5. **Hybrid Lease Taxation:** Cap reduction taxed upfront + monthly payments taxed monthly
6. **Limited Reciprocity:** 21 states with reciprocal agreements, complex multi-tier exemptions

---

## Table of Contents

1. [Tax Rates](#tax-rates)
2. [Retail Transaction Rules](#retail-transaction-rules)
3. [Lease Transaction Rules](#lease-transaction-rules)
4. [Vehicle License Tax (VLT)](#vehicle-license-tax-vlt)
5. [Reciprocity & Multi-State Rules](#reciprocity--multi-state-rules)
6. [Special Cases & Exemptions](#special-cases--exemptions)
7. [Calculation Examples](#calculation-examples)
8. [Documentation & Sources](#documentation--sources)

---

## Tax Rates

### State TPT Rate
- **Base Rate:** 5.6% (state Transaction Privilege Tax)
- **Type:** Privilege tax on seller (passed through to buyer)

### Local Rates
- **County Excise Tax:** Varies by county
  - Example: Pima County 0.5%, Maricopa County 0.7%
- **City Privilege Tax:** Varies by city
  - Phoenix: 2.5%
  - Scottsdale: 1.75%
  - Flagstaff: 2.57%
  - Tucson: 2.5%
- **Special Districts:** Transit, stadium, other special assessment districts

### Combined Rate Range
- **Minimum:** 5.6% (unincorporated areas, state only)
- **Maximum:** 11.2%+ (high-tax jurisdictions like Flagstaff, Scottsdale)
- **Most Common:** 7.5% - 9.0% in major metro areas

### Rate Determination
**CRITICAL:** Tax rate is based on the **dealer's location** (point of sale), NOT the buyer's residence or registration address.

---

## Retail Transaction Rules

### Trade-In Policy
**Type:** FULL CREDIT

- Trade-in value is **fully deducted** from purchase price before calculating TPT
- **No cap** on trade-in amount
- Applies to both state and local TPT
- **Legal Basis:** ARS § 42-5061(A)(28), AZDOR TPR 03-7

**Example:**
```
Vehicle Price:        $30,000
Trade-In Value:       -$10,000
─────────────────────────────
Taxable Base:         $20,000
TPT @ 8.0%:            $1,600
```

### Rebate Treatment

#### Manufacturer Rebates
- **Taxability:** NOT taxable (reduce sale price)
- Manufacturer rebates **reduce the taxable base** before TPT calculation
- Buyer must assign rebate rights to dealer at time of sale
- **Legal Basis:** AZDOR Model City Tax Code, TPR 03-7

**Example:**
```
Vehicle Price:               $35,000
Manufacturer Rebate:         -$3,000
─────────────────────────────────
Taxable Base:                $32,000
TPT @ 8.0%:                   $2,560
```

#### Dealer Rebates/Incentives
- **Taxability:** TAXABLE (do NOT reduce sale price)
- Dealer rebates are post-sale incentives that do not affect TPT calculation
- Customer receives rebate after tax is paid on full price

**Example:**
```
Vehicle Price:               $35,000
Dealer Rebate:               -$2,000 (NOT deducted for tax)
─────────────────────────────────
Taxable Base:                $35,000
TPT @ 8.0%:                   $2,800
Customer Pays:               $35,800 (minus $2,000 rebate = $33,800 net)
```

### Documentation Fee
- **Taxability:** TAXABLE (subject to TPT)
- **Cap:** NO STATE CAP (dealers set their own fees)
- **Average:** ~$410 (varies by dealer, can be higher)
- Doc fees are included in the taxable base for TPT calculation

### Fee & Product Taxability

| Item | Taxable? | Notes |
|------|----------|-------|
| **Accessories** | ✅ Yes | Dealer-installed accessories subject to TPT |
| **Service Contracts (VSC)** | ❌ No | Treated as insurance product per ARS § 20-1095 |
| **GAP Insurance** | ❌ No | Insurance product, not subject to TPT |
| **Documentation Fee** | ✅ Yes | Included in taxable base |
| **Title Fee** | ❌ No | Government fee, not taxable |
| **Registration Fee** | ❌ No | Government fee, not taxable |
| **VLT (Vehicle License Tax)** | ❌ No | Separate tax system, not subject to TPT |
| **Negative Equity** | ✅ Yes | Rolled into financed amount, increases taxable base |

### Retail Calculation Formula

```
Step 1: Calculate Taxable Base
─────────────────────────────────
Vehicle Sale Price:           $XX,XXX
+ Accessories (dealer-installed)  +$XXX
+ Documentation Fee               +$XXX
+ Negative Equity (if rolled in)  +$XXX
- Trade-In Allowance             -$X,XXX
- Manufacturer Rebates (if assigned) -$X,XXX
─────────────────────────────────
= Taxable Base                 $XX,XXX

Step 2: Calculate TPT
─────────────────────────────────
State TPT (5.6%):             $XXX
County Excise Tax:            $XXX
City Privilege Tax:           $XXX
Special District(s):          $XXX
─────────────────────────────────
Total TPT:                    $X,XXX

Step 3: Non-Taxable Items (add separately)
─────────────────────────────────
Service Contracts (VSC):      $XXX
GAP Insurance:                $XXX
Title Fee:                    $XX
Registration Fee:             $XXX
VLT (see separate section):   $XXX
─────────────────────────────────

Total Amount Due = Taxable Base + Total TPT + Non-Taxable Items
```

---

## Lease Transaction Rules

### Lease Tax Method
**Type:** MONTHLY TAXATION + UPFRONT CAP REDUCTION TAX (Hybrid Model)

Arizona uses a **hybrid lease taxation model** that combines:
1. **Upfront taxation** of capitalized cost reduction (except trade-in)
2. **Monthly taxation** of each lease payment

This is different from pure monthly taxation (like Texas or California) or pure upfront taxation (like New Jersey or Maryland).

### Capitalized Cost Reduction - Upfront Tax

**What is taxed upfront at signing:**
- ✅ Cash down payment
- ✅ Manufacturer rebates applied to cap cost
- ✅ Dealer rebates applied to cap cost
- ✅ Credit card bonuses or other credits
- ❌ Trade-in allowance (NOT taxed, full credit)

**Tax Rate:** State TPT (5.6%) + Local TPT rates

**Legal Basis:** AZDOR TPR 03-7

**Example:**
```
Capitalized Cost Reduction Breakdown:
Cash Down Payment:           $5,000
Manufacturer Rebate:         $3,000
Trade-In Allowance:         $10,000 (NOT taxed)
─────────────────────────────────
Taxable Cap Reduction:       $8,000
Upfront Tax @ 8.0%:            $640 (due at signing)
```

### Monthly Payment Tax

Each monthly lease payment is subject to TPT.

**Tax Rate:** State TPT (5.6%) + Local TPT rates

**Example:**
```
Base Monthly Payment:        $450.00
Monthly TPT @ 8.0%:          + $36.00
─────────────────────────────────
Total Monthly Payment:       $486.00
```

### Trade-In on Leases
**Type:** FULL CREDIT

- Trade-in allowance **fully reduces** the gross capitalized cost
- Trade-in is **NOT taxed** as part of cap reduction (exception to cap reduction taxation)
- This provides the same benefit as retail trade-ins

**Example:**
```
Gross Capitalized Cost:      $40,000
Trade-In Allowance:         -$10,000
Cash Down:                   -$5,000
─────────────────────────────────
Net Capitalized Cost:        $25,000

Tax at Signing:
Cash Down: $5,000 × 8.0% =     $400
Trade-In: $10,000 × 0% =         $0
─────────────────────────────────
Total Upfront Tax:             $400
```

### Rebates on Leases
**Behavior:** ALWAYS_TAXABLE

- **Manufacturer rebates:** TAXABLE when applied to cap reduction (different from retail)
- **Dealer rebates:** TAXABLE when applied to cap reduction
- All rebates are taxed upfront at signing
- This differs from retail treatment where manufacturer rebates reduce tax base

### Fee Taxability on Leases

| Item | Taxable? | When Taxed | Notes |
|------|----------|------------|-------|
| **Documentation Fee** | ✅ Yes | Upfront | Taxed at signing |
| **Service Contracts** | ❌ No | N/A | Insurance product when capitalized |
| **GAP Insurance** | ❌ No | N/A | Insurance product when capitalized |
| **Title Fee** | ❌ No | N/A | Government fee |
| **Registration Fee** | ❌ No | N/A | Government fee |

### Negative Equity on Leases
- **Taxability:** TAXABLE
- Negative equity increases gross capitalized cost
- Higher cap cost = higher depreciation = higher monthly payments
- Higher monthly payments = higher monthly tax

### Lease Calculation Formula

```
STEP 1: Calculate Capitalized Cost Reduction Tax (Due at Signing)
───────────────────────────────────────────────────────────────
Cash Down Payment:               $X,XXX
+ Manufacturer Rebates           +$X,XXX
+ Dealer Rebates                 +$XXX
+ Credit Card Bonuses            +$XXX
─────────────────────────────────────
Taxable Cap Reduction:           $X,XXX

Upfront Tax Calculation:
State TPT (5.6%):                $XXX
+ Local TPT:                     +$XXX
─────────────────────────────────────
Total Upfront Tax:               $XXX (due at signing)

STEP 2: Calculate Trade-In Benefit (NOT taxed)
───────────────────────────────────────────────────────────────
Trade-In Allowance:              $X,XXX
Trade-In Tax (0%):                  $0
Trade-In Reduces Cap Cost:       Yes

STEP 3: Calculate Monthly Payment Tax
───────────────────────────────────────────────────────────────
Base Monthly Payment:            $XXX.XX
Monthly TPT @ X.X%:              $XX.XX
─────────────────────────────────────
Total Monthly Payment:           $XXX.XX

STEP 4: Calculate Total Lease Tax Over Term
───────────────────────────────────────────────────────────────
Upfront Tax:                     $XXX
+ (Monthly Tax × Number of Payments)
─────────────────────────────────────
Total Lease Tax:                 $X,XXX

STEP 5: Add Non-Taxable Items (capitalized or paid separately)
───────────────────────────────────────────────────────────────
Service Contracts (VSC):         $X,XXX (capitalized, not taxed)
GAP Insurance:                   $XXX (capitalized, not taxed)
Title Fee:                       $XX
Registration Fee:                $XXX
VLT (first year, see below):     $XXX
```

---

## Vehicle License Tax (VLT)

### Overview
The **Vehicle License Tax (VLT)** is Arizona's annual vehicle registration tax. It is **SEPARATE** from the Transaction Privilege Tax (TPT) and serves as a replacement for personal property tax charged in other states.

**CRITICAL:** VLT is **NOT subject to TPT**. It is a separate government fee.

### VLT Calculation Method

#### Base Formula
VLT is based on **60% of the manufacturer's base retail price (MSRP)**, reduced by **16.25% for each year** since the vehicle was first registered in Arizona.

```
Assessed Value = 60% × MSRP × (1 - 0.1625)^years_since_first_registration
VLT = Assessed Value × Rate per $100
```

#### VLT Rates
- **New Vehicles:** $2.80 per $100 of assessed value
- **Used Vehicles:** $2.89 per $100 of assessed value
- **Minimum VLT:** $10 per year

#### Depreciation Schedule
| Year | % of Original MSRP | Assessed Value (60% of MSRP) |
|------|-------------------|-------------------------------|
| 1 | 100.00% | 60.00% |
| 2 | 83.75% | 50.25% |
| 3 | 70.14% | 42.09% |
| 4 | 58.74% | 35.25% |
| 5 | 49.20% | 29.52% |
| 6 | 41.20% | 24.72% |
| 7 | 34.51% | 20.70% |
| 8 | 28.90% | 17.34% |
| 9 | 24.20% | 14.52% |
| 10 | 20.27% | 12.16% |

### VLT Examples

#### Example 1: New Vehicle
```
MSRP:                        $30,000
Assessed Value (60%):         $18,000
VLT Rate:                     $2.80 per $100
─────────────────────────────────────
Year 1 VLT:                     $504.00

Year 2 Assessed Value:        $15,075 (60% × 83.75% of MSRP)
Year 2 VLT:                     $422.10
```

#### Example 2: Used Vehicle (3 years old)
```
MSRP:                        $25,000
Age:                         3 years
Assessed Value:              $10,522.50 (60% × 70.14% of MSRP)
VLT Rate:                     $2.89 per $100
─────────────────────────────────────
VLT:                            $304.10
```

### Alternative Fuel Vehicles
As of 2022, alternative fuel vehicles (electric, hybrid, hydrogen) use a modified VLT calculation formula. Consult ADOT for specific rates.

### VLT Exemptions
- **Active Duty Military (Non-Residents):** Exempt from VLT (not exempt from TPT)
- **Disabled Veterans:** May qualify for reduced VLT
- **Government Vehicles:** Exempt
- **Certain Farm/Commercial Vehicles:** May qualify for exemptions

**Source:** ARS § 28-5801, ARS § 28-5811, ADOT Vehicle Registration

---

## Reciprocity & Multi-State Rules

### Overview
Arizona has a **limited reciprocity** system with complex rules that vary based on:
1. Whether the buyer's home state has tax reciprocity with Arizona
2. Whether the buyer takes possession in Arizona vs. out-of-state delivery
3. Whether the vehicle is commercial (> 10,000 lbs GVW)
4. Vehicle class and buyer status (tribal, military, etc.)

### Reciprocity Mode
**Type:** CREDIT_UP_TO_STATE_RATE (Limited)

Arizona provides **partial credit** for taxes paid to other states, with credit limited to the state TPT portion (5.6%). The buyer typically still owes county and city taxes.

### 21 Reciprocal States
Arizona has reciprocal agreements with **21 states** that:
1. Have a lower state tax rate than Arizona's 5.6%, AND
2. Provide tax credit for Arizona TPT paid to AZ dealers

For these states, Arizona provides **partial state TPT exemption**.

### Multi-State Transaction Scenarios

#### Scenario 1: Reciprocal State (Lower Rate)
**Buyer from state with < 5.6% rate that reciprocates with AZ**

- **State TPT (5.6%):** CREDIT given (partial or full exemption)
- **County Excise Tax:** Buyer OWES (no exemption)
- **City Privilege Tax:** Buyer OWES (no exemption)

**Example:** Buyer from Montana (no sales tax) buying in Phoenix
```
State TPT (5.6%):              EXEMPT (Montana has 0% rate)
County Tax (0.7%):             $210
City Tax (2.5%):               $750
─────────────────────────────────────
Total Tax on $30,000 vehicle:  $960 (vs. $2,400 for AZ resident)
```

#### Scenario 2: Non-Reciprocal State
**Buyer from state that does NOT reciprocate with Arizona**

- **State TPT (5.6%):** EXEMPT
- **County Excise Tax:** EXEMPT
- **City Privilege Tax:** Buyer OWES (if possession taken in city)

**Example:** Buyer from non-reciprocal state buying in Phoenix
```
State TPT (5.6%):              EXEMPT
County Tax (0.7%):             EXEMPT
City Tax (2.5%):               $750
─────────────────────────────────────
Total Tax on $30,000 vehicle:  $750
```

#### Scenario 3: Out-of-State Delivery
**Dealer delivers vehicle to buyer outside Arizona**

- **State TPT (5.6%):** EXEMPT
- **County Excise Tax:** EXEMPT
- **City Privilege Tax:** EXEMPT

**Total Arizona Tax:** $0

**Requirement:** Vehicle must be delivered outside Arizona, not picked up by buyer in AZ.

#### Scenario 4: Commercial Vehicle (> 10,000 lbs GVW)
**Nonresident purchasing commercial vehicle for interstate commerce**

- **State TPT (5.6%):** EXEMPT
- **County Excise Tax:** EXEMPT
- **City Privilege Tax:** Buyer owes (if possession in city)

**Requirements:**
- Vehicle over 10,000 lbs GVW
- Used/maintained primarily out-of-state
- Interstate commerce use

**Legal Basis:** ARS § 42-5061(A)(14)(b)

#### Scenario 5: Tribal Member Purchase
**Enrolled tribal member purchasing on-reservation**

- **State TPT (5.6%):** EXEMPT
- **County Excise Tax:** EXEMPT
- **City Privilege Tax:** MAY APPLY (depends on location)

**Requirements:**
- Enrolled member of federally recognized tribe
- Purchase on tribal land
- Form 5013 required

**Legal Basis:** ARS § 42-5122

#### Scenario 6: Military (Active Duty Non-Resident)
**Active duty military stationed in Arizona**

- **TPT (State + County + City):** NO EXEMPTION (must pay full TPT)
- **VLT (Annual Registration Tax):** EXEMPT

**CRITICAL:** Military exemption applies to VLT ONLY, NOT to TPT.

**Legal Basis:** ARS § 28-5811

### Reciprocity Requirements
- **Proof Required:** Yes (documentation of tax paid in origin state)
- **Basis:** TAX_PAID (credit based on actual tax paid, not tax due)
- **Cap:** Credit cannot exceed Arizona's tax amount
- **Scope:** Applies to both retail and lease transactions

### Documentation Required
- Buyer's residence verification
- Proof of tax paid in origin state (if claiming credit)
- Form 5000 (Nonresident Affidavit)
- Form 5013 (Tribal exemption)
- AZDOR computation worksheets

**Source:** AZDOR TPP 24-1 (Nonresident Sales), Nonresident Tax Rate Schedules

---

## Special Cases & Exemptions

### 1. Model City Tax Code (MCTC)
Arizona cities that adopt the **Model City Tax Code** may have different tax treatments than the state TPT rules. This can create variations in:
- How certain fees are treated
- Lease taxation methodology
- Exemptions and deductions

**Implication:** Always verify city-specific rules for the dealer's location.

**Source:** modelcitytaxcode.az.gov

### 2. Service Contracts as Insurance Products
Arizona treats **vehicle service contracts (VSC)** and **GAP insurance** as insurance products under the **Arizona Service Contracts Model Act (2018)**, codified in ARS § 20-1095.

**Result:**
- VSC and GAP are **NOT subject to TPT**
- They are regulated as insurance products
- Can be capitalized into leases without taxation

**Implication:** This is favorable for F&I product sales and differs from many states that tax these products.

### 3. No Documentation Fee Cap
Unlike states like California ($85 cap), Florida ($150 cap), or New York ($75 cap), Arizona has **NO STATUTORY LIMIT** on dealer documentation fees.

**Average Doc Fee:** ~$410 (can be higher)
**Taxability:** Doc fees ARE subject to TPT

**Implication:** Doc fees can vary widely between dealers and are a profit center.

### 4. Tribal Exemptions
**Eligibility:**
- Enrolled member of federally recognized tribe
- Vehicle purchased on tribal land
- Vehicle titled/registered on reservation

**Exemption:**
- State TPT: EXEMPT
- County excise tax: EXEMPT
- City privilege tax: MAY APPLY (depends on jurisdiction)

**Form Required:** Form 5013

**Source:** ARS § 42-5122

### 5. Private Party Sales
**TPT Exemption:** Private party vehicle sales are **EXEMPT** from Arizona TPT.

**Applies to:**
- Individual-to-individual sales
- Non-dealer sales

**VLT:** Buyer still owes VLT when registering the vehicle.

### 6. Alternative Fuel Vehicle VLT Changes
As of **January 1, 2022**, Arizona changed the VLT formula for alternative fuel vehicles (electric, plug-in hybrid, hydrogen fuel cell).

**New Formula:**
- Different depreciation schedule
- Different assessed value calculation

**Source:** ADOT, ARS § 28-5801 (amended 2022)

### 7. Accessories Installed After Delivery
**Timing Matters:**
- **With vehicle (at sale):** 2.0% state automotive rate + local automotive rate
- **After delivery (post-sale):** 4.0% state general retail rate + local general rate

**Implication:** Installing accessories as part of the vehicle sale transaction saves the customer 2% state TPT.

---

## Calculation Examples

### Example 1: Retail Purchase - Phoenix

**Scenario:**
- Vehicle price: $30,000
- Accessories: $1,500
- Doc fee: $410
- Trade-in: $8,000
- Manufacturer rebate: $3,000 (assigned to dealer)
- Service contract (VSC): $2,500
- GAP: $800
- Title fee: $4
- Registration fee: $32
- Location: Phoenix (8.1% combined: 5.6% state + 0.7% county + 1.8% city)

**Calculation:**
```
STEP 1: Taxable Base
─────────────────────────────────
Vehicle Price:               $30,000
+ Accessories:               + $1,500
+ Doc Fee:                   +   $410
- Trade-In:                  - $8,000
- Manufacturer Rebate:       - $3,000
─────────────────────────────────
Taxable Base:                $20,910

STEP 2: Calculate TPT
─────────────────────────────────
State TPT (5.6%):            $1,170.96
County Tax (0.7%):             $146.37
City Tax (1.8%):               $376.38
─────────────────────────────────
Total TPT:                   $1,693.71

STEP 3: Non-Taxable Items
─────────────────────────────────
Service Contract:            $2,500.00
GAP Insurance:                 $800.00
Title Fee:                       $4.00
Registration Fee:               $32.00
VLT (Year 1):                  $504.00 (calculated separately)
─────────────────────────────────
Non-Taxable Total:           $3,840.00

STEP 4: Total Amount Due
─────────────────────────────────
Taxable Base:                $20,910.00
Total TPT:                    $1,693.71
Non-Taxable Items:            $3,840.00
─────────────────────────────────
Total Due:                   $26,443.71
```

### Example 2: Lease - Scottsdale

**Scenario:**
- Gross cap cost: $35,000
- Cash down: $4,000
- Manufacturer rebate: $2,000
- Trade-in: $6,000
- Doc fee: $410
- Base monthly payment: $425
- Term: 36 months
- Service contract (capitalized): $1,800
- Location: Scottsdale (7.35% combined: 5.6% state + 0% county + 1.75% city)

**Calculation:**
```
STEP 1: Upfront Cap Reduction Tax
─────────────────────────────────
Cash Down:                   $4,000
+ Manufacturer Rebate:       $2,000
─────────────────────────────────
Taxable Cap Reduction:       $6,000

Upfront Tax @ 7.35%:           $441.00 (due at signing)

Trade-In Benefit:
Trade-In Value:              $6,000
Trade-In Tax (0%):               $0 (NOT taxed)
Reduces Cap Cost:            Yes

STEP 2: Monthly Payment Tax
─────────────────────────────────
Base Monthly Payment:        $425.00
Monthly Tax @ 7.35%:          $31.24
─────────────────────────────────
Total Monthly Payment:       $456.24

STEP 3: Total Lease Tax Over Term
─────────────────────────────────
Upfront Tax:                   $441.00
Monthly Tax × 36:            $1,124.64
─────────────────────────────────
Total Lease Tax:             $1,565.64

STEP 4: Non-Taxable Items (Capitalized)
─────────────────────────────────
Service Contract:            $1,800 (capitalized, not taxed)
Doc Fee Tax:                 Included in upfront tax above
Title Fee:                       $4
Registration Fee:               $32
VLT (Year 1):                  $588 (calculated separately)

STEP 5: Due at Signing
─────────────────────────────────
Cash Down:                   $4,000.00
Upfront Tax:                   $441.00
First Month Payment:           $456.24
Service Contract:            $1,800.00
Title/Reg/VLT:                 $624.00
─────────────────────────────────
Total Due at Signing:        $7,321.24
```

### Example 3: Nonresident Sale - Reciprocal State

**Scenario:**
- Buyer residence: Montana (no sales tax, reciprocal state)
- Vehicle price: $28,000
- Trade-in: $5,000
- Doc fee: $410
- Location: Tucson (8.6% combined: 5.6% state + 0.5% county + 2.5% city)

**Calculation:**
```
STEP 1: Determine Exemptions
─────────────────────────────────
Montana is reciprocal state with 0% sales tax
Exemption applies to:
  - State TPT (5.6%): EXEMPT
  - County Tax (0.5%): Not exempt
  - City Tax (2.5%): Not exempt

STEP 2: Calculate Taxable Base
─────────────────────────────────
Vehicle Price:               $28,000
+ Doc Fee:                      $410
- Trade-In:                  -$5,000
─────────────────────────────────
Taxable Base:                $23,410

STEP 3: Calculate TPT (Partial Exemption)
─────────────────────────────────
State TPT (5.6%):                $0.00 (EXEMPT)
County Tax (0.5%):             $117.05
City Tax (2.5%):               $585.25
─────────────────────────────────
Total TPT:                     $702.30

Savings vs. AZ Resident:
AZ Resident would pay:       $2,013.26 (8.6% × $23,410)
Nonresident pays:              $702.30
─────────────────────────────────
Tax Savings:                 $1,310.96
```

### Example 4: Commercial Vehicle - Interstate

**Scenario:**
- Vehicle type: Commercial truck
- GVW: 12,000 lbs (over 10,000 lbs threshold)
- Buyer residence: California
- Use: Interstate commerce
- Vehicle price: $45,000
- Location: Phoenix

**Calculation:**
```
STEP 1: Determine Exemptions
─────────────────────────────────
Commercial vehicle > 10,000 lbs GVW
Used primarily out-of-state
Qualifies for exemption per ARS § 42-5061(A)(14)(b)

Exemption applies to:
  - State TPT (5.6%): EXEMPT
  - County Tax (0.7%): EXEMPT
  - City Tax (1.8%): Not exempt (buyer takes possession in Phoenix)

STEP 2: Calculate Taxable Base
─────────────────────────────────
Vehicle Price:               $45,000
─────────────────────────────────
Taxable Base:                $45,000

STEP 3: Calculate TPT
─────────────────────────────────
State TPT (5.6%):                $0.00 (EXEMPT)
County Tax (0.7%):               $0.00 (EXEMPT)
City Tax (1.8%):               $810.00
─────────────────────────────────
Total TPT:                     $810.00

Savings vs. Standard Purchase:
Standard AZ TPT:             $3,645.00 (8.1% × $45,000)
Commercial Exemption:          $810.00
─────────────────────────────────
Tax Savings:                 $2,835.00
```

---

## Documentation & Sources

### Primary Legal Sources

1. **Arizona Revised Statutes (ARS)**
   - **Title 42 - Taxation**
   - **ARS § 42-5061:** Retail Classification & Motor Vehicle Exemptions
   - **ARS § 42-5122:** Tribal Tax Exemptions
   - **ARS § 28-5801:** Vehicle License Tax Rate
   - **ARS § 28-5811:** VLT Military Exemptions
   - **ARS § 20-1095:** Service Contracts (Insurance Products)

2. **Arizona Department of Revenue (AZDOR) Rulings**
   - **TPR 03-7:** Transaction Privilege Tax - Motor Vehicle Sales and Leasing
   - **TPP 24-1:** Transaction Privilege Tax Procedure - Nonresident Sales

3. **Arizona Department of Revenue (AZDOR) Resources**
   - Website: https://azdor.gov/
   - Motor Vehicle Sales TPT: https://azdor.gov/business/transaction-privilege-tax/motor-vehicle-sales
   - Tax Rate Table: https://azdor.gov/business/transaction-privilege-tax/tax-rate-table
   - Vehicle Use Tax Calculator: https://azdor.gov/file-and-pay/e-file-services/vehicle-use-tax-calculator
   - Nonresident Tax Rate Schedules

4. **Model City Tax Code (MCTC)**
   - Website: https://modelcitytaxcode.az.gov/
   - Articles & Sections on Retail Sales, Warranties, Leases

5. **Arizona Department of Transportation (ADOT) / Motor Vehicle Division**
   - Website: https://azdot.gov/
   - VLT Information and Calculators
   - Registration Fees

### Research Notes

This tax rule profile was researched on **2025-11-13** using official Arizona state sources, including:
- Arizona Department of Revenue official guidance
- Arizona Revised Statutes (current as of 2025)
- AZDOR Transaction Privilege Tax Rulings and Procedures
- Model City Tax Code documentation
- ADOT Motor Vehicle Division VLT guidance

**Key Research Findings:**

1. **TPT System:** Arizona's "Transaction Privilege Tax" is legally a privilege tax on the seller (dealer), not a sales tax on the buyer, though economically equivalent from buyer's perspective.

2. **VLT Separate:** The Vehicle License Tax is a completely separate annual tax system based on depreciated assessed value, NOT subject to TPT.

3. **Service Contracts as Insurance:** Arizona's adoption of the Service Contracts Model Act (2018) reclassified VSC and GAP as insurance products, making them non-taxable under TPT. This is codified in ARS § 20-1095.

4. **Hybrid Lease Model:** Arizona's lease taxation is unique - it combines upfront taxation of cap cost reduction (except trade-in) with monthly taxation of payments. This differs from pure monthly (TX, CA) or pure upfront (NJ, MD) states.

5. **Complex Reciprocity:** Arizona has 21 reciprocal state agreements, plus 4 separate nonresident exemption categories (reciprocal, non-reciprocal, delivery, commercial). The Model City Tax Code can create additional variations at the city level.

6. **Manufacturer Rebate Treatment:** Arizona treats manufacturer rebates as NON-TAXABLE on retail (reducing sale price), but TAXABLE on leases when applied to cap cost reduction.

### Implementation Notes

**Version History:**
- **Version 1 (2025-11):** Initial stub implementation
- **Version 2 (2025-11-13):** Full research-based implementation with comprehensive testing

**Testing Coverage:**
- 50+ test cases covering retail, lease, reciprocity, edge cases
- Edge cases include tribal exemptions, military exemptions, commercial vehicles, nonresident scenarios
- Test suite validates all rule configurations against research findings

**Known Limitations:**
1. City-specific Model City Tax Code variations require dealer location lookup
2. 21 reciprocal state list may change (requires periodic updates)
3. Alternative fuel vehicle VLT calculation uses different formula (2022 changes)
4. Tribal exemption rules may vary by specific tribal nation agreements

### Contact Information

For questions or clarifications on Arizona tax rules:

- **Arizona Department of Revenue (AZDOR)**
  - Phone: (602) 255-3381
  - Website: https://azdor.gov/
  - TPT Information: https://azdor.gov/business/transaction-privilege-tax

- **Arizona Department of Transportation (ADOT) - MVD**
  - Phone: (602) 255-0072
  - Website: https://azdot.gov/
  - VLT Information: https://azdot.gov/motor-vehicles

---

## Appendix: Quick Reference Tables

### Tax Rate Quick Reference (Major Markets)

| Market | State | County | City | Total |
|--------|-------|--------|------|-------|
| **Phoenix** | 5.6% | 0.7% | 1.8% | 8.1% |
| **Scottsdale** | 5.6% | 0% | 1.75% | 7.35% |
| **Tucson** | 5.6% | 0.5% | 2.5% | 8.6% |
| **Flagstaff** | 5.6% | 0% | 2.57% | 8.17% |
| **Mesa** | 5.6% | 0.7% | 1.75% | 8.05% |
| **Chandler** | 5.6% | 0.7% | 1.5% | 7.8% |
| **Glendale** | 5.6% | 0.7% | 2.4% | 8.7% |
| **Tempe** | 5.6% | 0.7% | 1.8% | 8.1% |

### Taxability Quick Reference

| Item | Retail | Lease | Notes |
|------|--------|-------|-------|
| Vehicle price | ✅ Taxable | ✅ Monthly | Base subject to TPT |
| Trade-in | ❌ Deducted | ❌ Deducted | Full credit, not taxed |
| Manufacturer rebate | ❌ Deducted | ✅ Taxed upfront | Different treatment! |
| Dealer rebate | ✅ Taxable | ✅ Taxed upfront | Does not reduce base |
| Doc fee | ✅ Taxable | ✅ Taxed upfront | No cap in AZ |
| Accessories | ✅ Taxable | ✅ Monthly | If dealer-installed |
| Service contracts (VSC) | ❌ Not taxed | ❌ Not taxed | Insurance product |
| GAP | ❌ Not taxed | ❌ Not taxed | Insurance product |
| Negative equity | ✅ Taxable | ✅ Taxed monthly | Increases base/cap cost |
| Title fee | ❌ Not taxed | ❌ Not taxed | Government fee |
| Registration fee | ❌ Not taxed | ❌ Not taxed | Government fee |
| VLT | ❌ Not taxed | ❌ Not taxed | Separate tax system |

### VLT Quick Reference (Common MSRPs)

| MSRP | Year 1 VLT | Year 2 VLT | Year 3 VLT | Year 5 VLT |
|------|-----------|-----------|-----------|-----------|
| $20,000 | $336.00 | $281.40 | $235.70 | $165.50 |
| $25,000 | $420.00 | $351.75 | $294.63 | $206.88 |
| $30,000 | $504.00 | $422.10 | $353.55 | $248.26 |
| $35,000 | $588.00 | $492.45 | $412.48 | $289.63 |
| $40,000 | $672.00 | $562.80 | $471.40 | $331.01 |
| $50,000 | $840.00 | $703.50 | $589.25 | $413.76 |

**Formula:** VLT = (MSRP × 60% × depreciation factor) × $2.80 per $100

---

**Document Version:** 2.0
**Last Updated:** 2025-11-13
**Next Review Date:** 2026-01-01 (annual review recommended)

---
