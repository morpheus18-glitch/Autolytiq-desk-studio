# COMPLETE SYSTEMATIC MIGRATION PLAN
**Date:** November 20, 2025
**Status:** ACTIVE - Full Codebase Transformation
**Orchestrator:** Project Orchestrator Agent
**Scope:** 408 TypeScript files → 100% strict framework compliance

---

## EXECUTIVE SUMMARY

### Current State Analysis
**Codebase Inventory:**
- **408 total TypeScript files** (213 client, 47 server, 16 new modules, 132 shared/config)
- **184 React components** requiring UI pattern migration
- **45 server modules** requiring database service integration
- **10 files with 'any' types** in new module system (down from 63)
- **168 files** not using design tokens (95% of frontend)
- **27 page files** with copy-pasted layout code

**Framework Established:**
- ✅ Module architecture (auth, deal, tax modules complete)
- ✅ TypeScript strict mode configuration
- ✅ ESLint with architectural enforcement
- ✅ Design tokens defined (`/client/src/lib/design-tokens.ts`)
- ✅ Core UI components created
- ✅ Database layer abstraction started

**The Gap:**
- ❌ Old code still using chaotic patterns
- ❌ Direct database queries scattered in 45 server files
- ❌ UI components ignoring design system
- ❌ No module boundaries in legacy code
- ❌ Inconsistent error handling and loading states

### Migration Strategy
**Approach:** Bottom-up, dependency-ordered migration with zero breaking changes

**Timeline:** 5 phases over 7-10 days
- Phase 1: Foundation (2 days)
- Phase 2: Modules (2-3 days)
- Phase 3: UI (2-3 days)
- Phase 4: Strict Enforcement (1 day)
- Phase 5: Testing (1-2 days)

**Risk Mitigation:**
- All work on stabilization branch
- Backward compatibility maintained via adapters
- Incremental validation at each phase
- Rollback checkpoints every 6 hours

---

## PHASE 1: FOUNDATION MIGRATION (CRITICAL PATH)

**Duration:** 2 days
**Blocking:** All subsequent phases
**Agent:** Database Architect + Workhorse Engineer

### 1.1 Database Service Layer (Day 1, 8 hours)

**Current Problem:**
- Direct Drizzle ORM queries in 45 files
- No multi-tenant enforcement at database layer
- Scattered query patterns
- No transaction management

**Solution:** Migrate all queries through centralized database service

#### Files to Migrate (Priority Order):

1. **Core Storage Layer** (Foundation)
   - `/server/storage.ts` (1,424 lines) → `/src/core/database/storage.service.ts`
   - Extract interface `IStorage` → `/src/core/database/storage.interface.ts`
   - Add tenant isolation enforcement
   - Add transaction support

2. **Database Utilities** (Supporting)
   - `/server/db.ts` → `/src/core/database/connection.ts`
   - Add connection pooling configuration
   - Add health check utilities

3. **Server Services** (Consumers - 45 files)
   - `/server/calculations.ts` → Use DealCalculatorService
   - `/server/local-tax-service.ts` → Use TaxService
   - `/server/rooftop-service.ts` → Create VehicleService module
   - `/server/email-service.ts` → Create EmailService module
   - All `/server/routes/*.ts` → Use module APIs

#### Migration Pattern:

```typescript
// ❌ BEFORE: Direct database access
import { db } from './db';
import { deals } from '@shared/schema';

export async function getDeal(id: string) {
  return await db.query.deals.findFirst({
    where: eq(deals.id, id)
  });
}

// ✅ AFTER: Service layer with tenant isolation
import { DatabaseService } from '@/core/database/storage.service';

export class DealService {
  constructor(private db: DatabaseService) {}

  async getDeal(id: string, tenantId: string): Promise<Deal> {
    return await this.db.deals.findUnique({
      where: { id, dealershipId: tenantId }
    });
  }
}
```

#### Success Criteria:
- [ ] All database queries go through service layer
- [ ] Zero direct Drizzle imports outside `/src/core/database/`
- [ ] Multi-tenant isolation enforced at database level
- [ ] Transaction management available
- [ ] Integration tests pass

### 1.2 Core Utilities Migration (Day 1, 4 hours)

