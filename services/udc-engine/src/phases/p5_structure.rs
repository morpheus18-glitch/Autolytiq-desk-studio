//! P5 - Structure Cipher
//!
//! Builds the deal structure based on deal type:
//! - Cash: Simple total calculation
//! - Finance: Amount financed, payment structure
//! - Lease: Cap cost, residual, rent charge structure
//!
//! This phase uses tax calculations from P4 to complete the structure.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

use crate::types::{DealType, LeaseTaxMode, UdcResult, UdcError, DecimalExt};
use super::p4_tax_cipher::TaxComputedDeal;

// ============================================================================
// CASH STRUCTURE
// ============================================================================

/// Cash deal structure - simple addition of components
#[derive(Debug, Clone)]
pub struct CashStructure {
    /// Negotiated vehicle price
    pub selling_price: Decimal,
    /// Total fees (all fees)
    pub total_fees: Decimal,
    /// F&I products purchased
    pub fi_products: Decimal,
    /// Trade-in credit (reduces amount due)
    pub trade_credit: Decimal,
    /// Rebates (reduces amount due)
    pub rebates: Decimal,
    /// Sales tax
    pub sales_tax: Decimal,
    /// Government fees (title, reg, etc.)
    pub government_fees: Decimal,
    /// Total cash price (final amount due)
    pub total_cash_price: Decimal,
}

// ============================================================================
// FINANCE STRUCTURE
// ============================================================================

/// Finance deal structure - loan calculation
#[derive(Debug, Clone)]
pub struct FinanceStructure {
    // === Sale Components ===
    /// Vehicle selling price
    pub selling_price: Decimal,
    /// Taxable fees
    pub taxable_fees: Decimal,
    /// Non-taxable fees (govt fees)
    pub non_taxable_fees: Decimal,
    /// F&I products (financed portion)
    pub fi_products_financed: Decimal,
    /// Sales tax
    pub sales_tax: Decimal,

    // === Reductions ===
    /// Cash down payment
    pub cash_down: Decimal,
    /// Trade-in credit (positive equity only)
    pub trade_credit: Decimal,
    /// Rebates applied
    pub rebates: Decimal,
    /// Negative equity rolled in (if underwater trade)
    pub negative_equity: Decimal,

    // === Loan Terms ===
    /// Principal / Amount Financed
    pub amount_financed: Decimal,
    /// APR (as decimal, e.g., 0.0599)
    pub apr: Decimal,
    /// Term in months
    pub term_months: u32,

    // === Payment ===
    /// Monthly payment
    pub monthly_payment: Decimal,
    /// Total of payments (payment * term)
    pub total_of_payments: Decimal,
    /// Finance charge (total interest)
    pub finance_charge: Decimal,

    // === TILA Disclosures ===
    /// Total Sale Price (amount financed + finance charge + down payment)
    pub total_sale_price: Decimal,
}

// ============================================================================
// LEASE STRUCTURE
// ============================================================================

/// Lease deal structure - depreciation + rent charge model
#[derive(Debug, Clone)]
pub struct LeaseStructure {
    // === Vehicle ===
    /// MSRP (for residual calculation)
    pub msrp: Decimal,
    /// Negotiated selling price (cap cost basis)
    pub selling_price: Decimal,

    // === Capitalized Cost ===
    /// Capitalized fees (rolled into cap cost)
    pub capitalized_fees: Decimal,
    /// Capitalized F&I products
    pub capitalized_fi_products: Decimal,
    /// Capitalized taxes (if cap-cost tax mode)
    pub capitalized_tax: Decimal,
    /// Gross Capitalized Cost
    pub gross_cap_cost: Decimal,

    // === Cap Cost Reductions ===
    /// Cash down payment
    pub cash_down: Decimal,
    /// Trade-in credit
    pub trade_credit: Decimal,
    /// Rebates
    pub rebates: Decimal,
    /// Total cap cost reduction
    pub total_cap_reduction: Decimal,
    /// Adjusted Capitalized Cost (Net Cap Cost)
    pub adjusted_cap_cost: Decimal,

