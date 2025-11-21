/**
 * AUTH MODULE TYPES
 * Centralized type definitions for authentication
 */

import { z } from 'zod';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  dealershipId: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'finance_manager' | 'sales_manager' | 'salesperson';
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  lastLogin: Date | null;
  preferences: UserPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    sms?: boolean;
    desktop?: boolean;
  };
  defaultView?: string;
}

// ============================================================================
// AUTH REQUEST/RESPONSE TYPES
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user?: User;
  requires2fa?: boolean;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  requiresApproval: boolean;
  email: string;
}

export interface Verify2FARequest {
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
  message: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const verify2FASchema = z.object({
  token: z.string().length(6, 'TOTP token must be 6 digits'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      desktop: z.boolean().optional(),
    })
    .optional(),
  defaultView: z.string().optional(),
});

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionData {
  userId: string;
  pending2faUserId?: string;
}

// ============================================================================
// AUTH ERROR TYPES
// ============================================================================

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class AccountLockedError extends AuthError {
  constructor(
    message: string,
    public minutesRemaining: number
  ) {
    super(message, 'ACCOUNT_LOCKED', 401);
  }
}
