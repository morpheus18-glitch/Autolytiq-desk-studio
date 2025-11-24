# Week 2 Plan: Auth Service (Contract-First)

**Start Date:** TBD
**Duration:** 5-7 days
**Goal:** Production-ready authentication service with tests FIRST

---

## Week 1 ✅ COMPLETE

**Achievements:**
- Testing infrastructure set up (Vitest, Playwright, MSW)
- Quality gate scripts configured
- 3,502 existing tests verified working
- Test helpers and factories created
- Foundation ready for TDD

---

## Week 2: Auth Service (Go or TypeScript)

### Decision: Which Language?

**Option A: Go** (Recommended)
- ✅ Better performance
- ✅ Learn Go microservices pattern
- ✅ Good for auth (bcrypt, JWT native)
- ❌ Requires Go setup

**Option B: TypeScript** (Faster to start)
- ✅ Can start immediately
- ✅ Reuse existing knowledge
- ✅ Easier debugging
- ❌ Plan is to migrate to Go eventually

**Recommendation:** Start with TypeScript,  migrate to Go in Month 2.

---

## Phase 1: OpenAPI Contract (Day 1)

### Step 1: Define API Contract

Create `shared/contracts/auth-service.yaml`:

```yaml
openapi: 3.0.0
info:
  title: Auth Service API
  version: 1.0.0

paths:
  /api/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        401:
          $ref: '#/components/responses/Unauthorized'

  /api/auth/logout:
    post:
      summary: User logout
      security:
        - bearerAuth: []
      responses:
        200:
          description: Logout successful

  /api/auth/refresh:
    post:
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefreshTokenRequest'
      responses:
        200:
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'

  /api/auth/mfa/setup:
    post:
      summary: Setup TOTP MFA
      security:
        - bearerAuth: []
      responses:
        200:
          description: MFA setup initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MFASetupResponse'

  /api/auth/mfa/verify:
    post:
      summary: Verify MFA code
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MFAVerifyRequest'
      responses:
        200:
          description: MFA verified
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'

  /api/auth/password/reset-request:
    post:
      summary: Request password reset
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PasswordResetRequest'
      responses:
        200:
          description: Reset email sent

  /api/auth/password/reset:
    post:
      summary: Reset password with token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PasswordResetConfirm'
      responses:
        200:
          description: Password reset successful

components:
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
        mfaCode:
          type: string
          pattern: '^[0-9]{6}$'

    LoginResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer
        user:
          $ref: '#/components/schemas/User'

    RefreshTokenRequest:
      type: object
      required: [refreshToken]
      properties:
        refreshToken:
          type: string

    TokenResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer

    MFASetupResponse:
      type: object
      properties:
        secret:
          type: string
        qrCodeUrl:
          type: string
          format: uri

    MFAVerifyRequest:
      type: object
      required: [code]
      properties:
        code:
          type: string
          pattern: '^[0-9]{6}$'

    PasswordResetRequest:
      type: object
      required: [email]
      properties:
        email:
          type: string
          format: email

    PasswordResetConfirm:
      type: object
      required: [token, newPassword]
      properties:
        token:
          type: string
        newPassword:
          type: string
          minLength: 8

    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [admin, manager, salesperson, viewer]
        dealershipId:
          type: string
          format: uuid
        mfaEnabled:
          type: boolean

  responses:
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### Step 2: Generate TypeScript Types

```bash
npx openapi-typescript shared/contracts/auth-service.yaml -o shared/types/auth-api.ts
```

### Step 3: Validate Contract

```bash
npm run validate:openapi
```

---

## Phase 2: Contract Tests (Day 2)

Create `tests/contract/auth-service.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';

