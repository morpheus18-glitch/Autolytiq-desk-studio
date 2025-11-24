/**
 * Auth Endpoints - Guard Rail Tests
 *
 * LAYER 4: GUARD RAIL TESTING
 *
 * These tests REJECT invalid inputs and enforce contracts.
 * They validate that the system physically rejects violations.
 *
 * Test philosophy: "if my program should expect X, then reject all but X"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../gateway/server';

describe('Auth Endpoints - Guard Rail Tests', () => {
  // ============================================
  // POST /api/auth/login - GUARD RAILS
  // ============================================
  describe('POST /api/auth/login', () => {
    it('REJECTS missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('REJECTS invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'test123' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS invalid MFA code format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'test123',
          mfaCode: '12345', // Must be 6 digits
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS non-numeric MFA code', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'test123',
          mfaCode: 'abcdef',
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('ACCEPTS valid login request', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'test123',
        });

      // Will fail auth (user doesn't exist) but validation should pass
      expect(response.status).not.toBe(422);
    });

    it('ACCEPTS valid login with MFA code', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'test123',
          mfaCode: '123456',
        });

      // Will fail auth (user doesn't exist) but validation should pass
      expect(response.status).not.toBe(422);
    });
  });

  // ============================================
  // POST /api/auth/logout - GUARD RAILS
  // ============================================
  describe('POST /api/auth/logout', () => {
    it('REJECTS missing Authorization header', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('authorization');
    });

    it('REJECTS invalid Authorization format', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('REJECTS invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // POST /api/auth/refresh - GUARD RAILS
  // ============================================
  describe('POST /api/auth/refresh', () => {
    it('REJECTS missing refreshToken', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS empty refreshToken', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });

      expect(response.status).toBe(422);
    });

    it('ACCEPTS valid refresh request format', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'some-token' });

      // Will fail auth (invalid token) but validation should pass
      expect(response.status).not.toBe(422);
    });
  });

  // ============================================
  // POST /api/auth/mfa/setup - GUARD RAILS
  // ============================================
  describe('POST /api/auth/mfa/setup', () => {
    it('REJECTS missing Authorization header', async () => {
      const response = await request(app).post('/api/auth/mfa/setup');

      expect(response.status).toBe(401);
    });

    it('REJECTS invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // POST /api/auth/mfa/verify - GUARD RAILS
  // ============================================
  describe('POST /api/auth/mfa/verify', () => {
    it('REJECTS missing code', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      // Will fail auth first (invalid token)
      expect(response.status).toBe(401);
    });

    it('REJECTS invalid code format (5 digits)', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Authorization', 'Bearer fake-token')
        .send({ code: '12345' });

      // Should fail validation OR auth
      expect([401, 422]).toContain(response.status);
    });

    it('REJECTS invalid code format (7 digits)', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Authorization', 'Bearer fake-token')
        .send({ code: '1234567' });

      expect([401, 422]).toContain(response.status);
    });

    it('REJECTS non-numeric code', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Authorization', 'Bearer fake-token')
        .send({ code: 'abcdef' });

      expect([401, 422]).toContain(response.status);
    });
  });

  // ============================================
  // POST /api/auth/password/reset-request - GUARD RAILS
  // ============================================
  describe('POST /api/auth/password/reset-request', () => {
    it('REJECTS missing email', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset-request')
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset-request')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(422);
    });

    it('ACCEPTS valid email (returns success even if user does not exist)', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset-request')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('email');
    });
  });

  // ============================================
  // POST /api/auth/password/reset - GUARD RAILS
  // ============================================
  describe('POST /api/auth/password/reset', () => {
    it('REJECTS missing token', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ newPassword: 'NewPass123!' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
    });

    it('REJECTS missing newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token' });

      expect(response.status).toBe(422);
    });

    it('REJECTS password < 8 characters', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token', newPassword: 'Short1!' });

      expect(response.status).toBe(422);
    });

    it('REJECTS password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token', newPassword: 'alllowercase123' });

      expect(response.status).toBe(422);
    });

    it('REJECTS password without lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token', newPassword: 'ALLUPPERCASE123' });

      expect(response.status).toBe(422);
    });

    it('REJECTS password without number', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token', newPassword: 'NoNumbersHere!' });

      expect(response.status).toBe(422);
    });

    it('ACCEPTS valid password format', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: 'some-token', newPassword: 'ValidPass123!' });

      // Will fail auth (invalid token) but validation should pass
      expect(response.status).not.toBe(422);
    });
  });

  // ============================================
  // HEALTH CHECK - Should always work
  // ============================================
  describe('GET /health', () => {
    it('returns 200 OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  // ============================================
  // 404 - Unknown routes
  // ============================================
  describe('404 Handler', () => {
    it('REJECTS unknown routes with 404', async () => {
      const response = await request(app).get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
