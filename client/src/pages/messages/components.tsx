/**
 * Messages Page Components
 *
 * Extracted components for the messaging interface.
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
  Shield,
  ShieldOff,
} from 'lucide-react';

// Message Status Icon
export function MessageStatusIcon({ status }: { status: MessageStatus }): JSX.Element {
  const config = MESSAGE_STATUS_CONFIG[status];
  const icons: Record<MessageStatus, JSX.Element> = {
    SENDING: <Clock className={cn('h-3.5 w-3.5', config.color)} />,
    SENT: <Check className={cn('h-3.5 w-3.5', config.color)} />,
    DELIVERED: <CheckCheck className={cn('h-3.5 w-3.5', config.color)} />,
    READ: <CheckCheck className="h-3.5 w-3.5 text-primary" />,
    FAILED: <AlertCircle className={cn('h-3.5 w-3.5', config.color)} />,
  };
  return icons[status] || <Check className="h-3.5 w-3.5 text-muted-foreground" />;
}

// Reaction Picker
export function ReactionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-50 flex gap-1 rounded-full bg-popover border border-border p-1.5 shadow-lg animate-fade-in">
        {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              onSelect(type);
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-muted transition-transform hover:scale-125"
            title={REACTION_CONFIG[type].label}
          >
            <span className="text-lg">{REACTION_CONFIG[type].emoji}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// Message Avatar
function MessageAvatar({ message }: { message: Message }): JSX.Element {
  const initials = message.sender
    ? getInitials(getFullName(message.sender.first_name, message.sender.last_name))
    : '?';
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
      {initials}
    </div>
  );
}

// Message Reactions Display
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
    <div className={cn('absolute -bottom-3 flex gap-0.5', isOwn ? 'right-2' : 'left-2')}>
      {Object.entries(grouped).map(([type, count]) => (
        <span
          key={type}
          className="flex items-center gap-0.5 rounded-full bg-popover border border-border px-1.5 py-0.5 text-xs shadow-sm"
        >
          {REACTION_CONFIG[type as ReactionType]?.emoji}
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </span>
      ))}
    </div>
  );
}

// Message Menu
function MessageMenu({
  isOwn,
  onCopy,
  onEdit,
  onDelete,
  onClose,
}: {
  isOwn: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full mt-1 right-0 z-50 w-36 rounded-lg bg-popover border border-border shadow-lg py-1">
        <button
          onClick={onCopy}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        {isOwn && (
          <>
            <button
              onClick={onEdit}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </>
        )}
      </div>
    </>
  );
}

// Message Reply Preview
function MessageReplyPreview({
  replyTo,
  isOwn,
}: {
  replyTo: Message['reply_to'];
  isOwn: boolean;
}): JSX.Element | null {
  if (!replyTo) return null;
  return (
    <div
      className={cn(
        'mb-2 pb-2 border-b text-xs opacity-70',
        isOwn ? 'border-primary-foreground/30' : 'border-border'
      )}
    >
      <p className="font-medium">{replyTo.sender?.first_name || 'Unknown'}</p>
      <p className="truncate">{replyTo.content}</p>
    </div>
  );
}

// Message Footer (timestamp + status)
function MessageFooter({ message, isOwn }: { message: Message; isOwn: boolean }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
      <span
        className={cn(
          'text-[10px]',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}
      >
        {formatMessageTime(message.created_at)}
        {message.is_edited && ' (edited)'}
      </span>
      {isOwn && <MessageStatusIcon status={message.status} />}
    </div>
  );
}

// Message Actions Bar
function MessageActionsBar({
  message,
  isOwn,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: {
  message: Message;
  isOwn: boolean;
  onReact: (messageId: string, reactionType: ReactionType) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
}): JSX.Element {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopy = () => {
    void window.navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  return (
    <div
      className={cn(
        'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1',
        isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
      )}
    >
      <button
        onClick={() => setShowReactionPicker(!showReactionPicker)}
        className="p-1.5 rounded-full bg-popover border border-border shadow-sm hover:bg-muted"
        title="React"
      >
        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <button
        onClick={() => onReply(message)}
        className="p-1.5 rounded-full bg-popover border border-border shadow-sm hover:bg-muted"
        title="Reply"
      >
        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-full bg-popover border border-border shadow-sm hover:bg-muted"
          title="More"
        >
          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {showMenu && (
          <MessageMenu
            isOwn={isOwn}
            onCopy={handleCopy}
            onEdit={() => {
              onEdit(message);
              setShowMenu(false);
            }}
            onDelete={() => {
              onDelete(message.id);
              setShowMenu(false);
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
      {showReactionPicker && (
        <div className={cn('absolute top-8', isOwn ? 'left-0' : 'right-0')}>
          <ReactionPicker
            onSelect={(type) => onReact(message.id, type)}
            onClose={() => setShowReactionPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

// Message Bubble
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
  const showActions = !isProtected && !message.is_deleted;
  const bubbleClasses = cn(
    'relative max-w-[70%] rounded-2xl px-4 py-2',
    isOwn
      ? 'bg-primary text-primary-foreground rounded-br-md'
      : 'bg-muted text-foreground rounded-bl-md',
    isProtected && 'blur-lg select-none pointer-events-none',
    message.is_deleted && 'opacity-50 italic'
  );

  return (
    <div className={cn('group flex gap-2 px-4 py-0.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {showAvatar && !isOwn && <MessageAvatar message={message} />}
      {!showAvatar && !isOwn && <div className="w-8" />}

      <div className={bubbleClasses}>
        <MessageReplyPreview replyTo={message.reply_to} isOwn={isOwn} />
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <MessageFooter message={message} isOwn={isOwn} />
        <MessageReactions reactions={message.reactions} isOwn={isOwn} />
        {showActions && (
          <MessageActionsBar
            message={message}
            isOwn={isOwn}
            onReact={onReact}
            onEdit={onEdit}
            onDelete={onDelete}
            onReply={onReply}
          />
        )}
      </div>
    </div>
  );
}

// Typing Indicator
export function TypingIndicator({ users }: { users: string[] }): JSX.Element | null {
  if (users.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{getTypingText(users)}</span>
    </div>
  );
}

// Connection Status
export function ConnectionStatus({ status }: { status: string }): JSX.Element {
  const colors: Record<string, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full', colors[status])} />
      <span className="capitalize">{status}</span>
    </div>
  );
}

// Conversation Avatar
function ConversationAvatar({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId: string;
}): JSX.Element {
  const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);
  const isGroup = conversation.type === 'GROUP';

  return (
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
        {isGroup ? (
          <Users className="h-5 w-5" />
        ) : otherParticipant ? (
          getInitials(getFullName(otherParticipant.first_name, otherParticipant.last_name))
        ) : (
          '?'
        )}
      </div>
      {otherParticipant?.presence === 'ONLINE' && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
      )}
    </div>
  );
}

// Conversation List Item
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left transition-colors rounded-lg',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
      )}
    >
      <ConversationAvatar conversation={conversation} currentUserId={currentUserId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'font-medium truncate',
              conversation.unread_count > 0 && 'text-foreground'
            )}
          >
            {displayName}
          </p>
          {conversation.last_message && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatMessageTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {conversation.last_message?.content || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
              {getUnreadBadgeText(conversation.unread_count)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {conversation.is_pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
        {conversation.is_muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
      </div>
    </button>
  );
}

// Reply/Edit Preview
function InputPreview({
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: {
  replyTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}): JSX.Element | null {
  if (!replyTo && !editingMessage) return null;

  return (
    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
      <div className="flex items-center gap-2">
        {replyTo && (
          <>
            <Reply className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Replying to </span>
              <span className="font-medium">{replyTo.sender?.first_name || 'Unknown'}</span>
              <p className="text-muted-foreground truncate max-w-xs">{replyTo.content}</p>
            </div>
          </>
        )}
        {editingMessage && (
          <>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Editing message</span>
          </>
        )}
      </div>
      <button
        onClick={replyTo ? onCancelReply : onCancelEdit}
        className="p-1 rounded hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Message Input
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
  const [isEphemeral, setIsEphemeral] = useState(false);
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
    setIsEphemeral(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
  };

  return (
    <div className="border-t border-border p-4 bg-background">
      <InputPreview
        replyTo={replyTo}
        editingMessage={editingMessage}
        onCancelReply={onCancelReply}
        onCancelEdit={onCancelEdit}
      />

      <div className="flex items-end gap-2">
        <button
          className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          title="Send image"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaResize}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground max-h-32 min-h-[42px]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ height: 'auto' }}
          />
        </div>
        <button
          onClick={() => setIsEphemeral(!isEphemeral)}
          className={cn(
            'p-2 rounded-full transition-colors',
            isEphemeral
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground'
          )}
          title={isEphemeral ? 'Message will disappear after viewing' : 'Make message ephemeral'}
        >
          {isEphemeral ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        </button>
        {content.trim() ? (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className={cn(
              'p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <button
            className="p-2.5 rounded-full hover:bg-muted text-muted-foreground"
            title="Voice message"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Empty State
export function EmptyState({ type }: { type: 'no-conversation' | 'no-messages' }): JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground">
        {type === 'no-conversation' ? 'No conversation selected' : 'No messages yet'}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        {type === 'no-conversation'
          ? 'Select a conversation from the list or start a new one'
          : 'Send a message to start the conversation'}
      </p>
    </div>
  );
}
