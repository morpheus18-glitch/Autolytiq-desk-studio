//! Loan Amortization Algorithms
//!
//! Implements standard actuarial method amortization as required by
//! Truth in Lending Act (TILA) Regulation Z.
//!
//! # Key Formulas
//!
//! ## Monthly Payment Formula
//! ```text
//! M = P * [r(1+r)^n] / [(1+r)^n - 1]
//!
//! Where:
//!   M = Monthly payment
//!   P = Principal (amount financed)
//!   r = Monthly interest rate (APR / 12)
//!   n = Number of payments (term in months)
//! ```
//!
//! ## For 0% APR
//! ```text
//! M = P / n
//! ```
//!
//! # Rounding
//! Different lenders use different rounding rules:
//! - Standard: Round to nearest cent (banker's rounding)
//! - Round Up: Always round payment up
//! - Round Down: Always round payment down
//!
//! The final payment may differ to account for cumulative rounding.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::NaiveDate;

/// Rounding mode for payment calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RoundingMode {
    /// Banker's rounding (round half to even)
    #[default]
    BankersRounding,
    /// Always round up (ceiling)
    RoundUp,
    /// Always round down (floor)
    RoundDown,
}

/// Result of payment calculation
#[derive(Debug, Clone)]
pub struct PaymentResult {
    /// Monthly payment amount
    pub monthly_payment: Decimal,
    /// Total of all payments
    pub total_of_payments: Decimal,
    /// Total finance charge (interest)
    pub finance_charge: Decimal,
    /// Effective APR (may differ slightly from input due to rounding)
    pub effective_apr: Decimal,
}

/// Single amortization entry
#[derive(Debug, Clone)]
pub struct AmortizationEntry {
    /// Payment number (1-indexed)
    pub payment_number: u32,
    /// Payment due date
    pub due_date: NaiveDate,
    /// Total payment amount
    pub payment_amount: Decimal,
    /// Principal portion
    pub principal: Decimal,
    /// Interest portion
    pub interest: Decimal,
    /// Remaining balance after payment
    pub remaining_balance: Decimal,
    /// Cumulative principal paid
    pub cumulative_principal: Decimal,
    /// Cumulative interest paid
    pub cumulative_interest: Decimal,
}

/// Calculate the monthly payment for a loan.
///
/// # Arguments
/// * `principal` - Amount financed (loan amount)
/// * `apr` - Annual Percentage Rate as decimal (e.g., 0.0599 for 5.99%)
/// * `term_months` - Loan term in months
/// * `rounding` - Rounding mode for payment
///
/// # Returns
/// PaymentResult containing monthly payment, total, and finance charge
///
/// # Algorithm
/// Uses the standard PMT formula:
/// ```text
/// M = P * [r(1+r)^n] / [(1+r)^n - 1]
/// ```
///
/// # Complexity
/// - Time: O(log n) for power calculation
/// - Space: O(1)
///
/// # Invariants
/// - monthly_payment >= 0
/// - total_of_payments >= principal (when APR >= 0)
/// - finance_charge >= 0
pub fn calculate_payment(
    principal: Decimal,
    apr: Decimal,
    term_months: u32,
    rounding: RoundingMode,
) -> PaymentResult {
    // Handle edge cases
    if principal <= dec!(0) || term_months == 0 {
        return PaymentResult {
            monthly_payment: dec!(0),
            total_of_payments: dec!(0),
            finance_charge: dec!(0),
            effective_apr: dec!(0),
        };
    }

    let n = Decimal::from(term_months);

    // Handle 0% APR special case
    if apr == dec!(0) {
        let payment = round_payment(principal / n, rounding);
        let total = payment * n;
        return PaymentResult {
            monthly_payment: payment,
            total_of_payments: total,
            finance_charge: dec!(0),
            effective_apr: dec!(0),
        };
    }

    // Monthly interest rate
    let monthly_rate = apr / dec!(12);

    // Calculate (1 + r)^n
    let one_plus_r = dec!(1) + monthly_rate;
    let one_plus_r_n = power_decimal(one_plus_r, term_months);

    // PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    let numerator = principal * monthly_rate * one_plus_r_n;
    let denominator = one_plus_r_n - dec!(1);

    // Avoid division by zero
    if denominator == dec!(0) {
        return PaymentResult {
            monthly_payment: principal / n,
            total_of_payments: principal,
            finance_charge: dec!(0),
            effective_apr: dec!(0),
        };
    }

    let payment = round_payment(numerator / denominator, rounding);
    let total = payment * n;
    let finance_charge = total - principal;

    PaymentResult {
        monthly_payment: payment,
        total_of_payments: total,
        finance_charge,
        effective_apr: apr,
    }
}

