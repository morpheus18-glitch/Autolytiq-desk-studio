/**
 * APPOINTMENT SERVICE
 * Core business logic for appointment management
 *
 * Features:
 * - Multi-tenant isolation
 * - Conflict detection
 * - Calendar integration
 * - Reminder management
 */

import { db } from '../../../core/database/index';
import { appointments } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentQuery,
  PaginatedAppointments,
  AppointmentWithRelations,
  AppointmentCalendarEvent,
} from '../types/appointment.types';
import {
  AppointmentNotFoundError,
  AppointmentValidationError,
  AppointmentConflictError,
} from '../types/appointment.types';

export class AppointmentService {
  /**
   * Create new appointment
   */
  async createAppointment(
    dealershipId: string,
    data: CreateAppointmentRequest,
    createdByUserId?: string
  ): Promise<Appointment> {
    // Validate scheduled time
    const scheduledAt = new Date(data.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new AppointmentValidationError('Appointment must be scheduled in the future', [
        { field: 'scheduledAt', message: 'Must be a future date/time' },
      ]);
    }

    // Check for conflicts if user is assigned
    if (data.userId) {
      const conflicts = await this.checkForConflicts(
        dealershipId,
        data.userId,
        scheduledAt,
        data.duration || 30
      );

      if (conflicts.length > 0) {
        throw new AppointmentConflictError(
          'User has conflicting appointments at this time',
          conflicts
        );
      }
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        dealershipId,
        title: data.title,
        description: data.description || null,
        appointmentType: data.appointmentType,
        status: data.status || 'scheduled',
        scheduledAt,
        duration: data.duration || 30,
        location: data.location || 'dealership',
        customerId: data.customerId || null,
        dealId: data.dealId || null,
        vehicleId: data.vehicleId || null,
        userId: data.userId || null,
        notes: data.notes || null,
      })
      .returning();

