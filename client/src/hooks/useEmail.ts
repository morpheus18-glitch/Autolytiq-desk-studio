/**
 * Email Hooks
 *
 * React Query hooks for the email service with email logs,
 * templates, and sending capabilities.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';

/**
 * Email log entry from the API
 */
export interface EmailLog {
  id: string;
  dealership_id: string;
  recipient: string;
  subject: string;
  template_id?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

/**
 * Email logs response
 */
export interface EmailLogsResponse {
  logs: EmailLog[];
  total: number;
}

/**
 * Email template
 */
export interface EmailTemplate {
  id: string;
  dealership_id: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Email templates response
 */
export interface EmailTemplatesResponse {
  templates: EmailTemplate[];
  total: number;
}

/**
 * Send email request
 */
export interface SendEmailRequest {
  dealership_id: string;
  to: string;
  subject: string;
  body_html: string;
}

/**
 * Send template email request
 */
export interface SendTemplateEmailRequest {
  dealership_id: string;
  to: string;
  template_id: string;
  variables: Record<string, string>;
}

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  dealership_id: string;
  name: string;
  subject: string;
  body_html: string;
  variables?: string[];
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  name: string;
  subject: string;
  body_html: string;
  variables?: string[];
}

/**
 * Email filter options
 */
export interface EmailFilter {
  dealership_id: string;
  status?: 'pending' | 'sent' | 'failed';
  limit?: number;
  offset?: number;
}

/**
 * Hook to list email logs
 */
export function useEmails(filters: EmailFilter) {
  const queryParams = new URLSearchParams();

  queryParams.set('dealership_id', filters.dealership_id);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.offset) queryParams.set('offset', String(filters.offset));

  const queryString = queryParams.toString();
  const endpoint = `/v1/email/logs?${queryString}`;

  return useQuery({
    queryKey: queryKeys.email.logs.list({ ...filters }),
    queryFn: async () => {
      const logs = await api.get<EmailLog[]>(endpoint);
      return { logs, total: logs.length } as EmailLogsResponse;
    },
    enabled: !!filters.dealership_id,
  });
}

/**
 * Hook to get a single email log
 */
export function useEmail(id: string, dealershipId: string) {
  return useQuery({
    queryKey: queryKeys.email.logs.detail(id),
    queryFn: () => api.get<EmailLog>(`/v1/email/logs/${id}?dealership_id=${dealershipId}`),
    enabled: !!id && !!dealershipId,
  });
}

/**
 * Hook to send an email
 */
export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendEmailRequest) =>
      api.post<{ message: string; log_id: string }>('/v1/email/send', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.logs.all() });
    },
  });
}

/**
 * Hook to send a template email
 */
export function useSendTemplateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendTemplateEmailRequest) =>
      api.post<{ message: string; log_id: string }>('/v1/email/send-template', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.logs.all() });
    },
  });
}

/**
 * Hook to list email templates
 */
export function useEmailTemplates(dealershipId: string, limit = 50, offset = 0) {
  const queryParams = new URLSearchParams();
  queryParams.set('dealership_id', dealershipId);
  queryParams.set('limit', String(limit));
  queryParams.set('offset', String(offset));

  const queryString = queryParams.toString();
  const endpoint = `/v1/email/templates?${queryString}`;

  return useQuery({
    queryKey: queryKeys.email.templates.list({ dealership_id: dealershipId, limit, offset }),
    queryFn: async () => {
      const templates = await api.get<EmailTemplate[]>(endpoint);
      return { templates, total: templates.length } as EmailTemplatesResponse;
    },
    enabled: !!dealershipId,
  });
}

/**
 * Hook to get a single template
 */
export function useEmailTemplate(id: string, dealershipId: string) {
  return useQuery({
    queryKey: queryKeys.email.templates.detail(id),
    queryFn: () =>
      api.get<EmailTemplate>(`/v1/email/templates/${id}?dealership_id=${dealershipId}`),
    enabled: !!id && !!dealershipId,
  });
}

