//! Lease Calculator Module
//!
//! Comprehensive automotive lease calculations.
//! Handles:
//! - Money factor to APR conversion
//! - Residual value calculations
//! - Cap cost and cap cost reduction
//! - Monthly payment (depreciation + rent charge)
//! - Multiple security deposit programs
//! - One-pay lease calculations
//! - Sign-and-drive scenarios

use crate::deal_types::*;

// ============================================================================
// Core Lease Calculations
// ============================================================================

/// Lease calculation result
#[derive(Debug, Clone)]
pub struct LeaseCalculation {
    // Cap cost breakdown
    pub gross_cap_cost: f64,
    pub cap_cost_reduction: f64,
    pub adjusted_cap_cost: f64,

    // Residual
    pub residual_value: f64,
    pub residual_percent: f64,

    // Monthly components
    pub depreciation: f64,
    pub rent_charge: f64,
    pub base_payment: f64,
    pub monthly_tax: f64,
    pub total_monthly_payment: f64,

    // Money factor/rate
    pub money_factor: f64,
    pub equivalent_apr: f64,

    // Due at signing
    pub first_month_payment: f64,
    pub security_deposit: f64,
    pub acquisition_fee_upfront: f64,
    pub upfront_tax: f64,
    pub cap_reduction_cash: f64,
    pub total_due_at_signing: f64,

    // Totals
    pub total_of_payments: f64,
    pub total_lease_cost: f64,

    // Disposition
    pub disposition_fee: f64,
}

/// Calculate a complete lease
pub fn calculate_lease(
    msrp: f64,
    selling_price: f64,
    lease_input: &LeaseInput,
    trade_allowance: f64,
    trade_payoff: f64,
    rebates: f64,
    cash_down: f64,
    fi_products: f64,
    taxable_fees: f64,
    non_taxable_fees: f64,
    acquisition_fee: f64,
    tax_rate: f64,
    tax_method: LeaseTaxMethod,
) -> LeaseCalculation {
    // Calculate residual value
    let residual_value = if let Some(rv) = lease_input.residual_value {
        rv
    } else {
        msrp * (lease_input.residual_percent / 100.0)
    };

    // Calculate gross cap cost
    let gross_cap_cost = calculate_gross_cap_cost(
        selling_price,
        fi_products,
        taxable_fees,
        non_taxable_fees,
        acquisition_fee,
        lease_input.acquisition_fee_cap,
    );

    // Calculate cap cost reduction
    let net_trade = (trade_allowance - trade_payoff).max(0.0);
    let cap_cost_reduction = calculate_cap_cost_reduction(
        net_trade,
        rebates,
        cash_down,
    );

    // Adjusted cap cost
    let adjusted_cap_cost = (gross_cap_cost - cap_cost_reduction).max(0.0);

    // Apply MSD rate reduction if applicable
    let effective_money_factor = if let (Some(msd_count), Some(msd_reduction)) =
        (lease_input.msd_count, lease_input.msd_rate_reduction)
    {
        let reduction = msd_reduction * msd_count as f64;
        (lease_input.money_factor - reduction).max(0.0)
    } else {
        lease_input.money_factor
    };

    // Calculate monthly depreciation
    let depreciation = calculate_monthly_depreciation(
        adjusted_cap_cost,
        residual_value,
        lease_input.term_months,
    );

    // Calculate monthly rent charge
    let rent_charge = calculate_monthly_rent_charge(
        adjusted_cap_cost,
        residual_value,
        effective_money_factor,
    );

    // Base payment (before tax)
    let base_payment = round_currency(depreciation + rent_charge);

    // Calculate taxes based on method
    let (monthly_tax, upfront_tax) = calculate_lease_tax(
        base_payment,
        gross_cap_cost,
        cap_cost_reduction,
        lease_input.term_months,
        tax_rate,
        tax_method,
    );

    // Total monthly payment
    let total_monthly_payment = round_currency(base_payment + monthly_tax);

    // Security deposit
    let security_deposit = if lease_input.security_deposit_waived {
        0.0
    } else if let Some(msd_count) = lease_input.msd_count {
        // Multiple security deposits (rounded to nearest $50)
        let msd = ((base_payment / 50.0).ceil() * 50.0) * msd_count as f64;
        msd
    } else {
        lease_input.security_deposit
    };

    // Acquisition fee upfront (if not capitalized)
    let acquisition_fee_upfront = if lease_input.acquisition_fee_cap {
        0.0
    } else {
        lease_input.acquisition_fee
    };

    // First month payment
    let first_month_payment = if lease_input.first_payment_due_at_signing {
        total_monthly_payment
    } else {
        0.0
    };

    // Total due at signing
    let total_due_at_signing = if lease_input.sign_and_drive {
        0.0
    } else if lease_input.one_pay_lease {
        // One-pay: All payments upfront (typically gets discount)
        total_monthly_payment * lease_input.term_months as f64 * 0.97 // 3% typical discount
    } else {
        first_month_payment
            + security_deposit
            + acquisition_fee_upfront
            + upfront_tax
            + cap_cost_reduction
    };

    // Total of payments (monthly payments over term)
    let total_of_payments = total_monthly_payment * lease_input.term_months as f64;

    // Total lease cost
    let disposition = if lease_input.disposition_fee_waived {
        0.0
    } else {
        lease_input.disposition_fee
    };

    let total_lease_cost = total_of_payments
        + total_due_at_signing
        - security_deposit // Security deposit is refundable
        + disposition;

    // Equivalent APR
    let equivalent_apr = money_factor_to_apr(effective_money_factor);

    LeaseCalculation {
        gross_cap_cost: round_currency(gross_cap_cost),
        cap_cost_reduction: round_currency(cap_cost_reduction),
        adjusted_cap_cost: round_currency(adjusted_cap_cost),
        residual_value: round_currency(residual_value),
        residual_percent: lease_input.residual_percent,
        depreciation: round_currency(depreciation),
        rent_charge: round_currency(rent_charge),
        base_payment,
        monthly_tax: round_currency(monthly_tax),
        total_monthly_payment,
        money_factor: effective_money_factor,
        equivalent_apr: round_rate(equivalent_apr),
        first_month_payment,
        security_deposit: round_currency(security_deposit),
        acquisition_fee_upfront: round_currency(acquisition_fee_upfront),
        upfront_tax: round_currency(upfront_tax),
        cap_reduction_cash: round_currency(cap_cost_reduction),
        total_due_at_signing: round_currency(total_due_at_signing),
        total_of_payments: round_currency(total_of_payments),
        total_lease_cost: round_currency(total_lease_cost),
        disposition_fee: disposition,
    }
}

