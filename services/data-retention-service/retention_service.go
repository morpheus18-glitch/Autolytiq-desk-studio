package main

import (
	"context"
	"fmt"
	"time"

	"autolytiq/services/shared/logging"
)

// RetentionService handles data retention operations
type RetentionService struct {
	db     *Database
	logger *logging.Logger
}

// NewRetentionService creates a new retention service
func NewRetentionService(db *Database, logger *logging.Logger) *RetentionService {
	return &RetentionService{
		db:     db,
		logger: logger,
	}
}

// GetRetentionStatus returns the overall retention status
func (s *RetentionService) GetRetentionStatus(ctx context.Context, dealershipID string) (*RetentionStatus, error) {
	policies, err := s.db.ListRetentionPolicies(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list policies: %w", err)
	}

	stats, err := s.db.GetRetentionStats(ctx, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	// Calculate next scheduled cleanup (daily at 2 AM)
	now := time.Now()
	nextCleanup := time.Date(now.Year(), now.Month(), now.Day(), 2, 0, 0, 0, now.Location())
	if nextCleanup.Before(now) {
		nextCleanup = nextCleanup.Add(24 * time.Hour)
	}

	return &RetentionStatus{
		Policies:             policies,
		Stats:                stats,
		NextScheduledCleanup: &nextCleanup,
	}, nil
}

// GetCustomerRetentionStatus returns retention status for a specific customer
func (s *RetentionService) GetCustomerRetentionStatus(ctx context.Context, customerID, dealershipID string) (*CustomerRetentionStatus, error) {
	status := &CustomerRetentionStatus{
		CustomerID: customerID,
	}

	// Get customer data
	exportData, err := s.db.GetCustomerWithRelatedData(ctx, customerID, dealershipID)
	if err != nil {
		// Check if customer is deleted/anonymized
		status.IsDeleted = true
		return status, nil
	}

	status.IsActive = true
	status.LastActivityAt = exportData.Customer.LastActivityAt

	// Get applicable policy
	policy, err := s.db.GetRetentionPolicyByEntityType(ctx, "customer")
	if err == nil {
		status.ApplicablePolicy = policy

		// Calculate days until expiry
		if status.LastActivityAt != nil {
			expiryDate := status.LastActivityAt.AddDate(0, 0, policy.RetentionDays)
			status.RetentionExpiresAt = &expiryDate

			daysUntil := int(time.Until(expiryDate).Hours() / 24)
			if daysUntil < 0 {
				daysUntil = 0
			}
			status.DaysUntilExpiry = daysUntil
		}
	}

	return status, nil
}

// ListPolicies lists all retention policies
func (s *RetentionService) ListPolicies(ctx context.Context) ([]*RetentionPolicy, error) {
	return s.db.ListRetentionPolicies(ctx)
}

// GetPolicy gets a specific retention policy
func (s *RetentionService) GetPolicy(ctx context.Context, policyID string) (*RetentionPolicy, error) {
	return s.db.GetRetentionPolicy(ctx, policyID)
}

// CreatePolicy creates a new retention policy
func (s *RetentionService) CreatePolicy(ctx context.Context, policy *RetentionPolicy) (*RetentionPolicy, error) {
	if err := s.validatePolicy(policy); err != nil {
		return nil, err
	}

	if err := s.db.CreateRetentionPolicy(ctx, policy); err != nil {
		return nil, fmt.Errorf("failed to create policy: %w", err)
	}

	// Log audit
	s.db.CreateAuditLog(ctx, &AuditLog{
		EntityType:  "retention_policy",
		EntityID:    policy.ID,
		Action:      "create",
		PerformedBy: "admin",
		NewData: map[string]interface{}{
			"name":           policy.Name,
			"entity_type":    policy.EntityType,
			"retention_days": policy.RetentionDays,
			"action":         policy.Action,
		},
	})

	s.logger.WithField("policy_id", policy.ID).Info("Retention policy created")

	return policy, nil
}

// UpdatePolicy updates a retention policy
func (s *RetentionService) UpdatePolicy(ctx context.Context, policy *RetentionPolicy) (*RetentionPolicy, error) {
	if err := s.validatePolicy(policy); err != nil {
		return nil, err
	}

	// Get existing policy for audit
	existing, err := s.db.GetRetentionPolicy(ctx, policy.ID)
	if err != nil {
		return nil, fmt.Errorf("policy not found: %w", err)
	}

	if err := s.db.UpdateRetentionPolicy(ctx, policy); err != nil {
		return nil, fmt.Errorf("failed to update policy: %w", err)
	}

	// Log audit
	s.db.CreateAuditLog(ctx, &AuditLog{
		EntityType:  "retention_policy",
		EntityID:    policy.ID,
		Action:      "update",
		PerformedBy: "admin",
		OldData: map[string]interface{}{
			"name":           existing.Name,
			"entity_type":    existing.EntityType,
			"retention_days": existing.RetentionDays,
			"action":         existing.Action,
		},
		NewData: map[string]interface{}{
			"name":           policy.Name,
			"entity_type":    policy.EntityType,
			"retention_days": policy.RetentionDays,
			"action":         policy.Action,
		},
	})

	s.logger.WithField("policy_id", policy.ID).Info("Retention policy updated")

	return policy, nil
}

// DeletePolicy deletes a retention policy
func (s *RetentionService) DeletePolicy(ctx context.Context, policyID string) error {
	// Get existing policy for audit
	existing, err := s.db.GetRetentionPolicy(ctx, policyID)
	if err != nil {
		return fmt.Errorf("policy not found: %w", err)
	}

	if err := s.db.DeleteRetentionPolicy(ctx, policyID); err != nil {
		return fmt.Errorf("failed to delete policy: %w", err)
	}

	// Log audit
	s.db.CreateAuditLog(ctx, &AuditLog{
		EntityType:  "retention_policy",
		EntityID:    policyID,
		Action:      "delete",
		PerformedBy: "admin",
		OldData: map[string]interface{}{
			"name":           existing.Name,
			"entity_type":    existing.EntityType,
			"retention_days": existing.RetentionDays,
		},
	})

	s.logger.WithField("policy_id", policyID).Info("Retention policy deleted")

	return nil
}

// RunRetentionCleanup runs the data retention cleanup job
func (s *RetentionService) RunRetentionCleanup(ctx context.Context) (*CleanupResult, error) {
	result := &CleanupResult{
		StartedAt: time.Now(),
		Errors:    []string{},
	}

	// Get all active policies
	policies, err := s.db.ListRetentionPolicies(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list policies: %v", err))
		result.CompletedAt = time.Now()
		return result, nil
	}

	for _, policy := range policies {
		if !policy.IsActive {
			continue
		}

		switch policy.EntityType {
		case "customer":
			if err := s.processCustomerRetention(ctx, policy, result); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Customer retention error: %v", err))
			}
		case "audit_log":
			if err := s.processAuditLogRetention(ctx, policy, result); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Audit log retention error: %v", err))
			}
		// Add other entity types as needed
		}
	}

	result.CompletedAt = time.Now()

	// Log the cleanup run
	s.db.CreateAuditLog(ctx, &AuditLog{
		EntityType:  "system",
		EntityID:    "retention_cleanup",
		Action:      "cleanup_run",
		PerformedBy: "system",
		Metadata: map[string]interface{}{
			"customers_processed":   result.CustomersProcessed,
			"customers_deleted":     result.CustomersDeleted,
			"customers_anonymized":  result.CustomersAnonymized,
			"duration_seconds":      result.CompletedAt.Sub(result.StartedAt).Seconds(),
			"errors_count":          len(result.Errors),
		},
	})

	s.logger.WithField("customers_processed", result.CustomersProcessed).
		WithField("customers_deleted", result.CustomersDeleted).
		WithField("customers_anonymized", result.CustomersAnonymized).
		Info("Retention cleanup completed")

	return result, nil
}

