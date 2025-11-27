package main

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

// =====================================================
// EMAIL CRUD OPERATIONS
// =====================================================

// CreateEmail creates a new email in the inbox
func (p *PostgresEmailDatabase) CreateEmail(email *Email) error {
	query := `
		INSERT INTO emails (
			id, dealership_id, user_id, thread_id, message_id, in_reply_to, references_header,
			folder, from_email, from_name, to_emails, to_names, cc_emails, cc_names, bcc_emails,
			subject, body_html, body_text, snippet, is_read, is_starred, is_important,
			has_attachments, labels, received_at, sent_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23, $24, $25, $26, $27, $28
		)
	`

	_, err := p.db.Exec(query,
		email.ID,
		email.DealershipID,
		email.UserID,
		email.ThreadID,
		email.MessageID,
		email.InReplyTo,
		pq.Array(email.References),
		email.Folder,
		email.FromEmail,
		email.FromName,
		pq.Array(email.ToEmails),
		pq.Array(email.ToNames),
		pq.Array(email.CcEmails),
		pq.Array(email.CcNames),
		pq.Array(email.BccEmails),
		email.Subject,
		email.BodyHTML,
		email.BodyText,
		email.Snippet,
		email.IsRead,
		email.IsStarred,
		email.IsImportant,
		email.HasAttachments,
		pq.Array(email.Labels),
		email.ReceivedAt,
		email.SentAt,
		email.CreatedAt,
		email.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create email: %w", err)
	}

	// Update thread metadata
	if err := p.updateThreadMetadata(email.ThreadID); err != nil {
		return fmt.Errorf("failed to update thread: %w", err)
	}

	return nil
}

// GetEmail retrieves an email by ID
func (p *PostgresEmailDatabase) GetEmail(id string, dealershipID string, userID string) (*Email, error) {
	query := `
		SELECT id, dealership_id, user_id, thread_id, message_id, in_reply_to, references_header,
			folder, from_email, from_name, to_emails, to_names, cc_emails, cc_names, bcc_emails,
			subject, body_html, body_text, snippet, is_read, is_starred, is_important,
			has_attachments, labels, received_at, sent_at, created_at, updated_at
		FROM emails
		WHERE id = $1 AND dealership_id = $2 AND user_id = $3
	`

	email := &Email{}
	var references, toEmails, toNames, ccEmails, ccNames, bccEmails, labels pq.StringArray

	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&email.ID,
		&email.DealershipID,
		&email.UserID,
		&email.ThreadID,
		&email.MessageID,
		&email.InReplyTo,
		&references,
		&email.Folder,
		&email.FromEmail,
		&email.FromName,
		&toEmails,
		&toNames,
		&ccEmails,
		&ccNames,
		&bccEmails,
		&email.Subject,
		&email.BodyHTML,
		&email.BodyText,
		&email.Snippet,
		&email.IsRead,
		&email.IsStarred,
		&email.IsImportant,
		&email.HasAttachments,
		&labels,
		&email.ReceivedAt,
		&email.SentAt,
		&email.CreatedAt,
		&email.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("email not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get email: %w", err)
	}

	email.References = references
	email.ToEmails = toEmails
	email.ToNames = toNames
	email.CcEmails = ccEmails
	email.CcNames = ccNames
	email.BccEmails = bccEmails
	email.Labels = labels

	return email, nil
}

