# Maryland (MD) Vehicle Tax Rule Profile

**Implementation Date:** 2025-11-13
**Version:** 2
**Status:** Production-Ready
**Research Method:** AI-Researched from Official Sources

---

## Executive Summary

Maryland uses a **6.5% state-only vehicle excise tax** (as of July 2025) with **NO trade-in credit** (eliminated July 2024). This makes Maryland one of the most expensive states for vehicle taxation, especially for buyers with trade-ins. The state underwent three major tax changes in 2024-2025 that significantly increased the tax burden on vehicle purchases.

### Critical Maryland Features:
1. **NO TRADE-IN CREDIT** - Eliminated by HB 754 (July 2024)
2. **MANUFACTURER REBATES TAXABLE** - Tax on full price before rebates
3. **6.5% EXCISE TAX RATE** - Increased from 6% (July 2025)
4. **DOC FEE CAP $800** - Increased from $500 (July 2024)
5. **RECIPROCITY WITH 60-DAY LIMIT** - Strict deadline to avoid double taxation

---

## Maryland's Major Tax Changes (2024-2025)

### 1. HB 754 (2024): Trade-In Allowance ELIMINATED
- **Effective Date:** July 1, 2024
- **Impact:** Tax now calculated on FULL purchase price with NO trade-in deduction
- **Revenue Impact:** $21.4M additional annual state revenue
- **Bond Capacity:** $1.0B increase over FY 2025-2029

**Example of Impact:**
- $40,000 vehicle with $15,000 trade-in
- **BEFORE HB 754:** Tax on ($40,000 - $15,000) = $1,500
- **AFTER HB 754:** Tax on $40,000 = $2,600
- **Additional Cost:** $1,100 per transaction

### 2. HB 352 (2025): Excise Tax Rate INCREASED
- **Effective Date:** July 1, 2025
- **Change:** 6.0% → 6.5%
- **Impact:** $150 additional tax per $30,000 vehicle

### 3. SB 362 (2024): Doc Fee Cap INCREASED
- **Effective Date:** July 1, 2024
- **Change:** $500 → $800
- **Impact:** Dealers can charge up to $800 (plus 6.5% tax = $52)

---

## Retail Purchase Tax Rules

### Tax Rate Structure
- **State Excise Tax:** 6.5% (uniform statewide)
- **Local Taxes:** NONE
- **Total Tax:** 6.5% (simple, no local stacking)

### Trade-In Policy: **NONE** ❌

Maryland is one of the few states with **NO trade-in credit**.

**How It Works:**
- Trade-in value does NOT reduce the taxable base
- Tax calculated on full vehicle purchase price
- Trade-in still reduces amount financed, but provides ZERO tax benefit

**Example:**
```
Vehicle Price:        $35,000
Trade-In Value:       $10,000
Doc Fee:              $700

Taxable Base:         $35,700 (NO trade-in deduction)
Tax (6.5%):           $2,320.50

Customer Pays:        $35,000 + $700 - $10,000 + $2,320.50 = $28,020.50
Amount Financed:      $28,020.50 (if financing)
```

**Comparison with Trade-Credit States:**
If Maryland still had trade-in credit, the tax would be:
- Taxable Base: $25,700 (with trade credit)
- Tax: $1,670.50
- **Savings Lost:** $650

### Manufacturer Rebates: **TAXABLE** ❌

Manufacturer rebates, incentives, and cash-back offers do NOT reduce the taxable amount.

**Tax Treatment:**
- Tax calculated on price BEFORE rebates
- Rebate applied to reduce customer's out-of-pocket cost
- Rebate provides NO tax benefit

**Example:**
```
Vehicle MSRP:         $30,000
Manufacturer Rebate:  $3,000
Customer Pays:        $27,000

Taxable Base:         $30,000 (NOT $27,000)
Tax (6.5%):           $1,950

Total Cost:           $27,000 + $1,950 = $28,950
```

**Federal EV Rebates:**
Federal EV rebates ($7,500) applied at point of sale are also taxable. Maryland's separate state EV excise tax credit (up to $3,000) is a post-purchase credit against the excise tax.

### Dealer Rebates: **REDUCES TAX BASE** ✅

