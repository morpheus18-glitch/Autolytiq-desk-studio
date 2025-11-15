# Local Tax Rate Lookup System

## Overview

A comprehensive local tax rate lookup system for the AutoTaxEngine, enabling accurate automotive sales tax calculations with full support for multi-jurisdiction rate stacking (state + county + city + special districts).

## Features

- **ZIP Code Lookup**: Fast local tax rate lookup by 5-digit ZIP code
- **Rate Stacking**: Proper handling of county, city, and special district rates
- **Caching**: In-memory cache with 24-hour TTL for performance
- **Fallback Rates**: State average rates when ZIP not found
- **Sample Data**: Pre-populated data for top 10 states by vehicle sales volume
- **Production-Ready**: Error handling, logging, and scalability built-in
- **Frontend Hooks**: React Query hooks with automatic debouncing
- **API Endpoints**: RESTful API for all tax rate operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useLocalTaxLookup Hook                              │  │
│  │  - Auto-fetch on ZIP entry (debounced)               │  │
│  │  - React Query caching                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/tax/local/:zipCode                             │  │
│  │  /api/tax/jurisdictions/:zipCode                     │  │
│  │  /api/tax/local/bulk (POST)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Local Tax Service                                    │  │
│  │  - getLocalTaxRate(zip, state)                       │  │
│  │  - In-memory cache (24h TTL)                         │  │
│  │  - Fallback to state averages                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  localTaxRates                                        │  │
│  │  - jurisdiction type, name, rate                     │  │
│  │  - effective dates, FIPS codes                       │  │
│  │                                                        │  │
│  │  zipToLocalTaxRates                                   │  │
│  │  - ZIP → jurisdiction mappings                       │  │
│  │  - pre-calculated combined rates                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database Schema

**Tables:**
- `localTaxRates`: Individual tax jurisdictions (county, city, special districts)
- `zipToLocalTaxRates`: ZIP code to jurisdiction mappings with pre-calculated rates

**Key Features:**
- Composite indexes for fast lookups
- Historical rate tracking (effectiveDate, endDate)
- FIPS code support for precise county matching
- Pre-calculated combined rates for performance

### 2. Service Layer (`server/local-tax-service.ts`)

**Core Functions:**
```typescript
// Primary lookup function
getLocalTaxRate(zipCode: string, stateCode: string): Promise<LocalTaxRateInfo>

// Detailed jurisdiction info
getTaxJurisdictionInfo(zipCode: string): Promise<JurisdictionInfo>

// Structured breakdown
getJurisdictionBreakdown(zipCode: string): Promise<JurisdictionBreakdown>

// Bulk operations
bulkGetLocalTaxRates(zipCodes: string[], stateCode: string): Promise<Map<...>>

// Search functionality
searchJurisdictions(query: string, stateCode?: string): Promise<...>
```

**Caching:**
- 24-hour in-memory cache
- Automatic cache key: `local-tax:{stateCode}:{zipCode}`
- Cache statistics via `getCacheStats()`

### 3. API Endpoints (`server/local-tax-routes.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tax/local/:zipCode` | Get local rate for ZIP code |
| GET | `/api/tax/jurisdictions/:zipCode` | Get full jurisdiction info |
| GET | `/api/tax/breakdown/:zipCode` | Get rate breakdown |
| POST | `/api/tax/local/bulk` | Bulk lookup multiple ZIPs |
| GET | `/api/tax/local/search` | Search by city/county name |
| GET | `/api/tax/local/stats` | Get cache statistics |
| POST | `/api/tax/local/cache/clear` | Clear cache (admin) |

### 4. Frontend Hooks (`client/src/hooks/use-local-tax-lookup.ts`)