**Files to Migrate:**
1. `/server/auth-helpers.ts` → `/src/core/utils/crypto.ts`
2. `/server/address-validation.ts` → `/src/modules/customer/utils/address-validator.ts`
3. `/server/middleware.ts` → `/src/core/middleware/`

#### Consolidation Pattern:

```typescript
// Create /src/core/utils/index.ts as public API
export { formatCurrency, formatDate, formatPhone } from './formatters';
export { validateEmail, validatePhone, validateZip } from './validators';
export { hashPassword, comparePasswords, generateToken } from './crypto';
```

### 1.3 Type Definitions & Schemas (Day 2, 4 hours)

**Current Problem:**
- Types scattered across files
- Zod schemas missing for validation
- No single source of truth

**Solution:** Consolidate to shared types

#### Migration Tasks:

1. **Create Zod Schemas** for all entities:
   - `/shared/models/customer.model.ts` (already exists)
   - `/shared/models/deal.model.ts` (already exists)
   - Add: Vehicle, Email, Appointment, QuickQuote schemas

2. **Export Type Inference:**
```typescript
// /shared/models/customer.model.ts
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  // ... rest of fields
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CustomerSchema.omit({ id: true })>;
```

3. **Eliminate 'any' Types:**
   - `/src/modules/auth/services/auth.service.ts` (5 instances)
   - `/src/modules/deal/services/deal.service.ts` (3 instances)
   - `/server/email-routes.ts` (multiple instances)
   - Replace with proper types or `unknown` with type guards

#### Success Criteria:
- [ ] Zod schema for every entity
- [ ] Zero 'any' types in new code
- [ ] Type exports centralized
- [ ] TypeScript strict mode passes

---

## PHASE 2: MODULE MIGRATION (PARALLEL WORKSTREAMS)

**Duration:** 2-3 days
**Dependencies:** Phase 1 complete
**Agents:** Workhorse Engineer (primary) + Frontend Design Specialist (UI)

### 2.1 Customer Module (Day 3, 6 hours)

**Current State:** Scattered across multiple files
**Target:** `/src/modules/customer/`

#### Files to Migrate:

1. **Backend:**
   - `/server/routes/customers.ts` → `/src/modules/customer/api/customer.routes.ts`
   - Customer queries from `/server/storage.ts` → `/src/modules/customer/services/customer.service.ts`
   - `/server/address-validation.ts` → `/src/modules/customer/utils/address-validator.ts`

2. **Frontend:**
   - `/client/src/components/customer-*.tsx` (4 files) → `/src/modules/customer/components/`
   - `/client/src/hooks/use-customers.ts` (if exists) → `/src/modules/customer/hooks/`

3. **Types:**
   - Create `/src/modules/customer/types/customer.types.ts`
   - Include: Customer, Contact, Address, CreditApplication types

#### Public API:
```typescript
// /src/modules/customer/index.ts
export { CustomerService } from './services/customer.service';
export { createCustomerRouter } from './api/customer.routes';
export { useCustomers, useCustomer, useCreateCustomer } from './hooks';
export { CustomerForm, CustomerDetail, CustomerList } from './components';
export type { Customer, CreateCustomerInput, UpdateCustomerInput } from './types';
```

### 2.2 Email Module (Day 3, 6 hours)

**Current State:** Recently fixed but not modularized (5 fixes in 24 hours)
**Priority:** HIGH - Frequent breakage indicates poor boundaries

#### Files to Migrate:

1. **Backend:**
   - `/server/email-routes.ts` (1,247 lines) → `/src/modules/email/api/email.routes.ts`
   - `/server/email-service.ts` → `/src/modules/email/services/email.service.ts`
   - `/server/email-webhook-routes.ts` → `/src/modules/email/api/webhook.routes.ts`
   - `/server/email-config.ts` → `/src/modules/email/config/email.config.ts`
   - `/server/email-security.ts` → `/src/modules/email/utils/security.ts`

2. **Frontend:**
   - `/client/src/components/email-*.tsx` (8+ files) → `/src/modules/email/components/`
   - Email inbox, composer, thread views

3. **Types:**
   - Use existing `/shared/models/email.model.ts`
   - Add API request/response types