Dealer discounts that reduce the actual selling price DO reduce the taxable base.

**Example:**
```
MSRP:                 $30,000
Dealer Discount:      $2,000
Selling Price:        $28,000

Taxable Base:         $28,000
Tax (6.5%):           $1,820
```

### Documentation Fee: **TAXABLE** ✅
- **Maximum Cap:** $800 (as of July 1, 2024)
- **Taxable:** Yes (included in taxable base)
- **Tax on Max Doc Fee:** $800 × 6.5% = $52

**Historical Doc Fee Caps:**
- July 2011 - June 2014: $200
- July 2014 - June 2020: $300
- July 2020 - June 2024: $500
- July 2024 - Present: $800

### Backend Products

| Product | Taxable | Notes |
|---------|---------|-------|
| **Service Contracts (VSC)** | ✅ YES | When purchased with vehicle |
| **GAP Insurance** | ✅ YES | When purchased with vehicle |
| **Accessories** | ✅ YES | When sold/installed with vehicle |
| **Negative Equity** | ✅ YES | Increases taxable base |
| **Title Fee** | ❌ NO | Government fee (must be separately stated) |
| **Registration Fee** | ❌ NO | Government fee |

**Note:** There is limited authoritative guidance on VSC/GAP taxability in Maryland. Based on standard practice and conservative interpretation, we treat them as taxable when sold with the vehicle.

### Complete Retail Example

**Scenario:** Purchase in Baltimore, Maryland (July 2025)

```
Vehicle Price:                 $35,000
Trade-In Value:                $10,000
Trade-In Payoff:               $12,000 (negative equity: $2,000)
Manufacturer Rebate:           $2,000
Doc Fee:                       $700
Service Contract (VSC):        $1,500
GAP Insurance:                 $500
Accessories:                   $1,000
Title Fee:                     $50
Registration Fee:              $200

TAXABLE BASE CALCULATION:
Vehicle Price:                 $35,000
Negative Equity:               +$2,000
Manufacturer Rebate:           +$2,000 (taxable, not deducted)
Doc Fee:                       +$700
VSC:                           +$1,500
GAP:                           +$500
Accessories:                   +$1,000
Trade-In:                      -$0 (NO CREDIT)
Title/Reg:                     NOT included (non-taxable)

Total Taxable Base:            $42,700

TAX CALCULATION:
Excise Tax (6.5%):             $42,700 × 6.5% = $2,775.50

CUSTOMER PAYMENT:
Vehicle Price:                 $35,000
Doc Fee:                       $700
VSC:                           $1,500
GAP:                           $500
Accessories:                   $1,000
Title Fee:                     $50
Registration:                  $200
Negative Equity:               $2,000
Tax:                           $2,775.50
Less Trade-In Value:           -$10,000
Less Manufacturer Rebate:      -$2,000

TOTAL DUE:                     $31,725.50

AMOUNT FINANCED (if financing):
Total Due:                     $31,725.50
Plus Trade Payoff:             $12,000
Total Financed:                $43,725.50
```

---

## Lease Tax Rules

### Lease Method: **FULL_UPFRONT**

Maryland calculates the 6.5% excise tax on the **TOTAL VEHICLE VALUE** at lease inception, not on individual monthly payments.

**Key Features:**
- Tax calculated on full fair market value of vehicle
- Tax due at lease inception (when lease is signed)
- Tax CAN be paid upfront OR capitalized into monthly payments
- If capitalized, customer pays tax over time but dealer reports it upfront

### How Maryland Lease Taxation Works

**Tax Base:** Vehicle's fair market value (typically MSRP or agreed-upon value)

**Example 1 - Tax Paid Upfront:**
```
Vehicle Fair Market Value:     $40,000
Tax (6.5%):                    $2,600 (paid at signing)

Cap Cost Reductions:           $10,000 (cash + trade)
Adjusted Cap Cost:             $30,000 (for payment calculation)

Monthly Payment:               Based on $30,000 cap cost (no tax)
```

**Example 2 - Tax Capitalized:**
```
Vehicle Fair Market Value:     $40,000
Tax (6.5%):                    $2,600 (due to state)
Tax Spread Over 36 Months:     $72.22/month

Customer pays tax over 36 months instead of upfront
```

