package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ============================================================================
// Credit Check Types
// ============================================================================

// CreditCheckRequest represents a request to run a credit check
type CreditCheckRequest struct {
	CustomerID string `json:"customer_id"`
	Purpose    string `json:"purpose"` // "auto_loan", "lease", "refinance"
}

// CreditCheckResult represents the result of a credit check
type CreditCheckResult struct {
	ID              string              `json:"id"`
	CustomerID      string              `json:"customer_id"`
	RequestedAt     time.Time           `json:"requested_at"`
	Status          string              `json:"status"` // "completed", "pending", "failed"
	Score           int                 `json:"score,omitempty"`
	ScoreBand       string              `json:"score_band,omitempty"`
	RecommendedAPR  float64             `json:"recommended_apr,omitempty"`
	MaxLoanAmount   float64             `json:"max_loan_amount,omitempty"`
	MonthlyBudget   float64             `json:"monthly_budget,omitempty"`
	Factors         []string            `json:"factors,omitempty"`
	TermOptions     []FinancingOption   `json:"term_options,omitempty"`
	LenderMatches   []LenderMatch       `json:"lender_matches,omitempty"`
	ExpiresAt       time.Time           `json:"expires_at"`
	Purpose         string              `json:"purpose"`
	Notes           string              `json:"notes,omitempty"`
}

// FinancingOption represents a financing term option
type FinancingOption struct {
	TermMonths      int     `json:"term_months"`
	APR             float64 `json:"apr"`
	MonthlyPayment  float64 `json:"monthly_payment,omitempty"` // Calculated for specific amount
	MaxLoanForTerm  float64 `json:"max_loan_for_term"`
}

// LenderMatch represents a matched lender for the customer's profile
type LenderMatch struct {
	LenderID        string  `json:"lender_id"`
	LenderName      string  `json:"lender_name"`
	APRRange        string  `json:"apr_range"`
	ApprovalLikelihood string `json:"approval_likelihood"` // "high", "medium", "low"
	Notes           string  `json:"notes,omitempty"`
}

// CreditProfile represents stored credit profile data
type CreditProfile struct {
	ID              string    `json:"id"`
	CustomerID      string    `json:"customer_id"`
	CreditScore     int       `json:"credit_score"`
	MonthlyIncome   float64   `json:"monthly_income"`
	MonthlyDebt     float64   `json:"monthly_debt"`
	TotalDebt       float64   `json:"total_debt"`
	EmploymentStatus string   `json:"employment_status"` // "employed", "self_employed", "retired", "unemployed"
	YearsEmployed   float64   `json:"years_employed"`
	BankruptcyFlag  bool      `json:"bankruptcy_flag"`
	RepoFlag        bool      `json:"repo_flag"`
	OpenAutoLoans   int       `json:"open_auto_loans"`
	LastUpdated     time.Time `json:"last_updated"`
}

// ============================================================================
// Credit Service Handlers
// ============================================================================

// setupCreditRoutes adds credit-related routes to the server
func (s *Server) setupCreditRoutes() {
	s.router.HandleFunc("/customers/{id}/credit-check", s.runCreditCheck).Methods("POST")
	s.router.HandleFunc("/customers/{id}/credit-profile", s.getCreditProfile).Methods("GET")
	s.router.HandleFunc("/customers/{id}/credit-profile", s.updateCreditProfile).Methods("PUT")
	s.router.HandleFunc("/customers/{id}/financing-options", s.getFinancingOptions).Methods("GET")
	s.router.HandleFunc("/customers/{id}/prequalify", s.prequalifyCustomer).Methods("POST")
}

