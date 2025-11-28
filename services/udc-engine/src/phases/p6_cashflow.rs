//! P6 - Cashflow Generation
//!
//! Generates detailed payment schedules and amortization tables:
//! - Finance: Full amortization schedule with principal/interest split
//! - Lease: Payment schedule with tax breakdown per payment
//! - Cash: No cashflow (single payment)
//!
//! # Amortization Method
//! Uses standard Actuarial Method (simple interest) as required by
//! Truth in Lending Act (TILA) Regulation Z.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::{NaiveDate, Duration, Datelike};

use crate::types::{DealType, Money, AmortizationEntry, UdcResult, UdcError};
use super::p5_structure::{StructuredDeal, DealStructure};

/// Deal with generated cashflow/amortization
#[derive(Debug, Clone)]
pub struct CashflowDeal {
    /// The structured deal
    pub deal: StructuredDeal,
    /// Generated cashflow (None for cash deals)
    pub cashflow: Option<Cashflow>,
}

/// Cashflow information for the deal
#[derive(Debug, Clone)]
pub enum Cashflow {
    /// Finance amortization schedule
    Finance(FinanceCashflow),
    /// Lease payment schedule
    Lease(LeaseCashflow),
}

/// Finance deal cashflow (amortization)
#[derive(Debug, Clone)]
pub struct FinanceCashflow {
    /// First payment date
    pub first_payment_date: NaiveDate,
    /// Payment day of month
    pub payment_day: u8,
    /// Full amortization schedule
    pub schedule: Vec<AmortizationEntry>,
    /// Total interest (finance charge)
    pub total_interest: Money,
    /// Odd days interest (if deferred first payment)
    pub odd_days_interest: Money,
}

/// Lease deal cashflow
#[derive(Debug, Clone)]
pub struct LeaseCashflow {
    /// First payment date
    pub first_payment_date: NaiveDate,
    /// Payment day of month
    pub payment_day: u8,
    /// Payment schedule
    pub schedule: Vec<LeasePaymentEntry>,
    /// Total of all payments (excluding drive-off)
    pub total_payments: Money,
}

/// Single lease payment entry
#[derive(Debug, Clone)]
pub struct LeasePaymentEntry {
    /// Payment number (1-indexed)
    pub payment_number: u16,
    /// Due date
    pub due_date: NaiveDate,
    /// Base payment (before tax)
    pub base_payment: Money,
    /// Tax portion
    pub tax: Money,
    /// Total payment
    pub total_payment: Money,
}

/// P6: Generate cashflow schedules.
///
/// # Algorithm
///
/// ## Finance Amortization
/// For each payment:
/// ```text
/// interest = remaining_balance * (apr / 12)
/// principal = payment - interest
/// new_balance = remaining_balance - principal
/// ```
///
/// ## Lease Schedule
/// For each payment:
/// ```text
/// base_payment = constant (from P5)
/// tax = base_payment * tax_rate (if monthly tax mode)
/// total = base_payment + tax
/// ```
///
/// # Date Handling
/// - First payment typically 30-45 days from deal date
/// - Payments on same day of month
/// - Handles month-end adjustments (e.g., 31st -> 30th for Apr, Jun, etc.)
///
/// # Complexity
/// - Time: O(n) where n = number of payments
/// - Space: O(n) for storing schedule
pub fn generate_cashflow(deal: StructuredDeal) -> UdcResult<CashflowDeal> {
    let deal_type = deal.deal.deal.deal.deal.input.inner.deal_type;

    log::debug!("P6: Generating cashflow for {:?} deal", deal_type);

    let cashflow = match &deal.structure {
        DealStructure::Cash(_) => None,
        DealStructure::Finance(f) => Some(Cashflow::Finance(generate_finance_cashflow(&deal, f)?)),
        DealStructure::Lease(l) => Some(Cashflow::Lease(generate_lease_cashflow(&deal, l)?)),
    };

    Ok(CashflowDeal { deal, cashflow })
}

