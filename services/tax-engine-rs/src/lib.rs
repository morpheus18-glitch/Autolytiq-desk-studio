//! Autolytiq Tax Intelligence Engine (ATIE) - Rust WASM Implementation
//!
//! High-performance automotive deal calculation engine compiled to WebAssembly.
//! Provides comprehensive calculations for:
//! - Cash deals
//! - Finance deals (retail installment)
//! - Lease deals
//! - Tax calculations (all 50 states + 10,000+ local jurisdictions)
//! - Cross-state reciprocity with 51×51 bilateral matrix
//!
//! # Architecture
//!
//! The engine uses a 3-stage DAG (Directed Acyclic Graph) pipeline:
//!
//! ```text
//! Stage 1: BASE_COMPUTE   → Stage 2: RECIP_RESOLVE → Stage 3: PAYMENT_CALC
//! (B_T, B_H, tax_raw)        (R(H,T,G), κ, credit)    (PMT, totals)
//! ```
//!
//! # Key Components
//!
//! - **Bilateral Matrix**: O(1) reciprocity lookup with entangled state pairs
//! - **Glyph System**: Compact symbolic encoding of tax rules
//! - **Chunk Composition**: Atomic, versioned rule components
//! - **Swarm Resolver**: Parallel multi-jurisdiction tax resolution
//!
//! Designed to match/exceed Reynolds, CDK, VinSolutions functionality.

// Core modules - made public for native Rust usage
pub mod calculator;
pub mod state_rules;
pub mod types;

// Deal calculation modules - made public for native Rust usage
pub mod deal_calculator;
pub mod deal_types;
pub mod finance;
pub mod lease;

// ============================================================================
// TAX INTELLIGENCE ENGINE MODULES (ATIE)
// ============================================================================

/// Bilateral reciprocity matrix with entangled state pairs
pub mod bilateral;

/// Glyph encoding/decoding system for compact rule representation
pub mod glyphs;

/// DAG computation pipeline for deterministic 3-stage calculation
pub mod dag;

/// Chunk composition system for atomic, versioned rule components
pub mod chunks;

/// Swarm jurisdiction resolver for parallel multi-jurisdiction processing
pub mod swarm;

use wasm_bindgen::prelude::*;
pub use types::*;
pub use deal_types::*;

// Re-export key functions for ergonomic native Rust usage
pub use deal_calculator::calculate_deal as calculate_deal_native;
pub use state_rules::load_all_state_rules;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages in browser
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// WASM Exported Functions - Deal Calculations
// ============================================================================

