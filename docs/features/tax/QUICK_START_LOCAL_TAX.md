# Quick Start Guide - Local Tax Rate System

## 5-Minute Setup

### 1. Database Setup (1 minute)

```bash
# Push schema changes to database
npm run db:push
```

### 2. Seed Sample Data (2 minutes)

```bash
# Load sample local tax rates for top 10 states
tsx server/seed-local-tax-rates.ts
```

Expected output:
```
🌱 Starting local tax rates seed...
📊 Loaded data version: 1.0.0
📅 Last updated: 2025-01-15
🗺️  Processing 10 states...

🏛️  Processing California (CA)...
  📍 Los Angeles County (FIPS: 06037)
    🏙️  Los Angeles (13 ZIPs)
    🏙️  Beverly Hills (3 ZIPs)
    ...

✅ Seed complete!
📊 Total jurisdictions created: 150
📮 Total ZIP code mappings created: 1000+
```

### 3. Test API (1 minute)

```bash
# Test a Beverly Hills, CA lookup
curl http://localhost:5000/api/tax/local/90210?stateCode=CA
```

Expected response:
```json
{
  "success": true,
  "data": {
    "zipCode": "90210",
    "stateCode": "CA",
    "countyName": "Los Angeles County",
    "cityName": "Beverly Hills",
    "stateTaxRate": 0.0725,
    "countyRate": 0.0025,
    "cityRate": 0.0000,
    "specialDistrictRate": 0.0000,
    "combinedLocalRate": 0.0025,
    "totalRate": 0.0950,
    "breakdown": [
      {
        "jurisdictionType": "STATE",
        "name": "CA",
        "rate": 0.0725
      },
      {
        "jurisdictionType": "COUNTY",
        "name": "Los Angeles County",
        "rate": 0.0025
      }
    ],
    "source": "database"
  }
}
```

### 4. Test Frontend Hook (1 minute)

```tsx
// In any React component
import { useLocalTaxLookup } from '@/hooks/use-local-tax-lookup';

function MyComponent() {
  const { data, isLoading } = useLocalTaxLookup("90210", "CA");

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h3>Tax Rate for {data.zipCode}</h3>
      <p>Total Rate: {(data.totalRate * 100).toFixed(3)}%</p>
      <p>State: {(data.stateTaxRate * 100).toFixed(3)}%</p>
      <p>Local: {(data.combinedLocalRate * 100).toFixed(3)}%</p>
    </div>
  );
}
```

## Common Use Cases

### Use Case 1: ZIP Code Auto-Lookup

```tsx
import { useDebouncedLocalTaxLookup } from '@/hooks/use-local-tax-lookup';

function ZipInput() {
  const [zip, setZip] = useState('');
  const { data, isLoading } = useDebouncedLocalTaxLookup(zip, 'CA');

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
          Total Rate: {(data.totalRate * 100).toFixed(3)}%
        </div>
      )}
    </div>
  );
}
```

### Use Case 2: Calculate Tax on Vehicle

```tsx
import { useLocalTaxCalculation } from '@/hooks/use-local-tax-lookup';

function VehicleTaxCalculator({ price, zipCode, stateCode }) {
  const { totalTax, stateTax, localTax, isLoading } =
    useLocalTaxCalculation(zipCode, stateCode, price);

  if (isLoading) return <div>Calculating...</div>;

  return (
    <div>
      <h3>Tax Breakdown</h3>
      <p>Vehicle Price: ${price.toFixed(2)}</p>
      <p>State Tax: ${stateTax.toFixed(2)}</p>
      <p>Local Tax: ${localTax.toFixed(2)}</p>
      <p><strong>Total Tax: ${totalTax.toFixed(2)}</strong></p>
    </div>
  );
}
```

### Use Case 3: Server-Side Tax Calculation

```typescript
import { getLocalTaxRate } from './server/local-tax-service';
import {
  calculateTax,
  getRulesForState,
  buildRateComponentsFromLocalInfo
} from '../shared/autoTaxEngine';

async function calculateDealTax(dealData: any, zipCode: string, stateCode: string) {
  // 1. Fetch local rates
  const localInfo = await getLocalTaxRate(zipCode, stateCode);

  // 2. Convert to rate components
  const rates = buildRateComponentsFromLocalInfo(localInfo);

  // 3. Get state rules
  const rules = getRulesForState(stateCode);

  // 4. Calculate tax
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
    localInfo, // For display
  };
}
```

### Use Case 4: Automatic Tax Quote with Local Rates

```typescript
// The /api/tax/quote endpoint automatically handles this!

// POST to /api/tax/quote
{
  "dealType": "RETAIL",
  "vehiclePrice": 35000,
  "tradeInValue": 10000,
  "deal": {
    "zipCode": "90210",
    "registrationState": "CA"
  }
}

// Response includes both calculation AND local tax info
{
  "success": true,
  "result": { /* tax calculation */ },
  "localTaxInfo": { /* local rate details */ }
}
```

## Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tax/local/:zipCode` | GET | Get local rate |
| `/api/tax/jurisdictions/:zipCode` | GET | Get jurisdiction details |
| `/api/tax/breakdown/:zipCode` | GET | Get rate breakdown |
| `/api/tax/local/bulk` | POST | Bulk lookup |
| `/api/tax/local/search` | GET | Search jurisdictions |
| `/api/tax/local/stats` | GET | Cache statistics |

## Sample ZIPs to Test

| State | ZIP | City | Total Rate |
|-------|-----|------|------------|
| CA | 90210 | Beverly Hills | 9.50% |
| CA | 94102 | San Francisco | 8.50% |
| TX | 77002 | Houston | 9.25% |
| TX | 75201 | Dallas | 9.25% |
| FL | 33101 | Miami | 7.00% |
| NY | 10001 | Manhattan | 8.875% |
| PA | 19102 | Philadelphia | 8.00% |
| IL | 60601 | Chicago | 10.25% |
| OH | 44101 | Cleveland | 8.00% |
| GA | 30303 | Atlanta | 8.90% |

## Troubleshooting

### ZIP Code Not Found

If you get a fallback rate (source: "fallback"), the ZIP is not in the database yet.

**Solution**: Add the ZIP to sample-local-rates.json and re-seed:

```bash
tsx server/seed-local-tax-rates.ts --reseed
```

### Cache Issues

Clear the cache if you update rates:

```bash
curl -X POST http://localhost:5000/api/tax/local/cache/clear
```

### Database Connection

Ensure `DATABASE_URL` environment variable is set:

```bash
echo $DATABASE_URL
```

## Next Steps

1. ✅ Complete 5-minute setup
2. 📖 Read [LOCAL_TAX_SYSTEM_README.md](./LOCAL_TAX_SYSTEM_README.md) for full documentation
3. 🔍 Review [LOCAL_TAX_IMPLEMENTATION_SUMMARY.md](./LOCAL_TAX_IMPLEMENTATION_SUMMARY.md) for technical details
4. 🧪 Add tests for your specific use cases
5. 📊 Expand sample data to additional states as needed

## Files Reference

- **Service**: `server/local-tax-service.ts`
- **Routes**: `server/local-tax-routes.ts`
- **Hooks**: `client/src/hooks/use-local-tax-lookup.ts`
- **Data**: `shared/autoTaxEngine/data/sample-local-rates.json`
- **Seed**: `server/seed-local-tax-rates.ts`
- **Schema**: `shared/schema.ts` (search for "LOCAL TAX RATES")

## Support

For questions:
1. Check the README files
2. Review the implementation summary
3. Look at the inline code comments
4. File an issue if needed

---

**Ready in 5 minutes!** 🚀
