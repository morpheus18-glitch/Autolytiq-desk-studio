# Enhanced Tax Calculation System - Version 2.0

## Overview

The Enhanced Tax Calculation System is a bulletproof, penny-accurate tax calculation engine designed for automotive dealerships. It consolidates all tax calculation logic into a single, auditable, and maintainable system.

## Critical Features

### 1. Penny-Accurate Calculations
- Uses `Decimal.js` for ALL monetary calculations
- No floating-point errors (0.1 + 0.2 = 0.3 ✓)
- All money values stored as decimal strings
- Consistent rounding (ROUND_HALF_UP)

### 2. Full Audit Trail
- Every calculation logged to database
- Complete snapshot of inputs and outputs
- Reproducible calculations
- Who, when, what calculated

### 3. Jurisdiction-Based Rules
- Database-driven jurisdiction lookup
- ZIP code to tax rate mapping
- State, county, city, special district rates
- Effective date tracking

### 4. State-Specific Rules
- 50-state support (via autoTaxEngine integration)
- Trade-in credit rules
- Fee taxability rules
- Doc fee caps
- Special schemes (TAVT, HUT, Privilege Tax)

### 5. Comprehensive Validation
- Breakdown sums match total
- Tax rates within reasonable bounds
- Taxable amounts validated
- Jurisdiction data current

## Financial/Legal Requirements

This system meets critical financial and legal requirements:

1. **Accuracy**: Calculations accurate to the penny
2. **Auditability**: Full audit trail for every calculation
3. **Reproducibility**: Same inputs = same outputs
4. **Traceability**: Who calculated, when, with what rules
5. **Itemization**: Complete breakdown of all tax components

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  EnhancedTaxService                         │
│  (Core business logic - all calculations here)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    TaxStorage Interface                      │
│  (Abstraction for data access)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ implemented by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  DatabaseTaxStorage                          │
│  (Database integration via Drizzle ORM)                     │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Jurisdiction │ │  State Rules │ │  Audit Log   │
    │   Service    │ │   Service    │ │              │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ tax_         │ │ state_tax_   │ │ tax_audit_   │
    │ jurisdictions│ │ rules        │ │ log          │
    └──────────────┘ └──────────────┘ └──────────────┘
```

## Quick Start

### Installation

The tax module is already installed. No additional dependencies needed.

### Basic Usage

```typescript
import { EnhancedTaxService, DatabaseTaxStorage } from '@/modules/tax';
import { db } from '@/lib/db';

// Create storage adapter
const storage = new DatabaseTaxStorage(db);

// Create tax service
const taxService = new EnhancedTaxService(storage);

// Calculate sales tax
const result = await taxService.calculateSalesTax({
  dealershipId: 'dealership-uuid',
  vehiclePrice: '35000.00',
  zipCode: '90210',
  state: 'CA',
  tradeInValue: '10000.00',
  userId: 'user-uuid',
});

