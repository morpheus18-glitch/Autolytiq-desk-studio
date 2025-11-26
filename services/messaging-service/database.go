package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"autolytiq/shared/logging"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// MessagingDatabase defines the database interface
type MessagingDatabase interface {
	// Conversations
	ListConversations(dealershipID, userID string, filter ConversationFilter) ([]Conversation, int, error)
	GetConversation(id, dealershipID, userID string) (*Conversation, error)
	CreateConversation(dealershipID, userID string, req CreateConversationRequest) (*Conversation, error)
	UpdateConversation(id, dealershipID, userID string, req UpdateConversationRequest) (*Conversation, error)
	GetOrCreateDirectConversation(dealershipID, userID, otherUserID string) (*Conversation, error)

	// Messages
	ListMessages(conversationID, dealershipID, userID string, filter MessageFilter) ([]Message, int, bool, error)
	GetMessage(id, conversationID string) (*Message, error)
	CreateMessage(conversationID, dealershipID, senderID string, req SendMessageRequest) (*Message, error)
	UpdateMessage(id, conversationID, userID string, req UpdateMessageRequest) (*Message, error)
	DeleteMessage(id, conversationID, userID string) error
	MarkAsDelivered(messageID, userID string) error
	MarkAsRead(conversationID, userID string) error

	// Reactions
	AddReaction(messageID, userID, userName string, req AddReactionRequest) (*MessageReaction, error)
	RemoveReaction(messageID, userID, reactionType string) error

	// Participants
	AddParticipant(conversationID, userID, addedByID, role string) (*Participant, error)
	RemoveParticipant(conversationID, userID, removedByID string) error
	GetParticipants(conversationID string) ([]Participant, error)

	// Utilities
	Close() error
}

// PostgresDB implements MessagingDatabase
type PostgresDB struct {
	db     *sql.DB
	logger *logging.Logger
}

// NewPostgresDB creates a new PostgreSQL connection
func NewPostgresDB(connectionString string, logger *logging.Logger) (*PostgresDB, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger.Info("Connected to PostgreSQL database")
	return &PostgresDB{db: db, logger: logger}, nil
}

// Close closes the database connection
func (p *PostgresDB) Close() error {
	return p.db.Close()
}

// ListConversations retrieves conversations for a user
func (p *PostgresDB) ListConversations(dealershipID, userID string, filter ConversationFilter) ([]Conversation, int, error) {
	// Build query
	baseQuery := `
		SELECT c.id, c.dealership_id, c.type, c.name, c.description, c.avatar_url,
		       c.is_muted, c.is_pinned, c.is_archived, c.created_by_id, c.created_at, c.updated_at,
		       COUNT(*) OVER() as total_count
		FROM messaging_conversations c
		INNER JOIN messaging_participants p ON p.conversation_id = c.id AND p.user_id = $1
		WHERE c.dealership_id = $2
	`

	args := []interface{}{userID, dealershipID}
	argIdx := 3

	if filter.Type != nil {
		baseQuery += fmt.Sprintf(" AND c.type = $%d", argIdx)
		args = append(args, *filter.Type)
		argIdx++
	}

	if filter.IsArchived != nil {
		baseQuery += fmt.Sprintf(" AND c.is_archived = $%d", argIdx)
		args = append(args, *filter.IsArchived)
		argIdx++
	}

	if filter.Search != nil && *filter.Search != "" {
		baseQuery += fmt.Sprintf(" AND (c.name ILIKE $%d)", argIdx)
		args = append(args, "%"+*filter.Search+"%")
		argIdx++
	}

	baseQuery += " ORDER BY c.is_pinned DESC, c.updated_at DESC"
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := p.db.Query(baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query conversations: %w", err)
	}
	defer rows.Close()

	var conversations []Conversation
	var total int

	for rows.Next() {
		var c Conversation
		err := rows.Scan(
			&c.ID, &c.DealershipID, &c.Type, &c.Name, &c.Description, &c.AvatarURL,
			&c.IsMuted, &c.IsPinned, &c.IsArchived, &c.CreatedByID, &c.CreatedAt, &c.UpdatedAt,
			&total,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan conversation: %w", err)
		}

		// Load participants
		participants, err := p.GetParticipants(c.ID)
		if err == nil {
			c.Participants = participants
		}

		// Load last message
		lastMsg, err := p.getLastMessage(c.ID)
		if err == nil && lastMsg != nil {
			c.LastMessage = lastMsg
		}

		// Calculate unread count
		c.UnreadCount = p.getUnreadCount(c.ID, userID)

		conversations = append(conversations, c)
	}

	return conversations, total, nil
}