// ListEmails retrieves emails with filtering and pagination
func (p *PostgresEmailDatabase) ListEmails(filter *EmailListFilter) (*EmailListResult, error) {
	// Build query with filters
	baseQuery := `
		SELECT id, dealership_id, user_id, thread_id, message_id, in_reply_to, references_header,
			folder, from_email, from_name, to_emails, to_names, cc_emails, cc_names, bcc_emails,
			subject, body_html, body_text, snippet, is_read, is_starred, is_important,
			has_attachments, labels, received_at, sent_at, created_at, updated_at
		FROM emails
		WHERE dealership_id = $1 AND user_id = $2
	`

	countQuery := `SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2`

	args := []interface{}{filter.DealershipID, filter.UserID}
	argNum := 3

	// Add folder filter
	if filter.Folder != "" {
		baseQuery += fmt.Sprintf(" AND folder = $%d", argNum)
		countQuery += fmt.Sprintf(" AND folder = $%d", argNum)
		args = append(args, filter.Folder)
		argNum++
	}

	// Add read filter
	if filter.IsRead != nil {
		baseQuery += fmt.Sprintf(" AND is_read = $%d", argNum)
		countQuery += fmt.Sprintf(" AND is_read = $%d", argNum)
		args = append(args, *filter.IsRead)
		argNum++
	}

	// Add starred filter
	if filter.IsStarred != nil {
		baseQuery += fmt.Sprintf(" AND is_starred = $%d", argNum)
		countQuery += fmt.Sprintf(" AND is_starred = $%d", argNum)
		args = append(args, *filter.IsStarred)
		argNum++
	}

	// Add important filter
	if filter.IsImportant != nil {
		baseQuery += fmt.Sprintf(" AND is_important = $%d", argNum)
		countQuery += fmt.Sprintf(" AND is_important = $%d", argNum)
		args = append(args, *filter.IsImportant)
		argNum++
	}

	// Add attachments filter
	if filter.HasAttachments != nil {
		baseQuery += fmt.Sprintf(" AND has_attachments = $%d", argNum)
		countQuery += fmt.Sprintf(" AND has_attachments = $%d", argNum)
		args = append(args, *filter.HasAttachments)
		argNum++
	}

	// Add from email filter
	if filter.FromEmail != "" {
		baseQuery += fmt.Sprintf(" AND from_email ILIKE $%d", argNum)
		countQuery += fmt.Sprintf(" AND from_email ILIKE $%d", argNum)
		args = append(args, "%"+filter.FromEmail+"%")
		argNum++
	}

	// Add subject filter
	if filter.Subject != "" {
		baseQuery += fmt.Sprintf(" AND subject ILIKE $%d", argNum)
		countQuery += fmt.Sprintf(" AND subject ILIKE $%d", argNum)
		args = append(args, "%"+filter.Subject+"%")
		argNum++
	}

	// Add date range filters
	if filter.DateFrom != nil {
		baseQuery += fmt.Sprintf(" AND received_at >= $%d", argNum)
		countQuery += fmt.Sprintf(" AND received_at >= $%d", argNum)
		args = append(args, *filter.DateFrom)
		argNum++
	}
	if filter.DateTo != nil {
		baseQuery += fmt.Sprintf(" AND received_at <= $%d", argNum)
		countQuery += fmt.Sprintf(" AND received_at <= $%d", argNum)
		args = append(args, *filter.DateTo)
		argNum++
	}

	// Add labels filter
	if len(filter.Labels) > 0 {
		baseQuery += fmt.Sprintf(" AND labels && $%d", argNum)
		countQuery += fmt.Sprintf(" AND labels && $%d", argNum)
		args = append(args, pq.Array(filter.Labels))
		argNum++
	}

	// Get total count
	var total int
	if err := p.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count emails: %w", err)
	}

	// Add sorting
	sortBy := "received_at"
	if filter.SortBy != "" {
		switch filter.SortBy {
		case "sent_at", "subject", "from_email":
			sortBy = filter.SortBy
		}
	}
	sortOrder := "DESC"
	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", sortBy, sortOrder)

	// Add pagination
	limit := 50
	if filter.Limit > 0 && filter.Limit <= 100 {
		limit = filter.Limit
	}
	offset := filter.Offset

	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, limit, offset)

	// Execute query
	rows, err := p.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list emails: %w", err)
	}
	defer rows.Close()

	emails := []*Email{}
	for rows.Next() {
		email := &Email{}
		var references, toEmails, toNames, ccEmails, ccNames, bccEmails, labels pq.StringArray

		err := rows.Scan(
			&email.ID,
			&email.DealershipID,
			&email.UserID,
			&email.ThreadID,
			&email.MessageID,
			&email.InReplyTo,
			&references,
			&email.Folder,
			&email.FromEmail,
			&email.FromName,
			&toEmails,
			&toNames,
			&ccEmails,
			&ccNames,
			&bccEmails,
			&email.Subject,
			&email.BodyHTML,
			&email.BodyText,
			&email.Snippet,
			&email.IsRead,
			&email.IsStarred,
			&email.IsImportant,
			&email.HasAttachments,
			&labels,
			&email.ReceivedAt,
			&email.SentAt,
			&email.CreatedAt,
			&email.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan email: %w", err)
		}

		email.References = references
		email.ToEmails = toEmails
		email.ToNames = toNames
		email.CcEmails = ccEmails
		email.CcNames = ccNames
		email.BccEmails = bccEmails
		email.Labels = labels

		emails = append(emails, email)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating emails: %w", err)
	}

	hasMore := offset+len(emails) < total
	nextOffset := offset + len(emails)

	return &EmailListResult{
		Emails:     emails,
		Total:      total,
		HasMore:    hasMore,
		NextOffset: nextOffset,
	}, nil
}

