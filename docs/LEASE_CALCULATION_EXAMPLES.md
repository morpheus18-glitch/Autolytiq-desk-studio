# Lease Calculation Examples

This document provides fully worked lease calculation examples with all intermediate numbers for verification and testing purposes.

---

## Example 1: Standard California Lease (Payment Tax Method)

### Input Values

**Vehicle:**
- MSRP: $42,000
- Selling Price: $40,000
- Residual %: 55%
- Term: 36 months
- Money Factor: 0.00125

**Cap Cost Components:**
- Doc Fee: $85 (capitalized)
- Acquisition Fee: $650 (capitalized)
- DMV/Registration: $450 (not capitalized, paid upfront)
- Dealer Fees: $199 (capitalized)

**Reductions:**
- Cash Down: $2,000
- Trade Allowance: $8,000
- Trade Payoff: $5,000
- Manufacturer Rebate: $1,500 (non-taxable)

**Tax:**
- Tax Rate: 9.5%
- Tax Method: payment

---

### Step-by-Step Calculation

#### Step 1: Residual Value
```
Residual Value = MSRP × Residual %
               = $42,000 × 0.55
               = $23,100
```

#### Step 2: Gross Capitalized Cost
```
Gross Cap Cost = Selling Price + Capitalized Fees
               = $40,000 + $85 + $650 + $199
               = $40,934
```

#### Step 3: Cap Cost Reductions
```
Trade Equity = Trade Allowance - Trade Payoff
             = $8,000 - $5,000
             = $3,000

Total Cap Reductions = Cash Down + Trade Equity + Manufacturer Rebate
                     = $2,000 + $3,000 + $1,500
                     = $6,500
```

#### Step 4: Adjusted Capitalized Cost
```
Adjusted Cap Cost = Gross Cap Cost - Total Cap Reductions
                  = $40,934 - $6,500
                  = $34,434
```

#### Step 5: Depreciation
```
Depreciation = Adjusted Cap Cost - Residual Value
             = $34,434 - $23,100
             = $11,334

Monthly Depreciation = Depreciation / Term
                     = $11,334 / 36
                     = $314.83
```

#### Step 6: Rent Charge (Finance Charge)
```
Monthly Rent Charge = (Adjusted Cap Cost + Residual Value) × Money Factor
                    = ($34,434 + $23,100) × 0.00125
                    = $57,534 × 0.00125
                    = $71.92
```

#### Step 7: Base Monthly Payment
```
Base Monthly Payment = Monthly Depreciation + Monthly Rent Charge
                     = $314.83 + $71.92
                     = $386.75
```

#### Step 8: Monthly Tax (Payment Method)
```
Monthly Tax = Base Monthly Payment × Tax Rate
            = $386.75 × 0.095
            = $36.74
```

#### Step 9: Total Monthly Payment
```
Total Monthly Payment = Base Monthly Payment + Monthly Tax
                      = $386.75 + $36.74
                      = $423.49
```

#### Step 10: Drive-Off (Due at Signing)
```
Drive-Off = First Payment + Cash Down + Acquisition Fee + Doc Fee + DMV Fees
          = $423.49 + $2,000 + $650 + $85 + $450
          = $3,608.49
```

---

### Final Outputs

| Output | Value |
|--------|-------|
| Residual Value | $23,100.00 |
| Gross Cap Cost | $40,934.00 |
| Total Cap Reductions | $6,500.00 |
| Adjusted Cap Cost | $34,434.00 |
| Depreciation | $11,334.00 |
| Monthly Depreciation | $314.83 |
| Monthly Rent Charge | $71.92 |
| Base Monthly Payment | $386.75 |
| Monthly Tax | $36.74 |
| **Total Monthly Payment** | **$423.49** |
| **Due at Signing** | **$3,608.49** |
| APR Equivalent | 3.00% (0.00125 × 2400) |
| Total of Payments | $15,245.64 (36 × $423.49) |

---

## Example 2: Texas Lease (Total Cap Cost Tax Method)

Texas taxes the entire adjusted cap cost upfront rather than monthly payments.

### Input Values

**Vehicle:**
- MSRP: $55,000
- Selling Price: $52,000
- Residual %: 52%
- Term: 39 months
- Money Factor: 0.00145

**Cap Cost Components:**
- Doc Fee: $150 (capitalized)
- Acquisition Fee: $795 (capitalized)
- Registration: $125 (upfront)
- Title: $33 (upfront)
- Dealer Admin Fee: $299 (capitalized)

**Reductions:**
- Cash Down: $3,000
- Trade Allowance: $12,000
- Trade Payoff: $9,500
- Manufacturer Rebate: $2,000 (non-taxable in Texas)

