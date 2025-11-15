# Mississippi Vehicle Tax Rule Profile

## Overview
Mississippi has a unique vehicle taxation structure with a **5% state sales tax** for vehicles weighing 10,000 pounds or less, and a **3% reduced rate** for heavy trucks over 10,000 pounds. Mississippi is one of the few states where **manufacturer rebates are TAXABLE** (a rare and unfavorable treatment for buyers). Additionally, Mississippi has **NO RECIPROCITY**, meaning no credit is given for taxes paid to other states. Service contracts are not taxed at the point of sale but may be taxed when services are performed.

## Key Facts

### Tax Structure
- **State Sales Tax Rate**: 5.0% (vehicles ≤ 10,000 lbs)
- **Heavy Truck Rate**: 3.0% (vehicles > 10,000 lbs)
- **Local Sales Tax**: Varies by jurisdiction
- **Combined Tax Range**: Typically 5% to 8% for passenger vehicles
- **Tax Scheme**: STATE_PLUS_LOCAL

### Trade-In Policy
- **Type**: FULL
- **Calculation**: Trade-in value is fully deducted from the purchase price before calculating tax
- **Benefit**: Reduces taxable amount by the full trade-in value

### Manufacturer Rebates
- **Taxability**: **TAXABLE** (UNIQUE and unfavorable)
- **Treatment**: Manufacturer rebates DO NOT reduce the taxable purchase price
- **Impact**: Buyers pay tax on the full MSRP before rebate
- **Rarity**: Mississippi is one of very few states with this treatment

### Dealer Rebates
- **Taxability**: NON-TAXABLE
- **Treatment**: Dealer rebates reduce the taxable purchase price
- **Distinction**: Manufacturer rebates taxed, but dealer rebates are not

### Documentation Fee
- **Taxability**: TAXABLE
- **State Cap**: No state-mandated cap on doc fee amount
- **Treatment**: Doc fees are included in the taxable amount

### Service Contracts & Extended Warranties
- **Taxability at Sale**: NOT TAXABLE at point of sale
- **Future Tax**: May be taxed when service is actually performed
- **Note**: Different from states that tax VSC at point of sale

### GAP Insurance/Waiver
- **Taxability**: NOT TAXABLE
- **Treatment**: GAP products are not subject to sales tax

### Accessories & Add-Ons
- **Taxability**: TAXABLE
- **Treatment**: Dealer-installed accessories are included in the taxable amount

## Tax Calculation Examples

### Example 1: Standard Vehicle Purchase with Manufacturer Rebate
```
Vehicle MSRP:            $30,000
Manufacturer Rebate:     $3,000
Net Price to Buyer:      $27,000
Trade-In Value:          $10,000
Doc Fee:                 $395
Service Contract:        $2,000
Accessories:             $1,500

Calculation (MISSISSIPPI UNIQUE TREATMENT):
Taxable Base = $30,000 (full MSRP, rebate does NOT reduce tax base)
- Trade-In Value = $10,000
Subtotal = $20,000
+ Doc Fee = $395
+ Accessories = $1,500
Taxable Amount = $21,895

Sales Tax (5%) = $21,895 × 0.05 = $1,094.75
Service Contract (not taxed at sale) = $2,000

Total Tax: $1,094.75
Out-of-Pocket: $27,000 - $10,000 + $395 + $2,000 + $1,500 + $1,094.75 = $21,989.75

NOTE: Buyer pays tax on $30,000 base but only pays $27,000 for vehicle
Additional Tax Due to Rebate Treatment: $3,000 × 0.05 = $150
```

### Example 2: Purchase with Dealer Rebate (NOT taxed)
```
Vehicle Price:           $35,000
Dealer Rebate:          $2,000
Net Price:              $33,000
Trade-In Value:          $12,000
Doc Fee:                 $395

Calculation (Dealer rebate reduces tax base):
Taxable Base = $35,000 - $2,000 = $33,000
- Trade-In Value = $12,000
Subtotal = $21,000
+ Doc Fee = $395
Taxable Amount = $21,395

Sales Tax (5%) = $21,395 × 0.05 = $1,069.75

Total Tax: $1,069.75
Total Cost: $21,000 + $395 + $1,069.75 = $22,464.75
```

### Example 3: Heavy Truck Purchase (3% rate)
```
Vehicle Price:           $65,000
Vehicle Weight:          12,000 lbs (qualifies for 3% rate)
Trade-In Value:          $25,000
Doc Fee:                 $395

Calculation:
Taxable Base = $65,000 - $25,000 = $40,000
+ Doc Fee = $395
Taxable Amount = $40,395

Sales Tax (3% heavy truck rate) = $40,395 × 0.03 = $1,211.85

Total Tax: $1,211.85
Total Cost: $40,000 + $395 + $1,211.85 = $41,606.85
```