/// Calculate a complete deal (cash, finance, or lease)
///
/// This is the main entry point for deal calculations.
/// Takes JSON input and returns JSON output for easy JS interop.
#[wasm_bindgen]
pub fn calculate_deal(input_json: &str) -> Result<String, JsValue> {
    let input: DealInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse deal input: {}", e)))?;

    let result = deal_calculator::calculate_deal(&input, None)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Calculate a finance payment
///
/// Quick calculation for monthly payment given principal, APR, and term.
#[wasm_bindgen]
pub fn calculate_finance_payment(principal: f64, apr: f64, term_months: u16) -> f64 {
    finance::calculate_payment(principal, apr, term_months)
}

/// Calculate total interest for a finance deal
#[wasm_bindgen]
pub fn calculate_finance_interest(principal: f64, apr: f64, term_months: u16) -> f64 {
    let payment = finance::calculate_payment(principal, apr, term_months);
    finance::calculate_total_interest(principal, payment, term_months)
}

/// Generate payment matrix for multiple term/rate scenarios
#[wasm_bindgen]
pub fn generate_payment_matrix(
    amount_financed: f64,
    base_apr: f64,
    terms_json: &str,
) -> Result<String, JsValue> {
    let terms: Vec<u16> = serde_json::from_str(terms_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse terms: {}", e)))?;

    let matrix = finance::generate_payment_matrix(
        amount_financed,
        base_apr,
        &terms,
        &[-1.0, 0.0, 1.0, 2.0],
    );

    serde_json::to_string(&matrix)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize matrix: {}", e)))
}

/// Generate amortization schedule
#[wasm_bindgen]
pub fn generate_amortization_schedule(
    principal: f64,
    apr: f64,
    term_months: u16,
    start_date: &str,
) -> Result<String, JsValue> {
    let schedule = finance::generate_amortization_schedule(principal, apr, term_months, start_date);

    serde_json::to_string(&schedule)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize schedule: {}", e)))
}

/// Convert money factor to APR
#[wasm_bindgen]
pub fn money_factor_to_apr(money_factor: f64) -> f64 {
    lease::money_factor_to_apr(money_factor)
}

/// Convert APR to money factor
#[wasm_bindgen]
pub fn apr_to_money_factor(apr: f64) -> f64 {
    lease::apr_to_money_factor(apr)
}

/// Calculate lease residual value
#[wasm_bindgen]
pub fn calculate_residual_value(msrp: f64, residual_percent: f64) -> f64 {
    lease::calculate_residual_value(msrp, residual_percent)
}

// ============================================================================
// WASM Exported Functions - Tax Calculations (Legacy)
// ============================================================================

/// Calculate tax for a vehicle deal (WASM-exported function)
///
/// Takes JSON input and returns JSON output for easy JS interop
#[wasm_bindgen]
pub fn calculate_vehicle_tax(rules_json: &str, input_json: &str) -> Result<String, JsValue> {
    let rules: TaxRulesConfig = serde_json::from_str(rules_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse rules: {}", e)))?;

    let input: TaxCalculationInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse input: {}", e)))?;

    let result = calculator::calculate_tax(&rules, &input)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Get version info
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get tax rules for a specific state (WASM-exported function)
#[wasm_bindgen]
pub fn get_state_rules(state_code: &str) -> Result<String, JsValue> {
    let all_rules = state_rules::load_all_state_rules();

    match all_rules.get(state_code) {
        Some(rules) => serde_json::to_string(rules)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize rules: {}", e))),
        None => Err(JsValue::from_str(&format!("No rules found for state: {}", state_code)))
    }
}

/// Get list of all supported states
#[wasm_bindgen]
pub fn get_supported_states() -> String {
    let states = vec![
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
    ];
    serde_json::to_string(&states).unwrap_or_else(|_| "[]".to_string())
}

/// Get default tax rate for a state
#[wasm_bindgen]
pub fn get_state_tax_rate(state_code: &str) -> f64 {
    // Combined state + average local rate
    match state_code {
        "AL" => 0.06, "AK" => 0.0, "AZ" => 0.076, "AR" => 0.09, "CA" => 0.0825,
        "CO" => 0.079, "CT" => 0.0635, "DE" => 0.0, "FL" => 0.07, "GA" => 0.07,
        "HI" => 0.045, "ID" => 0.06, "IL" => 0.0875, "IN" => 0.07, "IA" => 0.07,
        "KS" => 0.095, "KY" => 0.06, "LA" => 0.0945, "ME" => 0.055, "MD" => 0.06,
        "MA" => 0.0625, "MI" => 0.06, "MN" => 0.07, "MS" => 0.07, "MO" => 0.0823,
        "MT" => 0.0, "NE" => 0.075, "NV" => 0.0785, "NH" => 0.0, "NJ" => 0.06625,
        "NM" => 0.08125, "NY" => 0.085, "NC" => 0.03, "ND" => 0.07, "OH" => 0.0775,
        "OK" => 0.09, "OR" => 0.0, "PA" => 0.08, "RI" => 0.07, "SC" => 0.09,
        "SD" => 0.065, "TN" => 0.095, "TX" => 0.0825, "UT" => 0.0735, "VT" => 0.07,
        "VA" => 0.053, "WA" => 0.095, "WV" => 0.06, "WI" => 0.056, "WY" => 0.06,
        "DC" => 0.06,
        _ => 0.07, // Default
    }
}

// ============================================================================
// WASM Exported Functions - Tax Intelligence Engine (ATIE)
// ============================================================================

/// Execute the DAG pipeline for a deal with reciprocity
///
/// This is the main entry point for the new Tax Intelligence Engine.
/// Uses the 3-stage DAG pipeline: BASE_COMPUTE → RECIP_RESOLVE → PAYMENT_CALC
///
/// # Input JSON Format
/// ```json
/// {
///   "vehicle_price": 30000.0,
///   "trade_value": 5000.0,
///   "trade_payoff": 3000.0,
///   "rebates": 1500.0,
///   "doc_fee": 299.0,
///   "other_fees": 150.0,
///   "down_payment": 2000.0,
///   "apr": 5.9,
///   "term_months": 60,
///   "transaction_state": "TX",
///   "home_state": "IN",
///   "deal_type": "RETAIL"
/// }
/// ```
#[wasm_bindgen]
pub fn calculate_deal_with_reciprocity(input_json: &str) -> Result<String, JsValue> {
    let input: dag::DagInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse DAG input: {}", e)))?;

    let tax_dag = dag::TaxDag::new();
    let result = tax_dag.execute(&input)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Resolve reciprocity between two states
///
/// Returns the reciprocity regime and kappa factor for a state pair.
///
/// # Arguments
/// * `home_state` - Where vehicle will be registered (H)
/// * `transaction_state` - Where deal closes (T)
/// * `garaging_state` - Where vehicle will be kept (G, optional - defaults to home)
/// * `deal_type` - "RETAIL" or "LEASE"
#[wasm_bindgen]
pub fn resolve_state_reciprocity(
    home_state: &str,
    transaction_state: &str,
    garaging_state: &str,
    deal_type: &str,
) -> Result<String, JsValue> {
    let matrix = bilateral::BilateralMatrix::load_default();

    let dt = match deal_type.to_uppercase().as_str() {
        "LEASE" => bilateral::DealTypeRecip::Lease,
        _ => bilateral::DealTypeRecip::Retail,
    };

    let garaging = if garaging_state.is_empty() { home_state } else { garaging_state };

    let (regime, kappa) = bilateral::resolve_reciprocity(
        &matrix,
        home_state,
        transaction_state,
        garaging,
        dt,
    );

    let result = serde_json::json!({
        "regime": regime,
        "kappa": kappa,
        "home_state": home_state.to_uppercase(),
        "transaction_state": transaction_state.to_uppercase(),
        "garaging_state": garaging.to_uppercase(),
        "deal_type": deal_type.to_uppercase(),
    });

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e)))
}

/// Get entangled pair for two states (both directions)
///
/// Returns reciprocity info for both A→B and B→A directions.
#[wasm_bindgen]
pub fn get_entangled_pair(state_a: &str, state_b: &str) -> Result<String, JsValue> {
    let matrix = bilateral::BilateralMatrix::load_default();
    let pair = matrix.lookup_entangled(state_a, state_b);

    serde_json::to_string(&pair)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e)))
}

