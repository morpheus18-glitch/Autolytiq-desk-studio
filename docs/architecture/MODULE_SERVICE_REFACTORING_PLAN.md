# MODULE SERVICE REFACTORING PLAN
**Fix Architectural Violation: Direct Database Access in Module Services**

**Date:** November 21, 2025
**Priority:** CRITICAL
**Estimated Effort:** 6 hours
**Dependencies:** None (can start immediately)

---

## PROBLEM STATEMENT

Module services are bypassing the StorageService and using direct database access, creating two parallel data access patterns and violating separation of concerns.

**Files Affected:**
1. `/src/modules/customer/services/customer.service.ts` - 754 lines
2. `/src/modules/vehicle/services/vehicle.service.ts` - 742 lines
3. `/src/modules/vehicle/services/inventory.service.ts` - 678 lines
4. `/src/modules/vehicle/services/stock-number.service.ts` - 312 lines
5. `/src/modules/email/services/email.service.ts` - 689 lines
6. `/src/modules/email/services/queue.service.ts` - 234 lines

**Total Lines to Refactor:** ~3,409 lines

---

## REFACTORING STRATEGY

### Core Principle
**Module services should contain ONLY business logic, NOT data access.**

```
┌─────────────────────────────────────────┐
│         Module Service Layer            │
│  (Business Logic, Validation, Workflow) │
└────────────────┬────────────────────────┘
                 │
                 ▼ Uses
┌─────────────────────────────────────────┐
│         Storage Service Layer           │
│    (Data Access, Tenant Isolation,      │
│     Transaction Management, Logging)    │
└────────────────┬────────────────────────┘
                 │
                 ▼ Uses
┌─────────────────────────────────────────┐
│           Database Layer                │
│      (Drizzle ORM, PostgreSQL)          │
└─────────────────────────────────────────┘
```

### Refactoring Pattern

**BEFORE (❌ Mixing business logic + data access):**
```typescript
export class CustomerService {
  async createCustomer(data: CreateCustomerRequest, dealershipId: string) {
    // Business logic
    const validation = validateCustomerData(data);
    if (!validation.valid) throw new Error();

    // DATA ACCESS (should NOT be here!)
    const [customer] = await db
      .insert(customers)
      .values({
        dealershipId,
        firstName: data.firstName,
        // ... more fields
      })
      .returning();

    return customer;
  }
}
```

**AFTER (✅ Separation of concerns):**
```typescript
export class CustomerService {
  constructor(private storage: StorageService) {}

  async createCustomer(data: CreateCustomerRequest, dealershipId: string) {
    // Business logic ONLY
    const validation = validateCustomerData(data);
    if (!validation.valid) throw new Error();

    // Data access delegated to storage layer
    return this.storage.createCustomer({
      firstName: data.firstName,
      lastName: data.lastName,
      // ... transform as needed
    }, dealershipId);
  }
}
```

---

## PHASE 1: CUSTOMER MODULE (2 hours)

### File: `/src/modules/customer/services/customer.service.ts`

**Current State:**
- Direct import: `import { db } from '../../../../server/database/db-service'`
- Direct table imports: `import { customers, deals, emailMessages } from '@shared/schema'`
- Direct Drizzle queries throughout

**Refactoring Steps:**

1. **Add StorageService dependency (15 min)**
   ```typescript
   import { StorageService } from '../../../core/database/storage.service';

   export class CustomerService {
     private storage: StorageService;

     constructor(storage?: StorageService) {
       this.storage = storage || new StorageService();
     }
   }
   ```

2. **Replace createCustomer method (30 min)**
   - Keep validation logic
   - Keep duplicate detection logic
   - Replace db.insert() → this.storage.createCustomer()
   - Map CustomerService types to Storage types

3. **Replace getCustomer/search methods (30 min)**
   - Replace db.select() → this.storage.getCustomer()
   - Replace search query → this.storage.searchCustomers()
   - Keep result transformation logic

4. **Replace update/delete methods (30 min)**
   - Replace db.update() → this.storage.updateCustomer()
   - Keep validation logic
   - Keep audit logging

5. **Replace aggregation methods (30 min)**
   - getCustomerHistory() - may need custom aggregation
   - getCustomerTimeline() - combine storage calls
   - Keep business logic for timeline construction

**Special Considerations:**
- CustomerService has duplicate detection logic - keep it!
- Has validation logic - keep it!
- Has custom aggregations - may need multiple storage calls
- Returns different types than storage - transform as needed

**Validation:**
- [ ] Zero direct db imports
- [ ] All CRUD goes through storage
- [ ] Business logic preserved
- [ ] Type transformations correct
- [ ] Tests pass

---

## PHASE 2: VEHICLE MODULE (3 hours)

### 2.1 File: `/src/modules/vehicle/services/vehicle.service.ts` (1 hour)

**Current State:**
- Direct db access for vehicle CRUD
- Direct VIN decoding database queries
- Custom aggregations

**Refactoring Steps:**

