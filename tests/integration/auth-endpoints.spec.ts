/**
 * Auth Service Contract Tests
 *
 * LAYER 4: GUARD RAIL TESTING
 *
 * These tests validate the auth service API contract.
 * They verify request/response shapes match the expected schema.
 *
 * The actual auth service runs in Go at services/auth-service/
 * These tests validate the contract, not the implementation.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Auth API Contract Schemas
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
  }),
});

const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.array(z.string())).optional(),
});

describe('Auth Service API Contract', () => {
  describe('POST /auth/login - Request Validation', () => {
    it('REJECTS missing email', () => {
      const result = LoginRequestSchema.safeParse({ password: 'test123' });
      expect(result.success).toBe(false);
    });

    it('REJECTS invalid email format', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'not-an-email',
        password: 'test123',
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS missing password', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS invalid MFA code format (not 6 digits)', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'test123',
        mfaCode: '12345', // Must be 6 digits
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS non-numeric MFA code', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'test123',
        mfaCode: 'abcdef',
      });
      expect(result.success).toBe(false);
    });

    it('ACCEPTS valid login request without MFA', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'test123',
      });
      expect(result.success).toBe(true);
    });

    it('ACCEPTS valid login request with MFA code', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'test123',
        mfaCode: '123456',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('POST /auth/login - Response Contract', () => {
    it('validates successful login response shape', () => {
      const mockResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-value',
        expiresIn: 900,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'dealer',
        },
      };
      const result = LoginResponseSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });

    it('validates error response shape', () => {
      const mockError = {
        error: 'Invalid credentials',
      };
      const result = ErrorResponseSchema.safeParse(mockError);
      expect(result.success).toBe(true);
    });

    it('validates validation error response shape', () => {
      const mockError = {
        error: 'Validation failed',
        details: {
          email: ['Invalid email format'],
        },
      };
      const result = ErrorResponseSchema.safeParse(mockError);
      expect(result.success).toBe(true);
    });
  });

  describe('POST /auth/refresh - Request Validation', () => {
    it('REJECTS missing refresh token', () => {
      const result = RefreshRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('REJECTS empty refresh token', () => {
      const result = RefreshRequestSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });

    it('ACCEPTS valid refresh token', () => {
      const result = RefreshRequestSchema.safeParse({
        refreshToken: 'valid-refresh-token',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('POST /auth/refresh - Response Contract', () => {
    it('validates successful refresh response shape', () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        expiresIn: 900,
      };
      const result = RefreshResponseSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Authorization Header Format', () => {
    const bearerRegex = /^Bearer [A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;

    it('validates Bearer token format', () => {
      const validToken =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(bearerRegex.test(validToken)).toBe(true);
    });

    it('rejects invalid Bearer format', () => {
      expect(bearerRegex.test('Bearer invalid')).toBe(false);
      expect(bearerRegex.test('Basic token')).toBe(false);
      expect(bearerRegex.test('token-only')).toBe(false);
    });
  });
});
