# TAX MODULE API REFERENCE

**Version:** 2.0.0
**Last Updated:** November 21, 2025

---

## QUICK START

### Import the Module

```typescript
// Single import for all tax functionality
import { taxRoutes, EnhancedTaxService, DatabaseTaxStorage } from '@/modules/tax';

// Use in Express app
app.use('/api/tax', taxRoutes);
```

### Basic Tax Calculation

```typescript
// Calculate tax for a deal
const response = await fetch('/api/tax/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealType: 'RETAIL',
    asOfDate: '2025-11-21',
    vehiclePrice: 35000,
    dealerStateCode: 'CA',
    deal: {
      zipCode: '90210',
      registrationState: 'CA',
    },
  }),
});

const { success, result, context } = await response.json();
```

---

## API ENDPOINTS

### 1. TAX CALCULATION

#### POST /api/tax/quote
Calculate tax for a retail or lease deal using AutoTaxEngine.

**Request:**
```typescript
{
  // Required
  dealType: 'RETAIL' | 'LEASE',
  asOfDate: string,              // ISO date: '2025-11-21'
  vehiclePrice: number,          // 35000

  // Rooftop context (optional)
  dealerStateCode?: string,      // 'CA'
  rooftop?: RooftopConfig,       // Advanced: full rooftop config

  // Deal info (required)
  deal: {
    zipCode?: string,            // '90210'
    registrationState?: string,  // 'CA'
    buyerResidenceState?: string,
    vehicleLocationState?: string,
    deliveryState?: string,
  },

  // Financial info (optional)
  tradeInValue?: number,
  rebateManufacturer?: number,
  rebateDealer?: number,
  docFee?: number,
  otherFees?: { code: string; amount: number }[],
  serviceContracts?: number,
  gap?: number,
  negativeEquity?: number,

  // Lease-specific (required if dealType === 'LEASE')
  grossCapCost?: number,
  basePayment?: number,
  paymentCount?: number,
}
```

**Response:**
```typescript
{
  success: boolean,
  context: {
    primaryStateCode: string,
    buyerResidenceStateCode?: string,
    registrationStateCode?: string,
    logic: string,
  },
  result: {
    totalTax: number,
    taxableAmount: number,
    effectiveRate: number,
    lineItems: Array<{
      label: string,
      amount: number,
      taxable: boolean,
      tax: number,
    }>,
    breakdown: Array<{
      jurisdictionType: string,
      name: string,
      rate: number,
      taxAmount: number,
    }>,
  },
  localTaxInfo?: {
    zipCode: string,
    totalRate: number,
    breakdown: any[],
  },
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/tax/quote \
  -H "Content-Type: application/json" \
  -d '{
    "dealType": "RETAIL",
    "asOfDate": "2025-11-21",
    "vehiclePrice": 35000,
    "dealerStateCode": "CA",
    "deal": { "zipCode": "90210" }
  }'
```

---

#### POST /api/tax/calculate
Enhanced tax calculation with penny-accurate decimal math and full audit trail.

**Request:**
```typescript
{
  dealershipId: string,
  vehiclePrice: string,        // '35000.00' (decimal string)
  zipCode: string,             // '90210'
  state: string,               // 'CA'
  dealType: 'RETAIL' | 'LEASE',

  // Optional
  tradeInValue?: string,       // '10000.00'
  userId?: string,             // For audit trail
  fees?: Array<{
    code: string,
    amount: string,
    taxable: boolean,
  }>,
}
```

**Response:**
```typescript
{
  success: boolean,
  data: {
    taxableAmount: string,     // '25000.00'
    totalTax: string,          // '2000.00'
    totalRate: string,         // '0.08'
    breakdown: Array<{
      type: 'state' | 'county' | 'city' | 'district',
      name: string,
      rate: string,
      amount: string,
    }>,
    auditTrail: {
      calculatedAt: string,
      userId?: string,
      inputs: object,
    },
  },
}
```

---

### 2. LOCAL TAX RATES

#### GET /api/tax/local/:zipCode
Get local tax rate breakdown for a ZIP code.

**Query Parameters:**
- `stateCode` (optional) - State code for validation (e.g., 'CA')