### Example 4: Combined State + Local (Jackson ~7%)
```
Vehicle Price:           $28,000
Manufacturer Rebate:     $2,500
Net to Buyer:           $25,500
Trade-In Value:          $8,000
Doc Fee:                 $395
Accessories:             $1,200

Calculation (with local tax):
Taxable Base = $28,000 (rebate does NOT reduce)
- Trade-In Value = $8,000
Subtotal = $20,000
+ Doc Fee = $395
+ Accessories = $1,200
Taxable Amount = $21,595

Combined Tax (7%) = $21,595 × 0.07 = $1,511.65

Total Tax: $1,511.65
Out-of-Pocket: $25,500 - $8,000 + $395 + $1,200 + $1,511.65 = $20,606.65

Additional Tax from Rebate: $2,500 × 0.07 = $175
```

## Lease Tax Rules

### Lease Taxation Method
- **Method**: MONTHLY
- **Description**: Tax is calculated and collected on each monthly lease payment

### Lease Trade-In Credit
- **Type**: FULL
- **Application**: Trade-in credit reduces the capitalized cost, lowering monthly payments

### Lease Rebate Treatment
- **Manufacturer Rebates**: Likely taxable (follow retail rule)
- **Impact**: Rebates reduce cap cost but may not reduce tax base
- **Complexity**: Mississippi's unique rebate treatment applies to leases

### Lease Tax Calculation
```
Monthly Payment:         $450
Combined Tax (7%):      $31.50

Total Monthly:           $481.50

Over 36 months:
Base Payments:          $16,200
Total Tax:              $1,134
Grand Total:            $17,334
```

## Special Rules & Considerations

### MANUFACTURER REBATES ARE TAXABLE (VERY RARE)
- **Unique Treatment**: Mississippi taxes manufacturer rebates
- **How It Works**:
  - Buyer receives rebate and pays lower net price
  - BUT tax calculated on full price BEFORE rebate
  - Buyer pays tax on money they never received
- **Cost Impact**: Significant - adds 5-8% of rebate amount to tax bill
- **Comparison**: Almost all other states treat manufacturer rebates as non-taxable
- **Examples of Extra Tax**:
  - $2,000 rebate → $100-$160 extra tax
  - $3,000 rebate → $150-$240 extra tax
  - $5,000 rebate → $250-$400 extra tax

### Dealer Rebates vs. Manufacturer Rebates
- **Manufacturer Rebates**: TAXABLE (unique to MS)
- **Dealer Rebates**: NON-TAXABLE (standard treatment)
- **Strategy**: In Mississippi, dealer rebates are more valuable than manufacturer rebates
- **Example**:
  - $3,000 manufacturer rebate: Buyer pays $150 extra tax (5% × $3,000)
  - $3,000 dealer rebate: No extra tax

### NO RECIPROCITY (Uncommon)
- **No Credit**: Mississippi provides NO credit for taxes paid to other states
- **Impact**: MS residents purchasing out-of-state pay tax twice (once to selling state, again to MS)
- **Example**:
  - MS resident buys in Alabama, pays 2% AL tax
  - When registering in MS, pays full 5% MS tax
  - No credit for the 2% paid to Alabama
  - Total tax burden: 7% (2% + 5%)
- **Comparison**: Most states provide reciprocity credits
- **Rare**: Only a few states have no reciprocity

### Heavy Truck Reduced Rate
- **3% Rate**: Vehicles over 10,000 lbs taxed at 3% (vs. 5%)
- **Qualification**: Based on gross vehicle weight rating (GVWR)
- **Examples**:
  - Passenger vehicles: 5%
  - Light trucks/SUVs under 10,000 lbs: 5%
  - Heavy duty pickups over 10,000 lbs: 3%
  - Commercial trucks over 10,000 lbs: 3%

### Service Contracts - Deferred Taxation
- **Not Taxed at Sale**: Service contracts not taxed when purchased with vehicle
- **Future Tax**: May be taxed when services are actually performed
- **Different Treatment**: Unlike states that tax VSC at point of sale (like Maine)
- **Benefit**: Lower upfront cost

### Location-Based Rate Variation
- **State Rate**: 5% (or 3% for heavy trucks)
- **Local Options**: Counties and municipalities add local taxes
- **Jackson**: Typically ~7% combined
- **Gulf Coast**: Varies by city
- **Rural Areas**: May have lower local taxes
- **Verification Required**: Must verify specific local rate