### Lease Trade-In: **NO CREDIT** ❌

Consistent with retail, Maryland provides **NO trade-in credit on leases**.

**How It Works:**
- Trade-in value applied as cap cost reduction
- Reduces monthly payment (lower adjusted cap cost)
- Does NOT reduce tax base (tax still on full vehicle value)
- Provides NO tax benefit

**Example:**
```
Vehicle Value:                 $40,000
Trade-In Value:                $12,000

Tax Base:                      $40,000 (trade-in does NOT reduce)
Tax (6.5%):                    $2,600

Adjusted Cap Cost:             $40,000 - $12,000 = $28,000
Monthly Payment:               Based on $28,000 cap cost
```

### Lease Rebates: **ALWAYS TAXABLE**

All rebates (manufacturer, dealer, federal EV) are taxable on leases.

**Example:**
```
Vehicle Value:                 $35,000
Manufacturer Rebate:           $2,500 (applied as cap reduction)

Tax Base:                      $35,000 (NOT $32,500)
Tax (6.5%):                    $2,275

Adjusted Cap Cost:             $35,000 - $2,500 = $32,500
```

### Lease Backend Products

| Product | Taxable | Notes |
|---------|---------|-------|
| **Doc Fee** | ✅ YES | Up to $800 cap |
| **Service Contracts** | ✅ YES | When capitalized into lease |
| **GAP Insurance** | ✅ YES | When capitalized into lease |
| **Negative Equity** | ✅ YES | Increases tax base |
| **Title/Registration** | ❌ NO | Government fees |

### Complete Lease Example

**Scenario:** 36-month lease, tax capitalized (July 2025)

```
Vehicle Fair Market Value:     $40,000
Cap Cost Reductions:
  Cash Down:                   $5,000
  Trade-In:                    $8,000
  Manufacturer Rebate:         $2,000
  Total Cap Reductions:        $15,000

Doc Fee:                       $800
Service Contract:              $1,200
GAP Insurance:                 $400

TAX CALCULATION:
Base Tax:                      $40,000 × 6.5% = $2,600
Tax on Doc Fee:                $800 × 6.5% = $52
Tax on VSC:                    $1,200 × 6.5% = $78
Tax on GAP:                    $400 × 6.5% = $26

Total Tax:                     $2,756

Adjusted Cap Cost:             $40,000 - $15,000 + $800 + $1,200 + $400 + $2,756 = $30,156

Monthly Payment:               Based on $30,156 adjusted cap cost
(includes capitalized tax of $76.56/month)
```

---

## Reciprocity Rules (Cross-State Tax Credit)

### Reciprocity: **ENABLED** ✅
### Time Limit: **60 DAYS** ⏰ (CRITICAL)

Maryland provides reciprocity credit for vehicle excise tax paid to other states, but **ONLY if you title the vehicle within 60 days** of establishing Maryland residency.

### How Reciprocity Works

**Scenario 1: Other State Tax ≥ Maryland Tax (6.5%)**
```
Example: Vehicle titled in California (7.25% paid)

California Tax Paid:           $30,000 × 7.25% = $2,175
Maryland Tax Due:              $30,000 × 6.5% = $1,950
Maryland Credit:               $1,950 (full MD tax)
Additional Maryland Tax:       $0
Maryland Minimum Tax:          $100 (administrative)

Total Maryland Payment:        $100
```

**Scenario 2: Other State Tax < Maryland Tax (6.5%)**
```
Example: Vehicle titled in Pennsylvania (6% paid)

Pennsylvania Tax Paid:         $30,000 × 6% = $1,800
Maryland Tax Due:              $30,000 × 6.5% = $1,950
Maryland Credit:               $1,800
Additional Maryland Tax:       $150 (difference)

Total Maryland Payment:        $150
```

**Scenario 3: No-Tax State (MT, OR, DE, NH)**
```
Example: Vehicle titled in Montana (0% tax)

Montana Tax Paid:              $0
Maryland Tax Due:              $30,000 × 6.5% = $1,950
Maryland Credit:               $0
Additional Maryland Tax:       $1,950 (full MD tax)

Total Maryland Payment:        $1,950
```

### CRITICAL: 60-Day Deadline

