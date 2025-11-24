/**
 * Auth Service - Business Logic Layer
 *
 * Handles:
 * - User authentication
 * - MFA setup and verification
 * - Password reset flows
 * - Token generation and validation
 * - Session management
 */

import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';

import { users } from '../../../shared/schema';
import type {
  LoginRequest,
  LoginResponse,
  MFARequiredResponse,
  TokenResponse,
  MFASetupResponse,
  MFAEnabledResponse,
  User,
  JWTPayload,
  SessionData,
} from '../../../shared/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(private db: NeonHttpDatabase<any>) {}

  /**
   * Authenticate user with email and password
   * Returns tokens if successful, or MFA required response
   */
  async login(
    credentials: LoginRequest
  ): Promise<LoginResponse | MFARequiredResponse> {
    // Find user by email
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!credentials.mfaCode) {
        // MFA required but not provided
        return {
          requiresMfa: true,
          message: 'MFA code required for login completion',
        };
      }

      // Verify MFA code
      if (!user.mfaSecret) {
        throw new Error('MFA enabled but no secret configured');
      }

      const isValidMFA = authenticator.verify({
        token: credentials.mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidMFA) {
        throw new Error('Invalid MFA code');
      }
    }

    // Update last login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JWTPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verify user still exists
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Setup MFA for user
   * Returns secret and QR code URL
   */
  async setupMFA(userId: string): Promise<MFASetupResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new TOTP secret
    const secret = authenticator.generateSecret();

    // Save secret (not enabled yet - requires verification)
    await this.db
      .update(users)
      .set({ mfaSecret: secret })
      .where(eq(users.id, userId));

    // Generate QR code URL
    const qrCodeUrl = authenticator.keyuri(
      user.email,
      'Autolytiq',
      secret
    );

    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * Verify MFA code and enable MFA
   */
  async verifyMFA(userId: string, code: string): Promise<MFAEnabledResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaSecret) {
      throw new Error('MFA not set up');
    }

    // Verify code
    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new Error('Invalid MFA code');
    }

    // Enable MFA
    await this.db
      .update(users)
      .set({ mfaEnabled: true })
      .where(eq(users.id, userId));

    return {
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    };
  }

  /**
   * Request password reset
   * Generates token and sends email (email sending handled by caller)
   */
  async requestPasswordReset(email: string): Promise<{ token: string; userId: string }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      // But don't actually create a token
      return { token: '', userId: '' };
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // TODO: Store token in password_reset_tokens table with expiry
    // For now, we'll use JWT with short expiry
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { token: resetToken, userId: user.id };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;

      if (payload.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      const userId = payload.userId;

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      await this.db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId));
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  /**
   * Logout user (invalidate session)
   * Session invalidation handled by caller (clear Redis/session store)
   */
  async logout(userId: string): Promise<void> {
    // Session clearing happens at the gateway/API layer
    // This is just a placeholder for any user-specific cleanup
    return;
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(user: typeof users.$inferSelect): TokenResponse {
    const payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'> = {
      userId: user.id,
      dealershipId: user.dealershipId,
      role: user.role,
    };

    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: typeof users.$inferSelect): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      dealershipId: user.dealershipId,
      mfaEnabled: user.mfaEnabled,
    };
  }

  /**
   * Verify access token and return payload
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }
}
