/**
 * Showroom Manager Types
 */

import type { BaseEntity } from './index';

/**
 * Visit Status Types
 */
export type VisitStatus =
  | 'CHECKED_IN'
  | 'BROWSING'
  | 'TEST_DRIVE'
  | 'NEGOTIATING'
  | 'PAPERWORK'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type TimerType = 'WAIT_TIME' | 'TEST_DRIVE' | 'NEGOTIATION' | 'PAPERWORK' | 'MANAGER_WAIT';

export type VisitSource = 'WALK_IN' | 'APPOINTMENT' | 'INTERNET' | 'PHONE' | 'REFERRAL';

/**
 * Customer Info (subset for display)
 */
export interface VisitCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

/**
 * User Info (subset for display)
 */
export interface VisitUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Vehicle Info (subset for display)
 */
export interface VisitVehicle {
  id: string;
  stock_number?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  exterior_color?: string;
  list_price: number;
}

/**
 * Timer entity
 */
export interface Timer {
  id: string;
  visit_id: string;
  timer_type: TimerType;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  started_by?: string;
  created_at: string;
}

/**
 * Note entity
 */
export interface Note {
  id: string;
  visit_id: string;
  created_by_id: string;
  created_by?: VisitUser;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Event entity (audit trail)
 */
export interface VisitEvent {
  id: string;
  visit_id: string;
  event_type: string;
  user_id?: string;
  previous_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Visit entity
 */
export interface Visit extends BaseEntity {
  dealership_id: string;
  customer_id: string;
  salesperson_id?: string;
  vehicle_id?: string;
  stock_number?: string;
  check_in_time: string;
  check_out_time?: string;
  status: VisitStatus;
  workflow_stage: number;
  source?: VisitSource;
  appointment_id?: string;
  // Joined data
  customer?: VisitCustomer;
  salesperson?: VisitUser;
  vehicle?: VisitVehicle;
  timers?: Timer[];
  notes?: Note[];
  active_timer?: Timer;
}

/**
 * Workflow Stage Configuration
 */
export interface WorkflowStage {
  order: number;
  name: VisitStatus;
  label: string;
  color: string;
}

/**
 * Auto Trigger Configuration
 */
export interface AutoTrigger {
  from_status: VisitStatus;
  after_minutes: number;
  action: 'NOTIFY' | 'AUTO_ADVANCE';
  notify_role?: string;
}

/**
 * Workflow Configuration
 */
export interface WorkflowConfig {
  id: string;
  dealership_id?: string;
  name: string;
  stages: WorkflowStage[];
  auto_triggers: AutoTrigger[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request Types
 */
export interface CreateVisitRequest {
  customer_id: string;
  salesperson_id?: string;
  vehicle_id?: string;
  stock_number?: string;
  source?: VisitSource;
  initial_note?: string;
}

export interface UpdateVisitRequest {
  salesperson_id?: string;
  vehicle_id?: string;
  stock_number?: string;
}

export interface ChangeStatusRequest {
  status: VisitStatus;
}

export interface AttachVehicleRequest {
  vehicle_id: string;
  stock_number?: string;
}

export interface StartTimerRequest {
  timer_type: TimerType;
}

export interface CreateNoteRequest {
  content: string;
  is_pinned?: boolean;
}

export interface UpdateNoteRequest {
  content?: string;
  is_pinned?: boolean;
}

/**
 * Response Types
 */
export interface VisitsResponse {
  visits: Visit[];
  total: number;
}

/**
 * WebSocket Event Types
 */
export type WSEventType =
  | 'VISIT_CREATED'
  | 'VISIT_UPDATED'
  | 'STATUS_CHANGED'
  | 'TIMER_STARTED'
  | 'TIMER_STOPPED'
  | 'NOTE_ADDED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'VISIT_CLOSED';

export interface WSMessage<T = unknown> {
  type: WSEventType;
  data?: T;
}

export interface WSSubscribeMessage {
  type: 'SUBSCRIBE';
  dealership_id: string;
}

/**
 * Filter Options
 */
export interface VisitFilter {
  status?: VisitStatus;
  active_only?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Helper Types
 */
export interface StatusConfig {
  status: VisitStatus;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const VISIT_STATUS_CONFIG: Record<VisitStatus, StatusConfig> = {
  CHECKED_IN: {
    status: 'CHECKED_IN',
    label: 'Checked In',
    color: 'info',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  BROWSING: {
    status: 'BROWSING',
    label: 'Browsing',
    color: 'default',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
  TEST_DRIVE: {
    status: 'TEST_DRIVE',
    label: 'Test Drive',
    color: 'warning',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  NEGOTIATING: {
    status: 'NEGOTIATING',
    label: 'Negotiating',
    color: 'primary',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
  },
  PAPERWORK: {
    status: 'PAPERWORK',
    label: 'Paperwork',
    color: 'accent',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
  },
  CLOSED_WON: {
    status: 'CLOSED_WON',
    label: 'Deal!',
    color: 'success',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  CLOSED_LOST: {
    status: 'CLOSED_LOST',
    label: 'Lost',
    color: 'destructive',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

export const TIMER_TYPE_CONFIG: Record<TimerType, { label: string; icon: string }> = {
  WAIT_TIME: { label: 'Wait Time', icon: 'clock' },
  TEST_DRIVE: { label: 'Test Drive', icon: 'car' },
  NEGOTIATION: { label: 'Negotiation', icon: 'handshake' },
  PAPERWORK: { label: 'Paperwork', icon: 'file-text' },
  MANAGER_WAIT: { label: 'Manager Wait', icon: 'user-check' },
};

/**
 * Utility function to check if a status is closed
 */
export function isClosedStatus(status: VisitStatus): boolean {
  return status === 'CLOSED_WON' || status === 'CLOSED_LOST';
}

/**
 * Utility function to get full name from customer
 */
export function getCustomerFullName(customer?: VisitCustomer): string {
  if (!customer) return 'Unknown';
  return `${customer.first_name} ${customer.last_name}`;
}

/**
 * Utility function to format vehicle description
 */
export function formatVehicleDescription(vehicle?: VisitVehicle): string {
  if (!vehicle) return 'No vehicle';
  const parts = [vehicle.year, vehicle.make, vehicle.model];
  if (vehicle.trim) parts.push(vehicle.trim);
  return parts.join(' ');
}

/**
 * Utility function to format duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Utility function to calculate timer duration
 */
export function calculateTimerDuration(timer: Timer): number {
  if (timer.duration_seconds !== undefined) {
    return timer.duration_seconds;
  }
  const start = new Date(timer.start_time).getTime();
  const end = timer.end_time ? new Date(timer.end_time).getTime() : Date.now();
  return Math.floor((end - start) / 1000);
}
