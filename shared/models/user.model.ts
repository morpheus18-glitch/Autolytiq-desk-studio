import { z } from 'zod';

/**
 * User entity schema with role-based access control
 *
 * Critical authentication entity used in:
 * - getUser, getUsers, createUser, updateUser
 * - getUserByUsername, getUserByEmail, getUserByResetToken
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  dealershipId: z.string().uuid(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric with - or _'),
  email: z.string().email('Invalid email format'),
  passwordHash: z.string().min(1), // Hashed password, no validation needed
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'sales', 'finance', 'viewer']),
  isActive: z.boolean().default(true),

  // MFA fields
  mfaEnabled: z.boolean().default(false),
  mfaSecret: z.string().nullable().default(null),

  // Password reset
  resetToken: z.string().nullable().default(null),
  resetTokenExpiry: z.date().nullable().default(null),

  // Preferences (JSON)
  preferences: z.record(z.any()).nullable().default(null),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable().default(null),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Schema for creating new users
 * Omits auto-generated fields
 */
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  resetToken: true,
  resetTokenExpiry: true,
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Schema for updating existing users
 * All fields optional except id/dealershipId
 */
export const UpdateUserSchema = CreateUserSchema.partial();
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
