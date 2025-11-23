# Module Documentation Index

**Last Updated:** 2025-11-22

This directory contains documentation for each domain module in the Autolytiq system.

## Module Overview

### 👥 [Customer Module](./customer/)
**Status:** ✅ Complete and Migrated

Customer relationship management, contact information, credit applications, and customer lifecycle.

**Key Documents:**
- [Customer Module Quick Reference](./customer/CUSTOMER_MODULE_QUICK_REFERENCE.md)
- [Customer Module Migration Complete](./customer/CUSTOMER_MODULE_MIGRATION_COMPLETE.md)
- [Customer Service Migration Examples](./customer/CUSTOMER_SERVICE_MIGRATION_EXAMPLES.md)
- [Customer Routes Migration Report](./customer/CUSTOMER_ROUTES_MIGRATION_REPORT.md)

**Files:** 7 documents

---

### 🚗 [Deal Module](./deal/)
**Status:** ✅ Complete and Bulletproofed

Deal creation, calculations, financing, trade-ins, and deal lifecycle management.

**Key Documents:**
- [Deal Creation Quick Reference](./deal/DEAL_CREATION_QUICK_REFERENCE.md)
- [Deal Creation Bulletproof Summary](./deal/DEAL_CREATION_BULLETPROOF_SUMMARY.md)
- [Deal Calculation Bulletproof Delivery](./deal/DEAL_CALCULATION_BULLETPROOF_DELIVERY.md)
- [Atomic Deal Creation Guide](./deal/ATOMIC_DEAL_CREATION_GUIDE.md)
- [Quick Start Deal Calculations](./deal/QUICK_START_DEAL_CALCULATIONS.md)

**Files:** 11 documents

---

### 📧 [Email Module](./email/)
**Status:** ✅ Complete with Advanced Features

Email integration, threading, templates, inbox sync, and security.

**Key Documents:**
- [Email Module Summary](./email/EMAIL_MODULE_SUMMARY.md)
- [Email Integration Quick Start](./email/EMAIL_INTEGRATION_QUICK_START.md)
- [Email Setup Guide](./email/EMAIL_SETUP_GUIDE.md)
- [Email UI Guide](./email/EMAIL_UI_GUIDE.md)
- [Email Routes Quick Reference](./email/EMAIL_ROUTES_QUICK_REFERENCE.md)
- [Inbox Sync Setup](./email/INBOX_SYNC_SETUP.md)

**Files:** 13 documents

---

### 💰 [Tax Module](./tax/)
**Status:** ✅ Complete with Local Tax Support

Tax calculations, state/local tax rules, tax engine integration.

**Key Documents:**
- [Tax System Summary](./tax/TAX-SYSTEM-SUMMARY.md)
- [Tax API Documentation](./tax/TAX_API_DOCUMENTATION.md)
- [Tax Module API Reference](./tax/TAX_MODULE_API_REFERENCE.md)
- [Local Tax Implementation Summary](./tax/LOCAL_TAX_IMPLEMENTATION_SUMMARY.md)
- [Quick Start Local Tax](./tax/QUICK_START_LOCAL_TAX.md)

**Files:** 8 documents

---

### 🚙 [Vehicle Module](./vehicle/)
**Status:** ✅ Complete and Migrated

Vehicle inventory, VIN lookup, pricing, specifications, and history.

**Key Documents:**
- [Vehicle Migration Quick Reference](./vehicle/VEHICLE_MIGRATION_QUICK_REFERENCE.md)
- [Vehicle Module Completion Report](./vehicle/VEHICLE_MODULE_COMPLETION_REPORT.md)
- [Vehicle Services Storage Migration Report](./vehicle/VEHICLE_SERVICES_STORAGE_MIGRATION_REPORT.md)

**Files:** 4 documents

---

### 📊 [Reporting Module](./reporting/)
**Status:** ⏳ Planned (not yet implemented)

Analytics, dashboards, and reporting capabilities.

**Key Documents:**
- [Reporting Module Summary](./reporting/REPORTING_MODULE_SUMMARY.md)

**Files:** 1 document

---

## Module Architecture Principles

All modules follow these architectural principles:

### 1. **Public API Contract**
Each module exposes a clean, typed public API through an `index.ts` file.

```typescript
// Example: src/modules/customer/index.ts
export { CustomerService } from './customer.service'
export type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.types'
```

### 2. **Internal Encapsulation**
Implementation details are kept private within the module directory.

### 3. **Database Isolation**
All database operations go through the storage service layer (`src/core/database/storage.service.ts`).

### 4. **Type Safety**
Full TypeScript strict mode with Zod schemas for runtime validation.

