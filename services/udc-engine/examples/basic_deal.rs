//! Basic Deal Example
//!
//! Demonstrates how to use the UDC Engine to calculate a simple finance deal.
//!
//! Run with: `cargo run --example basic_deal`

use rust_decimal_macros::dec;
use udc_engine::prelude::*;
use udc_engine::{
    DealInput, DealType, DealFees, CustomerInfo, FinanceParams,
    RuleProfile, TradeInTaxTreatment, RebateTaxTreatment,
    LeaseTaxMode, TaxStackingMode, ReciprocityType, RoundingMode,
};

fn main() {
    println!("=== UDC Engine Basic Deal Example ===\n");

    // Create a finance deal input
    let deal = DealInput {
        deal_type: DealType::Finance,
        vehicle_price: dec!(32500),
        trade_in_value: Some(dec!(8000)),
        trade_in_payoff: Some(dec!(5500)),
        cash_down: dec!(2500),
        rebates: vec![],
        products: vec![],
        fees: DealFees {
            doc_fee: dec!(299),
            title_fee: dec!(33),
            registration_fee: dec!(75),
            ..Default::default()
        },
        home_state: udc_engine::StateCode::TX,
        transaction_state: udc_engine::StateCode::TX,
        garaging_state: None,
        customer: CustomerInfo::default(),
        finance_params: Some(FinanceParams {
            term_months: 60,
            apr: dec!(0.0599),
            lender_id: Some("BANK123".to_string()),
            buy_rate: Some(dec!(0.0399)),
            max_reserve_points: Some(dec!(2.0)),
            deferred_first_payment: false,
            days_to_first_payment: None,
        }),
        lease_params: None,
        deal_date: Some(chrono::Local::now().date_naive()),
        first_payment_date: None,
    };

    println!("Deal Input:");
    println!("  Vehicle Price: ${}", deal.vehicle_price);
    println!("  Trade-In Value: ${}", deal.trade_in_value.unwrap_or_default());
    println!("  Trade-In Payoff: ${}", deal.trade_in_payoff.unwrap_or_default());
    println!("  Cash Down: ${}", deal.cash_down);
    println!("  State: {:?}", deal.home_state);
    println!("  APR: {}%", deal.finance_params.as_ref().unwrap().apr * dec!(100));
    println!("  Term: {} months", deal.finance_params.as_ref().unwrap().term_months);
    println!();

    // Create Texas rule profile
    let rules = RuleProfile {
        state_code: "TX".to_string(),
        deal_type: DealType::Finance,
        effective_date: chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        state_rate: Rate::from_percentage(dec!(6.25)),
        county_rate: Some(Rate::from_percentage(dec!(0.50))),
        city_rate: Some(Rate::from_percentage(dec!(1.50))),
        district_rates: vec![],
        trade_in_treatment: TradeInTaxTreatment::ReducesTaxableAmount,
        trade_in_credit_cap: None,
        rebate_treatment: RebateTaxTreatment::NoReduction,
        doc_fee_taxable: true,
        title_fee_taxable: false,
        registration_fee_taxable: false,
        lease_tax_mode: LeaseTaxMode::MonthlyPayment,
        tax_stacking_mode: TaxStackingMode::Additive,
        reciprocity: ReciprocityType::FullCredit,
        special_tax_type: udc_engine::types::SpecialTaxType::Standard,
        flat_tax_amount: None,
        max_tax_cap: None,
        min_tax_floor: None,
        rounding_precision: 2,
        rounding_mode: RoundingMode::HalfUp,
    };

    println!("Tax Rules:");
    println!("  State: {}", rules.state_code);
    println!("  State Rate: {}%", rules.state_rate.as_percentage());
    println!("  Combined Rate: ~{}%",
        rules.state_rate.as_percentage()
        + rules.county_rate.map(|r| r.as_percentage()).unwrap_or_default()
        + rules.city_rate.map(|r| r.as_percentage()).unwrap_or_default()
    );
    println!("  Trade-In Reduces Tax: {:?}", rules.trade_in_treatment);
    println!();

    // Run the calculation
    println!("Running UDC Engine...");
    match udc_engine::run_udc(deal, rules, None, None) {
        Ok(output) => {
            println!("\n=== Calculation Results ===\n");

            // Tax breakdown
            println!("Tax Breakdown:");
            println!("  Tax Base: ${}", output.tax_breakdown.tax_base.as_decimal());
            println!("  Trade-In Credit Applied: {}", output.tax_breakdown.trade_in_applied);
            println!("  Trade-In Credit Used: ${}", output.tax_breakdown.trade_in_credit_used.as_decimal());
            println!("  Gross Tax: ${}", output.tax_breakdown.gross_tax.as_decimal());
            println!("  Net Tax: ${}", output.tax_breakdown.net_tax.as_decimal());
            println!("  Effective Rate: {:.2}%", output.tax_breakdown.effective_rate.as_percentage());
            println!();

            // Finance structure
            if let Some(finance) = &output.finance_structure {
                println!("Finance Structure:");
                println!("  Selling Price: ${}", finance.selling_price.as_decimal());
                println!("  Trade Credit: ${}", finance.trade_credit.as_decimal());
                println!("  Cash Down: ${}", finance.cash_down.as_decimal());
                println!("  Sales Tax: ${}", finance.sales_tax.as_decimal());
                println!("  Amount Financed: ${}", finance.amount_financed.as_decimal());
                println!("  --------------------------------");
                println!("  APR: {:.2}%", finance.apr.as_percentage());
                println!("  Term: {} months", finance.term_months);
                println!("  Monthly Payment: ${:.2}", finance.monthly_payment.as_decimal());
                println!("  --------------------------------");
                println!("  Total of Payments: ${:.2}", finance.total_of_payments.as_decimal());
                println!("  Finance Charge: ${:.2}", finance.finance_charge.as_decimal());
                println!("  Total Sale Price: ${:.2}", finance.total_sale_price.as_decimal());
            }
            println!();

            // Summary
            println!("Summary: {}", output.summary);
            println!();

            // Disclosures
            println!("Required Disclosures: {} items", output.disclosures.len());
            for disclosure in &output.disclosures {
                println!("  - {} ({})", disclosure.title, disclosure.code);
            }
            println!();

            // Audit info
            println!("Audit Information:");
            println!("  Engine Version: {}", output.audit_trace.engine_version);
            println!("  Calculated At: {}", output.calculated_at);
            println!("  Audit Entries: {}", output.audit_trace.entries.len());
        }
        Err(e) => {
            eprintln!("Calculation failed: {}", e);
            std::process::exit(1);
        }
    }
}
