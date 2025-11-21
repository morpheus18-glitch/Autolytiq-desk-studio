# Deal Creation - Quick Reference Card

## Import

```typescript
import { createDeal } from '@/server/database/atomic-operations';
```

## Basic Usage

### With Existing Customer
```typescript
const result = await createDeal({
  dealershipId: 'dealer-uuid',
  salespersonId: 'sales-uuid',
  customerId: 'customer-uuid',
  vehicleId: 'vehicle-uuid',
});
```

### With New Customer
```typescript
const result = await createDeal({
  dealershipId: 'dealer-uuid',
  salespersonId: 'sales-uuid',
  customerData: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',      // Optional
    phone: '(555) 123-4567',         // Optional
  },
  vehicleId: 'vehicle-uuid',
});
```

### Blank Desking (No Vehicle)
```typescript
const result = await createDeal({
  dealershipId: 'dealer-uuid',
  salespersonId: 'sales-uuid',
  customerId: 'customer-uuid',
  // No vehicleId
});
```

## Response Structure

```typescript
{
  deal: Deal,           // Created deal with dealNumber
  scenario: Scenario,   // Default scenario
  customer: Customer,   // Customer (existing or new)
  vehicle?: Vehicle,    // Vehicle (if provided)
}
```

## Error Types

| Error | Status | When |
|-------|--------|------|
| `ValidationError` | 400 | Invalid input |
| `ResourceNotFoundError` | 404 | Entity missing |
| `VehicleNotAvailableError` | 409 | Vehicle in use |
| `MultiTenantViolationError` | 403 | Wrong dealership |
| `DuplicateDealNumberError` | 409 | Number exists |

## Error Handling Pattern

```typescript
try {
  const result = await createDeal(data);
  // Success
} catch (error) {
  if (error instanceof ValidationError) {
    // Bad input
  } else if (error instanceof VehicleNotAvailableError) {
    // Vehicle taken
  } else if (error instanceof MultiTenantViolationError) {
    // Security issue
  } else {
    // Generic error
  }
}
```

## Frontend Pattern

```typescript
const response = await apiRequest('POST', '/api/deals', data);
const result = await response.json();

if (result.success === false) {
  throw new Error(result.error);
}

const deal = result.data?.deal || result;
```

## Validation Rules

### Required
- `dealershipId` - Must exist
- `salespersonId` - Must exist and belong to dealership
- Customer - Either `customerId` OR `customerData`

### Customer Data
- `firstName` - Required
- `lastName` - Required
- `email` - Optional, format: `name@domain.com`
- `phone` - Optional, format: `(XXX) XXX-XXXX`

### Multi-Tenant
- All entities must belong to same dealership

### Vehicle
- Status must be `available` or `pending`

## What's Guaranteed

1. **Atomicity** - All or nothing
2. **No Orphans** - Impossible
3. **Unique Deal Numbers** - Guaranteed
4. **Vehicle Locking** - Race-condition free
5. **Multi-Tenant Safety** - Enforced
6. **Audit Trail** - Always logged

## Common Patterns

### Create Deal from Form
```typescript
const result = await createDeal({
  dealershipId: user.dealershipId,
  salespersonId: formData.salespersonId,
  customerId: formData.customerId,
  vehicleId: formData.vehicleId,
});

toast.success('Deal created!');
navigate(`/deals/${result.deal.id}`);
```

### Create Deal with Custom Scenario
```typescript
const result = await createDeal({
  dealershipId,
  salespersonId,
  customerId,
  vehicleId,
  scenarioData: {
    name: 'Custom Scenario',
    downPayment: '5000',
    apr: '4.99',
    term: 72,
  },
});
```

## Testing

```bash
npm test -- server/database/__tests__/atomic-deal-creation.test.ts
```

## Monitoring

```sql
-- Check for failures
SELECT COUNT(*) FROM deals WHERE deal_number IS NULL;

-- Should be 0
SELECT COUNT(*) FROM customers
WHERE id NOT IN (SELECT customer_id FROM deals WHERE customer_id IS NOT NULL);
```

## Files Modified

- `/server/database/atomic-operations.ts` - Core logic
- `/server/storage.ts` - Migrated to atomic ops
- `/server/routes.ts` - Updated endpoints
- `/client/src/components/deal-creation-dialog.tsx` - Frontend
- `/client/src/pages/new-deal.tsx` - Frontend

## Status

✅ Production Ready

## Full Documentation

See `/ATOMIC_DEAL_CREATION_GUIDE.md` for complete details.