### 5. **Multi-Tenancy**
All operations are tenant-scoped through the storage service.

### 6. **Testing**
Integration tests validate module behavior and API contracts.

---

## Module Integration Guide

### Importing a Module

```typescript
// ✅ CORRECT: Import from module public API
import { CustomerService } from '@/modules/customer'

// ❌ WRONG: Don't import from internal files
import { CustomerService } from '@/modules/customer/customer.service'
```

### Using Module Services

```typescript
// All module services follow this pattern:
const customer = await CustomerService.getById(customerId, tenantId)
const deal = await DealService.create(createDealDTO, tenantId)
const taxCalc = await TaxService.calculateTax(dealId, tenantId)
```

### Multi-Tenancy Enforcement

All module operations require `tenantId`:

```typescript
// Row-level security automatically enforced
const customers = await CustomerService.list(filters, tenantId)
// Returns only customers for the specified tenant
```

---

## Quick References by Module

### Customer Module
- **CRUD Operations:** `CustomerService.{create, getById, update, delete}`
- **Search:** `CustomerService.search(query, tenantId)`
- **Credit Apps:** `CustomerService.submitCreditApp(customerId, data, tenantId)`

### Deal Module
- **Deal Lifecycle:** `DealService.{create, update, finalize, archive}`
- **Calculations:** `DealService.calculatePricing(dealId, tenantId)`
- **Trade-Ins:** `DealService.addTradeIn(dealId, tradeInData, tenantId)`

### Email Module
- **Send Email:** `EmailService.send(emailData, tenantId)`
- **Threading:** `EmailService.getThread(threadId, tenantId)`
- **Templates:** `EmailService.applyTemplate(templateId, variables, tenantId)`

### Tax Module
- **Calculate Tax:** `TaxService.calculateTax(dealId, tenantId)`
- **Local Tax:** `TaxService.getLocalTaxRates(zipCode)`
- **Breakdown:** `TaxService.getTaxBreakdown(calculationId, tenantId)`

### Vehicle Module
- **VIN Lookup:** `VehicleService.lookupVIN(vin)`
- **Pricing:** `VehicleService.getPricing(vehicleId, tenantId)`
- **Inventory:** `VehicleService.listInventory(filters, tenantId)`

---

## Module Development Workflow

### Creating a New Module

1. **Create Module Structure**
   ```
   src/modules/<module-name>/
     ├── index.ts              # Public API
     ├── <module>.service.ts   # Business logic
     ├── <module>.types.ts     # TypeScript types
     ├── <module>.schema.ts    # Zod schemas
     └── __tests__/
         └── <module>.test.ts  # Integration tests
   ```

2. **Define Domain Types**
   - Create Zod schemas for validation
   - Export TypeScript types
   - Define DTOs for create/update operations

3. **Implement Service**
   - Use storage service for database operations
   - Enforce multi-tenancy on all operations
   - Add comprehensive error handling

4. **Write Tests**
   - Test all public API methods
   - Test multi-tenancy enforcement
   - Test validation and error cases

5. **Document the Module**
   - Create module README in this directory
   - Add quick reference guide
   - Document API endpoints (if applicable)

### Module Migration Checklist

- [ ] Move business logic to module service
- [ ] Replace direct DB calls with storage service
- [ ] Add multi-tenancy enforcement
- [ ] Create Zod schemas for validation
- [ ] Write integration tests
- [ ] Update route handlers to use module service
- [ ] Document public API
- [ ] Add quick reference guide

---

## Module Dependencies

### Dependency Graph

```
Customer Module  ──────────┐
                           │
Deal Module  ──────────────┼──> Storage Service ──> Database
  │                        │
  ├──> Tax Module  ────────┤
  └──> Vehicle Module  ────┘

Email Module  ─────────────┘
```

### Allowed Dependencies

- **All Modules** → Storage Service (required)
- **Deal Module** → Tax Module (for calculations)
- **Deal Module** → Vehicle Module (for inventory)
- **No circular dependencies** (enforced by ESLint)

---

## Migration Status

| Module | Status | Files | Tests | Documentation |
|--------|--------|-------|-------|---------------|
| Customer | ✅ Complete | 7 | ✅ | ✅ Complete |
| Deal | ✅ Complete | 11 | ✅ | ✅ Complete |
| Email | ✅ Complete | 13 | ✅ | ✅ Complete |
| Tax | ✅ Complete | 8 | ✅ | ✅ Complete |
| Vehicle | ✅ Complete | 4 | ✅ | ✅ Complete |
| Reporting | ⏳ Planned | 1 | ❌ | ⏳ Partial |

---

**Back to:** [Documentation Index](../README.md)
