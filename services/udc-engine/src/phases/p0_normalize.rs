//! P0 - Normalize Deal Input
//!
//! This phase cleans and normalizes the raw deal input:
//! - Validates required fields
//! - Normalizes money values (no negative prices, proper rounding)
//! - Enforces minimal fields based on deal type
//! - Sets defaults for optional fields
//! - Produces a validated, normalized DealInput

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

use crate::types::{
    DealInput, DealType, DealFees, CustomerInfo, FinanceParams, LeaseParams,
    UdcError, UdcResult,
};

/// Normalized deal input - guaranteed to have all required fields validated
#[derive(Debug, Clone)]
pub struct NormalizedDealInput {
    /// The original input, now validated and normalized
    pub inner: DealInput,
    /// Computed: net trade value (positive = equity, negative = underwater)
    pub net_trade: Decimal,
    /// Computed: total rebates
    pub total_rebates: Decimal,
    /// Computed: total taxable products
    pub total_taxable_products: Decimal,
    /// Computed: total non-taxable products
    pub total_non_taxable_products: Decimal,
    /// Computed: total fees
    pub total_fees: Decimal,
    /// Flag: customer has negative equity
    pub has_negative_equity: bool,
}

impl NormalizedDealInput {
    /// Access the underlying DealInput
    pub fn inner(&self) -> &DealInput {
        &self.inner
    }
}

/// P0: Normalize and validate the deal input.
///
/// # Algorithm
/// 1. Validate required fields exist and are non-negative
/// 2. Normalize money values (round to 2 decimals)
/// 3. Validate deal-type-specific required fields
/// 4. Compute derived values (net trade, totals)
/// 5. Set defaults for missing optional fields
///
/// # Invariants Enforced
/// - vehicle_price > 0
/// - cash_down >= 0
/// - All fee amounts >= 0
/// - For Finance: term_months in [12, 84], apr in [0, 0.30]
/// - For Lease: term_months in [24, 48], money_factor > 0, residual_percent in (0, 1)
///
/// # Complexity
/// - Time: O(n) where n = number of rebates + products + fees
/// - Space: O(1) additional space (in-place normalization)
pub fn normalize_deal_input(mut input: DealInput) -> UdcResult<NormalizedDealInput> {
    // === Step 1: Validate core required fields ===
    validate_vehicle_price(input.vehicle_price)?;
    validate_non_negative(input.cash_down, "cash_down")?;

    // === Step 2: Normalize money values to 2 decimal places ===
    input.vehicle_price = round_money(input.vehicle_price);
    input.cash_down = round_money(input.cash_down);
    input.trade_in_value = input.trade_in_value.map(round_money);
    input.trade_in_payoff = input.trade_in_payoff.map(round_money);

    // Normalize rebates
    for rebate in &mut input.rebates {
        validate_non_negative(rebate.amount, &format!("rebate.{}.amount", rebate.id))?;
        rebate.amount = round_money(rebate.amount);
    }

    // Normalize products
    for product in &mut input.products {
        validate_non_negative(product.price, &format!("product.{}.price", product.id))?;
        product.price = round_money(product.price);
        product.cost = round_money(product.cost);
    }

    // Normalize fees
    normalize_fees(&mut input.fees)?;

    // === Step 3: Validate deal-type-specific fields ===
    match input.deal_type {
        DealType::Finance => validate_finance_params(&input)?,
        DealType::Lease => validate_lease_params(&input)?,
        DealType::Cash => {} // No additional validation needed for cash
    }

    // === Step 4: Compute derived values ===
    let net_trade = compute_net_trade(&input);
    let has_negative_equity = net_trade < Decimal::ZERO;
    let total_rebates = input.total_rebates();
    let (total_taxable_products, total_non_taxable_products) = compute_product_totals(&input);
    let total_fees = input.fees.total();

    // === Step 5: Set defaults ===
    set_defaults(&mut input);

    Ok(NormalizedDealInput {
        inner: input,
        net_trade,
        total_rebates,
        total_taxable_products,
        total_non_taxable_products,
        total_fees,
        has_negative_equity,
    })
}

// === Helper Functions ===

