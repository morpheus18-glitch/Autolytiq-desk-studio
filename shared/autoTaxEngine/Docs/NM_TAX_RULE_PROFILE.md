# New Mexico Vehicle Tax Rule Profile

## Overview
New Mexico has a unique taxation structure for vehicle purchases, utilizing a **Gross Receipts Tax (GRT)** rather than a traditional sales tax. The state GRT rate is 5.125%, but local jurisdictions can add their own rates, resulting in combined rates that typically range from 5.125% to 9.3125%. This gross receipts tax system treats the transaction differently than a conventional sales tax, though the practical effect for vehicle buyers is similar.

## Key Facts

### Tax Structure
- **Tax Type**: Gross Receipts Tax (GRT), not traditional sales tax
- **State GRT Rate**: 5.125%
- **Local GRT**: Varies by municipality and county (0% to ~4.1875%)
- **Combined Tax Range**: 5.125% to 9.3125% (typical maximum)
- **Tax Scheme**: STATE_PLUS_LOCAL

### Trade-In Policy
- **Type**: FULL
- **Calculation**: Trade-in value is fully deducted from the purchase price before calculating GRT
- **Benefit**: Provides significant tax savings by reducing the taxable amount

### Manufacturer Rebates
- **Taxability**: NON-TAXABLE
- **Treatment**: Manufacturer rebates reduce the taxable purchase price
- **Impact**: Lowers the gross receipts subject to tax

### Dealer Rebates
- **Taxability**: NON-TAXABLE
- **Treatment**: Dealer rebates reduce the taxable purchase price

### Documentation Fee
- **Taxability**: TAXABLE
- **State Cap**: No specific state cap on doc fee amount
- **Treatment**: Doc fees are included in the gross receipts subject to GRT

### Service Contracts & Extended Warranties
- **Taxability**: Complex - depends on how structured
- **General Treatment**: May be subject to GRT if sold as part of vehicle sale
- **Note**: Service contracts sold separately may have different tax treatment

### GAP Insurance/Waiver
- **Taxability**: Typically NOT TAXABLE
- **Treatment**: Insurance products generally not subject to GRT
- **Note**: GAP waivers (not insurance) may have different treatment

### Accessories & Add-Ons
- **Taxability**: TAXABLE
- **Treatment**: Dealer-installed accessories are included in gross receipts subject to GRT

## Tax Calculation Examples

### Example 1: Vehicle Purchase in Albuquerque (Combined ~7.875%)
```
Vehicle Price:           $30,000
Trade-In Value:          $10,000
Doc Fee:                 $399
Accessories:             $1,500
Service Contract:        $2,000 (assume taxable as part of sale)

Calculation:
Taxable Base = $30,000 - $10,000 = $20,000
+ Doc Fee = $399
+ Accessories = $1,500
+ Service Contract = $2,000
Gross Receipts = $23,899

Combined GRT (7.875%) = $23,899 × 0.07875 = $1,882.05

Total Tax: $1,882.05
Total Cost: $20,000 + $399 + $1,500 + $2,000 + $1,882.05 = $25,781.05
```

### Example 2: Vehicle Purchase in Rural Area (State Rate Only 5.125%)
```
Vehicle Price:           $25,000
Trade-In Value:          $8,000
Doc Fee:                 $399
Accessories:             $800

Calculation:
Taxable Base = $25,000 - $8,000 = $17,000
+ Doc Fee = $399
+ Accessories = $800
Gross Receipts = $18,199

State GRT (5.125%) = $18,199 × 0.05125 = $932.70

Total Tax: $932.70
Total Cost: $17,000 + $399 + $800 + $932.70 = $19,131.70
```

### Example 3: Luxury Vehicle in High-Tax Area (9.3125% combined)
```
Vehicle Price:           $75,000
Trade-In Value:          $35,000
Doc Fee:                 $399
Premium Accessories:     $5,000

Calculation:
Taxable Base = $75,000 - $35,000 = $40,000
+ Doc Fee = $399
+ Accessories = $5,000
Gross Receipts = $45,399

Combined GRT (9.3125%) = $45,399 × 0.093125 = $4,227.79

Total Tax: $4,227.79
Total Cost: $40,000 + $399 + $5,000 + $4,227.79 = $49,626.79
```

## Lease Tax Rules

### Lease Taxation Method
- **Method**: MONTHLY
- **Description**: GRT is calculated and collected on each monthly lease payment

### Lease Trade-In Credit
- **Type**: FULL
- **Application**: Trade-in credit reduces the capitalized cost, lowering monthly payments

### Lease Tax Calculation
- GRT is applied to the monthly payment amount
- Combined state and local GRT rates apply
- Down payments may be subject to GRT
- Rate based on location where vehicle is registered/garaged

### Lease Payment Example (Albuquerque - 7.875%)
```
Monthly Payment:         $450
GRT (7.875%):           $35.44

Total Monthly:           $485.44
```