**If You Register WITHIN 60 Days:**
- Receive reciprocity credit
- Pay only the difference (or $100 minimum)
- Avoid double taxation

**If You Register AFTER 60 Days:**
- NO reciprocity credit available
- Pay FULL Maryland excise tax (6.5%)
- Effectively pay tax twice (other state + Maryland)
- Can cost thousands of dollars

**Example of Missing Deadline:**
```
Vehicle purchased in Virginia:  $35,000
Virginia tax paid (4.15%):      $1,452.50

WITHIN 60 DAYS:
Maryland additional tax:        $823 (difference)
Total tax paid:                 $2,275.50

AFTER 60 DAYS (NO CREDIT):
Maryland tax due:               $2,275 (full)
Total tax paid:                 $3,727.50

PENALTY FOR DELAY:              $1,452
```

### Documentation Required

To claim reciprocity credit:
- Proof of tax paid to other state (receipt, title, bill of sale)
- Certificate of title from other state
- Evidence of timely registration (within 60 days)

### Best Practice

New Maryland residents should **title and register vehicles IMMEDIATELY** upon establishing residency to maximize reciprocity credit and avoid double taxation.

---

## State Comparison

### Maryland vs. Neighboring States

| State | Sales Tax | Trade-In Credit | Manufacturer Rebates | Doc Fee Cap |
|-------|-----------|-----------------|----------------------|-------------|
| **Maryland** | 6.5% | ❌ NO | Taxable | $800 |
| Virginia | 4.15% | ✅ YES | Not Taxable | None |
| Pennsylvania | 6% | ✅ YES | Taxable | None |
| Delaware | 0% | N/A | N/A | $200 |
| West Virginia | 6% | ✅ YES | Not Taxable | $200 |
| D.C. | 6% | ✅ YES | Not Taxable | $295 |

**Key Takeaway:** Maryland has the HIGHEST effective vehicle tax rate among its neighbors when trade-ins are involved, due to the elimination of trade-in credit.

### Maryland vs. Other No-Trade-Credit States

| State | Tax Rate | Trade-In Credit | Local Taxes |
|-------|----------|-----------------|-------------|
| **Maryland** | 6.5% | ❌ NO | None |
| California | 7.25% base | ❌ NO | Yes (up to 10.75% total) |
| New Jersey | 6.625% | ❌ NO (had FULL, similar to MD situation) | None |
| Illinois | 6.25% | ❌ NO | Yes (up to 11% total) |

**Note:** Maryland's 6.5% is the second-highest state-only rate among no-trade-credit states (after California's 7.25%).

---

## Tax Calculation Formulas

### Retail Purchase
```
Taxable Base =
  Vehicle Price
  + Accessories
  + Doc Fee (up to $800)
  + Service Contract (if purchased)
  + GAP Insurance (if purchased)
  + Negative Equity (if applicable)
  + Manufacturer Rebates (taxable)
  - Trade-In Value (NO DEDUCTION)
  - Title/Registration Fees (non-taxable)

Tax = Taxable Base × 6.5%

Total Customer Payment =
  Vehicle Price
  + Accessories
  + Doc Fee
  + Service Contract
  + GAP Insurance
  + Title Fee
  + Registration Fee
  + Tax
  - Trade-In Value (reduces payment, not tax)
  - Manufacturer Rebates (reduce payment, not tax)
```

### Lease
```
Tax Base =
  Vehicle Fair Market Value
  + Doc Fee (if applicable)
  + Service Contract (if capitalized)
  + GAP Insurance (if capitalized)
  + Negative Equity (if applicable)
  (Cap reductions do NOT reduce tax base)

Tax = Tax Base × 6.5%

Adjusted Cap Cost =
  Vehicle Fair Market Value
  - Cap Cost Reductions (cash, trade, rebates)
  + Doc Fee
  + Service Contract
  + GAP Insurance
  + Tax (if capitalized)
```

---

## Implementation Notes

### Special Calculator Requirements

Maryland's tax structure is relatively straightforward due to:
- **STATE_ONLY** tax scheme (no local stacking)
- **NONE** trade-in policy (simple: no deduction)
- **6.5%** flat rate (no jurisdictional variations)

**No special calculator needed** - standard calculation engine can handle Maryland with proper configuration.