// GetConversation retrieves a single conversation
func (p *PostgresDB) GetConversation(id, dealershipID, userID string) (*Conversation, error) {
	query := `
		SELECT c.id, c.dealership_id, c.type, c.name, c.description, c.avatar_url,
		       c.is_muted, c.is_pinned, c.is_archived, c.created_by_id, c.created_at, c.updated_at
		FROM messaging_conversations c
		INNER JOIN messaging_participants p ON p.conversation_id = c.id AND p.user_id = $3
		WHERE c.id = $1 AND c.dealership_id = $2
	`

	var c Conversation
	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&c.ID, &c.DealershipID, &c.Type, &c.Name, &c.Description, &c.AvatarURL,
		&c.IsMuted, &c.IsPinned, &c.IsArchived, &c.CreatedByID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("conversation not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}

	// Load participants
	participants, err := p.GetParticipants(c.ID)
	if err == nil {
		c.Participants = participants
	}

	// Load last message
	lastMsg, err := p.getLastMessage(c.ID)
	if err == nil && lastMsg != nil {
		c.LastMessage = lastMsg
	}

	c.UnreadCount = p.getUnreadCount(c.ID, userID)

	return &c, nil
}

// CreateConversation creates a new conversation
func (p *PostgresDB) CreateConversation(dealershipID, userID string, req CreateConversationRequest) (*Conversation, error) {
	tx, err := p.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO messaging_conversations (id, dealership_id, type, name, description, created_by_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err = tx.Exec(query, id, dealershipID, req.Type, req.Name, req.Description, userID, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	// Add creator as admin
	_, err = tx.Exec(`
		INSERT INTO messaging_participants (id, conversation_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, 'ADMIN', $4)
	`, uuid.New().String(), id, userID, now)
	if err != nil {
		return nil, fmt.Errorf("failed to add creator as participant: %w", err)
	}

	// Add other participants
	for _, participantID := range req.ParticipantIDs {
		if participantID == userID {
			continue // Skip creator, already added
		}
		_, err = tx.Exec(`
			INSERT INTO messaging_participants (id, conversation_id, user_id, role, joined_at)
			VALUES ($1, $2, $3, 'MEMBER', $4)
		`, uuid.New().String(), id, participantID, now)
		if err != nil {
			return nil, fmt.Errorf("failed to add participant: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return p.GetConversation(id, dealershipID, userID)
}

// UpdateConversation updates conversation settings
func (p *PostgresDB) UpdateConversation(id, dealershipID, userID string, req UpdateConversationRequest) (*Conversation, error) {
	updates := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *req.Description)
		argIdx++
	}
	if req.IsMuted != nil {
		updates = append(updates, fmt.Sprintf("is_muted = $%d", argIdx))
		args = append(args, *req.IsMuted)
		argIdx++
	}
	if req.IsPinned != nil {
		updates = append(updates, fmt.Sprintf("is_pinned = $%d", argIdx))
		args = append(args, *req.IsPinned)
		argIdx++
	}
	if req.IsArchived != nil {
		updates = append(updates, fmt.Sprintf("is_archived = $%d", argIdx))
		args = append(args, *req.IsArchived)
		argIdx++
	}

	if len(updates) == 0 {
		return p.GetConversation(id, dealershipID, userID)
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now())
	argIdx++

	args = append(args, id, dealershipID)

	query := fmt.Sprintf(`
		UPDATE messaging_conversations
		SET %s
		WHERE id = $%d AND dealership_id = $%d
	`, strings.Join(updates, ", "), argIdx, argIdx+1)

	_, err := p.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	return p.GetConversation(id, dealershipID, userID)
}

// GetOrCreateDirectConversation gets or creates a direct conversation between two users
func (p *PostgresDB) GetOrCreateDirectConversation(dealershipID, userID, otherUserID string) (*Conversation, error) {
	// Check if direct conversation exists
	query := `
		SELECT c.id
		FROM messaging_conversations c
		INNER JOIN messaging_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
		INNER JOIN messaging_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
		WHERE c.dealership_id = $3 AND c.type = 'DIRECT'
		LIMIT 1
	`

	var existingID string
	err := p.db.QueryRow(query, userID, otherUserID, dealershipID).Scan(&existingID)
	if err == nil {
		return p.GetConversation(existingID, dealershipID, userID)
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing conversation: %w", err)
	}

	// Create new direct conversation
	return p.CreateConversation(dealershipID, userID, CreateConversationRequest{
		Type:           "DIRECT",
		ParticipantIDs: []string{otherUserID},
	})
}

// ListMessages retrieves messages in a conversation
func (p *PostgresDB) ListMessages(conversationID, dealershipID, userID string, filter MessageFilter) ([]Message, int, bool, error) {
	baseQuery := `
		SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.status,
		       m.reply_to_id, m.is_edited, m.edited_at, m.is_deleted, m.deleted_at,
		       m.delivered_at, m.read_at, m.is_ephemeral, m.ephemeral_seconds,
		       m.ephemeral_expires_at, m.created_at, m.updated_at,
		       COUNT(*) OVER() as total_count
		FROM messaging_messages m
		WHERE m.conversation_id = $1 AND m.is_deleted = false
	`

	args := []interface{}{conversationID}
	argIdx := 2

	if filter.BeforeID != nil {
		baseQuery += fmt.Sprintf(" AND m.created_at < (SELECT created_at FROM messaging_messages WHERE id = $%d)", argIdx)
		args = append(args, *filter.BeforeID)
		argIdx++
	}

	if filter.AfterID != nil {
		baseQuery += fmt.Sprintf(" AND m.created_at > (SELECT created_at FROM messaging_messages WHERE id = $%d)", argIdx)
		args = append(args, *filter.AfterID)
		argIdx++
	}

	baseQuery += " ORDER BY m.created_at DESC"
	baseQuery += fmt.Sprintf(" LIMIT $%d", argIdx)
	args = append(args, filter.Limit+1) // +1 to check for more

	rows, err := p.db.Query(baseQuery, args...)
	if err != nil {
		return nil, 0, false, fmt.Errorf("failed to query messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	var total int

	for rows.Next() {
		var m Message
		err := rows.Scan(
			&m.ID, &m.ConversationID, &m.SenderID, &m.Type, &m.Content, &m.Status,
			&m.ReplyToID, &m.IsEdited, &m.EditedAt, &m.IsDeleted, &m.DeletedAt,
			&m.DeliveredAt, &m.ReadAt, &m.IsEphemeral, &m.EphemeralSeconds,
			&m.EphemeralExpiresAt, &m.CreatedAt, &m.UpdatedAt,
			&total,
		)
		if err != nil {
			return nil, 0, false, fmt.Errorf("failed to scan message: %w", err)
		}

		// Load sender info
		sender, _ := p.getParticipantInfo(conversationID, m.SenderID)
		if sender != nil {
			m.Sender = sender
		}

		// Load reactions
		m.Reactions = p.getMessageReactions(m.ID)

		// Load attachments
		m.Attachments = p.getMessageAttachments(m.ID)

		messages = append(messages, m)
	}

	hasMore := len(messages) > filter.Limit
	if hasMore {
		messages = messages[:filter.Limit]
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, total, hasMore, nil
}

// GetMessage retrieves a single message
func (p *PostgresDB) GetMessage(id, conversationID string) (*Message, error) {
	query := `
		SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.status,
		       m.reply_to_id, m.is_edited, m.edited_at, m.is_deleted, m.deleted_at,
		       m.delivered_at, m.read_at, m.is_ephemeral, m.ephemeral_seconds,
		       m.ephemeral_expires_at, m.created_at, m.updated_at
		FROM messaging_messages m
		WHERE m.id = $1 AND m.conversation_id = $2
	`

	var m Message
	err := p.db.QueryRow(query, id, conversationID).Scan(
		&m.ID, &m.ConversationID, &m.SenderID, &m.Type, &m.Content, &m.Status,
		&m.ReplyToID, &m.IsEdited, &m.EditedAt, &m.IsDeleted, &m.DeletedAt,
		&m.DeliveredAt, &m.ReadAt, &m.IsEphemeral, &m.EphemeralSeconds,
		&m.EphemeralExpiresAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("message not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	// Load sender
	sender, _ := p.getParticipantInfo(conversationID, m.SenderID)
	if sender != nil {
		m.Sender = sender
	}

	// Load reactions
	m.Reactions = p.getMessageReactions(m.ID)

	// Load attachments
	m.Attachments = p.getMessageAttachments(m.ID)

	return &m, nil
}

// CreateMessage creates a new message
func (p *PostgresDB) CreateMessage(conversationID, dealershipID, senderID string, req SendMessageRequest) (*Message, error) {
	id := uuid.New().String()
	now := time.Now()

	var ephemeralExpiresAt *time.Time
	if req.IsEphemeral && req.EphemeralSeconds != nil {
		expires := now.Add(time.Duration(*req.EphemeralSeconds) * time.Second)
		ephemeralExpiresAt = &expires
	}

	query := `
		INSERT INTO messaging_messages (
			id, conversation_id, sender_id, type, content, status, reply_to_id,
			is_ephemeral, ephemeral_seconds, ephemeral_expires_at, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, 'SENT', $6, $7, $8, $9, $10, $11)
	`

	_, err := p.db.Exec(query, id, conversationID, senderID, req.Type, req.Content,
		req.ReplyToID, req.IsEphemeral, req.EphemeralSeconds, ephemeralExpiresAt, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Update conversation updated_at
	p.db.Exec("UPDATE messaging_conversations SET updated_at = $1 WHERE id = $2", now, conversationID)

	return p.GetMessage(id, conversationID)
}

// UpdateMessage updates a message
func (p *PostgresDB) UpdateMessage(id, conversationID, userID string, req UpdateMessageRequest) (*Message, error) {
	now := time.Now()

	query := `
		UPDATE messaging_messages
		SET content = $1, is_edited = true, edited_at = $2, updated_at = $3
		WHERE id = $4 AND conversation_id = $5 AND sender_id = $6
	`

	result, err := p.db.Exec(query, req.Content, now, now, id, conversationID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to update message: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return nil, fmt.Errorf("message not found or unauthorized")
	}

	return p.GetMessage(id, conversationID)
}

// DeleteMessage soft-deletes a message
func (p *PostgresDB) DeleteMessage(id, conversationID, userID string) error {
	now := time.Now()

	query := `
		UPDATE messaging_messages
		SET is_deleted = true, deleted_at = $1, content = '[Message deleted]', updated_at = $2
		WHERE id = $3 AND conversation_id = $4 AND sender_id = $5
	`

	result, err := p.db.Exec(query, now, now, id, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("message not found or unauthorized")
	}

	return nil
}

// MarkAsDelivered marks a message as delivered
func (p *PostgresDB) MarkAsDelivered(messageID, userID string) error {
	now := time.Now()

	query := `
		UPDATE messaging_messages
		SET status = 'DELIVERED', delivered_at = $1, updated_at = $2
		WHERE id = $3 AND sender_id != $4 AND status = 'SENT'
	`

	_, err := p.db.Exec(query, now, now, messageID, userID)
	return err
}

// MarkAsRead marks all messages in a conversation as read for a user
func (p *PostgresDB) MarkAsRead(conversationID, userID string) error {
	now := time.Now()

	// Update participant's last_read_at
	_, err := p.db.Exec(`
		UPDATE messaging_participants
		SET last_read_at = $1
		WHERE conversation_id = $2 AND user_id = $3
	`, now, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to update last read: %w", err)
	}

	// Update message status for messages sent to this user
	_, err = p.db.Exec(`
		UPDATE messaging_messages
		SET status = 'READ', read_at = $1, updated_at = $2
		WHERE conversation_id = $3 AND sender_id != $4 AND status IN ('SENT', 'DELIVERED')
	`, now, now, conversationID, userID)

	return err
}

// AddReaction adds a reaction to a message
func (p *PostgresDB) AddReaction(messageID, userID, userName string, req AddReactionRequest) (*MessageReaction, error) {
	// Remove existing reaction of same type from user
	p.db.Exec(`
		DELETE FROM messaging_reactions
		WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3
	`, messageID, userID, req.ReactionType)

	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO messaging_reactions (id, message_id, user_id, user_name, reaction_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := p.db.Exec(query, id, messageID, userID, userName, req.ReactionType, now)
	if err != nil {
		return nil, fmt.Errorf("failed to add reaction: %w", err)
	}

	return &MessageReaction{
		ID:           id,
		MessageID:    messageID,
		UserID:       userID,
		UserName:     userName,
		ReactionType: req.ReactionType,
		CreatedAt:    now,
	}, nil
}

// RemoveReaction removes a reaction from a message
func (p *PostgresDB) RemoveReaction(messageID, userID, reactionType string) error {
	query := `
		DELETE FROM messaging_reactions
		WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3
	`

	result, err := p.db.Exec(query, messageID, userID, reactionType)
	if err != nil {
		return fmt.Errorf("failed to remove reaction: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("reaction not found")
	}

	return nil
}

// AddParticipant adds a participant to a conversation
func (p *PostgresDB) AddParticipant(conversationID, userID, addedByID, role string) (*Participant, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO messaging_participants (id, conversation_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (conversation_id, user_id) DO NOTHING
	`

	_, err := p.db.Exec(query, id, conversationID, userID, role, now)
	if err != nil {
		return nil, fmt.Errorf("failed to add participant: %w", err)
	}

	return p.getParticipantInfo(conversationID, userID)
}

// RemoveParticipant removes a participant from a conversation
func (p *PostgresDB) RemoveParticipant(conversationID, userID, removedByID string) error {
	query := `
		DELETE FROM messaging_participants
		WHERE conversation_id = $1 AND user_id = $2
	`

	result, err := p.db.Exec(query, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove participant: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("participant not found")
	}

	return nil
}

// GetParticipants retrieves all participants in a conversation
func (p *PostgresDB) GetParticipants(conversationID string) ([]Participant, error) {
	query := `
		SELECT p.id, p.user_id, p.role, p.joined_at, p.last_read_at,
		       COALESCE(u.first_name, 'Unknown') as first_name,
		       COALESCE(u.last_name, 'User') as last_name
		FROM messaging_participants p
		LEFT JOIN users u ON u.id = p.user_id
		WHERE p.conversation_id = $1
		ORDER BY p.joined_at
	`

	rows, err := p.db.Query(query, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query participants: %w", err)
	}
	defer rows.Close()

	var participants []Participant
	for rows.Next() {
		var p Participant
		err := rows.Scan(&p.ID, &p.UserID, &p.Role, &p.JoinedAt, &p.LastReadAt, &p.FirstName, &p.LastName)
		if err != nil {
			continue
		}
		p.Presence = "OFFLINE" // Will be updated by WebSocket hub
		participants = append(participants, p)
	}

	return participants, nil
}

// Helper functions

func (p *PostgresDB) getParticipantInfo(conversationID, userID string) (*Participant, error) {
	query := `
		SELECT p.id, p.user_id, p.role, p.joined_at, p.last_read_at,
		       COALESCE(u.first_name, 'Unknown') as first_name,
		       COALESCE(u.last_name, 'User') as last_name
		FROM messaging_participants p
		LEFT JOIN users u ON u.id = p.user_id
		WHERE p.conversation_id = $1 AND p.user_id = $2
	`

	var part Participant
	err := p.db.QueryRow(query, conversationID, userID).Scan(
		&part.ID, &part.UserID, &part.Role, &part.JoinedAt, &part.LastReadAt,
		&part.FirstName, &part.LastName,
	)
	if err != nil {
		return nil, err
	}

	part.Presence = "OFFLINE"
	return &part, nil
}

func (p *PostgresDB) getLastMessage(conversationID string) (*Message, error) {
	query := `
		SELECT id FROM messaging_messages
		WHERE conversation_id = $1 AND is_deleted = false
		ORDER BY created_at DESC
		LIMIT 1
	`

	var messageID string
	err := p.db.QueryRow(query, conversationID).Scan(&messageID)
	if err != nil {
		return nil, err
	}

	return p.GetMessage(messageID, conversationID)
}

func (p *PostgresDB) getUnreadCount(conversationID, userID string) int {
	query := `
		SELECT COUNT(*)
		FROM messaging_messages m
		INNER JOIN messaging_participants p ON p.conversation_id = m.conversation_id AND p.user_id = $2
		WHERE m.conversation_id = $1
		  AND m.sender_id != $2
		  AND m.is_deleted = false
		  AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
	`

	var count int
	p.db.QueryRow(query, conversationID, userID).Scan(&count)
	return count
}

func (p *PostgresDB) getMessageReactions(messageID string) []MessageReaction {
	query := `
		SELECT id, message_id, user_id, user_name, reaction_type, created_at
		FROM messaging_reactions
		WHERE message_id = $1
		ORDER BY created_at
	`

	rows, err := p.db.Query(query, messageID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var reactions []MessageReaction
	for rows.Next() {
		var r MessageReaction
		if err := rows.Scan(&r.ID, &r.MessageID, &r.UserID, &r.UserName, &r.ReactionType, &r.CreatedAt); err == nil {
			reactions = append(reactions, r)
		}
	}

	return reactions
}

func (p *PostgresDB) getMessageAttachments(messageID string) []MediaAttachment {
	query := `
		SELECT id, message_id, type, url, thumbnail_url, file_name, file_size,
		       mime_type, width, height, duration_seconds, created_at
		FROM messaging_attachments
		WHERE message_id = $1
		ORDER BY created_at
	`

	rows, err := p.db.Query(query, messageID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var attachments []MediaAttachment
	for rows.Next() {
		var a MediaAttachment
		if err := rows.Scan(&a.ID, &a.MessageID, &a.Type, &a.URL, &a.ThumbnailURL,
			&a.FileName, &a.FileSize, &a.MimeType, &a.Width, &a.Height,
			&a.DurationSeconds, &a.CreatedAt); err == nil {
			attachments = append(attachments, a)
		}
	}

	return attachments
}

// getLinkPreview extracts link preview from message metadata
func (p *PostgresDB) getLinkPreview(messageID string) *LinkPreview {
	query := `
		SELECT link_preview FROM messaging_messages WHERE id = $1 AND link_preview IS NOT NULL
	`

	var previewJSON []byte
	err := p.db.QueryRow(query, messageID).Scan(&previewJSON)
	if err != nil || previewJSON == nil {
		return nil
	}

	var preview LinkPreview
	if err := json.Unmarshal(previewJSON, &preview); err != nil {
		return nil
	}

	return &preview
}