// processCustomerRetention processes customer data retention
func (s *RetentionService) processCustomerRetention(ctx context.Context, policy *RetentionPolicy, result *CleanupResult) error {
	// Get expired customers
	expiredCustomerIDs, err := s.db.GetExpiredCustomers(ctx, policy.RetentionDays)
	if err != nil {
		return fmt.Errorf("failed to get expired customers: %w", err)
	}

	result.CustomersProcessed += len(expiredCustomerIDs)

	for _, customerID := range expiredCustomerIDs {
		dealershipID, err := s.db.GetCustomerDealershipID(ctx, customerID)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to get dealership for customer %s: %v", customerID, err))
			continue
		}

		switch policy.Action {
		case "delete":
			if err := s.db.SoftDeleteCustomer(ctx, customerID, dealershipID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to delete customer %s: %v", customerID, err))
				continue
			}
			result.CustomersDeleted++

		case "anonymize":
			if err := s.db.AnonymizeCustomer(ctx, customerID, dealershipID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to anonymize customer %s: %v", customerID, err))
				continue
			}
			result.CustomersAnonymized++
		}

		// Log individual action
		s.db.CreateAuditLog(ctx, &AuditLog{
			DealershipID: dealershipID,
			EntityType:   "customer",
			EntityID:     customerID,
			Action:       fmt.Sprintf("retention_%s", policy.Action),
			PerformedBy:  "retention_job",
			Metadata: map[string]interface{}{
				"policy_id":      policy.ID,
				"retention_days": policy.RetentionDays,
			},
		})
	}

	return nil
}