// UpdateEmail updates an email
func (p *PostgresEmailDatabase) UpdateEmail(email *Email) error {
	query := `
		UPDATE emails SET
			folder = $1, is_read = $2, is_starred = $3, is_important = $4, labels = $5, updated_at = $6
		WHERE id = $7 AND dealership_id = $8 AND user_id = $9
	`

	result, err := p.db.Exec(query,
		email.Folder,
		email.IsRead,
		email.IsStarred,
		email.IsImportant,
		pq.Array(email.Labels),
		time.Now(),
		email.ID,
		email.DealershipID,
		email.UserID,
	)
	if err != nil {
		return fmt.Errorf("failed to update email: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("email not found")
	}

	// Update thread metadata
	if err := p.updateThreadMetadata(email.ThreadID); err != nil {
		return fmt.Errorf("failed to update thread: %w", err)
	}

	return nil
}

// DeleteEmail moves an email to trash or permanently deletes it
func (p *PostgresEmailDatabase) DeleteEmail(id string, dealershipID string, userID string, permanent bool) error {
	if permanent {
		query := `DELETE FROM emails WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
		result, err := p.db.Exec(query, id, dealershipID, userID)
		if err != nil {
			return fmt.Errorf("failed to delete email: %w", err)
		}
		rows, _ := result.RowsAffected()
		if rows == 0 {
			return fmt.Errorf("email not found")
		}
		return nil
	}

	// Move to trash
	query := `UPDATE emails SET folder = 'trash', updated_at = NOW() WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to move email to trash: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("email not found")
	}
	return nil
}

// BatchDeleteEmails moves multiple emails to trash or permanently deletes them
func (p *PostgresEmailDatabase) BatchDeleteEmails(ids []string, dealershipID string, userID string, permanent bool) error {
	if len(ids) == 0 {
		return nil
	}

	if permanent {
		query := `DELETE FROM emails WHERE id = ANY($1) AND dealership_id = $2 AND user_id = $3`
		_, err := p.db.Exec(query, pq.Array(ids), dealershipID, userID)
		return err
	}

	query := `UPDATE emails SET folder = 'trash', updated_at = NOW() WHERE id = ANY($1) AND dealership_id = $2 AND user_id = $3`
	_, err := p.db.Exec(query, pq.Array(ids), dealershipID, userID)
	return err
}

// =====================================================
// EMAIL ACTIONS
// =====================================================

// MarkAsRead marks emails as read
func (p *PostgresEmailDatabase) MarkAsRead(ids []string, dealershipID string, userID string) error {
	if len(ids) == 0 {
		return nil
	}

	query := `UPDATE emails SET is_read = TRUE, updated_at = NOW() WHERE id = ANY($1) AND dealership_id = $2 AND user_id = $3`
	_, err := p.db.Exec(query, pq.Array(ids), dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark as read: %w", err)
	}

	// Update thread unread counts
	threadQuery := `SELECT DISTINCT thread_id FROM emails WHERE id = ANY($1)`
	rows, err := p.db.Query(threadQuery, pq.Array(ids))
	if err != nil {
		return nil // Non-fatal, email was marked
	}
	defer rows.Close()

	for rows.Next() {
		var threadID string
		if err := rows.Scan(&threadID); err == nil {
			p.updateThreadMetadata(threadID)
		}
	}

	return nil
}

// MarkAsUnread marks emails as unread
func (p *PostgresEmailDatabase) MarkAsUnread(ids []string, dealershipID string, userID string) error {
	if len(ids) == 0 {
		return nil
	}

	query := `UPDATE emails SET is_read = FALSE, updated_at = NOW() WHERE id = ANY($1) AND dealership_id = $2 AND user_id = $3`
	_, err := p.db.Exec(query, pq.Array(ids), dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark as unread: %w", err)
	}

	// Update thread unread counts
	threadQuery := `SELECT DISTINCT thread_id FROM emails WHERE id = ANY($1)`
	rows, err := p.db.Query(threadQuery, pq.Array(ids))
	if err != nil {
		return nil
	}
	defer rows.Close()

	for rows.Next() {
		var threadID string
		if err := rows.Scan(&threadID); err == nil {
			p.updateThreadMetadata(threadID)
		}
	}

	return nil
}

// ToggleStar toggles the starred status of an email
func (p *PostgresEmailDatabase) ToggleStar(id string, dealershipID string, userID string) error {
	query := `UPDATE emails SET is_starred = NOT is_starred, updated_at = NOW() WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to toggle star: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("email not found")
	}
	return nil
}

// ToggleImportant toggles the important status of an email
func (p *PostgresEmailDatabase) ToggleImportant(id string, dealershipID string, userID string) error {
	query := `UPDATE emails SET is_important = NOT is_important, updated_at = NOW() WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to toggle important: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("email not found")
	}
	return nil
}

