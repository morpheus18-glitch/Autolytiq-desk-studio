# DATABASE LAYER INVENTORY
**Complete mapping of database operations across the codebase**

**Date:** November 21, 2025
**Status:** Migration 80% Complete

---

## LAYER ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│              (Routes, Controllers, UI)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPATIBILITY LAYER                        │
│              /server/storage.ts (697 lines)                 │
│          ✅ Backward compatible wrapper                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               MODULE BUSINESS LOGIC LAYER                   │
│                                                              │
│  /src/modules/customer/services/customer.service.ts         │
│  /src/modules/vehicle/services/vehicle.service.ts           │
│  /src/modules/deal/services/deal.service.ts                 │
│  /src/modules/email/services/email.service.ts               │
│                                                              │
│  ❌ PROBLEM: Still using direct DB access!                  │
│  ✅ SHOULD: Use StorageService only                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                     ┌──────┴────────┐
                     ▼               ▼
        ┌────────────────┐  ┌──────────────────┐
        │  DIRECT DB     │  │  STORAGE SERVICE │
        │  (bypassing)   │  │  (correct path)  │
        │      ❌        │  │       ✅         │
        └────────────────┘  └────────┬─────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│               CORE STORAGE SERVICE LAYER                    │
│        /src/core/database/storage.service.ts                │
│                  (2,703 lines)                              │
│                                                              │
│  ✅ Multi-tenant isolation                                  │
│  ✅ 83 operations implemented                               │
│  ✅ Query logging & monitoring                              │
│  ✅ Comprehensive error handling                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                            │
│              Drizzle ORM + PostgreSQL                       │
│          /server/database/db-service.ts                     │
└─────────────────────────────────────────────────────────────┘
```

---

## FILE LOCATIONS

### Core Storage Infrastructure

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `/src/core/database/storage.service.ts` | 2,703 | ✅ Complete | Main storage implementation with 83 operations |
| `/src/core/database/storage.interface.ts` | 834 | ✅ Complete | TypeScript interface defining all operations |
| `/src/core/database/index.ts` | ~50 | ✅ Complete | Public API exports |
| `/server/storage.ts` | 697 | ✅ Complete | Backward compatibility wrapper |
| `/server/database/db-service.ts` | ~300 | ✅ Complete | Database connection & pooling |

### Module Services (Business Logic)

| Module | File | Lines | DB Access | Status |
|--------|------|-------|-----------|--------|
| Customer | `customer.service.ts` | 754 | Direct ❌ | Needs refactor |
| Vehicle | `vehicle.service.ts` | 742 | Direct ❌ | Needs refactor |
| Vehicle | `inventory.service.ts` | 678 | Direct ❌ | Needs refactor |
| Vehicle | `stock-number.service.ts` | 312 | Direct ❌ | Needs refactor |
| Email | `email.service.ts` | 689 | Direct ❌ | Waiting for storage ops |
| Email | `queue.service.ts` | 234 | Direct ❌ | Waiting for storage ops |
| Deal | `deal.service.ts` | 285 | Interface ✅ | Needs storage binding |
| Deal | `deal-calculator.service.ts` | 171 | None ✅ | Pure logic |
| Tax | `tax.service.ts` | 228 | Storage ✅ | Uses storage |
| Tax | `jurisdiction.service.ts` | 267 | Storage ✅ | Uses storage |
| Auth | `auth.service.ts` | 392 | Storage ✅ | Uses storage |

---

## OPERATIONS INVENTORY

### User Management (8 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getUser(id, tenantId?)` | Optional | Get user by ID |
| `getUsers(tenantId)` | Required | List all users for dealership |
| `getUserByUsername(username)` | None | Auth - global lookup |
| `getUserByEmail(email)` | None | Auth - global lookup |
| `getUserByResetToken(token)` | None | Password reset |
| `createUser(user, tenantId)` | Enforced | Create new user |
| `updateUser(id, data, tenantId)` | Validated | Update user |
| `updateUserPreferences(id, prefs, tenantId)` | Validated | Update preferences |

**Consumers:**
- `/server/auth-routes.ts` via compatibility layer
- `/src/modules/auth/services/auth.service.ts`

---

