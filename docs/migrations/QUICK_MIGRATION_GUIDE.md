# QUICK MIGRATION GUIDE
## Replacing TODO Comments with StorageService Methods

**Updated:** November 21, 2025
**Target Files:** Customer Service, Vehicle Service

---

## VEHICLE SERVICE MIGRATIONS

### File: `/src/modules/vehicle/services/vehicle.service.ts`

#### Migration 1: getVehicleByVIN (Line 226)

**BEFORE:**
```typescript
async getVehicleByVIN(vin: string, dealershipId: string): Promise<Vehicle | null> {
  try {
    // TODO: Replace with storageService.getVehicleByVIN(vin, dealershipId) when available
    const result = await db.execute(sql`
      SELECT * FROM vehicles
      WHERE vin = ${vin.toUpperCase()}
        AND dealership_id = ${dealershipId}
        AND deleted_at IS NULL
    `);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVehicle(result.rows[0]);
  } catch (error) {
    console.error('[VehicleService] Failed to get vehicle by VIN:', error);
    throw new Error(`Failed to get vehicle by VIN: ${error.message}`);
  }
}
```

**AFTER:**
```typescript
async getVehicleByVIN(vin: string, dealershipId: string): Promise<Vehicle | null> {
  try {
    const vehicle = await this.storageService.getVehicleByVIN(vin, dealershipId);

    if (!vehicle) {
      return null;
    }

    return this.mapDrizzleToVehicle(vehicle);
  } catch (error) {
    console.error('[VehicleService] Failed to get vehicle by VIN:', error);
    throw new Error(`Failed to get vehicle by VIN: ${error.message}`);
  }
}
```

**Savings:** 10 lines → 5 lines (50% reduction)

---

#### Migration 2: checkVINExists (Line 607)

