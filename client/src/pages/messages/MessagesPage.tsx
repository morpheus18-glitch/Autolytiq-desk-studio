/**
 * Messages Page - iMessage-style Premium Design
 *
 * Full-screen messaging interface with glass morphism and fluid animations.
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
  Search,
  MoreVertical,
  ArrowLeft,
  Users,
  Plus,
  Phone,
  Video,
  Info,
  Edit,
} from 'lucide-react';

import { useScreenshotProtection } from './hooks';
import {
  MessageBubble,
  TypingIndicator,
  ConnectionStatus,
  ConversationItem,
  MessageInput,
  EmptyState,
} from './components';
import { NewConversationModal } from './NewConversationModal';

// =====================================================
// BREAKPOINT HOOK
// =====================================================

function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      if (window.innerWidth < 768) {
        setBreakpoint('mobile');
      } else if (window.innerWidth < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
}

// =====================================================
// MAIN MESSAGES PAGE
// =====================================================

export function MessagesPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.id || '';
  const { isMobile } = useBreakpoint();

  // State
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

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

  // Handle mobile navigation
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (isMobile) setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedConversationId(null);
  };

  // Message handlers
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

  // Mobile: show either list or chat
  const showConversationList = !isMobile || mobileView === 'list';
  const showChatArea = !isMobile || mobileView === 'chat';

  return (
    <MainLayout hideMobileNav={isMobile} fullBleed>
      <div className="flex h-[calc(100vh-64px)] bg-background">
        {/* Conversation List Sidebar */}
        {showConversationList && (
          <div
            className={cn(
              'flex flex-col border-r border-gray-200/50 dark:border-zinc-700/50',
              'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl',
              isMobile ? 'w-full' : 'w-80 lg:w-96 flex-shrink-0'
            )}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-zinc-700/50">
              <h1 className="text-2xl font-bold text-foreground">Messages</h1>
              <div className="flex items-center gap-2">
                <ConnectionStatus status={wsStatus} />
                <button
                  onClick={() => setIsNewConversationModalOpen(true)}
                  className={cn(
                    'p-2 rounded-full transition-all duration-200',
                    'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                    'hover:bg-blue-600 hover:shadow-blue-500/40',
                    'active:scale-95'
                  )}
                >
                  <Edit className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
                    'bg-gray-100 dark:bg-zinc-800 border-0',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                    'placeholder:text-gray-400'
                  )}
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
                  <button
                    onClick={() => setIsNewConversationModalOpen(true)}
                    className="mt-4 text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Start a new conversation
                  </button>
                </div>
              ) : (
                filteredConversations?.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={conversation.id === selectedConversationId}
                    currentUserId={userId}
                    onClick={() => handleSelectConversation(conversation.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        {showChatArea && (
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
            {selectedConversationId && selectedConversation ? (
              <>
                {/* Chat Header */}
                <div
                  className={cn(
                    'flex items-center justify-between px-4 py-3',
                    'border-b border-gray-200/50 dark:border-zinc-700/50',
                    'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <button
                        onClick={handleBackToList}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <ArrowLeft className="h-5 w-5 text-blue-500" />
                      </button>
                    )}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white',
                        'bg-gradient-to-br shadow-md',
                        selectedConversation.type === 'GROUP'
                          ? 'from-violet-500 to-purple-600'
                          : 'from-blue-500 to-indigo-600'
                      )}
                    >
                      {selectedConversation.type === 'GROUP' ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        getInitials(getConversationDisplayName(selectedConversation, userId))
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">
                        {getConversationDisplayName(selectedConversation, userId)}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConversation.participants.length} participant
                        {selectedConversation.participants.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">
                      <Info className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div
                  className={cn(
                    'flex-1 overflow-y-auto',
                    'bg-gradient-to-b from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-950'
                  )}
                >
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messagesData?.messages.length === 0 ? (
                    <EmptyState type="no-messages" />
                  ) : (
                    <div className="py-4">
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
                      <TypingIndicator users={typingUsers} />
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
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
              !isMobile && <EmptyState type="no-conversation" />
            )}
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        currentUserId={userId}
        onConversationCreated={(conversationId) => {
          handleSelectConversation(conversationId);
        }}
      />
    </MainLayout>
  );
}
