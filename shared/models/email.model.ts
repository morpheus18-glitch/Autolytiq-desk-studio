import { z } from 'zod';

// Email address schema with validation
const emailAddressSchema = z.string().email('Invalid email format');

// Email participant schema
export const EmailParticipantSchema = z.object({
  email: emailAddressSchema,
  name: z.string().optional(),
  type: z.enum(['from', 'to', 'cc', 'bcc', 'reply-to']),
});

// Email status enum
export const EmailStatusSchema = z.enum([
  'draft',
  'queued',
  'sending',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'received',
  'read',
  'archived',
  'spam',
]);

// Email priority enum
export const EmailPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// Email category enum
export const EmailCategorySchema = z.enum([
  'inbox',
  'sent',
  'draft',
  'trash',
  'spam',
  'archived',
  'starred',
  'important',
]);

// Email direction enum
export const EmailDirectionSchema = z.enum(['inbound', 'outbound']);

// Attachment schema
export const EmailAttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().min(0), // bytes
  url: z.string().url().optional(),
  contentId: z.string().optional(), // For inline attachments
  isInline: z.boolean().default(false),
  checksum: z.string().optional(),
});

// Email header schema
export const EmailHeaderSchema = z.object({
  messageId: z.string(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  xMailer: z.string().optional(),
  xOriginalIp: z.string().optional(),
  returnPath: z.string().optional(),
  dkimSignature: z.string().optional(),
  spfResult: z.enum(['pass', 'fail', 'softfail', 'neutral', 'none']).optional(),
  dkimResult: z.enum(['pass', 'fail', 'none']).optional(),
  dmarcResult: z.enum(['pass', 'fail', 'none']).optional(),
});

// Email thread schema
export const EmailThreadSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  participants: z.array(EmailParticipantSchema),
  messageCount: z.number().min(1),
  lastMessageAt: z.string().datetime(),
  isRead: z.boolean().default(false),
  isStarred: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// Email template schema
export const EmailTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  subject: z.string().min(1),
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
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    defaultValue: z.string().optional(),
    required: z.boolean().default(false),
  })).default([]),
  attachments: z.array(EmailAttachmentSchema).default([]),
  isActive: z.boolean().default(true),
  usageCount: z.number().default(0),
  lastUsedAt: z.string().datetime().optional(),
});

// Email account configuration schema
export const EmailAccountSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: emailAddressSchema,
  displayName: z.string().optional(),
  provider: z.enum(['gmail', 'outlook', 'yahoo', 'custom', 'smtp']),

  // Authentication
  authType: z.enum(['oauth2', 'basic', 'api-key']),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),

  // Server settings (for custom/SMTP)
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecurity: z.enum(['none', 'tls', 'ssl']).optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().optional(),
  imapSecurity: z.enum(['none', 'tls', 'ssl']).optional(),

  // Sync settings
  syncEnabled: z.boolean().default(true),
  syncInterval: z.number().default(5), // minutes
  lastSyncAt: z.string().datetime().optional(),
  syncStatus: z.enum(['idle', 'syncing', 'error']).default('idle'),
  syncError: z.string().optional(),

  // Signature
  signature: z.string().optional(),
  signatureHtml: z.string().optional(),
  autoAddSignature: z.boolean().default(true),

  // Settings
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  maxAttachmentSize: z.number().default(25 * 1024 * 1024), // 25MB
  dailySendLimit: z.number().optional(),
  sentToday: z.number().default(0),
});

// Main Email Message schema
export const EmailMessageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  threadId: z.string().uuid().optional(),

  // Message ID from email provider
  externalId: z.string().optional(),
  messageId: z.string().optional(),

  // Participants
  from: EmailParticipantSchema,
  to: z.array(EmailParticipantSchema),
  cc: z.array(EmailParticipantSchema).default([]),
  bcc: z.array(EmailParticipantSchema).default([]),
  replyTo: EmailParticipantSchema.optional(),

  // Content
  subject: z.string(),
  bodyHtml: z.string().optional(),
  bodyText: z.string(),
  preview: z.string().optional(), // First 200 chars of body

  // Metadata
  status: EmailStatusSchema,
  direction: EmailDirectionSchema,
  priority: EmailPrioritySchema.default('normal'),
  category: EmailCategorySchema.default('inbox'),

  // Headers
  headers: EmailHeaderSchema.optional(),

  // Attachments
  attachments: z.array(EmailAttachmentSchema).default([]),
  hasAttachments: z.boolean().default(false),

  // Timestamps
  sentAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),

  // Flags
  isRead: z.boolean().default(false),
  isStarred: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  isSpam: z.boolean().default(false),
  isDraft: z.boolean().default(false),

  // Associations
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(), // Assigned user

  // Tags and labels
  tags: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  folder: z.string().optional(),

  // Reply/Forward tracking
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  isReply: z.boolean().default(false),
  isForward: z.boolean().default(false),

  // Template tracking
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).optional(),

  // Analytics
  openCount: z.number().default(0),
  clickCount: z.number().default(0),
  lastOpenedAt: z.string().datetime().optional(),
  trackingPixelId: z.string().optional(),

  // System fields
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

// Types
export type EmailParticipant = z.infer<typeof EmailParticipantSchema>;
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
export type EmailPriority = z.infer<typeof EmailPrioritySchema>;
export type EmailCategory = z.infer<typeof EmailCategorySchema>;
export type EmailDirection = z.infer<typeof EmailDirectionSchema>;
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;
export type EmailHeader = z.infer<typeof EmailHeaderSchema>;
export type EmailThread = z.infer<typeof EmailThreadSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type EmailAccount = z.infer<typeof EmailAccountSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;

// API Request/Response schemas
export const SendEmailRequestSchema = z.object({
  accountId: z.string().uuid().optional(), // Use default if not provided
  to: z.array(emailAddressSchema).min(1),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().optional(),
  bodyText: z.string().min(1),
  priority: EmailPrioritySchema.optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // Base64 encoded
    contentType: z.string(),
  })).optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const EmailListQuerySchema = z.object({
  tenantId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  category: EmailCategorySchema.optional(),
  status: EmailStatusSchema.optional(),
  direction: EmailDirectionSchema.optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  search: z.string().optional(), // Search in subject, body, participants
  from: emailAddressSchema.optional(),
  to: emailAddressSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasAttachments: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  sortBy: z.enum(['receivedAt', 'sentAt', 'subject', 'from']).default('receivedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
export type EmailListQuery = z.infer<typeof EmailListQuerySchema>;