describe('Auth Service API Contract', () => {
  it('should have valid OpenAPI spec', async () => {
    const api = await SwaggerParser.validate('shared/contracts/auth-service.yaml');
    expect(api).toBeDefined();
  });

  it('should define all required auth endpoints', async () => {
    const api = await SwaggerParser.dereference('shared/contracts/auth-service.yaml');

    expect(api.paths['/api/auth/login']).toBeDefined();
    expect(api.paths['/api/auth/logout']).toBeDefined();
    expect(api.paths['/api/auth/refresh']).toBeDefined();
    expect(api.paths['/api/auth/mfa/setup']).toBeDefined();
    expect(api.paths['/api/auth/mfa/verify']).toBeDefined();
    expect(api.paths['/api/auth/password/reset-request']).toBeDefined();
    expect(api.paths['/api/auth/password/reset']).toBeDefined();
  });
});
```

---

## Phase 3: Integration Tests FIRST (Day 3)

Create `tests/integration/auth/login.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/server';
import { db } from '@/server/db';
import { users } from '@/shared/schema';
import { hashPassword } from '@/server/auth/password';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Clean database
    await db.delete(users);
  });

  it('should login with valid credentials', async () => {
    // Arrange: Create test user
    await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: await hashPassword('Password123'),
      role: 'salesperson',
      dealershipId: 'dealer-123',
    });

    // Act: Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
      role: 'salesperson',
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('should reject invalid password', async () => {
    await db.insert(users).values({
      email: 'test@example.com',
      passwordHash: await hashPassword('Password123'),
      // ... other fields
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should reject non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(401);
  });

  it('should require MFA when enabled', async () => {
    await db.insert(users).values({
      email: 'test@example.com',
      passwordHash: await hashPassword('Password123'),
      mfaEnabled: true,
      mfaSecret: 'test-secret',
      // ... other fields
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.requiresMfa).toBe(true);
    expect(response.body).not.toHaveProperty('accessToken'); // Not yet
  });
});
```

**Run tests - they SHOULD FAIL:**
```bash
npm run test:integration
# ❌ FAIL - No implementation yet!
```

---

## Phase 4: Implementation (Days 4-5)

### Only NOW do we write the code:

```typescript
// server/auth/login.ts
import { Router } from 'express';
import { db } from '@/server/db';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './password';
import { generateTokens } from './jwt';
import { logger } from '@/core/logger';

const router = Router();

router.post('/api/auth/login', async (req, res) => {
  const { email, password, mfaCode } = req.body;

  try {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      logger.warn({ msg: 'LOGIN_FAILED', email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn({ msg: 'LOGIN_FAILED', email, reason: 'invalid_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check MFA
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(200).json({ requiresMfa: true });
      }

      const mfaValid = verifyMFACode(user.mfaSecret, mfaCode);
      if (!mfaValid) {
        logger.warn({ msg: 'LOGIN_FAILED', email, reason: 'invalid_mfa' });
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Log success
    logger.info({
      msg: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      dealershipId: user.dealershipId,
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        dealershipId: user.dealershipId,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    logger.error({ msg: 'LOGIN_ERROR', error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

**Run tests - they SHOULD PASS:**
```bash
npm run test:integration
# ✅ PASS - All tests green!
```

---

## Phase 5: All Auth Endpoints (Days 5-7)

Repeat TDD cycle for:
- [ ] Logout (invalidate tokens)
- [ ] Refresh token
- [ ] MFA setup
- [ ] MFA verify
- [ ] Password reset request
- [ ] Password reset confirm

Each endpoint:
1. Write OpenAPI spec
2. Write contract test
3. Write integration tests (RED)
4. Implement (GREEN)
5. Refactor (BLUE)

---

## Database Setup Required

**Before Week 2 starts, set up Neon:**

1. Create account at neon.tech
2. Create project "autolytiq-production"
3. Get connection string
4. Add to `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/autolytiq"
   DIRECT_DATABASE_URL="$DATABASE_URL"
   ```
5. Run migrations:
   ```bash
   npm run db:push
   ```

---

## Success Criteria (Week 2 Complete)

- [ ] OpenAPI contract for all auth endpoints
- [ ] Contract validation passes
- [ ] All integration tests passing (>20 tests)
- [ ] TypeScript types generated from OpenAPI
- [ ] All endpoints implemented
- [ ] Structured logging on every endpoint
- [ ] JWT generation and validation
- [ ] Password hashing (bcrypt/argon2)
- [ ] MFA (TOTP) working
- [ ] Password reset working
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Test coverage >80% for auth module

---

## Week 3 Preview

With auth complete, we'll tackle:
- Calculation engine (Rust/WASM)
- Port tax calculation logic from TypeScript
- Use existing 3,500 tests as spec
- 10-100x performance improvement

---

**Remember:** Tests FIRST, code AFTER. Contract → Tests → Implementation.
