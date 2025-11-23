/**
 * APPOINTMENT MODULE - PUBLIC API
 * Centralized exports for appointment management
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  Appointment,
  AppointmentTypeEnum,
  AppointmentStatusEnum,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentQuery,
  PaginatedAppointments,
  AppointmentWithRelations,
  AppointmentCalendarEvent,
} from './types/appointment.types';

export {
  AppointmentType,
  AppointmentStatus,
  AppointmentSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  AppointmentQuerySchema,
  AppointmentError,
  AppointmentNotFoundError,
  AppointmentValidationError,
  AppointmentConflictError,
} from './types/appointment.types';

// ============================================================================
// SERVICES
// ============================================================================

export { AppointmentService, appointmentService } from './services/appointment.service';

// ============================================================================
// API ROUTES
// ============================================================================

export { createAppointmentRouter } from './api/appointment.routes';
