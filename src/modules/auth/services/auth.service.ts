/**
 * AUTH SERVICE
 * Core authentication business logic
 *
 * Responsibilities:
 * - User authentication (login/logout)
 * - Password hashing and verification
 * - Session management
 * - 2FA operations
 * - Password reset flows
 * - Account lockout management
 */

import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { authenticator } from 'otplib';
import type {
  LoginRequest,
  RegisterRequest,
  User,
  Verify2FARequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  Setup2FAResponse,
} from '../types/auth.types';
import {
  AuthError,
  UnauthorizedError,
  AccountLockedError,
} from '../types/auth.types';

const scryptAsync = promisify(scrypt);

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split('.');
    if (!hashed || !salt) return false;

    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

// ============================================================================
// AUTHENTICATION LOGIC
// ============================================================================

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  failedLoginAttempts?: number;
  accountLockedUntil?: Date | null;
  lastLogin?: Date;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  preferences?: Record<string, unknown>;
}

export interface DealershipSettings {
  id: string;
  name: string;
  settings?: Record<string, unknown>;
}

export interface AuthStorage {
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUser(id: string): Promise<User | null>;
  getUserByResetToken(hashedToken: string): Promise<User | null>;
  createUser(data: CreateUserData, dealershipId: string): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  getDealershipSettings(): Promise<DealershipSettings>;
}

export class AuthService {
  constructor(private storage: AuthStorage) {}

  /**
   * Authenticate user with username and password
   */
  async login(
    credentials: LoginRequest
  ): Promise<{ user: User; requires2fa: boolean }> {
    const { username, password } = credentials;

    const user = await this.storage.getUserByUsername(username);

    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      const minutesRemaining = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / 60000
      );
      throw new AccountLockedError(
        `Account locked. Try again in ${minutesRemaining} minute(s)`,
        minutesRemaining
      );
    }

    // Verify password
    const isValid = await comparePasswords(password, user.password);

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates: UpdateUserData = {
        failedLoginAttempts: newAttempts,
      };

      // Lock account if max attempts reached
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await this.storage.updateUser(user.id, updates);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        throw new AccountLockedError(
          'Too many failed attempts. Account locked for 15 minutes',
          15
        );
      }

      throw new UnauthorizedError(
        `Invalid username or password (${newAttempts}/${MAX_LOGIN_ATTEMPTS})`
      );
    }

    // Successful login - reset failed attempts
    await this.storage.updateUser(user.id, {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLogin: new Date(),
    });

    // Check if 2FA is enabled
    return {
      user,
      requires2fa: user.mfaEnabled,
    };
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<User> {
    const { username, email, fullName, password } = data;

    // Check if username exists
    const existingUser = await this.storage.getUserByUsername(username);
    if (existingUser) {
      throw new AuthError('Username already exists', 'USERNAME_EXISTS', 400);
    }

    // Check if email exists
    const existingEmail = await this.storage.getUserByEmail(email);
    if (existingEmail) {
      throw new AuthError('Email already exists', 'EMAIL_EXISTS', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get default dealership
    const defaultDealership = await this.storage.getDealershipSettings();
    if (!defaultDealership) {
      throw new AuthError(
        'No dealership settings found. Please configure dealership settings first.',
        'NO_DEALERSHIP',
        500
      );
    }

    // Create user - always as salesperson for self-registration
    const user = await this.storage.createUser(
      {
        username,
        email,
        fullName,
        password: hashedPassword,
        role: 'salesperson',
        isActive: false, // Requires admin approval
      },
      defaultDealership.id
    );

    return user;
  }

  /**
   * Verify 2FA token during login
   */
  async verify2FA(userId: string, token: string): Promise<User> {
    const user = await this.storage.getUser(userId);

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AuthError('Invalid 2FA state', 'INVALID_2FA_STATE', 400);
    }

    const isValid = this.verifyTotp(token, user.mfaSecret);

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    return user;
  }

  // ============================================================================
  // 2FA MANAGEMENT
  // ============================================================================

  /**
   * Setup 2FA for user
   */
  async setup2FA(userId: string, username: string): Promise<Setup2FAResponse> {
    const user = await this.storage.getUser(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.mfaEnabled) {
      throw new AuthError('2FA is already enabled', '2FA_ALREADY_ENABLED', 400);
    }

    const secret = this.generateMfaSecret();
    const qrCodeUrl = this.generateQrCodeUrl(secret, username);

    // Generate QR code (needs QRCode library in caller)
    // Store secret temporarily (not enabled until verified)
    await this.storage.updateUser(userId, { mfaSecret: secret });

    return {
      secret,
      qrCode: qrCodeUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    };
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.storage.getUser(userId);

    if (!user || !user.mfaSecret) {
      throw new AuthError(
        '2FA setup not initiated. Call setup2FA first',
        '2FA_NOT_SETUP',
        400
      );
    }

    const isValid = this.verifyTotp(token, user.mfaSecret);

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    await this.storage.updateUser(userId, { mfaEnabled: true });
  }

  /**
   * Disable 2FA after verification
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.storage.getUser(userId);

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AuthError('2FA is not enabled', '2FA_NOT_ENABLED', 400);
    }

    const isValid = this.verifyTotp(token, user.mfaSecret);

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    await this.storage.updateUser(userId, {
      mfaEnabled: false,
      mfaSecret: null,
    });
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const user = await this.storage.getUserByEmail(email);

    // Return null to prevent email enumeration
    if (!user) {
      return null;
    }

    const resetToken = this.generateResetToken();
    const hashedToken = this.hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await this.storage.updateUser(user.id, {
      resetToken: hashedToken,
      resetTokenExpires: expiresAt,
    });

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = this.hashResetToken(token);
    const user = await this.storage.getUserByResetToken(hashedToken);

    if (!user) {
      throw new AuthError(
        'Invalid or expired reset token',
        'INVALID_RESET_TOKEN',
        400
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.storage.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateMfaSecret(): string {
    return authenticator.generateSecret();
  }

  private generateQrCodeUrl(
    secret: string,
    username: string,
    issuer: string = 'NextGen Auto Desk'
  ): string {
    return authenticator.keyuri(username, issuer, secret);
  }

  private verifyTotp(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
