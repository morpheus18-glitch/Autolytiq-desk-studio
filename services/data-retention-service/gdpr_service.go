package main

import (
	"context"
	"fmt"
	"time"

	"autolytiq/services/shared/logging"
)

// GDPRService handles GDPR data subject rights operations
type GDPRService struct {
	db     *Database
	logger *logging.Logger
	config *Config
}

// NewGDPRService creates a new GDPR service
func NewGDPRService(db *Database, logger *logging.Logger, config *Config) *GDPRService {
	return &GDPRService{
		db:     db,
		logger: logger,
		config: config,
	}
}

// CreateExportRequest creates a GDPR export request
func (s *GDPRService) CreateExportRequest(ctx context.Context, customerID, dealershipID, requestedBy string) (*GDPRRequest, error) {
	request := &GDPRRequest{
		CustomerID:   customerID,
		DealershipID: dealershipID,
		RequestType:  "export",
		Status:       "pending",
		RequestedBy:  requestedBy,
		Reason:       "Data subject access request",
	}

	if err := s.db.CreateGDPRRequest(ctx, request); err != nil {
		return nil, fmt.Errorf("failed to create export request: %w", err)
	}

	// Log audit trail
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "customer",
		EntityID:     customerID,
		Action:       "gdpr_export_request",
		PerformedBy:  requestedBy,
		Metadata: map[string]interface{}{
			"request_id": request.ID,
		},
	})

	return request, nil
}

// CreateDeletionRequest creates a GDPR deletion request
func (s *GDPRService) CreateDeletionRequest(ctx context.Context, customerID, dealershipID, requestedBy, reason string) (*GDPRRequest, error) {
	request := &GDPRRequest{
		CustomerID:   customerID,
		DealershipID: dealershipID,
		RequestType:  "delete",
		Status:       "pending",
		RequestedBy:  requestedBy,
		Reason:       reason,
	}

	if err := s.db.CreateGDPRRequest(ctx, request); err != nil {
		return nil, fmt.Errorf("failed to create deletion request: %w", err)
	}

	// Log audit trail
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "customer",
		EntityID:     customerID,
		Action:       "gdpr_deletion_request",
		PerformedBy:  requestedBy,
		Metadata: map[string]interface{}{
			"request_id": request.ID,
			"reason":     reason,
		},
	})

	return request, nil
}

// ExportCustomerData exports all customer data (right to access)
func (s *GDPRService) ExportCustomerData(ctx context.Context, customerID, dealershipID string) (*CustomerExportData, error) {
	// Get all customer data
	exportData, err := s.db.GetCustomerWithRelatedData(ctx, customerID, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to export customer data: %w", err)
	}

	// Log the export
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "customer",
		EntityID:     customerID,
		Action:       "data_export",
		PerformedBy:  "system",
		Metadata: map[string]interface{}{
			"export_type":       "full",
			"deals_count":       len(exportData.Deals),
			"visits_count":      len(exportData.ShowroomVisits),
			"email_logs_count":  len(exportData.EmailLogs),
		},
	})

	s.logger.WithField("customer_id", customerID).Info("Customer data exported")

	return exportData, nil
}

// DeleteCustomerData deletes customer data (right to erasure)
func (s *GDPRService) DeleteCustomerData(ctx context.Context, customerID, dealershipID string, retainForLegal bool) (*DeletionResult, error) {
	result := &DeletionResult{}

	// Get current customer data for audit log
	existingData, err := s.db.GetCustomerWithRelatedData(ctx, customerID, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer data: %w", err)
	}

	// If retaining for legal compliance, mark for deletion but don't actually delete
	if retainForLegal {
		// Get retention policy
		policy, err := s.db.GetRetentionPolicyByEntityType(ctx, "customer")
		if err != nil {
			// Default to 7 years if no policy
			policy = &RetentionPolicy{RetentionDays: 2555}
		}

		// Calculate retention expiry
		expiryDate := time.Now().AddDate(0, 0, policy.RetentionDays)
		result.RetentionExpiresAt = &expiryDate
		result.RetainedForLegal = true

		// Soft delete customer
		if err := s.db.SoftDeleteCustomer(ctx, customerID, dealershipID); err != nil {
			return nil, fmt.Errorf("failed to soft delete customer: %w", err)
		}
		result.CustomerDeleted = true

		// Soft delete related data
		result.DealsDeleted, _ = s.db.SoftDeleteCustomerDeals(ctx, customerID, dealershipID)
		result.VisitsDeleted, _ = s.db.SoftDeleteCustomerVisits(ctx, customerID, dealershipID)
		result.EmailsDeleted, _ = s.db.SoftDeleteCustomerEmails(ctx, customerID, dealershipID)

	} else {
		// Full deletion (anonymization since we need to maintain referential integrity)
		if err := s.db.AnonymizeCustomer(ctx, customerID, dealershipID); err != nil {
			return nil, fmt.Errorf("failed to anonymize customer: %w", err)
		}
		result.CustomerDeleted = true

		// Soft delete related data
		result.DealsDeleted, _ = s.db.SoftDeleteCustomerDeals(ctx, customerID, dealershipID)
		result.VisitsDeleted, _ = s.db.SoftDeleteCustomerVisits(ctx, customerID, dealershipID)
		result.EmailsDeleted, _ = s.db.SoftDeleteCustomerEmails(ctx, customerID, dealershipID)
	}

	// Delete consent records
	// Note: We keep consent history for audit purposes

	// Log the deletion
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "customer",
		EntityID:     customerID,
		Action:       "data_deletion",
		PerformedBy:  "system",
		OldData: map[string]interface{}{
			"customer":  existingData.Customer,
			"deals":     len(existingData.Deals),
			"visits":    len(existingData.ShowroomVisits),
			"emails":    len(existingData.EmailLogs),
		},
		Metadata: map[string]interface{}{
			"retain_for_legal":   retainForLegal,
			"deals_deleted":      result.DealsDeleted,
			"visits_deleted":     result.VisitsDeleted,
			"emails_deleted":     result.EmailsDeleted,
		},
	})

	s.logger.WithField("customer_id", customerID).
		WithField("retain_for_legal", retainForLegal).
		Info("Customer data deleted")

	return result, nil
}