fn validate_vehicle_price(price: Decimal) -> UdcResult<()> {
    if price <= Decimal::ZERO {
        return Err(UdcError::validation_field(
            "Vehicle price must be greater than zero",
            "vehicle_price",
        ));
    }
    if price > dec!(10_000_000) {
        return Err(UdcError::validation_field(
            "Vehicle price exceeds maximum allowed ($10,000,000)",
            "vehicle_price",
        ));
    }
    Ok(())
}

fn validate_non_negative(value: Decimal, field: &str) -> UdcResult<()> {
    if value < Decimal::ZERO {
        return Err(UdcError::validation_field(
            format!("{} cannot be negative", field),
            field.to_string(),
        ));
    }
    Ok(())
}

fn round_money(value: Decimal) -> Decimal {
    value.round_dp(2)
}

fn normalize_fees(fees: &mut DealFees) -> UdcResult<()> {
    // Validate all fees are non-negative
    validate_non_negative(fees.doc_fee, "fees.doc_fee")?;
    validate_non_negative(fees.title_fee, "fees.title_fee")?;
    validate_non_negative(fees.registration_fee, "fees.registration_fee")?;
    validate_non_negative(fees.plate_fee, "fees.plate_fee")?;
    validate_non_negative(fees.inspection_fee, "fees.inspection_fee")?;
    validate_non_negative(fees.electronic_filing_fee, "fees.electronic_filing_fee")?;
    validate_non_negative(fees.tire_fee, "fees.tire_fee")?;
    validate_non_negative(fees.smog_fee, "fees.smog_fee")?;
    validate_non_negative(fees.destination_fee, "fees.destination_fee")?;
    validate_non_negative(fees.dealer_handling_fee, "fees.dealer_handling_fee")?;
    validate_non_negative(fees.acquisition_fee, "fees.acquisition_fee")?;

    for other in &fees.other_fees {
        validate_non_negative(other.amount, &format!("fees.other.{}", other.name))?;
    }

    // Round all to 2 decimal places
    fees.doc_fee = round_money(fees.doc_fee);
    fees.title_fee = round_money(fees.title_fee);
    fees.registration_fee = round_money(fees.registration_fee);
    fees.plate_fee = round_money(fees.plate_fee);
    fees.inspection_fee = round_money(fees.inspection_fee);
    fees.electronic_filing_fee = round_money(fees.electronic_filing_fee);
    fees.tire_fee = round_money(fees.tire_fee);
    fees.smog_fee = round_money(fees.smog_fee);
    fees.destination_fee = round_money(fees.destination_fee);
    fees.dealer_handling_fee = round_money(fees.dealer_handling_fee);
    fees.acquisition_fee = round_money(fees.acquisition_fee);

    Ok(())
}

fn validate_finance_params(input: &DealInput) -> UdcResult<()> {
    let params = input.finance_params.as_ref().ok_or_else(|| {
        UdcError::validation_field(
            "Finance deal requires finance_params",
            "finance_params",
        )
    })?;

    // Term validation: 12-84 months typical
    if params.term_months < 12 || params.term_months > 84 {
        return Err(UdcError::validation_field(
            format!("Finance term must be between 12 and 84 months, got {}", params.term_months),
            "finance_params.term_months",
        ));
    }

    // APR validation: 0% to 30%
    if params.apr < Decimal::ZERO || params.apr > dec!(0.30) {
        return Err(UdcError::validation_field(
            format!("APR must be between 0% and 30%, got {:.2}%", params.apr * dec!(100)),
            "finance_params.apr",
        ));
    }

    Ok(())
}

fn validate_lease_params(input: &DealInput) -> UdcResult<()> {
    let params = input.lease_params.as_ref().ok_or_else(|| {
        UdcError::validation_field(
            "Lease deal requires lease_params",
            "lease_params",
        )
    })?;

    // Term validation: 24-48 months typical for leases
    if params.term_months < 24 || params.term_months > 60 {
        return Err(UdcError::validation_field(
            format!("Lease term must be between 24 and 60 months, got {}", params.term_months),
            "lease_params.term_months",
        ));
    }

    // Money factor validation: typically 0.00001 to 0.01
    if params.money_factor <= Decimal::ZERO || params.money_factor > dec!(0.01) {
        return Err(UdcError::validation_field(
            format!("Money factor must be between 0 and 0.01, got {}", params.money_factor),
            "lease_params.money_factor",
        ));
    }

    // Residual validation: must be between 0 and 100%
    if params.residual_percent <= Decimal::ZERO || params.residual_percent >= Decimal::ONE {
        return Err(UdcError::validation_field(
            format!("Residual percentage must be between 0% and 100%, got {:.1}%",
                params.residual_percent * dec!(100)),
            "lease_params.residual_percent",
        ));
    }

    // Annual miles validation: typically 7,500 to 20,000
    if params.annual_miles < 5000 || params.annual_miles > 25000 {
        return Err(UdcError::validation_field(
            format!("Annual mileage must be between 5,000 and 25,000, got {}", params.annual_miles),
            "lease_params.annual_miles",
        ));
    }

    Ok(())
}

