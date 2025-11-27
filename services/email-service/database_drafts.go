package main

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// =====================================================
// DRAFT OPERATIONS
// =====================================================

// CreateDraft creates a new draft email
func (p *PostgresEmailDatabase) CreateDraft(draft *EmailDraft) error {
	query := `
		INSERT INTO email_drafts (
			id, dealership_id, user_id, thread_id, in_reply_to, to_emails, to_names,
			cc_emails, cc_names, bcc_emails, bcc_names, subject, body_html, body_text,
			attachments, scheduled_for, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
	`

	_, err := p.db.Exec(query,
		draft.ID,
		draft.DealershipID,
		draft.UserID,
		draft.ThreadID,
		draft.InReplyTo,
		pq.Array(draft.ToEmails),
		pq.Array(draft.ToNames),
		pq.Array(draft.CcEmails),
		pq.Array(draft.CcNames),
		pq.Array(draft.BccEmails),
		pq.Array(draft.BccNames),
		draft.Subject,
		draft.BodyHTML,
		draft.BodyText,
		pq.Array(draft.Attachments),
		draft.ScheduledFor,
		draft.CreatedAt,
		draft.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create draft: %w", err)
	}

	return nil
}

// GetDraft retrieves a draft by ID
func (p *PostgresEmailDatabase) GetDraft(id string, dealershipID string, userID string) (*EmailDraft, error) {
	query := `
		SELECT id, dealership_id, user_id, thread_id, in_reply_to, to_emails, to_names,
			cc_emails, cc_names, bcc_emails, bcc_names, subject, body_html, body_text,
			attachments, scheduled_for, created_at, updated_at
		FROM email_drafts
		WHERE id = $1 AND dealership_id = $2 AND user_id = $3
	`

	draft := &EmailDraft{}
	var toEmails, toNames, ccEmails, ccNames, bccEmails, bccNames, attachments pq.StringArray

	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&draft.ID,
		&draft.DealershipID,
		&draft.UserID,
		&draft.ThreadID,
		&draft.InReplyTo,
		&toEmails,
		&toNames,
		&ccEmails,
		&ccNames,
		&bccEmails,
		&bccNames,
		&draft.Subject,
		&draft.BodyHTML,
		&draft.BodyText,
		&attachments,
		&draft.ScheduledFor,
		&draft.CreatedAt,
		&draft.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("draft not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get draft: %w", err)
	}

	draft.ToEmails = toEmails
	draft.ToNames = toNames
	draft.CcEmails = ccEmails
	draft.CcNames = ccNames
	draft.BccEmails = bccEmails
	draft.BccNames = bccNames
	draft.Attachments = attachments

	return draft, nil
}

// ListDrafts retrieves all drafts for a user
func (p *PostgresEmailDatabase) ListDrafts(dealershipID string, userID string, limit int, offset int) ([]*EmailDraft, error) {
	query := `
		SELECT id, dealership_id, user_id, thread_id, in_reply_to, to_emails, to_names,
			cc_emails, cc_names, bcc_emails, bcc_names, subject, body_html, body_text,
			attachments, scheduled_for, created_at, updated_at
		FROM email_drafts
		WHERE dealership_id = $1 AND user_id = $2
		ORDER BY updated_at DESC
		LIMIT $3 OFFSET $4
	`

	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := p.db.Query(query, dealershipID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list drafts: %w", err)
	}
	defer rows.Close()

	drafts := []*EmailDraft{}
	for rows.Next() {
		draft := &EmailDraft{}
		var toEmails, toNames, ccEmails, ccNames, bccEmails, bccNames, attachments pq.StringArray

		err := rows.Scan(
			&draft.ID,
			&draft.DealershipID,
			&draft.UserID,
			&draft.ThreadID,
			&draft.InReplyTo,
			&toEmails,
			&toNames,
			&ccEmails,
			&ccNames,
			&bccEmails,
			&bccNames,
			&draft.Subject,
			&draft.BodyHTML,
			&draft.BodyText,
			&attachments,
			&draft.ScheduledFor,
			&draft.CreatedAt,
			&draft.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan draft: %w", err)
		}

		draft.ToEmails = toEmails
		draft.ToNames = toNames
		draft.CcEmails = ccEmails
		draft.CcNames = ccNames
		draft.BccEmails = bccEmails
		draft.BccNames = bccNames
		draft.Attachments = attachments

		drafts = append(drafts, draft)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating drafts: %w", err)
	}

	return drafts, nil
}