```typescript
// Auto-lookup (debounced)
const { data, isLoading, error } = useLocalTaxLookup(zipCode, stateCode);

// With debouncing (auto-lookup as user types)
const { data, isLoading } = useDebouncedLocalTaxLookup(zipCode, stateCode);

// Jurisdiction breakdown
const { data } = useJurisdictionBreakdown(zipCode);

// Bulk lookup
const { mutate } = useBulkLocalTaxLookup();

// Search
const { data } = useJurisdictionSearch(query, stateCode);

// All-in-one with calculation
const { totalTax, stateTax, localTax } = useLocalTaxCalculation(
  zipCode,
  stateCode,
  taxableBase
);
```

### 5. AutoTaxEngine Integration

**Helper Functions:**
```typescript
import {
  buildRateComponentsFromLocalInfo,
  buildRateComponentsFromBreakdown
} from '../shared/autoTaxEngine';

// Convert local tax info to rate components
const localInfo = await getLocalTaxRate(zipCode, stateCode);
const rates = buildRateComponentsFromLocalInfo(localInfo);

// Use in tax calculation
const taxInput = { ...dealData, rates };
const result = calculateTax(taxInput, rules);
```

**Automatic Integration in Tax Quote API:**
The `/api/tax/quote` endpoint automatically fetches local rates when:
- State uses `STATE_PLUS_LOCAL` tax scheme
- ZIP code is provided in request
- No manual rates are specified

```typescript
// Request
POST /api/tax/quote
{
  "dealType": "RETAIL",
  "vehiclePrice": 35000,
  "deal": {
    "zipCode": "90210",
    "registrationState": "CA"
  }
}

// Response includes local tax info
{
  "success": true,
  "result": { ... },
  "localTaxInfo": {
    "zipCode": "90210",
    "stateCode": "CA",
    "countyName": "Los Angeles County",
    "cityName": "Beverly Hills",
    "stateTaxRate": 0.0725,
    "countyRate": 0.0025,
    "cityRate": 0.0000,
    "combinedLocalRate": 0.0025,
    "totalRate": 0.0950
  }
}
```

## Sample Data Coverage

### Top 10 States (by vehicle sales volume)

1. **California** - 7.25% state + local (varies)
   - Los Angeles County (90001-90068)
   - San Francisco County (94102-94118)
   - San Diego County (92101-92117)
   - Orange County (92801-92663)
   - Sacramento County (95814-95826)

2. **Texas** - 6.25% state + local (varies)
   - Harris County/Houston (77002-77098)
   - Dallas County/Dallas (75201-75231)
   - Travis County/Austin (78701-78759)
   - Bexar County/San Antonio (78201-78259)
   - Tarrant County/Fort Worth (76102-76180)

3. **Florida** - 6.00% state + local (varies)
   - Miami-Dade County (33101-33196)
   - Broward County/Fort Lauderdale (33301-33334)
   - Hillsborough County/Tampa (33602-33637)
   - Orange County/Orlando (32801-32839)
   - Palm Beach County (33401-33418)

4. **New York** - 4.00% state + local (varies)
   - New York County/Manhattan (10001-10040)
   - Kings County/Brooklyn (11201-11239)
   - Queens County (11101-11436)
   - Erie County/Buffalo (14201-14228)
   - Monroe County/Rochester (14602-14626)

5. **Pennsylvania** - 6.00% state + local (varies)
   - Philadelphia County (19102-19154)
   - Allegheny County/Pittsburgh (15201-15244)
   - Montgomery County (19401-19405)

6. **Illinois** - 6.25% state + local (varies)
   - Cook County/Chicago (60601-60827)
   - DuPage County/Naperville (60540-60565)

7. **Ohio** - 5.75% state + local (varies)
   - Cuyahoga County/Cleveland (44101-44147)
   - Franklin County/Columbus (43004-43235)
   - Hamilton County/Cincinnati (45201-45255)

8. **Georgia** - 4.00% state + local (varies)
   - Fulton County/Atlanta (30303-30363)
   - Gwinnett County (30043-30046)
   - DeKalb County (30030-30035)

9. **North Carolina** - 3.00% state + local (varies)
   - Mecklenburg County/Charlotte (28202-28277)
   - Wake County/Raleigh (27601-27617)
   - Guilford County/Greensboro (27401-27455)

