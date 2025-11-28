//! WebAssembly bindings for UDC Engine
//!
//! This module provides WASM-compatible entry points for running
//! the UDC engine from JavaScript/TypeScript environments.
//!
//! # Usage from JavaScript
//!
//! ```javascript
//! import init, { run_udc_wasm, validate_deal_wasm } from 'udc-engine';
//!
//! await init();
//!
//! const result = run_udc_wasm(
//!     dealJson,
//!     rulesJson,
//!     programJson,  // or null
//!     productsJson  // or null
//! );
//!
//! const output = JSON.parse(result);
//! console.log('Monthly payment:', output.finance_structure?.monthly_payment);
//! ```

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
use crate::engine::run_udc_json;

/// Initialize panic hook for better error messages in WASM.
#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn wasm_init() {
    // Set up panic hook for better error messages
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Run UDC calculation from JSON inputs.
///
/// # Arguments
///
/// * `deal_json` - JSON string containing the DealInput
/// * `rules_json` - JSON string containing the RuleProfile
/// * `program_json` - Optional JSON string containing ProgramProfile (pass null/empty for none)
/// * `products_json` - Optional JSON string containing ProductProfile array (pass null/empty for none)
///
/// # Returns
///
/// JSON string containing either:
/// - Success: `UdcOutput` object
/// - Error: `{"error": "error message"}`
///
/// # Example
///
/// ```javascript
/// const dealJson = JSON.stringify({
///   deal_type: "finance",
///   vehicle_price: "30000",
///   cash_down: "3000",
///   home_state: "TX",
///   transaction_state: "TX",
///   // ... other fields
/// });
///
/// const rulesJson = JSON.stringify({
///   state_code: "TX",
///   deal_type: "finance",
///   state_rate: "0.0625",
///   // ... other fields
/// });
///
/// const result = run_udc_wasm(dealJson, rulesJson, null, null);
/// const output = JSON.parse(result);
///
/// if (output.error) {
///   console.error("Calculation failed:", output.error);
/// } else {
///   console.log("Monthly payment:", output.finance_structure.monthly_payment);
/// }
/// ```
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_udc_wasm(
    deal_json: &str,
    rules_json: &str,
    program_json: Option<String>,
    products_json: Option<String>,
) -> String {
    let program = program_json.as_deref().filter(|s| !s.is_empty());
    let products = products_json.as_deref().filter(|s| !s.is_empty());

    match run_udc_json(deal_json, rules_json, program, products) {
        Ok(output_json) => output_json,
        Err(error_msg) => {
            serde_json::json!({
                "error": error_msg,
                "success": false
            }).to_string()
        }
    }
}

/// Validate deal input without running full calculation.
///
/// # Arguments
///
/// * `deal_json` - JSON string containing the DealInput
///
/// # Returns
///
/// JSON string containing:
/// - `{"valid": true, "warnings": [...]}` on success
/// - `{"valid": false, "error": "...", "field": "..."}` on validation failure
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_deal_wasm(deal_json: &str) -> String {
    use crate::types::DealInput;

    // Parse deal input
    let input: Result<DealInput, _> = serde_json::from_str(deal_json);

    match input {
        Ok(deal) => {
            match crate::engine::validate_deal(&deal) {
                Ok(warnings) => {
                    serde_json::json!({
                        "valid": true,
                        "warnings": warnings
                    }).to_string()
                }
                Err(e) => {
                    let (message, field) = match e {
                        crate::types::UdcError::Validation { message, field } => (message, field),
                        _ => (e.to_string(), None),
                    };
                    serde_json::json!({
                        "valid": false,
                        "error": message,
                        "field": field
                    }).to_string()
                }
            }
        }
        Err(e) => {
            serde_json::json!({
                "valid": false,
                "error": format!("JSON parse error: {}", e),
                "field": null
            }).to_string()
        }
    }
}

/// Calculate tax only (quick estimate).
///
/// # Arguments
///
/// * `deal_json` - JSON string containing the DealInput
/// * `rules_json` - JSON string containing the RuleProfile
///
/// # Returns
///
/// JSON string containing the TaxBreakdown or error.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn calculate_tax_wasm(deal_json: &str, rules_json: &str) -> String {
    use crate::types::{DealInput, RuleProfile};

    let input: Result<DealInput, _> = serde_json::from_str(deal_json);
    let rules: Result<RuleProfile, _> = serde_json::from_str(rules_json);

    match (input, rules) {
        (Ok(deal), Ok(profile)) => {
            match crate::engine::calculate_tax_only(deal, profile) {
                Ok(breakdown) => {
                    serde_json::to_string(&breakdown).unwrap_or_else(|e| {
                        serde_json::json!({"error": format!("Serialization error: {}", e)}).to_string()
                    })
                }
                Err(e) => {
                    serde_json::json!({"error": e.to_string()}).to_string()
                }
            }
        }
        (Err(e), _) => {
            serde_json::json!({"error": format!("Failed to parse deal: {}", e)}).to_string()
        }
        (_, Err(e)) => {
            serde_json::json!({"error": format!("Failed to parse rules: {}", e)}).to_string()
        }
    }
}

/// Get engine version.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn get_version() -> String {
    crate::engine::engine_version().to_string()
}

/// Get engine info as JSON.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn get_engine_info() -> String {
    let info = crate::engine::engine_info();
    serde_json::json!({
        "version": info.version,
        "name": info.name,
        "features": info.features,
        "target": "wasm32"
    }).to_string()
}

// Non-WASM stubs for when the feature is not enabled
#[cfg(not(feature = "wasm"))]
pub fn run_udc_wasm(
    deal_json: &str,
    rules_json: &str,
    program_json: Option<&str>,
    products_json: Option<&str>,
) -> String {
    crate::engine::run_udc_json(deal_json, rules_json, program_json, products_json)
        .unwrap_or_else(|e| format!(r#"{{"error": "{}"}}"#, e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(not(feature = "wasm"))]
    fn test_run_udc_wasm_stub() {
        let deal_json = r#"{
            "deal_type": "cash",
            "vehicle_price": "30000",
            "cash_down": "0",
            "trade_in_value": null,
            "trade_in_payoff": null,
            "rebates": [],
            "products": [],
            "fees": {},
            "home_state": "TX",
            "transaction_state": "TX",
            "garaging_state": null,
            "customer": {},
            "finance_params": null,
            "lease_params": null,
            "deal_date": null,
            "first_payment_date": null
        }"#;

        let rules_json = r#"{
            "state_code": "TX",
            "deal_type": "cash",
            "effective_date": "2024-01-01",
            "state_rate": "0.0625"
        }"#;

        let result = run_udc_wasm(deal_json, rules_json, None, None);

        // Should return JSON (either success or error)
        assert!(result.starts_with('{'));
    }
}