### Customer Management (7 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getCustomer(id, tenantId)` | Required | Get customer by ID |
| `searchCustomers(query, tenantId)` | Required | Search customers |
| `createCustomer(data, tenantId)` | Enforced | Create customer |
| `updateCustomer(id, data, tenantId)` | Validated | Update customer |
| `getCustomerHistory(id, tenantId)` | Validated | Get activity timeline |
| `getCustomerNotes(id, tenantId)` | Validated | Get customer notes |
| `createCustomerNote(note)` | Enforced | Add note to customer |

**Consumers:**
- `/server/routes.ts` via compatibility layer
- ❌ `/src/modules/customer/services/customer.service.ts` (BYPASSING - needs fix)

**Problem:** CustomerService reimplements these operations with direct DB access!

---

### Vehicle Management (10 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getVehicle(id, tenantId)` | Required | Get vehicle by ID |
| `getVehicleByStock(stock, tenantId)` | Required | Get by stock number |
| `searchVehicles(query, tenantId)` | Required | Search inventory |
| `createVehicle(data, tenantId)` | Enforced | Add to inventory |
| `updateVehicle(id, data, tenantId)` | Validated | Update vehicle |
| `updateVehicleStatus(stock, status, tenantId)` | Validated | Change status |
| `getInventory(options, tenantId)` | Required | Paginated inventory |
| `searchInventory(filters, tenantId)` | Required | Advanced search |
| `generateStockNumber(tenantId)` | Required | Generate unique stock# |
| `getVehicleByStockNumber(stock, tenantId)` | Required | Alias for getVehicleByStock |

**Consumers:**
- `/server/routes.ts` via compatibility layer
- ❌ `/src/modules/vehicle/services/vehicle.service.ts` (BYPASSING - needs fix)
- ❌ `/src/modules/vehicle/services/inventory.service.ts` (BYPASSING - needs fix)
- ❌ `/src/modules/vehicle/services/stock-number.service.ts` (BYPASSING - needs fix)

**Problem:** All 3 vehicle services bypass StorageService!

---

### Trade Vehicle Management (5 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getTradeVehiclesByDeal(dealId, tenantId)` | Validated | Get all trades for deal |
| `getTradeVehicle(id, tenantId)` | Validated | Get trade by ID |
| `createTradeVehicle(data, tenantId)` | Validated | Add trade to deal |
| `updateTradeVehicle(id, data, tenantId)` | Validated | Update trade |
| `deleteTradeVehicle(id, tenantId)` | Validated | Remove trade |

**Consumers:**
- `/server/routes.ts` via compatibility layer
- Deal module services

---

### Deal Management (10 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getDeal(id, tenantId)` | Required | Get deal with relations |
| `getDeals(options)` | Required | Paginated deal list |
| `getDealsStats(tenantId)` | Required | Dashboard statistics |
| `createDeal(data, tenantId)` | Enforced | Create new deal |
| `updateDeal(id, data, tenantId)` | Validated | Update deal |
| `updateDealState(id, state, tenantId)` | Validated | Change workflow state |
| `attachCustomerToDeal(dealId, custId, tenantId)` | Validated | Link customer |
| `generateDealNumber(tenantId)` | Required | Generate unique deal# |
| `getScenario(id, tenantId)` | Validated | Get deal scenario |
| `createScenario(data, tenantId)` | Validated | Add scenario |
| `updateScenario(id, data, tenantId)` | Validated | Update scenario |
| `deleteScenario(id, tenantId)` | Validated | Remove scenario |

**Consumers:**
- `/server/routes.ts` via compatibility layer
- `/src/modules/deal/services/deal.service.ts` (needs binding)

---

### Tax Operations (5 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getAllTaxJurisdictions()` | None | Global reference data |
| `getTaxJurisdiction(state, county, city)` | None | Lookup by location |
| `getTaxJurisdictionById(id)` | None | Lookup by ID |
| `getZipCodeLookup(zip)` | None | ZIP to jurisdiction |
| `createTaxJurisdiction(data)` | None | Admin only |

**Consumers:**
- ✅ `/src/modules/tax/services/jurisdiction.service.ts` (using storage)
- ✅ `/src/modules/tax/services/tax.service.ts` (using storage)

---

