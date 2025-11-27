package main

import (
	"time"
)

// =====================================================
// EXISTING MODELS
// =====================================================

// EmailTemplate represents an email template entity
type EmailTemplate struct {
	ID           string    `json:"id"`
	DealershipID string    `json:"dealership_id"`
	Name         string    `json:"name"`
	Subject      string    `json:"subject"`
	BodyHTML     string    `json:"body_html"`
	Variables    []string  `json:"variables"` // List of available variables like ["customer_name", "deal_amount"]
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// EmailLog represents an email sending log entry
type EmailLog struct {
	ID           string     `json:"id"`
	DealershipID string     `json:"dealership_id"`
	Recipient    string     `json:"recipient"`
	Subject      string     `json:"subject"`
	TemplateID   *string    `json:"template_id,omitempty"` // Optional template reference
	Status       string     `json:"status"`                // "pending", "sent", "failed"
	SentAt       *time.Time `json:"sent_at,omitempty"`
	Error        *string    `json:"error,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// =====================================================
// INBOX MODELS - Gmail/Outlook-like functionality
// =====================================================

// EmailFolder represents email folder/label types
type EmailFolder string

const (
	FolderInbox   EmailFolder = "inbox"
	FolderSent    EmailFolder = "sent"
	FolderDrafts  EmailFolder = "drafts"
	FolderTrash   EmailFolder = "trash"
	FolderSpam    EmailFolder = "spam"
	FolderArchive EmailFolder = "archive"
	FolderStarred EmailFolder = "starred"
)

// Email represents an email message in the inbox
type Email struct {
	ID             string       `json:"id"`
	DealershipID   string       `json:"dealership_id"`
	UserID         string       `json:"user_id"`     // User who owns this email
	ThreadID       string       `json:"thread_id"`   // Conversation thread
	MessageID      string       `json:"message_id"`  // RFC 5322 Message-ID
	InReplyTo      *string      `json:"in_reply_to"` // RFC 5322 In-Reply-To
	References     []string     `json:"references"`  // RFC 5322 References header
	Folder         EmailFolder  `json:"folder"`
	FromEmail      string       `json:"from_email"`
	FromName       string       `json:"from_name"`
	ToEmails       []string     `json:"to_emails"`
	ToNames        []string     `json:"to_names"`
	CcEmails       []string     `json:"cc_emails"`
	CcNames        []string     `json:"cc_names"`
	BccEmails      []string     `json:"bcc_emails"` // Only visible for sent emails
	Subject        string       `json:"subject"`
	BodyHTML       string       `json:"body_html"`
	BodyText       string       `json:"body_text"` // Plain text version
	Snippet        string       `json:"snippet"`   // First ~100 chars preview
	IsRead         bool         `json:"is_read"`
	IsStarred      bool         `json:"is_starred"`
	IsImportant    bool         `json:"is_important"`
	HasAttachments bool         `json:"has_attachments"`
	Labels         []string     `json:"labels"` // Custom labels
	ReceivedAt     time.Time    `json:"received_at"`
	SentAt         *time.Time   `json:"sent_at"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
	Attachments    []Attachment `json:"attachments,omitempty"`
}

// EmailThread represents a conversation thread
type EmailThread struct {
	ID             string      `json:"id"`
	DealershipID   string      `json:"dealership_id"`
	UserID         string      `json:"user_id"`
	Subject        string      `json:"subject"`
	Snippet        string      `json:"snippet"` // Preview of latest message
	Participants   []string    `json:"participants"`
	MessageCount   int         `json:"message_count"`
	UnreadCount    int         `json:"unread_count"`
	IsStarred      bool        `json:"is_starred"`
	IsImportant    bool        `json:"is_important"`
	HasAttachments bool        `json:"has_attachments"`
	Labels         []string    `json:"labels"`
	LastMessageAt  time.Time   `json:"last_message_at"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	Messages       []Email     `json:"messages,omitempty"` // Populated when fetching full thread
}

// EmailDraft represents a draft email
type EmailDraft struct {
	ID           string     `json:"id"`
	DealershipID string     `json:"dealership_id"`
	UserID       string     `json:"user_id"`
	ThreadID     *string    `json:"thread_id"` // If replying to a thread
	InReplyTo    *string    `json:"in_reply_to"`
	ToEmails     []string   `json:"to_emails"`
	ToNames      []string   `json:"to_names"`
	CcEmails     []string   `json:"cc_emails"`
	CcNames      []string   `json:"cc_names"`
	BccEmails    []string   `json:"bcc_emails"`
	BccNames     []string   `json:"bcc_names"`
	Subject      string     `json:"subject"`
	BodyHTML     string     `json:"body_html"`
	BodyText     string     `json:"body_text"`
	Attachments  []string   `json:"attachments"` // Attachment IDs
	ScheduledFor *time.Time `json:"scheduled_for"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// Attachment represents an email attachment
type Attachment struct {
	ID           string    `json:"id"`
	EmailID      *string   `json:"email_id"`   // Set when email is sent/received
	DraftID      *string   `json:"draft_id"`   // Set when attached to draft
	DealershipID string    `json:"dealership_id"`
	Filename     string    `json:"filename"`
	ContentType  string    `json:"content_type"`
	Size         int64     `json:"size"`
	S3Key        string    `json:"s3_key"`
	S3Bucket     string    `json:"s3_bucket"`
	DownloadURL  string    `json:"download_url,omitempty"` // Presigned URL
	CreatedAt    time.Time `json:"created_at"`
}

// EmailLabel represents a custom label
type EmailLabel struct {
	ID           string    `json:"id"`
	DealershipID string    `json:"dealership_id"`
	UserID       string    `json:"user_id"`
	Name         string    `json:"name"`
	Color        string    `json:"color"` // Hex color code
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// EmailSignature represents a user's email signature
type EmailSignature struct {
	ID           string    `json:"id"`
	DealershipID string    `json:"dealership_id"`
	UserID       string    `json:"user_id"`
	Name         string    `json:"name"`
	SignatureHTML string   `json:"signature_html"`
	IsDefault    bool      `json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// =====================================================
// FILTER AND LIST PARAMETERS
// =====================================================

// EmailListFilter represents filtering options for listing emails
type EmailListFilter struct {
	DealershipID string      `json:"dealership_id"`
	UserID       string      `json:"user_id"`
	Folder       EmailFolder `json:"folder"`
	Labels       []string    `json:"labels"`
	IsRead       *bool       `json:"is_read"`
	IsStarred    *bool       `json:"is_starred"`
	IsImportant  *bool       `json:"is_important"`
	HasAttachments *bool     `json:"has_attachments"`
	FromEmail    string      `json:"from_email"`
	ToEmail      string      `json:"to_email"`
	Subject      string      `json:"subject"` // Contains search
	Query        string      `json:"query"`   // Full-text search
	DateFrom     *time.Time  `json:"date_from"`
	DateTo       *time.Time  `json:"date_to"`
	Limit        int         `json:"limit"`
	Offset       int         `json:"offset"`
	SortBy       string      `json:"sort_by"`  // "received_at", "sent_at", "subject"
	SortOrder    string      `json:"sort_order"` // "asc", "desc"
}

// ThreadListFilter represents filtering options for listing threads
type ThreadListFilter struct {
	DealershipID string      `json:"dealership_id"`
	UserID       string      `json:"user_id"`
	Folder       EmailFolder `json:"folder"`
	Labels       []string    `json:"labels"`
	IsRead       *bool       `json:"is_read"` // Any unread in thread
	IsStarred    *bool       `json:"is_starred"`
	Query        string      `json:"query"`
	Limit        int         `json:"limit"`
	Offset       int         `json:"offset"`
}

// EmailListResult represents paginated email results
type EmailListResult struct {
	Emails     []*Email `json:"emails"`
	Total      int      `json:"total"`
	HasMore    bool     `json:"has_more"`
	NextOffset int      `json:"next_offset"`
}

// ThreadListResult represents paginated thread results
type ThreadListResult struct {
	Threads    []*EmailThread `json:"threads"`
	Total      int            `json:"total"`
	HasMore    bool           `json:"has_more"`
	NextOffset int            `json:"next_offset"`
}

// EmailStats represents email statistics for dashboard
type EmailStats struct {
	TotalInbox   int `json:"total_inbox"`
	UnreadInbox  int `json:"unread_inbox"`
	TotalSent    int `json:"total_sent"`
	TotalDrafts  int `json:"total_drafts"`
	TotalTrash   int `json:"total_trash"`
	TotalStarred int `json:"total_starred"`
}

// =====================================================
// DATABASE INTERFACE
// =====================================================

// EmailDatabase defines the interface for email data operations
type EmailDatabase interface {
	// Connection management
	Close() error
	InitSchema() error

	// Template operations
	CreateTemplate(template *EmailTemplate) error
	GetTemplate(id string, dealershipID string) (*EmailTemplate, error)
	ListTemplates(dealershipID string, limit int, offset int) ([]*EmailTemplate, error)
	UpdateTemplate(template *EmailTemplate) error
	DeleteTemplate(id string, dealershipID string) error

	// Email log operations
	CreateLog(log *EmailLog) error
	GetLog(id string, dealershipID string) (*EmailLog, error)
	ListLogs(dealershipID string, limit int, offset int) ([]*EmailLog, error)
	UpdateLogStatus(id string, status string, sentAt *time.Time, errorMsg *string) error

	// =====================================================
	// INBOX OPERATIONS
	// =====================================================

	// Email CRUD
	CreateEmail(email *Email) error
	GetEmail(id string, dealershipID string, userID string) (*Email, error)
	ListEmails(filter *EmailListFilter) (*EmailListResult, error)
	UpdateEmail(email *Email) error
	DeleteEmail(id string, dealershipID string, userID string, permanent bool) error
	BatchDeleteEmails(ids []string, dealershipID string, userID string, permanent bool) error

	// Email actions
	MarkAsRead(ids []string, dealershipID string, userID string) error
	MarkAsUnread(ids []string, dealershipID string, userID string) error
	ToggleStar(id string, dealershipID string, userID string) error
	ToggleImportant(id string, dealershipID string, userID string) error
	MoveToFolder(ids []string, dealershipID string, userID string, folder EmailFolder) error
	AddLabels(ids []string, dealershipID string, userID string, labels []string) error
	RemoveLabels(ids []string, dealershipID string, userID string, labels []string) error
	ArchiveEmails(ids []string, dealershipID string, userID string) error
	UnarchiveEmails(ids []string, dealershipID string, userID string) error

	// Thread operations
	GetThread(id string, dealershipID string, userID string) (*EmailThread, error)
	ListThreads(filter *ThreadListFilter) (*ThreadListResult, error)
	GetOrCreateThread(email *Email) (string, error)

	// Draft operations
	CreateDraft(draft *EmailDraft) error
	GetDraft(id string, dealershipID string, userID string) (*EmailDraft, error)
	ListDrafts(dealershipID string, userID string, limit int, offset int) ([]*EmailDraft, error)
	UpdateDraft(draft *EmailDraft) error
	DeleteDraft(id string, dealershipID string, userID string) error
	SendDraft(id string, dealershipID string, userID string) (*Email, error)

	// Attachment operations
	CreateAttachment(attachment *Attachment) error
	GetAttachment(id string, dealershipID string) (*Attachment, error)
	ListAttachmentsByEmail(emailID string) ([]*Attachment, error)
	ListAttachmentsByDraft(draftID string) ([]*Attachment, error)
	DeleteAttachment(id string, dealershipID string) error
	MoveAttachmentToEmail(attachmentID string, emailID string) error

	// Label operations
	CreateLabel(label *EmailLabel) error
	GetLabel(id string, dealershipID string, userID string) (*EmailLabel, error)
	ListLabels(dealershipID string, userID string) ([]*EmailLabel, error)
	UpdateLabel(label *EmailLabel) error
	DeleteLabel(id string, dealershipID string, userID string) error

	// Signature operations
	CreateSignature(signature *EmailSignature) error
	GetSignature(id string, dealershipID string, userID string) (*EmailSignature, error)
	ListSignatures(dealershipID string, userID string) ([]*EmailSignature, error)
	UpdateSignature(signature *EmailSignature) error
	DeleteSignature(id string, dealershipID string, userID string) error
	SetDefaultSignature(id string, dealershipID string, userID string) error

	// Statistics
	GetEmailStats(dealershipID string, userID string) (*EmailStats, error)

	// Search
	SearchEmails(dealershipID string, userID string, query string, limit int, offset int) (*EmailListResult, error)
}
