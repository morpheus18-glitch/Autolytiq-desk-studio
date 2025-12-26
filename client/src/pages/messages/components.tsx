/**
 * Messages Components - iMessage-style Premium Design
 *
 * Modern, fluid messaging interface with glass morphism and smooth animations.
 */

import { useState, useRef, useEffect, type JSX } from 'react';
import { cn, getInitials, getFullName } from '@/lib/utils';
import type { Message, MessageStatus, ReactionType, Conversation } from '@/types/messaging';
import {
  MESSAGE_STATUS_CONFIG,
  REACTION_CONFIG,
  getConversationDisplayName,
  formatMessageTime,
  getUnreadBadgeText,
  getTypingText,
} from '@/types/messaging';
import {
  MessageCircle,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MoreVertical,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Pin,
  BellOff,
  Trash2,
  Edit3,
  Reply,
  Copy,
  X,
  Users,
  Camera,
  Heart,
  ThumbsUp,
  Laugh,
  Frown,
  Angry,
  PartyPopper,
} from 'lucide-react';

// =====================================================
// MESSAGE STATUS ICON
// =====================================================

export function MessageStatusIcon({ status }: { status: MessageStatus }): JSX.Element {
  const config = MESSAGE_STATUS_CONFIG[status];
  const icons: Record<MessageStatus, JSX.Element> = {
    SENDING: <Clock className="h-3 w-3 text-white/60" />,
    SENT: <Check className="h-3 w-3 text-white/70" />,
    DELIVERED: <CheckCheck className="h-3 w-3 text-white/70" />,
    READ: <CheckCheck className="h-3 w-3 text-blue-200" />,
    FAILED: <AlertCircle className="h-3 w-3 text-red-300" />,
  };
  return icons[status] || <Check className="h-3 w-3 text-white/60" />;
}

// =====================================================
// REACTION PICKER - Floating Pill Design
// =====================================================

const QUICK_REACTIONS: { type: ReactionType; icon: JSX.Element }[] = [
  { type: 'LIKE', icon: <ThumbsUp className="h-4 w-4" /> },
  { type: 'LOVE', icon: <Heart className="h-4 w-4" /> },
  { type: 'LAUGH', icon: <Laugh className="h-4 w-4" /> },
  { type: 'SURPRISE', icon: <PartyPopper className="h-4 w-4" /> },
  { type: 'SAD', icon: <Frown className="h-4 w-4" /> },
  { type: 'ANGRY', icon: <Angry className="h-4 w-4" /> },
];

export function ReactionPicker({
  onSelect,
  onClose,
  position = 'top',
}: {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          'absolute z-50 flex items-center gap-1 rounded-full bg-white dark:bg-zinc-800 p-1.5 shadow-xl',
          'border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          'left-1/2 -translate-x-1/2'
        )}
      >
        {QUICK_REACTIONS.map(({ type, icon }) => (
          <button
            key={type}
            onClick={() => {
              onSelect(type);
              onClose();
            }}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              'hover:bg-gray-100 dark:hover:bg-zinc-700 hover:scale-125',
              'active:scale-95'
            )}
            title={REACTION_CONFIG[type]?.label}
          >
            {icon}
          </button>
        ))}
      </div>
    </>
  );
}

// =====================================================
// MESSAGE AVATAR - Premium Gradient
// =====================================================

function MessageAvatar({ message, size = 'md' }: { message: Message; size?: 'sm' | 'md' | 'lg' }): JSX.Element {
  const initials = message.sender
    ? getInitials(getFullName(message.sender.first_name, message.sender.last_name))
    : '?';

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-full flex items-center justify-center font-semibold',
        'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );
}

// =====================================================
// MESSAGE REACTIONS DISPLAY - Pill Style
// =====================================================

