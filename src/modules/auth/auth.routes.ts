/**
 * Auth Routes - API Layer with Validation
 *
 * LAYER 3: RUNTIME VALIDATION
 * Every request validated with Zod before hitting service layer.
 * Invalid requests REJECTED with 422 validation error.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { fromZodError } from 'zod-validation-error';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

import { AuthService } from './auth.service';
import {
  loginRequestSchema,
  refreshTokenRequestSchema,
  mfaVerifyRequestSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../../../shared/types/auth';

/**
 * Middleware: Validate request body with Zod schema
 * REJECTS invalid requests with 422
 */
function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const validationError = fromZodError(result.error);
      res.status(422).json({
        error: 'Validation failed',
        details: validationError.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
      return;
    }

    // Attach validated data to request
    req.body = result.data;
    next();
  };
}

/**
 * Middleware: Extract user from JWT token
 * Requires Authorization: Bearer <token>
 */
function requireAuth(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = authService.verifyAccessToken(token);
      (req as any).user = payload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Create auth router with all endpoints
 */
export function createAuthRouter(db: NeonHttpDatabase<any>): Router {
  const router = Router();
  const authService = new AuthService(db);

  // ============================================
  // POST /api/auth/login
  // ============================================
  router.post(
    '/login',
    validateRequest(loginRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await authService.login(req.body);

        res.status(200).json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid credentials') {
          res.status(401).json({ error: 'Invalid credentials' });
        } else if (error instanceof Error && error.message === 'Invalid MFA code') {
          res.status(401).json({ error: 'Invalid MFA code' });
        } else {
          console.error('Login error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  );

  // ============================================
  // POST /api/auth/logout
  // ============================================
  router.post(
    '/logout',
    requireAuth(authService),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user.userId;
        await authService.logout(userId);

        // Clear session (implementation depends on session store)
        // Session clearing would happen here if using express-session
        // For now, just return success - client will discard tokens

        res.status(200).json({ message: 'Logout successful' });
      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ============================================
  // POST /api/auth/refresh
  // ============================================
  router.post(
    '/refresh',
    validateRequest(refreshTokenRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const tokens = await authService.refreshToken(req.body.refreshToken);

        res.status(200).json(tokens);
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    }
  );

  // ============================================
  // POST /api/auth/mfa/setup
  // ============================================
  router.post(
    '/mfa/setup',
    requireAuth(authService),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user.userId;
        const mfaSetup = await authService.setupMFA(userId);

        res.status(200).json(mfaSetup);
      } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ============================================
  // POST /api/auth/mfa/verify
  // ============================================
  router.post(
    '/mfa/verify',
    requireAuth(authService),
    validateRequest(mfaVerifyRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user.userId;
        const result = await authService.verifyMFA(userId, req.body.code);

        res.status(200).json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid MFA code') {
          res.status(401).json({ error: 'Invalid MFA code' });
        } else {
          console.error('MFA verify error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  );

  // ============================================
  // POST /api/auth/password/reset-request
  // ============================================
  router.post(
    '/password/reset-request',
    validateRequest(passwordResetRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { token, userId } = await authService.requestPasswordReset(req.body.email);

        // TODO: Send email with reset link
        // For now, just return success
        // In production, NEVER reveal if email exists

        res.status(200).json({
          message: 'If the email exists, a password reset link has been sent',
        });
      } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ============================================
  // POST /api/auth/password/reset
  // ============================================
  router.post(
    '/password/reset',
    validateRequest(passwordResetConfirmSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        await authService.resetPassword(req.body.token, req.body.newPassword);

        res.status(200).json({ message: 'Password reset successful' });
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired reset token' });
      }
    }
  );

  return router;
}