#### Module Structure:
```
/src/modules/email/
├── api/
│   ├── email.routes.ts      # Main CRUD operations
│   └── webhook.routes.ts     # Svix webhook handling
├── services/
│   ├── email.service.ts      # Business logic
│   ├── sync.service.ts       # Inbox synchronization
│   └── thread.service.ts     # Conversation threading
├── components/
│   ├── EmailInbox.tsx
│   ├── EmailComposer.tsx
│   ├── EmailThread.tsx
│   └── EmailList.tsx
├── hooks/
│   ├── useEmails.ts
│   ├── useEmailThread.ts
│   └── useSendEmail.ts
├── utils/
│   ├── security.ts          # XSS prevention, sanitization
│   └── formatting.ts        # Email body processing
├── types/
│   └── email.types.ts
└── index.ts                  # Public API
```

### 2.3 Vehicle Module (Day 4, 6 hours)

#### Files to Migrate:

1. **Backend:**
   - `/server/rooftop-service.ts` → `/src/modules/vehicle/services/inventory.service.ts`
   - Vehicle routes from `/server/routes.ts` → `/src/modules/vehicle/api/vehicle.routes.ts`
   - `/server/seed-vehicles.ts` → `/src/modules/vehicle/utils/seeder.ts`

2. **Frontend:**
   - VIN decoder component
   - Vehicle search/selection components
   - Inventory management components

3. **Types:**
   - Create comprehensive vehicle types
   - Include: Vehicle, VehicleSpecs, VehiclePricing, TradeIn

### 2.4 Reporting Module (Day 4, 6 hours)

**Current State:** Dashboard and metrics scattered
**Target:** `/src/modules/reporting/`

#### Components to Consolidate:

1. **Backend:**
   - Deal analytics from `/server/services/deal-analyzer.ts`
   - Revenue calculations
   - Performance metrics

2. **Frontend:**
   - Dashboard components
   - Chart components
   - Report generators

3. **Services:**
   - Create `/src/modules/reporting/services/analytics.service.ts`
   - Aggregate data from deal, customer, vehicle modules

---

## PHASE 3: UI PATTERN MIGRATION (FRONTEND TRANSFORMATION)

**Duration:** 2-3 days
**Dependencies:** Phase 2 modules available
**Agent:** Frontend Design Specialist
**Scope:** 184 React components → 100% design token compliance

### 3.1 Layout Pattern Migration (Day 5, 8 hours)

**Current Problem:**
- 27 page files with copy-pasted layout code
- Inconsistent spacing and structure
- No reusable layout components

**Solution:** Migrate all pages to standard pattern

#### Files to Migrate (All Pages):

**Dashboard & Home:**
1. `/client/src/pages/dashboard.tsx`
2. `/client/src/pages/home.tsx`

**Deal Management:**
3. `/client/src/pages/deals-list.tsx`
4. `/client/src/pages/deal-details.tsx`
5. `/client/src/pages/kanban.tsx`
6. `/client/src/pages/scenarios.tsx`

**Customer Management:**
7. `/client/src/pages/customers.tsx`
8. `/client/src/pages/customer-details.tsx`

**Vehicle Management:**
9. `/client/src/pages/inventory.tsx`
10. `/client/src/pages/vehicle-details.tsx`

**Financial:**
11. `/client/src/pages/quick-quotes.tsx`
12. `/client/src/pages/lenders.tsx`
13. `/client/src/pages/rate-requests.tsx`

**Reporting:**
14. `/client/src/pages/reports.tsx`
15. `/client/src/pages/analytics.tsx`

**Email:**
16. `/client/src/pages/inbox.tsx`
17. `/client/src/pages/email-settings.tsx`

**Admin:**
18. `/client/src/pages/settings.tsx`
19. `/client/src/pages/users.tsx`
20. `/client/src/pages/dealership-settings.tsx`

**Other:**
21-27. Auth pages, profile, help, etc.

#### Migration Pattern:

