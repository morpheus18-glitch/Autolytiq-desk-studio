//! Main UDC Engine
//!
//! This module provides the primary entry point for running deal calculations.
//! The engine orchestrates the 8-phase pipeline and handles error recovery.
//!
//! # Usage
//!
//! ```rust,ignore
//! use udc_engine::{run_udc, DealInput, RuleProfile};
//!
//! let result = run_udc(deal_input, rule_profile, None, None)?;
//! println!("Monthly payment: {:?}", result.monthly_payment());
//! ```

use crate::types::{
    DealInput, UdcOutput, UdcResult, UdcError,
    RuleProfile, ProgramProfile, ProductProfile,
};
use crate::phases;

/// Engine configuration options
#[derive(Debug, Clone, Default)]
pub struct EngineConfig {
    /// Enable detailed audit trace logging
    pub enable_audit_trace: bool,

    /// Enable strict validation mode (fail on warnings)
    pub strict_validation: bool,

    /// Maximum calculation time in milliseconds (0 = no limit)
    pub timeout_ms: u64,

    /// Enable parallel phase execution where possible
    pub enable_parallel: bool,
}

/// Main entry point for UDC calculations.
///
/// Takes a deal input and configuration profiles, runs through all 8 phases,
/// and returns the complete calculation output.
///
/// # Arguments
///
/// * `input` - The deal input containing all deal parameters
/// * `rule_profile` - State tax rules for the governing jurisdiction
/// * `program_profile` - Optional lender/lessor program profile
/// * `product_profiles` - Optional F&I product profiles
///
/// # Returns
///
/// Complete `UdcOutput` containing tax breakdown, payment details,
/// disclosures, and audit trace.
///
/// # Errors
///
/// Returns `UdcError` if:
/// - Input validation fails (P0)
/// - Required profiles are missing
/// - Calculation errors occur in any phase
///
/// # Example
///
/// ```rust,ignore
/// let output = run_udc(
///     deal_input,
///     rule_profile,
///     Some(program_profile),
///     Some(product_profiles),
/// )?;
///
/// println!("Tax: ${}", output.tax_breakdown.net_tax);
/// println!("Payment: ${}", output.monthly_payment().unwrap_or_default());
/// ```
pub fn run_udc(
    input: DealInput,
    rule_profile: RuleProfile,
    program_profile: Option<ProgramProfile>,
    product_profiles: Option<Vec<ProductProfile>>,
) -> UdcResult<UdcOutput> {
    run_udc_with_config(
        input,
        rule_profile,
        program_profile,
        product_profiles,
        EngineConfig::default(),
    )
}

/// Run UDC with custom configuration.
///
/// See `run_udc` for basic usage. This variant allows customizing
/// engine behavior through `EngineConfig`.
pub fn run_udc_with_config(
    input: DealInput,
    rule_profile: RuleProfile,
    program_profile: Option<ProgramProfile>,
    product_profiles: Option<Vec<ProductProfile>>,
    config: EngineConfig,
) -> UdcResult<UdcOutput> {
    log::info!(
        "UDC Engine starting: {:?} deal for {:?}",
        input.deal_type,
        input.home_state // DealInput from deal_input.rs has home_state field
    );

    let start_time = std::time::Instant::now();

    // Serialize profiles to JSON for pipeline
    let rule_json = serde_json::to_string(&rule_profile)
        .map_err(|e| UdcError::serialization(format!("Failed to serialize rule profile: {}", e)))?;

    let program_json = program_profile
        .as_ref()
        .map(|p| serde_json::to_string(p))
        .transpose()
        .map_err(|e| UdcError::serialization(format!("Failed to serialize program profile: {}", e)))?;

    let products_json = product_profiles
        .as_ref()
        .map(|p| serde_json::to_string(p))
        .transpose()
        .map_err(|e| UdcError::serialization(format!("Failed to serialize product profiles: {}", e)))?;

    // Execute pipeline
    let output = phases::execute_pipeline(
        input,
        &rule_json,
        program_json.as_deref(),
        products_json.as_deref(),
    )?;

    let duration_ms = start_time.elapsed().as_millis() as u64;
    log::info!("UDC Engine completed in {}ms", duration_ms);

    Ok(output)
}

/// Run UDC from JSON inputs (for WASM/FFI).
///
/// This is a convenience function that accepts JSON strings directly,
/// useful for FFI boundaries and WASM integration.
///
/// # Arguments
///
/// * `deal_json` - JSON-encoded `DealInput`
/// * `rules_json` - JSON-encoded `RuleProfile`
/// * `program_json` - Optional JSON-encoded `ProgramProfile`
/// * `products_json` - Optional JSON-encoded array of `ProductProfile`
///
/// # Returns
///
/// JSON-encoded `UdcOutput` or error message.
pub fn run_udc_json(
    deal_json: &str,
    rules_json: &str,
    program_json: Option<&str>,
    products_json: Option<&str>,
) -> Result<String, String> {
    // Parse deal input
    let input: DealInput = serde_json::from_str(deal_json)
        .map_err(|e| format!("Failed to parse deal input: {}", e))?;

    // Parse rule profile
    let rules: RuleProfile = serde_json::from_str(rules_json)
        .map_err(|e| format!("Failed to parse rule profile: {}", e))?;

    // Parse optional program profile
    let program: Option<ProgramProfile> = program_json
        .map(|json| serde_json::from_str(json))
        .transpose()
        .map_err(|e| format!("Failed to parse program profile: {}", e))?;

    // Parse optional product profiles
    let products: Option<Vec<ProductProfile>> = products_json
        .map(|json| serde_json::from_str(json))
        .transpose()
        .map_err(|e| format!("Failed to parse product profiles: {}", e))?;

    // Run engine
    let output = run_udc(input, rules, program, products)
        .map_err(|e| format!("Calculation error: {}", e))?;

    // Serialize output
    serde_json::to_string(&output)
        .map_err(|e| format!("Failed to serialize output: {}", e))
}

