package main

import (
	"encoding/json"
	"time"
)

// Message represents a chat message
type Message struct {
	ID               string           `json:"id"`
	ConversationID   string           `json:"conversation_id"`
	SenderID         string           `json:"sender_id"`
	Sender           *Participant     `json:"sender,omitempty"`
	Type             string           `json:"type"`
	Content          string           `json:"content"`
	Status           string           `json:"status"`
	ReplyToID        *string          `json:"reply_to_id,omitempty"`
	ReplyTo          *Message         `json:"reply_to,omitempty"`
	Attachments      []MediaAttachment `json:"attachments,omitempty"`
	Reactions        []MessageReaction `json:"reactions,omitempty"`
	LinkPreview      *LinkPreview     `json:"link_preview,omitempty"`
	IsEdited         bool             `json:"is_edited"`
	EditedAt         *time.Time       `json:"edited_at,omitempty"`
	IsDeleted        bool             `json:"is_deleted"`
	DeletedAt        *time.Time       `json:"deleted_at,omitempty"`
	DeliveredAt      *time.Time       `json:"delivered_at,omitempty"`
	ReadAt           *time.Time       `json:"read_at,omitempty"`
	IsEphemeral      bool             `json:"is_ephemeral"`
	EphemeralSeconds *int             `json:"ephemeral_seconds,omitempty"`
	EphemeralExpiresAt *time.Time     `json:"ephemeral_expires_at,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

// Conversation represents a chat conversation
type Conversation struct {
	ID           string        `json:"id"`
	DealershipID string        `json:"dealership_id"`
	Type         string        `json:"type"`
	Name         *string       `json:"name,omitempty"`
	Description  *string       `json:"description,omitempty"`
	AvatarURL    *string       `json:"avatar_url,omitempty"`
	Participants []Participant `json:"participants"`
	LastMessage  *Message      `json:"last_message,omitempty"`
	UnreadCount  int           `json:"unread_count"`
	IsMuted      bool          `json:"is_muted"`
	IsPinned     bool          `json:"is_pinned"`
	IsArchived   bool          `json:"is_archived"`
	CreatedByID  *string       `json:"created_by_id,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// Participant represents a user in a conversation
type Participant struct {
	ID         string     `json:"id"`
	UserID     string     `json:"user_id"`
	FirstName  string     `json:"first_name"`
	LastName   string     `json:"last_name"`
	AvatarURL  *string    `json:"avatar_url,omitempty"`
	Role       string     `json:"role"`
	JoinedAt   time.Time  `json:"joined_at"`
	LastReadAt *time.Time `json:"last_read_at,omitempty"`
	Presence   string     `json:"presence"`
	IsTyping   bool       `json:"is_typing"`
}

// MediaAttachment represents a file attachment
type MediaAttachment struct {
	ID              string     `json:"id"`
	MessageID       string     `json:"message_id"`
	Type            string     `json:"type"`
	URL             string     `json:"url"`
	ThumbnailURL    *string    `json:"thumbnail_url,omitempty"`
	FileName        string     `json:"file_name"`
	FileSize        int64      `json:"file_size"`
	MimeType        string     `json:"mime_type"`
	Width           *int       `json:"width,omitempty"`
	Height          *int       `json:"height,omitempty"`
	DurationSeconds *int       `json:"duration_seconds,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// MessageReaction represents a reaction to a message
type MessageReaction struct {
	ID           string    `json:"id"`
	MessageID    string    `json:"message_id"`
	UserID       string    `json:"user_id"`
	UserName     string    `json:"user_name"`
	ReactionType string    `json:"reaction_type"`
	CreatedAt    time.Time `json:"created_at"`
}

// LinkPreview represents URL preview data
type LinkPreview struct {
	URL         string  `json:"url"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	SiteName    *string `json:"site_name,omitempty"`
}

// TypingIndicator represents a typing event
type TypingIndicator struct {
	ConversationID string    `json:"conversation_id"`
	UserID         string    `json:"user_id"`
	UserName       string    `json:"user_name"`
	IsTyping       bool      `json:"is_typing"`
	Timestamp      time.Time `json:"timestamp"`
}

// ReadReceipt represents a read receipt
type ReadReceipt struct {
	MessageID string    `json:"message_id"`
	UserID    string    `json:"user_id"`
	ReadAt    time.Time `json:"read_at"`
}

// Request Types

// CreateConversationRequest is the request for creating a conversation
type CreateConversationRequest struct {
	Type           string   `json:"type"`
	ParticipantIDs []string `json:"participant_ids"`
	Name           *string  `json:"name,omitempty"`
	Description    *string  `json:"description,omitempty"`
}

// SendMessageRequest is the request for sending a message
type SendMessageRequest struct {
	Type             string  `json:"type"`
	Content          string  `json:"content"`
	ReplyToID        *string `json:"reply_to_id,omitempty"`
	IsEphemeral      bool    `json:"is_ephemeral"`
	EphemeralSeconds *int    `json:"ephemeral_seconds,omitempty"`
}

// UpdateMessageRequest is the request for updating a message
type UpdateMessageRequest struct {
	Content string `json:"content"`
}

// AddReactionRequest is the request for adding a reaction
type AddReactionRequest struct {
	ReactionType string `json:"reaction_type"`
}

// UpdateConversationRequest is the request for updating conversation settings
type UpdateConversationRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	IsMuted     *bool   `json:"is_muted,omitempty"`
	IsPinned    *bool   `json:"is_pinned,omitempty"`
	IsArchived  *bool   `json:"is_archived,omitempty"`
}

