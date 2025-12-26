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

/// Address normalization and parsing (USPS standard)
pub mod address;

/// Geocoding and jurisdiction resolution (county FIPS, ZIP mapping)
pub mod geocoding;

/// Jurisdiction resolver for address-driven tax schema
pub mod jurisdiction_resolver;

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

/// Rate bundle system for runtime rate loading (no recompilation needed)
pub mod rate_bundle;

/// Rules bundle system for loading complete state rules from JSON
/// This enables single-source-of-truth: TypeScript rules → JSON → WASM
pub mod rules_bundle;

/// Special tax scheme calculators (GA TAVT, NC HUT, WV Privilege, SC Cap)
pub mod special_schemes;

/// Input validation for WASM boundary
pub mod validation;

use wasm_bindgen::prelude::*;
pub use types::*;
pub use deal_types::*;
pub use validation::{is_valid_state_code, validation_errors_to_string};

// Re-export key functions for ergonomic native Rust usage
pub use deal_calculator::calculate_deal as calculate_deal_native;
pub use state_rules::load_all_state_rules;
pub use jurisdiction_resolver::{JurisdictionResolver, JurisdictionResult, CustomerAddress};

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
///
/// # Validation
///
/// Input is validated at the WASM boundary before any calculations occur.
/// Invalid inputs will return an error immediately with clear messages.
#[wasm_bindgen]
pub fn calculate_deal(input_json: &str) -> Result<String, JsValue> {
    let input: DealInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse deal input: {}", e)))?;

    // Validate input at WASM boundary
    input.validate()
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

    let result = deal_calculator::calculate_deal(&input, None)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Calculate a finance payment
///
/// Quick calculation for monthly payment given principal, APR, and term.
///
/// # Validation
///
/// - Principal must be positive
/// - APR must be between 0 and 99.9%
/// - Term must be between 1 and 120 months
///
/// Returns 0.0 if validation fails (use calculate_finance_payment_validated for error details)
#[wasm_bindgen]
pub fn calculate_finance_payment(principal: f64, apr: f64, term_months: u16) -> f64 {
    if validation::validate_finance_payment_inputs(principal, apr, term_months).is_err() {
        return 0.0;
    }
    finance::calculate_payment(principal, apr, term_months)
}

/// Calculate a finance payment with validation (returns Result)
///
/// Same as calculate_finance_payment but returns error details on validation failure.
#[wasm_bindgen]
pub fn calculate_finance_payment_validated(principal: f64, apr: f64, term_months: u16) -> Result<f64, JsValue> {
    validation::validate_finance_payment_inputs(principal, apr, term_months)
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;
    Ok(finance::calculate_payment(principal, apr, term_months))
}

/// Calculate total interest for a finance deal
///
/// Returns 0.0 if validation fails.
#[wasm_bindgen]
pub fn calculate_finance_interest(principal: f64, apr: f64, term_months: u16) -> f64 {
    if validation::validate_finance_payment_inputs(principal, apr, term_months).is_err() {
        return 0.0;
    }
    let payment = finance::calculate_payment(principal, apr, term_months);
    finance::calculate_total_interest(principal, payment, term_months)
}

/// Generate payment matrix for multiple term/rate scenarios
///
/// # Validation
///
/// - Amount financed must be positive
/// - Base APR must be between 0 and 99.9%
/// - Terms array must contain valid values (1-120 months)
#[wasm_bindgen]
pub fn generate_payment_matrix(
    amount_financed: f64,
    base_apr: f64,
    terms_json: &str,
) -> Result<String, JsValue> {
    // Validate base inputs
    validation::validate_payment_matrix_inputs(amount_financed, base_apr)
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

    let terms: Vec<u16> = serde_json::from_str(terms_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse terms: {}", e)))?;

    // Validate terms
    for term in &terms {
        if *term == 0 || *term > 120 {
            return Err(JsValue::from_str(&format!(
                "Validation error: Invalid term {}. Must be between 1 and 120 months.",
                term
            )));
        }
    }

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
///
/// # Validation
///
/// - Principal must be positive
/// - APR must be between 0 and 99.9%
/// - Term must be between 1 and 120 months
/// - Start date must be in YYYY-MM-DD format
#[wasm_bindgen]
pub fn generate_amortization_schedule(
    principal: f64,
    apr: f64,
    term_months: u16,
    start_date: &str,
) -> Result<String, JsValue> {
    // Validate inputs
    validation::validate_amortization_inputs(principal, apr, term_months, start_date)
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

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
///
/// Returns 0.0 if validation fails.
#[wasm_bindgen]
pub fn calculate_residual_value(msrp: f64, residual_percent: f64) -> f64 {
    if validation::validate_residual_inputs(msrp, residual_percent).is_err() {
        return 0.0;
    }
    lease::calculate_residual_value(msrp, residual_percent)
}

// ============================================================================
// WASM Exported Functions - Tax Calculations (Legacy)
// ============================================================================

/// Calculate tax for a vehicle deal (WASM-exported function)
///
/// Takes JSON input and returns JSON output for easy JS interop.
///
/// # Validation
///
/// Input is validated at the WASM boundary before any calculations occur.
/// Invalid inputs (negative amounts, invalid state codes, etc.) will return
/// an error immediately with clear messages.
#[wasm_bindgen]
pub fn calculate_vehicle_tax(rules_json: &str, input_json: &str) -> Result<String, JsValue> {
    let rules: TaxRulesConfig = serde_json::from_str(rules_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse rules: {}", e)))?;

    let input: TaxCalculationInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse input: {}", e)))?;

    // Validate input at WASM boundary
    input.validate()
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

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

// ============================================================================
// WASM Exported Functions - Runtime Rate Loading
// ============================================================================

/// Initialize tax rates from external JSON bundle
///
/// This function MUST be called before any tax calculations to load
/// current rates from the database/API. Without initialization, the
/// engine falls back to compiled default rates (which may be outdated).
///
/// # Arguments
/// * `bundle_json` - JSON string conforming to RateBundleV1 schema
///
/// # Returns
/// JSON object with initialization status and metadata:
/// ```json
/// {
///   "success": true,
///   "bundle_id": "...",
///   "state_count": 51,
///   "effective_date": "2025-01-01"
/// }
/// ```
///
/// # Example (JavaScript)
/// ```javascript
/// // Fetch rates from your Tax Service API
/// const response = await fetch('/api/tax/rates/bundle');
/// const bundleJson = await response.text();
///
/// // Initialize the WASM engine
/// const result = JSON.parse(initialize_rates(bundleJson));
/// if (result.success) {
///   console.log(`Loaded ${result.state_count} state rates`);
/// }
/// ```
#[wasm_bindgen]
pub fn initialize_rates(bundle_json: &str) -> String {
    match rate_bundle::initialize_rates(bundle_json) {
        Ok(metadata) => {
            serde_json::json!({
                "success": true,
                "bundle_id": metadata.bundle_id,
                "state_count": metadata.state_count,
                "local_jurisdiction_count": metadata.local_jurisdiction_count,
                "effective_date": metadata.effective_date,
                "generated_at": metadata.generated_at,
            }).to_string()
        }
        Err(e) => {
            serde_json::json!({
                "success": false,
                "error": e.to_string(),
            }).to_string()
        }
    }
}

/// Check if rates have been initialized
///
/// Returns true if `initialize_rates` has been called successfully.
/// Returns false if not initialized OR if lock is poisoned (logs error).
#[wasm_bindgen]
pub fn rates_loaded() -> bool {
    rate_bundle::rates_initialized().unwrap_or_else(|e| {
        // Log the poison error but return false to maintain WASM interface
        #[cfg(target_arch = "wasm32")]
        web_sys::console::error_1(&format!("Rate bundle lock poisoned: {}", e).into());
        false
    })
}

/// Clear loaded rates (revert to compiled defaults)
///
/// Use this to force the engine to use compiled default rates,
/// or before re-initializing with a new bundle.
/// Silently ignores lock poison errors to maintain WASM interface stability.
#[wasm_bindgen]
pub fn clear_rates() {
    if let Err(e) = rate_bundle::clear_rates() {
        #[cfg(target_arch = "wasm32")]
        web_sys::console::error_1(&format!("Failed to clear rates: {}", e).into());
    }
}

/// Get rate bundle metadata
///
/// Returns information about the currently loaded rate bundle.
#[wasm_bindgen]
pub fn get_rate_bundle_info() -> String {
    match rate_bundle::get_bundle_metadata() {
        Ok(metadata) => {
            serde_json::json!({
                "loaded": true,
                "bundle_id": metadata.bundle_id,
                "state_count": metadata.state_count,
                "local_jurisdiction_count": metadata.local_jurisdiction_count,
                "effective_date": metadata.effective_date,
                "generated_at": metadata.generated_at,
                "source": metadata.source,
            }).to_string()
        }
        Err(rate_bundle::RateBundleError::NotInitialized) => {
            serde_json::json!({
                "loaded": false,
                "message": "Using compiled default rates"
            }).to_string()
        }
        Err(e) => {
            serde_json::json!({
                "loaded": false,
                "error": e.to_string(),
                "message": "Lock poisoned - using compiled default rates"
            }).to_string()
        }
    }
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
///
/// This function checks for dynamically loaded rates first, then falls back
/// to compiled defaults. Always call `initialize_rates()` first for current rates.
#[wasm_bindgen]
pub fn get_state_tax_rate(state_code: &str) -> f64 {
    // Check for dynamically loaded rate first (use Ok variant only)
    if let Ok(rate) = rate_bundle::get_loaded_state_rate(state_code) {
        return rate;
    }

    // Fallback to compiled defaults (may be outdated)
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

/// Get state rate info (includes breakdown)
///
/// Returns detailed rate information if loaded from bundle, or defaults if not available.
#[wasm_bindgen]
pub fn get_state_rate_info(state_code: &str) -> String {
    match rate_bundle::get_loaded_state_info(state_code) {
        Ok(info) => {
            serde_json::json!({
                "found": true,
                "from_bundle": true,
                "state_code": info.state_code,
                "state_rate": info.state_rate,
                "avg_local_rate": info.avg_local_rate,
                "max_local_rate": info.max_local_rate,
                "combined_rate": info.combined_rate,
                "has_local_vehicle_tax": info.has_local_vehicle_tax,
                "last_updated": info.last_updated,
                "source": info.source,
                "notes": info.notes,
            }).to_string()
        }
        Err(rate_bundle::RateBundleError::LockPoisoned(msg)) => {
            // Log and fall back to defaults
            #[cfg(target_arch = "wasm32")]
            web_sys::console::error_1(&format!("Rate bundle lock poisoned: {}", msg).into());
            let rate = get_state_tax_rate(state_code);
            serde_json::json!({
                "found": true,
                "from_bundle": false,
                "state_code": state_code,
                "combined_rate": rate,
                "error": "Lock poisoned - using compiled defaults",
                "note": "Using compiled default rate - may be outdated"
            }).to_string()
        }
        Err(_) => {
            // NotInitialized or InvalidRates - fall back to compiled defaults
            let rate = get_state_tax_rate(state_code);
            serde_json::json!({
                "found": true,
                "from_bundle": false,
                "state_code": state_code,
                "combined_rate": rate,
                "note": "Using compiled default rate - may be outdated"
            }).to_string()
        }
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
///
/// # Validation
///
/// Input is validated at the WASM boundary before pipeline execution.
/// Invalid state codes, negative amounts, or out-of-range values will
/// return an error immediately.
#[wasm_bindgen]
pub fn calculate_deal_with_reciprocity(input_json: &str) -> Result<String, JsValue> {
    let input: dag::DagInput = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse DAG input: {}", e)))?;

    // Validate input at WASM boundary
    input.validate()
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

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
///
/// # Validation
///
/// All state codes must be valid US state codes (e.g., "TX", "CA", "NY").
#[wasm_bindgen]
pub fn resolve_state_reciprocity(
    home_state: &str,
    transaction_state: &str,
    garaging_state: &str,
    deal_type: &str,
) -> Result<String, JsValue> {
    // Validate state codes
    validation::validate_state_codes_for_reciprocity(home_state, transaction_state, garaging_state)
        .map_err(|errors| JsValue::from_str(&validation_errors_to_string(errors)))?;

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
// WASM Exported Functions - Rules Bundle (Single Source of Truth)
// ============================================================================

/// Initialize complete state rules from JSON bundle
///
/// This loads the full state tax rules exported from TypeScript.
/// The TypeScript rules in /shared/autoTaxEngine/rules/ are the SINGLE SOURCE OF TRUTH.
///
/// # Arguments
/// * `bundle_json` - JSON string generated by scripts/export-tax-rules.ts
///
/// # Returns
/// JSON object with initialization status:
/// ```json
/// {
///   "success": true,
///   "bundle_id": "tax-rules-1234567890",
///   "state_count": 50,
///   "generated_at": "2025-01-01T00:00:00Z"
/// }
/// ```
///
/// # Example (JavaScript)
/// ```javascript
/// // Load the pre-generated bundle
/// const bundleJson = await fetch('/tax-rules-bundle.json').then(r => r.text());
/// const result = JSON.parse(initialize_state_rules(bundleJson));
/// if (result.success) {
///   console.log(`Loaded ${result.state_count} state rules`);
/// }
/// ```
#[wasm_bindgen]
pub fn initialize_state_rules(bundle_json: &str) -> String {
    match rules_bundle::initialize_rules(bundle_json) {
        Ok(metadata) => {
            serde_json::json!({
                "success": true,
                "bundle_id": metadata.bundle_id,
                "bundle_version": metadata.bundle_version,
                "state_count": metadata.state_count,
                "generated_at": metadata.generated_at,
                "source": metadata.source,
                "checksum": metadata.checksum,
            }).to_string()
        }
        Err(e) => {
            serde_json::json!({
                "success": false,
                "error": e.to_string(),
            }).to_string()
        }
    }
}

/// Check if state rules have been initialized from bundle
#[wasm_bindgen]
pub fn state_rules_loaded() -> bool {
    rules_bundle::rules_initialized().unwrap_or_else(|e| {
        #[cfg(target_arch = "wasm32")]
        web_sys::console::error_1(&format!("Rules bundle lock poisoned: {}", e).into());
        false
    })
}

/// Clear loaded state rules
#[wasm_bindgen]
pub fn clear_state_rules() {
    if let Err(e) = rules_bundle::clear_rules() {
        #[cfg(target_arch = "wasm32")]
        web_sys::console::error_1(&format!("Failed to clear rules: {}", e).into());
    }
}

/// Get rules bundle metadata
#[wasm_bindgen]
pub fn get_rules_bundle_info() -> String {
    match rules_bundle::get_rules_bundle_metadata() {
        Ok(metadata) => {
            serde_json::json!({
                "loaded": true,
                "bundle_id": metadata.bundle_id,
                "bundle_version": metadata.bundle_version,
                "state_count": metadata.state_count,
                "generated_at": metadata.generated_at,
                "source": metadata.source,
                "checksum": metadata.checksum,
            }).to_string()
        }
        Err(rules_bundle::RulesBundleError::NotInitialized) => {
            serde_json::json!({
                "loaded": false,
                "message": "No rules bundle loaded. Using compiled state_rules.rs defaults."
            }).to_string()
        }
        Err(e) => {
            serde_json::json!({
                "loaded": false,
                "error": e.to_string(),
                "message": "Lock poisoned - using compiled defaults"
            }).to_string()
        }
    }
}

/// Get state rules (prefers JSON bundle, falls back to compiled)
///
/// This is the preferred way to get state rules. It will:
/// 1. Check for rules loaded from JSON bundle (TypeScript source of truth)
/// 2. Fall back to compiled Rust rules if bundle not loaded
///
/// # Arguments
/// * `state_code` - Two-letter state code (e.g., "IN", "TX")
///
/// # Returns
/// JSON object with full state tax rules
#[wasm_bindgen]
pub fn get_state_rules_v2(state_code: &str) -> Result<String, JsValue> {
    // Try JSON bundle first (single source of truth)
    if let Ok(rules) = rules_bundle::get_loaded_state_rules(state_code) {
        return serde_json::to_string(&rules)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize rules: {}", e)));
    }

    // Fall back to compiled rules (may be outdated)
    let all_rules = state_rules::load_all_state_rules();
    match all_rules.get(state_code) {
        Some(rules) => serde_json::to_string(rules)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize rules: {}", e))),
        None => Err(JsValue::from_str(&format!("No rules found for state: {}", state_code)))
    }
}

/// Get list of states available in the loaded bundle
#[wasm_bindgen]
pub fn get_bundle_states() -> String {
    match rules_bundle::get_available_states() {
        Ok(states) => serde_json::to_string(&states).unwrap_or_else(|_| "[]".to_string()),
        Err(_) => "[]".to_string(),
    }
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
            "stateCode": "IN",
            "version": 1,
            "tradeInPolicy": {"type": "FULL"},
            "rebates": [],
            "docFeeTaxable": false,
            "feeTaxRules": [],
            "taxOnAccessories": true,
            "taxOnNegativeEquity": false,
            "taxOnServiceContracts": false,
            "taxOnGap": false,
            "vehicleTaxScheme": "STATE_ONLY",
            "vehicleUsesLocalSalesTax": false,
            "leaseRules": {
                "method": "MONTHLY",
                "taxCapReduction": false,
                "rebateBehavior": "FOLLOW_RETAIL_RULE",
                "docFeeTaxability": "FOLLOW_RETAIL_RULE",
                "tradeInCredit": "FOLLOW_RETAIL_RULE",
                "negativeEquityTaxable": false,
                "feeTaxRules": [],
                "titleFeeRules": [],
                "taxFeesUpfront": true,
                "specialScheme": "NONE",
                "notes": null
            },
            "reciprocity": {
                "enabled": false,
                "scope": "NONE",
                "homeStateBehavior": "NONE",
                "requireProofOfTaxPaid": false,
                "basis": "TAX_PAID",
                "capAtThisStatesTax": true,
                "hasLeaseException": false,
                "overrides": null,
                "exemptStates": null,
                "nonReciprocalStates": null,
                "notes": null
            }
        }"#;

        let input_json = r#"{
            "stateCode": "IN",
            "asOfDate": "2025-01-01",
            "dealType": "RETAIL",
            "vehiclePrice": 30000.0,
            "accessoriesAmount": 0.0,
            "tradeInValue": 5000.0,
            "rebateManufacturer": 0.0,
            "rebateDealer": 0.0,
            "docFee": 0.0,
            "otherFees": [],
            "serviceContracts": 0.0,
            "gap": 0.0,
            "negativeEquity": 0.0,
            "taxAlreadyCollected": 0.0,
            "rates": [{"label": "STATE", "rate": 0.07}]
        }"#;

        let result_json = calculate_vehicle_tax(rules_json, input_json).unwrap();
        assert!(result_json.contains("totalTax") || result_json.contains("total_tax"));
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

    // ========================================================================
    // WASM Boundary Validation Tests
    // ========================================================================

    #[test]
    fn test_deal_validation_rejects_invalid_state_code() {
        let input_json = r#"{
            "deal_type": "CASH",
            "state_code": "XX",
            "local_jurisdiction": null,
            "vehicle_msrp": 40000.0,
            "vehicle_invoice": 36000.0,
            "selling_price": 38000.0,
            "trade_in": null,
            "rebates": [],
            "cash_down": 2000.0,
            "fi_products": [],
            "fees": [],
            "finance_input": null,
            "lease_input": null
        }"#;

        let result = calculate_deal(input_json);
        assert!(result.is_err());
        let error = result.unwrap_err();
        let error_str = error.as_string().unwrap();
        assert!(error_str.contains("Invalid state code"));
    }

    #[test]
    fn test_deal_validation_rejects_zero_selling_price() {
        let input_json = r#"{
            "deal_type": "CASH",
            "state_code": "TX",
            "local_jurisdiction": null,
            "vehicle_msrp": 40000.0,
            "vehicle_invoice": 36000.0,
            "selling_price": 0.0,
            "trade_in": null,
            "rebates": [],
            "cash_down": 2000.0,
            "fi_products": [],
            "fees": [],
            "finance_input": null,
            "lease_input": null
        }"#;

        let result = calculate_deal(input_json);
        assert!(result.is_err());
        let error = result.unwrap_err();
        let error_str = error.as_string().unwrap();
        assert!(error_str.contains("Selling price"));
    }

    #[test]
    fn test_deal_validation_rejects_invalid_apr() {
        let input_json = r#"{
            "deal_type": "FINANCE",
            "state_code": "TX",
            "local_jurisdiction": null,
            "vehicle_msrp": 40000.0,
            "vehicle_invoice": 36000.0,
            "selling_price": 38000.0,
            "trade_in": null,
            "rebates": [],
            "cash_down": 2000.0,
            "fi_products": [],
            "fees": [],
            "finance_input": {
                "apr": 150.0,
                "term_months": 60,
                "payment_frequency": "MONTHLY"
            },
            "lease_input": null
        }"#;

        let result = calculate_deal(input_json);
        assert!(result.is_err());
        let error = result.unwrap_err();
        let error_str = error.as_string().unwrap();
        assert!(error_str.contains("APR"));
    }

    #[test]
    fn test_finance_payment_validation_rejects_negative_principal() {
        // Should return 0.0 for invalid input
        let payment = calculate_finance_payment(-1000.0, 5.9, 60);
        assert_eq!(payment, 0.0);

        // Validated version should return error
        let result = calculate_finance_payment_validated(-1000.0, 5.9, 60);
        assert!(result.is_err());
    }

    #[test]
    fn test_finance_payment_validation_rejects_invalid_term() {
        let payment = calculate_finance_payment(25000.0, 5.9, 0);
        assert_eq!(payment, 0.0);

        let result = calculate_finance_payment_validated(25000.0, 5.9, 150);
        assert!(result.is_err());
    }

    #[test]
    fn test_reciprocity_validation_rejects_invalid_state() {
        let result = resolve_state_reciprocity("XX", "IN", "", "RETAIL");
        assert!(result.is_err());
        let error = result.unwrap_err();
        let error_str = error.as_string().unwrap();
        assert!(error_str.contains("Invalid"));
    }

    #[test]
    fn test_valid_state_code_check() {
        assert!(is_valid_state_code("TX"));
        assert!(is_valid_state_code("tx")); // Case insensitive
        assert!(is_valid_state_code("DC"));
        assert!(!is_valid_state_code("XX"));
        assert!(!is_valid_state_code("USA"));
        assert!(!is_valid_state_code(""));
    }
}