/// Resolve jurisdictions for a location and calculate tax
///
/// Uses the swarm resolver for parallel multi-jurisdiction processing.
///
/// # Input JSON Format
/// ```json
/// {
///   "state_code": "TX",
///   "taxable_amount": 30000.0,
///   "jurisdiction_codes": ["TX_DALLAS"],
///   "address": {
///     "city": "Dallas",
///     "state": "TX",
///     "zip": "75201"
///   }
/// }
/// ```
#[wasm_bindgen]
pub fn resolve_jurisdictions(input_json: &str) -> Result<String, JsValue> {
    let input: swarm::SwarmInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse swarm input: {}", e)))?;

    let coordinator = swarm::SwarmCoordinator::new();
    let result = coordinator.resolve(&input);

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e)))
}

/// Get state glyph representation
///
/// Returns the compact glyph encoding for a state's tax rules.
///
/// Example output: "IN_v3 = ◆●○○▼★"
#[wasm_bindgen]
pub fn get_state_glyph(state_code: &str) -> Result<String, JsValue> {
    let registry = glyphs::GlyphRegistry::load_default();

    match registry.get_state(state_code) {
        Some(glyph) => Ok(glyph.to_symbol_string()),
        None => Err(JsValue::from_str(&format!("No glyph found for state: {}", state_code)))
    }
}

