/**
 * Password and authentication cryptography utilities
 *
 * Provides secure password hashing, comparison, token generation, and TOTP/MFA support.
 */

import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { authenticator } from 'otplib';

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with salt
 * @param password Plain text password
 * @returns Hashed password string (scrypt format: hash.salt)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare supplied password against stored hash using timing-safe comparison
 * @param supplied Plain text password from user
 * @param stored Hashed password from database (hash.salt format)
 * @returns True if passwords match
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
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

/**
 * Generate cryptographically secure reset token
 * @returns 32-byte hex token (64 characters)
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash reset token for database storage using SHA256
 * @param token Plain token from generateResetToken()
 * @returns Hashed token for DB storage
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate reset token expiry time (1 hour from now)
 * @returns Date object 1 hour in future
 */
export function generateResetTokenExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Generate TOTP/MFA secret for authenticator apps
 * @returns Base32 encoded secret
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code URI for authenticator apps
 * @param secret TOTP secret from generateMfaSecret()
 * @param username User's username or email
 * @param issuer Application name (default: "NextGen Auto Desk")
 * @returns otpauth:// URI for QR code generation
 */
export function generateQrCodeUrl(
  secret: string,
  username: string,
  issuer: string = 'NextGen Auto Desk'
): string {
  return authenticator.keyuri(username, issuer, secret);
}

/**
 * Verify TOTP token against secret
 * @param token 6-digit code from authenticator app
 * @param secret TOTP secret
 * @returns True if token is valid
 */
export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}