console.log('Total Tax:', result.totalTax); // "1837.50"
console.log('Breakdown:', result.breakdown);
// {
//   stateTax: "1812.50",
//   countyTax: "25.00",
//   cityTax: "0.00",
//   specialDistrictTax: "0.00"
// }
```

## API Reference

### EnhancedTaxService

#### calculateSalesTax(request: SalesTaxRequest): Promise<SalesTaxResult>

Calculate sales tax for a vehicle sale.

**Request:**
```typescript
{
  dealershipId: string;       // Required
  vehiclePrice: string;       // Required (decimal string)
  zipCode: string;            // Required (5 or 9 digit)
  state: string;              // Required (2-letter code)
  userId?: string;            // Optional (for audit)
  county?: string;            // Optional
  city?: string;              // Optional
  tradeInValue?: string;      // Optional (decimal string)
  rebateManufacturer?: string;// Optional (decimal string)
  rebateDealer?: string;      // Optional (decimal string)
  dealId?: string;            // Optional
  calculationDate?: Date;     // Optional (defaults to now)
}
```

**Response:**
```typescript
{
  totalTax: string;           // Total sales tax
  breakdown: {
    stateTax: string;
    countyTax: string;
    cityTax: string;
    specialDistrictTax: string;
  };
  taxRate: TaxRateBreakdown; // Rate breakdown
  taxableAmount: string;      // Amount after credits
  jurisdiction: Jurisdiction; // Jurisdiction used
  calculatedAt: Date;         // When calculated
  calculatedBy?: string;      // Who calculated
  calculationId: string;      // UUID for audit trail
}
```

#### calculateDealTaxes(request: DealTaxRequest): Promise<CompleteTaxBreakdown>

Calculate complete tax breakdown for a deal (sales tax + all fees).

**Request:**
```typescript
{
  dealId: string;
  dealershipId: string;
  userId: string;
  vehiclePrice: string;
  accessories: DealFee[];
  tradeInValue?: string;
  rebateManufacturer?: string;
  rebateDealer?: string;
  docFee?: string;
  otherFees: DealFee[];
  serviceContracts?: string;
  gap?: string;
  zipCode: string;
  state: string;
  county?: string;
  city?: string;
  calculationDate?: Date;
}
```

**Response:**
```typescript
{
  salesTax: SalesTaxResult;
  docFee: string;
  registrationFee: string;
  titleFee: string;
  otherFees: DealFee[];
  totalTaxesAndFees: string;
  totalTaxable: string;
  totalNonTaxable: string;
  auditTrail: TaxAuditTrail;
  validated: boolean;
  validationErrors: string[];
}
```

#### calculateTradeInCredit(params: TradeInParams): Promise<TradeInCreditResult>

Calculate trade-in credit based on state rules.

#### calculateDocFee(state: string, dealershipId: string, requestedFee?: string): Promise<string>

Calculate doc fee with state-specific caps applied.

#### calculateTitleFee(state: string): Promise<string>

Get title fee for a state.

#### calculateRegistrationFee(request: RegistrationRequest): Promise<RegistrationFeeResult>

Calculate registration fee (placeholder - needs expansion).

#### lookupJurisdiction(zipCode: string): Promise<Jurisdiction>

Lookup tax jurisdiction by ZIP code.

#### getTaxRate(jurisdiction: Jurisdiction): Promise<TaxRateBreakdown>

Get tax rate breakdown for a jurisdiction.

#### validateTaxCalculation(result: SalesTaxResult, stateRules: StateSpecificRules): TaxCalculationValidation

Validate a tax calculation.

#### auditTaxCalculation(dealId: string): Promise<TaxAuditTrail[]>

Get audit trail for a deal.

## Decimal Calculator Utilities

All monetary calculations MUST use these utilities:

```typescript
import { DecimalCalculator } from '@/modules/tax';

// Or import specific functions
import { add, subtract, multiply, calculateTax } from '@/modules/tax';

// Addition
const total = add('100.50', '50.25'); // "150.75"

// Subtraction
const difference = subtract('100.00', '25.50'); // "74.50"

// Multiplication
const product = multiply('100.00', '1.5'); // "150.00"

// Division
const quotient = divide('100.00', '4'); // "25.00"

// Tax calculation
const tax = calculateTax('1000.00', '0.0825'); // "82.50"

// Trade-in credit
const taxable = applyTradeInCredit('30000.00', '10000.00'); // "20000.00"

// Apply cap (e.g., CA doc fee)
const cappedFee = applyCap('300.00', '85.00'); // "85.00"

// Format as USD
const formatted = formatUSD('1234.56'); // "$1,234.56"

// Format as percentage
const percent = formatPercent('0.0825'); // "8.25%"
```

### NEVER Do This:

```typescript
// WRONG - Floating point errors
const tax = price * 0.0825;
const total = price + tax;

