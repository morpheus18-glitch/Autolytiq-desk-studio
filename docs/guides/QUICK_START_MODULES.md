# Quick Start: Using Modular Architecture

**TL;DR:** Import from `@/modules/moduleName`, use services for business logic, use middleware for auth.

## 5-Minute Crash Course

### Rule #1: Import Only from Public APIs

```typescript
// ✅ CORRECT
import { AuthService, requireAuth } from '@/modules/auth';
import { DealService } from '@/modules/deal';
import { TaxService } from '@/modules/tax';

// ❌ WRONG - Will fail ESLint
import { AuthService } from '@/modules/auth/services/auth.service';
import { DealService } from 'src/modules/deal/services/deal.service';
```

### Rule #2: Use Services for Business Logic

```typescript
// ❌ WRONG - Business logic in route
app.post('/api/deals', async (req, res) => {
  const deal = await db.insert('deals', req.body);
  const tax = vehiclePrice * 0.07;
  res.json({ deal, tax });
});

// ✅ CORRECT - Service handles logic
app.post('/api/deals', requireAuth, async (req, res) => {
  try {
    const deal = await dealService.createDeal(req.body, req.user.id);
    res.json(deal);
  } catch (error) {
    if (error instanceof DealError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### Rule #3: Use Middleware for Auth

```typescript
// ❌ WRONG - Manual auth checks
app.get('/api/deals', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('Not authenticated');
  }
  if (req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  // ... handler
});

// ✅ CORRECT - Use middleware
app.get('/api/deals', requireAuth, requireRole('admin'), async (req, res) => {
  // ... handler
});
```

## Server Setup (10 minutes)

```typescript
// server/index.ts
import { Express } from 'express';
import {
  AuthService,
  createAuthRouter,
  requireAuth,
  requireRole,
} from '@/modules/auth';
import { DealService, DealCalculatorService, createDealRouter } from '@/modules/deal';
import { TaxService } from '@/modules/tax';
import {
  createAuthStorageAdapter,
  createDealStorageAdapter,
  createTaxStorageAdapter,
} from '@/core/adapters/storage.adapter';
import { storage } from './storage';

export function setupModules(app: Express) {
  // 1. Create adapters
  const authStorage = createAuthStorageAdapter(storage);
  const dealStorage = createDealStorageAdapter(storage);
  const taxStorage = createTaxStorageAdapter(storage);

  // 2. Create services
  const authService = new AuthService(authStorage);
  const taxService = new TaxService(taxStorage);
  const dealCalculator = new DealCalculatorService();
  const dealService = new DealService(dealStorage, dealCalculator);

  // 3. Mount routes
  app.use('/api/auth', createAuthRouter(authService, storage));
  app.use('/api/deals', createDealRouter(dealService, requireAuth, requireRole));

  // 4. Return for use elsewhere
  return { authService, dealService, taxService, requireAuth, requireRole };
}
```

## Client Setup (5 minutes)

```typescript
// client/src/App.tsx
import { useAuth } from '@/modules/auth';

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <LoginPage />;

  return <Dashboard user={user} />;
}

// client/src/pages/LoginPage.tsx
function LoginPage() {
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = (data: { username: string; password: string }) => {
    login(data);
  };

  return <LoginForm onSubmit={handleSubmit} isLoading={isLoggingIn} />;
}
```

## Common Tasks

### Task: Create a New Deal

```typescript
import { DealService } from '@/modules/deal';

// In your controller
async function createDeal(data: CreateDealRequest, userId: string) {
  const deal = await dealService.createDeal(data, userId);
  return deal;
}
```

### Task: Calculate Tax

```typescript
import { TaxService } from '@/modules/tax';

// In your controller
async function calculateTax(amount: number, zipCode: string) {
  const tax = await taxService.calculateTax({
    amount,
    zipCode,
  });
  return tax;
}
```

### Task: Protect a Route

```typescript
import { requireAuth, requireRole } from '@/modules/auth';

// Anyone authenticated
app.get('/api/profile', requireAuth, handler);

// Admins only
app.delete('/api/users/:id', requireRole('admin'), handler);

// Multiple roles
app.post('/api/deals', requireRole('admin', 'sales_manager'), handler);
```

### Task: Check User Permissions

```typescript
import { useAuth } from '@/modules/auth';

function AdminPanel() {
  const { user, isAdmin, canManageUsers } = useAuth();

  if (!isAdmin) {
    return <div>Access denied</div>;
  }

  return <div>Admin Panel</div>;
}
```

## Module Cheat Sheet

### Auth Module

```typescript
import {
  // Services
  AuthService,

  // Middleware
  requireAuth,
  requireRole,

  // Hooks
  useAuth,

  // Types
  User,
  LoginRequest,
} from '@/modules/auth';

