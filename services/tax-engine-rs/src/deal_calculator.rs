//! Deal Calculator - Main Integration Module
//!
//! Integrates tax, finance, and lease calculations into a unified
//! deal calculation engine. This is the primary entry point for
//! complete deal calculations.
//!
//! Designed to match/exceed Reynolds, CDK, VinSolutions functionality.

use crate::deal_types::*;
use crate::finance;
use crate::lease::{self, LeaseTaxMethod};
use crate::calculator;
use crate::types::*;

// ============================================================================
// Main Deal Calculator
// ============================================================================

/// Calculate a complete deal
pub fn calculate_deal(
    input: &DealInput,
    tax_rules: Option<&TaxRulesConfig>,
) -> Result<DealResult, String> {
    // Validate input
    let validation_errors = validate_deal_input(input);
    if !validation_errors.is_empty() {
        return Ok(DealResult {
            deal_type: input.deal_type,
            is_valid: false,
            validation_errors,
            price_breakdown: default_price_breakdown(),
            tax_breakdown: default_tax_breakdown(),
            payment_info: default_payment_info(),
            profit_analysis: default_profit_analysis(),
            totals: default_totals(),
            payment_matrix: None,
        });
    }

    // Calculate based on deal type
    match input.deal_type {
        DealTypeEnum::Cash => calculate_cash_deal(input, tax_rules),
        DealTypeEnum::Finance => calculate_finance_deal(input, tax_rules),
        DealTypeEnum::Lease => calculate_lease_deal(input, tax_rules),
    }
}

// ============================================================================
// Cash Deal Calculation
// ============================================================================

fn calculate_cash_deal(
    input: &DealInput,
    tax_rules: Option<&TaxRulesConfig>,
) -> Result<DealResult, String> {
    // Calculate price components
    let price = calculate_price_breakdown(input);

    // Calculate taxes
    let tax = calculate_tax_breakdown(input, &price, tax_rules);

    // Calculate totals
    let total_due = price.selling_price
        - price.total_rebates
        + price.total_fees
        + price.total_fi_products
        + tax.total_tax
        - price.net_trade;

    let balance_due = total_due - price.cash_down;

    // Profit analysis
    let profit = calculate_profit_analysis(input, &price);

    let totals = DealTotals {
        amount_financed: 0.0,
        total_sale_price: total_due,
        total_due: round_currency(total_due),
        balance_due: round_currency(balance_due),
        total_drive_off: round_currency(balance_due),
        amount_financed_tila: 0.0,
        finance_charge_tila: 0.0,
        total_of_payments_tila: round_currency(balance_due),
        total_sale_price_tila: round_currency(total_due),
    };

    let payment_info = PaymentInfo {
        payment: round_currency(balance_due),
        payment_with_tax: round_currency(balance_due),
        term_months: 1,
        payment_frequency: PaymentFrequency::Monthly,
        apr: None,
        total_of_payments: Some(balance_due),
        total_interest: Some(0.0),
        finance_charge: Some(0.0),
        money_factor: None,
        equivalent_apr: None,
        depreciation: None,
        rent_charge: None,
        monthly_depreciation: None,
        monthly_rent_charge: None,
        due_at_signing: round_currency(balance_due),
        first_payment: round_currency(balance_due),
        security_deposit: 0.0,
        upfront_taxes: tax.upfront_tax,
        upfront_fees: price.non_taxable_fees,
    };

    Ok(DealResult {
        deal_type: DealTypeEnum::Cash,
        is_valid: true,
        validation_errors: vec![],
        price_breakdown: price,
        tax_breakdown: tax,
        payment_info,
        profit_analysis: profit,
        totals,
        payment_matrix: None,
    })
}

// ============================================================================
// Finance Deal Calculation
// ============================================================================