/**
 * Hook to create a template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      api.post<EmailTemplate>('/v1/email/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.templates.all() });
    },
  });
}

/**
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      data,
    }: {
      id: string;
      dealershipId: string;
      data: UpdateTemplateRequest;
    }) => api.put<EmailTemplate>(`/v1/email/templates/${id}?dealership_id=${dealershipId}`, data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.templates.all() });
      queryClient.setQueryData(queryKeys.email.templates.detail(template.id), template);
    },
  });
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dealershipId }: { id: string; dealershipId: string }) =>
      api.delete(`/v1/email/templates/${id}?dealership_id=${dealershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.templates.all() });
    },
  });
}

/**
 * Hook to delete an email log (mark as archived/deleted)
 */
export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dealershipId }: { id: string; dealershipId: string }) =>
      api.delete(`/v1/email/logs/${id}?dealership_id=${dealershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.logs.all() });
    },
  });
}

/**
 * Hook to mark email as read (optimistic update for UI state)
 */
export function useMarkEmailAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // This is a client-side only operation for now
      // The API doesn't have a read status, so we track it locally
      return { id };
    },
    onSuccess: (_, { id }) => {
      // Update local cache to mark as read
      queryClient.setQueryData(queryKeys.email.logs.all(), (old: EmailLogsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          logs: old.logs.map((log) => (log.id === id ? { ...log, is_read: true } : log)),
        };
      });
    },
  });
}

// =====================================================
// INBOX API - Gmail/Outlook-like functionality
// =====================================================

/**
 * Email folder types
 */
export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'starred';

/**
 * Email message from inbox API
 */
export interface InboxEmail {
  id: string;
  dealership_id: string;
  user_id: string;
  thread_id: string;
  message_id: string;
  in_reply_to?: string;
  references?: string[];
  folder: EmailFolder;
  from_email: string;
  from_name: string;
  to_emails: string[];
  to_names?: string[];
  cc_emails?: string[];
  cc_names?: string[];
  bcc_emails?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  snippet: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  has_attachments: boolean;
  labels: string[];
  received_at: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  attachments?: EmailAttachment[];
}

/**
 * Email thread
 */
export interface EmailThread {
  id: string;
  dealership_id: string;
  user_id: string;
  subject: string;
  snippet: string;
  participants: string[];
  message_count: number;
  unread_count: number;
  is_starred: boolean;
  is_important: boolean;
  has_attachments: boolean;
  labels: string[];
  last_message_at: string;
  created_at: string;
  updated_at: string;
  messages?: InboxEmail[];
}

/**
 * Email draft
 */
export interface EmailDraft {
  id: string;
  dealership_id: string;
  user_id: string;
  thread_id?: string;
  in_reply_to?: string;
  to_emails: string[];
  to_names?: string[];
  cc_emails?: string[];
  cc_names?: string[];
  bcc_emails?: string[];
  bcc_names?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  attachments?: string[];
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  id: string;
  email_id?: string;
  draft_id?: string;
  dealership_id: string;
  filename: string;
  content_type: string;
  size: number;
  s3_key: string;
  s3_bucket: string;
  download_url?: string;
  created_at: string;
}

/**
 * Email label
 */
export interface EmailLabel {
  id: string;
  dealership_id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Email signature
 */
export interface EmailSignature {
  id: string;
  dealership_id: string;
  user_id: string;
  name: string;
  signature_html: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Email stats
 */
export interface EmailStats {
  total_inbox: number;
  unread_inbox: number;
  total_sent: number;
  total_drafts: number;
  total_trash: number;
  total_starred: number;
}

/**
 * Email list result
 */
export interface EmailListResult {
  emails: InboxEmail[];
  total: number;
  has_more: boolean;
  next_offset: number;
}

/**
 * Thread list result
 */
export interface ThreadListResult {
  threads: EmailThread[];
  total: number;
  has_more: boolean;
  next_offset: number;
}

/**
 * Inbox filter options
 */
export interface InboxFilter {
  dealership_id: string;
  user_id: string;
  folder?: EmailFolder;
  is_read?: boolean;
  is_starred?: boolean;
  is_important?: boolean;
  has_attachments?: boolean;
  from_email?: string;
  subject?: string;
  labels?: string[];
  query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'received_at' | 'sent_at' | 'subject';
  sort_order?: 'asc' | 'desc';
}

/**
 * Compose email request
 */
export interface ComposeEmailRequest {
  dealership_id: string;
  user_id: string;
  to: string[];
  to_names?: string[];
  cc?: string[];
  cc_names?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  reply_to?: string;
  thread_id?: string;
  attachments?: string[];
  schedule_for?: string;
  save_as_draft?: boolean;
}

/**
 * Batch action request
 */
export interface BatchActionRequest {
  dealership_id: string;
  user_id: string;
  email_ids: string[];
  action:
    | 'read'
    | 'unread'
    | 'star'
    | 'archive'
    | 'delete'
    | 'move'
    | 'add_labels'
    | 'remove_labels';
  folder?: EmailFolder;
  labels?: string[];
}

// =====================================================
// INBOX HOOKS
// =====================================================

/**
 * Build query params from filter
 */
function buildInboxParams(filter: InboxFilter): string {
  const params = new URLSearchParams();
  params.set('dealership_id', filter.dealership_id);
  params.set('user_id', filter.user_id);

  if (filter.folder) params.set('folder', filter.folder);
  if (filter.is_read !== undefined) params.set('is_read', String(filter.is_read));
  if (filter.is_starred !== undefined) params.set('is_starred', String(filter.is_starred));
  if (filter.is_important !== undefined) params.set('is_important', String(filter.is_important));
  if (filter.has_attachments !== undefined)
    params.set('has_attachments', String(filter.has_attachments));
  if (filter.from_email) params.set('from', filter.from_email);
  if (filter.subject) params.set('subject', filter.subject);
  if (filter.labels?.length) params.set('labels', filter.labels.join(','));
  if (filter.query) params.set('q', filter.query);
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  if (filter.sort_by) params.set('sort_by', filter.sort_by);
  if (filter.sort_order) params.set('sort_order', filter.sort_order);

  return params.toString();
}

/**
 * Hook to list inbox emails
 */
export function useInbox(filter: InboxFilter) {
  const queryString = buildInboxParams(filter);

  return useQuery({
    queryKey: ['inbox', 'emails', filter],
    queryFn: () => api.get<EmailListResult>(`/v1/email/inbox?${queryString}`),
    enabled: !!filter.dealership_id && !!filter.user_id,
  });
}

/**
 * Hook to get a single inbox email
 */
export function useInboxEmail(id: string, dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'email', id],
    queryFn: () =>
      api.get<InboxEmail>(`/v1/email/inbox/${id}?dealership_id=${dealershipId}&user_id=${userId}`),
    enabled: !!id && !!dealershipId && !!userId,
  });
}

/**
 * Hook to get email stats
 */
export function useEmailStats(dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'stats', dealershipId, userId],
    queryFn: () =>
      api.get<EmailStats>(`/v1/email/inbox/stats?dealership_id=${dealershipId}&user_id=${userId}`),
    enabled: !!dealershipId && !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to search emails
 */
export function useSearchEmails(params: {
  dealershipId: string;
  userId: string;
  query: string;
  limit?: number;
  offset?: number;
}) {
  const { dealershipId, userId, query, limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['inbox', 'search', dealershipId, userId, query, limit, offset],
    queryFn: () =>
      api.get<EmailListResult>(
        `/v1/email/inbox/search?dealership_id=${dealershipId}&user_id=${userId}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
      ),
    enabled: !!dealershipId && !!userId && !!query,
  });
}