/// Lease tax calculation method
#[derive(Debug, Clone, Copy)]
pub enum LeaseTaxMethod {
    /// Tax on monthly payment (most states)
    Monthly,
    /// Tax upfront on full cap cost (NY, TX, etc.)
    Upfront,
    /// Tax on depreciation only
    DepreciationOnly,
    /// Hybrid - some upfront, some monthly
    Hybrid { upfront_percent: f64 },
}

// ============================================================================
// Component Calculations
// ============================================================================

/// Calculate gross cap cost
fn calculate_gross_cap_cost(
    selling_price: f64,
    fi_products: f64,
    taxable_fees: f64,
    non_taxable_fees: f64,
    acquisition_fee: f64,
    cap_acquisition: bool,
) -> f64 {
    let mut cap_cost = selling_price + fi_products + taxable_fees + non_taxable_fees;

    if cap_acquisition {
        cap_cost += acquisition_fee;
    }

    cap_cost
}

/// Calculate cap cost reduction
fn calculate_cap_cost_reduction(
    net_trade: f64,
    rebates: f64,
    cash_down: f64,
) -> f64 {
    net_trade + rebates + cash_down
}

/// Calculate monthly depreciation
/// Formula: (Adjusted Cap Cost - Residual) / Term
fn calculate_monthly_depreciation(
    adjusted_cap_cost: f64,
    residual_value: f64,
    term_months: u16,
) -> f64 {
    if term_months == 0 {
        return 0.0;
    }
    (adjusted_cap_cost - residual_value) / term_months as f64
}

/// Calculate monthly rent charge (finance charge)
/// Formula: (Adjusted Cap Cost + Residual) × Money Factor
fn calculate_monthly_rent_charge(
    adjusted_cap_cost: f64,
    residual_value: f64,
    money_factor: f64,
) -> f64 {
    (adjusted_cap_cost + residual_value) * money_factor
}