```tsx
// ❌ BEFORE: Copy-pasted layout
export default function DealsPage() {
  return (
    <PageLayout>
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <h1 className="text-2xl font-bold">Deals</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Content */}
        </div>
      </div>
    </PageLayout>
  );
}

// ✅ AFTER: Standard pattern
import { PageHeader, PageContent, Section } from '@/components/core';
import { gridLayouts } from '@/lib/design-tokens';

export default function DealsPage() {
  const { data: deals, isLoading, error } = useDeals();

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle="Manage all vehicle deals"
        icon={<FileText />}
        actions={<Button>New Deal</Button>}
      />

      <PageContent>
        <Section>
          {isLoading && <LoadingState message="Loading deals..." />}
          {error && <ErrorState message={error.message} onRetry={refetch} />}

          {deals && (
            <div className={gridLayouts.threeCol}>
              {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
            </div>
          )}
        </Section>
      </PageContent>
    </>
  );
}
```

#### Automated Migration Script:

Create `/scripts/migrate-page-layout.ts`:
```typescript
// Script to automatically migrate pages to new pattern
// - Detects page header
// - Replaces with <PageHeader>
// - Wraps content in <PageContent>
// - Replaces grid classes with gridLayouts tokens
```

### 3.2 Component Pattern Migration (Day 6, 8 hours)

**Scope:** 184 React components

#### Categories to Migrate:

**1. Card Components (32 files):**
- Replace hardcoded classes with `premiumCardClasses`
- Ensure consistent hover effects
- Add dark mode support

**2. Form Components (24 files):**
- Migrate to react-hook-form
- Add Zod validation schemas
- Use enhanced field components (EmailField, PhoneField, etc.)

**3. List/Table Components (18 files):**
- Add consistent loading skeletons
- Add empty states
- Standardize pagination

**4. Modal/Dialog Components (15 files):**
- Already consistent (shadcn Dialog)
- Add loading states to submit buttons
- Add confirmation dialogs where needed

**5. Status/Badge Components (28 files):**
- Replace hardcoded colors with `getDealStateColor()` and similar
- Use semantic color tokens

#### Migration Checklist (Per Component):

```markdown
- [ ] Replace container padding with `containerPadding`
- [ ] Replace grid classes with `gridLayouts.*`
- [ ] Replace card classes with `premiumCardClasses`
- [ ] Replace status badges with `getDealStateColor()`
- [ ] Add loading state with `<LoadingState>`
- [ ] Add error state with `<ErrorState>`
- [ ] Replace button loading with `<LoadingButton>`
- [ ] Use form fields from `@/components/core/form-fields`
- [ ] Ensure Zod validation on forms
- [ ] Add toast notifications for mutations
```

### 3.3 Design Token Enforcement (Day 7, 4 hours)

**Goal:** 100% of components use design tokens

#### Validation Script:

Create `/scripts/validate-design-tokens.ts`:
```typescript
// Scans all .tsx files for:
// - Hardcoded spacing: p-6, gap-4, etc.
// - Hardcoded colors: bg-blue-500, etc.
// - Grid patterns without gridLayouts
// - Card patterns without premiumCardClasses
// Generates report of violations
```

#### ESLint Rules to Add:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "JSXAttribute[name.name='className'] Literal[value=/p-[0-9]/]",
        "message": "Use design tokens (cardSpacing, layoutSpacing) instead of hardcoded padding"
      },
      {
        "selector": "JSXAttribute[name.name='className'] Literal[value=/grid grid-cols/]",
        "message": "Use gridLayouts design tokens instead of hardcoded grid classes"
      }
    ]
  }
}
```

---

## PHASE 4: TYPESCRIPT STRICT ENFORCEMENT (TYPE SAFETY)

**Duration:** 1 day
**Dependencies:** Phases 1-3 complete
**Agent:** Workhorse Engineer + Algorithm Logic Guru

### 4.1 Eliminate Remaining 'any' Types (Day 8, 6 hours)

**Current Violations:** 10 files with 'any' types in new modules

#### Files to Fix:

1. `/src/modules/auth/services/auth.service.ts` (5 instances)
   - Session types
   - Passport strategy types
   - Express request extensions

2. `/src/modules/deal/services/deal.service.ts` (3 instances)
   - Calculation intermediate values
   - Dynamic field access

3. `/src/core/adapters/storage.adapter.ts` (2 instances)
   - Generic adapter patterns

4. `/server/email-routes.ts` (multiple instances)
   - Webhook payload types
   - Email API responses

#### Replacement Patterns:

```typescript
// ❌ BEFORE
function processWebhook(payload: any) {
  return payload.data;
}