**Response:**
```typescript
{
  success: boolean,
  data: {
    zipCode: string,           // '90210'
    stateCode: string,         // 'CA'
    countyName: string,        // 'Los Angeles'
    cityName: string | null,   // 'Beverly Hills'

    // Rates (decimal, not percentage)
    stateTaxRate: number,      // 0.0725
    countyRate: number,        // 0.01
    cityRate: number,          // 0.0075
    specialDistrictRate: number, // 0.005
    combinedLocalRate: number, // 0.0225 (county + city + district)
    totalRate: number,         // 0.095 (state + local)

    breakdown: Array<{
      jurisdictionType: 'STATE' | 'COUNTY' | 'CITY' | 'SPECIAL_DISTRICT',
      name: string,
      rate: number,
    }>,

    source: 'database' | 'fallback',
  },
}
```

**Example:**
```bash
curl http://localhost:5000/api/tax/local/90210?stateCode=CA
```

---

#### GET /api/tax/breakdown/:zipCode
Get detailed rate breakdown by jurisdiction type.

**Response:**
```typescript
{
  success: boolean,
  data: {
    county: {
      name: string,
      rate: number,
    } | null,
    city: {
      name: string,
      rate: number,
    } | null,
    specialDistricts: Array<{
      name: string,
      rate: number,
    }>,
    combinedLocalRate: number,
  },
}
```

---

### 3. JURISDICTIONS

#### GET /api/tax/jurisdictions/:zipCode
Get full jurisdiction information including effective dates.

**Response:**
```typescript
{
  success: boolean,
  data: {
    zipCode: string,
    stateCode: string,
    countyFips: string | null,
    countyName: string,
    cityName: string | null,
    applicableJurisdictions: Array<{
      id: string,
      type: 'STATE' | 'COUNTY' | 'CITY' | 'SPECIAL_DISTRICT',
      name: string,
      rate: number,
      effectiveDate: Date,
      endDate: Date | null,
    }>,
  },
}
```

---

### 4. STATE RULES

#### GET /api/tax/states
List all supported states with implementation status.

**Response:**
```typescript
{
  totalStates: number,
  implemented: {
    count: number,
    states: string[],  // ['CA', 'TX', 'FL', ...]
  },
  stubs: {
    count: number,
    states: string[],  // States with placeholder rules
  },
  allStates: string[],
}
```

---

#### GET /api/tax/states/:code
Get state-specific tax rules.

**Response:**
```typescript
{
  stateCode: string,                     // 'CA'
  version: string,                       // '1.0.0'
  vehicleTaxScheme: 'STATE_PLUS_LOCAL' | 'STATE_ONLY' | 'SPECIAL_TAVT' | ...,
  tradeInPolicy: {
    type: 'FULL' | 'CAPPED' | 'NONE',
    cap?: number,
  },
  docFeeTaxable: boolean,
  leaseRules: {
    method: 'MONTHLY' | 'FULL_UPFRONT' | 'HYBRID',
    specialScheme?: string,
  },
  reciprocity: {
    enabled: boolean,
    scope: 'FULL' | 'PARTIAL' | 'NONE',
    homeStateBehavior: string,
  },
  extras: object,
}
```

**Alias:** `GET /api/tax/rules/:state`

---

### 5. CUSTOMER TAX

#### POST /api/tax/customers/quote
Calculate tax profile based on customer address.

**Request:**
```typescript
{
  customerId: string,
  dealType: 'RETAIL' | 'LEASE',
  vehiclePrice: number,

  // Optional deal details
  tradeAllowance?: number,
  tradePayoff?: number,
  downPayment?: number,
  term?: number,
  dealerFees?: number,
  aftermarketProducts?: Array<{
    type: string,
    price: number,
    taxable?: boolean,
  }>,

  // Lease-specific
  msrp?: number,
  residualPercent?: number,
  moneyFactor?: number,
}
```

**Response:**
```typescript
{
  success: boolean,
  taxProfile: {
    customerId: string,
    addressSnapshot: {
      city: string,
      state: string,
      stateCode: string,
      postalCode: string,
      county?: string,
    },
    calculatedAt: string,
    jurisdiction: {
      stateCode: string,
      countyName?: string,
      cityName?: string,
    },
    rates: {
      stateRate: number,
      countyRate: number,
      cityRate: number,
      specialRate: number,
      combinedRate: number,
    },
    method: 'TAX_ON_PRICE' | 'TAX_ON_PAYMENT' | ...,
    rules: {
      tradeInReducesTaxBase: boolean,
      docFeeTaxable: boolean,
      gapTaxable: boolean,
      vscTaxable: boolean,
      docFeeCap?: number,
    },
    precomputed?: {
      totalTaxableAmount?: number,
      estimatedTax?: number,
      monthlyTaxRate?: number,
    },
  },
}
```

