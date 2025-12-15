package main

import (
	"fmt"
	"math"
)

// ============================================================================
// Deal Types
// ============================================================================

// DealType represents the type of vehicle deal
type DealType string

const (
	DealTypeCash    DealType = "CASH"
	DealTypeFinance DealType = "FINANCE"
	DealTypeLease   DealType = "LEASE"
)

// ============================================================================
// Input Structures
// ============================================================================

// DealCalculationInput contains all inputs for deal calculation
type DealCalculationInput struct {
	// Vehicle pricing
	VehiclePrice     float64 `json:"vehicle_price"`      // MSRP or negotiated price
	AccessoriesPrice float64 `json:"accessories_price"`  // Added accessories
	DocFee           float64 `json:"doc_fee"`            // Documentation fee
	OtherFees        float64 `json:"other_fees"`         // Title, registration, etc.

	// Trade-in
	TradeInValue    float64 `json:"trade_in_value"`    // ACV of trade
	TradeInPayoff   float64 `json:"trade_in_payoff"`   // Lien payoff amount
	TradeInAllowance float64 `json:"trade_in_allowance"` // Allowance offered to customer

	// Deductions
	DownPayment         float64 `json:"down_payment"`          // Cash down
	RebateManufacturer  float64 `json:"rebate_manufacturer"`   // Manufacturer rebate
	RebateDealer        float64 `json:"rebate_dealer"`         // Dealer rebate
	CapCostReduction    float64 `json:"cap_cost_reduction"`    // Lease: cap cost reduction

	// Products (F&I)
	ServiceContract  float64 `json:"service_contract"`   // Extended warranty
	GAPInsurance     float64 `json:"gap_insurance"`      // GAP coverage
	TirePlan         float64 `json:"tire_plan"`          // Tire & wheel protection
	MaintenancePlan  float64 `json:"maintenance_plan"`   // Prepaid maintenance
	OtherProducts    float64 `json:"other_products"`     // Other F&I products

	// Tax
	TaxRate        float64 `json:"tax_rate"`         // Combined tax rate (decimal, e.g., 0.0825)
	TaxableAmount  float64 `json:"taxable_amount"`   // Optionally override taxable base

	// Financing
	APR        float64 `json:"apr"`         // Annual percentage rate (e.g., 5.99)
	TermMonths int     `json:"term_months"` // Loan term in months

	// Lease specific
	ResidualPercent float64 `json:"residual_percent"` // Residual value percent
	ResidualValue   float64 `json:"residual_value"`   // Or explicit residual
	MoneyFactor     float64 `json:"money_factor"`     // Lease money factor (APR/2400)
	MileageAllowance int    `json:"mileage_allowance"` // Annual miles
	LeaseTerm       int     `json:"lease_term"`        // Lease term in months
}

// ============================================================================
// Output Structures
// ============================================================================

// DealCalculationResult contains all calculated values
type DealCalculationResult struct {
	DealType DealType `json:"deal_type"`

	// Pricing breakdown
	VehicleTotalPrice  float64 `json:"vehicle_total_price"`   // Vehicle + accessories
	GrossCapCost       float64 `json:"gross_cap_cost"`        // Lease: before deductions
	NetTrade           float64 `json:"net_trade"`             // Trade value - payoff
	TotalDeductions    float64 `json:"total_deductions"`      // Down + rebates + trade
	ProductsTotal      float64 `json:"products_total"`        // F&I products
	FeesTotal          float64 `json:"fees_total"`            // Doc + other fees

	// Tax
	TaxableBase    float64 `json:"taxable_base"`     // Amount subject to tax
	TaxAmount      float64 `json:"tax_amount"`       // Calculated tax
	EffectiveRate  float64 `json:"effective_rate"`   // Actual rate applied

	// Totals
	AmountFinanced   float64 `json:"amount_financed"`    // For finance deals
	TotalOfPayments  float64 `json:"total_of_payments"`  // Sum of all payments
	TotalInterest    float64 `json:"total_interest"`     // Interest paid over term

	// Payment
	MonthlyPayment   float64 `json:"monthly_payment"`    // Principal + interest
	FirstPayment     float64 `json:"first_payment"`      // May differ (lease)
	FinalPayment     float64 `json:"final_payment"`      // May differ

	// Lease specific
	AdjustedCapCost  float64 `json:"adjusted_cap_cost"`  // Net cap cost
	ResidualValue    float64 `json:"residual_value"`     // End of lease value
	DepreciationPart float64 `json:"depreciation_part"`  // Monthly depreciation
	RentChargePart   float64 `json:"rent_charge_part"`   // Monthly rent charge
	TotalLeaseCharge float64 `json:"total_lease_charge"` // Total lease cost

	// Negative equity handling
	NegativeEquity   float64 `json:"negative_equity"`    // Trade deficit
	NegEquityHandled string  `json:"neg_equity_handled"` // "rolled", "paid", "none"

	// Summary
	CashDueAtSigning float64 `json:"cash_due_at_signing"` // Total due at signing
	OutTheDoorPrice  float64 `json:"out_the_door_price"`  // Cash: total price
}