/// Generate a complete amortization schedule.
///
/// # Arguments
/// * `principal` - Amount financed
/// * `apr` - Annual Percentage Rate as decimal
/// * `term_months` - Loan term in months
/// * `first_payment_date` - Date of first payment
/// * `rounding` - Rounding mode
///
/// # Returns
/// Vector of AmortizationEntry for each payment
///
/// # Algorithm
/// For each payment period:
/// 1. Calculate interest on remaining balance
/// 2. Calculate principal as payment minus interest
/// 3. Update remaining balance
/// 4. Adjust final payment to zero out balance
///
/// # Complexity
/// - Time: O(n) where n = term_months
/// - Space: O(n) for storing schedule
///
/// # Invariants
/// - Sum of all principal = original principal (within rounding)
/// - Final remaining_balance = 0
/// - All entries have payment_number in [1, term_months]
pub fn generate_amortization_schedule(
    principal: Decimal,
    apr: Decimal,
    term_months: u32,
    first_payment_date: NaiveDate,
    rounding: RoundingMode,
) -> Vec<AmortizationEntry> {
    let payment_result = calculate_payment(principal, apr, term_months, rounding);
    let monthly_rate = apr / dec!(12);
    let payment = payment_result.monthly_payment;

    let mut schedule = Vec::with_capacity(term_months as usize);
    let mut balance = principal;
    let mut cumulative_principal = dec!(0);
    let mut cumulative_interest = dec!(0);

    for i in 1..=term_months {
        let due_date = add_months(first_payment_date, i - 1);

        // Calculate interest for this period
        let interest = round_payment(balance * monthly_rate, rounding);

        // Calculate principal portion
        let principal_portion = if i == term_months {
            // Final payment: clear remaining balance
            balance
        } else {
            let p = payment - interest;
            // Ensure principal doesn't go negative
            p.max(dec!(0))
        };

        // Calculate actual payment (may differ on final payment)
        let actual_payment = if i == term_months {
            // Final payment includes any rounding adjustment
            principal_portion + interest
        } else {
            payment
        };

        // Update balance
        balance = (balance - principal_portion).max(dec!(0));

        // Update cumulative totals
        cumulative_principal = cumulative_principal + principal_portion;
        cumulative_interest = cumulative_interest + interest;

        schedule.push(AmortizationEntry {
            payment_number: i,
            due_date,
            payment_amount: round_to_cents(actual_payment),
            principal: round_to_cents(principal_portion),
            interest: round_to_cents(interest),
            remaining_balance: round_to_cents(balance),
            cumulative_principal: round_to_cents(cumulative_principal),
            cumulative_interest: round_to_cents(cumulative_interest),
        });
    }

    schedule
}

