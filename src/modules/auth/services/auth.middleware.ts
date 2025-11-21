/**
 * AUTH MIDDLEWARE
 * Express middleware for authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import type { User } from '../types/auth.types';
import { UnauthorizedError, ForbiddenError } from '../types/auth.types';

// ============================================================================
// TYPE EXTENSIONS
// ============================================================================

declare global {
  namespace Express {
    interface User {
      id: string;
      dealershipId: string;
      username: string;
      fullName: string;
      email: string;
      role: string;
      emailVerified: boolean;
      mfaEnabled: boolean;
      mfaSecret: string | null;
      lastLogin: Date | null;
      preferences: Record<string, unknown>;
      isActive: boolean;
      resetToken: string | null;
      resetTokenExpires: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Require user to be authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Require user to have specific role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user!.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Require user to have specific permission(s)
 * This would integrate with a permissions system
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // TODO: Implement permission checking via storage
    // For now, just pass through
    next();
  };
}

/**
 * Require user to be active
 */
export function requireActive(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (!req.user!.isActive) {
    res.status(403).json({ message: 'Account is not active' });
    return;
  }

  next();
}

/**
 * Multi-tenant isolation: ensure user can only access their dealership's data
 */
export function requireSameDealership(
  getDealershipId: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const resourceDealershipId = getDealershipId(req);

    if (resourceDealershipId && resourceDealershipId !== req.user!.dealershipId) {
      res.status(403).json({
        message: 'Cannot access resources from other dealerships'
      });
      return;
    }

    next();
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current user from request
 */
export function getCurrentUser(req: Request): Express.User | null {
  return req.user || null;
}

/**
 * Check if user has role
 */
export function hasRole(user: Express.User | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: Express.User | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: Express.User | null): boolean {
  return hasRole(user, 'admin', 'sales_manager');
}