**Tax:**
- Tax Rate: 6.25%
- Tax Method: total_cap

---

### Step-by-Step Calculation

#### Step 1: Residual Value
```
Residual Value = MSRP × Residual %
               = $55,000 × 0.52
               = $28,600
```

#### Step 2: Gross Capitalized Cost
```
Gross Cap Cost = Selling Price + Capitalized Fees
               = $52,000 + $150 + $795 + $299
               = $53,244
```

#### Step 3: Cap Cost Reductions
```
Trade Equity = Trade Allowance - Trade Payoff
             = $12,000 - $9,500
             = $2,500

Total Cap Reductions = Cash Down + Trade Equity + Manufacturer Rebate
                     = $3,000 + $2,500 + $2,000
                     = $7,500
```

#### Step 4: Adjusted Capitalized Cost
```
Adjusted Cap Cost = Gross Cap Cost - Total Cap Reductions
                  = $53,244 - $7,500
                  = $45,744
```

#### Step 5: Upfront Tax (Total Cap Method)
```
Upfront Tax = Adjusted Cap Cost × Tax Rate
            = $45,744 × 0.0625
            = $2,859.00
```

#### Step 6: Depreciation
```
Depreciation = Adjusted Cap Cost - Residual Value
             = $45,744 - $28,600
             = $17,144

Monthly Depreciation = Depreciation / Term
                     = $17,144 / 39
                     = $439.59
```

#### Step 7: Rent Charge
```
Monthly Rent Charge = (Adjusted Cap Cost + Residual Value) × Money Factor
                    = ($45,744 + $28,600) × 0.00145
                    = $74,344 × 0.00145
                    = $107.80
```

#### Step 8: Base & Total Monthly Payment
```
Base Monthly Payment = Monthly Depreciation + Monthly Rent Charge
                     = $439.59 + $107.80
                     = $547.39

Monthly Tax = $0.00 (tax paid upfront)

Total Monthly Payment = $547.39
```

#### Step 9: Drive-Off (Due at Signing)
```
Drive-Off = First Payment + Cash Down + Acquisition Fee + Doc Fee + Gov Fees + Upfront Tax
          = $547.39 + $3,000 + $795 + $150 + $158 + $2,859
          = $7,509.39
```

---

### Final Outputs

| Output | Value |
|--------|-------|
| Residual Value | $28,600.00 |
| Gross Cap Cost | $53,244.00 |
| Total Cap Reductions | $7,500.00 |
| Adjusted Cap Cost | $45,744.00 |
| **Upfront Tax** | **$2,859.00** |
| Depreciation | $17,144.00 |
| Monthly Depreciation | $439.59 |
| Monthly Rent Charge | $107.80 |
| Base Monthly Payment | $547.39 |
| Monthly Tax | $0.00 |
| **Total Monthly Payment** | **$547.39** |
| **Due at Signing** | **$7,509.39** |
| APR Equivalent | 3.48% (0.00145 × 2400) |
| Total of Payments | $21,348.21 (39 × $547.39) |

---

## Example 3: Zero-Down Lease with Negative Trade Equity

This example demonstrates handling negative trade equity (underwater trade-in).

### Input Values

**Vehicle:**
- MSRP: $38,000
- Selling Price: $36,500
- Residual %: 58%
- Term: 36 months
- Money Factor: 0.00110

**Cap Cost Components:**
- Doc Fee: $85 (capitalized)
- Acquisition Fee: $595 (capitalized)
- Registration: $350 (upfront)
- Dealer Fee: $199 (capitalized)

**Reductions:**
- Cash Down: $0 (zero down)
- Trade Allowance: $6,000
- Trade Payoff: $8,500 (underwater by $2,500)
- Manufacturer Rebate: $1,000

**Tax:**
- Tax Rate: 8.0%
- Tax Method: payment

---

### Step-by-Step Calculation

#### Step 1: Residual Value
```
Residual Value = MSRP × Residual %
               = $38,000 × 0.58
               = $22,040
```

#### Step 2: Gross Capitalized Cost
```
Gross Cap Cost = Selling Price + Capitalized Fees
               = $36,500 + $85 + $595 + $199
               = $37,379
```

#### Step 3: Cap Cost Reductions (with Negative Equity)
```
Trade Equity = Trade Allowance - Trade Payoff
             = $6,000 - $8,500
             = -$2,500 (NEGATIVE)

# Negative equity is ADDED to cap cost, not subtracted
# Only positive equity and rebates reduce cap cost

Positive Reductions = Cash Down + Manufacturer Rebate
                    = $0 + $1,000
                    = $1,000

# Negative equity gets rolled into cap cost
Negative Equity to Roll In = $2,500
```