// ============================================================================
// Calculation Functions
// ============================================================================

// CalculateDeal calculates all deal values based on deal type
func CalculateDeal(input DealCalculationInput, dealType DealType) (*DealCalculationResult, error) {
	switch dealType {
	case DealTypeCash:
		return calculateCashDeal(input)
	case DealTypeFinance:
		return calculateFinanceDeal(input)
	case DealTypeLease:
		return calculateLeaseDeal(input)
	default:
		return nil, fmt.Errorf("unknown deal type: %s", dealType)
	}
}

// calculateCashDeal calculates a cash purchase
func calculateCashDeal(input DealCalculationInput) (*DealCalculationResult, error) {
	result := &DealCalculationResult{
		DealType: DealTypeCash,
	}

	// Vehicle total
	result.VehicleTotalPrice = input.VehiclePrice + input.AccessoriesPrice

	// Net trade
	result.NetTrade = input.TradeInValue - input.TradeInPayoff
	if result.NetTrade < 0 {
		result.NegativeEquity = -result.NetTrade
		result.NegEquityHandled = "paid" // Customer pays negative equity in cash deal
		result.NetTrade = 0
	} else {
		result.NegEquityHandled = "none"
	}

	// Fees
	result.FeesTotal = input.DocFee + input.OtherFees

	// Products
	result.ProductsTotal = input.ServiceContract + input.GAPInsurance +
		input.TirePlan + input.MaintenancePlan + input.OtherProducts

	// Deductions
	result.TotalDeductions = input.DownPayment + input.RebateManufacturer +
		input.RebateDealer + result.NetTrade

	// Taxable base (varies by state - simplified)
	if input.TaxableAmount > 0 {
		result.TaxableBase = input.TaxableAmount
	} else {
		// Most states: Vehicle - Trade + Fees + Products
		result.TaxableBase = result.VehicleTotalPrice - input.TradeInValue +
			result.FeesTotal + result.ProductsTotal
		if result.TaxableBase < 0 {
			result.TaxableBase = 0
		}
	}

	// Tax
	result.TaxAmount = result.TaxableBase * input.TaxRate
	result.EffectiveRate = input.TaxRate

	// Out the door price
	result.OutTheDoorPrice = result.VehicleTotalPrice + result.FeesTotal +
		result.ProductsTotal + result.TaxAmount - result.TotalDeductions +
		result.NegativeEquity

	result.CashDueAtSigning = result.OutTheDoorPrice

	return result, nil
}

// calculateFinanceDeal calculates a financed purchase
func calculateFinanceDeal(input DealCalculationInput) (*DealCalculationResult, error) {
	// Start with cash calculation
	result, err := calculateCashDeal(input)
	if err != nil {
		return nil, err
	}
	result.DealType = DealTypeFinance

	// Handle negative equity differently - roll into loan
	if result.NegativeEquity > 0 {
		result.NegEquityHandled = "rolled"
	}

	// Amount financed = OTD price + negative equity - down payment
	result.AmountFinanced = result.OutTheDoorPrice + result.NegativeEquity -
		input.DownPayment

	if input.TermMonths <= 0 {
		input.TermMonths = 60 // Default to 60 months
	}

	// Calculate monthly payment using standard amortization
	if input.APR > 0 && result.AmountFinanced > 0 {
		monthlyRate := (input.APR / 100) / 12
		n := float64(input.TermMonths)

		// PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
		factor := math.Pow(1+monthlyRate, n)
		result.MonthlyPayment = result.AmountFinanced * (monthlyRate * factor) / (factor - 1)
		result.MonthlyPayment = roundToTwoDecimals(result.MonthlyPayment)

		result.TotalOfPayments = result.MonthlyPayment * n
		result.TotalInterest = result.TotalOfPayments - result.AmountFinanced
	} else {
		// 0% APR or cash
		result.MonthlyPayment = result.AmountFinanced / float64(input.TermMonths)
		result.TotalOfPayments = result.AmountFinanced
		result.TotalInterest = 0
	}

	result.FirstPayment = result.MonthlyPayment
	result.FinalPayment = result.MonthlyPayment

	// Cash due at signing = down payment + 1st month payment + fees
	result.CashDueAtSigning = input.DownPayment + result.FirstPayment

	return result, nil
}