    // === Residual ===
    /// Residual percentage (of MSRP)
    pub residual_percentage: Decimal,
    /// Residual value (dollar amount)
    pub residual_value: Decimal,

    // === Lease Charge ===
    /// Money factor
    pub money_factor: Decimal,
    /// Equivalent APR (MF * 2400)
    pub equivalent_apr: Decimal,
    /// Term in months
    pub term_months: u32,
    /// Total depreciation (adjusted cap - residual)
    pub depreciation: Decimal,
    /// Monthly depreciation
    pub monthly_depreciation: Decimal,
    /// Total rent charge
    pub rent_charge: Decimal,
    /// Monthly rent charge
    pub monthly_rent_charge: Decimal,

    // === Payment ===
    /// Base monthly payment (depreciation + rent)
    pub base_monthly_payment: Decimal,
    /// Monthly tax (if monthly tax mode)
    pub monthly_tax: Decimal,
    /// Total monthly payment (base + tax)
    pub total_monthly_payment: Decimal,

    // === Due at Signing ===
    /// First month's payment
    pub first_payment: Decimal,
    /// Security deposit
    pub security_deposit: Decimal,
    /// Acquisition fee (if upfront)
    pub acquisition_fee_upfront: Decimal,
    /// Upfront tax (if cap-cost tax mode)
    pub upfront_tax: Decimal,
    /// Total due at signing
    pub due_at_signing: Decimal,

    // === Totals ===
    /// Total of base payments
    pub total_base_payments: Decimal,
    /// Total tax
    pub total_tax: Decimal,
    /// Total lease cost
    pub total_lease_cost: Decimal,

    // === Tax Mode ===
    pub lease_tax_mode: LeaseTaxMode,
}

// ============================================================================
// UNIFIED STRUCTURE OUTPUT
// ============================================================================

/// Complete structure output - contains exactly one structure type
#[derive(Debug, Clone)]
pub enum DealStructure {
    Cash(CashStructure),
    Finance(FinanceStructure),
    Lease(LeaseStructure),
}

/// Deal with computed structure
#[derive(Debug, Clone)]
pub struct StructuredDeal {
    pub deal: TaxComputedDeal,
    pub structure: DealStructure,
}

// ============================================================================
// P5 IMPLEMENTATION
// ============================================================================

/// P5: Build the deal structure.
///
/// # Algorithm by Deal Type
///
/// ## Cash
/// 1. Sum all components (price + fees + products + tax)
/// 2. Subtract reductions (trade + rebates)
/// 3. Produce total cash price
///
/// ## Finance
/// 1. Calculate gross amount (price + fees + products + tax)
/// 2. Add negative equity if underwater trade
/// 3. Subtract reductions (down + trade credit + rebates)
/// 4. Calculate amount financed
/// 5. Apply APR/term to get payment
/// 6. Calculate finance charge and total of payments
///
/// ## Lease
/// 1. Build gross cap cost (price + cap'd fees + cap'd products + cap'd tax)
/// 2. Subtract cap cost reductions (down + trade + rebates)
/// 3. Calculate adjusted cap cost
/// 4. Calculate residual value (MSRP * residual %)
/// 5. Calculate depreciation (adjusted cap - residual)
/// 6. Calculate rent charge (cap + residual) * MF * term
/// 7. Calculate base payment (depreciation + rent) / term
/// 8. Add tax per tax mode
///
/// # Complexity
/// - Time: O(p) where p = number of products/fees
/// - Space: O(1) (structure is fixed size)
pub fn build_structure(deal: TaxComputedDeal) -> UdcResult<StructuredDeal> {
    let deal_type = deal.deal.deal.deal.input.inner.deal_type;

    let structure = match deal_type {
        DealType::Cash => DealStructure::Cash(build_cash_structure(&deal)?),
        DealType::Finance => DealStructure::Finance(build_finance_structure(&deal)?),
        DealType::Lease => DealStructure::Lease(build_lease_structure(&deal)?),
    };

    log::debug!("P5: Built {:?} structure", deal_type);

    Ok(StructuredDeal { deal, structure })
}