/// Calculate APR from a known payment (reverse calculation).
///
/// Uses Newton-Raphson method to find APR given payment, principal, and term.
///
/// # Arguments
/// * `principal` - Amount financed
/// * `payment` - Monthly payment
/// * `term_months` - Loan term in months
///
/// # Returns
/// Calculated APR as decimal
///
/// # Algorithm
/// Newton-Raphson iteration to solve:
/// ```text
/// f(r) = P * [r(1+r)^n] / [(1+r)^n - 1] - M = 0
/// ```
///
/// # Complexity
/// - Time: O(k) where k = iterations (typically < 20)
/// - Space: O(1)
pub fn calculate_apr_from_payment(
    principal: Decimal,
    payment: Decimal,
    term_months: u32,
) -> Decimal {
    if principal <= dec!(0) || payment <= dec!(0) || term_months == 0 {
        return dec!(0);
    }

    let n = Decimal::from(term_months);

    // If payment * n <= principal, APR is 0 or negative
    if payment * n <= principal {
        return dec!(0);
    }

    // Initial guess: simple interest approximation
    let total_interest = payment * n - principal;
    let mut monthly_rate = total_interest / principal / n;

    // Newton-Raphson iteration
    let tolerance = dec!(0.0000001);
    let max_iterations = 100;

    for _ in 0..max_iterations {
        let one_plus_r = dec!(1) + monthly_rate;
        let one_plus_r_n = power_decimal(one_plus_r, term_months);

        // f(r) = P * [r(1+r)^n] / [(1+r)^n - 1] - M
        let numerator = principal * monthly_rate * one_plus_r_n;
        let denominator = one_plus_r_n - dec!(1);

        if denominator == dec!(0) {
            break;
        }

        let f = numerator / denominator - payment;

        // f'(r) - derivative is complex, use numerical approximation
        let delta = dec!(0.0000001);
        let r_plus = monthly_rate + delta;
        let one_plus_r_plus = dec!(1) + r_plus;
        let one_plus_r_plus_n = power_decimal(one_plus_r_plus, term_months);

        let f_plus = principal * r_plus * one_plus_r_plus_n / (one_plus_r_plus_n - dec!(1)) - payment;
        let derivative = (f_plus - f) / delta;

        if derivative == dec!(0) {
            break;
        }

        let adjustment = f / derivative;
        monthly_rate = monthly_rate - adjustment;

        if adjustment.abs() < tolerance {
            break;
        }
    }

    // Convert monthly rate to APR
    (monthly_rate * dec!(12)).round_dp(6)
}

/// Calculate (1 + r)^n efficiently using binary exponentiation.
///
/// # Complexity
/// - Time: O(log n)
/// - Space: O(1)
fn power_decimal(base: Decimal, exp: u32) -> Decimal {
    if exp == 0 {
        return dec!(1);
    }

    let mut result = dec!(1);
    let mut current_base = base;
    let mut remaining_exp = exp;

    while remaining_exp > 0 {
        if remaining_exp % 2 == 1 {
            result = result * current_base;
        }
        current_base = current_base * current_base;
        remaining_exp /= 2;
    }

    result
}

/// Round a payment amount according to the specified mode.
fn round_payment(amount: Decimal, mode: RoundingMode) -> Decimal {
    match mode {
        RoundingMode::BankersRounding => amount.round_dp(2),
        RoundingMode::RoundUp => {
            let cents = (amount * dec!(100)).ceil();
            cents / dec!(100)
        }
        RoundingMode::RoundDown => {
            let cents = (amount * dec!(100)).floor();
            cents / dec!(100)
        }
    }
}

/// Round to cents (2 decimal places).
fn round_to_cents(amount: Decimal) -> Decimal {
    amount.round_dp(2)
}

/// Add months to a date, handling month-end properly.
fn add_months(date: NaiveDate, months: u32) -> NaiveDate {
    use chrono::Datelike;

    let total_months = date.month() as i32 + months as i32 - 1;
    let year = date.year() + total_months / 12;
    let month = (total_months % 12) as u32 + 1;

    // Handle day overflow
    let max_day = days_in_month(year, month);
    let day = date.day().min(max_day);

    NaiveDate::from_ymd_opt(year, month, day).unwrap_or(date)
}

/// Get number of days in a month.
fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap_year(year) { 29 } else { 28 },
        _ => 30,
    }
}

