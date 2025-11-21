# Atomic Deal Creation - Implementation Guide

## Overview

The deal creation flow has been completely migrated to use **atomic operations** with guaranteed all-or-nothing transaction semantics. This eliminates the possibility of orphaned records, inconsistent state, and data corruption.

## What Changed

### Before (DANGEROUS - Non-Atomic)

```typescript
// OLD - Multiple separate operations
const customer = await db.insert(customers).values(customerData);
const deal = await db.insert(deals).values(dealData);
const scenario = await db.insert(scenarios).values(scenarioData);
await db.update(vehicles).set({ status: 'in-deal' });

// PROBLEM: If ANY step fails, you get orphaned records
// - Customer created, but deal fails → orphaned customer
// - Deal created, but vehicle update fails → inconsistent state
// - Scenario creation fails → deal in limbo
```

### After (SAFE - Atomic)

```typescript
// NEW - Single atomic operation
import { createDeal } from '@/server/database/atomic-operations';

const result = await createDeal({
  dealershipId,
  salespersonId,
  vehicleId,
  customerData: {
    firstName,
    lastName,
    email,
    phone
  }
});

// GUARANTEED: ALL created or NONE created
// - Customer ✓
// - Deal ✓
// - Scenario ✓
// - Vehicle locked ✓
// - Audit log ✓
```

## Architecture

### Transaction Guarantees

All deal creation now uses **SERIALIZABLE** transactions with:

1. **Atomicity**: All operations succeed or all rollback
2. **Consistency**: Data integrity constraints enforced
3. **Isolation**: No race conditions or dirty reads
4. **Durability**: Changes persisted or fully rolled back

### Validation Pipeline

```
Input → Pre-validation → Transaction Start → Entity Verification → Creation → Commit
                ↓              ↓                    ↓                ↓         ↓
             Fail Fast     Lock Resources      Multi-tenant      Audit    Success
                                                   Check
```

### Error Hierarchy

```typescript
DealCreationError (base)
├── ValidationError (400)
│   ├── Missing required fields
│   ├── Invalid email format
│   └── Invalid phone format
├── ResourceNotFoundError (404)
│   ├── Dealership not found
│   ├── Salesperson not found
│   ├── Customer not found
│   └── Vehicle not found
├── VehicleNotAvailableError (409)
│   └── Vehicle already in another deal
├── MultiTenantViolationError (403)
│   ├── Salesperson wrong dealership
│   ├── Customer wrong dealership
│   └── Vehicle wrong dealership
└── DuplicateDealNumberError (409)
    └── Deal number already exists
```

## API Changes

### Endpoint: POST /api/deals

#### Request (Unchanged)

```typescript
POST /api/deals
{
  "salespersonId": "uuid",
  "customerId": "uuid",      // Optional if customerData provided
  "vehicleId": "uuid",       // Optional (blank desking)
  "tradeVehicleId": "uuid",  // Optional
}
```

#### Response (CHANGED)

**Old Format:**
```json
{
  "id": "deal-uuid",
  "dealNumber": "2025-0120-0001",
  "customerId": "customer-uuid",
  ...
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "deal": {
      "id": "deal-uuid",
      "dealNumber": "2025-0120-0001",
      "customerId": "customer-uuid",
      ...
    },
    "scenario": {
      "id": "scenario-uuid",
      "dealId": "deal-uuid",
      ...
    },
    "customer": {
      "id": "customer-uuid",
      "firstName": "John",
      ...
    },
    "vehicle": {
      "id": "vehicle-uuid",
      "status": "pending",
      ...
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Creating Deal with New Customer

```typescript
const result = await createDeal({
  dealershipId,
  salespersonId,
  customerData: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',    // Optional but validated
    phone: '(555) 123-4567',       // Optional but validated
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    county: 'Los Angeles'
  },
  vehicleId: 'vehicle-uuid',
});

