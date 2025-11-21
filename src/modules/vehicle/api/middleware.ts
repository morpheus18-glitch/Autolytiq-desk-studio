/**
 * VEHICLE MODULE MIDDLEWARE
 * Common middleware and utilities for vehicle API routes
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extended Express Request with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    dealershipId: string;
    role: string;
    username: string;
  };
}

/**
 * Extract dealershipId from authenticated request
 * Throws 403 if dealershipId is missing
 */
export function extractDealershipId(req: AuthenticatedRequest): string {
  const dealershipId = req.user?.dealershipId;

  if (!dealershipId) {
    throw new Error('User must belong to a dealership');
  }

  return dealershipId;
}

/**
 * Extract optional userId from authenticated request
 */
export function extractUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.id;
}

/**
 * Middleware to add dealershipId to query params
 * Useful for consistency across all endpoints
 */
export function injectDealershipId(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const dealershipId = extractDealershipId(req);

    // Add to query if not already present
    if (!req.query.dealershipId) {
      req.query.dealershipId = dealershipId;
    }

    next();
  } catch (error) {
    res.status(403).json({ error: error.message || 'Forbidden' });
  }
}

/**
 * Async error handler wrapper
 * Catches async errors and forwards to Express error handler
 */
export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

/**
 * Validate UUID parameter
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Middleware to validate UUID in route params
 */
export function validateUUIDParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        error: `Invalid ${paramName}`,
        message: `${paramName} must be a valid UUID`,
      });
    }

    next();
  };
}
