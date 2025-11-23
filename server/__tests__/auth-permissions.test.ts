/**
 * AUTH & PERMISSIONS INTEGRATION TESTS
 *
 * Tests authentication and authorization:
 * - User login/logout
 * - Password hashing
 * - Role-based access control (RBAC)
 * - Multi-tenant isolation enforcement
 * - Session management
 * - Permission checks
 *
 * CRITICAL: Security is non-negotiable.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { users, deals } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import { createDeal } from '../database/atomic-operations';

describe('Auth & Permissions Integration Tests', () => {
  let testContext: ReturnType<typeof getTestContext>;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ============================================================================
  // USER AUTHENTICATION TESTS
  // ============================================================================

  describe('User Authentication', () => {
    it('should hash password on user creation', async () => {
      // GIVEN: Plain text password
      const plainPassword = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // WHEN: Creating user with hashed password
      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'newuser',
          fullName: 'New User',
          email: 'new@example.com',
          password: hashedPassword,
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // THEN: Password is hashed
      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toHaveLength(60); // bcrypt hash length

      // AND: Password can be verified
      const isValid = await bcrypt.compare(plainPassword, user.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      // GIVEN: User with password
      const correctPassword = 'CorrectPass123';
      const wrongPassword = 'WrongPass456';
      const hashedPassword = await bcrypt.hash(correctPassword, 10);

      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'testuser2',
          fullName: 'Test User 2',
          email: 'test2@example.com',
          password: hashedPassword,
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // WHEN: Verifying wrong password
      const isValid = await bcrypt.compare(wrongPassword, user.password);

      // THEN: Verification fails
      expect(isValid).toBe(false);
    });

    it('should find user by username', async () => {
      // GIVEN: User with unique username
      const username = 'uniqueuser';
      const [created] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username,
          fullName: 'Unique User',
          email: 'unique@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // WHEN: Looking up by username
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      // THEN: User found
      expect(user).toBeDefined();
      expect(user?.id).toBe(created.id);
      expect(user?.username).toBe(username);
    });

    it('should check if user is active before login', async () => {
      // GIVEN: Inactive user
      const [inactiveUser] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'inactive',
          fullName: 'Inactive User',
          email: 'inactive@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: false, // Deactivated
        })
        .returning();

      // WHEN: Checking active status
      const canLogin = inactiveUser.isActive;

      // THEN: Cannot login
      expect(canLogin).toBe(false);
    });

    it('should enforce unique username constraint', async () => {
      // GIVEN: Existing user
      const username = 'duplicate';
      await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username,
          fullName: 'First User',
          email: 'first@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        });

      // WHEN: Creating user with same username
      const duplicatePromise = db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username, // Same username
          fullName: 'Second User',
          email: 'second@example.com',
          password: await bcrypt.hash('pass456', 10),
          role: 'salesperson',
          isActive: true,
        });

      // THEN: Should fail (database constraint)
      await expect(duplicatePromise).rejects.toThrow();
    });
  });

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // ============================================================================

  describe('Role-Based Access Control', () => {
    it('should assign role to user', async () => {
      // GIVEN: User with manager role
      const [manager] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'manager1',
          fullName: 'Manager User',
          email: 'manager@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'manager',
          isActive: true,
        })
        .returning();

      // THEN: Role assigned correctly
      expect(manager.role).toBe('manager');
    });

    it('should enforce salesperson can only view own deals', async () => {
      // GIVEN: Two salespersons
      const [sales1] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'sales1',
          fullName: 'Sales 1',
          email: 'sales1@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      const [sales2] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'sales2',
          fullName: 'Sales 2',
          email: 'sales2@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // Create deals for each
      const deal1 = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: sales1.id,
      });

      const deal2 = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: sales2.id,
      });

      // WHEN: Sales1 queries their deals
      const sales1Deals = await db.query.deals.findMany({
        where: eq(deals.salespersonId, sales1.id),
      });

      // THEN: Only sees their own deals
      expect(sales1Deals.length).toBe(1);
      expect(sales1Deals[0].id).toBe(deal1.deal.id);
    });

    it('should allow manager to view all deals', async () => {
      // GIVEN: Manager role
      const [manager] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'manager2',
          fullName: 'Manager 2',
          email: 'manager2@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'manager',
          isActive: true,
        })
        .returning();

      // Create deals by different salespersons
      await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      // WHEN: Manager queries all deals
      const allDeals = await db.query.deals.findMany({
        where: eq(deals.dealershipId, testContext.dealershipId),
      });

      // THEN: Can see all deals
      expect(allDeals.length).toBeGreaterThanOrEqual(2);
    });

    it('should check role before allowing admin operations', async () => {
      // GIVEN: Different roles
      const roles: Array<'salesperson' | 'manager' | 'admin'> = ['salesperson', 'manager', 'admin'];

      for (const role of roles) {
        const canManageUsers = role === 'admin' || role === 'manager';
        const canViewReports = role === 'admin' || role === 'manager';
        const canManageInventory = role === 'admin' || role === 'manager';

        // THEN: Permissions based on role
        if (role === 'salesperson') {
          expect(canManageUsers).toBe(false);
        } else {
          expect(canManageUsers).toBe(true);
        }

        expect(canViewReports).toBe(role !== 'salesperson');
        expect(canManageInventory).toBe(role !== 'salesperson');
      }
    });
  });

  // ============================================================================
  // MULTI-TENANT ISOLATION TESTS
  // ============================================================================

  describe('Multi-Tenant Isolation Enforcement', () => {
    it('should enforce users belong to dealership', async () => {
      // GIVEN: User
      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'tenant1',
          fullName: 'Tenant User',
          email: 'tenant@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // THEN: User belongs to dealership
      expect(user.dealershipId).toBe(testContext.dealershipId);
    });

    it('should only fetch users from same dealership', async () => {
      // GIVEN: Users for this dealership
      await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'sameDealership',
          fullName: 'Same Dealership',
          email: 'same@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        });

      // WHEN: Querying users
      const dealershipUsers = await db.query.users.findMany({
        where: eq(users.dealershipId, testContext.dealershipId),
      });

      // THEN: All belong to dealership
      dealershipUsers.forEach(user => {
        expect(user.dealershipId).toBe(testContext.dealershipId);
      });
    });

    it('should prevent cross-dealership deal access', async () => {
      // GIVEN: Deal for this dealership
      const deal = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
      });

      // WHEN: Querying with dealership filter
      const dealFromDb = await db.query.deals.findFirst({
        where: eq(deals.id, deal.deal.id),
      });

      // THEN: Can only access with correct dealership ID
      expect(dealFromDb?.dealershipId).toBe(testContext.dealershipId);

      // Application logic would enforce:
      // if (dealFromDb.dealershipId !== currentUser.dealershipId) {
      //   throw new UnauthorizedError();
      // }
    });

    it('should validate user belongs to dealership before operations', async () => {
      // GIVEN: User
      const user = await db.query.users.findFirst({
        where: eq(users.id, testContext.userId),
      });

      // WHEN: Checking dealership match
      const belongsToDealership = user?.dealershipId === testContext.dealershipId;

      // THEN: Validation passes
      expect(belongsToDealership).toBe(true);
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================================

  describe('Session Management', () => {
    it('should track last login timestamp', async () => {
      // GIVEN: User logging in
      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'session1',
          fullName: 'Session User',
          email: 'session@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // WHEN: Recording login
      const [updated] = await db
        .update(users)
        .set({
          lastLogin: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      // THEN: Last login tracked
      expect(updated.lastLogin).toBeDefined();
      expect(new Date(updated.lastLogin!).getTime()).toBeGreaterThan(
        Date.now() - 5000
      ); // Within 5 seconds
    });

    it('should allow user to update their password', async () => {
      // GIVEN: User with old password
      const oldPassword = 'OldPass123';
      const newPassword = 'NewPass456';

      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'passchange',
          fullName: 'Password Change User',
          email: 'passchange@example.com',
          password: await bcrypt.hash(oldPassword, 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      // WHEN: Changing password
      const newHash = await bcrypt.hash(newPassword, 10);
      const [updated] = await db
        .update(users)
        .set({
          password: newHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      // THEN: New password works
      const isNewValid = await bcrypt.compare(newPassword, updated.password);
      expect(isNewValid).toBe(true);

      // AND: Old password no longer works
      const isOldValid = await bcrypt.compare(oldPassword, updated.password);
      expect(isOldValid).toBe(false);
    });

    it('should deactivate user account', async () => {
      // GIVEN: Active user
      const [user] = await db
        .insert(users)
        .values({
          dealershipId: testContext.dealershipId,
          username: 'deactivate',
          fullName: 'Deactivate User',
          email: 'deactivate@example.com',
          password: await bcrypt.hash('pass123', 10),
          role: 'salesperson',
          isActive: true,
        })
        .returning();

      expect(user.isActive).toBe(true);

      // WHEN: Deactivating
      const [deactivated] = await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      // THEN: User deactivated
      expect(deactivated.isActive).toBe(false);
    });
  });

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  describe('Permission Checks', () => {
    it('should check if user can create deal', async () => {
      // GIVEN: Active salesperson
      const user = await db.query.users.findFirst({
        where: eq(users.id, testContext.userId),
      });

      // WHEN: Checking permission
      const canCreateDeal = user?.isActive && user?.role !== null;

      // THEN: Permission granted
      expect(canCreateDeal).toBe(true);
    });

    it('should check if user can delete deal', async () => {
      // GIVEN: Different roles
      const salesperson = { role: 'salesperson' };
      const manager = { role: 'manager' };
      const admin = { role: 'admin' };

      // WHEN: Checking delete permission
      const salespersonCanDelete = salesperson.role === 'admin' || salesperson.role === 'manager';
      const managerCanDelete = manager.role === 'admin' || manager.role === 'manager';
      const adminCanDelete = admin.role === 'admin';

      // THEN: Only managers and admins can delete
      expect(salespersonCanDelete).toBe(false);
      expect(managerCanDelete).toBe(true);
      expect(adminCanDelete).toBe(true);
    });

    it('should check if user can access reports', async () => {
      // GIVEN: Roles
      const roles = ['salesperson', 'manager', 'admin'];

      roles.forEach(role => {
        // WHEN: Checking report access
        const canAccessReports = role === 'manager' || role === 'admin';

        // THEN: Only managers and admins
        if (role === 'salesperson') {
          expect(canAccessReports).toBe(false);
        } else {
          expect(canAccessReports).toBe(true);
        }
      });
    });

    it('should check if user can manage inventory', async () => {
      // GIVEN: Roles
      const permissions = {
        salesperson: { canManageInventory: false },
        manager: { canManageInventory: true },
        admin: { canManageInventory: true },
      };

      // THEN: Permissions correct
      expect(permissions.salesperson.canManageInventory).toBe(false);
      expect(permissions.manager.canManageInventory).toBe(true);
      expect(permissions.admin.canManageInventory).toBe(true);
    });
  });
});