/// Build cash deal structure.
fn build_cash_structure(deal: &TaxComputedDeal) -> UdcResult<CashStructure> {
    let input = &deal.deal.deal.deal.input.inner;
    let normalized = &deal.deal.deal.deal.input;
    let tax = &deal.tax;

    let selling_price = input.vehicle_price;
    let total_fees = input.fees.total_dealer_fees();
    let government_fees = input.fees.total_government_fees();
    let fi_products = normalized.total_taxable_products + normalized.total_non_taxable_products;
    let trade_credit = normalized.net_trade.max(dec!(0));
    let rebates = normalized.total_rebates;
    let sales_tax = tax.net_tax;

    // Total = price + fees + products + tax - trade - rebates
    let total_cash_price = selling_price
        + total_fees
        + government_fees
        + fi_products
        + sales_tax
        - trade_credit
        - rebates;

    Ok(CashStructure {
        selling_price,
        total_fees,
        fi_products,
        trade_credit,
        rebates,
        sales_tax,
        government_fees,
        total_cash_price: total_cash_price.round_money(),
    })
}

/// Build finance deal structure.
fn build_finance_structure(deal: &TaxComputedDeal) -> UdcResult<FinanceStructure> {
    let input = &deal.deal.deal.deal.input.inner;
    let normalized = &deal.deal.deal.deal.input;
    let tax = &deal.tax;

    // Get finance params
    let finance_params = input.finance_params.as_ref()
        .ok_or_else(|| UdcError::calculation("Missing finance params", "P5_STRUCTURE"))?;

    let selling_price = input.vehicle_price;
    let taxable_fees = input.fees.total_dealer_fees();
    let non_taxable_fees = input.fees.total_government_fees();
    let fi_products_financed = normalized.total_taxable_products + normalized.total_non_taxable_products;
    let sales_tax = tax.net_tax;

    let cash_down = input.cash_down;
    let trade_credit = normalized.net_trade.max(dec!(0));
    let rebates = normalized.total_rebates;

    // Handle negative equity (underwater trade)
    let negative_equity = if normalized.net_trade < dec!(0) {
        normalized.net_trade.abs()
    } else {
        dec!(0)
    };

    // Amount Financed Calculation
    // = (price + fees + products + tax + negative_equity) - (down + trade + rebates)
    let gross_amount = selling_price
        + taxable_fees
        + non_taxable_fees
        + fi_products_financed
        + sales_tax
        + negative_equity;

    let total_reductions = cash_down + trade_credit + rebates;
    let amount_financed = (gross_amount - total_reductions).max(dec!(0)).round_money();

    // Loan calculation
    let apr = finance_params.apr;
    let term_months = finance_params.term_months;

    let (monthly_payment, total_of_payments, finance_charge) =
        calculate_loan_payment(amount_financed, apr, term_months)?;

    // Total Sale Price (TILA)
    let total_sale_price = amount_financed + finance_charge + cash_down;

    Ok(FinanceStructure {
        selling_price,
        taxable_fees,
        non_taxable_fees,
        fi_products_financed,
        sales_tax,
        cash_down,
        trade_credit,
        rebates,
        negative_equity,
        amount_financed,
        apr,
        term_months,
        monthly_payment,
        total_of_payments,
        finance_charge,
        total_sale_price,
    })
}

