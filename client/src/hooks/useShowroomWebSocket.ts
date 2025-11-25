/**
 * Showroom WebSocket Hook
 *
 * Manages WebSocket connection for real-time showroom updates.
 * Automatically invalidates React Query cache on events.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api';
import type { WSEventType, WSMessage, WSSubscribeMessage } from '@/types/showroom';

interface UseShowroomWebSocketOptions {
  dealershipId: string;
  enabled?: boolean;
  onEvent?: (type: WSEventType, data: unknown) => void;
}

interface WebSocketState {
  isConnected: boolean;
  isSubscribed: boolean;
  lastEvent: WSMessage | null;
  error: string | null;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/showroom';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useShowroomWebSocket({
  dealershipId,
  enabled = true,
  onEvent,
}: UseShowroomWebSocketOptions) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isSubscribed: false,
    lastEvent: null,
    error: null,
  });

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;

        setState((prev) => ({ ...prev, lastEvent: message }));

        // Handle subscription confirmation
        if (message.type === ('SUBSCRIBED' as WSEventType)) {
          setState((prev) => ({ ...prev, isSubscribed: true }));
          return;
        }

        // Call custom event handler
        if (onEvent) {
          onEvent(message.type, message.data);
        }

        // Invalidate relevant queries based on event type
        switch (message.type) {
          case 'VISIT_CREATED':
          case 'VISIT_UPDATED':
          case 'STATUS_CHANGED':
          case 'VISIT_CLOSED':
            queryClient.invalidateQueries({
              queryKey: queryKeys.showroom.visits.all(),
            });
            break;

          case 'TIMER_STARTED':
          case 'TIMER_STOPPED':
            queryClient.invalidateQueries({
              queryKey: queryKeys.showroom.visits.all(),
            });
            // Also invalidate specific visit if we have the ID
            if (message.data && typeof message.data === 'object' && 'visit_id' in message.data) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.showroom.visits.detail(message.data.visit_id as string),
              });
            }
            break;

          case 'NOTE_ADDED':
          case 'NOTE_UPDATED':
          case 'NOTE_DELETED':
            // Invalidate specific visit notes
            if (message.data && typeof message.data === 'object' && 'visit_id' in message.data) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.showroom.visits.detail(message.data.visit_id as string),
              });
            }
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    [queryClient, onEvent]
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!enabled || !dealershipId) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
        reconnectAttempts.current = 0;

        // Subscribe to dealership room
        const subscribeMsg: WSSubscribeMessage = {
          type: 'SUBSCRIBE',
          dealership_id: dealershipId,
        };
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setState((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };

      ws.onclose = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isSubscribed: false,
        }));

        // Attempt to reconnect
        if (enabled && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
        } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setState((prev) => ({
            ...prev,
            error: 'Max reconnection attempts reached',
          }));
        }
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to connect to WebSocket',
      }));
    }
  }, [enabled, dealershipId, handleMessage]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({
      isConnected: false,
      isSubscribed: false,
      lastEvent: null,
      error: null,
    });
  }, []);

  /**
   * Send a message through the WebSocket
   */
  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message: WebSocket not connected');
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when dealershipId changes
  useEffect(() => {
    if (state.isConnected && dealershipId) {
      const subscribeMsg: WSSubscribeMessage = {
        type: 'SUBSCRIBE',
        dealership_id: dealershipId,
      };
      sendMessage(subscribeMsg);
    }
  }, [dealershipId, state.isConnected, sendMessage]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
  };
}
