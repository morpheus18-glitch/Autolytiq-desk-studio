//! Integration tests for the UDC Engine.
//!
//! These tests verify the complete pipeline works correctly
//! for various deal scenarios.

use rust_decimal_macros::dec;
use rust_decimal::Decimal;

// Import from the crate
use udc_engine::{
    DealInput, DealType, DealFees, CustomerInfo, FinanceParams, LeaseParams,
    RuleProfile, Money, Rate, StateCode,
    run_udc, validate_deal, engine_version,
};

/// Helper to create a minimal finance deal input
fn create_finance_deal(
    price: Decimal,
    down: Decimal,
    apr: Decimal,
    term: u32,
    state: StateCode,
) -> DealInput {
    DealInput {
        deal_type: DealType::Finance,
        vehicle_price: price,
        trade_in_value: None,
        trade_in_payoff: None,
        cash_down: down,
        rebates: vec![],
        products: vec![],
        fees: DealFees::default(),
        home_state: state,
        transaction_state: state,
        garaging_state: None,
        customer: CustomerInfo::default(),
        finance_params: Some(FinanceParams {
            term_months: term,
            apr,
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

/// Helper to create default Texas rule profile
fn create_texas_rules() -> RuleProfile {
    RuleProfile {
        state_code: "TX".to_string(),
        deal_type: DealType::Finance,
        effective_date: chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        state_rate: Rate::from_percentage(dec!(6.25)),
        county_rate: None,
        city_rate: None,
        district_rates: vec![],
        trade_in_treatment: udc_engine::TradeInTaxTreatment::ReducesTaxableAmount,
        trade_in_credit_cap: None,
        rebate_treatment: udc_engine::RebateTaxTreatment::NoReduction,
        doc_fee_taxable: true,
        title_fee_taxable: false,
        registration_fee_taxable: false,
        lease_tax_mode: udc_engine::LeaseTaxMode::MonthlyPayment,
        tax_stacking_mode: udc_engine::TaxStackingMode::Additive,
        reciprocity: udc_engine::ReciprocityType::FullCredit,
        special_tax_type: udc_engine::types::SpecialTaxType::Standard,
        flat_tax_amount: None,
        max_tax_cap: None,
        min_tax_floor: None,
        rounding_precision: 2,
        rounding_mode: udc_engine::RoundingMode::HalfUp,
    }
}

#[test]
fn test_engine_version_exists() {
    let version = engine_version();
    assert!(!version.is_empty());
    assert!(version.starts_with("0."));
}

#[test]
fn test_validate_finance_deal() {
    let deal = create_finance_deal(
        dec!(30000),
        dec!(3000),
        dec!(0.0599),
        60,
        StateCode::TX,
    );

    let result = validate_deal(&deal);
    assert!(result.is_ok());
}

#[test]
fn test_validate_rejects_negative_price() {
    let deal = DealInput {
        deal_type: DealType::Finance,
        vehicle_price: dec!(-1000),
        trade_in_value: None,
        trade_in_payoff: None,
        cash_down: dec!(0),
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
    };

    let result = validate_deal(&deal);
    assert!(result.is_err());
}

#[test]
fn test_validate_rejects_missing_finance_params() {
    let deal = DealInput {
        deal_type: DealType::Finance,
        vehicle_price: dec!(30000),
        trade_in_value: None,
        trade_in_payoff: None,
        cash_down: dec!(3000),
        rebates: vec![],
        products: vec![],
        fees: DealFees::default(),
        home_state: StateCode::TX,
        transaction_state: StateCode::TX,
        garaging_state: None,
        customer: CustomerInfo::default(),
        finance_params: None, // Missing!
        lease_params: None,
        deal_date: None,
        first_payment_date: None,
    };

    let result = validate_deal(&deal);
    assert!(result.is_err());
}

#[test]
fn test_basic_finance_calculation() {
    let deal = create_finance_deal(
        dec!(30000),
        dec!(3000),
        dec!(0.0599),
        60,
        StateCode::TX,
    );

    let rules = create_texas_rules();

    let result = run_udc(deal, rules, None, None);

    // Should succeed
    assert!(result.is_ok(), "Calculation failed: {:?}", result.err());

    let output = result.unwrap();

    // Verify basic output structure
    assert!(output.finance_structure.is_some());
    assert!(output.cash_structure.is_none());
    assert!(output.lease_structure.is_none());

    // Verify finance details exist
    let finance = output.finance_structure.unwrap();
    assert!(finance.monthly_payment.as_decimal() > dec!(0));
    assert!(finance.amount_financed.as_decimal() > dec!(0));
    assert_eq!(finance.term_months, 60);
}

#[test]
fn test_finance_with_trade_in() {
    let mut deal = create_finance_deal(
        dec!(35000),
        dec!(2000),
        dec!(0.0499),
        72,
        StateCode::TX,
    );

    // Add trade-in with positive equity
    deal.trade_in_value = Some(dec!(12000));
    deal.trade_in_payoff = Some(dec!(8000));

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();
    let finance = output.finance_structure.unwrap();

    // Amount financed should be reduced by net trade ($4000)
    // Base: $35,000 - $2,000 (down) - $4,000 (trade) + fees + tax
    assert!(finance.amount_financed.as_decimal() < dec!(35000));
}

#[test]
fn test_finance_with_negative_equity() {
    let mut deal = create_finance_deal(
        dec!(30000),
        dec!(1000),
        dec!(0.0699),
        60,
        StateCode::TX,
    );

    // Add underwater trade
    deal.trade_in_value = Some(dec!(8000));
    deal.trade_in_payoff = Some(dec!(12000));

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();
    let finance = output.finance_structure.unwrap();

    // Negative equity ($4000) should be rolled into loan
    assert!(finance.amount_financed.as_decimal() > dec!(30000));
}

#[test]
fn test_cash_deal() {
    let deal = DealInput {
        deal_type: DealType::Cash,
        vehicle_price: dec!(25000),
        trade_in_value: Some(dec!(5000)),
        trade_in_payoff: None,
        cash_down: dec!(0),
        rebates: vec![],
        products: vec![],
        fees: DealFees::default(),
        home_state: StateCode::TX,
        transaction_state: StateCode::TX,
        garaging_state: None,
        customer: CustomerInfo::default(),
        finance_params: None,
        lease_params: None,
        deal_date: None,
        first_payment_date: None,
    };

    let mut rules = create_texas_rules();
    rules.deal_type = DealType::Cash;

    let result = run_udc(deal, rules, None, None);
    assert!(result.is_ok());

    let output = result.unwrap();
    assert!(output.cash_structure.is_some());
    assert!(output.finance_structure.is_none());
    assert!(output.lease_structure.is_none());

    let cash = output.cash_structure.unwrap();
    // Total should be price + tax - trade credit
    assert!(cash.total_cash_price.as_decimal() > dec!(0));
}

#[test]
fn test_tax_calculation_basic() {
    let deal = create_finance_deal(
        dec!(30000),
        dec!(0),
        dec!(0.05),
        60,
        StateCode::TX,
    );

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();
    let tax = &output.tax_breakdown;

    // Texas 6.25% on $30,000 = $1,875
    // (May be slightly different due to fees)
    assert!(tax.net_tax.as_decimal() > dec!(1800));
    assert!(tax.net_tax.as_decimal() < dec!(2000));
}

#[test]
fn test_tax_with_trade_in_credit() {
    let mut deal = create_finance_deal(
        dec!(30000),
        dec!(0),
        dec!(0.05),
        60,
        StateCode::TX,
    );

    deal.trade_in_value = Some(dec!(10000));
    deal.trade_in_payoff = None;

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();
    let tax = &output.tax_breakdown;

    // Texas allows trade-in credit
    // Tax on $20,000 ($30k - $10k trade) = $1,250
    assert!(tax.trade_in_applied);
    assert!(tax.net_tax.as_decimal() < dec!(1500));
}

// Lease tests (when lease params are properly implemented)
#[test]
#[ignore = "Requires full lease implementation"]
fn test_lease_calculation() {
    let deal = DealInput {
        deal_type: DealType::Lease,
        vehicle_price: dec!(35000),
        trade_in_value: None,
        trade_in_payoff: None,
        cash_down: dec!(2000),
        rebates: vec![],
        products: vec![],
        fees: DealFees {
            acquisition_fee: dec!(695),
            ..Default::default()
        },
        home_state: StateCode::CA,
        transaction_state: StateCode::CA,
        garaging_state: None,
        customer: CustomerInfo::default(),
        finance_params: None,
        lease_params: Some(LeaseParams {
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
        }),
        deal_date: None,
        first_payment_date: None,
    };

    let rules = RuleProfile {
        state_code: "CA".to_string(),
        deal_type: DealType::Lease,
        lease_tax_mode: udc_engine::LeaseTaxMode::MonthlyPayment,
        ..create_texas_rules()
    };

    let result = run_udc(deal, rules, None, None);
    assert!(result.is_ok());

    let output = result.unwrap();
    assert!(output.lease_structure.is_some());
}

#[test]
fn test_output_includes_disclosures() {
    let deal = create_finance_deal(
        dec!(30000),
        dec!(3000),
        dec!(0.0599),
        60,
        StateCode::TX,
    );

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();

    // Should have TILA disclosures for finance deal
    assert!(!output.disclosures.is_empty());

    // Should have TILA box
    let has_tila = output.disclosures.iter()
        .any(|d| d.code.contains("TILA"));
    assert!(has_tila, "Missing TILA disclosure");
}

#[test]
fn test_audit_trace_present() {
    let deal = create_finance_deal(
        dec!(30000),
        dec!(3000),
        dec!(0.0599),
        60,
        StateCode::TX,
    );

    let rules = create_texas_rules();
    let result = run_udc(deal, rules, None, None);

    assert!(result.is_ok());

    let output = result.unwrap();

    // Should have audit trace
    assert!(!output.audit_trace.entries.is_empty());
    assert!(!output.audit_trace.engine_version.is_empty());
    assert!(!output.audit_trace.input_checksum.is_empty());
    assert!(!output.audit_trace.output_checksum.is_empty());
}
