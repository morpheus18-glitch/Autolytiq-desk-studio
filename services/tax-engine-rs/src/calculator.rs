//! Tax Calculation Core
//!
//! Core logic for calculating vehicle sales tax based on state rules.
//! This module implements the main tax calculation pipeline that:
//! 1. Builds the taxable base (vehicle price ± adjustments)
//! 2. Applies state-specific trade-in policies
//! 3. Handles rebate taxation
//! 4. Computes component taxes (state + local)
//! 5. Returns detailed breakdown for audit purposes

use crate::types::*;

// ============================================================================
// Main Calculator: Full Pipeline
// ============================================================================

/// Calculate tax for a vehicle deal (retail or lease)
///
/// This is the main entry point for tax calculation. It:
/// - Determines the taxable base from inputs
/// - Applies state-specific rules (trade-in credit, rebate handling, etc.)
/// - Computes component taxes using provided rates
/// - Returns a detailed breakdown for display and audit
pub fn calculate_tax(
    rules: &TaxRulesConfig,
    input: &TaxCalculationInput,
) -> Result<TaxCalculationResult, String> {
    match input.deal_type {
        DealType::Retail => calculate_retail_tax(rules, input),
        DealType::Lease => calculate_lease_tax(rules, input),
    }
}

/// Calculate retail (purchase) tax
fn calculate_retail_tax(
    rules: &TaxRulesConfig,
    input: &TaxCalculationInput,
) -> Result<TaxCalculationResult, String> {
    // Step 1: Build the vehicle taxable base
    let mut vehicle_base = input.vehicle_price;

    // Add accessories if taxable
    if rules.tax_on_accessories {
        vehicle_base += input.accessories_amount;
    }

    // Step 2: Apply trade-in credit
    let applied_trade_in = apply_trade_in_credit(&rules.trade_in_policy, input.trade_in_value);
    vehicle_base -= applied_trade_in;

    // Step 3: Handle rebates
    let (rebates_non_taxable, rebates_taxable) =
        apply_rebates(&rules.rebates, input.rebate_manufacturer, input.rebate_dealer);
    vehicle_base -= rebates_non_taxable;

    // Step 4: Handle negative equity if taxable
    if rules.tax_on_negative_equity && input.negative_equity > 0.0 {
        vehicle_base += input.negative_equity;
    }

    // Step 5: Build fees taxable base
    let mut fees_base = 0.0;
    let mut taxable_fees = Vec::new();

    // Doc fee
    let taxable_doc_fee = if rules.doc_fee_taxable { input.doc_fee } else { 0.0 };
    fees_base += taxable_doc_fee;

    // Other fees - check against fee tax rules
    for fee in &input.other_fees {
        if is_fee_taxable(&rules.fee_tax_rules, &fee.code) {
            fees_base += fee.amount;
            taxable_fees.push(fee.clone());
        }
    }

    // Step 6: Build products taxable base
    let mut products_base = 0.0;

    let taxable_service_contracts = if rules.tax_on_service_contracts {
        products_base += input.service_contracts;
        input.service_contracts
    } else {
        0.0
    };

    let taxable_gap = if rules.tax_on_gap {
        products_base += input.gap;
        input.gap
    } else {
        0.0
    };

    // Step 7: Calculate total taxable base
    vehicle_base = vehicle_base.max(0.0); // Ensure non-negative
    let total_taxable_base = vehicle_base + fees_base + products_base;

    // Step 8: Calculate component taxes
    let mut component_taxes = Vec::new();
    let mut total_tax = 0.0;

    for rate_component in &input.rates {
        let tax_amount = total_taxable_base * rate_component.rate;
        component_taxes.push(ComponentTax {
            label: rate_component.label.clone(),
            rate: rate_component.rate,
            amount: tax_amount,
        });
        total_tax += tax_amount;
    }

    // Step 9: Apply reciprocity credit if applicable
    let reciprocity_credit = calculate_reciprocity_credit(rules, input, total_tax);
    total_tax -= reciprocity_credit;
    total_tax = total_tax.max(0.0);

    // Build result
    Ok(TaxCalculationResult {
        mode: DealType::Retail,
        bases: TaxBaseBreakdown {
            vehicle_base,
            fees_base,
            products_base,
            total_taxable_base,
        },
        taxes: TaxAmountBreakdown {
            component_taxes,
            total_tax,
        },
        lease_breakdown: None,
        debug: AutoTaxDebug {
            applied_trade_in,
            applied_rebates_non_taxable: rebates_non_taxable,
            applied_rebates_taxable: rebates_taxable,
            taxable_doc_fee,
            taxable_fees,
            taxable_service_contracts,
            taxable_gap,
            reciprocity_credit,
            notes: vec![],
        },
    })
}