/// Calculate loan payment using standard amortization formula.
///
/// # Formula
/// ```text
/// M = P * [r(1+r)^n] / [(1+r)^n - 1]
/// ```
/// Where:
/// - M = monthly payment
/// - P = principal (amount financed)
/// - r = monthly interest rate (APR / 12)
/// - n = number of payments (term in months)
///
/// # Edge Case: 0% APR
/// When APR is 0, payment = principal / term
pub fn calculate_loan_payment(
    principal: Decimal,
    apr: Decimal,
    term_months: u32,
) -> UdcResult<(Decimal, Decimal, Decimal)> {
    if principal <= dec!(0) {
        return Ok((dec!(0), dec!(0), dec!(0)));
    }

    let n = Decimal::from(term_months);

    // Handle 0% APR
    if apr == dec!(0) {
        let payment = (principal / n).round_money();
        let total = payment * n;
        return Ok((payment, total, dec!(0)));
    }

    // Monthly rate
    let r = apr / dec!(12);

    // (1 + r)^n - using iterative calculation for precision
    let one_plus_r = dec!(1) + r;
    let one_plus_r_n = power_decimal(one_plus_r, term_months);

    // Payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    let numerator = principal * r * one_plus_r_n;
    let denominator = one_plus_r_n - dec!(1);

    if denominator == dec!(0) {
        return Err(UdcError::calculation("Division by zero in payment calculation", "P5_STRUCTURE"));
    }

    let payment = (numerator / denominator).round_money();
    let total_of_payments = payment * n;
    let finance_charge = total_of_payments - principal;

    Ok((payment, total_of_payments.round_money(), finance_charge.round_money()))
}

/// Calculate (1 + r)^n for loan calculations.
/// Uses iterative multiplication for precision with Decimal.
fn power_decimal(base: Decimal, exp: u32) -> Decimal {
    let mut result = dec!(1);
    let mut current_base = base;
    let mut remaining_exp = exp;

    while remaining_exp > 0 {
        if remaining_exp % 2 == 1 {
            result *= current_base;
        }
        current_base *= current_base;
        remaining_exp /= 2;
    }

    result
}

