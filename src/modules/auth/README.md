# Auth Module

**Status:** ✅ Production-ready modular architecture

## Purpose

Centralized authentication and authorization module with strict encapsulation and clear boundaries.

## Module Structure

```
auth/
├── api/              # Express routes
│   └── auth.routes.ts
├── hooks/            # React hooks
│   └── useAuth.ts
├── services/         # Business logic
│   ├── auth.service.ts
│   └── auth.middleware.ts
├── types/            # TypeScript types
│   └── auth.types.ts
└── index.ts          # Public API (ONLY import from here)
```

## Public API

### Server-Side

```typescript
import {
  AuthService,
  requireAuth,
  requireRole,
  createAuthRouter,
  createSessionMiddleware,
} from '@/modules/auth';

// Create auth service
const authService = new AuthService(storage);

// Use middleware
app.use(requireAuth);
app.use(requireRole('admin'));

// Mount routes
app.use('/api/auth', createAuthRouter(authService, storage));
```

### Client-Side

```typescript
import { useAuth } from '@/modules/auth';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  // Use auth state and actions
}
```

## Features

### Authentication
- ✅ Username/password login
- ✅ User registration
- ✅ Session management
- ✅ Account lockout after failed attempts
- ✅ Multi-factor authentication (2FA/TOTP)
- ✅ Password reset flow
- ✅ Email verification

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Permission-based access
- ✅ Multi-tenant isolation
- ✅ Active/inactive account checks

### Security
- ✅ Password hashing (scrypt)
- ✅ Timing-safe password comparison
- ✅ Reset token hashing (SHA-256)
- ✅ Session secret validation
- ✅ TOTP-based 2FA

## Module Boundaries

### Can Import From:
- `@/core/*` - Core utilities
- `@shared/models` - Domain models
- External libraries (passport, otplib, crypto)

### Cannot Import From:
- Other modules (`@/modules/deal`, `@/modules/customer`, etc.)
- Server files outside module
- Client files outside module

### Who Can Import This Module:
- Any other module (but ONLY via `@/modules/auth`)
- Server routes
- Client components

## Usage Examples

### Server: Setup Auth

```typescript
import { Express } from 'express';
import { AuthService, createAuthRouter, createSessionMiddleware } from '@/modules/auth';
import { storage } from './storage';

const authService = new AuthService(storage);

// Setup session
app.use(createSessionMiddleware({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
}));

// Mount auth routes
app.use('/api/auth', createAuthRouter(authService, storage));
```

### Server: Protect Routes

```typescript
import { requireAuth, requireRole } from '@/modules/auth';

// Require authentication
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
app.delete('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  // Only admins can access
});
```

### Client: Use Auth Hook

```typescript
import { useAuth } from '@/modules/auth';

function LoginForm() {
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = (data: LoginCredentials) => {
    login(data);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Client: Protected Route

```typescript
import { useAuth } from '@/modules/auth';

function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <div>Protected content</div>;
}
```

## Error Handling

All auth errors extend `AuthError`:

```typescript
import { AuthError, UnauthorizedError, ForbiddenError } from '@/modules/auth';

try {
  await authService.login(credentials);
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Handle 401
  } else if (error instanceof ForbiddenError) {
    // Handle 403
  } else if (error instanceof AuthError) {
    // Handle generic auth error
  }
}
```

## Security Considerations

1. **Password Storage**: Uses scrypt with random salt
2. **Password Comparison**: Uses timing-safe comparison
3. **Account Lockout**: 5 failed attempts = 15 minute lockout
4. **2FA**: TOTP-based (compatible with Google Authenticator)
5. **Reset Tokens**: SHA-256 hashed, 1 hour expiry
6. **Sessions**: HTTP-only cookies, configurable secure flag
7. **Multi-tenant**: Enforced at middleware level

## Testing

```typescript
import { AuthService } from '@/modules/auth';
import { mockStorage } from './test-utils';

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

## Migration Notes

This module consolidates:
- `/server/auth.ts`
- `/server/auth-routes.ts`
- `/server/auth-helpers.ts`
- `/client/src/hooks/use-auth.ts`
- Parts of `/server/middleware.ts`

All auth logic is now isolated and can be modified without affecting other modules.
