//! P4 - Tax Cipher (RCF Core)
//!
//! The heart of the UDC engine - calculates taxes based on:
//! - RuleProfile rules for the jurisdiction
//! - Deal structure (trade-in, rebates, fees)
//! - Special state handling (GA TAVT, NC HUT, WV excise)
//! - Interstate reciprocity
//!
//! # Tax Base Formula (Standard)
//! ```text
//! tax_base = selling_price
//!          + taxable_fees
//!          + taxable_products
//!          - trade_in_credit (if state allows)
//!          - rebates (if state allows)
//! ```
//!
//! # Invariants
//! - Tax base is never negative
//! - Trade/rebate credits are never double-applied
//! - Reciprocity credits never exceed theoretical home state tax

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

use crate::types::{
    TaxType, LeaseTaxMode, StateCode,
    UdcResult, UdcError, DecimalExt,
};
use super::p3_profiles::ProfileLoadedDeal;

/// Complete tax calculation result
#[derive(Debug, Clone)]
pub struct TaxCalculation {
    /// The tax base (amount being taxed)
    pub tax_base: Decimal,
    /// Breakdown of how tax base was built
    pub base_breakdown: TaxBaseBreakdown,
    /// Primary tax amount
    pub primary_tax: Decimal,
    /// Tax type applied
    pub tax_type: TaxType,
    /// Tax rate applied
    pub effective_rate: Decimal,
    /// Reciprocity credit (if interstate)
    pub reciprocity_credit: Decimal,
    /// Net tax after credits
    pub net_tax: Decimal,
    /// Individual tax components (state, county, city, etc.)
    pub components: Vec<TaxComponent>,
    /// Special tax amounts (TAVT, HUT, etc.)
    pub special_tax: Option<SpecialTax>,
    /// Audit trail entries
    pub audit: Vec<TaxAuditEntry>,
}

/// Breakdown of how the tax base was calculated
#[derive(Debug, Clone)]
pub struct TaxBaseBreakdown {
    pub selling_price: Decimal,
    pub taxable_fees: Decimal,
    pub taxable_products: Decimal,
    pub trade_credit_applied: Decimal,
    pub rebates_applied: Decimal,
    pub adjustments: Decimal,
    /// Reason for any cap application
    pub cap_applied: Option<String>,
}