/// Calculate lease tax
fn calculate_lease_tax(
    rules: &TaxRulesConfig,
    input: &TaxCalculationInput,
) -> Result<TaxCalculationResult, String> {
    let lease_rules = &rules.lease_rules;

    // Get lease-specific values (with defaults if not provided)
    let gross_cap_cost = input.gross_cap_cost.unwrap_or(input.vehicle_price);
    let cap_reduction_cash = input.cap_reduction_cash.unwrap_or(0.0);
    let cap_reduction_trade_in = input.cap_reduction_trade_in.unwrap_or(input.trade_in_value);
    let cap_reduction_rebate_mfr = input.cap_reduction_rebate_manufacturer.unwrap_or(input.rebate_manufacturer);
    let cap_reduction_rebate_dlr = input.cap_reduction_rebate_dealer.unwrap_or(input.rebate_dealer);
    let base_payment = input.base_payment.unwrap_or(0.0);
    let payment_count = input.payment_count.unwrap_or(36);

    // Step 1: Determine taxable cap cost reductions
    let mut taxable_cap_reduction = 0.0;
    let mut applied_trade_in = 0.0;
    let mut rebates_non_taxable = 0.0;

    // Trade-in handling
    match lease_rules.trade_in_credit {
        LeaseTradeInCreditMode::Full | LeaseTradeInCreditMode::FollowRetailRule => {
            // Trade reduces taxable base
            applied_trade_in = cap_reduction_trade_in;
        }
        LeaseTradeInCreditMode::CapCostOnly => {
            // Trade reduces cap cost but doesn't reduce tax base
            applied_trade_in = 0.0;
        }
        LeaseTradeInCreditMode::None | LeaseTradeInCreditMode::AppliedToPayment => {
            applied_trade_in = 0.0;
        }
    }
    taxable_cap_reduction += cap_reduction_cash + applied_trade_in;

    // Rebate handling
    match lease_rules.rebate_behavior {
        LeaseRebateBehavior::AlwaysNonTaxable | LeaseRebateBehavior::FollowRetailRule => {
            rebates_non_taxable = cap_reduction_rebate_mfr;
            taxable_cap_reduction += cap_reduction_rebate_mfr;
        }
        LeaseRebateBehavior::AlwaysTaxable => {
            // Rebates don't reduce taxable base
        }
        LeaseRebateBehavior::NonTaxableIfAtSigning | LeaseRebateBehavior::NonTaxableIfAssignable => {
            // For simplicity, treat as non-taxable
            rebates_non_taxable = cap_reduction_rebate_mfr;
            taxable_cap_reduction += cap_reduction_rebate_mfr;
        }
    }

    // Step 2: Calculate based on lease method
    let (upfront_taxable_base, payment_taxable_base) = match lease_rules.method {
        LeaseMethod::Monthly => {
            // Tax on each payment - no upfront tax
            (0.0, base_payment)
        }
        LeaseMethod::FullUpfront => {
            // Full tax upfront on adjusted cap cost
            let adjusted_cap = gross_cap_cost - taxable_cap_reduction;
            (adjusted_cap.max(0.0), 0.0)
        }
        LeaseMethod::NetCapCost => {
            // Tax on net cap cost (after all reductions)
            let net_cap = gross_cap_cost - cap_reduction_cash - cap_reduction_trade_in
                - cap_reduction_rebate_mfr - cap_reduction_rebate_dlr;
            (net_cap.max(0.0), 0.0)
        }
        LeaseMethod::Hybrid => {
            // Some upfront + some on payments
            // For now, treat as half and half
            let adjusted_cap = gross_cap_cost - taxable_cap_reduction;
            ((adjusted_cap * 0.5).max(0.0), base_payment)
        }
        LeaseMethod::ReducedBase => {
            // Only tax depreciation portion
            // This is an approximation; real calc needs residual value
            (0.0, base_payment)
        }
    };

    // Step 3: Calculate fees and products
    let mut fees_base = 0.0;
    let mut taxable_fees = Vec::new();

    // Doc fee for lease
    let taxable_doc_fee = match lease_rules.doc_fee_taxability {
        LeaseDocFeeTaxability::Always | LeaseDocFeeTaxability::FollowRetailRule => {
            if rules.doc_fee_taxable { input.doc_fee } else { 0.0 }
        }
        LeaseDocFeeTaxability::Never => 0.0,
        LeaseDocFeeTaxability::OnlyUpfront => input.doc_fee, // Only if upfront method
    };
    fees_base += taxable_doc_fee;

    // Other fees
    for fee in &input.other_fees {
        if is_fee_taxable(&lease_rules.fee_tax_rules, &fee.code) {
            fees_base += fee.amount;
            taxable_fees.push(fee.clone());
        }
    }

    // Products
    let products_base = 0.0; // Usually not taxable in leases
    let taxable_service_contracts = 0.0;
    let taxable_gap = 0.0;

    // Total bases
    let vehicle_base = upfront_taxable_base;
    let total_taxable_base = vehicle_base + fees_base + products_base;

    // Step 4: Calculate taxes
    let mut upfront_component_taxes = Vec::new();
    let mut upfront_total = 0.0;

    let mut payment_component_taxes = Vec::new();
    let mut payment_total = 0.0;

    for rate_component in &input.rates {
        if upfront_taxable_base > 0.0 || fees_base > 0.0 {
            let upfront_base = upfront_taxable_base + fees_base;
            let tax_amount = upfront_base * rate_component.rate;
            upfront_component_taxes.push(ComponentTax {
                label: rate_component.label.clone(),
                rate: rate_component.rate,
                amount: tax_amount,
            });
            upfront_total += tax_amount;
        }

        if payment_taxable_base > 0.0 {
            let tax_amount = payment_taxable_base * rate_component.rate;
            payment_component_taxes.push(ComponentTax {
                label: rate_component.label.clone(),
                rate: rate_component.rate,
                amount: tax_amount,
            });
            payment_total += tax_amount;
        }
    }

    // Total tax over lease term
    let total_tax_over_term = upfront_total + (payment_total * payment_count as f64);

    // Build result
    Ok(TaxCalculationResult {
        mode: DealType::Lease,
        bases: TaxBaseBreakdown {
            vehicle_base,
            fees_base,
            products_base,
            total_taxable_base,
        },
        taxes: TaxAmountBreakdown {
            component_taxes: upfront_component_taxes.clone(),
            total_tax: upfront_total + payment_total, // Per-period total
        },
        lease_breakdown: Some(LeaseTaxBreakdown {
            upfront_taxable_base,
            upfront_taxes: TaxAmountBreakdown {
                component_taxes: upfront_component_taxes,
                total_tax: upfront_total,
            },
            payment_taxable_base_per_period: payment_taxable_base,
            payment_taxes_per_period: TaxAmountBreakdown {
                component_taxes: payment_component_taxes,
                total_tax: payment_total,
            },
            total_tax_over_term,
        }),
        debug: AutoTaxDebug {
            applied_trade_in,
            applied_rebates_non_taxable: rebates_non_taxable,
            applied_rebates_taxable: cap_reduction_rebate_dlr,
            taxable_doc_fee,
            taxable_fees,
            taxable_service_contracts,
            taxable_gap,
            reciprocity_credit: 0.0,
            notes: vec![format!("Lease method: {:?}", lease_rules.method)],
        },
    })
}

