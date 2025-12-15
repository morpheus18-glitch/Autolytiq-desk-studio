package main

import (
	"math"
	"testing"
)

// Helper to compare floats with tolerance
func almostEqual(a, b, tolerance float64) bool {
	return math.Abs(a-b) <= tolerance
}

func TestCalculateMonthlyPayment(t *testing.T) {
	tests := []struct {
		name       string
		principal  float64
		apr        float64
		termMonths int
		expected   float64
	}{
		{
			name:       "Standard 60 month auto loan",
			principal:  25000,
			apr:        5.99,
			termMonths: 60,
			expected:   483.15, // Known value
		},
		{
			name:       "0% APR financing",
			principal:  30000,
			apr:        0,
			termMonths: 60,
			expected:   500.00,
		},
		{
			name:       "36 month loan",
			principal:  20000,
			apr:        4.5,
			termMonths: 36,
			expected:   594.84,
		},
		{
			name:       "72 month loan",
			principal:  35000,
			apr:        6.5,
			termMonths: 72,
			expected:   588.35,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateMonthlyPayment(tt.principal, tt.apr, tt.termMonths)
			if !almostEqual(result, tt.expected, 1.00) { // $1 tolerance
				t.Errorf("CalculateMonthlyPayment(%v, %v, %v) = %v, want ~%v",
					tt.principal, tt.apr, tt.termMonths, result, tt.expected)
			}
		})
	}
}

func TestCalculateMaxLoanAmount(t *testing.T) {
	// If payment is $500 at 5% for 60 months, what's max loan?
	maxLoan := CalculateMaxLoanAmount(500, 5.0, 60)
	// Verify by calculating payment from that loan
	payment := CalculateMonthlyPayment(maxLoan, 5.0, 60)

	if !almostEqual(payment, 500, 1.00) {
		t.Errorf("Reverse calculation failed: loan=%v gives payment=%v, expected ~500", maxLoan, payment)
	}
}

func TestCashDealCalculation(t *testing.T) {
	input := DealCalculationInput{
		VehiclePrice:       35000,
		AccessoriesPrice:   1500,
		DocFee:             499,
		OtherFees:          250,
		TradeInValue:       10000,
		TradeInPayoff:      5000,
		DownPayment:        5000,
		RebateManufacturer: 2000,
		ServiceContract:    1500,
		GAPInsurance:       600,
		TaxRate:            0.0825,
	}

	result, err := CalculateDeal(input, DealTypeCash)
	if err != nil {
		t.Fatalf("Cash deal calculation failed: %v", err)
	}

	// Verify deal type
	if result.DealType != DealTypeCash {
		t.Errorf("Expected DealTypeCash, got %v", result.DealType)
	}

	// Verify vehicle total
	expectedVehicleTotal := 36500.0 // 35000 + 1500
	if result.VehicleTotalPrice != expectedVehicleTotal {
		t.Errorf("VehicleTotalPrice = %v, want %v", result.VehicleTotalPrice, expectedVehicleTotal)
	}

	// Verify net trade
	expectedNetTrade := 5000.0 // 10000 - 5000
	if result.NetTrade != expectedNetTrade {
		t.Errorf("NetTrade = %v, want %v", result.NetTrade, expectedNetTrade)
	}

	// Verify products total
	expectedProducts := 2100.0 // 1500 + 600
	if result.ProductsTotal != expectedProducts {
		t.Errorf("ProductsTotal = %v, want %v", result.ProductsTotal, expectedProducts)
	}

	// Verify out the door price is calculated
	if result.OutTheDoorPrice <= 0 {
		t.Error("OutTheDoorPrice should be positive")
	}

	// Verify tax was calculated
	if result.TaxAmount <= 0 {
		t.Error("TaxAmount should be positive")
	}
}

func TestFinanceDealCalculation(t *testing.T) {
	input := DealCalculationInput{
		VehiclePrice:       35000,
		AccessoriesPrice:   1500,
		DocFee:             499,
		TradeInValue:       10000,
		TradeInPayoff:      5000,
		DownPayment:        5000,
		RebateManufacturer: 2000,
		ServiceContract:    1500,
		TaxRate:            0.0825,
		APR:                5.99,
		TermMonths:         60,
	}

	result, err := CalculateDeal(input, DealTypeFinance)
	if err != nil {
		t.Fatalf("Finance deal calculation failed: %v", err)
	}

	// Verify deal type
	if result.DealType != DealTypeFinance {
		t.Errorf("Expected DealTypeFinance, got %v", result.DealType)
	}

	// Verify amount financed is positive
	if result.AmountFinanced <= 0 {
		t.Error("AmountFinanced should be positive")
	}

	// Verify monthly payment is positive
	if result.MonthlyPayment <= 0 {
		t.Error("MonthlyPayment should be positive")
	}

	// Verify total payments = monthly * term
	expectedTotalPayments := result.MonthlyPayment * float64(input.TermMonths)
	if !almostEqual(result.TotalOfPayments, expectedTotalPayments, 1.00) {
		t.Errorf("TotalOfPayments = %v, expected ~%v", result.TotalOfPayments, expectedTotalPayments)
	}

	// Verify interest = total payments - principal
	expectedInterest := result.TotalOfPayments - result.AmountFinanced
	if !almostEqual(result.TotalInterest, expectedInterest, 1.00) {
		t.Errorf("TotalInterest = %v, expected ~%v", result.TotalInterest, expectedInterest)
	}
}

