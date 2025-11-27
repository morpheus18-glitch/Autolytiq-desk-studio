//! Finance Calculator Module
//!
//! Comprehensive retail installment (finance) calculations.
//! Handles:
//! - Monthly payment calculation (amortization formula)
//! - APR/interest calculations
//! - Total interest and finance charge
//! - Full amortization schedules
//! - Multiple payment scenarios
//! - TILA disclosure calculations

use crate::deal_types::*;

// ============================================================================
// Core Finance Calculations
// ============================================================================

/// Calculate monthly payment using standard amortization formula
///
/// Formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
/// Where:
/// - P = Principal (amount financed)
/// - r = Monthly interest rate (APR / 12 / 100)
/// - n = Number of payments (term in months)
pub fn calculate_payment(principal: f64, apr: f64, term_months: u16) -> f64 {
    if principal <= 0.0 || term_months == 0 {
        return 0.0;
    }

    // Handle 0% APR
    if apr <= 0.0 {
        return round_payment(principal / term_months as f64);
    }

    let monthly_rate = apr / 100.0 / 12.0;
    let n = term_months as f64;

    let numerator = monthly_rate * (1.0 + monthly_rate).powf(n);
    let denominator = (1.0 + monthly_rate).powf(n) - 1.0;

    if denominator.abs() < f64::EPSILON {
        return round_payment(principal / n);
    }

    round_payment(principal * (numerator / denominator))
}

/// Calculate payment for different frequencies (bi-weekly, weekly)
pub fn calculate_payment_frequency(
    principal: f64,
    apr: f64,
    term_months: u16,
    frequency: PaymentFrequency,
) -> f64 {
    if principal <= 0.0 || term_months == 0 {
        return 0.0;
    }

    let periods_per_year = frequency.periods_per_year();
    let total_periods = (term_months as f64 / 12.0 * periods_per_year).round() as u16;

    // Handle 0% APR
    if apr <= 0.0 {
        return round_payment(principal / total_periods as f64);
    }

    let periodic_rate = apr / 100.0 / periods_per_year;
    let n = total_periods as f64;

    let numerator = periodic_rate * (1.0 + periodic_rate).powf(n);
    let denominator = (1.0 + periodic_rate).powf(n) - 1.0;

    if denominator.abs() < f64::EPSILON {
        return round_payment(principal / n);
    }

    round_payment(principal * (numerator / denominator))
}

/// Calculate total interest over the life of the loan
pub fn calculate_total_interest(principal: f64, payment: f64, term_months: u16) -> f64 {
    let total_payments = payment * term_months as f64;
    (total_payments - principal).max(0.0)
}

/// Calculate total of all payments
pub fn calculate_total_of_payments(payment: f64, term_months: u16) -> f64 {
    payment * term_months as f64
}

/// Calculate APR from payment amount (reverse calculation)
/// Uses Newton-Raphson method for iterative solution
pub fn calculate_apr_from_payment(
    principal: f64,
    payment: f64,
    term_months: u16,
) -> f64 {
    if principal <= 0.0 || payment <= 0.0 || term_months == 0 {
        return 0.0;
    }

    // If payment equals simple division, APR is 0
    let simple_payment = principal / term_months as f64;
    if (payment - simple_payment).abs() < 0.01 {
        return 0.0;
    }

    // Initial guess
    let mut apr = 5.0;
    let tolerance = 0.0001;
    let max_iterations = 100;

    for _ in 0..max_iterations {
        let calculated_payment = calculate_payment(principal, apr, term_months);
        let diff = calculated_payment - payment;

        if diff.abs() < tolerance {
            break;
        }

        // Adjust APR based on difference
        if diff > 0.0 {
            apr -= apr * 0.1;
        } else {
            apr += apr * 0.1;
        }

        // Clamp to reasonable range
        apr = apr.clamp(0.01, 99.9);
    }

    round_rate(apr)
}

/// Calculate finance charge (TILA)
/// Finance charge includes all costs of credit
pub fn calculate_finance_charge(
    amount_financed: f64,
    total_of_payments: f64,
    prepaid_finance_charges: f64,
) -> f64 {
    (total_of_payments - amount_financed + prepaid_finance_charges).max(0.0)
}

// ============================================================================
// Amount Financed Calculations
// ============================================================================

