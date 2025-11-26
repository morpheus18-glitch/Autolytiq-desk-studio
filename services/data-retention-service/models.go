package main

import (
	"time"
)

// GDPRRequest represents a GDPR data subject request
type GDPRRequest struct {
	ID           string     `json:"id"`
	CustomerID   string     `json:"customer_id"`
	DealershipID string     `json:"dealership_id"`
	RequestType  string     `json:"request_type"` // export, delete, anonymize
	Status       string     `json:"status"`       // pending, processing, completed, failed
	RequestedBy  string     `json:"requested_by"`
	Reason       string     `json:"reason,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	ProcessedAt  *time.Time `json:"processed_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CustomerConsent represents customer consent preferences
type CustomerConsent struct {
	ID                string    `json:"id"`
	CustomerID        string    `json:"customer_id"`
	DealershipID      string    `json:"dealership_id"`
	MarketingEmail    bool      `json:"marketing_email"`
	MarketingSMS      bool      `json:"marketing_sms"`
	MarketingPhone    bool      `json:"marketing_phone"`
	DataProcessing    bool      `json:"data_processing"`
	ThirdPartySharing bool      `json:"third_party_sharing"`
	Analytics         bool      `json:"analytics"`
	ConsentVersion    string    `json:"consent_version"`
	IPAddress         string    `json:"ip_address,omitempty"`
	UserAgent         string    `json:"user_agent,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ConsentUpdate represents a request to update consent
type ConsentUpdate struct {
	CustomerID        string `json:"customer_id"`
	DealershipID      string `json:"dealership_id"`
	MarketingEmail    *bool  `json:"marketing_email,omitempty"`
	MarketingSMS      *bool  `json:"marketing_sms,omitempty"`
	MarketingPhone    *bool  `json:"marketing_phone,omitempty"`
	DataProcessing    *bool  `json:"data_processing,omitempty"`
	ThirdPartySharing *bool  `json:"third_party_sharing,omitempty"`
	Analytics         *bool  `json:"analytics,omitempty"`
	UpdatedBy         string `json:"updated_by,omitempty"`
	IPAddress         string `json:"ip_address,omitempty"`
	UserAgent         string `json:"user_agent,omitempty"`
}

// ConsentHistory represents a consent change record
type ConsentHistory struct {
	ID           string    `json:"id"`
	CustomerID   string    `json:"customer_id"`
	DealershipID string    `json:"dealership_id"`
	ConsentType  string    `json:"consent_type"`
	OldValue     *bool     `json:"old_value,omitempty"`
	NewValue     bool      `json:"new_value"`
	ChangedBy    string    `json:"changed_by,omitempty"`
	IPAddress    string    `json:"ip_address,omitempty"`
	UserAgent    string    `json:"user_agent,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// RetentionPolicy defines data retention rules
type RetentionPolicy struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	EntityType    string    `json:"entity_type"`
	RetentionDays int       `json:"retention_days"`
	Action        string    `json:"action"` // delete, anonymize, archive
	Description   string    `json:"description,omitempty"`
	IsActive      bool      `json:"is_active"`
	LegalBasis    string    `json:"legal_basis,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// AuditLog represents a data operation audit entry
type AuditLog struct {
	ID           string                 `json:"id"`
	DealershipID string                 `json:"dealership_id,omitempty"`
	EntityType   string                 `json:"entity_type"`
	EntityID     string                 `json:"entity_id"`
	Action       string                 `json:"action"` // create, read, update, delete, export, anonymize
	PerformedBy  string                 `json:"performed_by"`
	IPAddress    string                 `json:"ip_address,omitempty"`
	OldData      map[string]interface{} `json:"old_data,omitempty"`
	NewData      map[string]interface{} `json:"new_data,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

// CustomerExportData represents all data associated with a customer for GDPR export
type CustomerExportData struct {
	ExportedAt     time.Time           `json:"exported_at"`
	CustomerID     string              `json:"customer_id"`
	Customer       CustomerData        `json:"customer"`
	Deals          []DealData          `json:"deals,omitempty"`
	ShowroomVisits []ShowroomVisitData `json:"showroom_visits,omitempty"`
	EmailLogs      []EmailLogData      `json:"email_logs,omitempty"`
	Consent        *CustomerConsent    `json:"consent,omitempty"`
}

// CustomerData represents customer personal data
type CustomerData struct {
	ID             string     `json:"id"`
	DealershipID   string     `json:"dealership_id"`
	FirstName      string     `json:"first_name"`
	LastName       string     `json:"last_name"`
	Email          string     `json:"email"`
	Phone          string     `json:"phone"`
	Address        string     `json:"address"`
	City           string     `json:"city"`
	State          string     `json:"state"`
	ZipCode        string     `json:"zip_code"`
	CreditScore    *int       `json:"credit_score,omitempty"`
	Notes          string     `json:"notes,omitempty"`
	Source         string     `json:"source,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	LastActivityAt *time.Time `json:"last_activity_at,omitempty"`
}

// DealData represents deal data for export
type DealData struct {
	ID             string    `json:"id"`
	VehicleID      string    `json:"vehicle_id"`
	Type           string    `json:"type"`
	Status         string    `json:"status"`
	SalePrice      float64   `json:"sale_price"`
	TradeInValue   float64   `json:"trade_in_value,omitempty"`
	DownPayment    float64   `json:"down_payment,omitempty"`
	FinancingTerm  int       `json:"financing_term,omitempty"`
	InterestRate   float64   `json:"interest_rate,omitempty"`
	MonthlyPayment float64   `json:"monthly_payment,omitempty"`
	Taxes          float64   `json:"taxes,omitempty"`
	Fees           float64   `json:"fees,omitempty"`
	TotalPrice     float64   `json:"total_price,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// ShowroomVisitData represents showroom visit data for export
type ShowroomVisitData struct {
	ID           string     `json:"id"`
	SalespersonID string    `json:"salesperson_id,omitempty"`
	VehicleID    string     `json:"vehicle_id,omitempty"`
	CheckInTime  time.Time  `json:"check_in_time"`
	CheckOutTime *time.Time `json:"check_out_time,omitempty"`
	Status       string     `json:"status"`
	Source       string     `json:"source,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// EmailLogData represents email log data for export
type EmailLogData struct {
	ID        string     `json:"id"`
	Subject   string     `json:"subject"`
	Status    string     `json:"status"`
	SentAt    *time.Time `json:"sent_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// DeletionResult represents the result of a deletion operation
type DeletionResult struct {
	CustomerDeleted     bool  `json:"customer_deleted"`
	DealsDeleted        int64 `json:"deals_deleted"`
	VisitsDeleted       int64 `json:"visits_deleted"`
	EmailsDeleted       int64 `json:"emails_deleted"`
	RetainedForLegal    bool  `json:"retained_for_legal"`
	RetentionExpiresAt  *time.Time `json:"retention_expires_at,omitempty"`
}

// AnonymizationResult represents the result of an anonymization operation
type AnonymizationResult struct {
	CustomerAnonymized bool   `json:"customer_anonymized"`
	FieldsAnonymized   []string `json:"fields_anonymized"`
	AnonymizedAt       time.Time `json:"anonymized_at"`
}

// RetentionStatus represents the current retention status
type RetentionStatus struct {
	Policies             []*RetentionPolicy `json:"policies"`
	Stats                *RetentionStats    `json:"stats"`
	LastCleanupRun       *time.Time         `json:"last_cleanup_run,omitempty"`
	NextScheduledCleanup *time.Time         `json:"next_scheduled_cleanup,omitempty"`
}

// RetentionStats represents retention statistics
type RetentionStats struct {
	ActiveCustomers      int `json:"active_customers"`
	DeletedCustomers     int `json:"deleted_customers"`
	AnonymizedCustomers  int `json:"anonymized_customers"`
	PendingGDPRRequests  int `json:"pending_gdpr_requests"`
	ExpiringWithin30Days int `json:"expiring_within_30_days"`
}

// CustomerRetentionStatus represents retention status for a specific customer
type CustomerRetentionStatus struct {
	CustomerID         string     `json:"customer_id"`
	IsActive           bool       `json:"is_active"`
	IsDeleted          bool       `json:"is_deleted"`
	IsAnonymized       bool       `json:"is_anonymized"`
	LastActivityAt     *time.Time `json:"last_activity_at,omitempty"`
	RetentionExpiresAt *time.Time `json:"retention_expires_at,omitempty"`
	DaysUntilExpiry    int        `json:"days_until_expiry,omitempty"`
	ApplicablePolicy   *RetentionPolicy `json:"applicable_policy,omitempty"`
}

// CleanupResult represents the result of a retention cleanup job
type CleanupResult struct {
	StartedAt          time.Time `json:"started_at"`
	CompletedAt        time.Time `json:"completed_at"`
	CustomersProcessed int       `json:"customers_processed"`
	CustomersDeleted   int       `json:"customers_deleted"`
	CustomersAnonymized int      `json:"customers_anonymized"`
	Errors             []string  `json:"errors,omitempty"`
}

// AnonymizationJobResult represents the result of a batch anonymization job
type AnonymizationJobResult struct {
	StartedAt      time.Time `json:"started_at"`
	CompletedAt    time.Time `json:"completed_at"`
	RecordsChecked int       `json:"records_checked"`
	RecordsAnonymized int    `json:"records_anonymized"`
	Errors         []string  `json:"errors,omitempty"`
}

// RetentionReport represents a monthly retention report
type RetentionReport struct {
	GeneratedAt          time.Time         `json:"generated_at"`
	ReportPeriod         string            `json:"report_period"`
	DealershipID         string            `json:"dealership_id,omitempty"`
	Summary              *RetentionStats   `json:"summary"`
	GDPRRequestsSummary  *GDPRRequestsSummary `json:"gdpr_requests_summary"`
	ConsentSummary       *ConsentSummary   `json:"consent_summary"`
	DataCategories       []DataCategorySummary `json:"data_categories"`
	Recommendations      []string          `json:"recommendations,omitempty"`
}

// GDPRRequestsSummary represents a summary of GDPR requests
type GDPRRequestsSummary struct {
	TotalRequests     int            `json:"total_requests"`
	ByType            map[string]int `json:"by_type"`
	ByStatus          map[string]int `json:"by_status"`
	AverageProcessingTime string     `json:"average_processing_time"`
}

// ConsentSummary represents a summary of consent data
type ConsentSummary struct {
	TotalCustomers        int     `json:"total_customers"`
	MarketingEmailOptIn   int     `json:"marketing_email_opt_in"`
	MarketingSMSOptIn     int     `json:"marketing_sms_opt_in"`
	MarketingPhoneOptIn   int     `json:"marketing_phone_opt_in"`
	ThirdPartySharingOptIn int    `json:"third_party_sharing_opt_in"`
	OptInPercentage       float64 `json:"opt_in_percentage"`
}

// DataCategorySummary represents retention summary for a data category
type DataCategorySummary struct {
	Category           string `json:"category"`
	TotalRecords       int    `json:"total_records"`
	ActiveRecords      int    `json:"active_records"`
	DeletedRecords     int    `json:"deleted_records"`
	AnonymizedRecords  int    `json:"anonymized_records"`
	RetentionPolicy    string `json:"retention_policy"`
	RetentionPeriod    string `json:"retention_period"`
}