/**
 * Hook to compose and send email
 */
export function useComposeEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ComposeEmailRequest) =>
      api.post<{ message: string; email_id: string; email?: InboxEmail }>(
        '/v1/email/compose',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

/**
 * Hook for batch actions on emails
 */
export function useBatchEmailAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchActionRequest) =>
      api.post<{ message: string; affected: number }>('/v1/email/inbox/batch', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

/**
 * Hook to toggle star on email
 */
export function useToggleStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      userId,
    }: {
      id: string;
      dealershipId: string;
      userId: string;
    }) => api.post(`/v1/email/inbox/${id}/star?dealership_id=${dealershipId}&user_id=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

// =====================================================
// THREAD HOOKS
// =====================================================

/**
 * Hook to list threads
 */
export function useThreads(filter: InboxFilter) {
  const queryString = buildInboxParams(filter);

  return useQuery({
    queryKey: ['inbox', 'threads', filter],
    queryFn: () => api.get<ThreadListResult>(`/v1/email/threads?${queryString}`),
    enabled: !!filter.dealership_id && !!filter.user_id,
  });
}

/**
 * Hook to get a thread with all messages
 */
export function useThread(id: string, dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'thread', id],
    queryFn: () =>
      api.get<EmailThread>(
        `/v1/email/threads/${id}?dealership_id=${dealershipId}&user_id=${userId}`
      ),
    enabled: !!id && !!dealershipId && !!userId,
  });
}

// =====================================================
// DRAFT HOOKS
// =====================================================

/**
 * Hook to list drafts
 */
export function useDrafts(dealershipId: string, userId: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['inbox', 'drafts', dealershipId, userId, limit, offset],
    queryFn: () =>
      api.get<EmailDraft[]>(
        `/v1/email/drafts?dealership_id=${dealershipId}&user_id=${userId}&limit=${limit}&offset=${offset}`
      ),
    enabled: !!dealershipId && !!userId,
  });
}

/**
 * Hook to get a draft
 */
export function useDraft(id: string, dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'draft', id],
    queryFn: () =>
      api.get<EmailDraft>(`/v1/email/drafts/${id}?dealership_id=${dealershipId}&user_id=${userId}`),
    enabled: !!id && !!dealershipId && !!userId,
  });
}

/**
 * Hook to save draft
 */
export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<EmailDraft> }) =>
      id
        ? api.put<EmailDraft>(`/v1/email/drafts/${id}`, data)
        : api.post<EmailDraft>('/v1/email/drafts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'drafts'] });
      queryClient.invalidateQueries({ queryKey: ['inbox', 'stats'] });
    },
  });
}

/**
 * Hook to delete draft
 */
export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      userId,
    }: {
      id: string;
      dealershipId: string;
      userId: string;
    }) => api.delete(`/v1/email/drafts/${id}?dealership_id=${dealershipId}&user_id=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'drafts'] });
      queryClient.invalidateQueries({ queryKey: ['inbox', 'stats'] });
    },
  });
}