/// Generate finance amortization schedule
fn generate_finance_cashflow(
    deal: &StructuredDeal,
    structure: &crate::phases::p5_structure::FinanceStructure,
) -> UdcResult<FinanceCashflow> {
    let input = &deal.deal.deal.deal.deal.input;

    // Determine first payment date (default: 30 days from deal date)
    let deal_date = input.inner.deal_date.unwrap_or_else(|| chrono::Local::now().date_naive());
    let first_payment_date = input.inner.first_payment_date
        .unwrap_or_else(|| add_days(deal_date, 30));

    let payment_day = first_payment_date.day() as u8;

    // Generate amortization schedule
    // p5_structure uses raw Decimal values, not Money wrapper types
    let mut schedule = Vec::with_capacity(structure.term_months as usize);
    let mut remaining = structure.amount_financed;
    let monthly_rate = structure.apr / dec!(12);
    let payment = structure.monthly_payment;

    let mut total_interest = Decimal::ZERO;

    for i in 0..structure.term_months {
        let payment_num = (i + 1) as u16;
        let due_date = add_months(first_payment_date, i as i32);

        // Calculate interest and principal
        let interest = (remaining * monthly_rate).round_dp(2);
        let principal = if payment_num as u32 == structure.term_months {
            // Final payment: clear remaining balance
            remaining
        } else {
            (payment - interest).max(Decimal::ZERO)
        };

        remaining = (remaining - principal).max(Decimal::ZERO);
        total_interest = total_interest + interest;

        schedule.push(AmortizationEntry {
            payment_number: payment_num,
            due_date,
            payment_amount: Money::new(if payment_num as u32 == structure.term_months {
                principal + interest
            } else {
                payment
            }),
            principal: Money::new(principal),
            interest: Money::new(interest),
            remaining_balance: Money::new(remaining),
        });
    }

    Ok(FinanceCashflow {
        first_payment_date,
        payment_day,
        schedule,
        total_interest: Money::new(total_interest),
        odd_days_interest: Money::ZERO, // Simplified - would calculate based on actual days
    })
}

/// Generate lease payment schedule
fn generate_lease_cashflow(
    deal: &StructuredDeal,
    structure: &crate::phases::p5_structure::LeaseStructure,
) -> UdcResult<LeaseCashflow> {
    let input = &deal.deal.deal.deal.deal.input;

    // Determine first payment date
    let deal_date = input.inner.deal_date.unwrap_or_else(|| chrono::Local::now().date_naive());
    let first_payment_date = input.inner.first_payment_date
        .unwrap_or_else(|| deal_date); // Lease first payment often at signing

    let payment_day = first_payment_date.day() as u8;

    // Generate payment schedule
    let mut schedule = Vec::with_capacity(structure.term_months as usize);
    let mut total_payments = Money::ZERO;

    for i in 0..structure.term_months {
        let payment_num = (i + 1) as u16;
        let due_date = if i == 0 {
            first_payment_date
        } else {
            add_months(first_payment_date, i as i32)
        };

        // p5_structure uses raw Decimal values, wrap them in Money
        let entry = LeasePaymentEntry {
            payment_number: payment_num,
            due_date,
            base_payment: Money::new(structure.base_monthly_payment),
            tax: Money::new(structure.monthly_tax),
            total_payment: Money::new(structure.total_monthly_payment),
        };

        total_payments = total_payments + entry.total_payment;
        schedule.push(entry);
    }

    Ok(LeaseCashflow {
        first_payment_date,
        payment_day,
        schedule,
        total_payments,
    })
}

/// Add days to a date
fn add_days(date: NaiveDate, days: i64) -> NaiveDate {
    date + Duration::days(days)
}

/// Add months to a date, handling month-end properly
fn add_months(date: NaiveDate, months: i32) -> NaiveDate {
    let year = date.year() + (date.month() as i32 + months - 1) / 12;
    let month = ((date.month() as i32 + months - 1) % 12 + 1) as u32;
    let day = date.day().min(days_in_month(year, month));

    NaiveDate::from_ymd_opt(year, month, day)
        .unwrap_or(date)
}

/// Get days in a month
fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) { 29 } else { 28 }
        }
        _ => 30,
    }
}

/// Check if year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_months() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        assert_eq!(add_months(date, 1), NaiveDate::from_ymd_opt(2024, 2, 15).unwrap());
        assert_eq!(add_months(date, 12), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
    }

    #[test]
    fn test_add_months_end_of_month() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();
        // Feb 31 doesn't exist, should become Feb 29 (leap year)
        assert_eq!(add_months(date, 1), NaiveDate::from_ymd_opt(2024, 2, 29).unwrap());
    }

    #[test]
    fn test_leap_year() {
        assert!(is_leap_year(2024));
        assert!(!is_leap_year(2023));
        assert!(!is_leap_year(2100));
        assert!(is_leap_year(2000));
    }
}