// MoveToFolder moves emails to a specific folder
func (p *PostgresEmailDatabase) MoveToFolder(ids []string, dealershipID string, userID string, folder EmailFolder) error {
	if len(ids) == 0 {
		return nil
	}

	query := `UPDATE emails SET folder = $1, updated_at = NOW() WHERE id = ANY($2) AND dealership_id = $3 AND user_id = $4`
	_, err := p.db.Exec(query, folder, pq.Array(ids), dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to move to folder: %w", err)
	}
	return nil
}

// AddLabels adds labels to emails
func (p *PostgresEmailDatabase) AddLabels(ids []string, dealershipID string, userID string, labels []string) error {
	if len(ids) == 0 || len(labels) == 0 {
		return nil
	}

	query := `UPDATE emails SET labels = array_cat(labels, $1), updated_at = NOW() WHERE id = ANY($2) AND dealership_id = $3 AND user_id = $4`
	_, err := p.db.Exec(query, pq.Array(labels), pq.Array(ids), dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to add labels: %w", err)
	}
	return nil
}

// RemoveLabels removes labels from emails
func (p *PostgresEmailDatabase) RemoveLabels(ids []string, dealershipID string, userID string, labels []string) error {
	if len(ids) == 0 || len(labels) == 0 {
		return nil
	}

	// Remove each label one at a time
	for _, label := range labels {
		query := `UPDATE emails SET labels = array_remove(labels, $1), updated_at = NOW() WHERE id = ANY($2) AND dealership_id = $3 AND user_id = $4`
		_, err := p.db.Exec(query, label, pq.Array(ids), dealershipID, userID)
		if err != nil {
			return fmt.Errorf("failed to remove label %s: %w", label, err)
		}
	}
	return nil
}

// ArchiveEmails archives emails
func (p *PostgresEmailDatabase) ArchiveEmails(ids []string, dealershipID string, userID string) error {
	return p.MoveToFolder(ids, dealershipID, userID, FolderArchive)
}

// UnarchiveEmails unarchives emails (moves back to inbox)
func (p *PostgresEmailDatabase) UnarchiveEmails(ids []string, dealershipID string, userID string) error {
	return p.MoveToFolder(ids, dealershipID, userID, FolderInbox)
}

// =====================================================
// THREAD OPERATIONS
// =====================================================

