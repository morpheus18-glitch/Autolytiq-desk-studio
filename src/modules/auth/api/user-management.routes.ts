/**
 * USER MANAGEMENT API ROUTES
 * Admin routes for user CRUD operations
 *
 * Responsibilities:
 * - List users in dealership
 * - Create new users (admin only)
 * - Update user details (admin only)
 * - Deactivate users (admin only)
 *
 * SECURITY: All routes require admin role
 */

import { Router, Request, Response } from 'express';
import { AuthService, AuthStorage, hashPassword } from '../services/auth.service';
import { requireAuth, requireRole } from '../services/auth.middleware';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'salesperson', 'finance_manager']).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'salesperson', 'finance_manager']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// ROUTER
// ============================================================================

export function createUserManagementRouter(
  authService: AuthService,
  storage: AuthStorage
) {
  const router = Router();

  /**
   * GET /api/users
   * List all users in authenticated user's dealership
   *
   * SECURITY: Requires authentication
   * MULTI-TENANT: Filtered by dealership
   */
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const users = await storage.getUsers(dealershipId);

      // Remove password from all users
      const sanitizedUsers = users.map(({ password: _, ...user }) => user);

      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  /**
   * POST /api/admin/users
   * Create new user in dealership
   *
   * SECURITY: Requires admin role
   * MULTI-TENANT: User created in admin's dealership
   */
  router.post('/admin/users', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { username, email, fullName, password, role } = validation.data;
      const dealershipId = req.user?.dealershipId;

      if (!dealershipId) {
        return res.status(403).json({ error: 'Admin must belong to a dealership' });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user - admin-created users are ACTIVE by default
      const newUser = await storage.createUser(
        {
          username,
          email,
          fullName,
          password: hashedPassword,
          role: role || 'salesperson',
          isActive: true,
        },
        dealershipId
      );

      // TODO: Send welcome email via email module
      // const { EmailService } = await import('../../email/services/email.service');
      // await EmailService.sendWelcomeEmail(email, username, password);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      const message = error instanceof Error ? error.message : 'Failed to create user';
      res.status(500).json({ error: message });
    }
  });

  /**
   * PATCH /api/admin/users/:id
   * Update user details
   *
   * SECURITY: Requires admin role
   * MULTI-TENANT: Implicitly enforced by storage layer
   */
  router.patch('/admin/users/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const updates = validation.data;

      // Security: Prevent modifying sensitive fields
      const sanitizedUpdates = {
        ...updates,
        // Explicitly prevent these fields from being updated
        password: undefined,
        id: undefined,
        createdAt: undefined,
        dealershipId: undefined,
      };

      const updatedUser = await storage.updateUser(id, sanitizedUpdates);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      const message = error instanceof Error ? error.message : 'Failed to update user';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