/// Individual tax component (state, county, city, district)
#[derive(Debug, Clone)]
pub struct TaxComponent {
    pub name: String,
    pub level: TaxLevel,
    pub rate: Decimal,
    pub base: Decimal,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaxLevel {
    State,
    County,
    City,
    District,
    Special,
}

/// Special tax calculation (TAVT, HUT, etc.)
#[derive(Debug, Clone)]
pub struct SpecialTax {
    pub tax_type: TaxType,
    pub name: String,
    pub base: Decimal,
    pub rate: Decimal,
    pub amount: Decimal,
    pub cap_applied: Option<Decimal>,
}

/// Audit trail entry for tax calculation
#[derive(Debug, Clone)]
pub struct TaxAuditEntry {
    pub step: String,
    pub description: String,
    pub input_value: Decimal,
    pub output_value: Decimal,
    pub rule_applied: String,
}

/// Deal with computed taxes
#[derive(Debug, Clone)]
pub struct TaxComputedDeal {
    pub deal: ProfileLoadedDeal,
    pub tax: TaxCalculation,
}

/// P4: Calculate all taxes for the deal.
///
/// # Algorithm Overview
/// 1. Build tax base from deal components
/// 2. Apply trade-in credit (if state allows)
/// 3. Apply rebate reduction (if state allows)
/// 4. Apply any caps (NC $80k, WV $25k trade credit, etc.)
/// 5. Calculate tax by component (state, local)
/// 6. Handle special taxes (TAVT, HUT, excise)
/// 7. Calculate reciprocity credit if interstate
/// 8. Produce final tax breakdown
///
/// # Special State Handling
///
/// ## Georgia TAVT
/// - Title Ad Valorem Tax replaces sales tax
/// - 6.75% on new vehicles, 7% on used (at titling)
/// - Trade-in and rebates reduce basis
///
/// ## North Carolina HUT
/// - Highway Use Tax (3%) instead of sales tax
/// - Capped at first $80,000 of purchase price
/// - Trade-in reduces basis
///
/// ## West Virginia
/// - Regular sales tax PLUS excise/privilege tax
/// - Trade-in credit capped at $25,000
///
/// # Complexity
/// - Time: O(c) where c = number of tax components
/// - Space: O(c) for component storage
pub fn calculate_tax(deal: ProfileLoadedDeal) -> UdcResult<TaxComputedDeal> {
    let rules = &deal.profiles.primary_rules;
    let input = &deal.deal.deal.input;

    let mut audit = Vec::new();

    // Step 1: Build initial tax base
    let (base_breakdown, initial_base) = build_tax_base(&deal, &mut audit)?;

    // Step 2: Handle special tax types
    let (tax_type, special_tax) = match rules.tax_type {
        TaxType::Tavt => calculate_tavt(&deal, initial_base, &mut audit)?,
        TaxType::Hut => calculate_hut(&deal, initial_base, &mut audit)?,
        TaxType::Excise => calculate_excise(&deal, initial_base, &mut audit)?,
        TaxType::None => (TaxType::None, None),
        TaxType::Sales | TaxType::Use => {
            // Standard sales/use tax
            (rules.tax_type, None)
        }
    };

    // Step 3: Calculate tax components
    let (components, primary_tax, effective_rate) = if tax_type == TaxType::None {
        (vec![], dec!(0), dec!(0))
    } else if special_tax.is_some() {
        // Special tax already calculated
        let st = special_tax.as_ref().unwrap();
        let comp = TaxComponent {
            name: st.name.clone(),
            level: TaxLevel::Special,
            rate: st.rate,
            base: st.base,
            amount: st.amount,
        };
        (vec![comp], st.amount, st.rate)
    } else {
        calculate_standard_tax(&deal, initial_base, &mut audit)?
    };

    // Step 4: Calculate reciprocity credit
    let reciprocity_credit = calculate_reciprocity_credit(&deal, primary_tax, &mut audit)?;

    // Step 5: Compute net tax
    let net_tax = (primary_tax - reciprocity_credit).max(dec!(0));

    audit.push(TaxAuditEntry {
        step: "NET_TAX".to_string(),
        description: "Final net tax after reciprocity".to_string(),
        input_value: primary_tax,
        output_value: net_tax,
        rule_applied: format!("primary({}) - reciprocity({}) = net({})",
            primary_tax, reciprocity_credit, net_tax),
    });

    let tax = TaxCalculation {
        tax_base: initial_base,
        base_breakdown,
        primary_tax,
        tax_type,
        effective_rate,
        reciprocity_credit,
        net_tax,
        components,
        special_tax,
        audit,
    };

    // Validate invariants
    validate_tax_invariants(&tax)?;

    Ok(TaxComputedDeal { deal, tax })
}

/// Build the tax base from deal components.
///
/// # Formula
/// ```text
/// base = selling_price + taxable_fees + taxable_products
///      - trade_credit (if allowed)
///      - rebates (if allowed)
/// ```
fn build_tax_base(
    deal: &ProfileLoadedDeal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<(TaxBaseBreakdown, Decimal)> {
    let input = &deal.deal.deal.input.inner;
    let rules = &deal.profiles.primary_rules;

    // Start with selling price
    let selling_price = input.vehicle_price;

    // Calculate taxable fees
    let taxable_fees = calculate_taxable_fees(&input.fees, rules);

    // Calculate taxable products
    let taxable_products = input.products
        .iter()
        .filter(|p| p.taxable)
        .map(|p| p.price)
        .sum::<Decimal>();

    // Initial base before credits
    let mut base = selling_price + taxable_fees + taxable_products;

    audit.push(TaxAuditEntry {
        step: "INITIAL_BASE".to_string(),
        description: "Base before credits".to_string(),
        input_value: selling_price,
        output_value: base,
        rule_applied: format!("price({}) + fees({}) + products({})",
            selling_price, taxable_fees, taxable_products),
    });

    // Apply trade-in credit if allowed
    let trade_credit_applied = if rules.base_rules.trade_in_reduces_basis {
        let gross_credit = input.trade_in_value.unwrap_or_default();
        // Apply cap if exists
        let credit = match rules.base_rules.max_trade_in_credit {
            Some(cap) => gross_credit.min(cap),
            None => gross_credit,
        };
        // Credit cannot exceed base and cannot be negative
        credit.min(base).max(dec!(0))
    } else {
        dec!(0)
    };

    if trade_credit_applied > dec!(0) {
        base -= trade_credit_applied;
        audit.push(TaxAuditEntry {
            step: "TRADE_CREDIT".to_string(),
            description: "Applied trade-in credit".to_string(),
            input_value: input.trade_in_value.unwrap_or_default(),
            output_value: trade_credit_applied,
            rule_applied: format!("trade_reduces_basis={}", rules.base_rules.trade_in_reduces_basis),
        });
    }

    // Apply rebate reduction if allowed
    let rebates_applied = if rules.base_rules.rebates_reduce_basis {
        let total_rebates = input.total_rebates();
        // Cannot reduce below zero
        total_rebates.min(base)
    } else {
        dec!(0)
    };

    if rebates_applied > dec!(0) {
        base -= rebates_applied;
        audit.push(TaxAuditEntry {
            step: "REBATE_CREDIT".to_string(),
            description: "Applied rebate reduction".to_string(),
            input_value: input.total_rebates(),
            output_value: rebates_applied,
            rule_applied: format!("rebates_reduce_basis={}", rules.base_rules.rebates_reduce_basis),
        });
    }

    // Apply maximum taxable amount cap if exists
    let cap_applied = if let Some(max) = rules.base_rules.max_taxable_amount {
        if base > max {
            let original = base;
            base = max;
            Some(format!("Capped from {} to {} per state rule", original, max))
        } else {
            None
        }
    } else {
        None
    };

    // Ensure base is never negative (invariant)
    base = base.max(dec!(0));

    let breakdown = TaxBaseBreakdown {
        selling_price,
        taxable_fees,
        taxable_products,
        trade_credit_applied,
        rebates_applied,
        adjustments: dec!(0),
        cap_applied,
    };

    Ok((breakdown, base.round_money()))
}

/// Calculate taxable fees based on state rules.
fn calculate_taxable_fees(
    fees: &crate::types::DealFees,
    rules: &crate::types::RuleProfile,
) -> Decimal {
    let mut taxable = dec!(0);

    // Doc fee
    if rules.base_rules.doc_fee_taxable {
        taxable += fees.doc_fee;
    }

    // Destination (usually taxable)
    if rules.base_rules.destination_taxable {
        taxable += fees.destination_fee;
    }

    // Dealer handling
    taxable += fees.dealer_handling_fee;

    // Check government fees (usually not taxable)
    if rules.ancillaries.registration_taxable {
        taxable += fees.registration_fee;
    }
    if rules.ancillaries.title_fee_taxable {
        taxable += fees.title_fee;
    }

    // Other fees
    for fee in &fees.other_fees {
        if fee.taxable {
            taxable += fee.amount;
        }
    }

    taxable
}

/// Calculate standard sales/use tax.
fn calculate_standard_tax(
    deal: &ProfileLoadedDeal,
    base: Decimal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<(Vec<TaxComponent>, Decimal, Decimal)> {
    let rules = &deal.profiles.primary_rules;
    let rates = &rules.rates;

    let mut components = Vec::new();
    let mut total_tax = dec!(0);
    let mut total_rate = dec!(0);

    // State tax
    if rates.state_rate > dec!(0) {
        let state_tax = (base * rates.state_rate).round_money();
        components.push(TaxComponent {
            name: format!("{:?} State Tax", rules.state_code),
            level: TaxLevel::State,
            rate: rates.state_rate,
            base,
            amount: state_tax,
        });
        total_tax += state_tax;
        total_rate += rates.state_rate;

        audit.push(TaxAuditEntry {
            step: "STATE_TAX".to_string(),
            description: "State tax calculation".to_string(),
            input_value: base,
            output_value: state_tax,
            rule_applied: format!("base * rate = {} * {} = {}", base, rates.state_rate, state_tax),
        });
    }

    // Local taxes (simplified - in production would look up by ZIP/county)
    // Use default combined rate minus state rate as proxy for local
    let local_rate = rates.default_combined_rate - rates.state_rate;
    if local_rate > dec!(0) {
        let local_tax = (base * local_rate).round_money();
        components.push(TaxComponent {
            name: "Local Tax".to_string(),
            level: TaxLevel::County,
            rate: local_rate,
            base,
            amount: local_tax,
        });
        total_tax += local_tax;
        total_rate += local_rate;
    }

    // District tax
    if rates.district_rate > dec!(0) {
        let district_tax = (base * rates.district_rate).round_money();
        components.push(TaxComponent {
            name: "District Tax".to_string(),
            level: TaxLevel::District,
            rate: rates.district_rate,
            base,
            amount: district_tax,
        });
        total_tax += district_tax;
        total_rate += rates.district_rate;
    }

    Ok((components, total_tax, total_rate))
}

/// Calculate Georgia TAVT (Title Ad Valorem Tax).
///
/// # Rules
/// - Replaces sales tax entirely
/// - 6.75% for new vehicles (7% for used in some counties)
/// - Paid at time of titling
/// - Trade-in and rebates reduce basis
fn calculate_tavt(
    deal: &ProfileLoadedDeal,
    base: Decimal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<(TaxType, Option<SpecialTax>)> {
    let rules = &deal.profiles.primary_rules;
    let rate = rules.rates.tavt_rate.unwrap_or(dec!(0.0675));

    let tax_amount = (base * rate).round_money();

    audit.push(TaxAuditEntry {
        step: "TAVT".to_string(),
        description: "Georgia Title Ad Valorem Tax".to_string(),
        input_value: base,
        output_value: tax_amount,
        rule_applied: format!("TAVT: {} * {} = {}", base, rate, tax_amount),
    });

    let special = SpecialTax {
        tax_type: TaxType::Tavt,
        name: "Georgia TAVT".to_string(),
        base,
        rate,
        amount: tax_amount,
        cap_applied: None,
    };

    Ok((TaxType::Tavt, Some(special)))
}

/// Calculate North Carolina HUT (Highway Use Tax).
///
/// # Rules
/// - 3% of purchase price
/// - Capped at first $80,000 of value
/// - Trade-in reduces basis
/// - Replaces sales tax on vehicles
fn calculate_hut(
    deal: &ProfileLoadedDeal,
    base: Decimal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<(TaxType, Option<SpecialTax>)> {
    let rules = &deal.profiles.primary_rules;
    let rate = rules.rates.hut_rate.unwrap_or(dec!(0.03));
    let cap = dec!(80000);

    // Apply cap
    let taxable_base = base.min(cap);
    let tax_amount = (taxable_base * rate).round_money();

    let cap_applied = if base > cap {
        Some(cap)
    } else {
        None
    };

    audit.push(TaxAuditEntry {
        step: "HUT".to_string(),
        description: "NC Highway Use Tax".to_string(),
        input_value: base,
        output_value: tax_amount,
        rule_applied: format!("HUT: min({}, {}) * {} = {}", base, cap, rate, tax_amount),
    });

    let special = SpecialTax {
        tax_type: TaxType::Hut,
        name: "NC Highway Use Tax".to_string(),
        base: taxable_base,
        rate,
        amount: tax_amount,
        cap_applied,
    };

    Ok((TaxType::Hut, Some(special)))
}

/// Calculate West Virginia excise/privilege tax.
///
/// # Rules
/// - 5% privilege tax on vehicle purchases
/// - Trade-in credit capped at $25,000
/// - May also have regular sales tax
fn calculate_excise(
    deal: &ProfileLoadedDeal,
    base: Decimal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<(TaxType, Option<SpecialTax>)> {
    let rules = &deal.profiles.primary_rules;
    let rate = rules.rates.excise_rate.unwrap_or(dec!(0.05));

    let tax_amount = (base * rate).round_money();

    audit.push(TaxAuditEntry {
        step: "EXCISE".to_string(),
        description: "WV Excise Tax".to_string(),
        input_value: base,
        output_value: tax_amount,
        rule_applied: format!("Excise: {} * {} = {}", base, rate, tax_amount),
    });

    let special = SpecialTax {
        tax_type: TaxType::Excise,
        name: "WV Privilege Tax".to_string(),
        base,
        rate,
        amount: tax_amount,
        cap_applied: None,
    };

    Ok((TaxType::Excise, Some(special)))
}

/// Calculate reciprocity credit for interstate transactions.
///
/// # Reciprocity Types
/// - Full Credit: 100% credit for taxes paid in another state
/// - Partial Credit: Credit up to home state's rate
/// - No Credit: Pay full tax in both states
/// - In Lieu: One tax substitutes for the other
///
/// # Invariant
/// Credit never exceeds theoretical home state tax
fn calculate_reciprocity_credit(
    deal: &ProfileLoadedDeal,
    primary_tax: Decimal,
    audit: &mut Vec<TaxAuditEntry>,
) -> UdcResult<Decimal> {
    let jurisdiction = &deal.deal.jurisdiction;

    // If not interstate, no reciprocity
    if !jurisdiction.is_interstate {
        return Ok(dec!(0));
    }

    // Get secondary rules
    let secondary_rules = match &deal.profiles.secondary_rules {
        Some(rules) => rules,
        None => return Ok(dec!(0)),
    };

    let primary_rules = &deal.profiles.primary_rules;
    let reciprocity = &primary_rules.reciprocity;

    // Check if primary state offers reciprocity
    if !reciprocity.offers_reciprocity {
        audit.push(TaxAuditEntry {
            step: "RECIPROCITY".to_string(),
            description: "No reciprocity offered".to_string(),
            input_value: dec!(0),
            output_value: dec!(0),
            rule_applied: "State does not offer reciprocity".to_string(),
        });
        return Ok(dec!(0));
    }

    // Calculate theoretical tax in transaction state
    // Note: ProfileLoadedDeal doesn't have tax yet - we calculate base from inputs
    let input = &deal.deal.deal.input.inner;
    let base = input.vehicle_price;  // Simplified - full implementation would calculate properly
    // Simplified: assume we'd use secondary state's combined rate
    let transaction_rate = secondary_rules.rates.default_combined_rate;
    let transaction_tax = (base * transaction_rate).round_money();

    // Determine credit amount
    let credit = if reciprocity.full_credit_states.contains(&secondary_rules.state_code) {
        // Full credit - credit equals tax paid in transaction state
        transaction_tax.min(primary_tax)
    } else if let Some(max_rate) = reciprocity.max_credit_rate {
        // Partial credit - credit up to max rate
        let max_credit = (base * max_rate).round_money();
        transaction_tax.min(max_credit).min(primary_tax)
    } else {
        // Default: credit up to home state rate
        transaction_tax.min(primary_tax)
    };

    if credit > dec!(0) {
        audit.push(TaxAuditEntry {
            step: "RECIPROCITY".to_string(),
            description: "Reciprocity credit applied".to_string(),
            input_value: transaction_tax,
            output_value: credit,
            rule_applied: format!(
                "Credit for tax paid in {:?}: {}",
                secondary_rules.state_code, credit
            ),
        });
    }

    Ok(credit)
}

/// Validate tax calculation invariants.
fn validate_tax_invariants(tax: &TaxCalculation) -> UdcResult<()> {
    // Invariant 1: Tax base is never negative
    if tax.tax_base < dec!(0) {
        return Err(UdcError::calculation(
            "Tax base cannot be negative",
            "P4_TAX",
        ));
    }

    // Invariant 2: Net tax is never negative
    if tax.net_tax < dec!(0) {
        return Err(UdcError::calculation(
            "Net tax cannot be negative",
            "P4_TAX",
        ));
    }

    // Invariant 3: Reciprocity credit never exceeds primary tax
    if tax.reciprocity_credit > tax.primary_tax {
        return Err(UdcError::calculation(
            "Reciprocity credit cannot exceed primary tax",
            "P4_TAX",
        ));
    }

    // Invariant 4: Component sum equals primary tax (within rounding)
    let component_sum: Decimal = tax.components.iter().map(|c| c.amount).sum();
    let diff = (component_sum - tax.primary_tax).abs();
    if diff > dec!(0.02) {
        return Err(UdcError::calculation(
            format!("Component sum {} != primary tax {}", component_sum, tax.primary_tax),
            "P4_TAX",
        ));
    }

    Ok(())
}

/// Calculate lease-specific taxes.
///
/// # Lease Tax Modes
/// - CapCostUpfront: Tax entire cap cost at signing
/// - MonthlyPayment: Tax each monthly payment
/// - DepreciationOnly: Tax only the depreciation portion
pub fn calculate_lease_tax(
    deal: &ProfileLoadedDeal,
    gross_cap_cost: Decimal,
    monthly_payment: Decimal,
    term_months: u32,
) -> UdcResult<LeaseTaxResult> {
    let rules = &deal.profiles.primary_rules;
    let tax_mode = rules.lease_tax_mode.unwrap_or(LeaseTaxMode::MonthlyPayment);
    let rate = rules.rates.default_combined_rate;

    match tax_mode {
        LeaseTaxMode::CapCostUpfront | LeaseTaxMode::CapitalizedCost => {
            // Tax full cap cost upfront
            let upfront_tax = (gross_cap_cost * rate).round_money();
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax,
                monthly_tax: dec!(0),
                total_tax: upfront_tax,
            })
        }
        LeaseTaxMode::MonthlyPayment => {
            // Tax each monthly payment
            let monthly_tax = (monthly_payment * rate).round_money();
            let total_tax = monthly_tax * Decimal::from(term_months);
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax: dec!(0),
                monthly_tax,
                total_tax,
            })
        }
        LeaseTaxMode::TotalPayments => {
            // Tax on total of all payments upfront or capitalized
            let total_payments = monthly_payment * Decimal::from(term_months);
            let upfront_tax = (total_payments * rate).round_money();
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax,
                monthly_tax: dec!(0),
                total_tax: upfront_tax,
            })
        }
        LeaseTaxMode::DepreciationOnly => {
            // Only tax the depreciation (simplified)
            // In practice, need to calculate actual depreciation
            let monthly_tax = (monthly_payment * rate).round_money();
            let total_tax = monthly_tax * Decimal::from(term_months);
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax: dec!(0),
                monthly_tax,
                total_tax,
            })
        }
        LeaseTaxMode::AcquisitionTax => {
            // Special acquisition tax (e.g., TX) - apply to cap cost
            let upfront_tax = (gross_cap_cost * rate).round_money();
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax,
                monthly_tax: dec!(0),
                total_tax: upfront_tax,
            })
        }
        LeaseTaxMode::Exempt => {
            Ok(LeaseTaxResult {
                mode: tax_mode,
                upfront_tax: dec!(0),
                monthly_tax: dec!(0),
                total_tax: dec!(0),
            })
        }
    }
}