// processAuditLogRetention processes audit log retention
func (s *RetentionService) processAuditLogRetention(ctx context.Context, policy *RetentionPolicy, result *CleanupResult) error {
	// Delete old audit logs (implemented as a separate cleanup - not affecting customer counts)
	// This would be implemented with a direct SQL delete for performance
	s.logger.WithField("policy", policy.Name).Debug("Audit log retention processed")
	return nil
}

// GenerateRetentionReport generates a monthly retention report
func (s *RetentionService) GenerateRetentionReport(ctx context.Context, dealershipID string) (*RetentionReport, error) {
	now := time.Now()
	report := &RetentionReport{
		GeneratedAt:  now,
		ReportPeriod: now.Format("2006-01"),
		DealershipID: dealershipID,
	}

	// Get summary stats
	stats, err := s.db.GetRetentionStats(ctx, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}
	report.Summary = stats

	// Get GDPR requests summary
	requests, err := s.db.ListGDPRRequests(ctx, dealershipID, "", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get GDPR requests: %w", err)
	}

	gdprSummary := &GDPRRequestsSummary{
		TotalRequests: len(requests),
		ByType:        make(map[string]int),
		ByStatus:      make(map[string]int),
	}
	for _, req := range requests {
		gdprSummary.ByType[req.RequestType]++
		gdprSummary.ByStatus[req.Status]++
	}
	report.GDPRRequestsSummary = gdprSummary

	// Get consent summary (placeholder - would need actual queries)
	report.ConsentSummary = &ConsentSummary{
		TotalCustomers: stats.ActiveCustomers,
	}

	// Get data categories summary
	policies, err := s.db.ListRetentionPolicies(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get policies: %w", err)
	}

	for _, policy := range policies {
		category := DataCategorySummary{
			Category:        policy.EntityType,
			RetentionPolicy: policy.Name,
			RetentionPeriod: fmt.Sprintf("%d days", policy.RetentionDays),
		}
		report.DataCategories = append(report.DataCategories, category)
	}

	// Add recommendations
	if stats.PendingGDPRRequests > 0 {
		report.Recommendations = append(report.Recommendations,
			fmt.Sprintf("There are %d pending GDPR requests that need attention", stats.PendingGDPRRequests))
	}
	if stats.ExpiringWithin30Days > 10 {
		report.Recommendations = append(report.Recommendations,
			fmt.Sprintf("%d customer records are expiring within 30 days", stats.ExpiringWithin30Days))
	}

	s.logger.WithField("dealership_id", dealershipID).Info("Retention report generated")

	return report, nil
}

// validatePolicy validates a retention policy
func (s *RetentionService) validatePolicy(policy *RetentionPolicy) error {
	if policy.Name == "" {
		return fmt.Errorf("policy name is required")
	}
	if policy.EntityType == "" {
		return fmt.Errorf("entity type is required")
	}
	if policy.RetentionDays < 1 {
		return fmt.Errorf("retention days must be at least 1")
	}
	if policy.Action != "delete" && policy.Action != "anonymize" && policy.Action != "archive" {
		return fmt.Errorf("action must be one of: delete, anonymize, archive")
	}
	return nil
}
