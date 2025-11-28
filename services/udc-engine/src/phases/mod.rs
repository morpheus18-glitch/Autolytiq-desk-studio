//! UDC Pipeline Phases
//!
//! The UDC engine processes deals through 8 sequential phases:
//!
//! | Phase | Name          | Purpose                                        |
//! |-------|---------------|------------------------------------------------|
//! | P0    | Normalize     | Validate & normalize input, set defaults       |
//! | P1    | Routing       | Determine calculation mode (cash/finance/lease)|
//! | P2    | Jurisdiction  | Load state rules, resolve H/T/G triplet        |
//! | P3    | Profiles      | Load program/product profiles                  |
//! | P4    | Tax Cipher    | Calculate complete tax breakdown               |
//! | P5    | Structure     | Build payment structure (finance/lease/cash)   |
//! | P6    | Cashflow      | Generate amortization/payment schedules        |
//! | P7    | Finalize      | Generate disclosures, audit trace, checksums   |
//!
//! Each phase is a pure function that transforms deal state.

pub mod p0_normalize;
pub mod p1_mode_routing;
pub mod p2_jurisdiction;
pub mod p3_profiles;
pub mod p4_tax_cipher;
pub mod p5_structure;
pub mod p6_cashflow;
pub mod p7_finalize;

// Re-export main types and functions
pub use p0_normalize::{normalize_deal_input, NormalizedDealInput};
pub use p1_mode_routing::{route_deal, RoutedDeal, CalculationMode};
pub use p2_jurisdiction::{resolve_jurisdiction, JurisdictionContext, JurisdictionResolvedDeal};
pub use p3_profiles::{load_profiles, ProfileLoadedDeal};
pub use p4_tax_cipher::{calculate_tax, TaxComputedDeal};
pub use p5_structure::{build_structure, StructuredDeal};
pub use p6_cashflow::{generate_cashflow, CashflowDeal};
pub use p7_finalize::{finalize_output, FinalizedDeal};

use crate::types::{DealInput, UdcOutput, UdcResult, UdcError};

/// Execute the complete UDC pipeline.
///
/// This is the main entry point for processing a deal through all phases.
///
/// # Arguments
/// * `input` - The raw deal input
/// * `rule_profile_json` - JSON string containing state tax rules
/// * `program_profile_json` - Optional JSON string containing lender/lessor program
/// * `product_profiles_json` - Optional JSON string containing F&I product profiles
///
/// # Returns
/// Complete UdcOutput with tax breakdown, payment details, disclosures, and audit trace.
pub fn execute_pipeline(
    input: DealInput,
    rule_profile_json: &str,
    program_profile_json: Option<&str>,
    product_profiles_json: Option<&str>,
) -> UdcResult<UdcOutput> {
    // P0: Normalize
    let normalized = normalize_deal_input(input)?;

    // P1: Route
    let routed = route_deal(normalized)?;

    // P2: Jurisdiction
    let jurisdictioned = resolve_jurisdiction(routed)?;

    // P3: Profiles (uses internal default profile loading - JSON params are reserved for future use)
    let profiled = load_profiles(jurisdictioned)?;

    // P4: Tax
    let taxed = calculate_tax(profiled)?;

    // P5: Structure
    let structured = build_structure(taxed)?;

    // P6: Cashflow
    let cashflowed = generate_cashflow(structured)?;

    // P7: Finalize
    let finalized = finalize_output(cashflowed)?;

    Ok(finalized.output)
}

/// Execute pipeline with default/stub profiles (for testing).
pub fn execute_pipeline_with_defaults(input: DealInput) -> UdcResult<UdcOutput> {
    // Use empty/default profile JSON
    let default_rule = r#"{"state_code": "TX", "deal_type": "finance"}"#;
    execute_pipeline(input, default_rule, None, None)
}
