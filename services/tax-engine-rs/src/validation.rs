//! Input Validation Module for WASM Boundary
//!
//! Provides comprehensive validation for all input types at the WASM boundary.
//! This prevents garbage-in-garbage-out calculations by validating inputs
//! before any computation occurs.
//!
//! # Design Philosophy
//!
//! 1. **Fail Fast**: Return clear errors immediately for invalid inputs
//! 2. **Complete Validation**: Check all constraints in one pass
//! 3. **Clear Error Messages**: Explain exactly what's wrong and how to fix it
//! 4. **WASM Boundary Focus**: These validations run at the JS/WASM interface

use crate::deal_types::{DealInput, DealTypeEnum, FinanceInput, LeaseInput};
use crate::dag::DagInput;
use crate::types::TaxCalculationInput;

// ============================================================================
// Valid State Codes
// ============================================================================

/// All valid US state codes (50 states + DC)
const VALID_STATE_CODES: [&str; 51] = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC",
];

/// Check if a state code is valid
pub fn is_valid_state_code(code: &str) -> bool {
    let upper = code.to_uppercase();
    VALID_STATE_CODES.contains(&upper.as_str())
}

// ============================================================================
// Validation Result Type
// ============================================================================

/// Result of validation - either Ok or a list of error messages
pub type ValidationResult = Result<(), Vec<String>>;

/// Helper to convert validation errors to a single error string
pub fn validation_errors_to_string(errors: Vec<String>) -> String {
    if errors.len() == 1 {
        format!("Validation error: {}", errors[0])
    } else {
        format!("Validation errors:\n- {}", errors.join("\n- "))
    }
}

// ============================================================================
// DealInput Validation
// ============================================================================

