/**
 * AUTH API ROUTES
 * Express routes for authentication endpoints
 *
 * Responsibilities:
 * - Login/logout endpoints
 * - Registration
 * - Password reset
 * - 2FA management
 * - User preferences
 * - Session management
 */

import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import QRCode from 'qrcode';
import { AuthService, AuthStorage } from '../services/auth.service';
import { requireAuth, requireRole } from '../services/auth.middleware';
import {
  loginSchema,
  registerSchema,
  verify2FASchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  preferencesSchema,
  type User,
  type LoginRequest,
  type RegisterRequest,
} from '../types/auth.types';
import { AuthError } from '../types/auth.types';

// ============================================================================
// ROUTER SETUP
// ============================================================================

export function createAuthRouter(authService: AuthService, storage: AuthStorage) {
  const router = Router();

  // ============================================================================
  // PASSPORT CONFIGURATION
  // ============================================================================

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const result = await authService.login({ username, password });
        return done(null, result.user, { requires2fa: result.requires2fa });
      } catch (error) {
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Authentication failed';
        return done(null, false, { message: errorMessage });
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  /**
   * POST /api/auth/register
   * Register new user
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const user = await authService.register(validation.data);

      res.status(201).json({
        message: 'Registration successful! Your account is pending approval from an administrator.',
        requiresApproval: true,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ message: (error instanceof Error ? error.message : String(error)) });
      }
      console.error('Registration error:', error);
      const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
      res.status(500).json({ message: 'Registration failed', error: message });
    }
  });

  /**
   * POST /api/auth/login
   * Login user
   */
  router.post('/login', (req: Request, res: Response, next) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.errors,
      });
    }

    passport.authenticate('local', (err: Error | null, user: User | false, info?: { message?: string }) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      // Check if 2FA is required
      if (info?.requires2fa) {
        (req.session as { pending2faUserId?: string }).pending2faUserId = user.id;
        return res.status(200).json({
          requires2fa: true,
          message: 'Please verify with your authenticator app',
        });
      }

      // Complete login
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        const { password: _, ...userWithoutPassword } = user as Express.User & { password?: string };
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  /**
   * POST /api/auth/login/verify-2fa
   * Verify 2FA token during login
   */
  router.post('/login/verify-2fa', async (req: Request, res: Response) => {
    try {
      const pendingUserId = (req.session as { pending2faUserId?: string }).pending2faUserId;

      if (!pendingUserId) {
        return res.status(400).json({ error: 'No pending 2FA login' });
      }

      const { token } = verify2FASchema.parse(req.body);
      const user = await authService.verify2FA(pendingUserId, token);

      // Clear pending 2FA
      delete (req.session as { pending2faUserId?: string }).pending2faUserId;

      // Complete login
      req.login(user as Express.User & { password?: string }, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Login failed' });
        }

        const { password: _, ...userWithoutPassword } = user as Express.User & { password?: string };
        res.json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ error: (error instanceof Error ? error.message : String(error)) });
      }
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || '2FA verification failed' });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user
   */
  router.post('/logout', (req: Request, res: Response, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  /**
   * GET /api/auth/user
   * Get current user
   */
  router.get('/user', (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }

    const { password: _, ...userWithoutPassword } = req.user as Express.User & { password?: string };
    res.json(userWithoutPassword);
  });

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  /**
   * POST /api/auth/request-reset
   * Request password reset
   */
  router.post('/request-reset', async (req: Request, res: Response) => {
    try {
      const { email } = passwordResetRequestSchema.parse(req.body);

      const resetToken = await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({ message: 'If that email exists, a reset link has been sent' });

      // TODO: Send email with reset token (handled by caller)
    } catch (error) {
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to request password reset' });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = passwordResetConfirmSchema.parse(req.body);

      await authService.resetPassword(token, newPassword);

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ error: (error instanceof Error ? error.message : String(error)) });
      }
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to reset password' });
    }
  });

  // ============================================================================
  // 2FA MANAGEMENT (Protected)
  // ============================================================================

  /**
   * POST /api/auth/2fa/setup
   * Setup 2FA
   */
  router.post('/2fa/setup', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const result = await authService.setup2FA(user.id, user.username);

      // Generate QR code image
      const qrCode = await QRCode.toDataURL(result.qrCode);

      res.json({
        secret: result.secret,
        qrCode,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ error: (error instanceof Error ? error.message : String(error)) });
      }
      res.status(500).json({ error: 'Failed to setup 2FA' });
    }
  });

  /**
   * POST /api/auth/2fa/verify
   * Verify and enable 2FA
   */
  router.post('/2fa/verify', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { token } = verify2FASchema.parse(req.body);

      await authService.enable2FA(user.id, token);

      res.json({ message: '2FA enabled successfully' });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ error: (error instanceof Error ? error.message : String(error)) });
      }
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to verify 2FA' });
    }
  });

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA
   */
  router.post('/2fa/disable', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { token } = verify2FASchema.parse(req.body);

      await authService.disable2FA(user.id, token);

      res.json({ message: '2FA disabled successfully' });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ error: (error instanceof Error ? error.message : String(error)) });
      }
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to disable 2FA' });
    }
  });

  // ============================================================================
  // USER PREFERENCES (Protected)
  // ============================================================================

  /**
   * GET /api/auth/preferences
   * Get user preferences
   */
  router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      res.json(user.preferences || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user preferences' });
    }
  });

  /**
   * PUT /api/auth/preferences
   * Update user preferences
   */
  router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const preferences = preferencesSchema.parse(req.body);

      // Merge with existing preferences
      const currentPrefs = user.preferences || {};
      const updatedPrefs = { ...currentPrefs, ...preferences };

      const updatedUser = await storage.updateUserPreferences(user.id, updatedPrefs);

      res.json(updatedUser.preferences);
    } catch (error) {
      res.status(400).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to update preferences' });
    }
  });

  return router;
}

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

export interface SessionConfig {
  secret: string;
  store?: session.Store;
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    maxAge?: number;
    sameSite?: 'lax' | 'strict' | 'none';
  };
}

export function createSessionMiddleware(config: SessionConfig) {
  return session({
    secret: config.secret,
    resave: false,
    saveUninitialized: false,
    store: config.store,
    cookie: {
      httpOnly: config.cookie?.httpOnly ?? true,
      secure: config.cookie?.secure ?? false,
      maxAge: config.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: config.cookie?.sameSite ?? 'lax',
    },
  });
}