// Customer automatically created and attached
// Deal number automatically generated
// Scenario automatically created
// Vehicle status updated to 'pending'
```

### Creating Deal with Existing Customer

```typescript
const result = await createDeal({
  dealershipId,
  salespersonId,
  customerId: 'existing-customer-uuid',
  vehicleId: 'vehicle-uuid',
});

// Customer verified and attached
// Multi-tenant check performed
// Deal number generated
```

### Blank Desking (No Vehicle)

```typescript
const result = await createDeal({
  dealershipId,
  salespersonId,
  customerId: 'customer-uuid',
  // No vehicleId provided
});

// Deal created without vehicle
// Can add vehicle later
```

## Frontend Integration

### React Query Pattern

```typescript
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const createDealMutation = useMutation({
  mutationFn: async (data) => {
    const response = await apiRequest('POST', '/api/deals', data);
    const result = await response.json();

    // Handle new format
    if (result.success === false) {
      throw new Error(result.error);
    }

    return result.data?.deal || result;
  },
  onSuccess: (deal) => {
    toast.success('Deal created successfully!');
    navigate(`/deals/${deal.id}`);
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to create deal');
  },
});
```

### Error Handling

```typescript
try {
  const result = await createDeal(dealData);
  console.log('Deal created:', result.deal.id);
} catch (error) {
  if (error instanceof ValidationError) {
    // Show validation errors to user
    toast.error(error.message);
  } else if (error instanceof VehicleNotAvailableError) {
    // Vehicle already in another deal
    toast.error('This vehicle is no longer available');
  } else if (error instanceof MultiTenantViolationError) {
    // Security violation
    toast.error('Access denied');
  } else {
    // Generic error
    toast.error('Failed to create deal. Please try again.');
  }
}
```

## Migration Checklist

### Backend

- [x] Created atomic operations service (`/server/database/atomic-operations.ts`)
- [x] Added comprehensive validation
- [x] Added multi-tenant isolation checks
- [x] Added vehicle locking to prevent race conditions
- [x] Migrated `storage.createDeal()` to use atomic operations
- [x] Updated `/api/deals` POST endpoint
- [x] Updated quote conversion endpoint
- [x] Added comprehensive error types
- [x] Created integration tests

### Frontend

- [x] Updated `deal-creation-dialog.tsx` to handle new response format
- [x] Updated `new-deal.tsx` to handle new response format
- [x] Updated `createQuickDeal` function
- [x] Added error handling for new error types

### Testing

- [x] Unit tests for validation logic
- [x] Integration tests for atomic transactions
- [x] Multi-tenant isolation tests
- [x] Vehicle locking tests
- [x] Rollback verification tests

## Validation Rules

### Required Fields

- `dealershipId` - Must exist in database
- `salespersonId` - Must exist and belong to dealership
- Customer - Either `customerId` OR `customerData` (not both)

### Customer Data Validation

When creating new customer:

- `firstName` - Required, non-empty
- `lastName` - Required, non-empty
- `email` - Optional, but must match: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `phone` - Optional, but must match: `/^\(\d{3}\)\s\d{3}-\d{4}$/` (e.g., "(555) 123-4567")

### Multi-Tenant Checks

All entities verified to belong to same dealership:

1. Salesperson must belong to `dealershipId`
2. Customer must belong to `dealershipId`
3. Vehicle must belong to `dealershipId`

### Vehicle Availability

- Vehicle status must be `available` or `pending`
- Vehicle locked during transaction (SELECT FOR UPDATE)
- Status updated to `pending` after deal creation

## Performance Considerations

### Transaction Timeout

Default: 10 seconds

```typescript
await createDeal(input, { timeout: 10000 });
```

### Deadlock Handling

- Automatic retry with exponential backoff
- Max retries: 3
- Retry delay: 100ms → 200ms → 400ms

### Connection Pooling

- Uses Neon serverless pool
- Automatic connection management
- Transaction isolation level: SERIALIZABLE

## Security Features

### Multi-Tenant Isolation

Every operation verifies tenant boundaries:

```typescript
// Verify salesperson belongs to dealership
if (salesperson.dealership_id !== dealershipId) {
  throw new MultiTenantViolationError(
    'Salesperson does not belong to the specified dealership'
  );
}
```

### Audit Trail

Every deal creation logs:

- Who created it (salespersonId)
- When it was created
- What entities were involved
- Deal number assigned

### Input Sanitization

All inputs validated before transaction starts:

- UUID format validation
- Email format validation
- Phone format validation
- SQL injection prevention (parameterized queries)

## Troubleshooting

### Issue: "Vehicle is not available"

**Cause:** Vehicle status is not `available` or `pending`

**Solution:** Check vehicle status and ensure it's not already in another deal

### Issue: "Customer and deal must belong to the same dealership"

**Cause:** Multi-tenant isolation violation

**Solution:** Verify all entities belong to the same dealership

### Issue: "Transaction timeout"

**Cause:** Operation took longer than 10 seconds

**Solution:**
1. Check database performance
2. Verify no long-running queries
3. Increase timeout if needed

### Issue: "Deadlock detected"

**Cause:** Two transactions trying to lock same resources

**Solution:** Automatic retry with exponential backoff (handled internally)

## Best Practices

### 1. Always Use Atomic Operations

```typescript
// GOOD
import { createDeal } from '@/server/database/atomic-operations';
const result = await createDeal(input);