/// Calculate amount financed for a retail deal
pub fn calculate_amount_financed(
    selling_price: f64,
    trade_allowance: f64,
    trade_payoff: f64,
    rebates: f64,
    cash_down: f64,
    total_taxes: f64,
    total_fees: f64,
    fi_products: f64,
    prepaid_charges: f64,
) -> f64 {
    let net_trade = trade_allowance - trade_payoff;

    let amount = selling_price
        - rebates
        - cash_down
        - net_trade.max(0.0) // Only positive equity reduces amount financed
        + net_trade.min(0.0).abs() // Negative equity adds to amount financed
        + total_taxes
        + total_fees
        + fi_products
        - prepaid_charges;

    amount.max(0.0)
}

// ============================================================================
// Amortization Schedule
// ============================================================================

/// Generate full amortization schedule
pub fn generate_amortization_schedule(
    principal: f64,
    apr: f64,
    term_months: u16,
    start_date: &str,
) -> AmortizationSchedule {
    let monthly_payment = calculate_payment(principal, apr, term_months);
    let monthly_rate = apr / 100.0 / 12.0;

    let mut payments = Vec::with_capacity(term_months as usize);
    let mut balance = principal;
    let mut cumulative_interest = 0.0;
    let mut cumulative_principal = 0.0;

    // Parse start date (format: YYYY-MM-DD)
    let date_parts: Vec<&str> = start_date.split('-').collect();
    let mut year: i32 = date_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(2024);
    let mut month: u32 = date_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);

    for payment_number in 1..=term_months {
        let beginning_balance = balance;

        // Calculate interest for this period
        let interest = if apr > 0.0 {
            round_currency(beginning_balance * monthly_rate)
        } else {
            0.0
        };

        // Last payment adjustment
        let (payment, principal_payment) = if payment_number == term_months {
            // Final payment pays off remaining balance
            let final_principal = beginning_balance;
            let final_interest = interest;
            let final_payment = final_principal + final_interest;
            (final_payment, final_principal)
        } else {
            let principal_portion = monthly_payment - interest;
            (monthly_payment, principal_portion)
        };

        balance -= principal_payment;
        cumulative_interest += interest;
        cumulative_principal += principal_payment;

        // Format payment date
        let payment_date = format!("{:04}-{:02}-01", year, month);

        payments.push(AmortizationPayment {
            payment_number,
            payment_date,
            beginning_balance: round_currency(beginning_balance),
            scheduled_payment: round_currency(payment),
            principal: round_currency(principal_payment),
            interest: round_currency(interest),
            ending_balance: round_currency(balance.max(0.0)),
            cumulative_interest: round_currency(cumulative_interest),
            cumulative_principal: round_currency(cumulative_principal),
        });

        // Advance date
        month += 1;
        if month > 12 {
            month = 1;
            year += 1;
        }
    }

    let total_payments: f64 = payments.iter().map(|p| p.scheduled_payment).sum();

    AmortizationSchedule {
        payments,
        summary: AmortizationSummary {
            total_payments: round_currency(total_payments),
            total_principal: round_currency(cumulative_principal),
            total_interest: round_currency(cumulative_interest),
            average_payment: round_currency(total_payments / term_months as f64),
        },
    }
}

// ============================================================================
// Payment Matrix
// ============================================================================

/// Generate payment matrix for multiple term/rate scenarios
pub fn generate_payment_matrix(
    amount_financed: f64,
    base_apr: f64,
    terms: &[u16],
    rate_variations: &[f64],
) -> PaymentMatrix {
    let mut scenarios = Vec::new();

    for &term in terms {
        for &rate_delta in rate_variations {
            let rate = (base_apr + rate_delta).max(0.0);
            let payment = calculate_payment(amount_financed, rate, term);
            let total_interest = calculate_total_interest(amount_financed, payment, term);
            let total_cost = payment * term as f64;

            scenarios.push(PaymentScenario {
                term_months: term,
                rate: round_rate(rate),
                payment: round_currency(payment),
                total_interest: round_currency(total_interest),
                total_cost: round_currency(total_cost),
            });
        }
    }

    // Sort by term, then by rate
    scenarios.sort_by(|a, b| {
        a.term_months
            .cmp(&b.term_months)
            .then_with(|| a.rate.partial_cmp(&b.rate).unwrap_or(std::cmp::Ordering::Equal))
    });

    PaymentMatrix { scenarios }
}