### Lender Operations (12 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getLenders(active?)` | None | Global reference data |
| `getLender(id)` | None | Get lender by ID |
| `createLender(data)` | None | Admin only |
| `updateLender(id, data)` | None | Admin only |
| `getLenderPrograms(lenderId, active?)` | None | Get programs |
| `getLenderProgram(id)` | None | Get program by ID |
| `createLenderProgram(data)` | None | Admin only |
| `updateLenderProgram(id, data)` | None | Admin only |
| `createRateRequest(data, tenantId)` | Validated | Submit rate request |
| `getRateRequest(id, tenantId)` | Validated | Get rate request |
| `getRateRequestsByDeal(dealId, tenantId)` | Validated | Get all for deal |
| `updateRateRequest(id, data, tenantId)` | Validated | Update request |

**Consumers:**
- `/server/routes.ts` via compatibility layer
- Deal module for rate shopping

---

### Approved Lender Operations (4 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `createApprovedLenders(lenders, tenantId)` | Validated | Bulk create approved |
| `getApprovedLenders(requestId, tenantId)` | Validated | Get for rate request |
| `selectApprovedLender(id, userId, tenantId)` | Validated | User selects lender |
| `getSelectedLenderForDeal(dealId, tenantId)` | Validated | Get selected |

**Consumers:**
- Deal module for financing workflow

---

### Quick Quote Operations (6 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `createQuickQuote(data)` | None | Public form submission |
| `getQuickQuote(id, tenantId?)` | Optional | Get quote |
| `updateQuickQuote(id, data, tenantId)` | Validated | Update status |
| `updateQuickQuotePayload(id, payload, tenantId)` | Validated | Update payload |
| `createQuickQuoteContact(data)` | None | Add contact method |
| `updateQuickQuoteContactStatus(id, status, date)` | None | Update delivery status |

**Consumers:**
- Public quote form
- Lead conversion workflow

---

### Appointment Operations (5 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getAppointmentsByDate(date, tenantId)` | Required | Calendar view |
| `getAppointments(tenantId, options)` | Required | List with filters |
| `createAppointment(data)` | Enforced | Schedule appointment |
| `updateAppointment(id, data, tenantId)` | Validated | Update appointment |
| `deleteAppointment(id, tenantId)` | Validated | Cancel appointment |

**Consumers:**
- Calendar/scheduling features

---

### Audit Log Operations (2 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `createAuditLog(data)` | None | Log action |
| `getDealAuditLogs(dealId, tenantId)` | Validated | Get deal history |

**Consumers:**
- All modules for audit trail

---

### Security Audit Operations (2 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `createSecurityAuditLog(data)` | None | Log security event |
| `getSecurityAuditLogs(options, tenantId?)` | Optional | Query security logs |

**Consumers:**
- Auth module
- Security monitoring

---

### Dealership Settings (2 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getDealershipSettings(tenantId)` | Required | Get settings |
| `updateDealershipSettings(id, data, tenantId)` | Validated | Update settings |

**Consumers:**
- Settings pages
- Configuration

---

### Permissions/RBAC (3 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getPermissions()` | None | Global permissions |
| `getPermission(name)` | None | Get by name |
| `getRolePermissions(role)` | None | Get for role |

**Consumers:**
- Auth middleware
- Permission checks

---

### Fee Package Templates (2 operations) ✅ COMPLETE

**Location:** `/src/core/database/storage.service.ts`

| Operation | Tenant Filter | Description |
|-----------|---------------|-------------|
| `getFeePackageTemplates(active?)` | None | Global templates |
| `getFeePackageTemplate(id)` | None | Get by ID |

**Consumers:**
- Deal creation
- Fee management

---

### Email Operations (❌ MISSING - 15-20 operations needed)

**Currently NOT in StorageService**

