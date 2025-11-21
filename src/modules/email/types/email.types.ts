/**
 * EMAIL MODULE - CORE TYPES
 *
 * Comprehensive type system for the email module with runtime validation.
 * All types use Zod for bulletproof validation at runtime.
 *
 * ZERO dependencies on other modules - completely isolated.
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const EmailAddressSchema = z.string().email('Invalid email format');

export const EmailParticipantSchema = z.object({
  email: EmailAddressSchema,
  name: z.string().optional(),
});

export const EmailStatusSchema = z.enum([
  'draft',
  'queued',
  'sending',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'received',
]);

export const EmailPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const EmailDirectionSchema = z.enum(['inbound', 'outbound']);

export const EmailFolderSchema = z.enum([
  'inbox',
  'sent',
  'drafts',
  'trash',
  'archive',
  'spam',
]);

// ============================================================================
// ATTACHMENT SCHEMA
// ============================================================================

export const EmailAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string().min(1, 'Filename required'),
  contentType: z.string().min(1, 'Content type required'),
  size: z.number().min(0).max(25 * 1024 * 1024, 'File too large (max 25MB)'),
  content: z.string().optional(), // Base64 encoded
  url: z.string().url().optional(),
  isInline: z.boolean().default(false),
});

// ============================================================================
// EMAIL MESSAGE SCHEMA
// ============================================================================

export const EmailMessageSchema = z.object({
  // Identity
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),

  // Message ID (from email provider)
  messageId: z.string(),
  resendId: z.string().nullable().optional(),

  // Thread
  threadId: z.string().uuid().nullable().optional(),

  // Participants
  from: EmailParticipantSchema,
  to: z.array(EmailParticipantSchema).min(1, 'At least one recipient required'),
  cc: z.array(EmailParticipantSchema).default([]),
  bcc: z.array(EmailParticipantSchema).default([]),
  replyTo: EmailParticipantSchema.optional(),

  // Content
  subject: z.string().max(500, 'Subject too long'),
  bodyText: z.string(),
  bodyHtml: z.string().optional(),
  preview: z.string().max(200).optional(),

  // Metadata
  status: EmailStatusSchema,
  direction: EmailDirectionSchema,
  priority: EmailPrioritySchema.default('normal'),
  folder: EmailFolderSchema,

  // Flags
  isRead: z.boolean().default(false),
  isStarred: z.boolean().default(false),
  isDraft: z.boolean().default(false),

  // Associations
  customerId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),

  // Attachments
  attachments: z.array(EmailAttachmentSchema).default([]),
  hasAttachments: z.boolean().default(false),

  // Timestamps
  sentAt: z.date().nullable().optional(),
  receivedAt: z.date().nullable().optional(),
  readAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// EMAIL TEMPLATE SCHEMA
// ============================================================================

export const EmailTemplateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  defaultValue: z.string().optional(),
  required: z.boolean().default(false),
});

export const EmailTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Template name required'),
  subject: z.string().min(1, 'Subject required'),
  bodyHtml: z.string(),
  bodyText: z.string(),
  category: z.enum([
    'welcome',
    'follow-up',
    'quote',
    'invoice',
    'reminder',
    'thank-you',
    'marketing',
    'notification',
    'custom',
  ]),
  variables: z.array(EmailTemplateVariableSchema).default([]),
  isActive: z.boolean().default(true),
  usageCount: z.number().default(0),
  lastUsedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// QUEUE SCHEMA
// ============================================================================

export const QueuedEmailSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),

  // Email data
  emailData: z.object({
    to: z.array(EmailParticipantSchema).min(1),
    cc: z.array(EmailParticipantSchema).optional(),
    bcc: z.array(EmailParticipantSchema).optional(),
    subject: z.string().min(1),
    bodyText: z.string(),
    bodyHtml: z.string().optional(),
    attachments: z.array(EmailAttachmentSchema).optional(),
    customerId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
  }),

  // Queue metadata
  status: z.enum(['pending', 'processing', 'sent', 'failed']),
  priority: EmailPrioritySchema.default('normal'),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),

  // Timing
  scheduledFor: z.date().optional(),
  processedAt: z.date().nullable().optional(),

  // Error tracking
  lastError: z.string().nullable().optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Send Email Request
export const SendEmailRequestSchema = z.object({
  to: z.array(EmailParticipantSchema).min(1, 'At least one recipient required'),
  cc: z.array(EmailParticipantSchema).optional(),
  bcc: z.array(EmailParticipantSchema).optional(),
  subject: z.string().min(1, 'Subject required').max(500, 'Subject too long'),
  bodyText: z.string().min(1, 'Email body required'),
  bodyHtml: z.string().optional(),
  priority: EmailPrioritySchema.optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  scheduledFor: z.date().optional(),
});

// Save Draft Request
export const SaveDraftRequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  to: z.array(EmailParticipantSchema).optional(),
  cc: z.array(EmailParticipantSchema).optional(),
  bcc: z.array(EmailParticipantSchema).optional(),
  subject: z.string().optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

// List Emails Query
export const EmailListQuerySchema = z.object({
  folder: EmailFolderSchema.optional(),
  status: EmailStatusSchema.optional(),
  direction: EmailDirectionSchema.optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  hasAttachments: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['receivedAt', 'sentAt', 'subject', 'from']).default('receivedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Apply Template Request
export const ApplyTemplateRequestSchema = z.object({
  templateId: z.string().uuid(),
  variables: z.record(z.string()),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const EmailSendResponseSchema = z.object({
  success: z.boolean(),
  emailId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export const PaginatedEmailsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(EmailMessageSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// ============================================================================
// TYPESCRIPT TYPES (inferred from Zod schemas)
// ============================================================================

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailParticipant = z.infer<typeof EmailParticipantSchema>;
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
export type EmailPriority = z.infer<typeof EmailPrioritySchema>;
export type EmailDirection = z.infer<typeof EmailDirectionSchema>;
export type EmailFolder = z.infer<typeof EmailFolderSchema>;
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type EmailTemplateVariable = z.infer<typeof EmailTemplateVariableSchema>;
export type QueuedEmail = z.infer<typeof QueuedEmailSchema>;

// API Types
export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;
export type EmailListQuery = z.infer<typeof EmailListQuerySchema>;
export type ApplyTemplateRequest = z.infer<typeof ApplyTemplateRequestSchema>;
export type EmailSendResponse = z.infer<typeof EmailSendResponseSchema>;
export type PaginatedEmailsResponse = z.infer<typeof PaginatedEmailsResponseSchema>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface EmailFilters {
  folder?: EmailFolder;
  status?: EmailStatus;
  direction?: EmailDirection;
  isRead?: boolean;
  isStarred?: boolean;
  customerId?: string;
  dealId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
}

export interface EmailStats {
  total: number;
  unread: number;
  starred: number;
  drafts: number;
  sent: number;
  failed: number;
}

export interface EmailSecurityCheck {
  safe: boolean;
  sanitizedHtml?: string;
  sanitizedText?: string;
  phishingScore: number;
  blockedReasons: string[];
  warnings: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class EmailModuleError extends Error {
  constructor(
    message: string,
    public code: EmailErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EmailModuleError';
  }
}

export enum EmailErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SEND_FAILED = 'SEND_FAILED',
  QUEUE_FULL = 'QUEUE_FULL',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_ERROR = 'TEMPLATE_RENDER_ERROR',
  ATTACHMENT_TOO_LARGE = 'ATTACHMENT_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