/// Generate quick payment scenarios for common terms
pub fn generate_quick_scenarios(amount_financed: f64, apr: f64) -> Vec<PaymentScenario> {
    let terms = [24, 36, 48, 60, 72, 84];
    terms
        .iter()
        .map(|&term| {
            let payment = calculate_payment(amount_financed, apr, term);
            let total_interest = calculate_total_interest(amount_financed, payment, term);
            PaymentScenario {
                term_months: term,
                rate: apr,
                payment: round_currency(payment),
                total_interest: round_currency(total_interest),
                total_cost: round_currency(payment * term as f64),
            }
        })
        .collect()
}

// ============================================================================
// Reserve Calculations
// ============================================================================

/// Calculate dealer reserve (markup income)
pub fn calculate_dealer_reserve(
    amount_financed: f64,
    buy_rate: f64,
    sell_rate: f64,
    term_months: u16,
    flat_reserve: Option<f64>,
) -> f64 {
    // If flat reserve is provided, use it
    if let Some(flat) = flat_reserve {
        return flat;
    }

    // Calculate based on rate spread
    let rate_spread = (sell_rate - buy_rate).max(0.0);
    if rate_spread <= 0.0 || amount_financed <= 0.0 {
        return 0.0;
    }

    // Simplified reserve calculation (actual varies by lender)
    // Typically: spread * principal * term factor
    let term_factor = match term_months {
        0..=24 => 1.0,
        25..=36 => 1.5,
        37..=48 => 2.0,
        49..=60 => 2.5,
        61..=72 => 2.75,
        _ => 3.0,
    };

    round_currency(amount_financed * (rate_spread / 100.0) * term_factor)
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Round to standard payment precision (cents)
fn round_payment(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

/// Round to currency precision (cents)
fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

/// Round rate to standard precision
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
    fn test_payment_calculation() {
        // $25,000 at 5.9% for 60 months = ~$482.10
        let payment = calculate_payment(25000.0, 5.9, 60);
        assert!((payment - 482.10).abs() < 0.10);
    }

    #[test]
    fn test_zero_apr_payment() {
        // $24,000 at 0% for 60 months = $400.00
        let payment = calculate_payment(24000.0, 0.0, 60);
        assert_eq!(payment, 400.0);
    }

    #[test]
    fn test_total_interest() {
        let payment = calculate_payment(25000.0, 5.9, 60);
        let total_interest = calculate_total_interest(25000.0, payment, 60);
        // Total interest should be around $3,926
        assert!((total_interest - 3926.0).abs() < 100.0);
    }

    #[test]
    fn test_amortization_schedule() {
        let schedule = generate_amortization_schedule(25000.0, 5.9, 60, "2024-01-01");

        // Should have 60 payments
        assert_eq!(schedule.payments.len(), 60);

        // First payment
        let first = &schedule.payments[0];
        assert_eq!(first.payment_number, 1);
        assert_eq!(first.beginning_balance, 25000.0);

        // Last payment should have zero ending balance
        let last = schedule.payments.last().unwrap();
        assert!(last.ending_balance < 0.01);

        // Total interest should match
        assert!((schedule.summary.total_interest - 3926.0).abs() < 100.0);
    }

    #[test]
    fn test_payment_matrix() {
        let matrix = generate_payment_matrix(25000.0, 5.9, &[36, 48, 60, 72], &[0.0]);

        // Should have 4 scenarios (4 terms x 1 rate)
        assert_eq!(matrix.scenarios.len(), 4);

        // 36-month payment should be higher than 60-month
        let p36 = matrix.scenarios.iter().find(|s| s.term_months == 36).unwrap();
        let p60 = matrix.scenarios.iter().find(|s| s.term_months == 60).unwrap();
        assert!(p36.payment > p60.payment);
    }

    #[test]
    fn test_dealer_reserve() {
        // $25,000 with 1% spread over 60 months
        let reserve = calculate_dealer_reserve(25000.0, 4.9, 5.9, 60, None);
        // Should be around $625 (25000 * 0.01 * 2.5)
        assert!((reserve - 625.0).abs() < 50.0);
    }
}