/// Validate deal input without running full calculation.
///
/// Useful for pre-validation before committing to a deal.
pub fn validate_deal(input: &DealInput) -> UdcResult<Vec<String>> {
    // Run P0 normalization to validate
    let result = phases::normalize_deal_input(input.clone());

    match result {
        Ok(normalized) => {
            // Return any warnings from normalization
            Ok(vec![]) // Simplified - would return actual warnings
        }
        Err(e) => Err(e),
    }
}

/// Calculate tax only (without full structure calculation).
///
/// Useful for tax estimates before finalizing deal terms.
pub fn calculate_tax_only(
    input: DealInput,
    rule_profile: RuleProfile,
) -> UdcResult<crate::types::TaxBreakdown> {
    // Run P0-P4 only
    let normalized = phases::normalize_deal_input(input)?;
    let routed = phases::route_deal(normalized)?;
    let jurisdictioned = phases::resolve_jurisdiction(routed)?;

    let rule_json = serde_json::to_string(&rule_profile)
        .map_err(|e| UdcError::serialization(e.to_string()))?;

    let profiled = phases::load_profiles(jurisdictioned)?;
    let taxed = phases::calculate_tax(profiled)?;

    // Convert TaxCalculation to TaxBreakdown for API compatibility
    Ok(crate::types::TaxBreakdown {
        net_tax: crate::types::Money::new(taxed.tax.net_tax),
        gross_tax: crate::types::Money::new(taxed.tax.primary_tax),
        reciprocity_credit: crate::types::Money::new(taxed.tax.reciprocity_credit),
        effective_rate: crate::types::Rate::from_decimal(taxed.tax.effective_rate),
        tax_base: crate::types::Money::new(taxed.tax.tax_base),
        special_tax_type: taxed.tax.special_tax.as_ref().map(|s| s.name.clone()),
        trade_in_applied: taxed.tax.base_breakdown.trade_credit_applied > rust_decimal_macros::dec!(0),
        trade_in_credit_used: crate::types::Money::new(taxed.tax.base_breakdown.trade_credit_applied),
        rebates_applied: taxed.tax.base_breakdown.rebates_applied > rust_decimal_macros::dec!(0),
        rebate_amount_used: crate::types::Money::new(taxed.tax.base_breakdown.rebates_applied),
        line_items: taxed.tax.components.iter().map(|c| crate::types::TaxLineItem {
            name: c.name.clone(),
            level: match c.level {
                crate::phases::p4_tax_cipher::TaxLevel::State => "State".to_string(),
                crate::phases::p4_tax_cipher::TaxLevel::County => "County".to_string(),
                crate::phases::p4_tax_cipher::TaxLevel::City => "City".to_string(),
                crate::phases::p4_tax_cipher::TaxLevel::District => "District".to_string(),
                crate::phases::p4_tax_cipher::TaxLevel::Special => "Special".to_string(),
            },
            rate: crate::types::Rate::from_decimal(c.rate),
            taxable_base: crate::types::Money::new(c.base),
            tax_amount: crate::types::Money::new(c.amount),
            is_credit: false,
        }).collect(),
    })
}

/// Get engine version information.
pub fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Get engine build information.
pub fn engine_info() -> EngineInfo {
    EngineInfo {
        version: env!("CARGO_PKG_VERSION"),
        name: env!("CARGO_PKG_NAME"),
        features: get_enabled_features(),
    }
}

/// Engine build information
#[derive(Debug, Clone)]
pub struct EngineInfo {
    pub version: &'static str,
    pub name: &'static str,
    pub features: Vec<&'static str>,
}

fn get_enabled_features() -> Vec<&'static str> {
    let mut features = vec![];

    #[cfg(feature = "wasm")]
    features.push("wasm");

    #[cfg(feature = "audit_trace")]
    features.push("audit_trace");

    #[cfg(feature = "strict_validation")]
    features.push("strict_validation");

    features
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealFees, CustomerInfo, FinanceParams, StateCode};
    use rust_decimal_macros::dec;

    fn make_test_input() -> DealInput {
        DealInput {
            deal_type: crate::types::DealType::Finance,
            vehicle_price: dec!(30000),
            trade_in_value: None,
            trade_in_payoff: None,
            cash_down: dec!(3000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: StateCode::TX,
            transaction_state: StateCode::TX,
            garaging_state: None,
            customer: CustomerInfo::default(),
            finance_params: Some(FinanceParams {
                term_months: 60,
                apr: dec!(0.0599),
                lender_id: None,
                buy_rate: None,
                max_reserve_points: None,
                deferred_first_payment: false,
                days_to_first_payment: None,
            }),
            lease_params: None,
            deal_date: None,
            first_payment_date: None,
        }
    }

    #[test]
    fn test_engine_version() {
        let version = engine_version();
        assert!(!version.is_empty());
    }

    #[test]
    fn test_engine_info() {
        let info = engine_info();
        assert_eq!(info.name, "udc-engine");
    }

    #[test]
    fn test_validate_deal() {
        let input = make_test_input();
        let result = validate_deal(&input);
        assert!(result.is_ok());
    }
}