fn calculate_finance_deal(
    input: &DealInput,
    tax_rules: Option<&TaxRulesConfig>,
) -> Result<DealResult, String> {
    let finance_input = input.finance_input.as_ref()
        .ok_or("Finance input required for finance deals")?;

    // Calculate price components
    let price = calculate_price_breakdown(input);

    // Calculate taxes
    let tax = calculate_tax_breakdown(input, &price, tax_rules);

    // Calculate amount financed
    let financed_fi_products: f64 = input.fi_products.iter()
        .filter(|p| p.finance_with_deal)
        .map(|p| p.price)
        .sum();

    let amount_financed = finance::calculate_amount_financed(
        price.selling_price,
        price.trade_allowance,
        price.trade_payoff,
        price.total_rebates,
        price.cash_down,
        tax.total_tax,
        price.total_fees,
        financed_fi_products,
        0.0, // Prepaid charges
    );

    // Calculate payment
    let payment = finance::calculate_payment(
        amount_financed,
        finance_input.apr,
        finance_input.term_months,
    );

    let total_of_payments = finance::calculate_total_of_payments(
        payment,
        finance_input.term_months,
    );

    let total_interest = finance::calculate_total_interest(
        amount_financed,
        payment,
        finance_input.term_months,
    );

    // Finance charge (TILA)
    let finance_charge = finance::calculate_finance_charge(
        amount_financed,
        total_of_payments,
        0.0,
    );

    // Reserve calculation
    let reserve = if let Some(buy_rate) = finance_input.buy_rate {
        finance::calculate_dealer_reserve(
            amount_financed,
            buy_rate,
            finance_input.apr,
            finance_input.term_months,
            None,
        )
    } else {
        0.0
    };

    // Profit analysis
    let mut profit = calculate_profit_analysis(input, &price);
    profit.reserve = reserve;
    profit.back_end_gross += reserve;
    profit.total_gross = profit.front_end_gross + profit.back_end_gross;

    // Due at signing
    let non_financed_fi: f64 = input.fi_products.iter()
        .filter(|p| !p.finance_with_deal)
        .map(|p| p.price)
        .sum();

    let due_at_signing = price.cash_down + non_financed_fi;

    let totals = DealTotals {
        amount_financed: round_currency(amount_financed),
        total_sale_price: round_currency(amount_financed + finance_charge + due_at_signing),
        total_due: round_currency(amount_financed + due_at_signing),
        balance_due: round_currency(amount_financed),
        total_drive_off: round_currency(due_at_signing),
        amount_financed_tila: round_currency(amount_financed),
        finance_charge_tila: round_currency(finance_charge),
        total_of_payments_tila: round_currency(total_of_payments),
        total_sale_price_tila: round_currency(total_of_payments + due_at_signing),
    };

    let payment_info = PaymentInfo {
        payment: round_currency(payment),
        payment_with_tax: round_currency(payment), // Tax already in amount financed
        term_months: finance_input.term_months,
        payment_frequency: finance_input.payment_frequency,
        apr: Some(finance_input.apr),
        total_of_payments: Some(round_currency(total_of_payments)),
        total_interest: Some(round_currency(total_interest)),
        finance_charge: Some(round_currency(finance_charge)),
        money_factor: None,
        equivalent_apr: None,
        depreciation: None,
        rent_charge: None,
        monthly_depreciation: None,
        monthly_rent_charge: None,
        due_at_signing: round_currency(due_at_signing),
        first_payment: round_currency(payment),
        security_deposit: 0.0,
        upfront_taxes: 0.0,
        upfront_fees: 0.0,
    };

    // Generate payment matrix
    let payment_matrix = Some(finance::generate_payment_matrix(
        amount_financed,
        finance_input.apr,
        &[36, 48, 60, 72, 84],
        &[-1.0, 0.0, 1.0],
    ));

    Ok(DealResult {
        deal_type: DealTypeEnum::Finance,
        is_valid: true,
        validation_errors: vec![],
        price_breakdown: price,
        tax_breakdown: tax,
        payment_info,
        profit_analysis: profit,
        totals,
        payment_matrix,
    })
}

// ============================================================================
// Lease Deal Calculation
// ============================================================================

