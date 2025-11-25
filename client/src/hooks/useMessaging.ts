/**
 * Messaging Hooks
 *
 * React Query hooks for the messaging feature with conversations,
 * messages, reactions, and real-time typing indicators.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type {
  Conversation,
  ConversationsResponse,
  ConversationFilter,
  CreateConversationRequest,
  UpdateConversationRequest,
  Message,
  MessagesResponse,
  MessageFilter,
  SendMessageRequest,
  UpdateMessageRequest,
  AddReactionRequest,
  MessageReaction,
  Participant,
} from '@/types/messaging';

/**
 * Hook to list conversations
 */
export function useConversations(filters: ConversationFilter = {}) {
  const queryParams = new URLSearchParams();

  if (filters.type) queryParams.set('type', filters.type);
  if (filters.is_archived !== undefined)
    queryParams.set('is_archived', String(filters.is_archived));
  if (filters.is_muted !== undefined) queryParams.set('is_muted', String(filters.is_muted));
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.offset) queryParams.set('offset', String(filters.offset));

  const queryString = queryParams.toString();
  const endpoint = `/v1/messaging/conversations${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: queryKeys.messaging.conversations.list(filters as Record<string, unknown>),
    queryFn: () => api.get<ConversationsResponse>(endpoint),
    refetchInterval: 30000, // Fallback polling every 30s
  });
}

/**
 * Hook to get a single conversation
 */
export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.messaging.conversations.detail(id),
    queryFn: () => api.get<Conversation>(`/v1/messaging/conversations/${id}`),
    enabled: !!id,
  });
}

/**
 * Hook to create a conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationRequest) =>
      api.post<Conversation>('/v1/messaging/conversations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() });
    },
  });
}

/**
 * Hook to get or create a direct conversation with another user
 */
export function useGetOrCreateDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.post<Conversation>('/v1/messaging/conversations', {
        type: 'DIRECT',
        participant_ids: [userId],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() });
    },
  });
}

/**
 * Hook to update a conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversationRequest }) =>
      api.patch<Conversation>(`/v1/messaging/conversations/${id}`, data),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() });
      queryClient.setQueryData(
        queryKeys.messaging.conversations.detail(conversation.id),
        conversation
      );
    },
  });
}

/**
 * Hook to list messages in a conversation
 */
export function useMessages(
  conversationId: string,
  filters: Omit<MessageFilter, 'conversation_id'> = {}
) {
  const queryParams = new URLSearchParams();

  if (filters.before_id) queryParams.set('before_id', filters.before_id);
  if (filters.after_id) queryParams.set('after_id', filters.after_id);
  if (filters.limit) queryParams.set('limit', String(filters.limit));

  const queryString = queryParams.toString();
  const endpoint = `/v1/messaging/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: queryKeys.messaging.messages.list(conversationId, filters),
    queryFn: () => api.get<MessagesResponse>(endpoint),
    enabled: !!conversationId,
    refetchInterval: 10000, // Poll every 10s as fallback
  });
}

/**
 * Hook to load more messages (pagination)
 */
export function useLoadMoreMessages(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beforeId: string) => {
      const response = await api.get<MessagesResponse>(
        `/v1/messaging/conversations/${conversationId}/messages?before_id=${beforeId}&limit=50`
      );
      return response;
    },
    onSuccess: (data) => {
      // Prepend older messages to existing cache
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return data;
          return {
            ...data,
            messages: [...data.messages, ...old.messages],
            total: data.total,
          };
        }
      );
    },
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: SendMessageRequest }) =>
      api.post<Message>(`/v1/messaging/conversations/${conversationId}/messages`, data),
    onSuccess: (message, { conversationId }) => {
      // Add message to cache immediately
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return { messages: [message], total: 1, has_more: false };
          return {
            ...old,
            messages: [...old.messages, message],
            total: old.total + 1,
          };
        }
      );

      // Update conversation's last message
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() });
    },
  });
}

