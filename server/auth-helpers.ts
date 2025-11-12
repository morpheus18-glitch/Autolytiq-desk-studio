import { Request } from "express";
import { randomBytes, createHash } from "crypto";
import { authenticator } from "otplib";
import { storage } from "./storage";
import type { InsertSecurityAuditLog } from "@shared/schema";

// ===== AUDIT LOGGING =====
export async function logSecurityEvent(
  eventType: string,
  eventCategory: string,
  req: Request,
  metadata?: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
) {
  const user = req.user as Express.User | undefined;
  
  const auditEntry: Omit<InsertSecurityAuditLog, "id" | "createdAt"> = {
    userId: user?.id || null,
    username: user?.username || null,
    eventType,
    eventCategory,
    ipAddress: (req.ip || req.socket.remoteAddress) || null,
    userAgent: req.get("user-agent") || null,
    metadata: metadata || {},
    success,
    errorMessage: errorMessage || null,
  };

  try {
    await storage.createSecurityAuditLog(auditEntry);
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Failed to log security event:", error);
  }
}

// ===== PASSWORD RESET =====
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetTokenExpiry(): Date {
  // Token expires in 1 hour
  return new Date(Date.now() + 60 * 60 * 1000);
}

// ===== 2FA/MFA (TOTP) =====
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function generateQrCodeUrl(secret: string, username: string, issuer: string = "NextGen Auto Desk"): string {
  return authenticator.keyuri(username, issuer, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

// ===== RBAC & PERMISSIONS =====
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await storage.getUser(userId);
  if (!user) return [];

  const rolePermissions = await storage.getRolePermissions(user.role);
  return rolePermissions.map((rp) => rp.name);
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.some((p) => userPermissions.includes(p));
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.every((p) => userPermissions.includes(p));
}
