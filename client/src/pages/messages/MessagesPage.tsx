/**
 * Messages Page
 *
 * Main component for the RCS/iMessage-style messaging interface.
 */

import { useState, useEffect, useRef, useCallback, type JSX } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import {
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useAddReaction,
  useUpdateMessage,
  useDeleteMessage,
} from '@/hooks/useMessaging';
import { useMessagingWebSocket } from '@/hooks/useMessagingWebSocket';
import type { Message, ReactionType } from '@/types/messaging';
import { getConversationDisplayName, isOwnMessage } from '@/types/messaging';
import {
  MessageCircle,
  Search,
  MoreVertical,
  ArrowLeft,
  Users,
  Plus,
  Shield,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@design-system';

import { useScreenshotProtection } from './hooks';
import {
  MessageBubble,
  TypingIndicator,
  ConnectionStatus,
  ConversationItem,
  MessageInput,
  EmptyState,
} from './components';

// eslint-disable-next-line complexity
export function MessagesPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.id || '';

  // State
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] = useState(true);

  // Screenshot protection
  const isProtected = useScreenshotProtection(screenshotProtectionEnabled);

  // Data fetching
  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations({
    is_archived: false,
    limit: 50,
  });

  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(
    selectedConversationId || '',
    { limit: 50 }
  );

  const { data: selectedConversation } = useConversation(selectedConversationId || '');

  // Mutations
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const addReactionMutation = useAddReaction();
  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();

  // WebSocket
  const {
    status: wsStatus,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTyping,
    getTypingUsers,
  } = useMessagingWebSocket({ userId, enabled: !!userId });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to selected conversation
  useEffect(() => {
    if (selectedConversationId) {
      subscribeToConversation(selectedConversationId);
      markAsReadMutation.mutate(selectedConversationId);
      return () => unsubscribeFromConversation(selectedConversationId);
    }
  }, [selectedConversationId, subscribeToConversation, unsubscribeFromConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages.length]);

  // Handlers
  const handleSendMessage = useCallback(
    (content: string, replyToId?: string) => {
      if (!selectedConversationId) return;

      if (editingMessage) {
        updateMessageMutation.mutate({
          conversationId: selectedConversationId,
          messageId: editingMessage.id,
          data: { content },
        });
        setEditingMessage(null);
      } else {
        sendMessageMutation.mutate({
          conversationId: selectedConversationId,
          data: { type: 'TEXT', content, reply_to_id: replyToId },
        });
        setReplyTo(null);
      }
    },
    [selectedConversationId, editingMessage, sendMessageMutation, updateMessageMutation]
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (selectedConversationId) sendTyping(selectedConversationId, isTyping);
    },
    [selectedConversationId, sendTyping]
  );

  const handleReact = useCallback(
    (messageId: string, reactionType: ReactionType) => {
      if (!selectedConversationId) return;
      addReactionMutation.mutate({
        conversationId: selectedConversationId,
        messageId,
        data: { reaction_type: reactionType },
      });
    },
    [selectedConversationId, addReactionMutation]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!selectedConversationId) return;
      deleteMessageMutation.mutate({ conversationId: selectedConversationId, messageId });
    },
    [selectedConversationId, deleteMessageMutation]
  );

  // Filter conversations
  const filteredConversations = conversationsData?.conversations.filter((conv) => {
    if (!searchQuery) return true;
    return getConversationDisplayName(conv, userId)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const typingUsers = selectedConversationId ? getTypingUsers(selectedConversationId) : [];

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-sm text-muted-foreground">Team communication</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus status={wsStatus} />
            <button
              onClick={() => setScreenshotProtectionEnabled(!screenshotProtectionEnabled)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                screenshotProtectionEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {screenshotProtectionEnabled ? (
                <Shield className="h-4 w-4" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {screenshotProtectionEnabled ? 'Protected' : 'Unprotected'}
              </span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                filteredConversations?.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={conversation.id === selectedConversationId}
                    currentUserId={userId}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  />
                ))
              )}
            </div>

            <div className="p-4 border-t border-border">
              <Button variant="primary" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConversationId && selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversationId(null)}
                      className="lg:hidden p-2 rounded-lg hover:bg-muted"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {selectedConversation.type === 'GROUP' ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        getInitials(getConversationDisplayName(selectedConversation, userId))
                      )}
                    </div>
                    <div>
                      <h2 className="font-medium text-foreground">
                        {getConversationDisplayName(selectedConversation, userId)}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.participants.length} participants
                      </p>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-muted">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className={cn(
                    'flex-1 overflow-y-auto py-4',
                    isProtected && 'blur-xl select-none pointer-events-none'
                  )}
                >
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : messagesData?.messages.length === 0 ? (
                    <EmptyState type="no-messages" />
                  ) : (
                    <div className="space-y-1">
                      {messagesData?.messages.map((message, index) => {
                        const prevMessage = messagesData.messages[index - 1];
                        const showAvatar =
                          !prevMessage || prevMessage.sender_id !== message.sender_id;
                        return (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={isOwnMessage(message, userId)}
                            showAvatar={showAvatar}
                            isProtected={isProtected}
                            onReact={handleReact}
                            onEdit={setEditingMessage}
                            onDelete={handleDeleteMessage}
                            onReply={setReplyTo}
                          />
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  <TypingIndicator users={typingUsers} />
                </div>

                {/* Protected overlay */}
                {isProtected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">Content Protected</p>
                      <p className="text-sm text-muted-foreground">
                        Return to the app to view messages
                      </p>
                    </div>
                  </div>
                )}

                {/* Message input */}
                <MessageInput
                  replyTo={replyTo}
                  editingMessage={editingMessage}
                  onCancelReply={() => setReplyTo(null)}
                  onCancelEdit={() => setEditingMessage(null)}
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  disabled={sendMessageMutation.isPending}
                />
              </>
            ) : (
              <EmptyState type="no-conversation" />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