function MessageReactions({
  reactions,
  isOwn,
}: {
  reactions: Message['reactions'];
  isOwn: boolean;
}): JSX.Element | null {
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce(
    (acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={cn('flex gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
      {Object.entries(grouped).map(([type, count]) => (
        <span
          key={type}
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs',
            'bg-white/90 dark:bg-zinc-700/90 backdrop-blur-sm',
            'border border-gray-200/50 dark:border-zinc-600/50 shadow-sm'
          )}
        >
          {REACTION_CONFIG[type as ReactionType]?.emoji}
          {count > 1 && <span className="text-gray-500 dark:text-gray-400">{count}</span>}
        </span>
      ))}
    </div>
  );
}

// =====================================================
// MESSAGE CONTEXT MENU
// =====================================================

function MessageContextMenu({
  isOwn,
  onCopy,
  onEdit,
  onDelete,
  onReply,
  onClose,
}: {
  isOwn: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          'absolute z-50 w-40 rounded-xl overflow-hidden',
          'bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl',
          'border border-gray-200/50 dark:border-zinc-700/50 shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-150',
          'top-full mt-1 right-0'
        )}
      >
        <button
          onClick={() => { onReply(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
        >
          <Reply className="h-4 w-4 text-gray-500" /> Reply
        </button>
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
        >
          <Copy className="h-4 w-4 text-gray-500" /> Copy
        </button>
        {isOwn && (
          <>
            <button
              onClick={() => { onEdit(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              <Edit3 className="h-4 w-4 text-gray-500" /> Edit
            </button>
            <div className="h-px bg-gray-200 dark:bg-zinc-700" />
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        )}
      </div>
    </>
  );
}

// =====================================================
// MESSAGE BUBBLE - iMessage Style with Gradient
// =====================================================

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isProtected,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isProtected: boolean;
  onReact: (messageId: string, reactionType: ReactionType) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
}): JSX.Element {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = () => {
    void window.navigator.clipboard.writeText(message.content);
  };

  // iMessage-style bubble with tail
  const bubbleClasses = cn(
    'relative max-w-[75%] sm:max-w-[65%] px-4 py-2.5 transition-all duration-200',
    isOwn ? [
      // Sent message - blue gradient like iMessage
      'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
      'rounded-2xl rounded-br-md',
      'shadow-lg shadow-blue-500/20',
    ] : [
      // Received message - subtle gray
      'bg-gray-100 dark:bg-zinc-800 text-foreground',
      'rounded-2xl rounded-bl-md',
      'shadow-sm',
    ],
    isProtected && 'blur-lg select-none pointer-events-none',
    message.is_deleted && 'opacity-40 italic'
  );

  return (
    <div
      className={cn(
        'group flex gap-2 px-4 py-1 transition-all duration-200',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isHovered && 'bg-gray-50/50 dark:bg-zinc-900/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8">
          {showAvatar && <MessageAvatar message={message} />}
        </div>
      )}

      {/* Message content */}
      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name for group chats */}
        {showAvatar && !isOwn && message.sender && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {message.sender.first_name}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div
            className={cn(
              'mb-1 px-3 py-1.5 rounded-lg text-xs max-w-[80%]',
              'bg-gray-200/60 dark:bg-zinc-700/60 text-gray-600 dark:text-gray-300',
              'border-l-2 border-blue-400'
            )}
          >
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {message.reply_to.sender?.first_name || 'Unknown'}
            </p>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div className={bubbleClasses}>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.is_deleted ? 'This message was deleted' : message.content}
            </p>

            {/* Timestamp & Status */}
            <div className={cn(
              'flex items-center gap-1.5 mt-1',
              isOwn ? 'justify-end' : 'justify-start'
            )}>
              <span className={cn(
                'text-[10px]',
                isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
              )}>
                {formatMessageTime(message.created_at)}
                {message.is_edited && ' · Edited'}
              </span>
              {isOwn && <MessageStatusIcon status={message.status} />}
            </div>
          </div>

          {/* Floating action buttons */}
          {!isProtected && !message.is_deleted && isHovered && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 flex items-center gap-1',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
              )}
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={cn(
                  'p-1.5 rounded-full transition-all duration-200',
                  'bg-white dark:bg-zinc-700 shadow-md',
                  'hover:scale-110 active:scale-95',
                  'border border-gray-200 dark:border-zinc-600'
                )}
              >
                <Smile className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={cn(
                  'p-1.5 rounded-full transition-all duration-200',
                  'bg-white dark:bg-zinc-700 shadow-md',
                  'hover:scale-110 active:scale-95',
                  'border border-gray-200 dark:border-zinc-600'
                )}
              >
                <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
          )}

          {/* Reaction picker */}
          {showReactions && (
            <div className={cn('absolute', isOwn ? 'left-0' : 'right-0', 'bottom-full mb-2')}>
              <ReactionPicker
                onSelect={(type) => onReact(message.id, type)}
                onClose={() => setShowReactions(false)}
              />
            </div>
          )}

          {/* Context menu */}
          {showMenu && (
            <MessageContextMenu
              isOwn={isOwn}
              onCopy={handleCopy}
              onEdit={() => onEdit(message)}
              onDelete={() => onDelete(message.id)}
              onReply={() => onReply(message)}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>

        {/* Reactions display */}
        <MessageReactions reactions={message.reactions} isOwn={isOwn} />
      </div>
    </div>
  );
}

// =====================================================
// TYPING INDICATOR - Animated Dots
// =====================================================

export function TypingIndicator({ users }: { users: string[] }): JSX.Element | null {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-600 dark:to-zinc-700" />
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-zinc-800">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
          {getTypingText(users)}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// CONNECTION STATUS - Minimal Dot Indicator
// =====================================================

export function ConnectionStatus({ status }: { status: string }): JSX.Element {
  const configs: Record<string, { color: string; pulse: boolean; label: string }> = {
    connected: { color: 'bg-green-500', pulse: false, label: 'Connected' },
    connecting: { color: 'bg-amber-500', pulse: true, label: 'Connecting' },
    disconnected: { color: 'bg-gray-400', pulse: false, label: 'Offline' },
    error: { color: 'bg-red-500', pulse: true, label: 'Error' },
  };

  const config = configs[status] || configs.disconnected;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          config.color,
          config.pulse && 'animate-pulse'
        )}
      />
      <span className="text-xs text-gray-500 dark:text-gray-400">{config.label}</span>
    </div>
  );
}