// runCreditCheck simulates a credit check for a customer
func (s *Server) runCreditCheck(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["id"]

	if !validateUUID(w, customerID, "id") {
		return
	}

	var req CreditCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErrorJSON(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}
	req.CustomerID = customerID

	// Get customer data
	customer, err := s.db.GetCustomer(customerID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer for credit check")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Simulate credit check using stored data
	result := s.simulateCreditCheck(customer, req.Purpose)

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		WithField("credit_score", result.Score).
		Info("Credit check completed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// getCreditProfile returns stored credit profile for a customer
func (s *Server) getCreditProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["id"]

	if !validateUUID(w, customerID, "id") {
		return
	}

	// Get customer to build credit profile
	customer, err := s.db.GetCustomer(customerID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Build credit profile from customer data
	profile := &CreditProfile{
		ID:              uuid.New().String(),
		CustomerID:      customerID,
		CreditScore:     customer.CreditScore,
		MonthlyIncome:   customer.MonthlyIncome,
		MonthlyDebt:     0,    // Would be stored/calculated
		TotalDebt:       0,    // Would be stored/calculated
		EmploymentStatus: "employed", // Default
		YearsEmployed:   2.0,  // Default
		BankruptcyFlag:  false,
		RepoFlag:        false,
		OpenAutoLoans:   0,
		LastUpdated:     time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// updateCreditProfile updates stored credit profile for a customer
func (s *Server) updateCreditProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["id"]

	if !validateUUID(w, customerID, "id") {
		return
	}

	var profile CreditProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		respondErrorJSON(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	// Validate credit score
	if profile.CreditScore != 0 && (profile.CreditScore < 300 || profile.CreditScore > 850) {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   "credit_score",
				Message: "Credit score must be between 300 and 850",
			}},
		})
		return
	}

	// Get existing customer
	customer, err := s.db.GetCustomer(customerID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Update customer with credit profile data
	if profile.CreditScore > 0 {
		customer.CreditScore = profile.CreditScore
	}
	if profile.MonthlyIncome > 0 {
		customer.MonthlyIncome = profile.MonthlyIncome
	}
	customer.UpdatedAt = time.Now()

	if err := s.db.UpdateCustomer(customer); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update customer credit profile")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		Info("Credit profile updated")

	profile.ID = uuid.New().String()
	profile.CustomerID = customerID
	profile.LastUpdated = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// getFinancingOptions returns available financing options for a customer
func (s *Server) getFinancingOptions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["id"]

	if !validateUUID(w, customerID, "id") {
		return
	}

	// Get vehicle price from query params
	vehiclePriceStr := r.URL.Query().Get("vehicle_price")
	var vehiclePrice float64
	if vehiclePriceStr != "" {
		fmt.Sscanf(vehiclePriceStr, "%f", &vehiclePrice)
	}
	if vehiclePrice <= 0 {
		vehiclePrice = 30000 // Default for calculations
	}

	// Get customer
	customer, err := s.db.GetCustomer(customerID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Generate financing options based on credit profile
	options := s.generateFinancingOptions(customer, vehiclePrice)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"customer_id":    customerID,
		"vehicle_price":  vehiclePrice,
		"credit_score":   customer.CreditScore,
		"options":        options,
	})
}

// prequalifyCustomer runs a soft prequalification check
func (s *Server) prequalifyCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["id"]

	if !validateUUID(w, customerID, "id") {
		return
	}

	type PrequalRequest struct {
		RequestedAmount float64 `json:"requested_amount"`
		TermMonths      int     `json:"term_months"`
		Purpose         string  `json:"purpose"`
	}

	var req PrequalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErrorJSON(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	// Get customer
	customer, err := s.db.GetCustomer(customerID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Run prequalification
	prequal := s.prequalify(customer, req.RequestedAmount, req.TermMonths, req.Purpose)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prequal)
}

// ============================================================================
// Credit Calculation Logic
// ============================================================================

// simulateCreditCheck creates a simulated credit check result
func (s *Server) simulateCreditCheck(customer *Customer, purpose string) *CreditCheckResult {
	score := customer.CreditScore
	if score == 0 {
		score = 650 // Default score for simulation
	}

	result := &CreditCheckResult{
		ID:          uuid.New().String(),
		CustomerID:  customer.ID,
		RequestedAt: time.Now(),
		Status:      "completed",
		Score:       score,
		ScoreBand:   getScoreBand(score),
		Purpose:     purpose,
		ExpiresAt:   time.Now().Add(30 * 24 * time.Hour), // 30 days
	}

	// Calculate APR based on score
	result.RecommendedAPR = calculateAPRFromScore(score, purpose)

	// Calculate max loan amount based on income
	if customer.MonthlyIncome > 0 {
		result.MaxLoanAmount = calculateMaxLoan(score, customer.MonthlyIncome)
		result.MonthlyBudget = customer.MonthlyIncome * 0.15 // 15% of income
	} else {
		result.MaxLoanAmount = calculateMaxLoanFromScore(score)
	}

	// Generate decision factors
	result.Factors = getDecisionFactors(score, customer)

	// Generate term options
	result.TermOptions = generateTermOptions(score, result.MaxLoanAmount, purpose)

	// Match lenders
	result.LenderMatches = matchLenders(score, purpose)

	return result
}

// getScoreBand returns the credit score band
func getScoreBand(score int) string {
	switch {
	case score >= 800:
		return "exceptional"
	case score >= 740:
		return "very_good"
	case score >= 670:
		return "good"
	case score >= 580:
		return "fair"
	default:
		return "poor"
	}
}

// calculateAPRFromScore calculates recommended APR based on credit score
func calculateAPRFromScore(score int, purpose string) float64 {
	// Base rates by score band
	var baseRate float64
	switch {
	case score >= 800:
		baseRate = 3.99
	case score >= 740:
		baseRate = 4.99
	case score >= 670:
		baseRate = 6.99
	case score >= 580:
		baseRate = 11.99
	default:
		baseRate = 18.99
	}

	// Adjust for purpose
	switch purpose {
	case "lease":
		baseRate -= 0.5 // Leases typically have lower rates
	case "refinance":
		baseRate += 0.5 // Refinance slightly higher
	}

	return math.Round(baseRate*100) / 100
}

// calculateMaxLoan calculates max loan amount based on score and income
func calculateMaxLoan(score int, monthlyIncome float64) float64 {
	// Use debt-to-income ratio of 15% for auto loans
	maxMonthlyPayment := monthlyIncome * 0.15

	// Calculate max loan at typical 60-month term
	apr := calculateAPRFromScore(score, "auto_loan")
	monthlyRate := apr / 100 / 12

	if monthlyRate == 0 {
		return maxMonthlyPayment * 60
	}

	// PMT formula solved for principal
	maxLoan := maxMonthlyPayment * ((math.Pow(1+monthlyRate, 60) - 1) / (monthlyRate * math.Pow(1+monthlyRate, 60)))

	// Apply credit score factor
	scoreFactor := float64(score-300) / 550 // 0-1 range
	maxLoan *= (0.7 + 0.3*scoreFactor)     // 70-100% of calculated max

	return math.Round(maxLoan*100) / 100
}

// calculateMaxLoanFromScore calculates max loan using only score (no income)
func calculateMaxLoanFromScore(score int) float64 {
	// Tiered maximums by score
	switch {
	case score >= 800:
		return 100000
	case score >= 740:
		return 80000
	case score >= 670:
		return 60000
	case score >= 580:
		return 40000
	default:
		return 20000
	}
}

// getDecisionFactors returns factors affecting the credit decision
func getDecisionFactors(score int, customer *Customer) []string {
	factors := []string{}

	if score >= 740 {
		factors = append(factors, "Excellent payment history")
		factors = append(factors, "Low credit utilization")
	} else if score >= 670 {
		factors = append(factors, "Good payment history")
		factors = append(factors, "Moderate credit utilization")
	} else if score >= 580 {
		factors = append(factors, "Some late payments on record")
		factors = append(factors, "Higher credit utilization")
	} else {
		factors = append(factors, "Multiple late payments on record")
		factors = append(factors, "High credit utilization")
		factors = append(factors, "Limited credit history")
	}

	if customer.MonthlyIncome > 8000 {
		factors = append(factors, "Strong income verification")
	} else if customer.MonthlyIncome > 4000 {
		factors = append(factors, "Adequate income verification")
	} else if customer.MonthlyIncome > 0 {
		factors = append(factors, "Income verification required")
	}

	return factors
}

// generateTermOptions creates financing term options
func generateTermOptions(score int, maxLoan float64, purpose string) []FinancingOption {
	baseAPR := calculateAPRFromScore(score, purpose)

	// Available terms depend on score
	var terms []int
	switch {
	case score >= 670:
		terms = []int{36, 48, 60, 72, 84}
	case score >= 580:
		terms = []int{36, 48, 60, 72}
	default:
		terms = []int{36, 48, 60}
	}

	options := make([]FinancingOption, 0, len(terms))
	for _, term := range terms {
		// APR increases slightly with longer terms
		termAdjustment := float64(term-60) * 0.02
		apr := math.Max(baseAPR+termAdjustment, 0)

		// Max loan decreases with longer terms (risk adjustment)
		termFactor := 1.0 - float64(term-36)*0.01
		maxForTerm := maxLoan * termFactor

		options = append(options, FinancingOption{
			TermMonths:     term,
			APR:            math.Round(apr*100) / 100,
			MaxLoanForTerm: math.Round(maxForTerm*100) / 100,
		})
	}

	return options
}

// matchLenders matches customer to available lenders
func matchLenders(score int, purpose string) []LenderMatch {
	matches := []LenderMatch{}

	// Prime lenders (score >= 740)
	if score >= 740 {
		matches = append(matches, LenderMatch{
			LenderID:           "lender_prime_1",
			LenderName:         "Prime Auto Finance",
			APRRange:           "3.99% - 5.99%",
			ApprovalLikelihood: "high",
			Notes:              "Best rates for excellent credit",
		})
	}

	// Standard lenders (score >= 670)
	if score >= 670 {
		standardLikelihood := "medium"
		if score >= 740 {
			standardLikelihood = "high"
		}
		matches = append(matches, LenderMatch{
			LenderID:           "lender_standard_1",
			LenderName:         "Standard Auto Lending",
			APRRange:           "5.99% - 8.99%",
			ApprovalLikelihood: standardLikelihood,
			Notes:              "Competitive rates for good credit",
		})
	}

	// Subprime lenders (score >= 580)
	if score >= 580 {
		likelihood := "low"
		if score >= 670 {
			likelihood = "high"
		} else if score >= 620 {
			likelihood = "medium"
		}

		matches = append(matches, LenderMatch{
			LenderID:           "lender_subprime_1",
			LenderName:         "Second Chance Auto",
			APRRange:           "9.99% - 15.99%",
			ApprovalLikelihood: likelihood,
			Notes:              "Works with fair credit",
		})
	}

	// Deep subprime (all scores)
	deepSubprimeLikelihood := "medium"
	if score >= 580 {
		deepSubprimeLikelihood = "high"
	}
	matches = append(matches, LenderMatch{
		LenderID:           "lender_deepsubprime_1",
		LenderName:         "Fresh Start Motors",
		APRRange:           "14.99% - 24.99%",
		ApprovalLikelihood: deepSubprimeLikelihood,
		Notes:              "Specializes in credit rebuilding",
	})

	return matches
}

// generateFinancingOptions generates options for a specific vehicle price
func (s *Server) generateFinancingOptions(customer *Customer, vehiclePrice float64) []FinancingOption {
	score := customer.CreditScore
	if score == 0 {
		score = 650
	}

	options := generateTermOptions(score, vehiclePrice, "auto_loan")

	// Calculate monthly payments for each option
	for i := range options {
		monthlyRate := options[i].APR / 100 / 12
		if monthlyRate > 0 {
			payment := vehiclePrice * (monthlyRate * math.Pow(1+monthlyRate, float64(options[i].TermMonths))) /
				(math.Pow(1+monthlyRate, float64(options[i].TermMonths)) - 1)
			options[i].MonthlyPayment = math.Round(payment*100) / 100
		} else {
			options[i].MonthlyPayment = math.Round(vehiclePrice/float64(options[i].TermMonths)*100) / 100
		}
	}

	return options
}

// PrequalResult represents prequalification result
type PrequalResult struct {
	Approved         bool    `json:"approved"`
	ApprovalStatus   string  `json:"approval_status"` // "auto_approved", "manual_review", "declined"
	ApprovedAmount   float64 `json:"approved_amount,omitempty"`
	RecommendedTerm  int     `json:"recommended_term,omitempty"`
	EstimatedAPR     float64 `json:"estimated_apr,omitempty"`
	MonthlyPayment   float64 `json:"monthly_payment,omitempty"`
	Conditions       []string `json:"conditions,omitempty"`
	DeclineReasons   []string `json:"decline_reasons,omitempty"`
	ExpiresAt        time.Time `json:"expires_at"`
}

// prequalify runs a prequalification check
func (s *Server) prequalify(customer *Customer, requestedAmount float64, termMonths int, purpose string) *PrequalResult {
	score := customer.CreditScore
	if score == 0 {
		score = 650
	}

	if termMonths == 0 {
		termMonths = 60
	}

	result := &PrequalResult{
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	// Calculate max loan
	maxLoan := calculateMaxLoanFromScore(score)
	if customer.MonthlyIncome > 0 {
		maxLoan = calculateMaxLoan(score, customer.MonthlyIncome)
	}

	// Determine approval
	if requestedAmount <= maxLoan && score >= 580 {
		result.Approved = true

		if score >= 670 {
			result.ApprovalStatus = "auto_approved"
			result.ApprovedAmount = requestedAmount
		} else {
			result.ApprovalStatus = "manual_review"
			result.ApprovedAmount = math.Min(requestedAmount, maxLoan*0.85) // 85% for manual review
			result.Conditions = append(result.Conditions, "Proof of income required")
			result.Conditions = append(result.Conditions, "Employment verification required")
		}

		result.RecommendedTerm = termMonths
		result.EstimatedAPR = calculateAPRFromScore(score, purpose)

		// Calculate payment
		monthlyRate := result.EstimatedAPR / 100 / 12
		if monthlyRate > 0 {
			result.MonthlyPayment = result.ApprovedAmount * (monthlyRate * math.Pow(1+monthlyRate, float64(termMonths))) /
				(math.Pow(1+monthlyRate, float64(termMonths)) - 1)
			result.MonthlyPayment = math.Round(result.MonthlyPayment*100) / 100
		}
	} else {
		result.Approved = false
		result.ApprovalStatus = "declined"

		if score < 580 {
			result.DeclineReasons = append(result.DeclineReasons, "Credit score below minimum requirement")
		}
		if requestedAmount > maxLoan {
			result.DeclineReasons = append(result.DeclineReasons, "Requested amount exceeds maximum qualification")
		}
		if customer.MonthlyIncome == 0 {
			result.DeclineReasons = append(result.DeclineReasons, "Income verification required")
		}
	}

	return result
}
