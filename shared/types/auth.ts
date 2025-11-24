/**
 * Auth Service Types & Validation Schemas
 *
 * LAYER 3: RUNTIME VALIDATION
 *
 * All auth request/response types with strict Zod validation.
 * These schemas REJECT invalid inputs at runtime.
 */

import { z } from 'zod';

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Login Request - POST /api/auth/login
 */
export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z
    .string()
    .regex(/^[0-9]{6}$/, 'MFA code must be 6 digits')
    .optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Refresh Token Request - POST /api/auth/refresh
 */
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

/**
 * MFA Verify Request - POST /api/auth/mfa/verify
 */
export const mfaVerifyRequestSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, 'MFA code must be 6 digits'),
});

export type MFAVerifyRequest = z.infer<typeof mfaVerifyRequestSchema>;

/**
 * Password Reset Request - POST /api/auth/password/reset-request
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password Reset Confirm - POST /api/auth/password/reset
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
});

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * User - Public user information (no sensitive fields)
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'manager', 'salesperson', 'viewer']),
  dealershipId: z.string().uuid(),
  mfaEnabled: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Login Response - POST /api/auth/login (success)
 */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: userSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * MFA Required Response - POST /api/auth/login (MFA needed)
 */
export const mfaRequiredResponseSchema = z.object({
  requiresMfa: z.literal(true),
  message: z.string(),
});

export type MFARequiredResponse = z.infer<typeof mfaRequiredResponseSchema>;

/**
 * Token Response - POST /api/auth/refresh or /api/auth/mfa/verify
 */
export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/**
 * MFA Setup Response - POST /api/auth/mfa/setup
 */
export const mfaSetupResponseSchema = z.object({
  secret: z.string(),
  qrCodeUrl: z.string().url(),
});

export type MFASetupResponse = z.infer<typeof mfaSetupResponseSchema>;

/**
 * MFA Enabled Response - POST /api/auth/mfa/verify (setup complete)
 */
export const mfaEnabledResponseSchema = z.object({
  message: z.string(),
  mfaEnabled: z.boolean(),
});

export type MFAEnabledResponse = z.infer<typeof mfaEnabledResponseSchema>;

/**
 * Generic Success Message
 */
export const messageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;

// ============================================
// ERROR SCHEMAS
// ============================================

/**
 * Error Response
 */
export const errorResponseSchema = z.object({
  error: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Validation Error Response
 */
export const validationErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    })
  ),
});

export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;

// ============================================
// INTERNAL TYPES (not exposed via API)
// ============================================

/**
 * Session Data - Stored in Redis/session store
 */
export interface SessionData {
  userId: string;
  dealershipId: string;
  role: User['role'];
  mfaVerified: boolean;
  createdAt: number;
  lastActivityAt: number;
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string;
  dealershipId: string;
  role: User['role'];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Password Reset Token
 */
export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}