// calculateLeaseDeal calculates a lease
func calculateLeaseDeal(input DealCalculationInput) (*DealCalculationResult, error) {
	result := &DealCalculationResult{
		DealType: DealTypeLease,
	}

	if input.LeaseTerm <= 0 {
		input.LeaseTerm = 36 // Default to 36 months
	}

	// Gross Cap Cost = Vehicle + Accessories + Fees + Products
	result.GrossCapCost = input.VehiclePrice + input.AccessoriesPrice +
		input.DocFee + input.OtherFees + input.ServiceContract +
		input.GAPInsurance + input.TirePlan + input.MaintenancePlan +
		input.OtherProducts

	result.VehicleTotalPrice = input.VehiclePrice + input.AccessoriesPrice
	result.FeesTotal = input.DocFee + input.OtherFees
	result.ProductsTotal = input.ServiceContract + input.GAPInsurance +
		input.TirePlan + input.MaintenancePlan + input.OtherProducts

	// Net trade
	result.NetTrade = input.TradeInValue - input.TradeInPayoff
	if result.NetTrade < 0 {
		result.NegativeEquity = -result.NetTrade
		result.NegEquityHandled = "rolled" // Roll into cap cost
		result.NetTrade = 0
	} else {
		result.NegEquityHandled = "none"
	}

	// Cap cost reductions
	totalCapReduction := input.DownPayment + input.RebateManufacturer +
		input.RebateDealer + input.CapCostReduction + result.NetTrade
	result.TotalDeductions = totalCapReduction

	// Adjusted Cap Cost
	result.AdjustedCapCost = result.GrossCapCost + result.NegativeEquity - totalCapReduction

	// Residual Value
	if input.ResidualValue > 0 {
		result.ResidualValue = input.ResidualValue
	} else if input.ResidualPercent > 0 {
		result.ResidualValue = input.VehiclePrice * (input.ResidualPercent / 100)
	} else {
		// Default estimate: 50% for 36 months
		result.ResidualValue = input.VehiclePrice * 0.50
	}

	// Monthly Depreciation = (Adjusted Cap Cost - Residual) / Term
	result.DepreciationPart = (result.AdjustedCapCost - result.ResidualValue) / float64(input.LeaseTerm)

	// Money Factor to APR: APR = MF * 2400
	// If APR provided, convert: MF = APR / 2400
	moneyFactor := input.MoneyFactor
	if moneyFactor == 0 && input.APR > 0 {
		moneyFactor = input.APR / 2400
	}
	if moneyFactor == 0 {
		moneyFactor = 0.00125 // Default ~3% APR
	}

	// Rent Charge = (Adjusted Cap Cost + Residual) * Money Factor
	result.RentChargePart = (result.AdjustedCapCost + result.ResidualValue) * moneyFactor

	// Base Monthly Payment
	basePayment := result.DepreciationPart + result.RentChargePart

	// Tax on lease (varies by state - simplified as tax on payment)
	result.TaxableBase = basePayment
	result.TaxAmount = basePayment * input.TaxRate
	result.EffectiveRate = input.TaxRate

	// Total Monthly Payment
	result.MonthlyPayment = roundToTwoDecimals(basePayment + result.TaxAmount)

	// Totals
	result.TotalOfPayments = result.MonthlyPayment * float64(input.LeaseTerm)
	result.TotalLeaseCharge = result.TotalOfPayments + totalCapReduction - result.ResidualValue
	result.TotalInterest = result.RentChargePart * float64(input.LeaseTerm)

	result.FirstPayment = result.MonthlyPayment
	result.FinalPayment = result.MonthlyPayment

	// Cash due at signing = Down + 1st payment + fees (varies by dealer)
	result.CashDueAtSigning = input.DownPayment + result.FirstPayment + input.DocFee

	return result, nil
}

