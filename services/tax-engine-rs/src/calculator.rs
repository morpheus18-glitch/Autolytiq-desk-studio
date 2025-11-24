//! Tax Calculation Core
//!
//! Core logic for calculating vehicle sales tax based on state rules.

use crate::types::*;

/// Calculate tax for a vehicle deal
pub fn calculate_tax(
    rules: &TaxRulesConfig,
    input: &TaxCalculationInput,
) -> Result<TaxCalculationResult, String> {
    // Calculate taxable base
    let mut taxable_base = input.vehicle_price;

    // Apply trade-in credit
    if let Some(trade_allowance) = input.trade_allowance {
        taxable_base -= apply_trade_in_credit(&rules.trade_in_policy, trade_allowance);
    }

    // Apply rebates
    if let Some(rebates) = input.rebates {
        taxable_base -= calculate_rebate_reduction(rules, rebates);
    }

    // Add taxable fees
    if let Some(dealer_fees) = input.dealer_fees {
        if rules.doc_fee_taxable {
            taxable_base += dealer_fees;
        }
    }

    // Add negative equity if taxable
    if rules.tax_on_negative_equity {
        if let Some(trade_payoff) = input.trade_payoff {
            if let Some(trade_allowance) = input.trade_allowance {
                let negative_equity = trade_payoff - trade_allowance;
                if negative_equity > 0.0 {
                    taxable_base += negative_equity;
                }
            }
        }
    }

    // Ensure non-negative
    taxable_base = taxable_base.max(0.0);

    // For now, use a placeholder tax rate
    // TODO: Implement full jurisdiction lookup
    let state_rate = get_state_rate(&input.state_code);
    let local_rate = get_local_rate(&input.state_code, &rules.vehicle_tax_scheme);

    let state_tax = taxable_base * state_rate;
    let local_tax = taxable_base * local_rate;
    let total_tax = state_tax + local_tax;
    let effective_rate = if taxable_base > 0.0 {
        total_tax / taxable_base
    } else {
        0.0
    };

    Ok(TaxCalculationResult {
        state_tax,
        local_tax,
        total_tax,
        taxable_amount: taxable_base,
        effective_rate,
    })
}

/// Apply trade-in credit based on policy
fn apply_trade_in_credit(policy: &TradeInPolicy, trade_allowance: f64) -> f64 {
    match policy {
        TradeInPolicy::None { .. } => 0.0,
        TradeInPolicy::Full { .. } => trade_allowance,
        TradeInPolicy::Capped { cap_amount, .. } => trade_allowance.min(*cap_amount),
        TradeInPolicy::Percent { percent, .. } => trade_allowance * (percent / 100.0),
    }
}

/// Calculate rebate reduction to taxable base
fn calculate_rebate_reduction(rules: &TaxRulesConfig, total_rebates: f64) -> f64 {
    // Check if any rebates are non-taxable
    let has_non_taxable = rules.rebates.iter().any(|r| !r.taxable);

    if has_non_taxable {
        // Assume all rebates are manufacturer rebates (non-taxable) for now
        // TODO: Split manufacturer vs dealer rebates
        total_rebates
    } else {
        0.0
    }
}

/// Get state base tax rate
/// TODO: Load from state rules database
fn get_state_rate(state_code: &str) -> f64 {
    match state_code {
        "AL" => 0.02,
        "AK" => 0.0,
        "AZ" => 0.056,
        "AR" => 0.065,
        "CA" => 0.0725,
        "CO" => 0.029,
        "FL" => 0.06,
        "GA" => 0.04,
        "IL" => 0.0625,
        "IN" => 0.07,
        "MI" => 0.06,
        "NY" => 0.04,
        "OH" => 0.0575,
        "PA" => 0.06,
        "TX" => 0.0625,
        _ => 0.05, // Default fallback
    }
}

/// Get local tax rate based on scheme
fn get_local_rate(state_code: &str, scheme: &VehicleTaxScheme) -> f64 {
    match scheme {
        VehicleTaxScheme::StateOnly | VehicleTaxScheme::LocalOnly => 0.0,
        VehicleTaxScheme::StatePlusLocal => {
            // Average local rate estimate
            match state_code {
                "CA" => 0.01,
                "CO" => 0.03,
                "IL" => 0.02,
                "OH" => 0.015,
                _ => 0.01,
            }
        }
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_retail_calculation() {
        let rules = create_test_rules("IN");
        let input = TaxCalculationInput {
            state_code: "IN".to_string(),
            deal_type: DealType::Retail,
            vehicle_price: 30000.0,
            trade_allowance: Some(5000.0),
            trade_payoff: None,
            down_payment: None,
            rebates: None,
            dealer_fees: None,
        };

        let result = calculate_tax(&rules, &input).unwrap();

        // IN has 7% tax, full trade-in credit
        // Taxable: $30,000 - $5,000 = $25,000
        // Tax: $25,000 * 0.07 = $1,750
        assert_eq!(result.taxable_amount, 25000.0);
        // Use approximate equality for floating-point tax calculation
        assert!((result.state_tax - 1750.0).abs() < 0.01);
    }

    fn create_test_rules(state: &str) -> TaxRulesConfig {
        TaxRulesConfig {
            state_code: state.to_string(),
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
            lease_rules: create_default_lease_rules(),
            reciprocity: create_default_reciprocity(),
            extras: None,
        }
    }

    fn create_default_lease_rules() -> LeaseTaxRules {
        LeaseTaxRules {
            method: LeaseMethod::Monthly,
            tax_cap_reduction: false,
            rebate_behavior: LeaseRebateBehavior::FollowRetailRule,
            doc_fee_taxability: LeaseDocFeeTaxability::FollowRetailRule,
            trade_in_credit: LeaseTradeInCreditMode::FollowRetailRule,
            negative_equity_taxable: false,
            fee_tax_rules: vec![],
            title_fee_rules: vec![],
            tax_fees_upfront: true,
        }
    }

    fn create_default_reciprocity() -> ReciprocityRules {
        ReciprocityRules {
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
        }
    }
}