/**
 * Hook to send draft
 */
export function useSendDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      userId,
    }: {
      id: string;
      dealershipId: string;
      userId: string;
    }) =>
      api.post<{ message: string; email_id: string }>(
        `/v1/email/drafts/${id}/send?dealership_id=${dealershipId}&user_id=${userId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

// =====================================================
// LABEL HOOKS
// =====================================================

/**
 * Hook to list labels
 */
export function useEmailLabels(dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'labels', dealershipId, userId],
    queryFn: () =>
      api.get<EmailLabel[]>(`/v1/email/labels?dealership_id=${dealershipId}&user_id=${userId}`),
    enabled: !!dealershipId && !!userId,
  });
}

/**
 * Hook to create label
 */
export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { dealership_id: string; user_id: string; name: string; color: string }) =>
      api.post<EmailLabel>('/v1/email/labels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'labels'] });
    },
  });
}

/**
 * Hook to delete label
 */
export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      userId,
    }: {
      id: string;
      dealershipId: string;
      userId: string;
    }) => api.delete(`/v1/email/labels/${id}?dealership_id=${dealershipId}&user_id=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'labels'] });
    },
  });
}

// =====================================================
// SIGNATURE HOOKS
// =====================================================

/**
 * Hook to list signatures
 */
export function useEmailSignatures(dealershipId: string, userId: string) {
  return useQuery({
    queryKey: ['inbox', 'signatures', dealershipId, userId],
    queryFn: () =>
      api.get<EmailSignature[]>(
        `/v1/email/signatures?dealership_id=${dealershipId}&user_id=${userId}`
      ),
    enabled: !!dealershipId && !!userId,
  });
}

