import { z } from 'zod';

/**
 * Appointment schema for customer meetings/test drives
 *
 * Used in: getAppointmentsByDate, getAppointments, createAppointment, updateAppointment, deleteAppointment
 * Impact: MEDIUM - scheduling
 */
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  dealershipId: z.string().uuid(),

  // Customer info
  customerId: z.string().uuid().nullable().default(null),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().nullable().default(null),
  customerPhone: z.string().nullable().default(null),

  // Appointment details
  appointmentType: z.enum(['test_drive', 'sales', 'service', 'finance', 'delivery', 'other']),
  appointmentDate: z.date(),
  duration: z.number().int().positive().default(60), // Minutes

  // Vehicle (if applicable)
  vehicleId: z.string().uuid().nullable().default(null),
  vehicleInfo: z.string().nullable().default(null), // Description if no vehicleId

  // Assignment
  assignedTo: z.string().uuid().nullable().default(null), // User/salesperson ID

  // Status
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).default('scheduled'),

  // Notes
  notes: z.string().nullable().default(null),
  cancellationReason: z.string().nullable().default(null),

  // Tracking
  confirmedAt: z.date().nullable().default(null),
  completedAt: z.date().nullable().default(null),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

/**
 * Schema for creating new appointments
 */
export const CreateAppointmentSchema = AppointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  completedAt: true,
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

/**
 * Schema for updating existing appointments
 */
export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().omit({
  dealershipId: true,
});

export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
