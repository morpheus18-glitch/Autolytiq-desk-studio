//! State Tax Rules Loader
//!
//! Loads state-specific tax rules from embedded JSON files.
//! Rules are compiled into the WASM binary for fast access.

use crate::types::TaxRulesConfig;
use std::collections::HashMap;

/// Load all state rules into a HashMap
pub fn load_all_state_rules() -> HashMap<String, TaxRulesConfig> {
    let mut rules = HashMap::new();

    // Embed state rules at compile time
    // We'll add these as we convert each state

    // Example: Indiana rules (already have this working)
    if let Some(in_rules) = load_indiana_rules() {
        rules.insert("IN".to_string(), in_rules);
    }

    rules
}

/// Load Indiana state rules
fn load_indiana_rules() -> Option<TaxRulesConfig> {
    // For now, return a hardcoded version
    // We'll convert this to JSON files embedded with include_str! macro
    use crate::types::*;

    Some(TaxRulesConfig {
        state_code: "IN".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            tax_cap_reduction: false,
            rebate_behavior: LeaseRebateBehavior::FollowRetailRule,
            doc_fee_taxability: LeaseDocFeeTaxability::FollowRetailRule,
            trade_in_credit: LeaseTradeInCreditMode::FollowRetailRule,
            negative_equity_taxable: false,
            fee_tax_rules: vec![],
            title_fee_rules: vec![],
            tax_fees_upfront: true,
        },
        reciprocity: ReciprocityRules {
            enabled: false,
            scope: ReciprocityScope::None,
            home_state_behavior: ReciprocityMode::None,
            require_proof_of_tax_paid: false,
            basis: ReciprocityBasis::TaxPaid,
            cap_at_this_states_tax: true,
            has_lease_exception: false,
            exempt_states: None,
            non_reciprocal_states: None,
            notes: None,
        },
        extras: None,
    })
}

/// Get rules for a specific state
#[cfg(not(target_arch = "wasm32"))]
pub fn get_state_rules(state_code: &str) -> Option<TaxRulesConfig> {
    let all_rules = load_all_state_rules();
    all_rules.get(state_code).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_indiana_rules() {
        use crate::types::VehicleTaxScheme;
        let rules = load_indiana_rules();
        assert!(rules.is_some());
        let rules = rules.unwrap();
        assert_eq!(rules.state_code, "IN");
        assert!(matches!(rules.vehicle_tax_scheme, VehicleTaxScheme::StateOnly));
    }

    #[test]
    fn test_load_all_state_rules() {
        let rules = load_all_state_rules();
        assert!(rules.contains_key("IN"));
    }
}