// RIGHT - Use decimal calculator
const tax = calculateTax(price, '0.0825');
const total = add(price, tax);
```

## State Rules

State-specific rules are centralized and database-driven. The system falls back to the comprehensive autoTaxEngine rules (50 states).

### Example: California Rules

```typescript
{
  stateCode: "CA",
  allowsTradeInCredit: true,
  tradeInCreditCap: undefined,      // No cap
  tradeInCreditPercent: undefined,  // Full credit
  docFeeMax: "85.00",                // Capped at $85
  docFeeCapped: true,
  docFeeTaxable: true,
  titleFee: "15.00",
  serviceContractsTaxable: true,
  gapTaxable: true,
  accessoriesTaxable: true,
  manufacturerRebateTaxable: false,  // Not taxed
  dealerRebateTaxable: true,         // Taxed
  specialScheme: "STANDARD",
  version: 1
}
```

### Example: Michigan Rules

```typescript
{
  stateCode: "MI",
  allowsTradeInCredit: true,
  tradeInCreditCap: "2000.00",      // Capped at $2,000
  tradeInCreditPercent: undefined,
  docFeeMax: "200.00",
  docFeeCapped: true,
  docFeeTaxable: false,             // Doc fee NOT taxed
  titleFee: "15.00",
  serviceContractsTaxable: false,   // VSC NOT taxed
  gapTaxable: false,                // GAP NOT taxed
  accessoriesTaxable: true,
  manufacturerRebateTaxable: false,
  dealerRebateTaxable: false,
  specialScheme: "STANDARD",
  version: 1
}
```

## Database Schema

### tax_jurisdictions

Stores tax jurisdiction lookup data.

```sql
CREATE TABLE tax_jurisdictions (
  id UUID PRIMARY KEY,
  zip_code VARCHAR(10) NOT NULL,
  state VARCHAR(2) NOT NULL,
  county VARCHAR(100),
  city VARCHAR(100),
  special_district VARCHAR(100),

  -- Tax rates (stored as decimal)
  state_tax_rate DECIMAL(6,4) NOT NULL,
  county_tax_rate DECIMAL(6,4) DEFAULT 0,
  city_tax_rate DECIMAL(6,4) DEFAULT 0,
  special_district_tax_rate DECIMAL(6,4) DEFAULT 0,

  -- Metadata
  effective_date DATE NOT NULL,
  end_date DATE,
  source VARCHAR(200),
  last_verified DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### state_tax_rules

Stores state-specific tax rules.

```sql
CREATE TABLE state_tax_rules (
  id UUID PRIMARY KEY,
  state_code VARCHAR(2) UNIQUE NOT NULL,
  state_name VARCHAR(100) NOT NULL,

  version INTEGER DEFAULT 1,
  effective_date DATE NOT NULL,
  end_date DATE,

  -- Trade-in rules
  allows_trade_in_credit BOOLEAN DEFAULT TRUE,
  trade_in_credit_cap DECIMAL(10,2),
  trade_in_credit_percent DECIMAL(5,4),

  -- Doc fee rules
  doc_fee_max DECIMAL(10,2),
  doc_fee_capped BOOLEAN DEFAULT FALSE,
  doc_fee_taxable BOOLEAN DEFAULT FALSE,

  -- Fee taxability
  service_contracts_taxable BOOLEAN DEFAULT FALSE,
  gap_taxable BOOLEAN DEFAULT FALSE,
  accessories_taxable BOOLEAN DEFAULT TRUE,

  -- Rebate treatment
  manufacturer_rebate_taxable BOOLEAN DEFAULT FALSE,
  dealer_rebate_taxable BOOLEAN DEFAULT TRUE,

  -- Special schemes
  special_scheme VARCHAR(50),

  notes TEXT,
  source VARCHAR(200),
  last_verified DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### tax_audit_log

Stores complete audit trail of all calculations.

```sql
CREATE TABLE tax_audit_log (
  id UUID PRIMARY KEY,
  calculation_id UUID UNIQUE NOT NULL,
  deal_id UUID REFERENCES deals(id),
  dealership_id UUID NOT NULL,
  calculated_by UUID NOT NULL REFERENCES users(id),
  calculated_at TIMESTAMP NOT NULL,
  calculation_type VARCHAR(50) NOT NULL,

  -- Complete snapshots
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  rules_applied JSONB NOT NULL,

  -- System metadata
  engine_version VARCHAR(20) NOT NULL,
  state_rules_version INTEGER NOT NULL,

  -- Validation
  validation_passed BOOLEAN DEFAULT TRUE,
  validation_errors JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW()
);
```

## Migration Guide

### From Version 1.0 to 2.0

#### Key Changes

1. **Money values are now strings**
   - Before: `vehiclePrice: 35000`
   - After: `vehiclePrice: "35000.00"`

2. **More explicit parameters**
   - Before: `amount`, `zipCode`
   - After: `dealershipId`, `vehiclePrice`, `zipCode`, `state`, `userId`

3. **Full audit trail**
   - Every calculation automatically logged
   - Complete snapshot of inputs/outputs

#### Migration Steps

**Step 1: Update imports**

```typescript
// Before
import { TaxService } from '@/modules/tax';

// After
import { EnhancedTaxService, DatabaseTaxStorage } from '@/modules/tax';
```

**Step 2: Update instantiation**

```typescript
// Before
const taxService = new TaxService(storage);

// After
const storage = new DatabaseTaxStorage(db);
const taxService = new EnhancedTaxService(storage);
```

**Step 3: Update method calls**

```typescript
// Before
const result = await taxService.calculateTax({
  amount: 35000,
  zipCode: '90210',
  vehiclePrice: 35000,
  tradeInValue: 10000,
});

// After
const result = await taxService.calculateSalesTax({
  dealershipId: dealership.id,
  vehiclePrice: '35000.00',
  zipCode: '90210',
  state: 'CA',
  tradeInValue: '10000.00',
  userId: user.id,
});
```

**Step 4: Update result handling**

```typescript
// Before
const tax = result.totalTax; // number

// After
const tax = result.totalTax; // string (decimal)

// To display
import { formatUSD } from '@/modules/tax';
const formatted = formatUSD(tax); // "$1,837.50"

// To convert to number (use sparingly)
import { toNumber } from '@/modules/tax';
const num = toNumber(tax); // 1837.50
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { DecimalCalculator } from '@/modules/tax';

describe('DecimalCalculator', () => {
  it('should add two values correctly', () => {
    const result = DecimalCalculator.add('100.50', '50.25');
    expect(result).toBe('150.75');
  });

  it('should calculate tax correctly', () => {
    const result = DecimalCalculator.calculateTax('1000.00', '0.0825');
    expect(result).toBe('82.50');
  });

  it('should handle floating point precision', () => {
    // JavaScript: 0.1 + 0.2 = 0.30000000000000004
    const result = DecimalCalculator.add('0.1', '0.2');
    expect(result).toBe('0.30'); // Correct!
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { EnhancedTaxService, DatabaseTaxStorage } from '@/modules/tax';
import { db } from '@/lib/db';

describe('EnhancedTaxService', () => {
  let taxService: EnhancedTaxService;

  beforeAll(() => {
    const storage = new DatabaseTaxStorage(db);
    taxService = new EnhancedTaxService(storage);
  });

  it('should calculate CA sales tax correctly', async () => {
    const result = await taxService.calculateSalesTax({
      dealershipId: 'test-dealership',
      vehiclePrice: '35000.00',
      zipCode: '90210',
      state: 'CA',
      tradeInValue: '10000.00',
      userId: 'test-user',
    });

    expect(result.totalTax).toBe('1812.50'); // 7.25% of $25,000
    expect(result.taxableAmount).toBe('25000.00');
  });
});
```

## Troubleshooting

### "Jurisdiction not found" error

**Problem:** `JurisdictionNotFoundError: Tax jurisdiction not found for ZIP code: 12345`

**Solution:**
1. Check if jurisdiction data exists in `tax_jurisdictions` table
2. Run jurisdiction seed script (see Seed Data section below)
3. Verify ZIP code is correct (5 digits)

### Calculation doesn't match expected value

**Problem:** Tax calculation is off by a penny or more

**Solution:**
1. Check audit log for calculation details
2. Verify jurisdiction rates are correct
3. Check state rules for special caps or adjustments
4. Ensure all money values are strings (not numbers)

### "Unsupported state" error

**Problem:** `UnsupportedStateError: Tax calculations not supported for state: XX`

**Solution:**
1. Check if state rules exist in database
2. Verify autoTaxEngine has rules for that state
3. Add state rules to database (see State Rules Service)

## Best Practices

### 1. Always Use Decimal Strings

```typescript
// GOOD
const price = "35000.00";
const tax = calculateTax(price, "0.0825");

// BAD
const price = 35000;
const tax = price * 0.0825; // Floating point errors!
```

### 2. Validate Inputs

```typescript
import { validateNonNegative, validateRate } from '@/modules/tax';

validateNonNegative(vehiclePrice, 'Vehicle price');
validateRate(taxRate, 'Tax rate');
```

### 3. Use Audit Trail

```typescript
// Every calculation is automatically audited
const result = await taxService.calculateDealTaxes(request);

// Later, retrieve audit trail
const auditLog = await taxService.auditTaxCalculation(dealId);
console.log('Calculation history:', auditLog);
```

### 4. Validate Results

```typescript
const result = await taxService.calculateSalesTax(request);
const stateRules = await storage.getStateRules(request.state);
const validation = taxService.validateTaxCalculation(result, stateRules);

if (!validation.allChecksPass) {
  console.error('Validation errors:', validation.errors);
}
```

### 5. Format for Display

```typescript
import { formatUSD, formatPercent } from '@/modules/tax';

// Display money
console.log(formatUSD('1234.56')); // "$1,234.56"

// Display rates
console.log(formatPercent('0.0825')); // "8.25%"
```

## Support

For questions or issues:

1. Check this README
2. Review audit logs for calculation details
3. Verify jurisdiction and state rule data
4. Contact development team

## Version History

### Version 2.0.0 (Current)
- Decimal.js for penny-accurate calculations
- Full audit trail
- Database-driven jurisdictions
- Centralized state rules
- Comprehensive validation
- 50-state support (autoTaxEngine integration)

### Version 1.0.0 (Legacy)
- Basic tax calculations
- In-memory jurisdiction data
- Limited state support
- No audit trail
- Deprecated (use v2.0)