/**
 * Hook to create signature
 */
export function useCreateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      dealership_id: string;
      user_id: string;
      name: string;
      signature_html: string;
      is_default?: boolean;
    }) => api.post<EmailSignature>('/v1/email/signatures', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'signatures'] });
    },
  });
}

/**
 * Hook to update signature
 */
export function useUpdateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        dealership_id: string;
        user_id: string;
        name: string;
        signature_html: string;
        is_default?: boolean;
      };
    }) => api.put<EmailSignature>(`/v1/email/signatures/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'signatures'] });
    },
  });
}

/**
 * Hook to delete signature
 */
export function useDeleteSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dealershipId,
      userId,
    }: {
      id: string;
      dealershipId: string;
      userId: string;
    }) => api.delete(`/v1/email/signatures/${id}?dealership_id=${dealershipId}&user_id=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'signatures'] });
    },
  });
}

// =====================================================
// ATTACHMENT HOOKS
// =====================================================

/**
 * Upload URL response
 */
export interface UploadURLResponse {
  upload_url: string;
  attachment_id: string;
  s3_key: string;
  s3_bucket: string;
  expires_in: string;
}

/**
 * Hook to list attachments for an email
 */
export function useEmailAttachments(emailId: string, dealershipId: string) {
  return useQuery({
    queryKey: ['inbox', 'attachments', emailId],
    queryFn: () =>
      api.get<EmailAttachment[]>(
        `/v1/email/inbox/${emailId}/attachments?dealership_id=${dealershipId}`
      ),
    enabled: !!emailId && !!dealershipId,
  });
}

/**
 * Hook to list attachments for a draft
 */
export function useDraftAttachments(draftId: string, dealershipId: string) {
  return useQuery({
    queryKey: ['inbox', 'draft-attachments', draftId],
    queryFn: () =>
      api.get<EmailAttachment[]>(
        `/v1/email/drafts/${draftId}/attachments?dealership_id=${dealershipId}`
      ),
    enabled: !!draftId && !!dealershipId,
  });
}

/**
 * Hook to get a presigned upload URL
 */
export function useGetUploadURL() {
  return useMutation({
    mutationFn: ({
      dealershipId,
      filename,
      contentType,
    }: {
      dealershipId: string;
      filename: string;
      contentType?: string;
    }) =>
      api.get<UploadURLResponse>(
        `/v1/email/attachments/upload-url?dealership_id=${dealershipId}&filename=${encodeURIComponent(filename)}${contentType ? `&content_type=${encodeURIComponent(contentType)}` : ''}`
      ),
  });
}

/**
 * Hook to upload an attachment via multipart form
 */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealershipId,
      draftId,
      file,
    }: {
      dealershipId: string;
      draftId?: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealership_id', dealershipId);
      if (draftId) {
        formData.append('draft_id', draftId);
      }

      const response = await fetch('/api/v1/email/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachment');
      }

      return response.json() as Promise<EmailAttachment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['inbox', 'draft-attachments'] });
    },
  });
}

/**
 * Hook to get attachment details
 */
export function useAttachment(id: string, dealershipId: string) {
  return useQuery({
    queryKey: ['inbox', 'attachment', id],
    queryFn: () =>
      api.get<EmailAttachment>(`/v1/email/attachments/${id}?dealership_id=${dealershipId}`),
    enabled: !!id && !!dealershipId,
  });
}

/**
 * Hook to delete an attachment
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dealershipId }: { id: string; dealershipId: string }) =>
      api.delete(`/v1/email/attachments/${id}?dealership_id=${dealershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['inbox', 'draft-attachments'] });
    },
  });
}

/**
 * Get download URL for an attachment
 */
export function getAttachmentDownloadURL(id: string, dealershipId: string): string {
  return `/api/v1/email/attachments/${id}/download?dealership_id=${dealershipId}`;
}