10. **Michigan** - 6.00% state (STATE_ONLY, no local)
    - Wayne County/Detroit (48201-48244)
    - Oakland County/Troy (48083-48098)
    - Kent County/Grand Rapids (49503-49546)

## Setup & Installation

### 1. Database Migration

Run Drizzle migration to create the tables:

```bash
npm run db:push
```

### 2. Seed Sample Data

Populate the database with sample local tax rates:

```bash
tsx server/seed-local-tax-rates.ts
```

**Options:**
- `--clear`: Clear existing data
- `--reseed`: Clear and re-seed

```bash
# Re-seed from scratch
tsx server/seed-local-tax-rates.ts --reseed
```

### 3. Verify Installation

Test the API endpoints:

```bash
# Get local rate for Beverly Hills, CA
curl http://localhost:5000/api/tax/local/90210?stateCode=CA

# Get jurisdiction breakdown
curl http://localhost:5000/api/tax/breakdown/90210

# Search jurisdictions
curl http://localhost:5000/api/tax/local/search?q=Los%20Angeles&stateCode=CA
```

## Usage Examples

### Example 1: Basic Frontend Usage

```typescript
import { useLocalTaxLookup, formatTaxRate } from '@/hooks/use-local-tax-lookup';

function TaxCalculator({ zipCode, stateCode, vehiclePrice }) {
  const { data: localRate, isLoading } = useLocalTaxLookup(zipCode, stateCode);

  if (isLoading) return <div>Loading tax rates...</div>;
  if (!localRate) return <div>Enter ZIP code</div>;

  const salesTax = vehiclePrice * localRate.totalRate;

  return (
    <div>
      <h3>Tax Breakdown for {zipCode}</h3>
      <p>State Rate: {formatTaxRate(localRate.stateTaxRate)}</p>
      <p>Local Rate: {formatTaxRate(localRate.combinedLocalRate)}</p>
      <p>Total Rate: {formatTaxRate(localRate.totalRate)}</p>
      <p>Sales Tax: ${salesTax.toFixed(2)}</p>
    </div>
  );
}
```

### Example 2: Auto-Lookup as User Types

```typescript
import { useDebouncedLocalTaxLookup } from '@/hooks/use-local-tax-lookup';

function ZipCodeInput() {
  const [zip, setZip] = useState('');
  const { data, isLoading } = useDebouncedLocalTaxLookup(zip, 'CA', 500);

  return (
    <div>
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="ZIP Code"
        maxLength={5}
      />
      {isLoading && <span>Looking up rates...</span>}
      {data && (
        <div>
          <p>{data.countyName}</p>
          <p>{data.cityName}</p>
          <p>Total Rate: {(data.totalRate * 100).toFixed(3)}%</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Server-Side Integration

```typescript
import { getLocalTaxRate } from './server/local-tax-service';
import { buildRateComponentsFromLocalInfo } from '../shared/autoTaxEngine';
import { calculateTax, getRulesForState } from '../shared/autoTaxEngine';

async function calculateDealTax(dealData, zipCode, stateCode) {
  // Fetch local rates
  const localInfo = await getLocalTaxRate(zipCode, stateCode);

  // Convert to rate components
  const rates = buildRateComponentsFromLocalInfo(localInfo);

  // Get state rules
  const rules = getRulesForState(stateCode);

  // Calculate tax
  const result = calculateTax(
    {
      ...dealData,
      rates,
      stateCode,
    },
    rules
  );

  return {
    result,
    localInfo, // Include for display
  };
}
```

### Example 4: Bulk Lookup for Fleet

```typescript
import { useBulkLocalTaxLookup } from '@/hooks/use-local-tax-lookup';