---

#### GET /api/tax/customers/:customerId/preview
Quick tax rate preview (uses $30k default vehicle price).

**Response:**
```typescript
{
  success: boolean,
  jurisdiction: { ... },
  rates: { ... },
  method: string,
  rules: { ... },
}
```

---

#### GET /api/tax/customers/:customerId/validate-address
Check if customer has valid address for tax calculation.

**Response:**
```typescript
{
  valid: boolean,
  complete: boolean,
  missing: {
    state: boolean,
    zipCode: boolean,
    city: boolean,
    county: boolean,
  },
  address: {
    city?: string,
    state?: string,
    zipCode?: string,
    county?: string,
  } | null,
}
```

---

### 6. DEAL TAX

#### POST /api/tax/deals/:dealId/recalculate
Recalculate and save taxes for an existing deal.

**Response:**
```typescript
{
  success: boolean,
  taxProfile: TaxProfile,
  scenarioId: string,
  message: string,
}
```

---

### 7. UTILITY

#### GET /api/tax/health
Health check endpoint.

**Response:**
```typescript
{
  status: 'healthy',
  service: 'Tax Calculation Module',
  version: '2.0.0',
  timestamp: string,
}
```

---

#### GET /api/tax/examples
API documentation with examples.

**Response:**
```typescript
{
  success: boolean,
  examples: {
    [description: string]: {
      method: string,
      url: string,
      body?: object,
      description?: string,
    },
  },
}
```

---

## ERROR RESPONSES

### Standard Error Format

```typescript
{
  success: false,
  error: string,           // Human-readable error message
  details?: any,           // Additional error details (validation errors, etc.)
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Tax calculated successfully |
| 400 | Bad Request | Invalid ZIP code format |
| 404 | Not Found | Customer not found, ZIP not in database |
| 500 | Server Error | Database connection failed |

### Common Errors

**Invalid ZIP code:**
```json
{
  "success": false,
  "error": "Invalid ZIP code format. Expected 5-digit ZIP (e.g., 90210)"
}
```

**Customer not found:**
```json
{
  "success": false,
  "error": "Customer not found"
}
```

**Missing required field:**
```json
{
  "success": false,
  "error": "Missing required fields: dealType, asOfDate, vehiclePrice"
}
```

**Validation error (Zod):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": ["vehiclePrice"],
      "message": "Expected string, received number"
    }
  ]
}
```

---

## USAGE EXAMPLES

### Example 1: Simple Retail Tax Calculation

```typescript
const response = await fetch('/api/tax/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealType: 'RETAIL',
    asOfDate: new Date().toISOString().split('T')[0],
    vehiclePrice: 35000,
    dealerStateCode: 'CA',
    deal: {
      zipCode: '90210',
      registrationState: 'CA',
    },
    tradeInValue: 10000,
    docFee: 85,
  }),
});

const { success, result } = await response.json();

if (success) {
  console.log(`Total Tax: $${result.totalTax.toFixed(2)}`);
  console.log(`Taxable Amount: $${result.taxableAmount.toFixed(2)}`);
  console.log(`Effective Rate: ${(result.effectiveRate * 100).toFixed(2)}%`);
}
```

### Example 2: Customer-Based Tax Profile

```typescript
const response = await fetch('/api/tax/customers/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-uuid-123',
    dealType: 'RETAIL',
    vehiclePrice: 35000,
    tradeAllowance: 10000,
    dealerFees: 500,
  }),
});

const { success, taxProfile } = await response.json();

if (success) {
  console.log(`Jurisdiction: ${taxProfile.jurisdiction.cityName}, ${taxProfile.jurisdiction.stateCode}`);
  console.log(`Combined Rate: ${(taxProfile.rates.combinedRate * 100).toFixed(2)}%`);
  console.log(`Estimated Tax: $${taxProfile.precomputed?.estimatedTax?.toFixed(2)}`);
}
```

### Example 3: ZIP Code Lookup

```typescript
const zipCode = '90210';
const response = await fetch(`/api/tax/local/${zipCode}?stateCode=CA`);
const { success, data } = await response.json();

if (success) {
  console.log(`${data.cityName}, ${data.countyName}, ${data.stateCode}`);
  console.log(`Total Rate: ${(data.totalRate * 100).toFixed(2)}%`);

  data.breakdown.forEach(item => {
    console.log(`  ${item.name}: ${(item.rate * 100).toFixed(2)}%`);
  });
}
```

