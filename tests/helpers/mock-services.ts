/**
 * Mock Services
 *
 * HTTP client mocking and service stubs for integration testing.
 * Uses MSW (Mock Service Worker) for realistic network mocking.
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMockUser, createMockAuthTokens, type MockUser, type MockAuthTokens } from './fixtures';

// ============================================================================
// MSW SERVER SETUP
// ============================================================================

export const mockServer = setupServer();

export function setupMockServer() {
  beforeAll(() => mockServer.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => mockServer.resetHandlers());
  afterAll(() => mockServer.close());
}

// ============================================================================
// AUTH SERVICE MOCKS
// ============================================================================

interface AuthMockOptions {
  loginSuccess?: boolean;
  mfaRequired?: boolean;
  user?: Partial<MockUser>;
}

export function mockAuthService(options: AuthMockOptions = {}) {
  const { loginSuccess = true, mfaRequired = false, user = {} } = options;
  const mockUser = createMockUser(user);
  const mockTokens = createMockAuthTokens();

  const handlers = [
    // POST /api/auth/login
    http.post('*/api/auth/login', async ({ request }) => {
      const body = await request.json() as { email: string; password: string; mfaCode?: string };

      if (!loginSuccess) {
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      if (mfaRequired && !body.mfaCode) {
        return HttpResponse.json(
          { error: 'MFA code required', mfaRequired: true },
          { status: 403 }
        );
      }

      return HttpResponse.json({
        ...mockTokens,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          dealershipId: mockUser.dealershipId,
          mfaEnabled: mockUser.mfaEnabled,
        },
      });
    }),

    // POST /api/auth/logout
    http.post('*/api/auth/logout', () => {
      return HttpResponse.json({ message: 'Logged out successfully' });
    }),

    // POST /api/auth/refresh
    http.post('*/api/auth/refresh', async ({ request }) => {
      const body = await request.json() as { refreshToken: string };

      if (!body.refreshToken) {
        return HttpResponse.json(
          { error: 'Refresh token required' },
          { status: 400 }
        );
      }

      const newTokens = createMockAuthTokens();
      return HttpResponse.json({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
      });
    }),

    // GET /api/auth/me
    http.get('*/api/auth/me', ({ request }) => {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader?.startsWith('Bearer ')) {
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return HttpResponse.json({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        dealershipId: mockUser.dealershipId,
        mfaEnabled: mockUser.mfaEnabled,
      });
    }),

    // POST /api/auth/mfa/setup
    http.post('*/api/auth/mfa/setup', () => {
      return HttpResponse.json({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'otpauth://totp/Autolytiq:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Autolytiq',
        backupCodes: ['12345678', '23456789', '34567890', '45678901', '56789012'],
      });
    }),

    // POST /api/auth/mfa/verify
    http.post('*/api/auth/mfa/verify', async ({ request }) => {
      const body = await request.json() as { code: string };

      if (body.code === '123456') {
        return HttpResponse.json({ verified: true });
      }

      return HttpResponse.json(
        { error: 'Invalid MFA code' },
        { status: 400 }
      );
    }),
  ];

  mockServer.use(...handlers);

  return { mockUser, mockTokens };
}

// ============================================================================
// DEAL SERVICE MOCKS
// ============================================================================

interface DealMockOptions {
  deals?: Array<Record<string, unknown>>;
  createSuccess?: boolean;
}

