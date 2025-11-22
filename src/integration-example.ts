/**
 * INTEGRATION EXAMPLE
 * Shows how to integrate new modular architecture with existing codebase
 *
 * This file demonstrates the pattern for connecting the new modules
 * to existing server code. Use this as a template for migration.
 */

import { Express } from 'express';
import passport from 'passport';
import session from 'express-session';

// ============================================================================
// NEW MODULE IMPORTS (Always via public API)
// ============================================================================

import {
  AuthService,
  createAuthRouter,
  createSessionMiddleware,
  requireAuth,
  requireRole,
} from '@/modules/auth';

import {
  DealService,
  DealCalculatorService,
  createDealRouter,
} from '@/modules/deal';

import { TaxService } from '@/modules/tax';

// ============================================================================
// CORE ADAPTERS
// ============================================================================

import {
  createAuthStorageAdapter,
  createDealStorageAdapter,
  createTaxStorageAdapter,
} from '@/core/adapters/storage.adapter';

// ============================================================================
// EXISTING CODE IMPORTS (to be gradually replaced)
// ============================================================================

import { storage } from '../server/storage';
import { db } from '../server/database/db-service.js';

// ============================================================================
// SETUP FUNCTION
// ============================================================================

export function setupModularArchitecture(app: Express) {
  // -------------------------------------------------------------------------
  // STEP 1: Create Storage Adapters
  // -------------------------------------------------------------------------
  // Adapters bridge new modules with existing storage implementation
  // without creating tight coupling

  const authStorage = createAuthStorageAdapter(storage);
  const dealStorage = createDealStorageAdapter(storage);
  const taxStorage = createTaxStorageAdapter(storage);

  // -------------------------------------------------------------------------
  // STEP 2: Initialize Services
  // -------------------------------------------------------------------------
  // Services contain business logic and are the heart of each module

  const authService = new AuthService(authStorage);
  const taxService = new TaxService(taxStorage);
  const dealCalculator = new DealCalculatorService();
  const dealService = new DealService(dealStorage, dealCalculator);

  // -------------------------------------------------------------------------
  // STEP 3: Setup Session Management
  // -------------------------------------------------------------------------
  // Use the new auth module's session configuration

  const sessionMiddleware = createSessionMiddleware({
    secret: process.env.SESSION_SECRET!,
    store: storage.sessionStore, // Existing session store
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // -------------------------------------------------------------------------
  // STEP 4: Mount Module Routes
  // -------------------------------------------------------------------------
  // Each module provides a router factory function

  // Auth routes: /api/auth/*
  app.use('/api/auth', createAuthRouter(authService, storage));

  // Deal routes: /api/deals/*
  app.use('/api/deals', createDealRouter(dealService, requireAuth, requireRole));

  // -------------------------------------------------------------------------
  // STEP 5: Protect Existing Routes (Gradual Migration)
  // -------------------------------------------------------------------------
  // Use new auth middleware on existing routes

  // Example: Protect all API routes (except public ones)
  app.use('/api/*', requireAuth);

  // Example: Admin-only routes
  app.use('/api/admin/*', requireRole('admin'));

  // -------------------------------------------------------------------------
  // STEP 6: Return Services for Use Elsewhere
  // -------------------------------------------------------------------------
  // Allow other parts of the app to use services directly

  return {
    services: {
      auth: authService,
      deal: dealService,
      tax: taxService,
    },
    middleware: {
      requireAuth,
      requireRole,
    },
  };
}

// ============================================================================
// EXAMPLE: MIGRATING AN EXISTING ROUTE
// ============================================================================

/**
 * BEFORE (old scattered code):
 */
/*
import { storage } from './storage';
import { hashPassword } from './auth';
import { calculateSalesTax } from './calculations';

app.post('/api/deals', async (req, res) => {
  // Auth check scattered
  if (!req.isAuthenticated()) {
    return res.status(401).send('Unauthorized');
  }

  // Business logic in route handler
  const deal = await storage.createDeal({
    ...req.body,
    createdBy: req.user.id,
  });

  // Tax calculation inline
  const tax = calculateSalesTax(deal.vehiclePrice, deal.zipCode);

  // No error handling
  res.json(deal);
});
*/

/**
 * AFTER (using modules):
 */
/*
import { requireAuth } from '@/modules/auth';
import { DealService } from '@/modules/deal';

// Clean route handler
app.post('/api/deals', requireAuth, async (req, res) => {
  try {
    const deal = await dealService.createDeal(req.body, req.user!.id);
    res.json(deal);
  } catch (error) {
    if (error instanceof DealError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create deal' });
  }
});
*/

// ============================================================================
// EXAMPLE: CLIENT-SIDE USAGE
// ============================================================================

/**
 * BEFORE (scattered hooks):
 */
/*
// Multiple files with auth logic
import { useQuery } from '@tanstack/react-query';

function MyComponent() {
  const { data: user } = useQuery(['/api/user']);
  const isAuthenticated = !!user;

  // Auth logic duplicated everywhere
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <div>Protected content</div>;
}
*/

/**
 * AFTER (using auth module):
 */
/*
import { useAuth } from '@/modules/auth';

function MyComponent() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <div>Welcome {user.fullName}</div>;
}
*/

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * When migrating a feature to use modules:
 *
 * 1. Identify the domain (auth, deal, tax, customer, etc.)
 * 2. Import from module's public API only (@/modules/moduleName)
 * 3. Use services instead of inline business logic
 * 4. Use middleware instead of inline auth checks
 * 5. Remove old scattered code
 * 6. Update tests to use module APIs
 * 7. Verify no circular dependencies (npm run lint)
 * 8. Update documentation
 */

// ============================================================================
// TESTING WITH MODULES
// ============================================================================

/**
 * Unit Testing:
 */
/*
import { AuthService } from '@/modules/auth';

describe('AuthService', () => {
  // Mock storage
  const mockStorage = {
    getUserByUsername: jest.fn(),
    updateUser: jest.fn(),
    // ... other methods
  };

  const authService = new AuthService(mockStorage);

  it('should authenticate valid user', async () => {
    mockStorage.getUserByUsername.mockResolvedValue({
      id: '1',
      username: 'test',
      password: 'hashed',
    });

    const result = await authService.login({
      username: 'test',
      password: 'password123',
    });

    expect(result.user).toBeDefined();
  });
});
*/

/**
 * Integration Testing:
 */
/*
import request from 'supertest';
import { app } from './server';

describe('Auth Flow', () => {
  it('should complete login flow', async () => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123',
      });

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'Password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('id');

    // Access protected route
    const protectedRes = await request(app)
      .get('/api/auth/user')
      .set('Cookie', loginRes.headers['set-cookie']);

    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.username).toBe('test');
  });
});
*/

// ============================================================================
// COMMON PATTERNS
// ============================================================================

/**
 * Pattern 1: Inject dependencies
 */
function exampleDependencyInjection() {
  // Good: Services are injected, easy to mock
  class MyController {
    constructor(
      private dealService: DealService,
      private taxService: TaxService
    ) {}

    async createDeal(data: any) {
      const tax = await this.taxService.calculateTax({
        amount: data.vehiclePrice,
        zipCode: data.zipCode,
      });

      return await this.dealService.createDeal(
        { ...data, calculation: { ...data.calculation, totalTax: tax.totalTax } },
        'userId'
      );
    }
  }

  return MyController;
}

/**
 * Pattern 2: Use adapters for existing code
 */
function exampleAdapterPattern() {
  // When existing code doesn't match module interface,
  // create an adapter

  interface LegacyStorage {
    findUser(username: string): Promise<any>;
  }

  function createLegacyAuthAdapter(legacy: LegacyStorage) {
    return {
      async getUserByUsername(username: string) {
        return await legacy.findUser(username);
      },
      // ... implement other methods
    };
  }

  return createLegacyAuthAdapter;
}

/**
 * Pattern 3: Error handling
 */
function exampleErrorHandling() {
  // Modules throw specific errors that can be caught

  /*
  import { DealError, DealNotFoundError } from '@/modules/deal';

  app.post('/api/deals', async (req, res) => {
    try {
      const deal = await dealService.createDeal(req.body, req.user!.id);
      res.json(deal);
    } catch (error) {
      if (error instanceof DealNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      // Unexpected error
      console.error('Unexpected error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  */
}

/**
 * Pattern 4: Compose services
 */
function exampleServiceComposition() {
  // Services can use other services via their public APIs

  class OrderService {
    constructor(
      private dealService: DealService,
      private taxService: TaxService
    ) {}

    async createOrder(data: any) {
      // Calculate tax
      const tax = await this.taxService.calculateTax({
        amount: data.total,
        zipCode: data.zipCode,
      });

      // Create deal with tax
      const deal = await this.dealService.createDeal(
        {
          ...data,
          calculation: {
            ...data.calculation,
            totalTax: tax.totalTax,
          },
        },
        data.userId
      );

      return deal;
    }
  }

  return OrderService;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  setupModularArchitecture,
  exampleDependencyInjection,
  exampleAdapterPattern,
  exampleErrorHandling,
  exampleServiceComposition,
};
