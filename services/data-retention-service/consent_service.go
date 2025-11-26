package main

import (
	"context"
	"fmt"

	"autolytiq/services/shared/logging"
)

// ConsentService handles customer consent management
type ConsentService struct {
	db     *Database
	logger *logging.Logger
}

// NewConsentService creates a new consent service
func NewConsentService(db *Database, logger *logging.Logger) *ConsentService {
	return &ConsentService{
		db:     db,
		logger: logger,
	}
}

// GetConsent retrieves consent for a customer
func (s *ConsentService) GetConsent(ctx context.Context, customerID, dealershipID string) (*CustomerConsent, error) {
	consent, err := s.db.GetConsent(ctx, customerID, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get consent: %w", err)
	}
	return consent, nil
}

// UpdateConsent updates customer consent preferences
func (s *ConsentService) UpdateConsent(ctx context.Context, update *ConsentUpdate) (*CustomerConsent, error) {
	// Get existing consent
	existing, err := s.db.GetConsent(ctx, update.CustomerID, update.DealershipID)
	if err != nil {
		// If no existing consent, start with defaults
		existing = &CustomerConsent{
			CustomerID:     update.CustomerID,
			DealershipID:   update.DealershipID,
			MarketingEmail: false,
			MarketingSMS:   false,
			MarketingPhone: false,
			DataProcessing: true,
			Analytics:      true,
			ConsentVersion: "1.0",
		}
	}

	// Track changes for history
	changes := []struct {
		Type     string
		OldValue bool
		NewValue bool
	}{}

	// Apply updates
	if update.MarketingEmail != nil && *update.MarketingEmail != existing.MarketingEmail {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"marketing_email", existing.MarketingEmail, *update.MarketingEmail})
		existing.MarketingEmail = *update.MarketingEmail
	}

	if update.MarketingSMS != nil && *update.MarketingSMS != existing.MarketingSMS {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"marketing_sms", existing.MarketingSMS, *update.MarketingSMS})
		existing.MarketingSMS = *update.MarketingSMS
	}

	if update.MarketingPhone != nil && *update.MarketingPhone != existing.MarketingPhone {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"marketing_phone", existing.MarketingPhone, *update.MarketingPhone})
		existing.MarketingPhone = *update.MarketingPhone
	}

	if update.DataProcessing != nil && *update.DataProcessing != existing.DataProcessing {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"data_processing", existing.DataProcessing, *update.DataProcessing})
		existing.DataProcessing = *update.DataProcessing
	}

	if update.ThirdPartySharing != nil && *update.ThirdPartySharing != existing.ThirdPartySharing {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"third_party_sharing", existing.ThirdPartySharing, *update.ThirdPartySharing})
		existing.ThirdPartySharing = *update.ThirdPartySharing
	}

	if update.Analytics != nil && *update.Analytics != existing.Analytics {
		changes = append(changes, struct {
			Type     string
			OldValue bool
			NewValue bool
		}{"analytics", existing.Analytics, *update.Analytics})
		existing.Analytics = *update.Analytics
	}

	// Update metadata
	existing.IPAddress = update.IPAddress
	existing.UserAgent = update.UserAgent

	// Save consent
	if err := s.db.UpsertConsent(ctx, existing); err != nil {
		return nil, fmt.Errorf("failed to update consent: %w", err)
	}

	// Record history for each change
	for _, change := range changes {
		history := &ConsentHistory{
			CustomerID:   update.CustomerID,
			DealershipID: update.DealershipID,
			ConsentType:  change.Type,
			OldValue:     &change.OldValue,
			NewValue:     change.NewValue,
			ChangedBy:    update.UpdatedBy,
			IPAddress:    update.IPAddress,
			UserAgent:    update.UserAgent,
		}
		if err := s.db.CreateConsentHistory(ctx, history); err != nil {
			s.logger.WithError(err).Warn("Failed to record consent history")
		}
	}

	// Log audit
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: update.DealershipID,
		EntityType:   "consent",
		EntityID:     update.CustomerID,
		Action:       "consent_update",
		PerformedBy:  update.UpdatedBy,
		IPAddress:    update.IPAddress,
		Metadata: map[string]interface{}{
			"changes": changes,
		},
	})

	s.logger.WithField("customer_id", update.CustomerID).
		WithField("changes_count", len(changes)).
		Info("Customer consent updated")

	return existing, nil
}

// GetConsentHistory retrieves consent change history for a customer
func (s *ConsentService) GetConsentHistory(ctx context.Context, customerID, dealershipID string) ([]*ConsentHistory, error) {
	history, err := s.db.GetConsentHistory(ctx, customerID, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get consent history: %w", err)
	}
	return history, nil
}