// BAD
const deal = await db.insert(deals).values(...);
const scenario = await db.insert(scenarios).values(...);
```

### 2. Handle All Error Types

```typescript
try {
  const result = await createDeal(input);
} catch (error) {
  if (error instanceof ValidationError) { /* ... */ }
  if (error instanceof ResourceNotFoundError) { /* ... */ }
  if (error instanceof VehicleNotAvailableError) { /* ... */ }
  if (error instanceof MultiTenantViolationError) { /* ... */ }
  // Always have a default case
}
```

### 3. Validate Before Calling

```typescript
// Pre-validate on frontend
const schema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  salespersonId: z.string().uuid(),
});

const validData = schema.parse(formData);
await createDeal(validData);
```

### 4. Show User-Friendly Errors

```typescript
// Map error codes to user messages
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again',
  RESOURCE_NOT_FOUND: 'The selected item could not be found',
  VEHICLE_NOT_AVAILABLE: 'This vehicle is no longer available',
  MULTI_TENANT_VIOLATION: 'You do not have permission to perform this action',
};

toast.error(ERROR_MESSAGES[error.code] || 'An error occurred');
```

## Testing

### Run Integration Tests

```bash
npm test -- server/database/__tests__/atomic-deal-creation.test.ts
```

### Test Coverage

- ✅ Successful deal creation with existing customer
- ✅ Successful deal creation with new customer
- ✅ Blank desking (no vehicle)
- ✅ Unique deal number generation
- ✅ Validation errors
- ✅ Resource not found errors
- ✅ Multi-tenant isolation violations
- ✅ Vehicle availability checks
- ✅ Transaction rollback on failure

## Monitoring

### Key Metrics

Monitor these metrics in production:

1. **Deal Creation Success Rate**
   ```sql
   SELECT
     COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as total,
     COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' AND deal_number IS NOT NULL THEN 1 END) as successful
   FROM deals;
   ```

2. **Transaction Retry Rate**
   - Check logs for `[Transaction] Transient error detected, retrying`
   - High retry rate indicates contention

3. **Orphaned Records**
   ```sql
   -- Should return 0
   SELECT COUNT(*) FROM customers
   WHERE id NOT IN (SELECT customer_id FROM deals WHERE customer_id IS NOT NULL);
   ```

## Support

For issues or questions:

1. Check this guide first
2. Review integration tests for examples
3. Check error logs for specific error messages
4. Verify database connection and transaction isolation level

---

**Last Updated:** 2025-01-20

**Version:** 1.0.0

**Status:** Production Ready ✅