fn calculate_lease_deal(
    input: &DealInput,
    tax_rules: Option<&TaxRulesConfig>,
) -> Result<DealResult, String> {
    let lease_input = input.lease_input.as_ref()
        .ok_or("Lease input required for lease deals")?;

    // Calculate price components
    let price = calculate_price_breakdown(input);

    // Determine tax method based on state rules
    let tax_method = determine_lease_tax_method(tax_rules);

    // Get tax rate
    let (state_rate, local_rate) = get_tax_rates(&input.state_code, tax_rules);
    let combined_rate = state_rate + local_rate;

    // Capitalized fees
    let cap_fees: f64 = input.fees.iter()
        .filter(|f| f.capitalize_in_lease)
        .map(|f| f.amount)
        .sum();

    let non_cap_fees: f64 = input.fees.iter()
        .filter(|f| !f.capitalize_in_lease)
        .map(|f| f.amount)
        .sum();

    // F&I products for lease
    let fi_for_lease: f64 = input.fi_products.iter()
        .filter(|p| p.finance_with_deal)
        .map(|p| p.price)
        .sum();

    // Calculate lease
    let lease_calc = lease::calculate_lease(
        input.vehicle_msrp,
        price.selling_price,
        lease_input,
        price.trade_allowance,
        price.trade_payoff,
        price.total_rebates,
        price.cash_down,
        fi_for_lease,
        price.taxable_fees,
        price.non_taxable_fees,
        lease_input.acquisition_fee,
        combined_rate,
        tax_method,
    );

    // Tax breakdown
    let tax = TaxBreakdown {
        taxable_amount: lease_calc.adjusted_cap_cost,
        state_tax_rate: state_rate,
        local_tax_rate: local_rate,
        combined_rate,
        state_tax: lease_calc.monthly_tax * lease_input.term_months as f64 * (state_rate / combined_rate),
        local_tax: lease_calc.monthly_tax * lease_input.term_months as f64 * (local_rate / combined_rate),
        total_tax: lease_calc.monthly_tax * lease_input.term_months as f64 + lease_calc.upfront_tax,
        upfront_tax: lease_calc.upfront_tax,
        monthly_tax: lease_calc.monthly_tax,
        title_tax: None,
        luxury_tax: None,
        special_tax: None,
        tax_on_vehicle: 0.0,
        tax_on_fees: 0.0,
        tax_on_fi_products: 0.0,
    };

    // Update price breakdown with lease-specific values
    let mut price = price;
    price.gross_cap_cost = Some(lease_calc.gross_cap_cost);
    price.cap_cost_reduction = Some(lease_calc.cap_cost_reduction);
    price.adjusted_cap_cost = Some(lease_calc.adjusted_cap_cost);
    price.residual_value = Some(lease_calc.residual_value);
    price.capitalized_fees = cap_fees;

    // Profit analysis
    let mut profit = calculate_profit_analysis(input, &price);
    // Add lease-specific profit calculations here

    let totals = DealTotals {
        amount_financed: 0.0,
        total_sale_price: lease_calc.total_lease_cost,
        total_due: lease_calc.total_due_at_signing,
        balance_due: 0.0,
        total_drive_off: lease_calc.total_due_at_signing,
        amount_financed_tila: 0.0,
        finance_charge_tila: 0.0,
        total_of_payments_tila: lease_calc.total_of_payments,
        total_sale_price_tila: lease_calc.total_lease_cost,
    };

    let payment_info = PaymentInfo {
        payment: lease_calc.base_payment,
        payment_with_tax: lease_calc.total_monthly_payment,
        term_months: lease_input.term_months,
        payment_frequency: PaymentFrequency::Monthly,
        apr: None,
        total_of_payments: Some(lease_calc.total_of_payments),
        total_interest: None,
        finance_charge: None,
        money_factor: Some(lease_calc.money_factor),
        equivalent_apr: Some(lease_calc.equivalent_apr),
        depreciation: Some(lease_calc.depreciation * lease_input.term_months as f64),
        rent_charge: Some(lease_calc.rent_charge * lease_input.term_months as f64),
        monthly_depreciation: Some(lease_calc.depreciation),
        monthly_rent_charge: Some(lease_calc.rent_charge),
        due_at_signing: lease_calc.total_due_at_signing,
        first_payment: lease_calc.first_month_payment,
        security_deposit: lease_calc.security_deposit,
        upfront_taxes: lease_calc.upfront_tax,
        upfront_fees: non_cap_fees + lease_calc.acquisition_fee_upfront,
    };

    Ok(DealResult {
        deal_type: DealTypeEnum::Lease,
        is_valid: true,
        validation_errors: vec![],
        price_breakdown: price,
        tax_breakdown: tax,
        payment_info,
        profit_analysis: profit,
        totals,
        payment_matrix: None,
    })
}

// ============================================================================
// Helper Functions
// ============================================================================