// GetThread retrieves a thread with all messages
func (p *PostgresEmailDatabase) GetThread(id string, dealershipID string, userID string) (*EmailThread, error) {
	query := `
		SELECT id, dealership_id, user_id, subject, snippet, participants, message_count,
			unread_count, is_starred, is_important, has_attachments, labels, last_message_at,
			created_at, updated_at
		FROM email_threads
		WHERE id = $1 AND dealership_id = $2 AND user_id = $3
	`

	thread := &EmailThread{}
	var participants, labels pq.StringArray

	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&thread.ID,
		&thread.DealershipID,
		&thread.UserID,
		&thread.Subject,
		&thread.Snippet,
		&participants,
		&thread.MessageCount,
		&thread.UnreadCount,
		&thread.IsStarred,
		&thread.IsImportant,
		&thread.HasAttachments,
		&labels,
		&thread.LastMessageAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("thread not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get thread: %w", err)
	}

	thread.Participants = participants
	thread.Labels = labels

	// Get messages in thread
	messagesQuery := `
		SELECT id, dealership_id, user_id, thread_id, message_id, in_reply_to, references_header,
			folder, from_email, from_name, to_emails, to_names, cc_emails, cc_names, bcc_emails,
			subject, body_html, body_text, snippet, is_read, is_starred, is_important,
			has_attachments, labels, received_at, sent_at, created_at, updated_at
		FROM emails WHERE thread_id = $1 ORDER BY received_at ASC
	`

	rows, err := p.db.Query(messagesQuery, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get thread messages: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		email := Email{}
		var references, toEmails, toNames, ccEmails, ccNames, bccEmails, emailLabels pq.StringArray

		err := rows.Scan(
			&email.ID,
			&email.DealershipID,
			&email.UserID,
			&email.ThreadID,
			&email.MessageID,
			&email.InReplyTo,
			&references,
			&email.Folder,
			&email.FromEmail,
			&email.FromName,
			&toEmails,
			&toNames,
			&ccEmails,
			&ccNames,
			&bccEmails,
			&email.Subject,
			&email.BodyHTML,
			&email.BodyText,
			&email.Snippet,
			&email.IsRead,
			&email.IsStarred,
			&email.IsImportant,
			&email.HasAttachments,
			&emailLabels,
			&email.ReceivedAt,
			&email.SentAt,
			&email.CreatedAt,
			&email.UpdatedAt,
		)
		if err != nil {
			continue
		}

		email.References = references
		email.ToEmails = toEmails
		email.ToNames = toNames
		email.CcEmails = ccEmails
		email.CcNames = ccNames
		email.BccEmails = bccEmails
		email.Labels = emailLabels

		thread.Messages = append(thread.Messages, email)
	}

	return thread, nil
}

// ListThreads retrieves threads with filtering and pagination
func (p *PostgresEmailDatabase) ListThreads(filter *ThreadListFilter) (*ThreadListResult, error) {
	baseQuery := `
		SELECT t.id, t.dealership_id, t.user_id, t.subject, t.snippet, t.participants, t.message_count,
			t.unread_count, t.is_starred, t.is_important, t.has_attachments, t.labels, t.last_message_at,
			t.created_at, t.updated_at
		FROM email_threads t
		WHERE t.dealership_id = $1 AND t.user_id = $2
	`

	countQuery := `SELECT COUNT(*) FROM email_threads t WHERE t.dealership_id = $1 AND t.user_id = $2`

	args := []interface{}{filter.DealershipID, filter.UserID}
	argNum := 3

	// Filter by folder - check if thread has emails in this folder
	if filter.Folder != "" {
		baseQuery += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM emails e WHERE e.thread_id = t.id AND e.folder = $%d)`, argNum)
		countQuery += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM emails e WHERE e.thread_id = t.id AND e.folder = $%d)`, argNum)
		args = append(args, filter.Folder)
		argNum++
	}

	// Filter by unread
	if filter.IsRead != nil {
		if *filter.IsRead {
			baseQuery += " AND t.unread_count = 0"
			countQuery += " AND t.unread_count = 0"
		} else {
			baseQuery += " AND t.unread_count > 0"
			countQuery += " AND t.unread_count > 0"
		}
	}

	// Filter by starred
	if filter.IsStarred != nil {
		baseQuery += fmt.Sprintf(" AND t.is_starred = $%d", argNum)
		countQuery += fmt.Sprintf(" AND t.is_starred = $%d", argNum)
		args = append(args, *filter.IsStarred)
		argNum++
	}

	// Get total count
	var total int
	if err := p.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count threads: %w", err)
	}

	// Add sorting and pagination
	baseQuery += " ORDER BY t.last_message_at DESC"

	limit := 50
	if filter.Limit > 0 && filter.Limit <= 100 {
		limit = filter.Limit
	}
	offset := filter.Offset

	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, limit, offset)

	// Execute query
	rows, err := p.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list threads: %w", err)
	}
	defer rows.Close()

	threads := []*EmailThread{}
	for rows.Next() {
		thread := &EmailThread{}
		var participants, labels pq.StringArray

		err := rows.Scan(
			&thread.ID,
			&thread.DealershipID,
			&thread.UserID,
			&thread.Subject,
			&thread.Snippet,
			&participants,
			&thread.MessageCount,
			&thread.UnreadCount,
			&thread.IsStarred,
			&thread.IsImportant,
			&thread.HasAttachments,
			&labels,
			&thread.LastMessageAt,
			&thread.CreatedAt,
			&thread.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan thread: %w", err)
		}

		thread.Participants = participants
		thread.Labels = labels
		threads = append(threads, thread)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating threads: %w", err)
	}

	hasMore := offset+len(threads) < total
	nextOffset := offset + len(threads)

	return &ThreadListResult{
		Threads:    threads,
		Total:      total,
		HasMore:    hasMore,
		NextOffset: nextOffset,
	}, nil
}