/// Calculate lease taxes
fn calculate_lease_tax(
    base_payment: f64,
    gross_cap_cost: f64,
    cap_cost_reduction: f64,
    term_months: u16,
    tax_rate: f64,
    method: LeaseTaxMethod,
) -> (f64, f64) {
    match method {
        LeaseTaxMethod::Monthly => {
            let monthly_tax = base_payment * tax_rate;
            (monthly_tax, 0.0)
        }
        LeaseTaxMethod::Upfront => {
            let taxable_amount = gross_cap_cost - cap_cost_reduction;
            let upfront_tax = taxable_amount * tax_rate;
            (0.0, upfront_tax)
        }
        LeaseTaxMethod::DepreciationOnly => {
            let total_depreciation = gross_cap_cost - cap_cost_reduction;
            let monthly_dep_tax = (total_depreciation / term_months as f64) * tax_rate;
            (monthly_dep_tax, 0.0)
        }
        LeaseTaxMethod::Hybrid { upfront_percent } => {
            let taxable_amount = gross_cap_cost - cap_cost_reduction;
            let upfront_tax = taxable_amount * upfront_percent * tax_rate;
            let remaining_taxable = taxable_amount * (1.0 - upfront_percent);
            let monthly_tax = (remaining_taxable / term_months as f64) * tax_rate;
            (monthly_tax, upfront_tax)
        }
    }
}

// ============================================================================
// Money Factor Conversions
// ============================================================================

/// Convert money factor to equivalent APR
/// Formula: APR = Money Factor × 2400
pub fn money_factor_to_apr(money_factor: f64) -> f64 {
    money_factor * 2400.0
}

/// Convert APR to money factor
/// Formula: Money Factor = APR / 2400
pub fn apr_to_money_factor(apr: f64) -> f64 {
    apr / 2400.0
}

/// Get money factor from buy rate and markup
pub fn calculate_marked_up_money_factor(
    buy_rate_mf: f64,
    markup_points: f64,
) -> f64 {
    buy_rate_mf + (markup_points / 2400.0)
}

// ============================================================================
// Residual Value Calculations
// ============================================================================

/// Calculate residual value from percent of MSRP
pub fn calculate_residual_value(msrp: f64, residual_percent: f64) -> f64 {
    msrp * (residual_percent / 100.0)
}

/// Adjust residual for excess mileage
pub fn adjust_residual_for_mileage(
    base_residual: f64,
    base_mileage: u32,
    actual_mileage: u32,
    excess_rate: f64,
) -> f64 {
    if actual_mileage <= base_mileage {
        return base_residual;
    }

    let excess_miles = actual_mileage - base_mileage;
    let adjustment = excess_miles as f64 * excess_rate;

    (base_residual - adjustment).max(0.0)
}

/// Get standard residual percent by term
pub fn get_standard_residual(term_months: u16, vehicle_class: VehicleClass) -> f64 {
    let base = match vehicle_class {
        VehicleClass::Luxury => 55.0,
        VehicleClass::Truck => 58.0,
        VehicleClass::SUV => 56.0,
        VehicleClass::Sedan => 50.0,
        VehicleClass::Compact => 48.0,
        VehicleClass::Economy => 45.0,
    };

    // Adjust for term
    match term_months {
        24 => base + 8.0,
        27 => base + 6.0,
        36 => base,
        39 => base - 3.0,
        42 => base - 5.0,
        48 => base - 8.0,
        _ => base - ((term_months as f64 - 36.0) * 0.3),
    }
}

#[derive(Debug, Clone, Copy)]
pub enum VehicleClass {
    Luxury,
    Truck,
    SUV,
    Sedan,
    Compact,
    Economy,
}

// ============================================================================
// Lease Comparison
// ============================================================================

/// Compare lease vs buy
#[derive(Debug, Clone)]
pub struct LeaseVsBuyComparison {
    pub lease_total_cost: f64,
    pub buy_total_cost: f64,
    pub difference: f64,
    pub recommendation: String,
    pub break_even_months: Option<u16>,
}