// ProcessMarketingOptOut handles marketing opt-out requests
func (s *ConsentService) ProcessMarketingOptOut(ctx context.Context, email, customerID, dealershipID, ipAddress string) error {
	// Find customer by email if not provided
	if customerID == "" && email != "" {
		foundID, err := s.db.FindCustomerByEmail(ctx, email, dealershipID)
		if err != nil {
			return fmt.Errorf("failed to find customer: %w", err)
		}
		if foundID == "" {
			return fmt.Errorf("customer not found")
		}
		customerID = foundID
	}

	if customerID == "" {
		return fmt.Errorf("customer not found")
	}

	// Get dealership ID if not provided
	if dealershipID == "" {
		foundDealershipID, err := s.db.GetCustomerDealershipID(ctx, customerID)
		if err != nil {
			return fmt.Errorf("failed to get dealership: %w", err)
		}
		dealershipID = foundDealershipID
	}

	// Set all marketing consents to false
	falseValue := false
	update := &ConsentUpdate{
		CustomerID:     customerID,
		DealershipID:   dealershipID,
		MarketingEmail: &falseValue,
		MarketingSMS:   &falseValue,
		MarketingPhone: &falseValue,
		UpdatedBy:      "customer_self_service",
		IPAddress:      ipAddress,
	}

	_, err := s.UpdateConsent(ctx, update)
	if err != nil {
		return fmt.Errorf("failed to process opt-out: %w", err)
	}

	// Log specific opt-out event
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "consent",
		EntityID:     customerID,
		Action:       "marketing_opt_out",
		PerformedBy:  "customer_self_service",
		IPAddress:    ipAddress,
		Metadata: map[string]interface{}{
			"email":  email,
			"source": "self_service",
		},
	})

	s.logger.WithField("customer_id", customerID).
		WithField("email", email).
		Info("Marketing opt-out processed")

	return nil
}

// VerifyConsentForOperation checks if required consent is given for an operation
func (s *ConsentService) VerifyConsentForOperation(ctx context.Context, customerID, dealershipID, operation string) (bool, error) {
	consent, err := s.db.GetConsent(ctx, customerID, dealershipID)
	if err != nil {
		return false, fmt.Errorf("failed to get consent: %w", err)
	}

	switch operation {
	case "marketing_email":
		return consent.MarketingEmail, nil
	case "marketing_sms":
		return consent.MarketingSMS, nil
	case "marketing_phone":
		return consent.MarketingPhone, nil
	case "data_processing":
		return consent.DataProcessing, nil
	case "third_party_sharing":
		return consent.ThirdPartySharing, nil
	case "analytics":
		return consent.Analytics, nil
	default:
		return false, fmt.Errorf("unknown operation: %s", operation)
	}
}

// RecordConsentAtSignup records initial consent given during customer signup
func (s *ConsentService) RecordConsentAtSignup(ctx context.Context, customerID, dealershipID, ipAddress, userAgent string,
	marketingEmail, marketingSMS, marketingPhone, thirdPartySharing bool) (*CustomerConsent, error) {

	consent := &CustomerConsent{
		CustomerID:        customerID,
		DealershipID:      dealershipID,
		MarketingEmail:    marketingEmail,
		MarketingSMS:      marketingSMS,
		MarketingPhone:    marketingPhone,
		DataProcessing:    true, // Required for service
		ThirdPartySharing: thirdPartySharing,
		Analytics:         true, // Default on
		ConsentVersion:    "1.0",
		IPAddress:         ipAddress,
		UserAgent:         userAgent,
	}

	if err := s.db.UpsertConsent(ctx, consent); err != nil {
		return nil, fmt.Errorf("failed to record consent: %w", err)
	}

	// Record initial consent in history
	consentTypes := []struct {
		Type  string
		Value bool
	}{
		{"marketing_email", marketingEmail},
		{"marketing_sms", marketingSMS},
		{"marketing_phone", marketingPhone},
		{"data_processing", true},
		{"third_party_sharing", thirdPartySharing},
		{"analytics", true},
	}

	for _, ct := range consentTypes {
		history := &ConsentHistory{
			CustomerID:   customerID,
			DealershipID: dealershipID,
			ConsentType:  ct.Type,
			OldValue:     nil, // No previous value at signup
			NewValue:     ct.Value,
			ChangedBy:    "signup",
			IPAddress:    ipAddress,
			UserAgent:    userAgent,
		}
		s.db.CreateConsentHistory(ctx, history)
	}

	// Log audit
	s.db.CreateAuditLog(ctx, &AuditLog{
		DealershipID: dealershipID,
		EntityType:   "consent",
		EntityID:     customerID,
		Action:       "consent_signup",
		PerformedBy:  "signup",
		IPAddress:    ipAddress,
		Metadata: map[string]interface{}{
			"marketing_email":     marketingEmail,
			"marketing_sms":       marketingSMS,
			"marketing_phone":     marketingPhone,
			"third_party_sharing": thirdPartySharing,
		},
	})

	s.logger.WithField("customer_id", customerID).Info("Initial consent recorded at signup")

	return consent, nil
}