fn calculate_price_breakdown(input: &DealInput) -> PriceBreakdown {
    // Trade-in values
    let (trade_allowance, trade_payoff, net_trade) = if let Some(ref trade) = input.trade_in {
        (trade.gross_allowance, trade.payoff_amount, trade.net_value())
    } else {
        (0.0, 0.0, 0.0)
    };

    // Rebates
    let total_rebates: f64 = input.rebates.iter().map(|r| r.amount).sum();
    let taxable_rebates: f64 = input.rebates.iter()
        .filter(|r| r.taxable.unwrap_or(false))
        .map(|r| r.amount)
        .sum();
    let non_taxable_rebates = total_rebates - taxable_rebates;

    // F&I products
    let total_fi: f64 = input.fi_products.iter().map(|p| p.price).sum();
    let financed_fi: f64 = input.fi_products.iter()
        .filter(|p| p.finance_with_deal)
        .map(|p| p.price)
        .sum();
    let cash_fi = total_fi - financed_fi;

    // Fees
    let total_fees: f64 = input.fees.iter().map(|f| f.amount).sum();
    let taxable_fees: f64 = input.fees.iter()
        .filter(|f| f.taxable.unwrap_or(false))
        .map(|f| f.amount)
        .sum();
    let non_taxable_fees = total_fees - taxable_fees;
    let cap_fees: f64 = input.fees.iter()
        .filter(|f| f.capitalize_in_lease)
        .map(|f| f.amount)
        .sum();

    PriceBreakdown {
        vehicle_msrp: input.vehicle_msrp,
        vehicle_invoice: input.vehicle_invoice,
        selling_price: input.selling_price,
        trade_allowance,
        trade_payoff,
        net_trade,
        total_rebates,
        taxable_rebates,
        non_taxable_rebates,
        total_fi_products: total_fi,
        financed_fi_products: financed_fi,
        cash_fi_products: cash_fi,
        total_fees,
        taxable_fees,
        non_taxable_fees,
        capitalized_fees: cap_fees,
        cash_down: input.cash_down,
        gross_cap_cost: None,
        cap_cost_reduction: None,
        adjusted_cap_cost: None,
        residual_value: None,
    }
}

fn calculate_tax_breakdown(
    input: &DealInput,
    price: &PriceBreakdown,
    tax_rules: Option<&TaxRulesConfig>,
) -> TaxBreakdown {
    let (state_rate, local_rate) = get_tax_rates(&input.state_code, tax_rules);
    let combined_rate = state_rate + local_rate;

    // Calculate taxable amount
    let mut taxable = price.selling_price;

    // Apply trade-in credit (based on rules)
    if let Some(rules) = tax_rules {
        let credit = match &rules.trade_in_policy {
            TradeInPolicy::None { .. } => 0.0,
            TradeInPolicy::Full { .. } => price.trade_allowance,
            TradeInPolicy::Capped { cap_amount, .. } => price.trade_allowance.min(*cap_amount),
            TradeInPolicy::Percent { percent, .. } => price.trade_allowance * (percent / 100.0),
        };
        taxable -= credit;
    } else {
        // Default: full trade-in credit
        taxable -= price.trade_allowance;
    }

    // Subtract non-taxable rebates
    taxable -= price.non_taxable_rebates;

    // Add taxable fees and F&I
    taxable += price.taxable_fees;

    // Taxable F&I products
    let taxable_fi: f64 = input.fi_products.iter()
        .filter(|p| p.taxable.unwrap_or(false))
        .map(|p| p.price)
        .sum();
    taxable += taxable_fi;

    taxable = taxable.max(0.0);

    let state_tax = taxable * state_rate;
    let local_tax = taxable * local_rate;
    let total_tax = state_tax + local_tax;

    TaxBreakdown {
        taxable_amount: round_currency(taxable),
        state_tax_rate: state_rate,
        local_tax_rate: local_rate,
        combined_rate,
        state_tax: round_currency(state_tax),
        local_tax: round_currency(local_tax),
        total_tax: round_currency(total_tax),
        upfront_tax: round_currency(total_tax),
        monthly_tax: 0.0,
        title_tax: None,
        luxury_tax: None,
        special_tax: None,
        tax_on_vehicle: round_currency(price.selling_price * combined_rate),
        tax_on_fees: round_currency(price.taxable_fees * combined_rate),
        tax_on_fi_products: round_currency(taxable_fi * combined_rate),
    }
}

