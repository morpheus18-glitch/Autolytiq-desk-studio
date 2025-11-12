import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole, requirePermission } from "./middleware";
import { 
  logSecurityEvent, 
  generateResetToken, 
  hashResetToken, 
  generateResetTokenExpiry,
  generateMfaSecret,
  generateQrCodeUrl,
  verifyTotp
} from "./auth-helpers";
import { z } from "zod";
import QRCode from "qrcode";

// Validation schemas
const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    desktop: z.boolean().optional(),
  }).optional(),
  defaultView: z.string().optional(),
});

const dealershipSettingsSchema = z.object({
  dealershipName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  defaultTaxRate: z.string().optional(),
  docFee: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  settings: z.any().optional(),
});

const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const verify2faSchema = z.object({
  token: z.string().length(6, "TOTP token must be 6 digits"),
});

export function setupAuthRoutes(app: Express) {
  // ===== 2FA LOGIN VERIFICATION =====
  app.post("/api/auth/login/verify-2fa", async (req: Request, res: Response) => {
    try {
      // Check if there's a pending 2FA login in session
      const pendingUserId = (req.session as any).pending2faUserId;
      
      if (!pendingUserId) {
        return res.status(400).json({ error: "No pending 2FA login" });
      }
      
      const { token } = verify2faSchema.parse(req.body);
      const user = await storage.getUser(pendingUserId);
      
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ error: "Invalid 2FA state" });
      }
      
      const isValid = verifyTotp(token, user.mfaSecret);
      
      if (!isValid) {
        await logSecurityEvent(
          "login_2fa_failed",
          "authentication",
          req,
          { userId: user.id },
          false,
          "Invalid TOTP token"
        );
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      // Clear pending 2FA and complete login
      delete (req.session as any).pending2faUserId;
      
      // Login the user
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        
        await logSecurityEvent(
          "login_success",
          "authentication",
          req,
          { userId: user.id, mfa: true }
        );
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "2FA verification failed" });
    }
  });
  
  // ===== USER PREFERENCES =====
  app.get("/api/user/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      res.json(user.preferences || {});
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get user preferences" });
    }
  });

  app.put("/api/user/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      const preferences = preferencesSchema.parse(req.body);
      
      // Merge with existing preferences
      const currentPrefs = user.preferences || {};
      const updatedPrefs = { ...currentPrefs, ...preferences };
      
      const updatedUser = await storage.updateUserPreferences(user.id, updatedPrefs);
      
      await logSecurityEvent(
        "preferences_updated",
        "account_management",
        req,
        { preferences: Object.keys(preferences) }
      );
      
      res.json(updatedUser.preferences);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update preferences" });
    }
  });

  // ===== DEALERSHIP SETTINGS =====
  app.get("/api/dealership/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getDealershipSettings();
      if (!settings) {
        return res.status(404).json({ error: "Dealership settings not found" });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get dealership settings" });
    }
  });

  app.put("/api/dealership/settings", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      const updates = dealershipSettingsSchema.parse(req.body);
      
      const currentSettings = await storage.getDealershipSettings();
      if (!currentSettings) {
        return res.status(404).json({ error: "Dealership settings not found" });
      }
      
      const updatedSettings = await storage.updateDealershipSettings(currentSettings.id, updates);
      
      await logSecurityEvent(
        "dealership_settings_updated",
        "account_management",
        req,
        { updatedFields: Object.keys(updates), userId: user.id }
      );
      
      res.json(updatedSettings);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update dealership settings" });
    }
  });

  // ===== PERMISSIONS & RBAC =====
  app.get("/api/permissions", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get permissions" });
    }
  });

  app.get("/api/user/permissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      const permissions = await storage.getRolePermissions(user.role);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get user permissions" });
    }
  });

  // ===== SECURITY AUDIT LOG =====
  app.get("/api/audit/security", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const eventType = req.query.eventType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const logs = await storage.getSecurityAuditLogs({ userId, eventType, limit });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get security audit logs" });
    }
  });

  // ===== PASSWORD RESET =====
  app.post("/api/auth/request-reset", async (req: Request, res: Response) => {
    try {
      const { email } = requestResetSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        await logSecurityEvent(
          "password_reset_requested",
          "authentication",
          req,
          { email, found: false },
          true
        );
        return res.json({ message: "If that email exists, a reset link has been sent" });
      }
      
      const resetToken = generateResetToken();
      const hashedToken = hashResetToken(resetToken);
      const expiresAt = generateResetTokenExpiry();
      
      await storage.updateUser(user.id, {
        resetToken: hashedToken,
        resetTokenExpires: expiresAt,
      });
      
      await logSecurityEvent(
        "password_reset_requested",
        "authentication",
        req,
        { email: user.email, userId: user.id },
        true
      );
      
      // TODO: Send email with reset link containing the resetToken
      // When email service is implemented, use: sendEmail() from email-config.ts
      // From: support@autolytiq.com
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: http://localhost:5000/reset-password?token=${resetToken}`);
      console.log(`Note: Email would be sent from support@autolytiq.com`);
      
      res.json({ message: "If that email exists, a reset link has been sent" });
    } catch (error: any) {
      await logSecurityEvent(
        "password_reset_requested",
        "authentication",
        req,
        undefined,
        false,
        error.message
      );
      res.status(400).json({ error: error.message || "Failed to request password reset" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      
      const hashedToken = hashResetToken(token);
      
      // Find user with matching reset token
      const users = await storage.getUsers();
      const user = users.find(
        (u) => u.resetToken === hashedToken && u.resetTokenExpires && u.resetTokenExpires > new Date()
      );
      
      if (!user) {
        await logSecurityEvent(
          "password_reset_failed",
          "authentication",
          req,
          { reason: "invalid_or_expired_token" },
          false,
          "Invalid or expired reset token"
        );
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Hash the new password (use same method as registration)
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      });
      
      await logSecurityEvent(
        "password_reset_completed",
        "authentication",
        req,
        { userId: user.id },
        true
      );
      
      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      await logSecurityEvent(
        "password_reset_failed",
        "authentication",
        req,
        undefined,
        false,
        error.message
      );
      res.status(400).json({ error: error.message || "Failed to reset password" });
    }
  });

  // ===== 2FA/MFA =====
  app.post("/api/auth/2fa/setup", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      
      if (user.mfaEnabled) {
        return res.status(400).json({ error: "2FA is already enabled" });
      }
      
      const secret = generateMfaSecret();
      const qrCodeUrl = generateQrCodeUrl(secret, user.username);
      
      // Generate QR code image (base64)
      const qrCode = await QRCode.toDataURL(qrCodeUrl);
      
      // Store secret temporarily (not enabled until verified)
      await storage.updateUser(user.id, { mfaSecret: secret });
      
      await logSecurityEvent(
        "mfa_setup_initiated",
        "security",
        req,
        { userId: user.id }
      );
      
      res.json({
        secret,
        qrCode,
        message: "Scan the QR code with your authenticator app, then verify with a code",
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  app.post("/api/auth/2fa/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      const { token } = verify2faSchema.parse(req.body);
      
      if (!user.mfaSecret) {
        return res.status(400).json({ error: "2FA setup not initiated. Call /api/auth/2fa/setup first" });
      }
      
      const isValid = verifyTotp(token, user.mfaSecret);
      
      if (!isValid) {
        await logSecurityEvent(
          "mfa_verification_failed",
          "security",
          req,
          { userId: user.id },
          false,
          "Invalid TOTP token"
        );
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      // Enable MFA
      await storage.updateUser(user.id, { mfaEnabled: true });
      
      await logSecurityEvent(
        "mfa_enabled",
        "security",
        req,
        { userId: user.id }
      );
      
      res.json({ message: "2FA enabled successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to verify 2FA" });
    }
  });

  app.post("/api/auth/2fa/disable", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as Express.User;
      const { token } = verify2faSchema.parse(req.body);
      
      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }
      
      // Verify current code before disabling
      const isValid = verifyTotp(token, user.mfaSecret);
      
      if (!isValid) {
        await logSecurityEvent(
          "mfa_disable_failed",
          "security",
          req,
          { userId: user.id },
          false,
          "Invalid TOTP token"
        );
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      // Disable MFA
      await storage.updateUser(user.id, { 
        mfaEnabled: false,
        mfaSecret: null 
      });
      
      await logSecurityEvent(
        "mfa_disabled",
        "security",
        req,
        { userId: user.id }
      );
      
      res.json({ message: "2FA disabled successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to disable 2FA" });
    }
  });
}