/// Check if year is a leap year.
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_payment() {
        // $20,000 at 6% for 60 months
        let result = calculate_payment(
            dec!(20000),
            dec!(0.06),
            60,
            RoundingMode::BankersRounding,
        );

        // Expected payment is approximately $386.66
        assert!(result.monthly_payment > dec!(386) && result.monthly_payment < dec!(387));
        assert!(result.finance_charge > dec!(0));
        assert_eq!(result.total_of_payments, result.monthly_payment * dec!(60));
    }

    #[test]
    fn test_zero_apr() {
        let result = calculate_payment(
            dec!(12000),
            dec!(0),
            60,
            RoundingMode::BankersRounding,
        );

        assert_eq!(result.monthly_payment, dec!(200));
        assert_eq!(result.total_of_payments, dec!(12000));
        assert_eq!(result.finance_charge, dec!(0));
    }

    #[test]
    fn test_amortization_invariants() {
        let schedule = generate_amortization_schedule(
            dec!(20000),
            dec!(0.06),
            60,
            NaiveDate::from_ymd_opt(2024, 8, 1).unwrap(),
            RoundingMode::BankersRounding,
        );

        // Should have 60 entries
        assert_eq!(schedule.len(), 60);

        // First entry should be payment 1
        assert_eq!(schedule[0].payment_number, 1);

        // Last entry should be payment 60
        assert_eq!(schedule[59].payment_number, 60);

        // Final balance should be 0
        assert_eq!(schedule[59].remaining_balance, dec!(0));

        // Total principal should equal original principal
        let total_principal: Decimal = schedule.iter().map(|e| e.principal).sum();
        let diff = (total_principal - dec!(20000)).abs();
        assert!(diff < dec!(0.02), "Total principal {} should equal $20,000", total_principal);
    }

    #[test]
    fn test_amortization_interest_decreases() {
        let schedule = generate_amortization_schedule(
            dec!(20000),
            dec!(0.06),
            60,
            NaiveDate::from_ymd_opt(2024, 8, 1).unwrap(),
            RoundingMode::BankersRounding,
        );

        // Interest should generally decrease over time
        let first_interest = schedule[0].interest;
        let last_interest = schedule[59].interest;

        assert!(first_interest > last_interest,
            "First interest {} should be greater than last {}",
            first_interest, last_interest);
    }

    #[test]
    fn test_apr_calculation() {
        // First calculate payment, then reverse-calculate APR
        let result = calculate_payment(dec!(20000), dec!(0.06), 60, RoundingMode::BankersRounding);
        let calculated_apr = calculate_apr_from_payment(dec!(20000), result.monthly_payment, 60);

        // Should be close to 6%
        let diff = (calculated_apr - dec!(0.06)).abs();
        assert!(diff < dec!(0.001), "Calculated APR {} should be close to 6%", calculated_apr);
    }

    #[test]
    fn test_power_decimal() {
        assert_eq!(power_decimal(dec!(2), 0), dec!(1));
        assert_eq!(power_decimal(dec!(2), 1), dec!(2));
        assert_eq!(power_decimal(dec!(2), 10), dec!(1024));
        assert_eq!(power_decimal(dec!(1.005), 60).round_dp(4), dec!(1.3489));
    }

    #[test]
    fn test_rounding_modes() {
        let amount = dec!(123.456);

        assert_eq!(round_payment(amount, RoundingMode::BankersRounding), dec!(123.46));
        assert_eq!(round_payment(amount, RoundingMode::RoundUp), dec!(123.46));
        assert_eq!(round_payment(amount, RoundingMode::RoundDown), dec!(123.45));

        let amount2 = dec!(123.454);
        assert_eq!(round_payment(amount2, RoundingMode::BankersRounding), dec!(123.45));
        assert_eq!(round_payment(amount2, RoundingMode::RoundUp), dec!(123.46));
        assert_eq!(round_payment(amount2, RoundingMode::RoundDown), dec!(123.45));
    }
}
