/**
 * APPOINTMENT API ROUTES
 * Calendar and appointment management endpoints
 *
 * Responsibilities:
 * - Create/update/delete appointments
 * - Query appointments by date/user/customer
 * - Manage appointment types and statuses
 * - Calendar integration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const createAppointmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  appointmentType: z.enum([
    'consultation',
    'test_drive',
    'delivery',
    'service',
    'follow_up',
    'other'
  ]).default('consultation'),
  scheduledAt: z.string().datetime(),
  duration: z.number().positive().default(30),
  location: z.string().default('dealership'),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  vehicleId: z.string().optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial();

const appointmentQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  customerId: z.string().optional(),
  appointmentType: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

interface AppointmentStorage {
  getAppointmentsByDate(date: Date, dealershipId: string): Promise<any[]>;
  getAppointments(dealershipId: string, options?: any): Promise<any[]>;
  createAppointment(data: any): Promise<any>;
  updateAppointment(id: string, data: any): Promise<any>;
  deleteAppointment(id: string): Promise<void>;
}

// ============================================================================
// ROUTER
// ============================================================================

export function createAppointmentRouter(storage: AppointmentStorage) {
  const router = Router();

  /**
   * GET /api/appointments/date/:date
   * Get all appointments for a specific date
   *
   * SECURITY: Requires authentication
   * MULTI-TENANT: Filtered by dealership
   */
  router.get('/date/:date', async (req: Request, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const date = new Date(req.params.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const appointments = await storage.getAppointmentsByDate(date, dealershipId);
      res.json(appointments);
    } catch (error) {
      console.error('[GET /api/appointments/date/:date] Error:', error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  /**
   * GET /api/appointments
   * Get all appointments with optional filters
   *
   * Query params:
   * - startDate: ISO datetime string
   * - endDate: ISO datetime string
   * - userId: Filter by assigned user
   * - customerId: Filter by customer
   * - appointmentType: Filter by type
   *
   * SECURITY: Requires authentication
   * MULTI-TENANT: Filtered by dealership
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const validation = appointmentQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: validation.error.errors,
        });
      }

      const options: any = {};
      if (validation.data.startDate) {
        options.startDate = new Date(validation.data.startDate);
      }
      if (validation.data.endDate) {
        options.endDate = new Date(validation.data.endDate);
      }
      if (validation.data.userId) {
        options.userId = validation.data.userId;
      }
      if (validation.data.customerId) {
        options.customerId = validation.data.customerId;
      }
      if (validation.data.appointmentType) {
        options.appointmentType = validation.data.appointmentType;
      }

      const appointments = await storage.getAppointments(dealershipId, options);
      res.json(appointments);
    } catch (error) {
      console.error('[GET /api/appointments] Error:', error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  /**
   * POST /api/appointments
   * Create new appointment
   *
   * SECURITY: Requires authentication
   * MULTI-TENANT: Created in authenticated user's dealership
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      const currentUserId = req.user?.id;

      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const validation = createAppointmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      const appointment = await storage.createAppointment({
        title: data.title,
        description: data.description || null,
        appointmentType: data.appointmentType,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration,
        location: data.location,
        customerId: data.customerId || null,
        dealId: data.dealId || null,
        vehicleId: data.vehicleId || null,
        notes: data.notes || null,
        userId: data.userId || currentUserId, // Allow assigning to another user
        dealershipId,
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error('[POST /api/appointments] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create appointment';
      res.status(400).json({ error: message });
    }
  });

  /**
   * PATCH /api/appointments/:id
   * Update existing appointment
   *
   * SECURITY: Requires authentication
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const validation = updateAppointmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const updates: any = {};
      if (validation.data.title !== undefined) updates.title = validation.data.title;
      if (validation.data.description !== undefined) updates.description = validation.data.description;
      if (validation.data.appointmentType !== undefined) updates.appointmentType = validation.data.appointmentType;
      if (validation.data.scheduledAt !== undefined) updates.scheduledAt = new Date(validation.data.scheduledAt);
      if (validation.data.duration !== undefined) updates.duration = validation.data.duration;
      if (validation.data.location !== undefined) updates.location = validation.data.location;
      if (validation.data.customerId !== undefined) updates.customerId = validation.data.customerId;
      if (validation.data.dealId !== undefined) updates.dealId = validation.data.dealId;
      if (validation.data.vehicleId !== undefined) updates.vehicleId = validation.data.vehicleId;
      if (validation.data.userId !== undefined) updates.userId = validation.data.userId;
      if (validation.data.notes !== undefined) updates.notes = validation.data.notes;

      const appointment = await storage.updateAppointment(id, updates);
      res.json(appointment);
    } catch (error) {
      console.error('[PATCH /api/appointments/:id] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update appointment';
      res.status(400).json({ error: message });
    }
  });

  /**
   * DELETE /api/appointments/:id
   * Delete appointment
   *
   * SECURITY: Requires authentication
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteAppointment(id);
      res.status(204).send();
    } catch (error) {
      console.error('[DELETE /api/appointments/:id] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete appointment';
      res.status(400).json({ error: message });
    }
  });

  return router;
}