// ============================================================================
// Helper Functions: Trade-In, Rebates, Fees
// ============================================================================

/// Apply trade-in credit based on policy
fn apply_trade_in_credit(policy: &TradeInPolicy, trade_in_value: f64) -> f64 {
    match policy {
        TradeInPolicy::None { .. } => 0.0,
        TradeInPolicy::Full { .. } => trade_in_value,
        TradeInPolicy::Capped { cap_amount, .. } => trade_in_value.min(*cap_amount),
        TradeInPolicy::Percent { percent, .. } => trade_in_value * (percent / 100.0),
    }
}

/// Apply rebate rules - returns (non_taxable, taxable) amounts
fn apply_rebates(
    rules: &[RebateRule],
    manufacturer_rebate: f64,
    dealer_rebate: f64,
) -> (f64, f64) {
    let mut non_taxable = 0.0;
    let mut taxable = 0.0;

    // Check manufacturer rebate
    let mfr_taxable = rules.iter()
        .find(|r| matches!(r.applies_to, RebateType::Manufacturer | RebateType::Any))
        .map(|r| r.taxable)
        .unwrap_or(false); // Default: manufacturer rebates are non-taxable

    if mfr_taxable {
        taxable += manufacturer_rebate;
    } else {
        non_taxable += manufacturer_rebate;
    }

    // Check dealer rebate
    let dlr_taxable = rules.iter()
        .find(|r| matches!(r.applies_to, RebateType::Dealer | RebateType::Any))
        .map(|r| r.taxable)
        .unwrap_or(true); // Default: dealer rebates are taxable

    if dlr_taxable {
        taxable += dealer_rebate;
    } else {
        non_taxable += dealer_rebate;
    }

    (non_taxable, taxable)
}

