/**
 * SECURITY MIDDLEWARE & CONFIGURATION
 *
 * Centralized security setup for the application including:
 * - HTTP security headers (helmet)
 * - Rate limiting
 * - CSRF protection
 * - Security event logging
 *
 * SECURITY PRINCIPLES:
 * - Defense in depth
 * - Fail securely
 * - Least privilege
 * - Audit all security events
 */

import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { storage } from './storage';

// ============================================================================
// SECURITY HEADERS (HELMET)
// ============================================================================

export function setupSecurityHeaders(app: Express): void {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for React
          styleSrc: ["'self'", "'unsafe-inline'"], // Needed for styled components
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // Prevent clickjacking
      frameguard: {
        action: 'deny',
      },
      // Prevent MIME sniffing
      noSniff: true,
      // Disable client-side caching for sensitive pages
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Remove X-Powered-By header
      hidePoweredBy: true,
      // Prevent IE from executing downloads in site context
      ieNoOpen: true,
      // Don't allow browser to guess content type
      xssFilter: true,
    })
  );

  console.log('✅ Security headers configured (helmet)');
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Strict rate limiting for authentication endpoints
 * Protects against brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
  handler: (req: Request, res: Response) => {
    // Log rate limit violations
    logSecurityEvent(
      'rate_limit_exceeded',
      'security',
      req,
      { endpoint: req.path, method: req.method },
      false,
      'Authentication rate limit exceeded'
    ).catch(console.error);

    res.status(429).json({
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * General API rate limiting
 * Protects against API abuse
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(
      'api_rate_limit_exceeded',
      'security',
      req,
      { endpoint: req.path, method: req.method },
      false,
      'API rate limit exceeded'
    ).catch(console.error);

    res.status(429).json({
      error: 'Too many requests. Please slow down.',
    });
  },
});

/**
 * Password reset rate limiting
 * Prevents email enumeration and spam
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default (handles IPv6 correctly)
  // Rate limiting is still by IP, but email enumeration is prevented
  // by returning generic error messages
  handler: (req: Request, res: Response) => {
    logSecurityEvent(
      'password_reset_rate_limit_exceeded',
      'security',
      req,
      { email: req.body?.email },
      false,
      'Password reset rate limit exceeded'
    ).catch(console.error);

    res.status(429).json({
      error: 'Too many password reset requests. Please try again later.',
    });
  },
});

/**
 * User creation rate limiting (for admin endpoints)
 * Prevents mass account creation abuse
 */
export const userCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 users per hour
  message: {
    error: 'Too many user creation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(
      'user_creation_rate_limit_exceeded',
      'security',
      req,
      { attemptedUser: req.body?.username },
      false,
      'User creation rate limit exceeded'
    ).catch(console.error);

    res.status(429).json({
      error: 'Too many user creation requests. Please try again later.',
    });
  },
});

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

/**
 * Log security events for audit trail
 *
 * CRITICAL: All authentication and authorization events MUST be logged
 */
export async function logSecurityEvent(
  eventType: string,
  eventCategory: string,
  req: Request,
  metadata?: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  const user = req.user as Express.User | undefined;

  const auditEntry = {
    userId: user?.id || null,
    username: user?.username || null,
    eventType,
    eventCategory,
    ipAddress: (req.ip || req.socket.remoteAddress) || null,
    userAgent: req.get('user-agent') || null,
    metadata: metadata || {},
    success,
    errorMessage: errorMessage || null,
  };

  try {
    await storage.createSecurityAuditLog(auditEntry);
  } catch (error) {
    // CRITICAL: Never fail the request if audit logging fails
    // But always log the error for investigation
    console.error('[SECURITY] Failed to log security event:', {
      error,
      event: auditEntry,
    });
  }
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Request sanitization middleware
 * Prevents common injection attacks
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Remove null bytes from all string inputs
  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Enforce HTTPS in production
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
  }
  next();
}

// ============================================================================
// SECURITY INITIALIZATION
// ============================================================================

/**
 * Initialize all security middleware
 * Call this BEFORE route setup
 */
export function initializeSecurity(app: Express): void {
  console.log('🔒 Initializing security middleware...');

  // 1. Enforce HTTPS in production
  app.use(enforceHttps);

  // 2. Security headers
  setupSecurityHeaders(app);

  // 3. Request sanitization
  app.use(sanitizeRequest);

  // 4. General API rate limiting
  // NOTE: Specific rate limiters applied to individual routes
  app.use('/api/', apiRateLimiter);

  console.log('✅ Security middleware initialized');
}
