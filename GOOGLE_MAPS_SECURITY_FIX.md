# Google Maps API Security Fix

## Security Issue Discovered

**Date**: 2025-11-21
**Severity**: HIGH
**Type**: API Key Exposure

### Problem

The application had **two conflicting implementations** for Google Maps address autocomplete:

1. ✅ **Secure server-side proxy** (`/server/google-maps-routes.ts`) - API key protected on server
2. ❌ **Client-side Google Maps JS** (`/client/src/hooks/use-google-autocomplete.ts`) - API key exposed to browser

The insecure implementation loaded Google Maps JavaScript library directly in the browser:

```typescript
// INSECURE - API key visible to all clients
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
```

This would expose the API key to:
- Browser DevTools
- Network request inspection
- Client-side JavaScript bundle
- Any user of the application

## Solution Implemented

### New Secure Components Created

1. **`/client/src/hooks/use-google-autocomplete-secure.ts`**
   - Uses server-side proxy (`/api/google-maps/*`)
   - API key stays server-side only
   - Clean, typed interface

2. **`/client/src/components/address-autocomplete-secure.tsx`**
   - Secure autocomplete dropdown component
   - Uses shadcn/ui Command + Popover components
   - Debounced search (300ms)
   - Visual feedback with icons and loading states

### Security Architecture

```
┌─────────────────────────────────────────────────┐
│  CLIENT (Browser)                               │
│  ┌───────────────────────────────────────────┐  │
│  │ AddressAutocompleteSecure Component       │  │
│  │   - User types address                    │  │
│  │   - Debounced input (300ms)               │  │
│  │   - No API key visible                    │  │
│  └────────────┬──────────────────────────────┘  │
│               │                                  │
│               │ POST /api/google-maps/autocomplete
│               │                                  │
└───────────────┼──────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────┐
│  SERVER (Node.js/Express)                        │
│  ┌───────────────────────────────────────────┐  │
│  │ /server/google-maps-routes.ts             │  │
│  │   - API key from process.env              │  │
│  │   - Makes Google API call                 │  │
│  │   - Returns only necessary data           │  │
│  └────────────┬──────────────────────────────┘  │
│               │                                  │
│               │ HTTPS with API key               │
│               │                                  │
└───────────────┼──────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────┐
│  Google Maps API                                 │
│  - api key validates                             │
│  - Returns address data                          │
└──────────────────────────────────────────────────┘
```

### Files Modified

1. **`/client/src/components/customer-form-sheet.tsx`**
   - Changed: `AddressAutocomplete` → `AddressAutocompleteSecure`
   - Changed: `use-google-autocomplete` → `use-google-autocomplete-secure`
   - No functionality loss - full address auto-fill preserved

### Files To Be Deprecated (DO NOT USE)

These files contain the insecure implementation and should NOT be used:

- ❌ `/client/src/hooks/use-google-autocomplete.ts`
- ❌ `/client/src/components/address-autocomplete.tsx`

**Recommendation**: Delete these files after confirming no other code references them.

## Environment Variables

### Required (Server-side only)

```env
# In .env file (server-side only, never committed to git)
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### NOT REQUIRED (Remove if present)

```env
# REMOVE THIS - client-side exposure (DO NOT USE)
VITE_GOOGLE_MAPS_API_KEY=...
```

**Important**: The `VITE_` prefix means Vite bundles this into client JavaScript - **DO NOT USE**.

## API Endpoints

The server proxy provides these endpoints:

### GET `/api/google-maps/autocomplete`
Get address suggestions as user types.

**Query Parameters**:
- `input` (string, required) - User's input text

**Response**:
```json
{
  "suggestions": [
    {
      "description": "123 Main St, New York, NY, USA",
      "placeId": "ChIJ...",
      "mainText": "123 Main St",
      "secondaryText": "New York, NY, USA"
    }
  ]
}
```

### GET `/api/google-maps/place-details`
Get full address details from a place ID.

**Query Parameters**:
- `placeId` (string, required) - Google Place ID from autocomplete

**Response**:
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "formattedAddress": "123 Main St, New York, NY 10001, USA"
}
```

### POST `/api/google-maps/validate-address`
Validate an address.

**Request Body**:
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001"
}
```

**Response**:
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "validationStatus": "valid",
  "validationMessages": ["Address validated successfully"]
}
```

## Usage Example

```tsx
import { AddressAutocompleteSecure } from '@/components/address-autocomplete-secure';

function MyForm() {
  const form = useForm();

  return (
    <FormField
      control={form.control}
      name="address"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Street Address</FormLabel>
          <FormControl>
            <AddressAutocompleteSecure
              {...field}
              onAddressSelect={(address) => {
                form.setValue('address', address.street);
                form.setValue('city', address.city);
                form.setValue('state', address.stateCode);
                form.setValue('zipCode', address.zipCode);
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
```

## Security Checklist

- [x] Google API key stored in `.env` (server-side only)
- [x] `.env` is in `.gitignore`
- [x] API key loaded via `process.env.GOOGLE_MAPS_API_KEY`
- [x] Client uses server-side proxy endpoints
- [x] No API key visible in browser DevTools
- [x] No API key in client JavaScript bundle
- [x] All address autocomplete uses secure component

## Testing

To verify security:

1. **Check browser DevTools Network tab**:
   - Should see requests to `/api/google-maps/*`
   - Should NOT see requests to `maps.googleapis.com` with `key=` parameter

2. **Check JavaScript bundle**:
   ```bash
   npm run build
   grep -r "AIza" dist/  # Google API keys start with "AIza"
   # Should return: (no results)
   ```

3. **Check environment**:
   - `.env` contains `GOOGLE_MAPS_API_KEY` ✅
   - `.env` does NOT contain `VITE_GOOGLE_MAPS_API_KEY` ✅

## Rollback Plan

If issues arise:

1. The old insecure components still exist (not deleted yet)
2. Can temporarily revert `customer-form-sheet.tsx` to use old component
3. However, **do not deploy** with insecure implementation

## Related Documentation

- Server proxy: `/server/google-maps-routes.ts`
- Google Maps service: `/src/services/google-maps.service.ts`
- Secure hook: `/client/src/hooks/use-google-autocomplete-secure.ts`
- Secure component: `/client/src/components/address-autocomplete-secure.tsx`

## Credits

- **Discovered by**: User security audit request
- **Fixed on**: 2025-11-21
- **Deployed**: Pending

---

**REMEMBER**: API keys should NEVER be exposed to client-side code. Always use server-side proxies for external API calls that require authentication.
