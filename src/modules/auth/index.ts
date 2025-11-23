/**
 * AUTH MODULE PUBLIC API
 *
 * This is the ONLY file that should be imported from outside the auth module.
 * All module internals are encapsulated and not exposed.
 *
 * Usage:
 * import { AuthService, requireAuth, useAuth } from '@/modules/auth';
 */

// ============================================================================
// SERVER-SIDE EXPORTS
// ============================================================================

// Services
export { AuthService } from './services/auth.service';
export { hashPassword, comparePasswords } from './services/auth.service';

// Middleware
export {
  requireAuth,
  requireRole,
  requirePermission,
  requireActive,
  requireSameDealership,
  getCurrentUser,
  hasRole,
  isAdmin,
  canManageUsers,
} from './services/auth.middleware';

// Routes
export {
  createAuthRouter,
  createSessionMiddleware,
  type SessionConfig,
} from './api/auth.routes';

export { createUserManagementRouter } from './api/user-management.routes';

// ============================================================================
// CLIENT-SIDE EXPORTS
// ============================================================================

// Hooks
export { useAuth, useUserPreferences } from './hooks/useAuth';

// ============================================================================
// SHARED EXPORTS
// ============================================================================

// Types
export type {
  User,
  UserPreferences,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  Verify2FARequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  Setup2FAResponse,
  SessionData,
} from './types/auth.types';

// Error types
export {
  AuthError,
  UnauthorizedError,
  ForbiddenError,
  AccountLockedError,
} from './types/auth.types';

// Schemas
export {
  loginSchema,
  registerSchema,
  verify2FASchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  preferencesSchema,
} from './types/auth.types';