    return this.mapToAppointment(appointment);
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: string, dealershipId: string): Promise<Appointment> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(eq(appointments.id, appointmentId), eq(appointments.dealershipId, dealershipId))
      )
      .limit(1);

    if (!appointment) {
      throw new AppointmentNotFoundError(appointmentId);
    }

    return this.mapToAppointment(appointment);
  }

  /**
   * List appointments with filters
   */
  async listAppointments(
    dealershipId: string,
    query: AppointmentQuery
  ): Promise<PaginatedAppointments> {
    const conditions = [eq(appointments.dealershipId, dealershipId)];

    // Date range filter
    if (query.startDate) {
      conditions.push(gte(appointments.scheduledAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(appointments.scheduledAt, new Date(query.endDate)));
    }

    // User filter
    if (query.userId) {
      conditions.push(eq(appointments.userId, query.userId));
    }

    // Customer filter
    if (query.customerId) {
      conditions.push(eq(appointments.customerId, query.customerId));
    }

    // Deal filter
    if (query.dealId) {
      conditions.push(eq(appointments.dealId, query.dealId));
    }

    // Type filter
    if (query.appointmentType) {
      conditions.push(eq(appointments.appointmentType, query.appointmentType));
    }

    // Status filter
    if (query.status) {
      conditions.push(eq(appointments.status, query.status));
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const appointmentList = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.scheduledAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select()
      .from(appointments)
      .where(and(...conditions));

    return {
      appointments: appointmentList.map(this.mapToAppointment),
      total: totalResult.length,
      limit,
      offset,
      hasMore: offset + appointmentList.length < totalResult.length,
    };
  }

  /**
   * Get appointments by date
   */
  async getAppointmentsByDate(date: Date, dealershipId: string): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentList = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.dealershipId, dealershipId),
          gte(appointments.scheduledAt, startOfDay),
          lte(appointments.scheduledAt, endOfDay)
        )
      )
      .orderBy(appointments.scheduledAt);

    return appointmentList.map(this.mapToAppointment);
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    appointmentId: string,
    dealershipId: string,
    data: UpdateAppointmentRequest
  ): Promise<Appointment> {
    // Verify appointment exists
    await this.getAppointment(appointmentId, dealershipId);

    // If rescheduling, check for conflicts
    if (data.scheduledAt || data.duration || data.userId) {
      // Get current appointment details
      const current = await this.getAppointment(appointmentId, dealershipId);

      const newScheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : current.scheduledAt;
      const newDuration = data.duration ?? current.duration;
      const newUserId = data.userId !== undefined ? data.userId : current.userId;

      if (newUserId) {
        const conflicts = await this.checkForConflicts(
          dealershipId,
          newUserId,
          newScheduledAt,
          newDuration,
          appointmentId // Exclude current appointment from conflict check
        );

        if (conflicts.length > 0) {
          throw new AppointmentConflictError(
            'User has conflicting appointments at this time',
            conflicts
          );
        }
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.appointmentType !== undefined) updateData.appointmentType = data.appointmentType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId;
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(
        and(eq(appointments.id, appointmentId), eq(appointments.dealershipId, dealershipId))
      )
      .returning();

    return this.mapToAppointment(updated);
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId: string, dealershipId: string): Promise<void> {
    const result = await db
      .delete(appointments)
      .where(
        and(eq(appointments.id, appointmentId), eq(appointments.dealershipId, dealershipId))
      );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AppointmentNotFoundError(appointmentId);
    }
  }

  /**
   * Check for appointment conflicts
   */
  private async checkForConflicts(
    dealershipId: string,
    userId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Appointment[]> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const conditions = [
      eq(appointments.dealershipId, dealershipId),
      eq(appointments.userId, userId),
    ];

    if (excludeAppointmentId) {
      // Exclude current appointment when checking for conflicts during update
      // This requires a NOT condition which we'll handle in the result filtering
    }

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(and(...conditions));

    // Filter for actual time conflicts
    const conflicts = existingAppointments
      .filter((appt) => {
        // Exclude the appointment being updated
        if (excludeAppointmentId && appt.id === excludeAppointmentId) {
          return false;
        }

        const apptEnd = new Date(appt.scheduledAt.getTime() + appt.duration * 60000);

        // Check for overlap
        return (
          (scheduledAt >= appt.scheduledAt && scheduledAt < apptEnd) ||
          (endTime > appt.scheduledAt && endTime <= apptEnd) ||
          (scheduledAt <= appt.scheduledAt && endTime >= apptEnd)
        );
      })
      .map(this.mapToAppointment);

    return conflicts;
  }

  /**
   * Get calendar events for a date range
   */
  async getCalendarEvents(
    dealershipId: string,
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AppointmentCalendarEvent[]> {
    const conditions = [
      eq(appointments.dealershipId, dealershipId),
      gte(appointments.scheduledAt, startDate),
      lte(appointments.scheduledAt, endDate),
    ];

    if (userId) {
      conditions.push(eq(appointments.userId, userId));
    }

    const appointmentList = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(appointments.scheduledAt);

    return appointmentList.map((appt) => ({
      id: appt.id,
      title: appt.title,
      start: appt.scheduledAt,
      end: new Date(appt.scheduledAt.getTime() + appt.duration * 60000),
      type: appt.appointmentType,
      status: appt.status,
      customerId: appt.customerId || undefined,
      userId: appt.userId || undefined,
    }));
  }

  /**
   * Map database record to Appointment type
   */
  private mapToAppointment(dbAppointment: typeof appointments.$inferSelect): Appointment {
    return {
      id: dbAppointment.id,
      dealershipId: dbAppointment.dealershipId,
      title: dbAppointment.title,
      description: dbAppointment.description,
      appointmentType: dbAppointment.appointmentType,
      status: dbAppointment.status,
      scheduledAt: dbAppointment.scheduledAt,
      duration: dbAppointment.duration,
      location: dbAppointment.location,
      customerId: dbAppointment.customerId,
      dealId: dbAppointment.dealId,
      vehicleId: dbAppointment.vehicleId,
      userId: dbAppointment.userId,
      notes: dbAppointment.notes,
      reminderSent: dbAppointment.reminderSent,
      createdAt: dbAppointment.createdAt,
      updatedAt: dbAppointment.updatedAt,
    };
  }
}

// Singleton export
export const appointmentService = new AppointmentService();