func TestLeaseDealCalculation(t *testing.T) {
	input := DealCalculationInput{
		VehiclePrice:       45000,
		AccessoriesPrice:   500,
		DocFee:             399,
		TradeInValue:       8000,
		TradeInPayoff:      3000,
		DownPayment:        3000,
		RebateManufacturer: 1000,
		ServiceContract:    0,
		TaxRate:            0.0825,
		ResidualPercent:    55, // 55% residual
		MoneyFactor:        0.00125, // ~3% APR
		LeaseTerm:          36,
	}

	result, err := CalculateDeal(input, DealTypeLease)
	if err != nil {
		t.Fatalf("Lease deal calculation failed: %v", err)
	}

	// Verify deal type
	if result.DealType != DealTypeLease {
		t.Errorf("Expected DealTypeLease, got %v", result.DealType)
	}

	// Verify gross cap cost
	if result.GrossCapCost <= 0 {
		t.Error("GrossCapCost should be positive")
	}

	// Verify adjusted cap cost is less than gross (we have deductions)
	if result.AdjustedCapCost >= result.GrossCapCost {
		t.Error("AdjustedCapCost should be less than GrossCapCost with deductions")
	}

	// Verify residual value
	expectedResidual := 45000 * 0.55 // 55% of vehicle price
	if !almostEqual(result.ResidualValue, expectedResidual, 100) {
		t.Errorf("ResidualValue = %v, expected ~%v", result.ResidualValue, expectedResidual)
	}

	// Verify monthly payment components
	if result.DepreciationPart <= 0 {
		t.Error("DepreciationPart should be positive")
	}
	if result.RentChargePart <= 0 {
		t.Error("RentChargePart should be positive")
	}

	// Verify monthly payment is sum of components + tax
	expectedPayment := result.DepreciationPart + result.RentChargePart + result.TaxAmount
	if !almostEqual(result.MonthlyPayment, expectedPayment, 1.00) {
		t.Errorf("MonthlyPayment = %v, expected ~%v", result.MonthlyPayment, expectedPayment)
	}
}

func TestNegativeEquityHandling(t *testing.T) {
	// Test with negative equity (payoff > value)
	input := DealCalculationInput{
		VehiclePrice:   30000,
		DocFee:         399,
		TradeInValue:   8000,
		TradeInPayoff:  12000, // $4000 negative equity
		DownPayment:    2000,
		TaxRate:        0.0825,
		APR:            6.5,
		TermMonths:     60,
	}

	// Cash deal - negative equity paid upfront
	cashResult, _ := CalculateDeal(input, DealTypeCash)
	if cashResult.NegativeEquity != 4000 {
		t.Errorf("Cash deal NegativeEquity = %v, expected 4000", cashResult.NegativeEquity)
	}
	if cashResult.NegEquityHandled != "paid" {
		t.Errorf("Cash deal should handle neg equity as 'paid', got '%s'", cashResult.NegEquityHandled)
	}

	// Finance deal - negative equity rolled into loan
	financeResult, _ := CalculateDeal(input, DealTypeFinance)
	if financeResult.NegativeEquity != 4000 {
		t.Errorf("Finance deal NegativeEquity = %v, expected 4000", financeResult.NegativeEquity)
	}
	if financeResult.NegEquityHandled != "rolled" {
		t.Errorf("Finance deal should handle neg equity as 'rolled', got '%s'", financeResult.NegEquityHandled)
	}
}

func TestAmortizationSchedule(t *testing.T) {
	principal := 20000.0
	apr := 6.0
	term := 60
	startDate := "2024-01-01"

	schedule := GenerateAmortizationSchedule(principal, apr, term, startDate)

	// Verify correct number of payments
	if len(schedule) != term {
		t.Errorf("Schedule has %d payments, expected %d", len(schedule), term)
	}

	// Verify first payment
	if schedule[0].PaymentNumber != 1 {
		t.Errorf("First payment number = %d, expected 1", schedule[0].PaymentNumber)
	}

	// Verify last payment has zero balance
	lastPayment := schedule[term-1]
	if lastPayment.Balance > 0.01 {
		t.Errorf("Final balance = %v, expected ~0", lastPayment.Balance)
	}

	// Verify cumulative interest increases
	for i := 1; i < len(schedule); i++ {
		if schedule[i].CumulativeInterest < schedule[i-1].CumulativeInterest {
			t.Error("Cumulative interest should not decrease")
		}
	}

	// Verify each payment = principal + interest
	for i, entry := range schedule {
		expected := entry.Principal + entry.Interest
		if !almostEqual(entry.Payment, expected, 0.02) {
			t.Errorf("Payment %d: %v != Principal %v + Interest %v",
				i+1, entry.Payment, entry.Principal, entry.Interest)
		}
	}
}

func TestZeroAPRFinancing(t *testing.T) {
	input := DealCalculationInput{
		VehiclePrice: 30000,
		DocFee:       399,
		TaxRate:      0.0825,
		APR:          0, // 0% APR
		TermMonths:   60,
	}

	result, err := CalculateDeal(input, DealTypeFinance)
	if err != nil {
		t.Fatalf("0%% APR calculation failed: %v", err)
	}

	// Verify no interest charged
	if result.TotalInterest != 0 {
		t.Errorf("TotalInterest = %v, expected 0 for 0%% APR", result.TotalInterest)
	}

	// Verify total payments equals amount financed
	if !almostEqual(result.TotalOfPayments, result.AmountFinanced, 1.00) {
		t.Errorf("TotalOfPayments = %v, expected %v for 0%% APR",
			result.TotalOfPayments, result.AmountFinanced)
	}
}