1. **Add StorageService (10 min)**
   ```typescript
   constructor(
     private storage: StorageService,
     private vinDecoder: VinDecoderService
   ) {}
   ```

2. **Replace CRUD operations (30 min)**
   - createVehicle → this.storage.createVehicle()
   - updateVehicle → this.storage.updateVehicle()
   - getVehicle → this.storage.getVehicle()
   - deleteVehicle → this.storage.deleteVehicle() (if exists)

3. **Replace search/filter operations (20 min)**
   - searchVehicles → this.storage.searchVehicles()
   - Keep result filtering/sorting if custom

**Validation:**
- [ ] CRUD through storage
- [ ] VIN decoder still works
- [ ] Search functionality preserved

### 2.2 File: `/src/modules/vehicle/services/inventory.service.ts` (1 hour)

**Current State:**
- Complex inventory queries
- Pagination logic
- Filtering logic

**Refactoring Steps:**

1. **Add StorageService (10 min)**

2. **Replace getInventory (40 min)**
   - Use this.storage.getInventory()
   - Check if storage method supports all filters
   - If not, apply additional filters in service layer

3. **Replace search (10 min)**
   - Use this.storage.searchInventory()
   - Transform results as needed

**Special Considerations:**
- Inventory has complex pagination - verify storage supports it
- Multiple filter combinations - may need layered filtering
- Performance-sensitive - monitor query efficiency

**Validation:**
- [ ] Pagination works correctly
- [ ] All filters applied
- [ ] Performance acceptable (<100ms)

### 2.3 File: `/src/modules/vehicle/services/stock-number.service.ts` (1 hour)

**Current State:**
- Custom stock number generation logic
- Database sequences
- Format customization

**Refactoring Steps:**

1. **Use storage method (45 min)**
   - Replace custom query → this.storage.generateStockNumber()
   - Keep format customization logic
   - Keep validation logic

2. **Handle edge cases (15 min)**
   - Concurrent generation
   - Format conflicts
   - Sequence rollover

**Special Considerations:**
- Stock numbers are CRITICAL - must be unique
- Thread-safe generation required
- May need transaction support

**Validation:**
- [ ] No duplicate stock numbers (load test 100 concurrent)
- [ ] Format preserved
- [ ] Sequence continues from current max

---

## PHASE 3: EMAIL MODULE (1 hour - Special Case)

### Status: Email Operations NOT in StorageService Yet

**Two Options:**

**Option A: Wait for email ops to be added (RECOMMENDED)**
- Leave email services as-is for now
- Add email operations to StorageService first
- Then refactor email services
- Timeline: +4 hours for storage, +1 hour for services

**Option B: Create temporary adapter**
- Create EmailStorageAdapter wrapping direct queries
- Refactor services to use adapter
- Later replace adapter with StorageService
- Timeline: +2 hours for adapter, +1 hour to replace later

**Recommendation:** Option A (add email to storage first)

**Email Operations Needed in StorageService:**
1. getEmailAccounts, createEmailAccount, updateEmailAccount
2. getEmailMessages, createEmailMessage, sendEmail
3. getEmailThreads, searchEmails
4. getEmailTemplates, createEmailTemplate
5. getEmailQueue, enqueueEmail, dequeueEmail

---

## DEPENDENCY INJECTION PATTERN

### Current Problem
Services create their own dependencies:
```typescript
export class CustomerService {
  // ❌ Hard to test, hard to mock
  async createCustomer() {
    const [customer] = await db.insert(customers)...
  }
}
```

### Solution: Constructor Injection
```typescript
export class CustomerService {
  constructor(private storage: StorageService) {}

  async createCustomer() {
    // ✅ Easy to test, easy to mock
    return this.storage.createCustomer(...);
  }
}
```

### For Backward Compatibility
```typescript
export class CustomerService {
  private storage: StorageService;

  constructor(storage?: StorageService) {
    // Allow injection OR create default
    this.storage = storage || new StorageService();
  }
}
```

### Testing Benefits
```typescript
// In tests
const mockStorage = {
  createCustomer: jest.fn().mockResolvedValue(mockCustomer),
  getCustomer: jest.fn().mockResolvedValue(mockCustomer),
};

const service = new CustomerService(mockStorage);
// Now we can test business logic without touching database!
```

---

## TYPE MAPPING STRATEGY

### Challenge
Module services often use different types than StorageService:

**Module Type:**
```typescript
interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}
```

**Storage Type:**
```typescript
interface InsertCustomer {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;  // Flattened!
  city: string | null;
  state: string | null;
  zipCode: string | null;
}
```

### Solution: Transform in Service Layer
```typescript
export class CustomerService {
  async createCustomer(request: CreateCustomerRequest, dealershipId: string) {
    // Business logic
    validateCustomerData(request);
    checkDuplicates(request);

    // TRANSFORM module type → storage type
    const insertData: InsertCustomer = {
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email || null,
      phone: request.phone || null,
      address: request.address?.street || null,
      city: request.address?.city || null,
      state: request.address?.state || null,
      zipCode: request.address?.zip || null,
    };

    // Delegate to storage
    const customer = await this.storage.createCustomer(insertData, dealershipId);

    // TRANSFORM storage type → module type (if needed)
    return this.toCustomerResponse(customer);
  }

  private toCustomerResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      address: customer.address ? {
        street: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zipCode,
      } : undefined,
    };
  }
}
```