// GetOrCreateThread finds or creates a thread for an email
func (p *PostgresEmailDatabase) GetOrCreateThread(email *Email) (string, error) {
	// Try to find existing thread by In-Reply-To or References
	if email.InReplyTo != nil && *email.InReplyTo != "" {
		var threadID string
		query := `SELECT thread_id FROM emails WHERE message_id = $1 AND dealership_id = $2 AND user_id = $3`
		err := p.db.QueryRow(query, *email.InReplyTo, email.DealershipID, email.UserID).Scan(&threadID)
		if err == nil {
			return threadID, nil
		}
	}

	// Check references
	for _, ref := range email.References {
		var threadID string
		query := `SELECT thread_id FROM emails WHERE message_id = $1 AND dealership_id = $2 AND user_id = $3`
		err := p.db.QueryRow(query, ref, email.DealershipID, email.UserID).Scan(&threadID)
		if err == nil {
			return threadID, nil
		}
	}

	// Create new thread
	threadID := generateUUID()
	subject := email.Subject

	// Normalize subject (remove Re:, Fwd:, etc.)
	normalizedSubject := normalizeSubject(subject)

	// Collect participants
	participants := []string{email.FromEmail}
	participants = append(participants, email.ToEmails...)
	participants = append(participants, email.CcEmails...)

	query := `
		INSERT INTO email_threads (
			id, dealership_id, user_id, subject, snippet, participants, message_count,
			unread_count, is_starred, is_important, has_attachments, labels, last_message_at,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, FALSE, FALSE, FALSE, '{}', $7, $8, $9)
	`

	now := time.Now()
	_, err := p.db.Exec(query,
		threadID,
		email.DealershipID,
		email.UserID,
		normalizedSubject,
		email.Snippet,
		pq.Array(participants),
		email.ReceivedAt,
		now,
		now,
	)

	if err != nil {
		return "", fmt.Errorf("failed to create thread: %w", err)
	}

	return threadID, nil
}

// updateThreadMetadata updates thread metadata based on its emails
func (p *PostgresEmailDatabase) updateThreadMetadata(threadID string) error {
	query := `
		UPDATE email_threads SET
			message_count = (SELECT COUNT(*) FROM emails WHERE thread_id = $1),
			unread_count = (SELECT COUNT(*) FROM emails WHERE thread_id = $1 AND is_read = FALSE),
			is_starred = (SELECT BOOL_OR(is_starred) FROM emails WHERE thread_id = $1),
			is_important = (SELECT BOOL_OR(is_important) FROM emails WHERE thread_id = $1),
			has_attachments = (SELECT BOOL_OR(has_attachments) FROM emails WHERE thread_id = $1),
			snippet = (SELECT snippet FROM emails WHERE thread_id = $1 ORDER BY received_at DESC LIMIT 1),
			last_message_at = (SELECT MAX(received_at) FROM emails WHERE thread_id = $1),
			updated_at = NOW()
		WHERE id = $1
	`

	_, err := p.db.Exec(query, threadID)
	return err
}

// normalizeSubject removes Re:, Fwd:, etc. from subject
func normalizeSubject(subject string) string {
	prefixes := []string{"re:", "fw:", "fwd:", "re :", "fw :", "fwd :"}
	normalized := strings.TrimSpace(subject)

	for {
		changed := false
		lower := strings.ToLower(normalized)
		for _, prefix := range prefixes {
			if strings.HasPrefix(lower, prefix) {
				normalized = strings.TrimSpace(normalized[len(prefix):])
				changed = true
				break
			}
		}
		if !changed {
			break
		}
	}

	return normalized
}