/// Result of lease tax calculation
#[derive(Debug, Clone)]
pub struct LeaseTaxResult {
    pub mode: LeaseTaxMode,
    pub upfront_tax: Decimal,
    pub monthly_tax: Decimal,
    pub total_tax: Decimal,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealInput, DealFees, CustomerInfo, FinanceParams, Product, ProductType, Rebate, RebateType};
    use crate::phases::p0_normalize::normalize_deal_input;
    use crate::phases::p1_mode_routing::route_deal;
    use crate::phases::p2_jurisdiction::resolve_jurisdiction;
    use crate::phases::p3_profiles::load_profiles;

    fn make_test_deal(
        state: StateCode,
        vehicle_price: Decimal,
        trade_in: Option<Decimal>,
        rebates: Decimal,
    ) -> ProfileLoadedDeal {
        let input = DealInput {
            deal_type: crate::types::DealType::Finance,
            vehicle_price,
            trade_in_value: trade_in,
            trade_in_payoff: Some(dec!(0)),
            cash_down: dec!(2000),
            rebates: if rebates > dec!(0) {
                vec![Rebate {
                    id: "R1".to_string(),
                    name: "Manufacturer Rebate".to_string(),
                    amount: rebates,
                    rebate_type: RebateType::Manufacturer,
                    reduces_tax_basis: true,
                    program_code: None,
                }]
            } else {
                vec![]
            },
            products: vec![],
            fees: DealFees {
                doc_fee: dec!(299),
                ..Default::default()
            },
            home_state: state,
            transaction_state: state,
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
        };

        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();
        let resolved = resolve_jurisdiction(routed).unwrap();
        load_profiles(resolved).unwrap()
    }

    #[test]
    fn test_texas_tax_with_trade() {
        let deal = make_test_deal(StateCode::TX, dec!(30000), Some(dec!(10000)), dec!(0));
        let result = calculate_tax(deal).unwrap();

        // TX: trade reduces basis, 8.25% rate, doc fee taxable
        // Base = 30000 + 299 - 10000 = 20299
        // Tax = 20299 * 0.0825 = 1674.67
        assert_eq!(result.tax.tax_base, dec!(20299));
        assert!(result.tax.primary_tax > dec!(1600));
        assert!(result.tax.base_breakdown.trade_credit_applied > dec!(0));
    }

    #[test]
    fn test_california_no_trade_credit() {
        let deal = make_test_deal(StateCode::CA, dec!(30000), Some(dec!(10000)), dec!(1000));
        let result = calculate_tax(deal).unwrap();

        // CA: trade does NOT reduce basis, rebates DO
        // Base should NOT be reduced by trade
        assert_eq!(result.tax.base_breakdown.trade_credit_applied, dec!(0));
        // But rebates should reduce
        assert!(result.tax.base_breakdown.rebates_applied > dec!(0));
    }

    #[test]
    fn test_georgia_tavt() {
        let deal = make_test_deal(StateCode::GA, dec!(30000), Some(dec!(10000)), dec!(0));
        let result = calculate_tax(deal).unwrap();

        // GA: TAVT at 6.75%, trade reduces basis
        assert_eq!(result.tax.tax_type, TaxType::Tavt);
        assert!(result.tax.special_tax.is_some());
        let tavt = result.tax.special_tax.unwrap();
        assert_eq!(tavt.rate, dec!(0.0675));
    }

    #[test]
    fn test_nc_hut_cap() {
        // Test NC HUT cap at $80,000
        let deal = make_test_deal(StateCode::NC, dec!(100000), None, dec!(0));
        let result = calculate_tax(deal).unwrap();

        assert_eq!(result.tax.tax_type, TaxType::Hut);
        let hut = result.tax.special_tax.unwrap();
        // Should be capped at $80,000
        assert_eq!(hut.base, dec!(80299)); // 80000 + 299 doc fee, but capped
        assert!(hut.cap_applied.is_some());
    }

    #[test]
    fn test_no_tax_state() {
        let deal = make_test_deal(StateCode::MT, dec!(30000), None, dec!(0));
        let result = calculate_tax(deal).unwrap();

        assert_eq!(result.tax.tax_type, TaxType::None);
        assert_eq!(result.tax.net_tax, dec!(0));
    }

    #[test]
    fn test_invariants_hold() {
        let deal = make_test_deal(StateCode::TX, dec!(30000), Some(dec!(10000)), dec!(1000));
        let result = calculate_tax(deal);

        // Should not error - invariants should pass
        assert!(result.is_ok());
        let tax = result.unwrap().tax;

        // Verify invariants directly
        assert!(tax.tax_base >= dec!(0), "Tax base must be non-negative");
        assert!(tax.net_tax >= dec!(0), "Net tax must be non-negative");
        assert!(tax.reciprocity_credit <= tax.primary_tax, "Reciprocity <= primary");
    }
}