/**
 * Hook to update a message
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      data,
    }: {
      conversationId: string;
      messageId: string;
      data: UpdateMessageRequest;
    }) =>
      api.patch<Message>(
        `/v1/messaging/conversations/${conversationId}/messages/${messageId}`,
        data
      ),
    onSuccess: (message, { conversationId }) => {
      // Update message in cache
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) => (m.id === message.id ? message : m)),
          };
        }
      );
    },
  });
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      api.delete(`/v1/messaging/conversations/${conversationId}/messages/${messageId}`),
    onSuccess: (_, { conversationId, messageId }) => {
      // Remove message from cache or mark as deleted
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === messageId ? { ...m, is_deleted: true, content: '[Message deleted]' } : m
            ),
          };
        }
      );
    },
  });
}

/**
 * Hook to mark messages as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/v1/messaging/conversations/${conversationId}/read`),
    onSuccess: (_, conversationId) => {
      // Update unread count in conversations list
      queryClient.setQueryData(
        queryKeys.messaging.conversations.list({}),
        (old: ConversationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === conversationId ? { ...c, unread_count: 0 } : c
            ),
          };
        }
      );
    },
  });
}

/**
 * Hook to add a reaction to a message
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      data,
    }: {
      conversationId: string;
      messageId: string;
      data: AddReactionRequest;
    }) =>
      api.post<MessageReaction>(
        `/v1/messaging/conversations/${conversationId}/messages/${messageId}/reactions`,
        data
      ),
    onSuccess: (reaction, { conversationId }) => {
      // Update message reactions in cache
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) => {
              if (m.id === reaction.message_id) {
                const existingReactions = m.reactions || [];
                // Remove existing reaction from same user
                const filtered = existingReactions.filter(
                  (r) =>
                    !(r.user_id === reaction.user_id && r.reaction_type === reaction.reaction_type)
                );
                return { ...m, reactions: [...filtered, reaction] };
              }
              return m;
            }),
          };
        }
      );
    },
  });
}

/**
 * Hook to remove a reaction from a message
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      reactionType,
    }: {
      conversationId: string;
      messageId: string;
      reactionType: string;
    }) =>
      api.delete(
        `/v1/messaging/conversations/${conversationId}/messages/${messageId}/reactions/${reactionType}`
      ),
    onSuccess: (_, { conversationId, messageId, reactionType }) => {
      // Remove reaction from cache
      queryClient.setQueryData(
        queryKeys.messaging.messages.list(conversationId, {}),
        (old: MessagesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) => {
              if (m.id === messageId && m.reactions) {
                return {
                  ...m,
                  reactions: m.reactions.filter((r) => r.reaction_type !== reactionType),
                };
              }
              return m;
            }),
          };
        }
      );
    },
  });
}

/**
 * Hook to send typing indicator
 */
export function useSendTyping() {
  return useMutation({
    mutationFn: ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) =>
      api.post(`/v1/messaging/conversations/${conversationId}/typing`, { is_typing: isTyping }),
  });
}

/**
 * Hook to get participants in a conversation
 */
export function useParticipants(conversationId: string) {
  return useQuery({
    queryKey: [...queryKeys.messaging.conversations.detail(conversationId), 'participants'],
    queryFn: () =>
      api.get<Participant[]>(`/v1/messaging/conversations/${conversationId}/participants`),
    enabled: !!conversationId,
  });
}

/**
 * Hook to add a participant to a conversation
 */
export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
      role = 'MEMBER',
    }: {
      conversationId: string;
      userId: string;
      role?: string;
    }) =>
      api.post<Participant>(`/v1/messaging/conversations/${conversationId}/participants`, {
        user_id: userId,
        role,
      }),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.messaging.conversations.detail(conversationId), 'participants'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messaging.conversations.detail(conversationId),
      });
    },
  });
}

/**
 * Hook to remove a participant from a conversation
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      api.delete(`/v1/messaging/conversations/${conversationId}/participants/${userId}`),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.messaging.conversations.detail(conversationId), 'participants'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messaging.conversations.detail(conversationId),
      });
    },
  });
}