// UpdateDraft updates an existing draft
func (p *PostgresEmailDatabase) UpdateDraft(draft *EmailDraft) error {
	query := `
		UPDATE email_drafts SET
			thread_id = $1, in_reply_to = $2, to_emails = $3, to_names = $4,
			cc_emails = $5, cc_names = $6, bcc_emails = $7, bcc_names = $8,
			subject = $9, body_html = $10, body_text = $11, attachments = $12,
			scheduled_for = $13, updated_at = $14
		WHERE id = $15 AND dealership_id = $16 AND user_id = $17
	`

	result, err := p.db.Exec(query,
		draft.ThreadID,
		draft.InReplyTo,
		pq.Array(draft.ToEmails),
		pq.Array(draft.ToNames),
		pq.Array(draft.CcEmails),
		pq.Array(draft.CcNames),
		pq.Array(draft.BccEmails),
		pq.Array(draft.BccNames),
		draft.Subject,
		draft.BodyHTML,
		draft.BodyText,
		pq.Array(draft.Attachments),
		draft.ScheduledFor,
		time.Now(),
		draft.ID,
		draft.DealershipID,
		draft.UserID,
	)

	if err != nil {
		return fmt.Errorf("failed to update draft: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("draft not found")
	}

	return nil
}

// DeleteDraft deletes a draft
func (p *PostgresEmailDatabase) DeleteDraft(id string, dealershipID string, userID string) error {
	// First delete associated attachments
	attachQuery := `DELETE FROM email_attachments WHERE draft_id = $1 AND dealership_id = $2`
	_, err := p.db.Exec(attachQuery, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to delete draft attachments: %w", err)
	}

	// Then delete the draft
	query := `DELETE FROM email_drafts WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete draft: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("draft not found")
	}

	return nil
}

// SendDraft converts a draft to an email and sends it
// Note: This method creates the email record. The actual sending should be handled by the caller
func (p *PostgresEmailDatabase) SendDraft(id string, dealershipID string, userID string) (*Email, error) {
	// Get the draft
	draft, err := p.GetDraft(id, dealershipID, userID)
	if err != nil {
		return nil, err
	}

	// Generate email ID and message ID
	emailID := generateUUID()
	messageID := fmt.Sprintf("<%s@autolytiq.com>", emailID)

	// Create snippet
	snippet := draft.BodyText
	if len(snippet) > 100 {
		snippet = snippet[:100] + "..."
	}

	// Get or create thread
	email := &Email{
		ID:           emailID,
		DealershipID: dealershipID,
		UserID:       userID,
		MessageID:    messageID,
		InReplyTo:    draft.InReplyTo,
		Folder:       FolderSent,
		FromEmail:    "", // Will be set by caller with user's email
		FromName:     "", // Will be set by caller
		ToEmails:     draft.ToEmails,
		ToNames:      draft.ToNames,
		CcEmails:     draft.CcEmails,
		CcNames:      draft.CcNames,
		BccEmails:    draft.BccEmails,
		Subject:      draft.Subject,
		BodyHTML:     draft.BodyHTML,
		BodyText:     draft.BodyText,
		Snippet:      snippet,
		IsRead:       true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		ReceivedAt:   time.Now(),
	}

	// Get or create thread
	if draft.ThreadID != nil && *draft.ThreadID != "" {
		email.ThreadID = *draft.ThreadID
	} else {
		threadID, err := p.GetOrCreateThread(email)
		if err != nil {
			return nil, fmt.Errorf("failed to get/create thread: %w", err)
		}
		email.ThreadID = threadID
	}

	// Check if has attachments
	attachments, err := p.ListAttachmentsByDraft(id)
	if err == nil && len(attachments) > 0 {
		email.HasAttachments = true
	}

	// Create the email
	if err := p.CreateEmail(email); err != nil {
		return nil, fmt.Errorf("failed to create email from draft: %w", err)
	}

	// Move attachments from draft to email
	for _, attach := range attachments {
		if err := p.MoveAttachmentToEmail(attach.ID, emailID); err != nil {
			// Log but don't fail
			continue
		}
	}

	// Delete the draft
	if err := p.DeleteDraft(id, dealershipID, userID); err != nil {
		// Log but don't fail - email was created
		return email, nil
	}

	return email, nil
}

// =====================================================
// ATTACHMENT OPERATIONS
// =====================================================

// CreateAttachment creates a new attachment record
func (p *PostgresEmailDatabase) CreateAttachment(attachment *Attachment) error {
	query := `
		INSERT INTO email_attachments (
			id, email_id, draft_id, dealership_id, filename, content_type, size,
			s3_key, s3_bucket, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := p.db.Exec(query,
		attachment.ID,
		attachment.EmailID,
		attachment.DraftID,
		attachment.DealershipID,
		attachment.Filename,
		attachment.ContentType,
		attachment.Size,
		attachment.S3Key,
		attachment.S3Bucket,
		attachment.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create attachment: %w", err)
	}

	return nil
}

// GetAttachment retrieves an attachment by ID
func (p *PostgresEmailDatabase) GetAttachment(id string, dealershipID string) (*Attachment, error) {
	query := `
		SELECT id, email_id, draft_id, dealership_id, filename, content_type, size,
			s3_key, s3_bucket, created_at
		FROM email_attachments
		WHERE id = $1 AND dealership_id = $2
	`

	attachment := &Attachment{}

	err := p.db.QueryRow(query, id, dealershipID).Scan(
		&attachment.ID,
		&attachment.EmailID,
		&attachment.DraftID,
		&attachment.DealershipID,
		&attachment.Filename,
		&attachment.ContentType,
		&attachment.Size,
		&attachment.S3Key,
		&attachment.S3Bucket,
		&attachment.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("attachment not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get attachment: %w", err)
	}

	return attachment, nil
}

// ListAttachmentsByEmail retrieves all attachments for an email
func (p *PostgresEmailDatabase) ListAttachmentsByEmail(emailID string) ([]*Attachment, error) {
	query := `
		SELECT id, email_id, draft_id, dealership_id, filename, content_type, size,
			s3_key, s3_bucket, created_at
		FROM email_attachments
		WHERE email_id = $1
		ORDER BY created_at ASC
	`

	rows, err := p.db.Query(query, emailID)
	if err != nil {
		return nil, fmt.Errorf("failed to list attachments: %w", err)
	}
	defer rows.Close()

	attachments := []*Attachment{}
	for rows.Next() {
		attachment := &Attachment{}
		err := rows.Scan(
			&attachment.ID,
			&attachment.EmailID,
			&attachment.DraftID,
			&attachment.DealershipID,
			&attachment.Filename,
			&attachment.ContentType,
			&attachment.Size,
			&attachment.S3Key,
			&attachment.S3Bucket,
			&attachment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan attachment: %w", err)
		}
		attachments = append(attachments, attachment)
	}

	return attachments, nil
}

// ListAttachmentsByDraft retrieves all attachments for a draft
func (p *PostgresEmailDatabase) ListAttachmentsByDraft(draftID string) ([]*Attachment, error) {
	query := `
		SELECT id, email_id, draft_id, dealership_id, filename, content_type, size,
			s3_key, s3_bucket, created_at
		FROM email_attachments
		WHERE draft_id = $1
		ORDER BY created_at ASC
	`

	rows, err := p.db.Query(query, draftID)
	if err != nil {
		return nil, fmt.Errorf("failed to list attachments: %w", err)
	}
	defer rows.Close()

	attachments := []*Attachment{}
	for rows.Next() {
		attachment := &Attachment{}
		err := rows.Scan(
			&attachment.ID,
			&attachment.EmailID,
			&attachment.DraftID,
			&attachment.DealershipID,
			&attachment.Filename,
			&attachment.ContentType,
			&attachment.Size,
			&attachment.S3Key,
			&attachment.S3Bucket,
			&attachment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan attachment: %w", err)
		}
		attachments = append(attachments, attachment)
	}

	return attachments, nil
}

// DeleteAttachment deletes an attachment
func (p *PostgresEmailDatabase) DeleteAttachment(id string, dealershipID string) error {
	query := `DELETE FROM email_attachments WHERE id = $1 AND dealership_id = $2`
	result, err := p.db.Exec(query, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to delete attachment: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("attachment not found")
	}

	return nil
}

// MoveAttachmentToEmail moves an attachment from a draft to an email
func (p *PostgresEmailDatabase) MoveAttachmentToEmail(attachmentID string, emailID string) error {
	query := `UPDATE email_attachments SET email_id = $1, draft_id = NULL WHERE id = $2`
	_, err := p.db.Exec(query, emailID, attachmentID)
	return err
}

// =====================================================
// LABEL OPERATIONS
// =====================================================

// CreateLabel creates a new custom label
func (p *PostgresEmailDatabase) CreateLabel(label *EmailLabel) error {
	query := `
		INSERT INTO email_labels (id, dealership_id, user_id, name, color, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := p.db.Exec(query,
		label.ID,
		label.DealershipID,
		label.UserID,
		label.Name,
		label.Color,
		label.CreatedAt,
		label.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create label: %w", err)
	}

	return nil
}

// GetLabel retrieves a label by ID
func (p *PostgresEmailDatabase) GetLabel(id string, dealershipID string, userID string) (*EmailLabel, error) {
	query := `
		SELECT id, dealership_id, user_id, name, color, created_at, updated_at
		FROM email_labels
		WHERE id = $1 AND dealership_id = $2 AND user_id = $3
	`

	label := &EmailLabel{}

	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&label.ID,
		&label.DealershipID,
		&label.UserID,
		&label.Name,
		&label.Color,
		&label.CreatedAt,
		&label.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("label not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get label: %w", err)
	}

	return label, nil
}

// ListLabels retrieves all labels for a user
func (p *PostgresEmailDatabase) ListLabels(dealershipID string, userID string) ([]*EmailLabel, error) {
	query := `
		SELECT id, dealership_id, user_id, name, color, created_at, updated_at
		FROM email_labels
		WHERE dealership_id = $1 AND user_id = $2
		ORDER BY name ASC
	`

	rows, err := p.db.Query(query, dealershipID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list labels: %w", err)
	}
	defer rows.Close()

	labels := []*EmailLabel{}
	for rows.Next() {
		label := &EmailLabel{}
		err := rows.Scan(
			&label.ID,
			&label.DealershipID,
			&label.UserID,
			&label.Name,
			&label.Color,
			&label.CreatedAt,
			&label.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan label: %w", err)
		}
		labels = append(labels, label)
	}

	return labels, nil
}

// UpdateLabel updates a label
func (p *PostgresEmailDatabase) UpdateLabel(label *EmailLabel) error {
	query := `
		UPDATE email_labels SET name = $1, color = $2, updated_at = $3
		WHERE id = $4 AND dealership_id = $5 AND user_id = $6
	`

	result, err := p.db.Exec(query,
		label.Name,
		label.Color,
		time.Now(),
		label.ID,
		label.DealershipID,
		label.UserID,
	)

	if err != nil {
		return fmt.Errorf("failed to update label: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("label not found")
	}

	return nil
}

// DeleteLabel deletes a label
func (p *PostgresEmailDatabase) DeleteLabel(id string, dealershipID string, userID string) error {
	query := `DELETE FROM email_labels WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete label: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("label not found")
	}

	return nil
}

// =====================================================
// SIGNATURE OPERATIONS
// =====================================================

// CreateSignature creates a new email signature
func (p *PostgresEmailDatabase) CreateSignature(signature *EmailSignature) error {
	query := `
		INSERT INTO email_signatures (id, dealership_id, user_id, name, signature_html, is_default, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := p.db.Exec(query,
		signature.ID,
		signature.DealershipID,
		signature.UserID,
		signature.Name,
		signature.SignatureHTML,
		signature.IsDefault,
		signature.CreatedAt,
		signature.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create signature: %w", err)
	}

	return nil
}

// GetSignature retrieves a signature by ID
func (p *PostgresEmailDatabase) GetSignature(id string, dealershipID string, userID string) (*EmailSignature, error) {
	query := `
		SELECT id, dealership_id, user_id, name, signature_html, is_default, created_at, updated_at
		FROM email_signatures
		WHERE id = $1 AND dealership_id = $2 AND user_id = $3
	`

	signature := &EmailSignature{}

	err := p.db.QueryRow(query, id, dealershipID, userID).Scan(
		&signature.ID,
		&signature.DealershipID,
		&signature.UserID,
		&signature.Name,
		&signature.SignatureHTML,
		&signature.IsDefault,
		&signature.CreatedAt,
		&signature.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("signature not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get signature: %w", err)
	}

	return signature, nil
}

// ListSignatures retrieves all signatures for a user
func (p *PostgresEmailDatabase) ListSignatures(dealershipID string, userID string) ([]*EmailSignature, error) {
	query := `
		SELECT id, dealership_id, user_id, name, signature_html, is_default, created_at, updated_at
		FROM email_signatures
		WHERE dealership_id = $1 AND user_id = $2
		ORDER BY is_default DESC, name ASC
	`

	rows, err := p.db.Query(query, dealershipID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list signatures: %w", err)
	}
	defer rows.Close()

	signatures := []*EmailSignature{}
	for rows.Next() {
		signature := &EmailSignature{}
		err := rows.Scan(
			&signature.ID,
			&signature.DealershipID,
			&signature.UserID,
			&signature.Name,
			&signature.SignatureHTML,
			&signature.IsDefault,
			&signature.CreatedAt,
			&signature.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan signature: %w", err)
		}
		signatures = append(signatures, signature)
	}

	return signatures, nil
}

// UpdateSignature updates a signature
func (p *PostgresEmailDatabase) UpdateSignature(signature *EmailSignature) error {
	query := `
		UPDATE email_signatures SET name = $1, signature_html = $2, is_default = $3, updated_at = $4
		WHERE id = $5 AND dealership_id = $6 AND user_id = $7
	`

	result, err := p.db.Exec(query,
		signature.Name,
		signature.SignatureHTML,
		signature.IsDefault,
		time.Now(),
		signature.ID,
		signature.DealershipID,
		signature.UserID,
	)

	if err != nil {
		return fmt.Errorf("failed to update signature: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("signature not found")
	}

	return nil
}

// DeleteSignature deletes a signature
func (p *PostgresEmailDatabase) DeleteSignature(id string, dealershipID string, userID string) error {
	query := `DELETE FROM email_signatures WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(query, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete signature: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("signature not found")
	}

	return nil
}

// SetDefaultSignature sets a signature as default (and unsets others)
func (p *PostgresEmailDatabase) SetDefaultSignature(id string, dealershipID string, userID string) error {
	// First unset all defaults for this user
	unsetQuery := `UPDATE email_signatures SET is_default = FALSE WHERE dealership_id = $1 AND user_id = $2`
	_, err := p.db.Exec(unsetQuery, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to unset defaults: %w", err)
	}

	// Set the new default
	setQuery := `UPDATE email_signatures SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND dealership_id = $2 AND user_id = $3`
	result, err := p.db.Exec(setQuery, id, dealershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to set default: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("signature not found")
	}

	return nil
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// generateUUID generates a new UUID using google/uuid
func generateUUID() string {
	return uuid.New().String()
}