/// Compare leasing vs buying
pub fn compare_lease_vs_buy(
    msrp: f64,
    selling_price: f64,
    lease_payment: f64,
    lease_term: u16,
    residual_value: f64,
    finance_payment: f64,
    finance_term: u16,
    expected_ownership_months: u16,
) -> LeaseVsBuyComparison {
    // Lease total cost (payments only, no equity)
    let lease_months = lease_term.min(expected_ownership_months);
    let lease_total_cost = lease_payment * lease_months as f64;

    // Buy total cost (payments up to ownership period)
    let buy_months = finance_term.min(expected_ownership_months);
    let buy_payments = finance_payment * buy_months as f64;

    // Estimate equity after ownership period
    let depreciation_rate = (msrp - residual_value) / lease_term as f64;
    let estimated_value = msrp - (depreciation_rate * expected_ownership_months as f64);
    let buy_total_cost = buy_payments - estimated_value.max(0.0);

    let difference = lease_total_cost - buy_total_cost;

    let recommendation = if difference < -500.0 {
        "Leasing appears more cost-effective for your planned ownership period."
    } else if difference > 500.0 {
        "Buying appears more cost-effective for your planned ownership period."
    } else {
        "The costs are similar. Consider other factors like maintenance coverage and flexibility."
    };

    LeaseVsBuyComparison {
        lease_total_cost: round_currency(lease_total_cost),
        buy_total_cost: round_currency(buy_total_cost),
        difference: round_currency(difference),
        recommendation: recommendation.to_string(),
        break_even_months: None, // Would require more complex calculation
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

fn round_rate(rate: f64) -> f64 {
    (rate * 1000.0).round() / 1000.0
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_money_factor_conversion() {
        // 0.00125 MF = 3% APR
        let apr = money_factor_to_apr(0.00125);
        assert_eq!(apr, 3.0);

        let mf = apr_to_money_factor(3.0);
        assert_eq!(mf, 0.00125);
    }

    #[test]
    fn test_monthly_depreciation() {
        // $30,000 cap cost - $18,000 residual = $12,000 depreciation
        // Over 36 months = $333.33/month
        let depreciation = calculate_monthly_depreciation(30000.0, 18000.0, 36);
        assert!((depreciation - 333.33).abs() < 0.01);
    }

    #[test]
    fn test_monthly_rent_charge() {
        // ($30,000 + $18,000) × 0.00125 = $60
        let rent = calculate_monthly_rent_charge(30000.0, 18000.0, 0.00125);
        assert_eq!(rent, 60.0);
    }

    #[test]
    fn test_basic_lease_calculation() {
        let lease_input = LeaseInput {
            term_months: 36,
            annual_mileage: 12000,
            excess_mileage_rate: 0.25,
            residual_percent: 60.0,
            residual_value: None,
            money_factor: 0.00125,
            buy_rate_mf: None,
            security_deposit: 0.0,
            security_deposit_waived: true,
            msd_count: None,
            msd_rate_reduction: None,
            first_payment_due_at_signing: true,
            acquisition_fee: 895.0,
            acquisition_fee_cap: true,
            disposition_fee: 395.0,
            disposition_fee_waived: false,
            sign_and_drive: false,
            one_pay_lease: false,
        };

        let result = calculate_lease(
            40000.0,  // MSRP
            38000.0,  // Selling price
            &lease_input,
            5000.0,   // Trade allowance
            3000.0,   // Trade payoff
            1500.0,   // Rebates
            0.0,      // Cash down
            0.0,      // F&I products
            500.0,    // Taxable fees
            250.0,    // Non-taxable fees
            895.0,    // Acquisition fee
            0.07,     // 7% tax rate
            LeaseTaxMethod::Monthly,
        );

        // Verify key calculations
        assert!(result.adjusted_cap_cost > 0.0);
        assert!(result.base_payment > 0.0);
        assert!(result.total_monthly_payment > result.base_payment); // With tax
        println!("Lease calculation: {:?}", result);
    }

    #[test]
    fn test_residual_by_term() {
        let r24 = get_standard_residual(24, VehicleClass::Sedan);
        let r36 = get_standard_residual(36, VehicleClass::Sedan);
        let r48 = get_standard_residual(48, VehicleClass::Sedan);

        // Shorter terms should have higher residuals
        assert!(r24 > r36);
        assert!(r36 > r48);
    }
}