/// Build lease deal structure.
fn build_lease_structure(deal: &TaxComputedDeal) -> UdcResult<LeaseStructure> {
    let input = &deal.deal.deal.deal.input.inner;
    let normalized = &deal.deal.deal.deal.input;
    let rules = &deal.deal.profiles.primary_rules;

    // Get lease params
    let lease_params = input.lease_params.as_ref()
        .ok_or_else(|| UdcError::calculation("Missing lease params", "P5_STRUCTURE"))?;

    let lease_tax_mode = rules.lease_tax_mode.unwrap_or(LeaseTaxMode::MonthlyPayment);

    // Vehicle values
    let msrp = input.vehicle_price; // Simplified - should be actual MSRP
    let selling_price = input.vehicle_price;

    // Capitalized items
    let capitalized_fees = calculate_capitalizable_fees(&input.fees, lease_params);
    let capitalized_fi_products = input.products
        .iter()
        .filter(|p| true) // All products capitalizable for now
        .map(|p| p.price)
        .sum::<Decimal>();

    // Cap cost tax handling
    let (capitalized_tax, upfront_tax, monthly_tax_rate) = match lease_tax_mode {
        LeaseTaxMode::CapCostUpfront => {
            // Tax the entire cap cost upfront
            let tax_base = selling_price + capitalized_fees + capitalized_fi_products;
            let tax = (tax_base * rules.rates.default_combined_rate).round_money();
            (tax, tax, dec!(0))
        }
        LeaseTaxMode::MonthlyPayment => {
            // Tax each monthly payment
            (dec!(0), dec!(0), rules.rates.default_combined_rate)
        }
        _ => (dec!(0), dec!(0), dec!(0)),
    };

    // Gross Cap Cost
    let gross_cap_cost = selling_price + capitalized_fees + capitalized_fi_products + capitalized_tax;

    // Cap Cost Reductions
    let cash_down = input.cash_down + lease_params.cap_cost_reduction;
    let trade_credit = normalized.net_trade.max(dec!(0));
    let rebates = normalized.total_rebates;
    let total_cap_reduction = cash_down + trade_credit + rebates;

    // Adjusted Cap Cost (Net Cap Cost)
    let adjusted_cap_cost = (gross_cap_cost - total_cap_reduction).max(dec!(0)).round_money();

    // Residual calculation
    let residual_percentage = lease_params.residual_percent;
    let residual_value = (msrp * residual_percentage).round_money();

    // Lease charge calculations
    let money_factor = lease_params.money_factor;
    let equivalent_apr = money_factor * dec!(2400);
    let term_months = lease_params.term_months;
    let term = Decimal::from(term_months);

    // Depreciation
    let depreciation = adjusted_cap_cost - residual_value;
    let monthly_depreciation = (depreciation / term).round_money();

    // Rent Charge
    // Rent = (Adjusted Cap + Residual) * MF * Term
    let rent_charge = ((adjusted_cap_cost + residual_value) * money_factor * term).round_money();
    let monthly_rent_charge = (rent_charge / term).round_money();

    // Base Payment
    let base_monthly_payment = monthly_depreciation + monthly_rent_charge;

    // Monthly Tax (if applicable)
    let monthly_tax = (base_monthly_payment * monthly_tax_rate).round_money();
    let total_monthly_payment = base_monthly_payment + monthly_tax;

    // Due at Signing
    let first_payment = total_monthly_payment;
    let security_deposit = lease_params.security_deposit.unwrap_or(dec!(0));
    let acquisition_fee_upfront = if !lease_params.cap_acquisition_fee {
        input.fees.acquisition_fee
    } else {
        dec!(0)
    };

    let due_at_signing = first_payment + cash_down + security_deposit + acquisition_fee_upfront + upfront_tax;

    // Totals
    let total_base_payments = base_monthly_payment * term;
    let total_tax = if lease_tax_mode == LeaseTaxMode::MonthlyPayment {
        monthly_tax * term
    } else {
        upfront_tax
    };
    let total_lease_cost = total_base_payments + total_tax + cash_down;

    Ok(LeaseStructure {
        msrp,
        selling_price,
        capitalized_fees,
        capitalized_fi_products,
        capitalized_tax,
        gross_cap_cost,
        cash_down,
        trade_credit,
        rebates,
        total_cap_reduction,
        adjusted_cap_cost,
        residual_percentage,
        residual_value,
        money_factor,
        equivalent_apr,
        term_months,
        depreciation,
        monthly_depreciation,
        rent_charge,
        monthly_rent_charge,
        base_monthly_payment,
        monthly_tax,
        total_monthly_payment,
        first_payment,
        security_deposit,
        acquisition_fee_upfront,
        upfront_tax,
        due_at_signing,
        total_base_payments,
        total_tax,
        total_lease_cost,
        lease_tax_mode,
    })
}

