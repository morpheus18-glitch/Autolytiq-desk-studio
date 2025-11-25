/**
 * Messaging Types
 *
 * Types for the RCS/iMessage-style messaging system with
 * real-time delivery, read receipts, typing indicators,
 * reactions, and media attachments.
 */

import type { BaseEntity } from './index';

/**
 * Message Types
 */
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'LOCATION';

/**
 * Message Status (RCS-style delivery states)
 */
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/**
 * Conversation Type
 */
export type ConversationType = 'DIRECT' | 'GROUP' | 'BROADCAST';

/**
 * Participant Role in Group
 */
export type ParticipantRole = 'ADMIN' | 'MEMBER';

/**
 * Reaction Type (iMessage-style)
 */
export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'EMPHASIZE' | 'QUESTION';

/**
 * User presence status
 */
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

/**
 * Participant Info
 */
export interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: ParticipantRole;
  joined_at: string;
  last_read_at?: string;
  presence?: PresenceStatus;
  is_typing?: boolean;
}

/**
 * Message Reaction
 */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  reaction_type: ReactionType;
  created_at: string;
}

/**
 * Media Attachment
 */
export interface MediaAttachment {
  id: string;
  message_id: string;
  type: MessageType;
  url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  created_at: string;
}

/**
 * Link Preview (RCS-style)
 */
export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image_url?: string;
  site_name?: string;
}

/**
 * Message Entity
 */
export interface Message extends BaseEntity {
  conversation_id: string;
  sender_id: string;
  sender?: Participant;
  type: MessageType;
  content: string;
  status: MessageStatus;
  reply_to_id?: string;
  reply_to?: Message;
  attachments?: MediaAttachment[];
  reactions?: MessageReaction[];
  link_preview?: LinkPreview;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  delivered_at?: string;
  read_at?: string;
  // Ephemeral flag - message self-destructs after viewing
  is_ephemeral: boolean;
  ephemeral_seconds?: number;
  ephemeral_expires_at?: string;
}

/**
 * Conversation Entity
 */
export interface Conversation extends BaseEntity {
  dealership_id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatar_url?: string;
  participants: Participant[];
  last_message?: Message;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  // Group-specific
  created_by_id?: string;
}

/**
 * Typing Indicator
 */
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
  timestamp: string;
}

/**
 * Read Receipt
 */
export interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

/**
 * Request Types
 */
export interface CreateConversationRequest {
  type: ConversationType;
  participant_ids: string[];
  name?: string;
  description?: string;
}

export interface SendMessageRequest {
  type: MessageType;
  content: string;
  reply_to_id?: string;
  is_ephemeral?: boolean;
  ephemeral_seconds?: number;
}

export interface UpdateConversationRequest {
  name?: string;
  description?: string;
  is_muted?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface AddReactionRequest {
  reaction_type: ReactionType;
}

export interface UploadAttachmentRequest {
  file: File;
  type: MessageType;
}

/**
 * Response Types
 */
export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

/**
 * Filter Types
 */
export interface ConversationFilter {
  type?: ConversationType;
  is_archived?: boolean;
  is_muted?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MessageFilter {
  conversation_id: string;
  before_id?: string;
  after_id?: string;
  limit?: number;
}

/**
 * WebSocket Event Types
 */
export type MessagingWSEventType =
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_READ'
  | 'MESSAGE_UPDATED'
  | 'MESSAGE_DELETED'
  | 'REACTION_ADDED'
  | 'REACTION_REMOVED'
  | 'TYPING_START'
  | 'TYPING_STOP'
  | 'PRESENCE_CHANGED'
  | 'CONVERSATION_CREATED'
  | 'CONVERSATION_UPDATED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT';

export interface MessagingWSMessage<T = unknown> {
  type: MessagingWSEventType;
  conversation_id?: string;
  data?: T;
  timestamp: string;
}

export interface WSSubscribeConversation {
  type: 'SUBSCRIBE_CONVERSATION';
  conversation_id: string;
}

export interface WSSubscribeUser {
  type: 'SUBSCRIBE_USER';
  user_id: string;
}

/**
 * Status Configuration
 */
export interface MessageStatusConfig {
  status: MessageStatus;
  label: string;
  icon: string;
  color: string;
}

export const MESSAGE_STATUS_CONFIG: Record<MessageStatus, MessageStatusConfig> = {
  SENDING: {
    status: 'SENDING',
    label: 'Sending',
    icon: 'clock',
    color: 'text-muted-foreground',
  },
  SENT: {
    status: 'SENT',
    label: 'Sent',
    icon: 'check',
    color: 'text-muted-foreground',
  },
  DELIVERED: {
    status: 'DELIVERED',
    label: 'Delivered',
    icon: 'check-check',
    color: 'text-muted-foreground',
  },
  READ: {
    status: 'READ',
    label: 'Read',
    icon: 'check-check',
    color: 'text-primary',
  },
  FAILED: {
    status: 'FAILED',
    label: 'Failed',
    icon: 'alert-circle',
    color: 'text-destructive',
  },
};

/**
 * Reaction Configuration
 */
export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTION_CONFIG: Record<ReactionType, ReactionConfig> = {
  LIKE: { type: 'LIKE', emoji: '\u{1F44D}', label: 'Like' },
  LOVE: { type: 'LOVE', emoji: '\u{2764}\u{FE0F}', label: 'Love' },
  LAUGH: { type: 'LAUGH', emoji: '\u{1F602}', label: 'Laugh' },
  EMPHASIZE: { type: 'EMPHASIZE', emoji: '\u{203C}\u{FE0F}', label: 'Emphasize' },
  QUESTION: { type: 'QUESTION', emoji: '\u{2753}', label: 'Question' },
};

/**
 * Utility: Check if message is from current user
 */
export function isOwnMessage(message: Message, userId: string): boolean {
  return message.sender_id === userId;
}

/**
 * Utility: Check if message has been read
 */
export function isMessageRead(message: Message): boolean {
  return message.status === 'READ';
}

/**
 * Utility: Check if message is ephemeral and expired
 */
export function isMessageExpired(message: Message): boolean {
  if (!message.is_ephemeral || !message.ephemeral_expires_at) return false;
  return new Date(message.ephemeral_expires_at) < new Date();
}

/**
 * Utility: Get conversation display name
 */
export function getConversationDisplayName(
  conversation: Conversation,
  currentUserId: string
): string {
  if (conversation.name) return conversation.name;

  // For direct messages, show the other participant's name
  if (conversation.type === 'DIRECT') {
    const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);
    if (otherParticipant) {
      return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
    }
  }

  // For groups without a name, show participant names
  const names = conversation.participants
    .filter((p) => p.user_id !== currentUserId)
    .slice(0, 3)
    .map((p) => p.first_name);

  if (conversation.participants.length > 4) {
    return `${names.join(', ')} +${conversation.participants.length - 4}`;
  }

  return names.join(', ') || 'Conversation';
}

/**
 * Utility: Format message time
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Utility: Get unread badge text
 */
export function getUnreadBadgeText(count: number): string {
  if (count === 0) return '';
  if (count > 99) return '99+';
  return count.toString();
}

/**
 * Utility: Get file size display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Utility: Get typing indicator text
 */
export function getTypingText(typingUsers: string[]): string {
  if (typingUsers.length === 0) return '';
  if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
  if (typingUsers.length === 2) {
    return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  }
  return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
}