/// Check if a fee is taxable based on rules
fn is_fee_taxable(rules: &[FeeTaxRule], fee_code: &str) -> bool {
    rules.iter()
        .find(|r| r.code == fee_code)
        .map(|r| r.taxable)
        .unwrap_or(false) // Default: fees are not taxable unless explicitly specified
}

/// Calculate reciprocity credit
fn calculate_reciprocity_credit(
    rules: &TaxRulesConfig,
    input: &TaxCalculationInput,
    calculated_tax: f64,
) -> f64 {
    // Skip if reciprocity not enabled
    if !rules.reciprocity.enabled {
        return 0.0;
    }

    // Need origin tax info to give credit
    let origin_tax = match &input.origin_tax_info {
        Some(info) => info,
        None => return 0.0,
    };

    // Check scope
    let scope_applies = match rules.reciprocity.scope {
        ReciprocityScope::None => false,
        ReciprocityScope::RetailOnly => input.deal_type == DealType::Retail,
        ReciprocityScope::LeaseOnly => input.deal_type == DealType::Lease,
        ReciprocityScope::Both => true,
    };

    if !scope_applies {
        return 0.0;
    }

    // Check for exempt states
    if let Some(exempt) = &rules.reciprocity.exempt_states {
        if exempt.contains(&origin_tax.state_code) {
            return 0.0;
        }
    }

    // Check for non-reciprocal states
    if let Some(non_recip) = &rules.reciprocity.non_reciprocal_states {
        if non_recip.contains(&origin_tax.state_code) {
            return 0.0;
        }
    }

    // Calculate credit based on mode
    let credit = match rules.reciprocity.home_state_behavior {
        ReciprocityMode::None => 0.0,
        ReciprocityMode::CreditFull => origin_tax.amount,
        ReciprocityMode::CreditUpToStateRate => {
            // Credit limited to what would have been owed
            origin_tax.amount.min(calculated_tax)
        }
        ReciprocityMode::HomeStateOnly => {
            // Special case: home state collects all tax
            calculated_tax
        }
    };

    // Cap at this state's tax if configured
    if rules.reciprocity.cap_at_this_states_tax {
        credit.min(calculated_tax)
    } else {
        credit
    }
}

// ============================================================================
// Simple Calculator: Legacy API
// ============================================================================