/// Calculate capitalizable fees for lease.
fn calculate_capitalizable_fees(
    fees: &crate::types::DealFees,
    params: &crate::types::LeaseParams,
) -> Decimal {
    let mut cap_fees = dec!(0);

    // Doc fee is typically capitalized
    cap_fees += fees.doc_fee;

    // Acquisition fee if capitalized
    if params.cap_acquisition_fee {
        cap_fees += fees.acquisition_fee;
    }

    // Destination fee
    cap_fees += fees.destination_fee;

    cap_fees
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealInput, DealFees, CustomerInfo, FinanceParams, LeaseParams, StateCode};
    use crate::phases::p0_normalize::normalize_deal_input;
    use crate::phases::p1_mode_routing::route_deal;
    use crate::phases::p2_jurisdiction::resolve_jurisdiction;
    use crate::phases::p3_profiles::load_profiles;
    use crate::phases::p4_tax_cipher::calculate_tax;

    fn make_finance_deal() -> TaxComputedDeal {
        let input = DealInput {
            deal_type: DealType::Finance,
            vehicle_price: dec!(30000),
            trade_in_value: Some(dec!(10000)),
            trade_in_payoff: Some(dec!(5000)),
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees {
                doc_fee: dec!(299),
                title_fee: dec!(33),
                registration_fee: dec!(75),
                ..Default::default()
            },
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

        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();
        let resolved = resolve_jurisdiction(routed).unwrap();
        let loaded = load_profiles(resolved).unwrap();
        calculate_tax(loaded).unwrap()
    }

    fn make_lease_deal() -> TaxComputedDeal {
        let input = DealInput {
            deal_type: DealType::Lease,
            vehicle_price: dec!(35000),
            trade_in_value: Some(dec!(5000)),
            trade_in_payoff: Some(dec!(0)),
            cash_down: dec!(3000),
            rebates: vec![],
            products: vec![],
            fees: DealFees {
                doc_fee: dec!(299),
                acquisition_fee: dec!(595),
                ..Default::default()
            },
            home_state: StateCode::TX,
            transaction_state: StateCode::TX,
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
                security_deposit: Some(dec!(0)),
                cap_acquisition_fee: true,
                cap_cost_reduction: dec!(0),
            }),
            deal_date: None,
            first_payment_date: None,
        };

        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();
        let resolved = resolve_jurisdiction(routed).unwrap();
        let loaded = load_profiles(resolved).unwrap();
        calculate_tax(loaded).unwrap()
    }

    #[test]
    fn test_finance_structure() {
        let deal = make_finance_deal();
        let result = build_structure(deal).unwrap();

        if let DealStructure::Finance(fin) = result.structure {
            assert_eq!(fin.term_months, 60);
            assert_eq!(fin.apr, dec!(0.0599));
            assert!(fin.amount_financed > dec!(0));
            assert!(fin.monthly_payment > dec!(0));
            assert!(fin.total_of_payments > fin.amount_financed);
            assert!(fin.finance_charge > dec!(0));
        } else {
            panic!("Expected finance structure");
        }
    }

    #[test]
    fn test_loan_payment_calculation() {
        // Test case: $20,000 at 6% for 60 months
        // Expected payment: ~$386.66
        let (payment, total, charge) = calculate_loan_payment(
            dec!(20000),
            dec!(0.06),
            60,
        ).unwrap();

        assert!(payment > dec!(380) && payment < dec!(395),
            "Payment {} should be around $386", payment);
        assert_eq!(total, payment * dec!(60));
        assert!(charge > dec!(0));
    }

    #[test]
    fn test_zero_apr_payment() {
        let (payment, total, charge) = calculate_loan_payment(
            dec!(12000),
            dec!(0),
            60,
        ).unwrap();

        assert_eq!(payment, dec!(200));
        assert_eq!(total, dec!(12000));
        assert_eq!(charge, dec!(0));
    }

    #[test]
    fn test_lease_structure() {
        let deal = make_lease_deal();
        let result = build_structure(deal).unwrap();

        if let DealStructure::Lease(lease) = result.structure {
            assert_eq!(lease.term_months, 36);
            assert_eq!(lease.residual_percentage, dec!(0.55));
            assert!(lease.adjusted_cap_cost < lease.gross_cap_cost);
            assert!(lease.base_monthly_payment > dec!(0));
            assert!(lease.depreciation > dec!(0));
            assert!(lease.rent_charge > dec!(0));

            // Verify lease math
            let calc_payment = lease.monthly_depreciation + lease.monthly_rent_charge;
            assert!((lease.base_monthly_payment - calc_payment).abs() < dec!(0.02),
                "Payment {} should equal dep {} + rent {}",
                lease.base_monthly_payment, lease.monthly_depreciation, lease.monthly_rent_charge);
        } else {
            panic!("Expected lease structure");
        }
    }

    #[test]
    fn test_money_factor_to_apr() {
        // MF 0.00125 = 3% APR
        let mf = dec!(0.00125);
        let apr = mf * dec!(2400);
        assert_eq!(apr, dec!(3));
    }
}