### Edge Cases

1. **Trade-In > Vehicle Price:**
   - Tax still calculated on full vehicle price
   - Customer receives cash/credit for excess trade value
   - No negative tax calculation

2. **High-Value Trade-Ins:**
   - No cap on trade-in value
   - Trade-in does not reduce tax under any circumstances
   - Significant tax disadvantage vs. trade-credit states

3. **Federal EV Rebates:**
   - $7,500 federal rebate is taxable ($488 additional tax)
   - Maryland state EV credit (up to $3,000) is a post-purchase credit against excise tax
   - State credit separate from vehicle excise tax calculation

4. **Reciprocity Credit > Maryland Tax:**
   - Maximum credit is Maryland's tax amount
   - No refund if other state tax exceeds MD tax
   - Minimum $100 administrative fee applies

5. **60-Day Reciprocity Deadline:**
   - Strictly enforced
   - No exceptions (except military)
   - Late registration results in full MD tax (no credit)

### Common Dealer Mistakes to Avoid

1. **Applying Trade-In Credit:**
   - OLD LAW (pre-July 2024): Trade-in reduced tax base
   - NEW LAW (post-July 2024): Trade-in does NOT reduce tax base
   - Dealers must update systems to reflect HB 754

2. **Deducting Manufacturer Rebates from Tax Base:**
   - Rebates are taxable in Maryland
   - Tax calculated on price before rebates
   - Common mistake: subtracting rebate from tax base

3. **Using 6% Rate:**
   - OLD RATE (pre-July 2025): 6.0%
   - NEW RATE (post-July 2025): 6.5%
   - Must use 6.5% for transactions on/after July 1, 2025

4. **Applying Local Taxes:**
   - Maryland has NO local vehicle taxes
   - Only 6.5% state excise tax applies
   - Do not add county/municipal rates

5. **Reciprocity Miscalculation:**
   - Must verify 60-day compliance
   - Credit limited to MD tax amount
   - $100 minimum tax applies when full credit given

---

## Official Sources

### Primary Legal Sources
1. **Maryland Transportation Code § 13-809** - Vehicle Excise Tax statute
2. **House Bill 754 (2024)** - Trade-In Allowance Repeal (ENACTED July 1, 2024)
3. **House Bill 352 (2025)** - Excise Tax Rate Increase to 6.5% (ENACTED July 1, 2025)
4. **Senate Bill 362 (2024)** - Doc Fee Cap Increase to $800 (ENACTED July 1, 2024)
5. **COMAR 11.15.33.06** - Trade-in Allowance Regulations (REPEALED July 1, 2024)
6. **Maryland Transportation Code § 15-311.1** - Dealer Processing Charge

### Government Agencies
- **Maryland Motor Vehicle Administration (MVA)**
  - mva.maryland.gov
  - Industry bulletins and guidance

- **Maryland Comptroller**
  - comptroller.maryland.gov
  - Tax guidance and FAQs

- **Maryland General Assembly**
  - mgaleg.maryland.gov
  - Legislative tracking and fiscal notes

### Industry Guidance
- **WANADA (Washington Area New Automobile Dealers Association)**
  - wanada.org
  - Maryland-specific dealer guidance

- **Maryland Dealer Association (MADA)**
  - Dealer-specific excise tax guidance

### Third-Party Resources
- **LeaseGuide.com** - Maryland lease tax analysis
- **Sales Tax Handbook** - Maryland vehicle sales tax overview
- **Car and Driver** - Maryland car tax consumer guide
- **Tag and Title Services** - New to Maryland guides

---

## Recent Legislative History

### 2024 Session (Major Changes)
- **HB 754** - Repealed trade-in allowance (July 1, 2024)
  - Fiscal impact: $21.4M annual revenue increase
  - Bond capacity: $1.0B over 5 years

- **SB 362** - Increased doc fee cap to $800 (July 1, 2024)
  - Previous cap: $500
  - $300 increase

### 2025 Session (Major Changes)
- **HB 352** - Increased excise tax to 6.5% (July 1, 2025)
  - Previous rate: 6.0%
  - 0.5% increase

### Prior Failed Attempts
- Maryland considered eliminating trade-in credit multiple times before 2024
- Previous proposals failed due to opposition
- HB 754 succeeded as part of broader transportation funding package