## Common Scenarios

### Scenario 1: Manufacturer Rebate Purchase in Jackson
A buyer purchases a vehicle with a $4,000 manufacturer rebate.
- **Net Price**: $4,000 less than MSRP
- **Tax Base**: Full MSRP (rebate does NOT reduce)
- **Extra Tax**: $4,000 × 7% = $280 additional tax burden
- **Impact**: Rebate is worth $3,720 net after tax impact ($4,000 - $280)

### Scenario 2: MS Resident Buying Out-of-State
An MS resident purchases a vehicle in Tennessee and brings it to Mississippi.
- **TN Tax Paid**: 7% Tennessee sales tax paid at purchase
- **MS Tax Due**: Full 5% MS tax due when registering
- **No Credit**: No credit for TN tax paid
- **Total Tax**: 12% total (7% TN + 5% MS)
- **Expensive**: Buying out-of-state is very expensive for MS residents

### Scenario 3: Heavy Duty Truck Purchase
A buyer purchases a 3/4-ton or 1-ton truck over 10,000 lbs GVWR.
- **Rate**: 3% instead of 5%
- **Savings**: 2% savings vs. standard rate
- **Example**: $50,000 truck saves $1,000 (2% × $50,000)

### Scenario 4: Dealer Rebate vs. Manufacturer Rebate
A dealer offers the buyer a choice: $3,000 manufacturer rebate or $2,800 dealer discount.
- **Manufacturer Rebate**: $3,000 - $150 extra tax = $2,850 net benefit
- **Dealer Discount**: $2,800 with no extra tax = $2,800 net benefit
- **Better Choice**: Manufacturer rebate still slightly better, but margin is small
- **Important**: In MS, dealer rebates/discounts have more value than manufacturer rebates

## Mississippi's Unique Tax Burden

### Unfavorable Aspects
1. **Manufacturer Rebates Taxed**: One of very few states with this treatment
2. **No Reciprocity**: No credit for out-of-state taxes paid
3. **Combined Burden**: These two factors make MS particularly expensive for certain scenarios

### Favorable Aspects
1. **Full Trade-In Credit**: Provides significant tax savings
2. **Heavy Truck Rate**: 3% for trucks over 10,000 lbs
3. **Service Contracts Not Taxed**: Saves money on VSC (though deferred taxation may apply)
4. **Moderate State Rate**: 5% state rate is moderate (though local taxes increase this)

### Cost Impact Examples
```
Scenario: $35,000 vehicle with $4,000 manufacturer rebate
- Most States: Tax on $31,000 (after rebate) = $1,550-$2,480
- Mississippi: Tax on $35,000 (before rebate) = $1,750-$2,800
- Extra Cost: $200-$320
```

## Important Notes
1. **MANUFACTURER REBATES TAXABLE**: Mississippi taxes manufacturer rebates (very rare and unfavorable)
2. **Dealer Rebates NOT Taxable**: Different treatment - dealer rebates DO reduce tax base
3. **NO RECIPROCITY**: No credit for out-of-state taxes - expensive for MS residents buying elsewhere
4. **Heavy Truck Rate**: 3% for vehicles over 10,000 lbs (vs. 5% standard)
5. **Full Trade-In**: Full trade-in credit provides significant tax savings
6. **Service Contracts**: Not taxed at sale (may be taxed when services performed)
7. **Combined Rates**: State + local can reach 7-8% in urban areas

## Compliance Requirements
- **Sales Tax Collection**: Dealers must collect state + local sales tax
- **Manufacturer Rebate Taxation**: Must include manufacturer rebates in tax base
- **Dealer Rebate Exemption**: Must exclude dealer rebates from tax base
- **Rate Determination**: Must accurately determine buyer's registration location for local rate
- **Remittance**: Sales tax remitted to Mississippi Department of Revenue
- **Documentation**: Proper documentation distinguishing manufacturer vs. dealer rebates
- **Heavy Truck Rate**: Must apply correct rate (3% vs. 5%) based on GVWR
- **No Reciprocity**: Cannot provide credits for out-of-state taxes

## Version Information
- **Rule Version**: 2
- **Last Updated**: Current implementation
- **State Code**: MS

## References
- Mississippi Department of Revenue
- Mississippi Code Title 27, Chapter 65 (Sales and Use Tax)
- Mississippi Department of Revenue Regulation 35.IV.3.06 (Manufacturer rebates)
- Mississippi Department of Revenue - Motor Vehicle Sales Tax Guide
- Local jurisdiction tax rates and ordinances