// =====================================================
// CONVERSATION ITEM - Modern List Design
// =====================================================

export function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}): JSX.Element {
  const displayName = getConversationDisplayName(conversation, currentUserId);
  const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);
  const isGroup = conversation.type === 'GROUP';
  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        isSelected
          ? 'bg-blue-500/10 dark:bg-blue-500/20'
          : 'hover:bg-gray-100 dark:hover:bg-zinc-800',
        'active:scale-[0.98]'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white',
            'bg-gradient-to-br shadow-md',
            isGroup
              ? 'from-violet-500 to-purple-600'
              : 'from-blue-500 to-indigo-600'
          )}
        >
          {isGroup ? (
            <Users className="h-5 w-5" />
          ) : otherParticipant ? (
            getInitials(getFullName(otherParticipant.first_name, otherParticipant.last_name))
          ) : (
            '?'
          )}
        </div>
        {otherParticipant?.presence === 'ONLINE' && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full',
              'bg-green-500 border-2 border-white dark:border-zinc-900'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'font-semibold truncate',
              hasUnread ? 'text-foreground' : 'text-gray-700 dark:text-gray-200'
            )}
          >
            {displayName}
          </p>
          {conversation.last_message && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {formatMessageTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p
            className={cn(
              'text-sm truncate',
              hasUnread
                ? 'text-gray-700 dark:text-gray-200 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {conversation.last_message?.content || 'No messages yet'}
          </p>
          {hasUnread && (
            <span
              className={cn(
                'flex-shrink-0 ml-2 min-w-[20px] h-5 px-1.5',
                'inline-flex items-center justify-center',
                'text-xs font-bold rounded-full',
                'bg-blue-500 text-white'
              )}
            >
              {getUnreadBadgeText(conversation.unread_count)}
            </span>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        {conversation.is_pinned && <Pin className="h-3.5 w-3.5 text-gray-400" />}
        {conversation.is_muted && <BellOff className="h-3.5 w-3.5 text-gray-400" />}
      </div>
    </button>
  );
}

// =====================================================
// MESSAGE INPUT - iMessage Style
// =====================================================

export function MessageInput({
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSend,
  onTyping,
  disabled,
}: {
  replyTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (content: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleChange = (value: string) => {
    setContent(value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.length > 0) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
    } else {
      onTyping(false);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSend(content.trim(), replyTo?.id);
    setContent('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-background/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-zinc-700/50">
      {/* Reply/Edit Preview */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            {replyTo && (
              <>
                <div className="w-0.5 h-8 bg-blue-500 rounded-full" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Replying to {replyTo.sender?.first_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {replyTo.content}
                  </p>
                </div>
              </>
            )}
            {editingMessage && (
              <>
                <Edit3 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  Editing message
                </span>
              </>
            )}
          </div>
          <button
            onClick={replyTo ? onCancelReply : onCancelEdit}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1 pb-2">
          <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <Camera className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ImageIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none px-4 py-2.5 text-[15px]',
              'rounded-3xl border-0',
              'bg-gray-100 dark:bg-zinc-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'max-h-32 min-h-[44px]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Send/Voice button */}
        <div className="pb-2">
          {content.trim() ? (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className={cn(
                'p-2.5 rounded-full transition-all duration-200',
                'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                'hover:bg-blue-600 hover:shadow-blue-500/40',
                'active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EMPTY STATE - Minimal & Elegant
// =====================================================

export function EmptyState({ type }: { type: 'no-conversation' | 'no-messages' }): JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center mb-6',
          'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800'
        )}
      >
        <MessageCircle className="h-10 w-10 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {type === 'no-conversation' ? 'No conversation selected' : 'Start the conversation'}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-xs">
        {type === 'no-conversation'
          ? 'Choose a conversation from the list to start messaging'
          : 'Send a message to begin'}
      </p>
    </div>
  );
}