export function mockDealService(options: DealMockOptions = {}) {
  const { deals = [], createSuccess = true } = options;
  let dealStore = [...deals];

  const handlers = [
    // GET /api/deals
    http.get('*/api/deals', ({ request }) => {
      const url = new URL(request.url);
      const dealershipId = url.searchParams.get('dealershipId');
      const status = url.searchParams.get('status');

      let filtered = dealStore;
      if (dealershipId) {
        filtered = filtered.filter(d => d.dealershipId === dealershipId);
      }
      if (status) {
        filtered = filtered.filter(d => d.status === status);
      }

      return HttpResponse.json(filtered);
    }),

    // GET /api/deals/:id
    http.get('*/api/deals/:id', ({ params }) => {
      const deal = dealStore.find(d => d.id === params.id);

      if (!deal) {
        return HttpResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
      }

      return HttpResponse.json(deal);
    }),

    // POST /api/deals
    http.post('*/api/deals', async ({ request }) => {
      if (!createSuccess) {
        return HttpResponse.json(
          { error: 'Failed to create deal' },
          { status: 500 }
        );
      }

      const body = await request.json() as Record<string, unknown>;
      const newDeal = {
        id: crypto.randomUUID(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
      };

      dealStore.push(newDeal);
      return HttpResponse.json(newDeal, { status: 201 });
    }),

    // PUT /api/deals/:id
    http.put('*/api/deals/:id', async ({ params, request }) => {
      const index = dealStore.findIndex(d => d.id === params.id);

      if (index === -1) {
        return HttpResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
      }

      const body = await request.json() as Record<string, unknown>;
      dealStore[index] = {
        ...dealStore[index],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      return HttpResponse.json(dealStore[index]);
    }),

    // DELETE /api/deals/:id
    http.delete('*/api/deals/:id', ({ params }) => {
      const index = dealStore.findIndex(d => d.id === params.id);

      if (index === -1) {
        return HttpResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
      }

      dealStore.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),

    // POST /api/deals/:id/calculate
    http.post('*/api/deals/:id/calculate', async ({ params, request }) => {
      const body = await request.json() as {
        vehiclePrice: number;
        tradeInValue?: number;
        tradeInPayoff?: number;
        downPayment?: number;
        rebates?: number;
        apr: number;
        termMonths: number;
        taxRate: number;
      };

      const netTrade = (body.tradeInValue || 0) - (body.tradeInPayoff || 0);
      const taxableAmount = body.vehiclePrice - (body.tradeInValue || 0) + (body.rebates || 0);
      const taxAmount = Math.round(taxableAmount * body.taxRate);
      const amountFinanced = body.vehiclePrice - netTrade - (body.downPayment || 0) - (body.rebates || 0) + taxAmount;

      const monthlyRate = body.apr / 100 / 12;
      const monthlyPayment = monthlyRate > 0
        ? Math.round(
            amountFinanced *
              (monthlyRate * Math.pow(1 + monthlyRate, body.termMonths)) /
              (Math.pow(1 + monthlyRate, body.termMonths) - 1)
          )
        : Math.round(amountFinanced / body.termMonths);

      const totalOfPayments = monthlyPayment * body.termMonths;
      const totalInterest = totalOfPayments - amountFinanced;

      return HttpResponse.json({
        dealId: params.id,
        amountFinanced,
        monthlyPayment,
        totalOfPayments,
        totalInterest,
        taxAmount,
      });
    }),
  ];

  mockServer.use(...handlers);

  return {
    getDealStore: () => dealStore,
    clearDealStore: () => { dealStore = []; },
    addDeal: (deal: Record<string, unknown>) => { dealStore.push(deal); },
  };
}

// ============================================================================
// CUSTOMER SERVICE MOCKS
// ============================================================================

interface CustomerMockOptions {
  customers?: Array<Record<string, unknown>>;
}

export function mockCustomerService(options: CustomerMockOptions = {}) {
  const { customers = [] } = options;
  let customerStore = [...customers];

  const handlers = [
    // GET /api/customers
    http.get('*/api/customers', ({ request }) => {
      const url = new URL(request.url);
      const dealershipId = url.searchParams.get('dealershipId');
      const search = url.searchParams.get('search');

      let filtered = customerStore;
      if (dealershipId) {
        filtered = filtered.filter(c => c.dealershipId === dealershipId);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(c =>
          String(c.firstName).toLowerCase().includes(searchLower) ||
          String(c.lastName).toLowerCase().includes(searchLower) ||
          String(c.email).toLowerCase().includes(searchLower)
        );
      }

      return HttpResponse.json(filtered);
    }),

    // GET /api/customers/:id
    http.get('*/api/customers/:id', ({ params }) => {
      const customer = customerStore.find(c => c.id === params.id);

      if (!customer) {
        return HttpResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      return HttpResponse.json(customer);
    }),

    // POST /api/customers
    http.post('*/api/customers', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      const newCustomer = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
      };

      customerStore.push(newCustomer);
      return HttpResponse.json(newCustomer, { status: 201 });
    }),

    // PUT /api/customers/:id
    http.put('*/api/customers/:id', async ({ params, request }) => {
      const index = customerStore.findIndex(c => c.id === params.id);

      if (index === -1) {
        return HttpResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      const body = await request.json() as Record<string, unknown>;
      customerStore[index] = {
        ...customerStore[index],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      return HttpResponse.json(customerStore[index]);
    }),

    // DELETE /api/customers/:id
    http.delete('*/api/customers/:id', ({ params }) => {
      const index = customerStore.findIndex(c => c.id === params.id);

      if (index === -1) {
        return HttpResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      customerStore.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),

    // GET /api/customers/:id/credit
    http.get('*/api/customers/:id/credit', ({ params }) => {
      const customer = customerStore.find(c => c.id === params.id);

      if (!customer) {
        return HttpResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Mock credit check response
      return HttpResponse.json({
        customerId: params.id,
        creditScore: 720,
        creditBureau: 'experian',
        riskTier: 'prime',
        recommendedAPR: 5.99,
        maxLoanAmount: 50000 * 100, // cents
        factors: [
          'Excellent payment history',
          'Low credit utilization',
          'Diverse credit mix',
        ],
        lastCheckedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }),
  ];

  mockServer.use(...handlers);

  return {
    getCustomerStore: () => customerStore,
    clearCustomerStore: () => { customerStore = []; },
    addCustomer: (customer: Record<string, unknown>) => { customerStore.push(customer); },
  };
}

// ============================================================================
// TAX SERVICE MOCKS
// ============================================================================

export function mockTaxService() {
  const handlers = [
    // POST /api/tax/calculate
    http.post('*/api/tax/calculate', async ({ request }) => {
      const body = await request.json() as {
        dealerState: string;
        customerState: string;
        vehiclePrice: number;
        tradeInValue?: number;
        isNewVehicle?: boolean;
      };

      // Mock tax calculation based on state
      const taxRates: Record<string, number> = {
        TX: 0.0625,
        CA: 0.0725,
        FL: 0.06,
        NY: 0.08,
        WA: 0.065,
        OR: 0, // No sales tax
        DE: 0, // No sales tax
        MT: 0, // No sales tax
        NH: 0, // No sales tax
      };

      const taxRate = taxRates[body.dealerState] || 0.06;
      const taxableAmount = body.vehiclePrice - (body.tradeInValue || 0);
      const taxAmount = Math.round(taxableAmount * taxRate);

      return HttpResponse.json({
        dealerState: body.dealerState,
        customerState: body.customerState,
        taxRate,
        taxableAmount,
        taxAmount,
        breakdown: {
          stateTax: taxAmount,
          countyTax: 0,
          cityTax: 0,
          specialDistrict: 0,
        },
      });
    }),

    // GET /api/tax/rates/:state
    http.get('*/api/tax/rates/:state', ({ params }) => {
      const taxRates: Record<string, { base: number; max: number }> = {
        TX: { base: 0.0625, max: 0.0825 },
        CA: { base: 0.0725, max: 0.1025 },
        FL: { base: 0.06, max: 0.08 },
        NY: { base: 0.04, max: 0.0875 },
      };

      const rates = taxRates[params.state as string] || { base: 0.06, max: 0.10 };

      return HttpResponse.json({
        state: params.state,
        baseRate: rates.base,
        maxRate: rates.max,
        tradeInCredit: true,
        exemptions: ['disabled_veteran', 'native_american'],
      });
    }),
  ];

  mockServer.use(...handlers);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create authenticated headers with a mock JWT
 */
export function createAuthHeaders(user?: Partial<MockUser>): Headers {
  const headers = new Headers();
  const tokens = createMockAuthTokens();
  headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  headers.set('Content-Type', 'application/json');

  if (user?.dealershipId) {
    headers.set('X-Dealership-ID', user.dealershipId);
  }

  return headers;
}

/**
 * Helper to test API responses
 */
export async function expectApiError(
  response: Response,
  expectedStatus: number,
  expectedErrorContains?: string
) {
  expect(response.status).toBe(expectedStatus);
  const body = await response.json();
  expect(body).toHaveProperty('error');
  if (expectedErrorContains) {
    expect(body.error.toLowerCase()).toContain(expectedErrorContains.toLowerCase());
  }
}

/**
 * Helper to test successful API responses
 */
export async function expectApiSuccess<T>(
  response: Response,
  expectedStatus: number = 200
): Promise<T> {
  expect(response.status).toBe(expectedStatus);
  return await response.json() as T;
}