fn calculate_profit_analysis(input: &DealInput, price: &PriceBreakdown) -> ProfitAnalysis {
    // Front-end gross (vehicle profit)
    let invoice = input.vehicle_invoice.unwrap_or(input.vehicle_msrp * 0.92);
    let vehicle_gross = price.selling_price - invoice;

    // Back-end gross (F&I profit)
    let fi_gross: f64 = input.fi_products.iter()
        .map(|p| p.price - p.cost.unwrap_or(0.0))
        .sum();

    let front_end = vehicle_gross + price.net_trade.min(0.0).abs(); // Add over-allowance

    ProfitAnalysis {
        front_end_gross: round_currency(front_end),
        back_end_gross: round_currency(fi_gross),
        total_gross: round_currency(front_end + fi_gross),
        vehicle_gross: round_currency(vehicle_gross),
        holdback: None,
        pack: None,
        fi_gross: round_currency(fi_gross),
        reserve: 0.0,
        trade_acv: input.trade_in.as_ref().and_then(|t| t.acv),
        trade_over_allow: input.trade_in.as_ref().map(|t| {
            t.acv.unwrap_or(t.gross_allowance) - t.gross_allowance
        }),
    }
}

fn get_tax_rates(state_code: &str, _tax_rules: Option<&TaxRulesConfig>) -> (f64, f64) {
    // Return (state_rate, local_rate)
    // TODO: Use tax_rules when available
    match state_code {
        "AL" => (0.02, 0.04),
        "AK" => (0.0, 0.0),
        "AZ" => (0.056, 0.02),
        "AR" => (0.065, 0.025),
        "CA" => (0.0725, 0.01),
        "CO" => (0.029, 0.05),
        "CT" => (0.0635, 0.0),
        "DE" => (0.0, 0.0),
        "FL" => (0.06, 0.01),
        "GA" => (0.04, 0.03),
        "HI" => (0.04, 0.005),
        "ID" => (0.06, 0.0),
        "IL" => (0.0625, 0.025),
        "IN" => (0.07, 0.0),
        "IA" => (0.06, 0.01),
        "KS" => (0.065, 0.03),
        "KY" => (0.06, 0.0),
        "LA" => (0.0445, 0.05),
        "ME" => (0.055, 0.0),
        "MD" => (0.06, 0.0),
        "MA" => (0.0625, 0.0),
        "MI" => (0.06, 0.0),
        "MN" => (0.065, 0.005),
        "MS" => (0.07, 0.0),
        "MO" => (0.04225, 0.04),
        "MT" => (0.0, 0.0),
        "NE" => (0.055, 0.02),
        "NV" => (0.0685, 0.01),
        "NH" => (0.0, 0.0),
        "NJ" => (0.06625, 0.0),
        "NM" => (0.05125, 0.03),
        "NY" => (0.04, 0.045),
        "NC" => (0.03, 0.0), // HUT state
        "ND" => (0.05, 0.02),
        "OH" => (0.0575, 0.02),
        "OK" => (0.045, 0.045),
        "OR" => (0.0, 0.0),
        "PA" => (0.06, 0.02),
        "RI" => (0.07, 0.0),
        "SC" => (0.06, 0.03),
        "SD" => (0.045, 0.02),
        "TN" => (0.07, 0.025),
        "TX" => (0.0625, 0.02),
        "UT" => (0.0485, 0.025),
        "VT" => (0.06, 0.01),
        "VA" => (0.043, 0.01),
        "WA" => (0.065, 0.03),
        "WV" => (0.06, 0.0), // Privilege tax state
        "WI" => (0.05, 0.006),
        "WY" => (0.04, 0.02),
        "DC" => (0.06, 0.0),
        _ => (0.05, 0.01), // Default
    }
}

fn determine_lease_tax_method(_tax_rules: Option<&TaxRulesConfig>) -> LeaseTaxMethod {
    // TODO: Determine from tax_rules when available
    LeaseTaxMethod::Monthly
}