// ============================================================================
// Payment Calculation Utilities
// ============================================================================

// CalculateMonthlyPayment calculates a simple amortized payment
func CalculateMonthlyPayment(principal, apr float64, termMonths int) float64 {
	if apr <= 0 || termMonths <= 0 {
		return principal / float64(termMonths)
	}

	monthlyRate := (apr / 100) / 12
	n := float64(termMonths)

	factor := math.Pow(1+monthlyRate, n)
	payment := principal * (monthlyRate * factor) / (factor - 1)

	return roundToTwoDecimals(payment)
}

// CalculateAPRFromPayment reverse-calculates APR from payment
func CalculateAPRFromPayment(principal, payment float64, termMonths int) float64 {
	// Use Newton-Raphson method to find rate
	if payment <= 0 || principal <= 0 || termMonths <= 0 {
		return 0
	}

	n := float64(termMonths)
	guess := 0.05 / 12 // Start with 5% APR monthly rate

	for i := 0; i < 100; i++ {
		factor := math.Pow(1+guess, n)
		calculatedPayment := principal * (guess * factor) / (factor - 1)

		diff := calculatedPayment - payment
		if math.Abs(diff) < 0.01 {
			return guess * 12 * 100 // Convert back to APR
		}

		// Derivative for Newton-Raphson
		derivative := principal * (factor*(n*guess+factor-1) - guess*n*factor) / math.Pow(factor-1, 2)
		guess = guess - diff/derivative

		if guess < 0 {
			guess = 0.001
		}
	}

	return guess * 12 * 100
}

// CalculateMaxLoanAmount calculates max loan for given payment
func CalculateMaxLoanAmount(payment, apr float64, termMonths int) float64 {
	if apr <= 0 {
		return payment * float64(termMonths)
	}

	monthlyRate := (apr / 100) / 12
	n := float64(termMonths)

	factor := math.Pow(1+monthlyRate, n)
	principal := payment * (factor - 1) / (monthlyRate * factor)

	return roundToTwoDecimals(principal)
}

// ============================================================================
// Amortization Schedule
// ============================================================================

// AmortizationEntry represents one payment in the schedule
type AmortizationEntry struct {
	PaymentNumber    int     `json:"payment_number"`
	PaymentDate      string  `json:"payment_date"`       // ISO date
	Payment          float64 `json:"payment"`
	Principal        float64 `json:"principal"`
	Interest         float64 `json:"interest"`
	Balance          float64 `json:"balance"`
	CumulativeInterest float64 `json:"cumulative_interest"`
}

// GenerateAmortizationSchedule creates full payment schedule
func GenerateAmortizationSchedule(principal, apr float64, termMonths int, startDate string) []AmortizationEntry {
	schedule := make([]AmortizationEntry, termMonths)

	payment := CalculateMonthlyPayment(principal, apr, termMonths)
	monthlyRate := (apr / 100) / 12
	balance := principal
	cumulativeInterest := 0.0

	for i := 0; i < termMonths; i++ {
		interest := balance * monthlyRate
		principalPart := payment - interest

		// Handle final payment rounding
		if i == termMonths-1 {
			principalPart = balance
			payment = principalPart + interest
		}

		balance -= principalPart
		if balance < 0.01 {
			balance = 0
		}

		cumulativeInterest += interest

		schedule[i] = AmortizationEntry{
			PaymentNumber:      i + 1,
			Payment:            roundToTwoDecimals(payment),
			Principal:          roundToTwoDecimals(principalPart),
			Interest:           roundToTwoDecimals(interest),
			Balance:            roundToTwoDecimals(balance),
			CumulativeInterest: roundToTwoDecimals(cumulativeInterest),
		}
	}

	return schedule
}

// ============================================================================
// Helpers
// ============================================================================

func roundToTwoDecimals(value float64) float64 {
	return math.Round(value*100) / 100
}