## Gross Receipts Tax vs. Sales Tax

### Key Differences
1. **Legal Structure**:
   - GRT is a tax on the privilege of doing business in New Mexico
   - Sales tax is a tax on the consumer's purchase
   - Sellers are legally liable for GRT, though it's passed to buyers

2. **Tax Base**:
   - GRT applies to gross receipts of business
   - Sales tax applies to retail sales transaction

3. **Pyramiding**:
   - GRT can theoretically pyramid through multiple business transactions
   - Sales tax is typically one-time at retail level

4. **Practical Effect**:
   - For vehicle buyers, the practical effect is the same as sales tax
   - Rate is applied to purchase price (minus trade-in)
   - Added to buyer's total cost

## Special Rules & Considerations

### Location-Based Rate Variation
- **Multiple Jurisdictions**: New Mexico has state + county + municipal GRT
- **Rate Lookup Required**: Must determine exact location to calculate correct rate
- **Albuquerque**: Typically highest combined rate (~7.875% to 8.8125%)
- **Rural Areas**: May only have state rate (5.125%) or minimal local additions
- **Las Cruces**: Typically 7.9% to 8.6%
- **Santa Fe**: Typically 8.4375%

### Registration Location Critical
- GRT rate based on where vehicle will be registered/principally garaged
- Not based on dealer location
- Buyer must provide accurate address information
- Improper rate application can result in underpayment

### Reciprocity
- **Status**: New Mexico provides limited reciprocity
- **Out-of-State Credits**: Credits may be given for GRT/sales tax paid to other states
- **Documentation**: Proof of prior tax payment required
- **Limitations**: Credit limited to NM tax that would have been due

### Native American Considerations
- **Tribal Lands**: Different tax treatment may apply for purchases on tribal lands
- **Tribal Members**: New Mexico residents who are tribal members may have exemptions
- **Complex Rules**: Consultation with tribal and state authorities recommended

### Military Personnel
- **Servicemembers Civil Relief Act**: May provide protections
- **Legal Residence**: Tax treatment depends on legal residence vs. duty station
- **Home State Registration**: May register in home state and avoid NM GRT

## Common Scenarios

### Scenario 1: Out-of-State Move-In
A buyer moving to New Mexico from Texas purchases a vehicle in NM.
- **NM GRT**: Full state + local GRT applies
- **TX Credit**: No credit for TX sales tax (vehicle not purchased in TX)
- **Registration**: Must register in NM within 30 days

### Scenario 2: Private Party Purchase
A buyer purchases a vehicle from a private seller (not a dealer).
- **GRT at Sale**: Not applicable - private sellers don't collect GRT
- **Registration**: Must pay applicable fees and taxes at registration
- **Use Tax**: May owe equivalent use tax when registering

### Scenario 3: Interstate Dealer Trade
A NM dealer trades with an out-of-state dealer to get the vehicle a buyer wants.
- **GRT**: Still applies based on NM buyer's location
- **Dealer Location**: Doesn't matter where vehicle comes from
- **Rate**: Based on buyer's registration address in NM

## Registration and Title Fees
- **Title Fee**: Separate from GRT
- **Registration Fee**: Based on vehicle value and weight
- **Excise Tax**: 3% or 4% excise tax on vehicle value (separate from GRT)
- **Not Included in GRT**: These fees are separate and additional

## Important Notes
1. **Gross Receipts Tax**: New Mexico uses GRT, not traditional sales tax - unique system
2. **Combined Rates**: State + local rates can reach 9.3125% in some jurisdictions
3. **Rate Variation**: Significant variation across the state - verification essential
4. **Trade-In Benefit**: Full trade-in credit provides substantial tax savings
5. **Location Critical**: Buyer's registration location determines rate, not dealer location
6. **Excise Tax**: Separate 3-4% vehicle excise tax applies in addition to GRT
7. **Complex System**: One of the more complex state tax systems for vehicles

## Compliance Requirements
- **Rate Determination**: Dealers must accurately determine buyer's location for rate calculation
- **GRT Collection**: Dealers must collect and remit GRT to New Mexico Taxation and Revenue Department
- **Documentation**: Proper documentation of buyer's address and registration location
- **Multiple Jurisdictions**: Must account for state, county, and municipal portions
- **Monthly Remittance**: GRT typically remitted monthly to the state
- **Lease Payments**: Ongoing GRT collection on monthly lease payments

## Version Information
- **Rule Version**: 1
- **Last Updated**: Current implementation
- **State Code**: NM

## References
- New Mexico Gross Receipts and Compensating Tax Act (NMSA 1978, Sections 7-9-1 to 7-9-116)
- New Mexico Taxation and Revenue Department
- Local jurisdiction GRT ordinances and rates
- New Mexico Motor Vehicle Division (MVD)