**Key Points:**
- Service layer handles type transformations
- Storage layer deals with database types only
- Keeps storage layer simple and focused

---

## VALIDATION CHECKLIST

### Before Refactoring
- [ ] Read entire service file
- [ ] Identify all database operations
- [ ] Map to StorageService methods
- [ ] Identify custom business logic to preserve
- [ ] Identify type transformations needed
- [ ] Create test cases for critical operations

### During Refactoring
- [ ] Add StorageService import
- [ ] Add constructor injection
- [ ] Replace one method at a time
- [ ] Run tests after each method
- [ ] Keep git commits small and focused
- [ ] Document any assumptions

### After Refactoring
- [ ] Zero direct db imports
- [ ] All tests pass
- [ ] TypeScript compiles with no errors
- [ ] No 'any' types introduced
- [ ] Business logic preserved
- [ ] Performance acceptable

### Code Review Checklist
- [ ] Separation of concerns maintained?
- [ ] Dependency injection used correctly?
- [ ] Type transformations correct?
- [ ] Error handling preserved?
- [ ] Logging preserved?
- [ ] Tenant isolation enforced?

---

## ROLLBACK PLAN

### Git Strategy
```bash
# Before starting
git checkout -b refactor/customer-service
git add .
git commit -m "Checkpoint: Before customer service refactor"

# After each file
git add src/modules/customer/services/customer.service.ts
git commit -m "Refactor: CustomerService uses StorageService"

# Run tests
npm test

# If tests fail
git reset --hard HEAD~1  # Rollback last commit
```

### Feature Flags (Optional)
```typescript
const USE_STORAGE_SERVICE = process.env.USE_STORAGE_SERVICE === 'true';

export class CustomerService {
  async createCustomer(data, dealershipId) {
    if (USE_STORAGE_SERVICE) {
      return this.storage.createCustomer(data, dealershipId);
    } else {
      // Old implementation
      return db.insert(customers).values(data).returning();
    }
  }
}
```

---

## TIMELINE

### Day 1 (6 hours)
- **Hours 0-2:** Customer module refactoring
  - Hour 0-0.5: Setup, planning, tests
  - Hour 0.5-1.5: Refactor methods
  - Hour 1.5-2: Testing, validation

- **Hours 2-5:** Vehicle module refactoring
  - Hour 2-3: vehicle.service.ts
  - Hour 3-4: inventory.service.ts
  - Hour 4-5: stock-number.service.ts

- **Hour 5-6:** Testing, validation, documentation
  - Integration tests
  - Performance tests
  - Update documentation

### Success Criteria
- [ ] Customer module: 0 direct db imports
- [ ] Vehicle module: 0 direct db imports
- [ ] All existing tests pass
- [ ] No regression in functionality
- [ ] Performance within 10% of original

---

## NEXT STEPS AFTER MODULE REFACTORING

1. **Add Email Operations to StorageService (4 hours)**
   - Design email operation interface
   - Implement 15-20 email methods
   - Add proper tenant isolation
   - Add to IStorage interface

2. **Refactor Email Module (1 hour)**
   - email.service.ts uses StorageService
   - queue.service.ts uses StorageService
   - Tests updated

3. **Update Route Handlers (2 hours)**
   - Ensure routes use storage singleton
   - Remove any direct db access in routes
   - Update error handling

4. **Integration Testing (2 hours)**
   - Test all CRUD operations
   - Test tenant isolation
   - Test concurrent access
   - Performance benchmarks

---

## RISKS & MITIGATION

### Risk 1: Breaking Existing Functionality
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Comprehensive test coverage before refactoring
- Small, incremental commits
- Feature flags for gradual rollout
- Rollback plan ready

### Risk 2: Performance Regression
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Benchmark before/after
- Monitor query counts
- Check for N+1 queries
- Optimize hot paths

### Risk 3: Type Mismatches
**Probability:** Medium
**Impact:** Low
**Mitigation:**
- Clear type transformations
- Runtime validation
- TypeScript strict mode
- Comprehensive type tests

### Risk 4: Missing Storage Operations
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- StorageService already has 83 operations
- Most operations already covered
- Can add missing operations quickly

---

## CONCLUSION

This refactoring is **critical for architectural integrity** but relatively **low risk** because:

1. StorageService already exists and is complete
2. Changes are isolated to service layer
3. Tests provide safety net
4. Can be done incrementally
5. Clear rollback plan

**Estimated Effort:** 6 hours
**Risk Level:** Low-Medium
**Priority:** CRITICAL
**Recommendation:** Start immediately with customer module

---

**Plan prepared by:** Database Architect Agent
**Date:** November 21, 2025
**Status:** Ready for execution