/// Calculate tax using simple legacy API
///
/// Returns a SimpleTaxResult for backwards compatibility with
/// older code that expects separate state/local tax fields.
pub fn calculate_simple_tax(
    rules: &TaxRulesConfig,
    vehicle_price: f64,
    trade_in_value: f64,
    state_rate: f64,
    local_rate: f64,
) -> SimpleTaxResult {
    // Calculate taxable base
    let mut taxable_base = vehicle_price;

    // Apply trade-in credit
    let trade_credit = apply_trade_in_credit(&rules.trade_in_policy, trade_in_value);
    taxable_base -= trade_credit;
    taxable_base = taxable_base.max(0.0);

    // Calculate taxes
    let state_tax = taxable_base * state_rate;
    let local_tax = taxable_base * local_rate;
    let total_tax = state_tax + local_tax;

    let effective_rate = if taxable_base > 0.0 {
        total_tax / taxable_base
    } else {
        0.0
    };

    SimpleTaxResult {
        state_tax,
        local_tax,
        total_tax,
        taxable_amount: taxable_base,
        effective_rate,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_retail_calculation() {
        let rules = create_test_rules("IN");
        let input = create_test_input(30000.0, 5000.0, 0.07);

        let result = calculate_tax(&rules, &input).unwrap();

        // IN has 7% tax, full trade-in credit
        // Taxable: $30,000 - $5,000 = $25,000
        // Tax: $25,000 * 0.07 = $1,750
        assert_eq!(result.bases.vehicle_base, 25000.0);
        assert!((result.taxes.total_tax - 1750.0).abs() < 0.01);
    }

    #[test]
    fn test_capped_trade_in() {
        let mut rules = create_test_rules("MI");
        rules.trade_in_policy = TradeInPolicy::Capped {
            cap_amount: 3000.0,
            notes: Some("Michigan cap".to_string())
        };
        let input = create_test_input(30000.0, 5000.0, 0.06);

        let result = calculate_tax(&rules, &input).unwrap();

        // MI caps trade-in at $3,000, not the full $5,000
        // Taxable: $30,000 - $3,000 = $27,000
        assert_eq!(result.bases.vehicle_base, 27000.0);
        assert_eq!(result.debug.applied_trade_in, 3000.0);
    }

    #[test]
    fn test_simple_tax_calculator() {
        let rules = create_test_rules("IN");
        let result = calculate_simple_tax(&rules, 30000.0, 5000.0, 0.07, 0.0);

        assert_eq!(result.taxable_amount, 25000.0);
        assert!((result.state_tax - 1750.0).abs() < 0.01);
        assert_eq!(result.local_tax, 0.0);
    }

    #[test]
    fn test_lease_monthly_method() {
        let rules = create_test_rules("IN");
        let mut input = create_test_input(40000.0, 0.0, 0.07);
        input.deal_type = DealType::Lease;
        input.gross_cap_cost = Some(40000.0);
        input.base_payment = Some(450.0);
        input.payment_count = Some(36);

        let result = calculate_tax(&rules, &input).unwrap();

        // Monthly method: tax on each payment
        assert!(result.lease_breakdown.is_some());
        let lease = result.lease_breakdown.unwrap();
        assert_eq!(lease.upfront_taxable_base, 0.0);
        assert_eq!(lease.payment_taxable_base_per_period, 450.0);
        // Tax per payment: $450 * 0.07 = $31.50
        // Total over 36 months: $31.50 * 36 = $1,134
        assert!((lease.payment_taxes_per_period.total_tax - 31.50).abs() < 0.01);
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

    fn create_test_input(
        vehicle_price: f64,
        trade_in_value: f64,
        state_rate: f64,
    ) -> TaxCalculationInput {
        TaxCalculationInput {
            state_code: "IN".to_string(),
            as_of_date: "2025-01-01".to_string(),
            deal_type: DealType::Retail,
            home_state_code: None,
            registration_state_code: None,
            origin_tax_info: None,
            customer_is_new_resident: None,
            vehicle_class: None,
            gvw: None,
            vehicle_price,
            accessories_amount: 0.0,
            trade_in_value,
            rebate_manufacturer: 0.0,
            rebate_dealer: 0.0,
            doc_fee: 0.0,
            other_fees: vec![],
            service_contracts: 0.0,
            gap: 0.0,
            negative_equity: 0.0,
            tax_already_collected: 0.0,
            rates: vec![TaxRateComponent {
                label: "STATE".to_string(),
                rate: state_rate,
            }],
            gross_cap_cost: None,
            cap_reduction_cash: None,
            cap_reduction_trade_in: None,
            cap_reduction_rebate_manufacturer: None,
            cap_reduction_rebate_dealer: None,
            base_payment: None,
            payment_count: None,
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
            special_scheme: LeaseSpecialScheme::None,
            notes: None,
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
            overrides: None,
            exempt_states: None,
            non_reciprocal_states: None,
            notes: None,
        }
    }
}