function FleetTaxCalculator({ vehicles }) {
  const { mutate, data } = useBulkLocalTaxLookup();

  const calculateFleetTax = () => {
    const zipCodes = vehicles.map(v => v.zipCode);
    mutate({ zipCodes, stateCode: 'CA' });
  };

  return (
    <div>
      <button onClick={calculateFleetTax}>
        Calculate Tax for All Vehicles
      </button>
      {data && Object.entries(data).map(([zip, info]) => (
        <div key={zip}>
          {zip}: {(info.totalRate * 100).toFixed(3)}%
        </div>
      ))}
    </div>
  );
}
```

## State Average Fallback Rates

When a ZIP code is not found in the database, the system falls back to state average local rates:

| State | State Rate | Avg Local | Total Avg |
|-------|-----------|-----------|-----------|
| CA | 7.25% | 1.25% | 8.50% |
| TX | 6.25% | 1.95% | 8.20% |
| FL | 6.00% | 1.00% | 7.00% |
| NY | 4.00% | 4.50% | 8.50% |
| PA | 6.00% | 1.00% | 7.00% |
| IL | 6.25% | 2.50% | 8.75% |
| OH | 5.75% | 2.25% | 8.00% |
| GA | 4.00% | 3.00% | 7.00% |
| NC | 3.00% | 2.25% | 5.25% |
| MI | 6.00% | 0.00% | 6.00% |

## Maintenance & Updates

### Adding New ZIP Codes

```typescript
import { db } from './server/db';
import { localTaxRates, zipToLocalTaxRates } from '../shared/schema';

// 1. Create jurisdiction rates
const countyRate = await db.insert(localTaxRates).values({
  stateCode: 'CA',
  countyName: 'New County',
  jurisdictionType: 'COUNTY',
  taxRate: '0.0100',
  // ...
}).returning();

// 2. Create ZIP mapping
await db.insert(zipToLocalTaxRates).values({
  zipCode: '90000',
  stateCode: 'CA',
  countyName: 'New County',
  taxRateIds: [countyRate[0].id],
  combinedLocalRate: '0.0100',
});
```

### Updating Rates (Historical Tracking)

```typescript
// Set end date on old rate
await db.update(localTaxRates)
  .set({ endDate: new Date() })
  .where(eq(localTaxRates.id, oldRateId));

// Insert new rate
await db.insert(localTaxRates).values({
  // Same jurisdiction, new rate
  taxRate: '0.0125', // Updated rate
  effectiveDate: new Date(),
  // ...
});
```

## Performance Considerations

1. **Caching**: 24-hour in-memory cache reduces database queries
2. **Indexes**: Composite indexes on state + county + city for fast lookups
3. **Pre-calculation**: Combined local rates stored in ZIP mapping table
4. **Batch Operations**: Bulk lookup API supports up to 100 ZIPs per request
5. **React Query**: Frontend caching prevents redundant API calls

## Error Handling

The system includes comprehensive error handling:

1. **Missing ZIP**: Falls back to state average
2. **Invalid Format**: Returns 400 Bad Request
3. **Database Error**: Logs error, returns fallback rate
4. **Network Error**: React Query retry logic (2 attempts)

## Testing

```bash
# Run unit tests
npm test

# Test specific service
npm test local-tax-service

# Test API endpoints
npm test local-tax-routes
```

## Future Enhancements

- [ ] Monthly rate update automation from official sources
- [ ] Support for tax holidays and temporary rate changes
- [ ] Vehicle-specific rates (different rates for RVs, boats, etc.)
- [ ] Integration with third-party tax rate APIs (Avalara, TaxJar)
- [ ] Admin UI for rate management
- [ ] Rate change notifications and alerts
- [ ] Historical rate lookup for backdated transactions
- [ ] API versioning for rate data

## References

- [California CDTFA](https://www.cdtfa.ca.gov/)
- [Texas Comptroller](https://comptroller.texas.gov/)
- [Sales Tax Institute](https://www.salestaxinstitute.com/)
- [Federation of Tax Administrators](https://www.taxadmin.org/)

## Support

For questions or issues:
- File an issue on GitHub
- Contact the development team
- Refer to AutoTaxEngine documentation

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
**Maintainer**: AutoTaxEngine Team