// ✅ AFTER: Unknown with type guard
interface WebhookPayload {
  data: {
    type: string;
    attributes: Record<string, unknown>;
  };
}

function processWebhook(payload: unknown): WebhookPayload['data'] {
  if (!isWebhookPayload(payload)) {
    throw new Error('Invalid webhook payload');
  }
  return payload.data;
}

function isWebhookPayload(value: unknown): value is WebhookPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    typeof (value as any).data === 'object'
  );
}
```

### 4.2 Enable Strict Mode Project-Wide (Day 8, 2 hours)

#### Steps:

1. **Update tsconfig.json:**
```json
{
  "extends": "./tsconfig.strict.json",
  "compilerOptions": {
    // All strict options now enabled
  }
}
```

2. **Fix Strict Null Check Violations:**
   - Add null checks where needed
   - Use optional chaining
   - Use nullish coalescing

3. **Fix Unused Variables:**
   - Remove or prefix with underscore
   - Fix exhaustive dependency arrays

4. **Run Type Check:**
```bash
npm run typecheck
# Should pass with ZERO errors
```

### 4.3 API Response Type Safety (Day 8, 4 hours)

**Goal:** Every API call has typed response

#### Pattern:

```typescript
// Define response types
type GetDealsResponse = {
  deals: Deal[];
  total: number;
  page: number;
};

// Use in query
export function useDeals() {
  return useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      return await apiRequest<GetDealsResponse>('GET', '/api/deals');
    },
  });
}

// Validate with Zod at runtime
const GetDealsResponseSchema = z.object({
  deals: z.array(DealSchema),
  total: z.number(),
  page: z.number(),
});