// =====================================================
// STATISTICS
// =====================================================

// GetEmailStats retrieves email statistics
func (p *PostgresEmailDatabase) GetEmailStats(dealershipID string, userID string) (*EmailStats, error) {
	stats := &EmailStats{}

	queries := []struct {
		query string
		dest  *int
	}{
		{`SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2 AND folder = 'inbox'`, &stats.TotalInbox},
		{`SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2 AND folder = 'inbox' AND is_read = FALSE`, &stats.UnreadInbox},
		{`SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2 AND folder = 'sent'`, &stats.TotalSent},
		{`SELECT COUNT(*) FROM email_drafts WHERE dealership_id = $1 AND user_id = $2`, &stats.TotalDrafts},
		{`SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2 AND folder = 'trash'`, &stats.TotalTrash},
		{`SELECT COUNT(*) FROM emails WHERE dealership_id = $1 AND user_id = $2 AND is_starred = TRUE`, &stats.TotalStarred},
	}

	for _, q := range queries {
		if err := p.db.QueryRow(q.query, dealershipID, userID).Scan(q.dest); err != nil {
			return nil, fmt.Errorf("failed to get stats: %w", err)
		}
	}

	return stats, nil
}

// =====================================================
// SEARCH
// =====================================================

// SearchEmails performs full-text search on emails
func (p *PostgresEmailDatabase) SearchEmails(dealershipID string, userID string, query string, limit int, offset int) (*EmailListResult, error) {
	// Use PostgreSQL full-text search
	searchQuery := `
		SELECT id, dealership_id, user_id, thread_id, message_id, in_reply_to, references_header,
			folder, from_email, from_name, to_emails, to_names, cc_emails, cc_names, bcc_emails,
			subject, body_html, body_text, snippet, is_read, is_starred, is_important,
			has_attachments, labels, received_at, sent_at, created_at, updated_at,
			ts_rank(to_tsvector('english', subject || ' ' || body_text), plainto_tsquery('english', $3)) as rank
		FROM emails
		WHERE dealership_id = $1 AND user_id = $2
			AND to_tsvector('english', subject || ' ' || body_text) @@ plainto_tsquery('english', $3)
		ORDER BY rank DESC, received_at DESC
		LIMIT $4 OFFSET $5
	`

	countQuery := `
		SELECT COUNT(*)
		FROM emails
		WHERE dealership_id = $1 AND user_id = $2
			AND to_tsvector('english', subject || ' ' || body_text) @@ plainto_tsquery('english', $3)
	`

	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var total int
	if err := p.db.QueryRow(countQuery, dealershipID, userID, query).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count search results: %w", err)
	}

	rows, err := p.db.Query(searchQuery, dealershipID, userID, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search emails: %w", err)
	}
	defer rows.Close()

	emails := []*Email{}
	for rows.Next() {
		email := &Email{}
		var references, toEmails, toNames, ccEmails, ccNames, bccEmails, labels pq.StringArray
		var rank float64

		err := rows.Scan(
			&email.ID,
			&email.DealershipID,
			&email.UserID,
			&email.ThreadID,
			&email.MessageID,
			&email.InReplyTo,
			&references,
			&email.Folder,
			&email.FromEmail,
			&email.FromName,
			&toEmails,
			&toNames,
			&ccEmails,
			&ccNames,
			&bccEmails,
			&email.Subject,
			&email.BodyHTML,
			&email.BodyText,
			&email.Snippet,
			&email.IsRead,
			&email.IsStarred,
			&email.IsImportant,
			&email.HasAttachments,
			&labels,
			&email.ReceivedAt,
			&email.SentAt,
			&email.CreatedAt,
			&email.UpdatedAt,
			&rank,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}

		email.References = references
		email.ToEmails = toEmails
		email.ToNames = toNames
		email.CcEmails = ccEmails
		email.CcNames = ccNames
		email.BccEmails = bccEmails
		email.Labels = labels

		emails = append(emails, email)
	}

	hasMore := offset+len(emails) < total
	nextOffset := offset + len(emails)

	return &EmailListResult{
		Emails:     emails,
		Total:      total,
		HasMore:    hasMore,
		NextOffset: nextOffset,
	}, nil
}