---

## Frequently Asked Questions

### Q: Does Maryland still allow trade-in credit?
**A:** NO. Trade-in credit was eliminated by HB 754, effective July 1, 2024. Tax is now calculated on the full vehicle purchase price with NO deduction for trade-in value.

### Q: Are manufacturer rebates taxable in Maryland?
**A:** YES. The excise tax is calculated on the full vehicle price BEFORE manufacturer rebates are applied. This includes federal EV rebates ($7,500).

### Q: What's the current Maryland vehicle excise tax rate?
**A:** 6.5% as of July 1, 2025 (increased from 6.0%).

### Q: Does Maryland have local vehicle taxes?
**A:** NO. Maryland uses a state-only excise tax with NO county or municipal add-ons.

### Q: What's the maximum doc fee in Maryland?
**A:** $800 as of July 1, 2024 (increased from $500). Doc fees are taxable.

### Q: Are service contracts (VSC) and GAP taxable?
**A:** YES, when purchased with the vehicle (based on standard practice).

### Q: Can I get a tax credit for taxes paid to another state?
**A:** YES, but you MUST title your vehicle within 60 days of establishing Maryland residency. After 60 days, NO credit is available and you pay full MD tax.

### Q: How do I calculate Maryland lease tax?
**A:** Maryland calculates 6.5% tax on the TOTAL VEHICLE VALUE at lease inception. The tax can be paid upfront or capitalized into monthly payments.

### Q: Do trade-ins reduce tax on leases?
**A:** NO. Trade-ins do NOT reduce the tax base on leases (consistent with retail elimination).

### Q: What happens if I miss the 60-day reciprocity deadline?
**A:** You forfeit the reciprocity credit and must pay the FULL Maryland excise tax (6.5%), effectively paying tax twice.

### Q: Can I avoid Maryland tax by purchasing in Delaware (0% tax)?
**A:** NO. If you're a Maryland resident, you must pay Maryland's 6.5% excise tax when you title the vehicle. However, you can get reciprocity credit within 60 days (in this case, $0 credit, so you pay the full 6.5%).

### Q: Is negative equity taxable?
**A:** YES. Negative equity rolled into the vehicle price increases the taxable base on both retail purchases and leases.

---

## Implementation Checklist

- [x] Research Maryland Transportation Code § 13-809
- [x] Verify HB 754 passage and effective date (ENACTED July 1, 2024)
- [x] Verify HB 352 passage and effective date (ENACTED July 1, 2025)
- [x] Verify SB 362 passage and effective date (ENACTED July 1, 2024)
- [x] Confirm NO trade-in credit (NONE policy)
- [x] Confirm manufacturer rebates taxable
- [x] Confirm 6.5% excise tax rate
- [x] Confirm $800 doc fee cap
- [x] Research VSC/GAP taxability (limited guidance, treated as taxable)
- [x] Confirm lease taxation method (FULL_UPFRONT)
- [x] Confirm NO trade-in credit on leases
- [x] Research reciprocity rules (enabled with 60-day limit)
- [x] Document all sources
- [x] Create comprehensive test suite (73 tests)
- [x] Validate with recent dealer transactions

---

## Summary

Maryland's vehicle excise tax system underwent significant changes in 2024-2025, making it one of the most expensive states for vehicle purchases, especially for buyers with trade-ins. The elimination of trade-in credit (HB 754), combined with the rate increase to 6.5% (HB 352) and taxable manufacturer rebates, creates a high tax burden compared to neighboring states.

**Key Implementation Points:**
1. **NO trade-in credit** - Most important change
2. **6.5% state-only rate** - No local taxes
3. **Manufacturer rebates taxable** - Tax on full price
4. **$800 doc fee cap** - Increased from $500
5. **Reciprocity with 60-day deadline** - Strict enforcement

Maryland's STATE_ONLY tax scheme simplifies calculation, but the elimination of trade-in credit and taxable rebates create significant customer impact. Dealers must ensure systems are updated to reflect post-July 2024 rules.

---

**Document Version:** 2.0
**Last Updated:** 2025-11-13
**Next Review:** 2026-01-01 (annual review)