// In API route
app.get('/api/deals', async (req, res) => {
  const response = { /* ... */ };
  const validated = GetDealsResponseSchema.parse(response);
  res.json(validated);
});
```

---

## PHASE 5: TESTING & VALIDATION (QUALITY ASSURANCE)

**Duration:** 1-2 days
**Dependencies:** Phases 1-4 complete
**Agents:** Grandmaster Debugger + All agents for E2E

### 5.1 Integration Tests (Day 9, 8 hours)

**Target:** 80% coverage of critical paths

#### Test Categories:

**1. Authentication Flow:**
```typescript
// /tests/integration/auth.test.ts
describe('Authentication Flow', () => {
  it('should register, login, and access protected route', async () => {
    // Register new user
    const user = await createTestUser();

    // Login
    const session = await login(user.username, user.password);

    // Access protected route
    const response = await apiRequest('GET', '/api/deals', {
      headers: { Cookie: session.cookie }
    });

    expect(response.status).toBe(200);
  });

  it('should enforce multi-tenant isolation', async () => {
    const tenant1Deal = await createDeal(tenant1User);
    const tenant2User = await createTestUser({ dealershipId: 'tenant2' });

    const response = await apiRequest('GET', `/api/deals/${tenant1Deal.id}`, {
      headers: { Cookie: tenant2User.session.cookie }
    });

    expect(response.status).toBe(404); // Should not see other tenant's data
  });
});
```

**2. Deal Creation Flow:**
```typescript
describe('Deal Creation Flow', () => {
  it('should create deal with customer, vehicle, and tax calculation', async () => {
    // Create customer
    const customer = await createCustomer({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    // Create vehicle
    const vehicle = await createVehicle({
      vin: '1HGCM82633A123456',
      make: 'Honda',
      model: 'Accord',
    });

    // Calculate tax
    const taxCalc = await calculateTax({
      zipCode: '90210',
      vehiclePrice: 25000,
      tradeInValue: 5000,
    });

    // Create deal
    const deal = await createDeal({
      customerId: customer.id,
      vehicleId: vehicle.id,
      taxCalculationId: taxCalc.id,
    });

    expect(deal.dealState).toBe('DRAFT');
    expect(deal.totalAmount).toBe(taxCalc.totalAmount);
  });
});
```

**3. Email System Integration:**
```typescript
describe('Email System', () => {
  it('should send email and track in database', async () => {
    const email = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      body: 'Test content',
    });

    expect(email.id).toBeDefined();
    expect(email.direction).toBe('OUTBOUND');

    // Verify stored in database
    const stored = await getEmail(email.id);
    expect(stored).toBeDefined();
  });

  it('should prevent XSS in email body', async () => {
    const maliciousBody = '<script>alert("xss")</script>';

    const email = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test',
      body: maliciousBody,
    });

    expect(email.sanitizedBody).not.toContain('<script>');
  });
});
```

### 5.2 End-to-End Tests (Day 9, 4 hours)

**Tool:** Playwright or Puppeteer

#### Critical User Journeys:

1. **Sales Manager Journey:**
   - Login → Dashboard → Create Deal → Add Customer → Add Vehicle → Calculate Tax → Submit for Approval

2. **Finance Manager Journey:**
   - Login → Deals List → Review Deal → Approve → Add Financing → Calculate Payment → Send to Customer

3. **Salesperson Journey:**
   - Login → Quick Quote → Enter Customer Info → Select Vehicle → Get Payment Estimate → Convert to Deal

### 5.3 Performance Validation (Day 10, 4 hours)

#### Benchmarks:

**Frontend Performance:**
```typescript
describe('Frontend Performance', () => {
  it('should have TTI < 1.5s', async () => {
    const metrics = await measurePageLoad('/dashboard');
    expect(metrics.timeToInteractive).toBeLessThan(1500);
  });

  it('should have bundle size < 500KB', async () => {
    const bundle = await analyzeBundleSize();
    expect(bundle.mainChunkSize).toBeLessThan(500 * 1024);
  });
});
```

**Backend Performance:**
```typescript
describe('API Performance', () => {
  it('should respond in < 100ms for list endpoints', async () => {
    const start = Date.now();
    await apiRequest('GET', '/api/deals');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      apiRequest('GET', '/api/deals')
    );

    const results = await Promise.all(requests);
    expect(results.every(r => r.status === 200)).toBe(true);
  });
});
```

### 5.4 Module Boundary Validation (Day 10, 2 hours)

**Automated Checks:**

```typescript
// /scripts/validate-module-boundaries.ts
describe('Module Boundaries', () => {
  it('should have no circular dependencies', async () => {
    const graph = await buildDependencyGraph();
    const cycles = detectCycles(graph);

    expect(cycles).toHaveLength(0);
  });

  it('should only import from module public APIs', async () => {
    const violations = await findImportViolations([
      'src/modules/*/services/**',
      'src/modules/*/api/**',
      'src/modules/*/components/**',
    ]);

    expect(violations).toHaveLength(0);
  });

  it('should enforce multi-tenant isolation in all queries', async () => {
    const queries = await findDatabaseQueries();
    const unscoped = queries.filter(q => !q.includesTenantFilter);

    expect(unscoped).toHaveLength(0);
  });
});
```

### 5.5 Final Validation Checklist (Day 10, 2 hours)

```markdown
## Code Quality
- [ ] Zero 'any' types in codebase
- [ ] Zero ESLint errors
- [ ] Zero TypeScript errors
- [ ] Zero circular dependencies
- [ ] Zero linting warnings

## Architecture
- [ ] All database queries through service layer
- [ ] All modules have public API exports
- [ ] All imports use module public APIs
- [ ] All components use design tokens
- [ ] All forms use react-hook-form + Zod

## Testing
- [ ] Integration tests pass (auth, deals, email)
- [ ] E2E tests pass (critical journeys)
- [ ] Performance benchmarks met (TTI < 1.5s, API < 100ms)
- [ ] Test coverage > 80% for critical paths

## Security
- [ ] Multi-tenant isolation enforced
- [ ] XSS prevention in email system
- [ ] SQL injection prevented (using ORM)
- [ ] Authentication required on protected routes
- [ ] Input validation on all API endpoints

## User Experience
- [ ] Consistent loading states
- [ ] Consistent error handling
- [ ] Toast notifications for actions
- [ ] Responsive layouts on all pages
- [ ] Dark mode support throughout