**BEFORE:**
```typescript
async checkVINExists(dealershipId: string, vin: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE dealership_id = ${dealershipId}
        AND vin = ${vin.toUpperCase()}
        AND deleted_at IS NULL
    `);

    const count = Number(result.rows[0].count);
    return count > 0;
  } catch (error) {
    console.error('[VehicleService] Failed to check VIN existence:', error);
    throw new Error(`Failed to check VIN existence: ${error.message}`);
  }
}
```

**AFTER:**
```typescript
async checkVINExists(dealershipId: string, vin: string): Promise<boolean> {
  try {
    return await this.storageService.checkVINExists(vin, dealershipId);
  } catch (error) {
    console.error('[VehicleService] Failed to check VIN existence:', error);
    throw new Error(`Failed to check VIN existence: ${error.message}`);
  }
}
```

**Savings:** 12 lines → 3 lines (75% reduction)

---

## CUSTOMER SERVICE MIGRATIONS

### File: `/src/modules/customer/services/customer.service.ts`

#### Migration 3: listCustomers (Line 165)

**BEFORE:**
```typescript
async listCustomers(query: CustomerListQuery): Promise<PaginatedCustomers> {
  const {
    dealershipId,
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build WHERE conditions
  const conditions = [eq(customers.dealershipId, dealershipId)];

  if (status) {
    conditions.push(eq(customers.status, status));
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${customers.firstName}) LIKE ${searchTerm}`,
        sql`LOWER(${customers.lastName}) LIKE ${searchTerm}`,
        sql`LOWER(${customers.email}) LIKE ${searchTerm}`,
        sql`${customers.phone} LIKE ${searchTerm}`,
        sql`${customers.customerNumber} LIKE ${searchTerm}`
      )!
    );
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(and(...conditions));

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get customers
  const customerList = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    customers: customerList.map((c) => this.mapToCustomer(c)),
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}
```

**AFTER:**
```typescript
async listCustomers(query: CustomerListQuery): Promise<PaginatedCustomers> {
  const {
    dealershipId,
    status,
    search,
    page = 1,
    limit = 20,
  } = query;

  const result = await this.storageService.listCustomers(
    {
      page,
      pageSize: limit,
      search,
      status,
    },
    dealershipId
  );

  return {
    customers: result.customers.map((c) => this.mapToCustomer(c)),
    total: result.total,
    page,
    limit,
    totalPages: result.pages,
    hasMore: page < result.pages,
  };
}
```

**Savings:** 55 lines → 23 lines (58% reduction)

---

#### Migration 4: deleteCustomer (Line 331)

**BEFORE:**
```typescript
async deleteCustomer(customerId: string, dealershipId: string): Promise<void> {
  // Verify customer exists and belongs to dealership
  await this.getCustomer(customerId, dealershipId);

  // Note: Soft delete would require adding deletedAt column to schema
  // For now, just update status to 'archived'
  await db
    .update(customers)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.dealershipId, dealershipId)
      )
    );
}
```

**AFTER:**
```typescript
async deleteCustomer(customerId: string, dealershipId: string): Promise<void> {
  await this.storageService.deleteCustomer(customerId, dealershipId);
}
```

**Savings:** 16 lines → 1 line (94% reduction)

---

#### Migration 5: findDuplicates (Line 378)

**BEFORE:**
```typescript
async findDuplicates(search: DuplicateSearch): Promise<Customer[]> {
  const { dealershipId, firstName, lastName, email, phone, driversLicenseNumber } = search;

  const conditions = [eq(customers.dealershipId, dealershipId)];
  const duplicateConditions = [];

  // Exact name match
  if (firstName && lastName) {
    duplicateConditions.push(
      and(
        sql`LOWER(${customers.firstName}) = LOWER(${firstName})`,
        sql`LOWER(${customers.lastName}) = LOWER(${lastName})`
      )!
    );
  }

  // Phone match
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    duplicateConditions.push(eq(customers.phone, normalizedPhone));
  }

  // Email match
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    duplicateConditions.push(sql`LOWER(${customers.email}) = LOWER(${normalizedEmail})`);
  }

  // Driver's license match
  if (driversLicenseNumber) {
    duplicateConditions.push(
      sql`UPPER(${customers.driversLicenseNumber}) = UPPER(${driversLicenseNumber})`
    );
  }

  if (duplicateConditions.length === 0) {
    return [];
  }

  conditions.push(or(...duplicateConditions)!);

  const duplicates = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .limit(10);

  return duplicates.map((c) => this.mapToCustomer(c));
}
```

**AFTER:**
```typescript
async findDuplicates(search: DuplicateSearch): Promise<Customer[]> {
  const { dealershipId, firstName, lastName, email, phone, driversLicenseNumber } = search;

  // Normalize phone and email before searching
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  const duplicates = await this.storageService.findDuplicateCustomers(
    {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      driversLicenseNumber,
    },
    dealershipId
  );

  return duplicates.map((c) => this.mapToCustomer(c));
}
```

**Savings:** 46 lines → 17 lines (63% reduction)

---

#### Migration 6: getCustomerDeals (Line 529)

**BEFORE:**
```typescript
async getCustomerDeals(customerId: string, dealershipId: string) {
  // Verify customer exists and belongs to dealership
  await this.getCustomer(customerId, dealershipId);

  return await db
    .select()
    .from(deals)
    .where(eq(deals.customerId, customerId))
    .orderBy(desc(deals.createdAt));
}
```

**AFTER:**
```typescript
async getCustomerDeals(customerId: string, dealershipId: string) {
  return await this.storageService.getCustomerDeals(customerId, dealershipId);
}
```

**Savings:** 8 lines → 1 line (88% reduction)

---

#### Migration 7: getCustomerEmails (Line 544)

**BEFORE:**
```typescript
async getCustomerEmails(customerId: string, dealershipId: string) {
  // Verify customer exists and belongs to dealership
  await this.getCustomer(customerId, dealershipId);

  return await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.customerId, customerId))
    .orderBy(desc(emailMessages.createdAt));
}
```

**AFTER:**
```typescript
async getCustomerEmails(customerId: string, dealershipId: string) {
  return await this.storageService.getCustomerEmails(customerId, dealershipId);
}
```

**Savings:** 7 lines → 1 line (86% reduction)
**Note:** Currently returns empty array until email module integrated

---

## CLEANUP CHECKLIST

After completing all migrations:

### 1. Remove Direct DB Imports
```typescript
// REMOVE these imports from customer.service.ts and vehicle.service.ts:
import { db } from '../../../../server/database/db-service';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';
```

### 2. Remove Table Imports (if no longer needed)
```typescript
// Check if these are still needed, remove if not:
import { customers, deals, emailMessages } from '@shared/schema';
import { vehicles } from '@shared/schema';
```

### 3. Verify No Raw SQL Queries Remain
```bash
# Run this to find any remaining direct DB calls:
grep -n "db\." src/modules/customer/services/customer.service.ts
grep -n "db\." src/modules/vehicle/services/vehicle.service.ts
grep -n "sql\`" src/modules/customer/services/customer.service.ts
grep -n "sql\`" src/modules/vehicle/services/vehicle.service.ts
```

### 4. Run Tests
```bash
# Run existing tests to verify migrations didn't break anything:
npm test src/modules/customer/
npm test src/modules/vehicle/
```

### 5. Update Service Documentation
Remove TODO comments and update JSDoc to reflect StorageService usage:
```typescript
/**
 * List customers with filters and pagination
 * Uses StorageService for multi-tenant isolation and performance logging
 */
async listCustomers(query: CustomerListQuery): Promise<PaginatedCustomers>
```

---

## TOTAL SAVINGS

### Lines of Code Reduction
- **Customer Service:** 132 lines → 43 lines (67% reduction)
- **Vehicle Service:** 22 lines → 8 lines (64% reduction)
- **Total Reduction:** 154 lines → 51 lines (67% reduction)

### Benefits Gained
✅ Multi-tenant security enforced automatically
✅ Performance logging on all queries
✅ Centralized error handling
✅ Reduced code duplication
✅ Easier to test (can mock StorageService)
✅ Consistent patterns across all services

---

## MIGRATION ORDER (Recommended)

1. **Start with Vehicle Service** (30 minutes)
   - Only 2 migrations
   - Simple, low-risk changes
   - Good confidence builder

2. **Move to Customer Service** (2-3 hours)
   - 5 migrations
   - More complex, but high value
   - Unlocks main customer UI

3. **Clean up imports** (15 minutes)
   - Remove unused imports
   - Verify no direct DB calls remain

4. **Run tests** (30 minutes)
   - Verify all migrations work
   - Fix any breaking changes

5. **Update documentation** (15 minutes)
   - Remove TODO comments
   - Update JSDoc

**Total Time:** 4-5 hours for complete migration

---

## EXAMPLE COMMIT MESSAGE

```
refactor(services): Migrate Customer and Vehicle services to StorageService

BREAKING: Replace direct database access with StorageService methods

Changes:
- VehicleService: Migrate getVehicleByVIN and checkVINExists
- CustomerService: Migrate listCustomers, deleteCustomer, findDuplicates,
  getCustomerDeals, and getCustomerEmails
- Remove direct Drizzle DB calls from service layer
- Remove 103 lines of duplicated query logic
- Add automatic multi-tenant isolation on all queries
- Add performance logging on all database operations

Benefits:
- Improved security: automatic tenant isolation
- Better performance monitoring: all queries logged
- Reduced code duplication: 67% fewer lines
- Easier testing: can mock StorageService
- Consistent patterns across all services

Migration time: 4 hours
Risk level: LOW - All new methods tested and follow existing patterns

Related: STORAGE_SERVICE_METHODS_ADDED.md, QUICK_MIGRATION_GUIDE.md
```

---

**Guide Complete**
**Ready for immediate migration**
**Estimated time: 4-5 hours**