impl DealInput {
    /// Validate all fields of the DealInput at the WASM boundary
    ///
    /// This should be called immediately after JSON deserialization,
    /// before any calculations occur.
    pub fn validate(&self) -> ValidationResult {
        let mut errors = Vec::new();

        // Vehicle pricing validation
        if self.selling_price <= 0.0 {
            errors.push("Selling price must be positive".to_string());
        }

        if self.vehicle_msrp <= 0.0 {
            errors.push("Vehicle MSRP must be positive".to_string());
        }

        // MSRP should generally be >= selling price (unless it's a loss-leader deal)
        // But selling price shouldn't be more than 2x MSRP (likely data entry error)
        if self.selling_price > self.vehicle_msrp * 2.0 && self.vehicle_msrp > 0.0 {
            errors.push(format!(
                "Selling price ({:.2}) is more than 2x MSRP ({:.2}). Verify these values.",
                self.selling_price, self.vehicle_msrp
            ));
        }

        // State code validation
        if !is_valid_state_code(&self.state_code) {
            errors.push(format!(
                "Invalid state code: '{}'. Must be a valid US state code (e.g., 'TX', 'CA', 'NY').",
                self.state_code
            ));
        }

        // Cash down validation
        if self.cash_down < 0.0 {
            errors.push("Cash down cannot be negative".to_string());
        }

        // Trade-in validation
        if let Some(ref trade) = self.trade_in {
            if trade.gross_allowance < 0.0 {
                errors.push("Trade-in gross allowance cannot be negative".to_string());
            }
            if trade.payoff_amount < 0.0 {
                errors.push("Trade-in payoff amount cannot be negative".to_string());
            }
            // Payoff significantly exceeding allowance could indicate data entry error
            if trade.payoff_amount > trade.gross_allowance * 3.0 && trade.gross_allowance > 0.0 {
                errors.push(format!(
                    "Trade-in payoff ({:.2}) is more than 3x gross allowance ({:.2}). Verify negative equity is intended.",
                    trade.payoff_amount, trade.gross_allowance
                ));
            }
        }

        // Rebates validation
        for rebate in &self.rebates {
            if rebate.amount < 0.0 {
                errors.push(format!("Rebate '{}' amount cannot be negative", rebate.name));
            }
            if rebate.amount > self.selling_price {
                errors.push(format!(
                    "Rebate '{}' ({:.2}) exceeds selling price ({:.2})",
                    rebate.name, rebate.amount, self.selling_price
                ));
            }
        }

        // F&I Products validation
        for product in &self.fi_products {
            if product.price < 0.0 {
                errors.push(format!("F&I product '{}' price cannot be negative", product.name));
            }
        }

        // Fees validation
        for fee in &self.fees {
            if fee.amount < 0.0 {
                errors.push(format!("Fee '{}' amount cannot be negative", fee.name));
            }
        }

        // Deal type specific validation
        match self.deal_type {
            DealTypeEnum::Finance => {
                if self.finance_input.is_none() {
                    errors.push("Finance deal requires finance_input".to_string());
                } else if let Some(ref finance) = self.finance_input {
                    errors.extend(validate_finance_input(finance));
                }
            }
            DealTypeEnum::Lease => {
                if self.lease_input.is_none() {
                    errors.push("Lease deal requires lease_input".to_string());
                } else if let Some(ref lease) = self.lease_input {
                    errors.extend(validate_lease_input(lease, self.vehicle_msrp));
                }
            }
            DealTypeEnum::Cash => {
                // Cash deals don't require finance or lease input
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Validate finance-specific input
fn validate_finance_input(input: &FinanceInput) -> Vec<String> {
    let mut errors = Vec::new();

    // APR validation (0% to 99.9%)
    if input.apr < 0.0 {
        errors.push("APR cannot be negative".to_string());
    } else if input.apr > 99.9 {
        errors.push("APR cannot exceed 99.9%".to_string());
    }

    // Term validation (12-96 months for finance)
    if input.term_months < 12 {
        errors.push("Finance term must be at least 12 months".to_string());
    } else if input.term_months > 96 {
        errors.push("Finance term cannot exceed 96 months".to_string());
    }

    // Buy rate should not exceed sell rate
    if let Some(buy_rate) = input.buy_rate {
        if buy_rate < 0.0 {
            errors.push("Buy rate cannot be negative".to_string());
        }
        if buy_rate > input.apr {
            errors.push(format!(
                "Buy rate ({:.2}%) exceeds APR ({:.2}%)",
                buy_rate, input.apr
            ));
        }
    }

    // Lender fees validation
    if let Some(lender_fees) = input.lender_fees {
        if lender_fees < 0.0 {
            errors.push("Lender fees cannot be negative".to_string());
        }
    }

    errors
}

/// Validate lease-specific input
fn validate_lease_input(input: &LeaseInput, vehicle_msrp: f64) -> Vec<String> {
    let mut errors = Vec::new();

    // Term validation (12-60 months for lease)
    if input.term_months < 12 {
        errors.push("Lease term must be at least 12 months".to_string());
    } else if input.term_months > 60 {
        errors.push("Lease term cannot exceed 60 months".to_string());
    }

    // Money factor validation (typical range: 0.0001 to 0.005)
    if input.money_factor < 0.0 {
        errors.push("Money factor cannot be negative".to_string());
    } else if input.money_factor > 0.01 {
        errors.push(format!(
            "Money factor ({:.5}) is unusually high (equivalent to {:.1}% APR). Verify this is correct.",
            input.money_factor,
            input.money_factor * 2400.0
        ));
    }

    // Residual percent validation (typically 20-75%, but allow up to 90%)
    if input.residual_percent < 0.0 {
        errors.push("Residual percent cannot be negative".to_string());
    } else if input.residual_percent > 90.0 {
        errors.push("Residual percent cannot exceed 90%".to_string());
    } else if input.residual_percent < 20.0 {
        errors.push(format!(
            "Residual percent ({:.1}%) is unusually low. Verify this is correct.",
            input.residual_percent
        ));
    }

    // Residual value override validation
    if let Some(residual_value) = input.residual_value {
        if residual_value < 0.0 {
            errors.push("Residual value cannot be negative".to_string());
        }
        if vehicle_msrp > 0.0 && residual_value > vehicle_msrp {
            errors.push(format!(
                "Residual value ({:.2}) exceeds MSRP ({:.2})",
                residual_value, vehicle_msrp
            ));
        }
    }

    // Mileage validation
    if input.annual_mileage < 5000 {
        errors.push("Annual mileage must be at least 5,000".to_string());
    } else if input.annual_mileage > 25000 {
        errors.push(format!(
            "Annual mileage ({}) is unusually high. Standard lease mileage is 10,000-15,000.",
            input.annual_mileage
        ));
    }

    // Excess mileage rate validation (typically $0.10 to $0.35 per mile)
    if input.excess_mileage_rate < 0.0 {
        errors.push("Excess mileage rate cannot be negative".to_string());
    } else if input.excess_mileage_rate > 1.0 {
        errors.push(format!(
            "Excess mileage rate (${:.2}/mile) is unusually high. Typical range is $0.15-$0.30.",
            input.excess_mileage_rate
        ));
    }

    // Security deposit validation
    if input.security_deposit < 0.0 && !input.security_deposit_waived {
        errors.push("Security deposit cannot be negative".to_string());
    }

    // MSD validation
    if let Some(msd_count) = input.msd_count {
        if msd_count > 9 {
            errors.push("MSD count cannot exceed 9".to_string());
        }
    }

    // Acquisition fee validation
    if input.acquisition_fee < 0.0 {
        errors.push("Acquisition fee cannot be negative".to_string());
    } else if input.acquisition_fee > 2000.0 {
        errors.push(format!(
            "Acquisition fee ({:.2}) is unusually high. Typical range is $595-$1,095.",
            input.acquisition_fee
        ));
    }

    // Disposition fee validation
    if input.disposition_fee < 0.0 && !input.disposition_fee_waived {
        errors.push("Disposition fee cannot be negative".to_string());
    }

    errors
}

// ============================================================================
// TaxCalculationInput Validation
// ============================================================================

impl TaxCalculationInput {
    /// Validate tax calculation input at the WASM boundary
    pub fn validate(&self) -> ValidationResult {
        let mut errors = Vec::new();

        // State code validation
        if !is_valid_state_code(&self.state_code) {
            errors.push(format!(
                "Invalid state code: '{}'. Must be a valid US state code.",
                self.state_code
            ));
        }

        // Home state validation (if provided)
        if let Some(ref home_state) = self.home_state_code {
            if !is_valid_state_code(home_state) {
                errors.push(format!(
                    "Invalid home state code: '{}'. Must be a valid US state code.",
                    home_state
                ));
            }
        }

        // Registration state validation (if provided)
        if let Some(ref reg_state) = self.registration_state_code {
            if !is_valid_state_code(reg_state) {
                errors.push(format!(
                    "Invalid registration state code: '{}'. Must be a valid US state code.",
                    reg_state
                ));
            }
        }

        // Vehicle price validation
        if self.vehicle_price <= 0.0 {
            errors.push("Vehicle price must be positive".to_string());
        }

        // Accessories validation
        if self.accessories_amount < 0.0 {
            errors.push("Accessories amount cannot be negative".to_string());
        }

        // Trade-in validation
        if self.trade_in_value < 0.0 {
            errors.push("Trade-in value cannot be negative".to_string());
        }

        // Rebates validation
        if self.rebate_manufacturer < 0.0 {
            errors.push("Manufacturer rebate cannot be negative".to_string());
        }
        if self.rebate_dealer < 0.0 {
            errors.push("Dealer rebate cannot be negative".to_string());
        }

        // Doc fee validation
        if self.doc_fee < 0.0 {
            errors.push("Doc fee cannot be negative".to_string());
        }

        // Other fees validation
        for fee in &self.other_fees {
            if fee.amount < 0.0 {
                errors.push(format!("Fee '{}' amount cannot be negative", fee.code));
            }
        }

        // Service contracts validation
        if self.service_contracts < 0.0 {
            errors.push("Service contracts amount cannot be negative".to_string());
        }

        // GAP validation
        if self.gap < 0.0 {
            errors.push("GAP amount cannot be negative".to_string());
        }

        // Negative equity validation (should be >= 0)
        if self.negative_equity < 0.0 {
            errors.push("Negative equity amount cannot be negative (use positive value to represent negative equity)".to_string());
        }

        // Tax rates validation
        if self.rates.is_empty() {
            errors.push("At least one tax rate must be provided".to_string());
        }
        for rate in &self.rates {
            if rate.rate < 0.0 {
                errors.push(format!("Tax rate for '{}' cannot be negative", rate.label));
            }
            if rate.rate > 1.0 {
                errors.push(format!(
                    "Tax rate for '{}' ({:.4}) appears to be in percentage form. Use decimal (e.g., 0.07 for 7%).",
                    rate.label, rate.rate
                ));
            }
        }

        // Lease-specific validation
        if let Some(gross_cap_cost) = self.gross_cap_cost {
            if gross_cap_cost <= 0.0 {
                errors.push("Gross cap cost must be positive".to_string());
            }
        }

        if let Some(base_payment) = self.base_payment {
            if base_payment < 0.0 {
                errors.push("Base payment cannot be negative".to_string());
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

// ============================================================================
// DagInput Validation
// ============================================================================

impl DagInput {
    /// Validate DAG input at the WASM boundary
    pub fn validate(&self) -> ValidationResult {
        let mut errors = Vec::new();

        // State code validation
        if !is_valid_state_code(&self.transaction_state) {
            errors.push(format!(
                "Invalid transaction state code: '{}'. Must be a valid US state code.",
                self.transaction_state
            ));
        }

        if !is_valid_state_code(&self.home_state) {
            errors.push(format!(
                "Invalid home state code: '{}'. Must be a valid US state code.",
                self.home_state
            ));
        }

        if let Some(ref garaging_state) = self.garaging_state {
            if !is_valid_state_code(garaging_state) {
                errors.push(format!(
                    "Invalid garaging state code: '{}'. Must be a valid US state code.",
                    garaging_state
                ));
            }
        }

        // Vehicle price validation
        if self.vehicle_price <= 0.0 {
            errors.push("Vehicle price must be positive".to_string());
        }

        // Trade validation
        if self.trade_value < 0.0 {
            errors.push("Trade value cannot be negative".to_string());
        }
        if self.trade_payoff < 0.0 {
            errors.push("Trade payoff cannot be negative".to_string());
        }

        // Rebates validation
        if self.rebates < 0.0 {
            errors.push("Rebates cannot be negative".to_string());
        }

        // Fees validation
        if self.doc_fee < 0.0 {
            errors.push("Doc fee cannot be negative".to_string());
        }
        if self.other_fees < 0.0 {
            errors.push("Other fees cannot be negative".to_string());
        }

        // Down payment validation
        if self.down_payment < 0.0 {
            errors.push("Down payment cannot be negative".to_string());
        }

        // APR validation
        if self.apr < 0.0 {
            errors.push("APR cannot be negative".to_string());
        } else if self.apr > 99.9 {
            errors.push("APR cannot exceed 99.9%".to_string());
        }

        // Term validation
        if self.term_months == 0 {
            errors.push("Finance term must be at least 1 month".to_string());
        } else if self.term_months > 120 {
            errors.push("Finance term cannot exceed 120 months".to_string());
        }

        // Money factor validation
        if self.money_factor < 0.0 {
            errors.push("Money factor cannot be negative".to_string());
        }

        // Residual validation
        if self.residual_value < 0.0 {
            errors.push("Residual value cannot be negative".to_string());
        }

        // Lease term validation
        if self.lease_term_months == 0 {
            errors.push("Lease term must be at least 1 month".to_string());
        } else if self.lease_term_months > 84 {
            errors.push("Lease term cannot exceed 84 months".to_string());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

// ============================================================================
// Primitive Value Validation Functions
// ============================================================================

/// Validate finance payment inputs
pub fn validate_finance_payment_inputs(
    principal: f64,
    apr: f64,
    term_months: u16,
) -> ValidationResult {
    let mut errors = Vec::new();

    if principal <= 0.0 {
        errors.push("Principal must be positive".to_string());
    }

    if apr < 0.0 {
        errors.push("APR cannot be negative".to_string());
    } else if apr > 99.9 {
        errors.push("APR cannot exceed 99.9%".to_string());
    }

    if term_months == 0 {
        errors.push("Term must be at least 1 month".to_string());
    } else if term_months > 120 {
        errors.push("Term cannot exceed 120 months".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate payment matrix inputs
pub fn validate_payment_matrix_inputs(amount_financed: f64, base_apr: f64) -> ValidationResult {
    let mut errors = Vec::new();

    if amount_financed <= 0.0 {
        errors.push("Amount financed must be positive".to_string());
    }

    if base_apr < 0.0 {
        errors.push("Base APR cannot be negative".to_string());
    } else if base_apr > 99.9 {
        errors.push("Base APR cannot exceed 99.9%".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate amortization schedule inputs
pub fn validate_amortization_inputs(
    principal: f64,
    apr: f64,
    term_months: u16,
    start_date: &str,
) -> ValidationResult {
    let mut errors = validate_finance_payment_inputs(principal, apr, term_months)
        .err()
        .unwrap_or_default();

    // Basic date format validation (YYYY-MM-DD)
    if !start_date.is_empty() {
        let parts: Vec<&str> = start_date.split('-').collect();
        if parts.len() != 3 {
            errors.push("Start date must be in YYYY-MM-DD format".to_string());
        } else {
            // Validate year
            if let Ok(year) = parts[0].parse::<u16>() {
                if year < 2000 || year > 2100 {
                    errors.push("Start date year must be between 2000 and 2100".to_string());
                }
            } else {
                errors.push("Invalid year in start date".to_string());
            }

            // Validate month
            if let Ok(month) = parts[1].parse::<u8>() {
                if month < 1 || month > 12 {
                    errors.push("Start date month must be between 1 and 12".to_string());
                }
            } else {
                errors.push("Invalid month in start date".to_string());
            }

            // Validate day
            if let Ok(day) = parts[2].parse::<u8>() {
                if day < 1 || day > 31 {
                    errors.push("Start date day must be between 1 and 31".to_string());
                }
            } else {
                errors.push("Invalid day in start date".to_string());
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate lease residual inputs
pub fn validate_residual_inputs(msrp: f64, residual_percent: f64) -> ValidationResult {
    let mut errors = Vec::new();

    if msrp <= 0.0 {
        errors.push("MSRP must be positive".to_string());
    }

    if residual_percent < 0.0 {
        errors.push("Residual percent cannot be negative".to_string());
    } else if residual_percent > 100.0 {
        errors.push("Residual percent cannot exceed 100%".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate state codes for reciprocity lookup
pub fn validate_state_codes_for_reciprocity(
    home_state: &str,
    transaction_state: &str,
    garaging_state: &str,
) -> ValidationResult {
    let mut errors = Vec::new();

    if !is_valid_state_code(home_state) {
        errors.push(format!(
            "Invalid home state code: '{}'. Must be a valid US state code.",
            home_state
        ));
    }

    if !is_valid_state_code(transaction_state) {
        errors.push(format!(
            "Invalid transaction state code: '{}'. Must be a valid US state code.",
            transaction_state
        ));
    }

    // Garaging state is optional (can be empty)
    if !garaging_state.is_empty() && !is_valid_state_code(garaging_state) {
        errors.push(format!(
            "Invalid garaging state code: '{}'. Must be a valid US state code.",
            garaging_state
        ));
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::deal_types::{DealTypeEnum, PaymentFrequency, RebateTypeEnum};

    fn create_valid_deal_input() -> DealInput {
        DealInput {
            deal_type: DealTypeEnum::Finance,
            state_code: "TX".to_string(),
            local_jurisdiction: None,
            vehicle_msrp: 40000.0,
            vehicle_invoice: Some(36000.0),
            selling_price: 38000.0,
            trade_in: None,
            rebates: vec![],
            cash_down: 5000.0,
            fi_products: vec![],
            fees: vec![],
            finance_input: Some(FinanceInput {
                apr: 5.9,
                term_months: 60,
                first_payment_days: None,
                payment_frequency: PaymentFrequency::Monthly,
                lender_name: None,
                lender_fees: None,
                buy_rate: None,
                cap_rate: None,
            }),
            lease_input: None,
        }
    }

    #[test]
    fn test_valid_state_codes() {
        assert!(is_valid_state_code("TX"));
        assert!(is_valid_state_code("tx")); // Case insensitive
        assert!(is_valid_state_code("CA"));
        assert!(is_valid_state_code("DC"));
        assert!(!is_valid_state_code("XX"));
        assert!(!is_valid_state_code(""));
        assert!(!is_valid_state_code("USA"));
    }

    #[test]
    fn test_valid_deal_input() {
        let input = create_valid_deal_input();
        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_invalid_selling_price() {
        let mut input = create_valid_deal_input();
        input.selling_price = 0.0;
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("Selling price")));
    }

    #[test]
    fn test_invalid_state_code() {
        let mut input = create_valid_deal_input();
        input.state_code = "XX".to_string();
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("Invalid state code")));
    }

    #[test]
    fn test_invalid_apr() {
        let mut input = create_valid_deal_input();
        input.finance_input.as_mut().unwrap().apr = 150.0;
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("APR")));
    }

    #[test]
    fn test_invalid_term_months() {
        let mut input = create_valid_deal_input();
        input.finance_input.as_mut().unwrap().term_months = 6;
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("term")));
    }

    #[test]
    fn test_finance_deal_requires_finance_input() {
        let mut input = create_valid_deal_input();
        input.deal_type = DealTypeEnum::Finance;
        input.finance_input = None;
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("finance_input")));
    }

    #[test]
    fn test_lease_deal_requires_lease_input() {
        let mut input = create_valid_deal_input();
        input.deal_type = DealTypeEnum::Lease;
        input.finance_input = None;
        input.lease_input = None;
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("lease_input")));
    }

    #[test]
    fn test_validate_finance_payment_inputs() {
        // Valid inputs
        assert!(validate_finance_payment_inputs(25000.0, 5.9, 60).is_ok());

        // Invalid principal
        assert!(validate_finance_payment_inputs(0.0, 5.9, 60).is_err());
        assert!(validate_finance_payment_inputs(-1000.0, 5.9, 60).is_err());

        // Invalid APR
        assert!(validate_finance_payment_inputs(25000.0, -1.0, 60).is_err());
        assert!(validate_finance_payment_inputs(25000.0, 100.0, 60).is_err());

        // Invalid term
        assert!(validate_finance_payment_inputs(25000.0, 5.9, 0).is_err());
        assert!(validate_finance_payment_inputs(25000.0, 5.9, 150).is_err());
    }

    #[test]
    fn test_validate_state_codes_for_reciprocity() {
        // Valid
        assert!(validate_state_codes_for_reciprocity("TX", "IN", "").is_ok());
        assert!(validate_state_codes_for_reciprocity("TX", "IN", "TX").is_ok());

        // Invalid home state
        assert!(validate_state_codes_for_reciprocity("XX", "IN", "").is_err());

        // Invalid transaction state
        assert!(validate_state_codes_for_reciprocity("TX", "XX", "").is_err());

        // Invalid garaging state (when provided)
        assert!(validate_state_codes_for_reciprocity("TX", "IN", "XX").is_err());
    }

    #[test]
    fn test_validation_errors_to_string() {
        let single = vec!["Single error".to_string()];
        assert_eq!(
            validation_errors_to_string(single),
            "Validation error: Single error"
        );

        let multiple = vec![
            "Error one".to_string(),
            "Error two".to_string(),
        ];
        let result = validation_errors_to_string(multiple);
        assert!(result.contains("Error one"));
        assert!(result.contains("Error two"));
        assert!(result.contains("Validation errors"));
    }

    #[test]
    fn test_selling_price_too_high_warning() {
        let mut input = create_valid_deal_input();
        input.selling_price = 100000.0; // 2.5x MSRP
        let result = input.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("more than 2x MSRP")));
    }
}
