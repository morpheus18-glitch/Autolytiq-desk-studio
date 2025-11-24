//! Tax Engine - Rust WASM Implementation
//!
//! High-performance tax calculation engine compiled to WebAssembly.
//! Replaces the TypeScript implementation with proper type safety and performance.

mod calculator;
mod state_rules;
mod types;

use wasm_bindgen::prelude::*;
pub use types::*;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages in browser
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

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
}
