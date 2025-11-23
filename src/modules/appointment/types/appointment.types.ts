/**
 * APPOINTMENT MODULE TYPES
 * Type definitions, schemas, and error classes
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const AppointmentType = {
  CONSULTATION: 'consultation',
  TEST_DRIVE: 'test_drive',
  DELIVERY: 'delivery',
  SERVICE: 'service',
  FOLLOW_UP: 'follow_up',
  OTHER: 'other',
} as const;

export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentTypeEnum = (typeof AppointmentType)[keyof typeof AppointmentType];
export type AppointmentStatusEnum = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// ============================================================================
// SCHEMAS
// ============================================================================

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  dealershipId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  appointmentType: z.enum([
    'consultation',
    'test_drive',
    'delivery',
    'service',
    'follow_up',
    'other',
  ]),
  status: z.enum([
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ]).default('scheduled'),
  scheduledAt: z.date(),
  duration: z.number().positive().default(30), // minutes
  location: z.string().default('dealership'),
  customerId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(), // Assigned salesperson
  notes: z.string().nullable().optional(),
  reminderSent: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAppointmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  appointmentType: z.enum([
    'consultation',
    'test_drive',
    'delivery',
    'service',
    'follow_up',
    'other',
  ]).default('consultation'),
  status: z.enum([
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ]).default('scheduled').optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().positive().default(30),
  location: z.string().default('dealership'),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  vehicleId: z.string().optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

export const AppointmentQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  appointmentType: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().positive().default(50).optional(),
  offset: z.number().nonnegative().default(0).optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentRequest = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;

export interface PaginatedAppointments {
  appointments: Appointment[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AppointmentWithRelations extends Appointment {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  deal?: {
    id: string;
    dealNumber: string;
    status: string;
  };
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
    stockNumber: string;
  };
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AppointmentCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: AppointmentTypeEnum;
  status: AppointmentStatusEnum;
  customerId?: string;
  userId?: string;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class AppointmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppointmentError';
  }
}

export class AppointmentNotFoundError extends AppointmentError {
  constructor(appointmentId: string) {
    super(
      `Appointment not found: ${appointmentId}`,
      'APPOINTMENT_NOT_FOUND',
      { appointmentId }
    );
    this.name = 'AppointmentNotFoundError';
  }
}

export class AppointmentValidationError extends AppointmentError {
  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message, 'APPOINTMENT_VALIDATION_ERROR', { errors });
    this.name = 'AppointmentValidationError';
  }
}

export class AppointmentConflictError extends AppointmentError {
  constructor(message: string, conflictingAppointments: Appointment[]) {
    super(message, 'APPOINTMENT_CONFLICT', { conflictingAppointments });
    this.name = 'AppointmentConflictError';
  }
}
