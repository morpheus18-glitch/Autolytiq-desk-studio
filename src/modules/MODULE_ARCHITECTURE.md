# Module Architecture Guide

## Overview

The Autolytiq codebase uses a **modular monolith** architecture where code is organized into isolated, self-contained modules with clear boundaries and public APIs.

## Core Principles

### 1. Encapsulation
- Each module exposes a **single public API** (`index.ts`)
- Internal implementation details are NOT exported
- Modules are like npm packages - you only see what's exported

### 2. Dependency Rules
```
✅ Allowed imports:
- @/modules/moduleName (public API only)
- @/core/* (shared utilities)
- @shared/models (domain models)
- External libraries (npm packages)

❌ Forbidden imports:
- @/modules/otherModule/services/* (internals)
- @/modules/otherModule/components/* (internals)
- ../../../ (relative imports outside module)
- Circular dependencies between modules
```

### 3. Unidirectional Dependencies
```
CLIENT MODULES (UI Layer)
    ↓
SERVER MODULES (API/Service Layer)
    ↓
CORE UTILITIES (Shared Layer)
    ↓
SHARED MODELS (Domain Layer)
```

## Module Structure

Every module follows this structure:

```
modules/
  /moduleName/
    /api/              # API routes (Express)
    /components/       # React components
    /hooks/            # React hooks
    /services/         # Business logic
    /types/            # TypeScript types
    /utils/            # Module-specific utilities
    index.ts           # PUBLIC API - only this is importable
    README.md          # Module documentation
```

## Existing Modules

### ✅ Auth Module
**Purpose:** Authentication and authorization

**Public API:**
```typescript
import {
  AuthService,
  requireAuth,
  requireRole,
  useAuth,
} from '@/modules/auth';
```

**Responsibilities:**
- User authentication (login/logout)
- Session management
- Password hashing and reset
- 2FA/MFA
- Role-based access control

### ✅ Deal Module
**Purpose:** Deal management and calculations

**Public API:**
```typescript
import {
  DealService,
  DealCalculatorService,
  createDealRouter,
} from '@/modules/deal';
```

**Responsibilities:**
- Deal creation and updates
- Deal calculations
- State transitions
- Optimistic locking

### ✅ Tax Module
**Purpose:** Tax calculations

**Public API:**
```typescript
import { TaxService } from '@/modules/tax';
```

**Responsibilities:**
- Sales tax calculations
- Jurisdiction lookups
- State-specific tax rules

## Module Integration

### Server-Side Integration

```typescript
// server/index.ts
import { AuthService, createAuthRouter } from '@/modules/auth';
import { DealService, createDealRouter } from '@/modules/deal';
import { TaxService } from '@/modules/tax';
import { createAuthStorageAdapter, createDealStorageAdapter } from '@/core/adapters';
import { storage } from './storage';

// Create adapters
const authStorage = createAuthStorageAdapter(storage);
const dealStorage = createDealStorageAdapter(storage);
const taxStorage = createTaxStorageAdapter(storage);

// Create services
const authService = new AuthService(authStorage);
const taxService = new TaxService(taxStorage);
const dealCalculator = new DealCalculatorService();
const dealService = new DealService(dealStorage, dealCalculator);

// Mount routes
app.use('/api/auth', createAuthRouter(authService, storage));
app.use('/api/deals', createDealRouter(dealService, requireAuth, requireRole));
```

### Client-Side Integration

```typescript
// client/src/App.tsx
import { useAuth } from '@/modules/auth';

function App() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard user={user} />;
}
```

## Migration Strategy

### Phase 1: Core Modules (COMPLETED ✅)
- ✅ Auth module
- ✅ Deal module
- ✅ Tax module

### Phase 2: Supporting Modules (NEXT)
- ⏳ Customer module
- ⏳ Email module
- ⏳ Vehicle module

### Phase 3: Update Imports
- ⏳ Update server routes to use modules
- ⏳ Update client components to use modules
- ⏳ Remove old scattered files

### Phase 4: Enforcement
- ⏳ ESLint rules to prevent boundary violations
- ⏳ Integration tests for module contracts
- ⏳ CI/CD checks

## ESLint Rules

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@/modules/*/services/*", "@/modules/*/api/*", "@/modules/*/components/*"],
            "message": "Import from module's public API (@/modules/moduleName) instead"
          },
          {
            "group": ["../../../*"],
            "message": "Use absolute imports (@/) instead of deep relative imports"
          }
        ]
      }
    ]
  }
}
```

## Testing Modules

### Unit Tests
```typescript
import { AuthService } from '@/modules/auth';
import { mockStorage } from '@/core/test-utils';

describe('AuthService', () => {
  const authService = new AuthService(mockStorage);

  it('should authenticate valid user', async () => {
    const result = await authService.login({
      username: 'test',
      password: 'password123',
    });
    expect(result.user).toBeDefined();
  });
});
```

### Integration Tests
```typescript
import request from 'supertest';
import { app } from './server';

describe('Auth API', () => {
  it('should login successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Benefits

### 1. Isolation
- Changes in one module don't break others
- Easy to understand module boundaries
- Clear ownership of code

### 2. Testability
- Modules can be tested independently
- Easy to mock dependencies
- Integration tests verify contracts

### 3. Maintainability
- Easy to locate code (it's in the right module)
- No spaghetti imports
- Refactoring is safer

### 4. Scalability
- New developers understand module structure quickly
- Modules can be extracted to microservices later
- Team can work on different modules in parallel

## Breaking Changes Prevented

The modular architecture prevents these common issues:

❌ **Before:** Changing auth logic broke email system
✅ **After:** Auth module is isolated, email imports auth API

❌ **Before:** Deal calculations scattered across 10 files
✅ **After:** Deal calculations in DealCalculatorService

❌ **Before:** Tax logic mixed with deal logic
✅ **After:** Deal module imports Tax module API

❌ **Before:** Any file could access database directly
✅ **After:** Modules use storage adapters

## Next Steps

1. **Migrate remaining code** to modules (customer, email, vehicle)
2. **Enable ESLint rules** to enforce boundaries
3. **Add integration tests** for critical flows
4. **Update documentation** as modules evolve
5. **Train team** on module architecture

## Questions?

See individual module READMEs:
- `/src/modules/auth/README.md`
- `/src/modules/deal/README.md`
- `/src/modules/tax/README.md`