## Documentation
- [ ] All modules documented
- [ ] Migration guide complete
- [ ] Pattern guide updated
- [ ] API documentation generated
- [ ] Onboarding guide created
```

---

## EXECUTION STRATEGY

### Agent Coordination

**Phase 1: Foundation**
- **Primary:** Database Architect
- **Support:** Workhorse Engineer
- **Deliverable:** Centralized database service, core utilities

**Phase 2: Modules**
- **Primary:** Workhorse Engineer
- **Support:** Algorithm Logic Guru (business logic)
- **Deliverable:** Customer, Email, Vehicle, Reporting modules

**Phase 3: UI**
- **Primary:** Frontend Design Specialist
- **Support:** Workhorse Engineer (component logic)
- **Deliverable:** All 184 components using design patterns

**Phase 4: Types**
- **Primary:** Workhorse Engineer
- **Support:** Algorithm Logic Guru (type inference)
- **Deliverable:** Zero 'any' types, full type safety

**Phase 5: Testing**
- **Primary:** Grandmaster Debugger
- **Support:** All agents (E2E testing)
- **Deliverable:** Comprehensive test suite, validation report

### Daily Checkpoints

**Every 4 hours:**
1. Run validation suite
2. Check for breaking changes
3. Update progress tracking
4. Create rollback checkpoint

**Every 24 hours:**
1. Full integration test run
2. Performance benchmark
3. Code review of day's work
4. Update CLAUDE.md with progress

### Risk Mitigation

**Backward Compatibility:**
- Old imports continue to work via re-exports
- Adapter pattern bridges old and new code
- Gradual migration, not big bang

**Example:**
```typescript
// /server/storage.ts (old location)
// Re-export from new location during transition
export * from '@/core/database/storage.service';

// After migration complete, this file can be deleted
```

**Rollback Strategy:**
- Git checkpoint every 6 hours
- Database migration rollback scripts
- Feature flags for new modules

**Communication Protocol:**
- Update CLAUDE.md every 4 hours
- Flag blockers immediately
- Daily summary report

---

## SUCCESS CRITERIA

### Phase Completion Criteria

**Phase 1 Complete When:**
- [ ] All database queries use service layer
- [ ] Zero direct Drizzle imports outside core
- [ ] Core utilities consolidated
- [ ] Integration tests pass

**Phase 2 Complete When:**
- [ ] Customer module complete and tested
- [ ] Email module complete and tested
- [ ] Vehicle module complete and tested
- [ ] Reporting module complete and tested
- [ ] All modules have public APIs

**Phase 3 Complete When:**
- [ ] All 27 pages use PageHeader/PageContent
- [ ] All 184 components use design tokens
- [ ] Zero hardcoded spacing/colors
- [ ] UI validation script passes

**Phase 4 Complete When:**
- [ ] Zero 'any' types in codebase
- [ ] TypeScript strict mode enabled
- [ ] All API responses typed
- [ ] Type check passes with zero errors

**Phase 5 Complete When:**
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance benchmarks met
- [ ] Module boundaries validated
- [ ] Final checklist 100% complete

### Project Success Criteria

**The migration is complete when:**
1. ✅ **Zero architectural violations** - ESLint passes
2. ✅ **Zero type safety issues** - TypeScript strict passes
3. ✅ **Zero breaking changes** - All tests pass
4. ✅ **100% pattern compliance** - All components use design tokens
5. ✅ **Module boundaries enforced** - All imports through public APIs
6. ✅ **Multi-tenant isolation** - All queries scoped to tenant
7. ✅ **Performance maintained** - Benchmarks met
8. ✅ **Documentation complete** - All patterns documented

---

## NEXT STEPS

**Immediate Actions (Next 30 minutes):**
1. Review and approve this migration plan
2. Create stabilization branch (if not exists)
3. Set up validation infrastructure
4. Assign agents to phases

**Phase 1 Kickoff (Next 2 hours):**
1. Database Architect begins storage service migration
2. Create `/src/core/database/storage.service.ts`
3. Begin migrating `/server/storage.ts`
4. First checkpoint after 4 hours

**Coordination:**
- Project Orchestrator monitors all phases
- Daily standup at start of work
- Checkpoint reviews every 4 hours
- Blockers escalated immediately

---

**Built by:** Project Orchestrator Agent
**Date:** November 20, 2025
**Status:** READY FOR EXECUTION
**Confidence:** HIGH - Plan is comprehensive, risk-mitigated, and validated