// Create service
const authService = new AuthService(storage);

// Login
const { user } = await authService.login({ username, password });

// Register
const user = await authService.register({ username, email, fullName, password });

// Setup 2FA
const { secret, qrCode } = await authService.setup2FA(userId, username);

// Verify 2FA
await authService.enable2FA(userId, token);
```

### Deal Module

```typescript
import {
  // Services
  DealService,
  DealCalculatorService,

  // Types
  Deal,
  CreateDealRequest,
} from '@/modules/deal';

// Create service
const dealService = new DealService(storage, calculator);

// Create deal
const deal = await dealService.createDeal(data, userId);

// Update deal
const updated = await dealService.updateDeal(dealId, changes, userId);

// Get deal
const deal = await dealService.getDeal(dealId);

// List deals
const { deals, total } = await dealService.listDeals(query);

// Calculate monthly payment
const payment = calculator.calculateMonthlyPayment({
  principal: 25000,
  rate: 5.99,
  term: 60,
});
```

### Tax Module

```typescript
import {
  // Services
  TaxService,

  // Types
  TaxCalculationRequest,
  TaxCalculationResult,
} from '@/modules/tax';

// Create service
const taxService = new TaxService(storage);

// Calculate tax
const tax = await taxService.calculateTax({
  amount: 25000,
  zipCode: '90210',
  vehiclePrice: 25000,
  tradeInValue: 5000,
});

// Get jurisdiction
const jurisdiction = await taxService.getTaxJurisdiction('90210');
```

## Testing

### Unit Test

```typescript
import { AuthService } from '@/modules/auth';

describe('AuthService', () => {
  const mockStorage = {
    getUserByUsername: jest.fn(),
    updateUser: jest.fn(),
  };

  const authService = new AuthService(mockStorage as any);

  it('should authenticate valid user', async () => {
    mockStorage.getUserByUsername.mockResolvedValue({
      id: '1',
      username: 'test',
      password: 'hashed',
      failedLoginAttempts: 0,
    });

    const result = await authService.login({
      username: 'test',
      password: 'password',
    });

    expect(result.user).toBeDefined();
  });
});
```

### Integration Test

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

## Debugging

### ESLint Error: "Import from module's public API"

**Problem:**
```typescript
import { AuthService } from '@/modules/auth/services/auth.service';
```

**Solution:**
```typescript
import { AuthService } from '@/modules/auth';
```

### TypeScript Error: "Cannot find module"

**Problem:** Module paths not configured

**Solution:** Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/modules/*": ["./src/modules/*"]
    }
  }
}
```

### Import Error: "Circular dependency detected"

**Problem:** Module A imports Module B which imports Module A

**Solution:**
1. Review dependencies - are they actually needed?
2. Move shared code to `@/core` or `@shared`
3. Use dependency injection instead of direct imports

## Best Practices

### DO ✅

- Import from module public APIs (`@/modules/moduleName`)
- Use services for business logic
- Use middleware for auth checks
- Use adapters to decouple from storage
- Write tests that mock services
- Handle errors with specific error types

### DON'T ❌

- Import module internals (`@/modules/auth/services/*`)
- Put business logic in routes
- Check auth manually in routes
- Access database directly from routes
- Use 'any' types
- Create circular dependencies

## Quick Reference

| Task | Module | Import |
|------|--------|--------|
| Login user | Auth | `import { useAuth } from '@/modules/auth'` |
| Protect route | Auth | `import { requireAuth } from '@/modules/auth'` |
| Create deal | Deal | `import { DealService } from '@/modules/deal'` |
| Calculate tax | Tax | `import { TaxService } from '@/modules/tax'` |
| Get current user | Auth | `const { user } = useAuth()` |
| Check role | Auth | `const { isAdmin } = useAuth()` |

## Need Help?

1. **Architecture Guide:** `/src/modules/MODULE_ARCHITECTURE.md`
2. **Auth Module:** `/src/modules/auth/README.md`
3. **Implementation Guide:** `/MODULAR_ARCHITECTURE_IMPLEMENTATION.md`
4. **Integration Examples:** `/src/integration-example.ts`
5. **Delivery Summary:** `/MODULAR_ARCHITECTURE_DELIVERY.md`

## Next Steps

1. Read `/MODULAR_ARCHITECTURE_IMPLEMENTATION.md`
2. Review `/src/integration-example.ts`
3. Start migrating code to use modules
4. Add tests
5. Deploy!