### Example 4: Lease Tax Calculation

```typescript
const response = await fetch('/api/tax/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealType: 'LEASE',
    asOfDate: '2025-11-21',
    vehiclePrice: 45000,
    dealerStateCode: 'CA',
    deal: {
      zipCode: '90210',
      registrationState: 'CA',
    },
    grossCapCost: 45000,
    capReductionCash: 3000,
    capReductionTradeIn: 5000,
    basePayment: 450,
    paymentCount: 36,
  }),
});

const { success, result, context } = await response.json();

if (success) {
  console.log(`Tax Method: ${context.logic}`);
  console.log(`Total Tax: $${result.totalTax.toFixed(2)}`);
}
```

---

## INTEGRATION WITH DEAL MODULE

The tax module integrates seamlessly with the deal module:

```typescript
import { taxRoutes } from '@/modules/tax';
import { dealRoutes } from '@/modules/deal';

// Tax calculation service is already used by deal module
// No additional configuration needed

// In deal creation:
// 1. Get customer
// 2. Call /api/tax/customers/quote to get tax profile
// 3. Attach tax profile to deal
// 4. Calculate payments using tax profile
```

---

## TYPESCRIPT TYPES

All types are exported from the module:

```typescript
import {
  // Enhanced types
  SalesTaxRequest,
  SalesTaxResult,
  DealTaxRequest,
  CompleteTaxBreakdown,
  TaxProfile,
  TaxMethod,

  // Legacy types (backward compatibility)
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxJurisdiction,
  TaxBreakdown,

  // Services
  EnhancedTaxService,
  TaxService,
  JurisdictionService,
  StateRulesService,

  // Storage
  DatabaseTaxStorage,

  // Utilities
  DecimalCalculator,
} from '@/modules/tax';
```

---

## PERFORMANCE NOTES

### Caching
- Local tax rates cached for 24 hours in memory
- Jurisdiction lookups cached per request
- State rules loaded once at startup

### Response Times
- Simple tax calculation: < 50ms
- ZIP code lookup (cached): < 10ms
- ZIP code lookup (database): < 100ms
- Customer tax profile: < 150ms
- Deal recalculation: < 200ms

### Rate Limiting
- Not currently implemented at module level
- Should be added at application level

---

## SECURITY CONSIDERATIONS

### Authentication
All endpoints assume authentication is handled by parent application.

### Input Validation
- All ZIP codes validated with regex
- All monetary values validated as positive numbers
- All state codes validated against known states

### SQL Injection
- All database queries use parameterized statements via Drizzle ORM

### Data Privacy
- Customer addresses stored in encrypted form (application level)
- Tax calculations logged for audit purposes
- No PII in error messages

---

## MIGRATION GUIDE

### From Old Routes

**Before:**
```typescript
import taxRoutes from './tax-routes';
import localTaxRoutes from './local-tax-routes';
import taxEngineRoutes from './tax-engine-routes';

app.use('/api/tax', taxRoutes);
app.use('/api/tax', localTaxRoutes);
app.use('/api/tax', taxEngineRoutes);
```

**After:**
```typescript
import { taxRoutes } from '@/modules/tax';

app.use('/api/tax', taxRoutes);
```

### From Old Services

**Before:**
```typescript
import { getLocalTaxRate } from './local-tax-service';
import { calculateTaxProfile } from './services/tax-engine-service';

const rate = await getLocalTaxRate('90210', 'CA');
const profile = await calculateTaxProfile({ ... });
```

**After:**
```typescript
import { JurisdictionService, EnhancedTaxService } from '@/modules/tax';

const jurisdictionService = new JurisdictionService(db);
const taxService = new EnhancedTaxService(storage);

const jurisdiction = await jurisdictionService.getJurisdictionByZip('90210');
const result = await taxService.calculateSalesTax({ ... });
```

---

## SUPPORT

For questions or issues:
1. Check this API reference
2. Review `/TAX_MODULE_MIGRATION_REPORT.md`
3. Check module README at `/src/modules/tax/README.md`
4. Contact: Project Orchestrator Agent

---

**Last Updated:** November 21, 2025
**Version:** 2.0.0
**Status:** Production Ready ✅
