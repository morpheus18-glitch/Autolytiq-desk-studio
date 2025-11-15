/**
 * Email API Hooks
 *
 * React hooks for interacting with the secure email API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailRequest {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  customerId?: string;
  dealId?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface EmailMessage {
  id: string;
  dealershipId: string;
  userId: string;
  folder: string;
  threadId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddresses: EmailRecipient[];
  ccAddresses: EmailRecipient[] | null;
  bccAddresses: EmailRecipient[] | null;
  subject: string;
  htmlBody: string | null;
  textBody: string | null;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  customerId: string | null;
  dealId: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailListFilters {
  folder?: string;
  customerId?: string;
  dealId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function sendEmail(data: SendEmailRequest) {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to send email');
  }

  return response.json();
}

async function fetchEmails(filters: EmailListFilters = {}) {
  const params = new URLSearchParams();

  if (filters.folder) params.append('folder', filters.folder);
  if (filters.customerId) params.append('customerId', filters.customerId);
  if (filters.dealId) params.append('dealId', filters.dealId);
  if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
  if (filters.isStarred !== undefined) params.append('isStarred', String(filters.isStarred));
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await fetch(`/api/email/messages?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch emails');
  }

  return response.json();
}

async function fetchEmailById(id: string) {
  const response = await fetch(`/api/email/messages/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch email');
  }

  return response.json();
}

async function markEmailAsRead(id: string, isRead: boolean) {
  const response = await fetch(`/api/email/messages/${id}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isRead }),
  });

  if (!response.ok) {
    throw new Error('Failed to update email');
  }

  return response.json();
}

async function toggleEmailStar(id: string, isStarred: boolean) {
  const response = await fetch(`/api/email/messages/${id}/star`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isStarred }),
  });

  if (!response.ok) {
    throw new Error('Failed to update email');
  }

  return response.json();
}

async function deleteEmail(id: string, permanent = false) {
  const response = await fetch(`/api/email/messages/${id}?permanent=${permanent}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete email');
  }

  return response.json();
}

async function saveDraft(data: Partial<SendEmailRequest> & { draftId?: string }) {
  const response = await fetch('/api/email/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save draft');
  }

  return response.json();
}

async function fetchUnreadCounts() {
  const response = await fetch('/api/email/unread-counts', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch unread counts');
  }

  return response.json();
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Send email mutation
 */
export function useSendEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendEmail,
    onSuccess: (data) => {
      // Show warnings if any
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: 'Email sent with warnings',
          description: data.warnings[0],
          variant: 'default',
        });
      } else {
        toast({
          title: 'Email sent',
          description: 'Your email has been sent successfully.',
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-unread-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Fetch emails list
 */
export function useEmails(filters: EmailListFilters = {}) {
  return useQuery({
    queryKey: ['emails', filters],
    queryFn: () => fetchEmails(filters),
  });
}

/**
 * Fetch single email by ID
 */
export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ['email', id],
    queryFn: () => fetchEmailById(id!),
    enabled: !!id,
  });
}

/**
 * Mark email as read/unread
 */
export function useMarkEmailAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      markEmailAsRead(id, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-unread-counts'] });
    },
  });
}

/**
 * Toggle email star
 */
export function useToggleEmailStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) =>
      toggleEmailStar(id, isStarred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

/**
 * Delete email
 */
export function useDeleteEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
      deleteEmail(id, permanent),
    onSuccess: (_, variables) => {
      toast({
        title: variables.permanent ? 'Email deleted permanently' : 'Email moved to trash',
      });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-unread-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Save draft
 */
export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', { folder: 'drafts' }] });
    },
  });
}

/**
 * Fetch unread counts
 */
export function useUnreadCounts() {
  return useQuery({
    queryKey: ['email-unread-counts'],
    queryFn: fetchUnreadCounts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