// AnonymizeCustomerData anonymizes customer PII
func (s *GDPRService) AnonymizeCustomerData(ctx context.Context, customerID, dealershipID, requestedBy string) (*AnonymizationResult, error) {
	result := &AnonymizationResult{
		AnonymizedAt: time.Now(),
		FieldsAnonymized: []string{
			"first_name",
			"last_name",
			"email",
			"phone",
			"address",
			"city",
			"zip_code",
			"credit_score",
			"ssn_last4",
			"drivers_license_number",
			"monthly_income",
			"notes",
		},
	}

	// Get current data for audit
	existingData, err := s.db.GetCustomerWithRelatedData(ctx, customerID, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer data: %w", err)
	}

	// Anonymize customer
	if err := s.db.AnonymizeCustomer(ctx, customerID, dealershipID); err != nil {
		return nil, fmt.Errorf("failed to anonymize customer: %w", err)
	}
	result.CustomerAnonymized = true

	// Create GDPR request record
	request := &GDPRRequest{
		CustomerID:   customerID,
		DealershipID: dealershipID,
		RequestType:  "anonymize",
		Status:       "completed",
		RequestedBy:  requestedBy,
		Reason:       "Data anonymization request",
	}
	request.ProcessedAt = &result.AnonymizedAt
	s.db.CreateGDPRRequest(ctx, request)

	// Log audit trail
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "customer",
		EntityID:     customerID,
		Action:       "data_anonymization",
		PerformedBy:  requestedBy,
		OldData: map[string]interface{}{
			"first_name": existingData.Customer.FirstName,
			"last_name":  existingData.Customer.LastName,
			"email":      existingData.Customer.Email,
			"phone":      existingData.Customer.Phone,
		},
		NewData: map[string]interface{}{
			"first_name": "ANONYMIZED",
			"last_name":  "ANONYMIZED",
			"email":      fmt.Sprintf("anonymized_%s@deleted.local", customerID),
			"phone":      "ANONYMIZED",
		},
		Metadata: map[string]interface{}{
			"fields_anonymized": result.FieldsAnonymized,
		},
	})

	s.logger.WithField("customer_id", customerID).Info("Customer data anonymized")

	return result, nil
}

// ListRequests lists GDPR requests
func (s *GDPRService) ListRequests(ctx context.Context, dealershipID, requestType, status string) ([]*GDPRRequest, error) {
	return s.db.ListGDPRRequests(ctx, dealershipID, requestType, status)
}

// GetRequest gets a specific GDPR request
func (s *GDPRService) GetRequest(ctx context.Context, requestID string) (*GDPRRequest, error) {
	return s.db.GetGDPRRequest(ctx, requestID)
}

// UpdateRequestStatus updates the status of a GDPR request
func (s *GDPRService) UpdateRequestStatus(ctx context.Context, requestID, status, notes string) error {
	return s.db.UpdateGDPRRequestStatus(ctx, requestID, status, notes)
}

// RunAnonymizationJob runs the scheduled anonymization job
func (s *GDPRService) RunAnonymizationJob(ctx context.Context) (*AnonymizationJobResult, error) {
	result := &AnonymizationJobResult{
		StartedAt: time.Now(),
		Errors:    []string{},
	}

	// Get retention policy for customers
	policy, err := s.db.GetRetentionPolicyByEntityType(ctx, "customer")
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to get retention policy: %v", err))
		result.CompletedAt = time.Now()
		return result, nil
	}

	// Only run if action is anonymize
	if policy.Action != "anonymize" {
		result.CompletedAt = time.Now()
		return result, nil
	}

	// Get expired customers
	expiredCustomerIDs, err := s.db.GetExpiredCustomers(ctx, policy.RetentionDays)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to get expired customers: %v", err))
		result.CompletedAt = time.Now()
		return result, nil
	}

	result.RecordsChecked = len(expiredCustomerIDs)

	// Anonymize each expired customer
	for _, customerID := range expiredCustomerIDs {
		dealershipID, err := s.db.GetCustomerDealershipID(ctx, customerID)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to get dealership for customer %s: %v", customerID, err))
			continue
		}

		if err := s.db.AnonymizeCustomer(ctx, customerID, dealershipID); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to anonymize customer %s: %v", customerID, err))
			continue
		}

		result.RecordsAnonymized++

		// Log audit
		s.db.CreateAuditLog(ctx, &AuditLog{
			DealershipID: dealershipID,
			EntityType:   "customer",
			EntityID:     customerID,
			Action:       "auto_anonymization",
			PerformedBy:  "retention_job",
			Metadata: map[string]interface{}{
				"policy_id":      policy.ID,
				"retention_days": policy.RetentionDays,
			},
		})
	}

	result.CompletedAt = time.Now()

	s.logger.WithField("records_checked", result.RecordsChecked).
		WithField("records_anonymized", result.RecordsAnonymized).
		Info("Anonymization job completed")

	return result, nil
}