**Needed Operations:**
```typescript
// Email Accounts
getEmailAccounts(tenantId): Promise<EmailAccount[]>
getEmailAccount(id, tenantId): Promise<EmailAccount>
createEmailAccount(data, tenantId): Promise<EmailAccount>
updateEmailAccount(id, data, tenantId): Promise<EmailAccount>
deleteEmailAccount(id, tenantId): Promise<void>

// Email Messages
getEmailMessages(options, tenantId): Promise<PaginatedEmails>
getEmailMessage(id, tenantId): Promise<EmailMessage>
createEmailMessage(data, tenantId): Promise<EmailMessage>
sendEmail(id, tenantId): Promise<EmailMessage>
createDraft(data, tenantId): Promise<EmailMessage>
updateDraft(id, data, tenantId): Promise<EmailMessage>

// Email Threads
getEmailThreads(options, tenantId): Promise<EmailThread[]>
getEmailThread(id, tenantId): Promise<EmailThread>

// Email Search
searchEmails(query, tenantId): Promise<EmailMessage[]>

// Email Sync
syncEmailAccount(accountId, tenantId): Promise<SyncResult>

// Email Templates
getEmailTemplates(tenantId): Promise<EmailTemplate[]>
getEmailTemplate(id, tenantId): Promise<EmailTemplate>
createEmailTemplate(data, tenantId): Promise<EmailTemplate>
updateEmailTemplate(id, data, tenantId): Promise<EmailTemplate>

// Email Queue
getQueuedEmails(tenantId): Promise<QueuedEmail[]>
enqueueEmail(data, tenantId): Promise<QueuedEmail>
dequeueEmail(id): Promise<void>
processEmailQueue(): Promise<number>
```

**Current Location:**
- ❌ `/src/modules/email/services/email.service.ts` (direct DB access)
- ❌ `/src/modules/email/services/queue.service.ts` (direct DB access)

**Action Required:**
1. Add 15-20 email operations to StorageService
2. Add to IStorage interface
3. Implement in storage.service.ts
4. Refactor email.service.ts to use them
5. Refactor queue.service.ts to use them

---

## SUMMARY STATISTICS

### Operations by Category

| Category | Operations | Status | Location |
|----------|-----------|--------|----------|
| Users | 8 | ✅ Complete | StorageService |
| Customers | 7 | ✅ Complete | StorageService |
| Vehicles | 10 | ✅ Complete | StorageService |
| Trade Vehicles | 5 | ✅ Complete | StorageService |
| Deals | 12 | ✅ Complete | StorageService |
| Tax | 5 | ✅ Complete | StorageService |
| Lenders | 12 | ✅ Complete | StorageService |
| Approved Lenders | 4 | ✅ Complete | StorageService |
| Quick Quotes | 6 | ✅ Complete | StorageService |
| Appointments | 5 | ✅ Complete | StorageService |
| Audit Logs | 2 | ✅ Complete | StorageService |
| Security Audit | 2 | ✅ Complete | StorageService |
| Settings | 2 | ✅ Complete | StorageService |
| Permissions | 3 | ✅ Complete | StorageService |
| Fee Packages | 2 | ✅ Complete | StorageService |
| **Emails** | **0** | **❌ Missing** | **Need to add** |
| **TOTAL** | **83 + ~20** | **80% Complete** | |

### Files by Status

| Status | Count | Files |
|--------|-------|-------|
| ✅ Complete & Correct | 5 | Core storage files |
| ✅ Complete but bypassed | 6 | Module services using direct DB |
| ❌ Missing operations | 1 | Email operations |
| ⚠️ Needs binding | 1 | deal.service.ts |

---

## ACTION ITEMS

### Priority 1: Fix Architectural Violation (6 hours)
- [ ] Refactor customer.service.ts to use StorageService
- [ ] Refactor vehicle.service.ts to use StorageService
- [ ] Refactor inventory.service.ts to use StorageService
- [ ] Refactor stock-number.service.ts to use StorageService

### Priority 2: Add Email Operations (4 hours)
- [ ] Design email operation interface
- [ ] Implement 15-20 email methods in StorageService
- [ ] Add to IStorage interface
- [ ] Add tenant isolation

### Priority 3: Complete Email Migration (2 hours)
- [ ] Refactor email.service.ts to use StorageService
- [ ] Refactor queue.service.ts to use StorageService

### Priority 4: Testing (2 hours)
- [ ] Integration tests for all modules
- [ ] Verify tenant isolation
- [ ] Performance benchmarks

---

**Inventory prepared by:** Database Architect Agent
**Date:** November 21, 2025
**Next update:** After module refactoring
