/**
 * Messaging WebSocket Hook
 *
 * Manages real-time WebSocket connection for messaging features including
 * message delivery, read receipts, typing indicators, and presence.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, tokenStorage } from '@/lib/api';
import type {
  MessagingWSMessage,
  Message,
  MessageReaction,
  TypingIndicator,
} from '@/types/messaging';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseMessagingWebSocketOptions {
  /** User ID for connection */
  userId?: string;
  /** Enable/disable the connection */
  enabled?: boolean;
  /** Callback when a new message is received */
  onMessage?: (message: Message) => void;
  /** Callback when any WebSocket event is received */
  onEvent?: (event: MessagingWSMessage) => void;
  /** Callback when typing indicator changes */
  onTyping?: (indicator: TypingIndicator) => void;
}

interface TypingState {
  [conversationId: string]: {
    [userId: string]: {
      userName: string;
      timestamp: number;
    };
  };
}

/**
 * Hook for managing messaging WebSocket connection
 */
export function useMessagingWebSocket({
  userId,
  enabled = true,
  onMessage,
  onEvent,
  onTyping,
}: UseMessagingWebSocketOptions = {}) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const subscribedConversations = useRef<Set<string>>(new Set());

  // Clean up typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const updated = { ...prev };
        let changed = false;

        for (const convId of Object.keys(updated)) {
          for (const usrId of Object.keys(updated[convId])) {
            if (now - updated[convId][usrId].timestamp > 5000) {
              delete updated[convId][usrId];
              changed = true;
            }
          }
          if (Object.keys(updated[convId]).length === 0) {
            delete updated[convId];
          }
        }

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Message event handlers - split out to reduce complexity
  type MessageCache = { messages: Message[]; total: number; has_more: boolean };

  const handleMessageSent = useCallback(
    (data: MessagingWSMessage) => {
      const message = data.data as Message;
      onMessage?.(message);

      if (data.conversation_id) {
        queryClient.setQueryData(
          queryKeys.messaging.messages.list(data.conversation_id, {}),
          (old: MessageCache | undefined) => {
            if (!old) return { messages: [message], total: 1, has_more: false };
            if (old.messages.some((m) => m.id === message.id)) return old;
            return { ...old, messages: [...old.messages, message], total: old.total + 1 };
          }
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() });
      }
    },
    [queryClient, onMessage]
  );

  const handleMessageUpdated = useCallback(
    (data: MessagingWSMessage) => {
      const updatedMessage = data.data as Message;
      if (data.conversation_id) {
        queryClient.setQueryData(
          queryKeys.messaging.messages.list(data.conversation_id, {}),
          (old: MessageCache | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)),
            };
          }
        );
      }
    },
    [queryClient]
  );

  const handleMessageDeleted = useCallback(
    (data: MessagingWSMessage) => {
      const deleteData = data.data as { message_id: string };
      if (data.conversation_id) {
        queryClient.setQueryData(
          queryKeys.messaging.messages.list(data.conversation_id, {}),
          (old: MessageCache | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === deleteData.message_id
                  ? { ...m, is_deleted: true, content: '[Message deleted]' }
                  : m
              ),
            };
          }
        );
      }
    },
    [queryClient]
  );

  const handleReactionAdded = useCallback(
    (data: MessagingWSMessage) => {
      const reaction = data.data as MessageReaction;
      if (data.conversation_id) {
        queryClient.setQueryData(
          queryKeys.messaging.messages.list(data.conversation_id, {}),
          (old: MessageCache | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) => {
                if (m.id === reaction.message_id) {
                  return { ...m, reactions: [...(m.reactions || []), reaction] };
                }
                return m;
              }),
            };
          }
        );
      }
    },
    [queryClient]
  );

  const handleReactionRemoved = useCallback(
    (data: MessagingWSMessage) => {
      const removeData = data.data as {
        message_id: string;
        user_id: string;
        reaction_type: string;
      };
      if (data.conversation_id) {
        queryClient.setQueryData(
          queryKeys.messaging.messages.list(data.conversation_id, {}),
          (old: MessageCache | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) => {
                if (m.id === removeData.message_id && m.reactions) {
                  return {
                    ...m,
                    reactions: m.reactions.filter(
                      (r) =>
                        !(
                          r.user_id === removeData.user_id &&
                          r.reaction_type === removeData.reaction_type
                        )
                    ),
                  };
                }
                return m;
              }),
            };
          }
        );
      }
    },
    [queryClient]
  );

  const handleTypingEvent = useCallback(
    (data: MessagingWSMessage, isStart: boolean) => {
      const typingData = data.data as TypingIndicator;
      onTyping?.(typingData);

      if (isStart) {
        setTypingUsers((prev) => ({
          ...prev,
          [typingData.conversation_id]: {
            ...prev[typingData.conversation_id],
            [typingData.user_id]: { userName: typingData.user_name, timestamp: Date.now() },
          },
        }));
      } else {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (updated[typingData.conversation_id]) {
            delete updated[typingData.conversation_id][typingData.user_id];
            if (Object.keys(updated[typingData.conversation_id]).length === 0) {
              delete updated[typingData.conversation_id];
            }
          }
          return updated;
        });
      }
    },
    [onTyping]
  );

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as MessagingWSMessage;
        onEvent?.(data);

        const handlers: Record<string, () => void> = {
          MESSAGE_SENT: () => handleMessageSent(data),
          MESSAGE_DELIVERED: () =>
            data.conversation_id &&
            queryClient.invalidateQueries({
              queryKey: queryKeys.messaging.messages.list(data.conversation_id, {}),
            }),
          MESSAGE_READ: () =>
            data.conversation_id &&
            queryClient.invalidateQueries({
              queryKey: queryKeys.messaging.messages.list(data.conversation_id, {}),
            }),
          MESSAGE_UPDATED: () => handleMessageUpdated(data),
          MESSAGE_DELETED: () => handleMessageDeleted(data),
          REACTION_ADDED: () => handleReactionAdded(data),
          REACTION_REMOVED: () => handleReactionRemoved(data),
          TYPING_START: () => handleTypingEvent(data, true),
          TYPING_STOP: () => handleTypingEvent(data, false),
          CONVERSATION_CREATED: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() }),
          CONVERSATION_UPDATED: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() }),
          PARTICIPANT_JOINED: () =>
            data.conversation_id &&
            queryClient.invalidateQueries({
              queryKey: queryKeys.messaging.conversations.detail(data.conversation_id),
            }),
          PARTICIPANT_LEFT: () =>
            data.conversation_id &&
            queryClient.invalidateQueries({
              queryKey: queryKeys.messaging.conversations.detail(data.conversation_id),
            }),
          PRESENCE_CHANGED: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations.all() }),
        };

        handlers[data.type]?.();
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },
    [
      queryClient,
      onEvent,
      handleMessageSent,
      handleMessageUpdated,
      handleMessageDeleted,
      handleReactionAdded,
      handleReactionRemoved,
      handleTypingEvent,
    ]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !userId) return;

    // Get auth token
    const token = tokenStorage.getToken();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/messaging`;

    setStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempts.current = 0;

      // Re-subscribe to previously subscribed conversations
      subscribedConversations.current.forEach((convId) => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE_CONVERSATION', conversation_id: convId }));
      });
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;

      // Attempt reconnect with exponential backoff
      if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [enabled, userId, handleMessage]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Subscribe to a conversation
  const subscribeToConversation = useCallback((conversationId: string) => {
    subscribedConversations.current.add(conversationId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'SUBSCRIBE_CONVERSATION', conversation_id: conversationId })
      );
    }
  }, []);

  // Unsubscribe from a conversation
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    subscribedConversations.current.delete(conversationId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'UNSUBSCRIBE_CONVERSATION', conversation_id: conversationId })
      );
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'TYPING', conversation_id: conversationId, is_typing: isTyping })
      );
    }
  }, []);

  // Get typing users for a conversation
  const getTypingUsers = useCallback(
    (conversationId: string): string[] => {
      const convTyping = typingUsers[conversationId];
      if (!convTyping) return [];
      return Object.values(convTyping).map((t) => t.userName);
    },
    [typingUsers]
  );

  return {
    status,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTyping,
    getTypingUsers,
    typingUsers,
  };
}