// Response Types

// ConversationsResponse is the response for listing conversations
type ConversationsResponse struct {
	Conversations []Conversation `json:"conversations"`
	Total         int            `json:"total"`
}

// MessagesResponse is the response for listing messages
type MessagesResponse struct {
	Messages []Message `json:"messages"`
	Total    int       `json:"total"`
	HasMore  bool      `json:"has_more"`
}

// Filter Types

// ConversationFilter is the filter for listing conversations
type ConversationFilter struct {
	Type       *string `json:"type,omitempty"`
	IsArchived *bool   `json:"is_archived,omitempty"`
	IsMuted    *bool   `json:"is_muted,omitempty"`
	Search     *string `json:"search,omitempty"`
	Limit      int     `json:"limit"`
	Offset     int     `json:"offset"`
}

// MessageFilter is the filter for listing messages
type MessageFilter struct {
	BeforeID *string `json:"before_id,omitempty"`
	AfterID  *string `json:"after_id,omitempty"`
	Limit    int     `json:"limit"`
}

// Valid message types
var ValidMessageTypes = []string{
	"TEXT",
	"IMAGE",
	"VIDEO",
	"FILE",
	"VOICE",
	"LOCATION",
}

// Valid message statuses
var ValidMessageStatuses = []string{
	"SENDING",
	"SENT",
	"DELIVERED",
	"READ",
	"FAILED",
}

// Valid conversation types
var ValidConversationTypes = []string{
	"DIRECT",
	"GROUP",
	"BROADCAST",
}

// Valid participant roles
var ValidParticipantRoles = []string{
	"ADMIN",
	"MEMBER",
}

// Valid reaction types
var ValidReactionTypes = []string{
	"LIKE",
	"LOVE",
	"LAUGH",
	"EMPHASIZE",
	"QUESTION",
}

// Valid presence statuses
var ValidPresenceStatuses = []string{
	"ONLINE",
	"AWAY",
	"OFFLINE",
}

// IsValidMessageType checks if a message type is valid
func IsValidMessageType(t string) bool {
	for _, v := range ValidMessageTypes {
		if v == t {
			return true
		}
	}
	return false
}

// IsValidConversationType checks if a conversation type is valid
func IsValidConversationType(t string) bool {
	for _, v := range ValidConversationTypes {
		if v == t {
			return true
		}
	}
	return false
}

// IsValidReactionType checks if a reaction type is valid
func IsValidReactionType(t string) bool {
	for _, v := range ValidReactionTypes {
		if v == t {
			return true
		}
	}
	return false
}

// WebSocket message types
const (
	WSEventMessageSent          = "MESSAGE_SENT"
	WSEventMessageDelivered     = "MESSAGE_DELIVERED"
	WSEventMessageRead          = "MESSAGE_READ"
	WSEventMessageUpdated       = "MESSAGE_UPDATED"
	WSEventMessageDeleted       = "MESSAGE_DELETED"
	WSEventReactionAdded        = "REACTION_ADDED"
	WSEventReactionRemoved      = "REACTION_REMOVED"
	WSEventTypingStart          = "TYPING_START"
	WSEventTypingStop           = "TYPING_STOP"
	WSEventPresenceChanged      = "PRESENCE_CHANGED"
	WSEventConversationCreated  = "CONVERSATION_CREATED"
	WSEventConversationUpdated  = "CONVERSATION_UPDATED"
	WSEventParticipantJoined    = "PARTICIPANT_JOINED"
	WSEventParticipantLeft      = "PARTICIPANT_LEFT"
)

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type           string          `json:"type"`
	ConversationID *string         `json:"conversation_id,omitempty"`
	Data           json.RawMessage `json:"data,omitempty"`
	Timestamp      time.Time       `json:"timestamp"`
}
