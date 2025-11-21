/**
 * Unified security audit logging
 *
 * Consolidates all security event logging into single, robust implementation.
 * All authentication and authorization events MUST be logged for audit trail.
 */

import type { Request } from 'express';
import type { InsertSecurityAuditLog } from '@shared/schema';
import { storage } from '../../../server/storage';

/**
 * Log security event to database audit trail
 *
 * CRITICAL: All authentication and authorization events MUST be logged.
 * Never fail the request if audit logging fails - log the error separately.
 *
 * @param eventType Type of security event (e.g., 'login', 'password_reset', 'rate_limit_exceeded')
 * @param eventCategory Category (AUTH, ACCESS, DATA, SECURITY, etc.)
 * @param req Express request object
 * @param metadata Optional event metadata/context
 * @param success Whether the event was successful
 * @param errorMessage Optional error message for failed events
 * @returns Promise resolving when logged
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

  const auditEntry: Omit<InsertSecurityAuditLog, 'id' | 'createdAt'> = {
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