fn validate_deal_input(input: &DealInput) -> Vec<String> {
    let mut errors = Vec::new();

    if input.selling_price <= 0.0 {
        errors.push("Selling price must be greater than zero".to_string());
    }

    if input.vehicle_msrp <= 0.0 {
        errors.push("Vehicle MSRP must be greater than zero".to_string());
    }

    if input.cash_down < 0.0 {
        errors.push("Cash down cannot be negative".to_string());
    }

    if let Some(ref finance) = input.finance_input {
        if finance.apr < 0.0 || finance.apr > 99.9 {
            errors.push("APR must be between 0 and 99.9%".to_string());
        }
        if finance.term_months < 12 || finance.term_months > 96 {
            errors.push("Finance term must be between 12 and 96 months".to_string());
        }
    }

    if let Some(ref lease) = input.lease_input {
        if lease.money_factor < 0.0 || lease.money_factor > 0.01 {
            errors.push("Money factor must be between 0 and 0.01".to_string());
        }
        if lease.residual_percent < 20.0 || lease.residual_percent > 90.0 {
            errors.push("Residual percent must be between 20% and 90%".to_string());
        }
        if lease.term_months < 12 || lease.term_months > 60 {
            errors.push("Lease term must be between 12 and 60 months".to_string());
        }
    }

    errors
}

// Default constructors for error cases
fn default_price_breakdown() -> PriceBreakdown {
    PriceBreakdown {
        vehicle_msrp: 0.0,
        vehicle_invoice: None,
        selling_price: 0.0,
        trade_allowance: 0.0,
        trade_payoff: 0.0,
        net_trade: 0.0,
        total_rebates: 0.0,
        taxable_rebates: 0.0,
        non_taxable_rebates: 0.0,
        total_fi_products: 0.0,
        financed_fi_products: 0.0,
        cash_fi_products: 0.0,
        total_fees: 0.0,
        taxable_fees: 0.0,
        non_taxable_fees: 0.0,
        capitalized_fees: 0.0,
        cash_down: 0.0,
        gross_cap_cost: None,
        cap_cost_reduction: None,
        adjusted_cap_cost: None,
        residual_value: None,
    }
}

fn default_tax_breakdown() -> TaxBreakdown {
    TaxBreakdown {
        taxable_amount: 0.0,
        state_tax_rate: 0.0,
        local_tax_rate: 0.0,
        combined_rate: 0.0,
        state_tax: 0.0,
        local_tax: 0.0,
        total_tax: 0.0,
        upfront_tax: 0.0,
        monthly_tax: 0.0,
        title_tax: None,
        luxury_tax: None,
        special_tax: None,
        tax_on_vehicle: 0.0,
        tax_on_fees: 0.0,
        tax_on_fi_products: 0.0,
    }
}

fn default_payment_info() -> PaymentInfo {
    PaymentInfo {
        payment: 0.0,
        payment_with_tax: 0.0,
        term_months: 0,
        payment_frequency: PaymentFrequency::Monthly,
        apr: None,
        total_of_payments: None,
        total_interest: None,
        finance_charge: None,
        money_factor: None,
        equivalent_apr: None,
        depreciation: None,
        rent_charge: None,
        monthly_depreciation: None,
        monthly_rent_charge: None,
        due_at_signing: 0.0,
        first_payment: 0.0,
        security_deposit: 0.0,
        upfront_taxes: 0.0,
        upfront_fees: 0.0,
    }
}

fn default_profit_analysis() -> ProfitAnalysis {
    ProfitAnalysis {
        front_end_gross: 0.0,
        back_end_gross: 0.0,
        total_gross: 0.0,
        vehicle_gross: 0.0,
        holdback: None,
        pack: None,
        fi_gross: 0.0,
        reserve: 0.0,
        trade_acv: None,
        trade_over_allow: None,
    }
}

fn default_totals() -> DealTotals {
    DealTotals {
        amount_financed: 0.0,
        total_sale_price: 0.0,
        total_due: 0.0,
        balance_due: 0.0,
        total_drive_off: 0.0,
        amount_financed_tila: 0.0,
        finance_charge_tila: 0.0,
        total_of_payments_tila: 0.0,
        total_sale_price_tila: 0.0,
    }
}

fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_deal_input(deal_type: DealTypeEnum) -> DealInput {
        DealInput {
            deal_type,
            state_code: "IN".to_string(),
            local_jurisdiction: None,
            vehicle_msrp: 40000.0,
            vehicle_invoice: Some(36000.0),
            selling_price: 38000.0,
            trade_in: Some(TradeInInput {
                gross_allowance: 10000.0,
                payoff_amount: 8000.0,
                payoff_good_through: None,
                per_diem: None,
                acv: Some(9000.0),
                year: Some(2020),
                make: Some("Honda".to_string()),
                model: Some("Accord".to_string()),
                vin: None,
                mileage: Some(45000),
            }),
            rebates: vec![
                RebateInput {
                    name: "Manufacturer Rebate".to_string(),
                    amount: 1500.0,
                    rebate_type: RebateTypeEnum::Manufacturer,
                    taxable: Some(false),
                    apply_to_cap_cost: true,
                },
            ],
            cash_down: 2000.0,
            fi_products: vec![
                FIProductInput {
                    name: "Extended Warranty".to_string(),
                    code: FIProductCode::ExtendedWarranty,
                    price: 1500.0,
                    cost: Some(800.0),
                    term_months: Some(60),
                    deductible: Some(100.0),
                    taxable: Some(false),
                    finance_with_deal: true,
                },
            ],
            fees: vec![
                FeeInput {
                    name: "Doc Fee".to_string(),
                    code: FeeCode::DocFee,
                    amount: 299.0,
                    taxable: Some(false),
                    capitalize_in_lease: true,
                },
                FeeInput {
                    name: "Title Fee".to_string(),
                    code: FeeCode::TitleFee,
                    amount: 50.0,
                    taxable: Some(false),
                    capitalize_in_lease: false,
                },
            ],
            finance_input: if deal_type == DealTypeEnum::Finance {
                Some(FinanceInput {
                    apr: 5.9,
                    term_months: 60,
                    first_payment_days: Some(45),
                    payment_frequency: PaymentFrequency::Monthly,
                    lender_name: Some("Test Bank".to_string()),
                    lender_fees: None,
                    buy_rate: Some(3.9),
                    cap_rate: Some(9.9),
                })
            } else {
                None
            },
            lease_input: if deal_type == DealTypeEnum::Lease {
                Some(LeaseInput {
                    term_months: 36,
                    annual_mileage: 12000,
                    excess_mileage_rate: 0.25,
                    residual_percent: 58.0,
                    residual_value: None,
                    money_factor: 0.00125,
                    buy_rate_mf: Some(0.00100),
                    security_deposit: 0.0,
                    security_deposit_waived: true,
                    msd_count: None,
                    msd_rate_reduction: None,
                    first_payment_due_at_signing: true,
                    acquisition_fee: 895.0,
                    acquisition_fee_cap: true,
                    disposition_fee: 395.0,
                    disposition_fee_waived: false,
                    sign_and_drive: false,
                    one_pay_lease: false,
                })
            } else {
                None
            },
        }
    }

    #[test]
    fn test_cash_deal() {
        let input = create_test_deal_input(DealTypeEnum::Cash);
        let result = calculate_deal(&input, None).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.deal_type, DealTypeEnum::Cash);
        assert!(result.totals.balance_due > 0.0);
        assert!(result.tax_breakdown.total_tax > 0.0);
    }

    #[test]
    fn test_finance_deal() {
        let input = create_test_deal_input(DealTypeEnum::Finance);
        let result = calculate_deal(&input, None).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.deal_type, DealTypeEnum::Finance);
        assert!(result.payment_info.payment > 0.0);
        assert!(result.payment_info.apr.is_some());
        assert!(result.totals.amount_financed > 0.0);
        assert!(result.payment_matrix.is_some());
    }

    #[test]
    fn test_lease_deal() {
        let input = create_test_deal_input(DealTypeEnum::Lease);
        let result = calculate_deal(&input, None).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.deal_type, DealTypeEnum::Lease);
        assert!(result.payment_info.payment > 0.0);
        assert!(result.payment_info.money_factor.is_some());
        assert!(result.price_breakdown.residual_value.is_some());
    }

    #[test]
    fn test_validation() {
        let mut input = create_test_deal_input(DealTypeEnum::Finance);
        input.selling_price = 0.0; // Invalid

        let result = calculate_deal(&input, None).unwrap();
        assert!(!result.is_valid);
        assert!(!result.validation_errors.is_empty());
    }
}
