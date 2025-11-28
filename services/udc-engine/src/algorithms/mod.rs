//! Core algorithms for the UDC engine.
//!
//! This module contains the pure mathematical algorithms used throughout
//! the calculation pipeline. These are designed to be:
//! - Deterministic (same input = same output)
//! - Side-effect free
//! - Thoroughly tested
//!
//! # Algorithm Categories
//!
//! ## Tax Algorithms
//! - Tax base calculation
//! - Rate application
//! - Reciprocity credit
//! - Special state taxes (TAVT, HUT, Excise)
//!
//! ## Finance Algorithms
//! - Loan payment calculation
//! - Amortization schedule generation
//! - APR calculation
//! - Finance charge computation
//!
//! ## Lease Algorithms
//! - Cap cost calculation
//! - Depreciation calculation
//! - Rent charge calculation
//! - Money factor conversion

pub mod amortization;
pub mod lease;
pub mod tax;

// Re-export main functions
pub use amortization::{
    calculate_payment,
    generate_amortization_schedule,
    calculate_apr_from_payment,
};
pub use lease::{
    calculate_lease_payment,
    money_factor_to_apr,
    apr_to_money_factor,
    calculate_rent_charge,
    calculate_depreciation,
};
pub use tax::{
    calculate_tax_base,
    apply_tax_rate,
    calculate_reciprocity_credit,
};