/// Get all state glyphs as a formatted string
#[wasm_bindgen]
pub fn get_all_state_glyphs() -> String {
    let registry = glyphs::GlyphRegistry::load_default();
    registry.to_glyph_file()
}

/// Get composed state rule from chunks
///
/// Returns the full state rule composed from atomic chunks.
#[wasm_bindgen]
pub fn get_composed_state_rule(state_code: &str) -> Result<String, JsValue> {
    let registry = chunks::ChunkRegistry::load_default();

    match registry.get_state(state_code) {
        Some(rule) => serde_json::to_string(rule)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e))),
        None => Err(JsValue::from_str(&format!("No rule found for state: {}", state_code)))
    }
}

/// Get bilateral matrix statistics
#[wasm_bindgen]
pub fn get_bilateral_matrix_stats() -> String {
    let matrix = bilateral::BilateralMatrix::load_default();
    let stats = matrix.stats();

    serde_json::to_string(&stats).unwrap_or_else(|_| "{}".to_string())
}

/// Get DAG statistics
#[wasm_bindgen]
pub fn get_dag_stats() -> String {
    let dag = dag::TaxDag::new();
    let stats = dag.stats();

    serde_json::to_string(&stats).unwrap_or_else(|_| "{}".to_string())
}

/// Get Tax Intelligence Engine version
#[wasm_bindgen]
pub fn get_atie_version() -> String {
    "1.0.0-alpha".to_string()
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_interface() {
        let rules_json = r#"{
            "state_code": "IN",
            "version": 1,
            "trade_in_policy": {"type": "FULL"},
            "rebates": [],
            "doc_fee_taxable": false,
            "fee_tax_rules": [],
            "tax_on_accessories": true,
            "tax_on_negative_equity": false,
            "tax_on_service_contracts": false,
            "tax_on_gap": false,
            "vehicle_tax_scheme": "STATE_ONLY",
            "vehicle_uses_local_sales_tax": false,
            "lease_rules": {
                "method": "MONTHLY",
                "tax_cap_reduction": false,
                "rebate_behavior": "FOLLOW_RETAIL_RULE",
                "doc_fee_taxability": "FOLLOW_RETAIL_RULE",
                "trade_in_credit": "FOLLOW_RETAIL_RULE",
                "negative_equity_taxable": false,
                "fee_tax_rules": [],
                "title_fee_rules": [],
                "tax_fees_upfront": true
            },
            "reciprocity": {
                "enabled": false,
                "scope": "NONE",
                "home_state_behavior": "NONE",
                "require_proof_of_tax_paid": false,
                "basis": "TAX_PAID",
                "cap_at_this_states_tax": true,
                "has_lease_exception": false
            }
        }"#;

        let input_json = r#"{
            "state_code": "IN",
            "deal_type": "RETAIL",
            "vehicle_price": 30000.0,
            "trade_allowance": 5000.0
        }"#;

        let result_json = calculate_vehicle_tax(rules_json, input_json).unwrap();
        assert!(result_json.contains("total_tax"));
    }

    #[test]
    fn test_finance_calculation() {
        let payment = calculate_finance_payment(25000.0, 5.9, 60);
        assert!((payment - 482.10).abs() < 1.0);
    }

    #[test]
    fn test_money_factor_conversion() {
        let apr = money_factor_to_apr(0.00125);
        assert_eq!(apr, 3.0);
    }

    #[test]
    fn test_deal_calculation() {
        let input_json = r#"{
            "deal_type": "FINANCE",
            "state_code": "IN",
            "local_jurisdiction": null,
            "vehicle_msrp": 40000.0,
            "vehicle_invoice": 36000.0,
            "selling_price": 38000.0,
            "trade_in": {
                "gross_allowance": 10000.0,
                "payoff_amount": 8000.0
            },
            "rebates": [],
            "cash_down": 2000.0,
            "fi_products": [],
            "fees": [],
            "finance_input": {
                "apr": 5.9,
                "term_months": 60,
                "payment_frequency": "MONTHLY"
            },
            "lease_input": null
        }"#;

        let result_json = calculate_deal(input_json).unwrap();
        assert!(result_json.contains("payment"));
        assert!(result_json.contains("amount_financed"));
    }
}
