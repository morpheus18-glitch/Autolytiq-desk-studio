import { Router } from 'express';
import { db } from './db';
import { users, dealershipSettings } from '@shared/schema';
import { hashPassword } from './auth';
import { eq } from 'drizzle-orm';

const router = Router();

// TEMPORARY SETUP ROUTE - Remove after admin is created
router.post('/api/setup-admin-now', async (req, res) => {
  try {
    // Create dealership if needed
    const existingDealerships = await db.select().from(dealershipSettings).limit(1);
    let dealershipId: string;

    if (existingDealerships.length === 0) {
      const newDealership = await db.insert(dealershipSettings).values({
        dealershipId: 'default',
        dealershipName: 'Autolytiq Dealership',
        email: 'support@autolytiq.com',
      }).returning();
      dealershipId = newDealership[0].id;
    } else {
      dealershipId = existingDealerships[0].id;
    }

    // Delete existing admin if any
    await db.delete(users).where(eq(users.username, 'admin@autolytiq.com'));

    // Create admin user
    const hashedPassword = await hashPassword('Admin123!');

    const newUser = await db.insert(users).values({
      username: 'admin@autolytiq.com',
      email: 'admin@autolytiq.com',
      fullName: 'Admin User',
      password: hashedPassword,
      role: 'admin',
      dealershipId,
      isActive: true,
    }).returning();

    res.json({
      success: true,
      message: 'Admin user created successfully!',
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        role: newUser[0].role
      },
      credentials: {
        email: 'admin@autolytiq.com',
        password: 'Admin123!'
      }
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