fn compute_net_trade(input: &DealInput) -> Decimal {
    let value = input.trade_in_value.unwrap_or_default();
    let payoff = input.trade_in_payoff.unwrap_or_default();
    value - payoff
}

fn compute_product_totals(input: &DealInput) -> (Decimal, Decimal) {
    let mut taxable = Decimal::ZERO;
    let mut non_taxable = Decimal::ZERO;

    for product in &input.products {
        if product.taxable {
            taxable += product.price;
        } else {
            non_taxable += product.price;
        }
    }

    (taxable, non_taxable)
}

fn set_defaults(input: &mut DealInput) {
    // Set default deal date to today if not provided
    if input.deal_date.is_none() {
        input.deal_date = Some(chrono::Local::now().date_naive());
    }

    // Set garaging state to home state if not provided
    if input.garaging_state.is_none() {
        input.garaging_state = Some(input.home_state);
    }

    // Ensure customer has basic defaults
    if input.customer.zip_code.is_none() {
        // We might want to log a warning here - ZIP is important for local taxes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::StateCode;
    use rust_decimal_macros::dec;

    fn make_basic_finance_input() -> DealInput {
        DealInput {
            deal_type: DealType::Finance,
            vehicle_price: dec!(30000),
            trade_in_value: Some(dec!(10000)),
            trade_in_payoff: Some(dec!(5000)),
            cash_down: dec!(2000),
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
    fn test_normalize_valid_finance_deal() {
        let input = make_basic_finance_input();
        let result = normalize_deal_input(input);
        assert!(result.is_ok());

        let normalized = result.unwrap();
        assert_eq!(normalized.net_trade, dec!(5000));
        assert!(!normalized.has_negative_equity);
    }

    #[test]
    fn test_normalize_negative_equity() {
        let mut input = make_basic_finance_input();
        input.trade_in_value = Some(dec!(5000));
        input.trade_in_payoff = Some(dec!(10000));

        let result = normalize_deal_input(input).unwrap();
        assert_eq!(result.net_trade, dec!(-5000));
        assert!(result.has_negative_equity);
    }

    #[test]
    fn test_reject_negative_price() {
        let mut input = make_basic_finance_input();
        input.vehicle_price = dec!(-1000);

        let result = normalize_deal_input(input);
        assert!(result.is_err());
    }

    #[test]
    fn test_reject_invalid_term() {
        let mut input = make_basic_finance_input();
        input.finance_params.as_mut().unwrap().term_months = 120; // Too long

        let result = normalize_deal_input(input);
        assert!(result.is_err());
    }

    #[test]
    fn test_money_rounding() {
        let mut input = make_basic_finance_input();
        input.vehicle_price = dec!(30000.999); // Should round to 30001.00
        input.cash_down = dec!(2000.001);      // Should round to 2000.00

        let result = normalize_deal_input(input).unwrap();
        assert_eq!(result.inner.vehicle_price, dec!(30001.00));
        assert_eq!(result.inner.cash_down, dec!(2000.00));
    }

    #[test]
    fn test_lease_validation() {
        let mut input = make_basic_finance_input();
        input.deal_type = DealType::Lease;
        input.finance_params = None;
        input.lease_params = Some(LeaseParams {
            term_months: 36,
            money_factor: dec!(0.00125),
            residual_percent: dec!(0.55),
            annual_miles: 12000,
            excess_mileage_rate: Some(dec!(0.25)),
            lessor_id: None,
            msd_count: 0,
            security_deposit: None,
            cap_acquisition_fee: true,
            cap_cost_reduction: Decimal::ZERO,
        });

        let result = normalize_deal_input(input);
        assert!(result.is_ok());
    }
}