#### Step 4: Adjusted Capitalized Cost
```
Adjusted Cap Cost = Gross Cap Cost - Positive Reductions + Negative Equity
                  = $37,379 - $1,000 + $2,500
                  = $38,879
```

#### Step 5: Depreciation
```
Depreciation = Adjusted Cap Cost - Residual Value
             = $38,879 - $22,040
             = $16,839

Monthly Depreciation = Depreciation / Term
                     = $16,839 / 36
                     = $467.75
```

#### Step 6: Rent Charge
```
Monthly Rent Charge = (Adjusted Cap Cost + Residual Value) × Money Factor
                    = ($38,879 + $22,040) × 0.00110
                    = $60,919 × 0.00110
                    = $67.01
```

#### Step 7: Base Monthly Payment
```
Base Monthly Payment = Monthly Depreciation + Monthly Rent Charge
                     = $467.75 + $67.01
                     = $534.76
```

#### Step 8: Monthly Tax
```
Monthly Tax = Base Monthly Payment × Tax Rate
            = $534.76 × 0.08
            = $42.78
```

#### Step 9: Total Monthly Payment
```
Total Monthly Payment = Base Monthly Payment + Monthly Tax
                      = $534.76 + $42.78
                      = $577.54
```

#### Step 10: Drive-Off
```
Drive-Off = First Payment + Cash Down + Acquisition Fee + Doc Fee + Registration
          = $577.54 + $0 + $595 + $85 + $350
          = $1,607.54
```

---

### Final Outputs

| Output | Value |
|--------|-------|
| Residual Value | $22,040.00 |
| Gross Cap Cost | $37,379.00 |
| Total Cap Reductions | $1,000.00 |
| Negative Equity Rolled In | $2,500.00 |
| Adjusted Cap Cost | $38,879.00 |
| Depreciation | $16,839.00 |
| Monthly Depreciation | $467.75 |
| Monthly Rent Charge | $67.01 |
| Base Monthly Payment | $534.76 |
| Monthly Tax | $42.78 |
| **Total Monthly Payment** | **$577.54** |
| **Due at Signing** | **$1,607.54** |
| APR Equivalent | 2.64% (0.00110 × 2400) |
| Total of Payments | $20,791.44 (36 × $577.54) |

---

## Default Tax Behavioral Patterns Summary

These are the DEFAULT behaviors used in calculations unless a state overrides them:

| Component | Default Behavior |
|-----------|-----------------|
| **Most states** | Tax the monthly payment |
| **Manufacturer rebates** | NON-taxable (deduct from cap cost before tax) |
| **Doc fee** | TAXABLE (roll into cap cost) |
| **Acquisition fee (capitalized)** | TAXABLE |
| **Acquisition fee (upfront)** | UNTAXED |
| **Cap cost reduction** | Taxable only in states that tax down payment (e.g., TX) |
| **Trade equity (positive)** | Reduces cap cost |
| **Negative equity** | MUST be rolled into cap cost |
| **Negative equity tax** | Taxable in states that tax total cap cost |

---

## Tax Methods Reference

| Method | Description | Example States |
|--------|-------------|----------------|
| `payment` | Tax applied to monthly payment | CA, FL, NY |
| `total_cap` | Tax on adjusted cap cost upfront | TX |
| `selling_price` | Tax on vehicle selling price only | Some local variations |
| `cap_reduction` | Tax on cap reduction + payment | Specific state rules |

---

## Formulas Reference

```typescript
// Core Lease Formulas
residualValue = msrp * residualPercent

grossCapCost = sellingPrice + capitalizedFees

totalCapReductions = cashDown + tradeEquity + rebates + incentives

adjustedCapCost = grossCapCost - totalCapReductions + negativeEquity

depreciation = adjustedCapCost - residualValue

monthlyDepreciation = depreciation / term

monthlyRentCharge = (adjustedCapCost + residualValue) * moneyFactor

baseMonthlyPayment = monthlyDepreciation + monthlyRentCharge

// Tax Methods
if (taxMethod === 'payment') {
  monthlyTax = baseMonthlyPayment * taxRate
  upfrontTax = 0
} else if (taxMethod === 'total_cap') {
  monthlyTax = 0
  upfrontTax = adjustedCapCost * taxRate
}

totalMonthlyPayment = baseMonthlyPayment + monthlyTax

aprEquivalent = moneyFactor * 2400

totalOfPayments = totalMonthlyPayment * term
```
