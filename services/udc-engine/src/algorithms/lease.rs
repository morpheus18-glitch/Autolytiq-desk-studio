//! Lease Calculation Algorithms
//!
//! Implements standard lease payment calculations as required by
//! Regulation M (Consumer Leasing).
//!
//! # Key Formulas
//!
//! ## Lease Payment
//! ```text
//! Monthly Payment = Depreciation + Rent Charge + Tax
//!
//! Depreciation = (Adjusted Cap Cost - Residual) / Term
//! Rent Charge = (Adjusted Cap Cost + Residual) * Money Factor
//! ```
//!
//! ## Money Factor Conversion
//! ```text
//! APR = Money Factor * 2400
//! Money Factor = APR / 2400
//! ```
//!
//! # Cap Cost Structure
//! ```text
//! Gross Cap Cost = Selling Price + Capitalized Fees + Capitalized Products + Capitalized Tax
//! Adjusted Cap Cost = Gross Cap Cost - (Down + Trade + Rebates)
//! ```

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

/// Result of lease payment calculation
#[derive(Debug, Clone)]
pub struct LeasePaymentResult {
    /// Monthly depreciation portion
    pub monthly_depreciation: Decimal,
    /// Monthly rent charge (finance charge)
    pub monthly_rent_charge: Decimal,
    /// Base monthly payment (before tax)
    pub base_payment: Decimal,
    /// Monthly tax (if monthly tax mode)
    pub monthly_tax: Decimal,
    /// Total monthly payment (base + tax)
    pub total_payment: Decimal,
    /// Total depreciation over lease term
    pub total_depreciation: Decimal,
    /// Total rent charge over lease term
    pub total_rent_charge: Decimal,
}

/// Lease capitalized cost breakdown
#[derive(Debug, Clone)]
pub struct CapCostBreakdown {
    /// Selling price
    pub selling_price: Decimal,
    /// Capitalized fees
    pub capitalized_fees: Decimal,
    /// Capitalized F&I products
    pub capitalized_products: Decimal,
    /// Capitalized taxes (if upfront tax mode)
    pub capitalized_tax: Decimal,
    /// Gross capitalized cost
    pub gross_cap_cost: Decimal,
    /// Cash down payment
    pub down_payment: Decimal,
    /// Trade-in credit
    pub trade_credit: Decimal,
    /// Rebates applied
    pub rebates: Decimal,
    /// Total cap cost reduction
    pub total_cap_reduction: Decimal,
    /// Adjusted (net) capitalized cost
    pub adjusted_cap_cost: Decimal,
}

/// Calculate the complete lease payment.
///
/// # Arguments
/// * `adjusted_cap_cost` - Net capitalized cost after reductions
/// * `residual_value` - Vehicle value at lease end
/// * `money_factor` - Lease rate (typically 0.00XXX)
/// * `term_months` - Lease term in months
/// * `tax_rate` - Monthly tax rate (0 if upfront tax or exempt)
///
/// # Returns
/// LeasePaymentResult with full payment breakdown
///
/// # Algorithm
/// Standard lease payment formula:
/// ```text
/// Depreciation/month = (Cap Cost - Residual) / Term
/// Rent Charge/month = (Cap Cost + Residual) * Money Factor
/// Base Payment = Depreciation + Rent Charge
/// Tax = Base Payment * Tax Rate
/// Total = Base Payment + Tax
/// ```
///
/// # Complexity
/// - Time: O(1)
/// - Space: O(1)
///
/// # Invariants
/// - base_payment = monthly_depreciation + monthly_rent_charge
/// - All values >= 0 (assuming valid inputs)
pub fn calculate_lease_payment(
    adjusted_cap_cost: Decimal,
    residual_value: Decimal,
    money_factor: Decimal,
    term_months: u32,
    tax_rate: Decimal,
) -> LeasePaymentResult {
    let term = Decimal::from(term_months);

    // Handle edge case
    if term == dec!(0) {
        return LeasePaymentResult {
            monthly_depreciation: dec!(0),
            monthly_rent_charge: dec!(0),
            base_payment: dec!(0),
            monthly_tax: dec!(0),
            total_payment: dec!(0),
            total_depreciation: dec!(0),
            total_rent_charge: dec!(0),
        };
    }

    // Calculate depreciation
    let total_depreciation = (adjusted_cap_cost - residual_value).max(dec!(0));
    let monthly_depreciation = (total_depreciation / term).round_dp(2);

    // Calculate rent charge
    let rent_base = adjusted_cap_cost + residual_value;
    let total_rent_charge = (rent_base * money_factor * term).round_dp(2);
    let monthly_rent_charge = (rent_base * money_factor).round_dp(2);

    // Calculate base payment
    let base_payment = monthly_depreciation + monthly_rent_charge;

    // Calculate tax
    let monthly_tax = (base_payment * tax_rate).round_dp(2);
    let total_payment = base_payment + monthly_tax;

    LeasePaymentResult {
        monthly_depreciation,
        monthly_rent_charge,
        base_payment,
        monthly_tax,
        total_payment,
        total_depreciation,
        total_rent_charge,
    }
}

/// Calculate the capitalized cost breakdown.
///
/// # Arguments
/// * `selling_price` - Negotiated vehicle price
/// * `capitalized_fees` - Fees to be capitalized (doc, acquisition, etc.)
/// * `capitalized_products` - F&I products to be capitalized
/// * `capitalized_tax` - Taxes to be capitalized (if upfront tax mode)
/// * `down_payment` - Cash down payment
/// * `trade_credit` - Trade-in value (positive equity only)
/// * `rebates` - Rebates and incentives
///
/// # Returns
/// CapCostBreakdown with full structure
///
/// # Algorithm
/// ```text
/// Gross Cap = Price + Fees + Products + Tax
/// Reduction = Down + Trade + Rebates
/// Adjusted Cap = Gross Cap - Reduction
/// ```
///
/// # Complexity
/// - Time: O(1)
/// - Space: O(1)
pub fn calculate_cap_cost(
    selling_price: Decimal,
    capitalized_fees: Decimal,
    capitalized_products: Decimal,
    capitalized_tax: Decimal,
    down_payment: Decimal,
    trade_credit: Decimal,
    rebates: Decimal,
) -> CapCostBreakdown {
    // Gross cap cost
    let gross_cap_cost = selling_price + capitalized_fees + capitalized_products + capitalized_tax;

    // Total cap cost reduction
    let total_cap_reduction = down_payment + trade_credit + rebates;

    // Adjusted cap cost (cannot be negative)
    let adjusted_cap_cost = (gross_cap_cost - total_cap_reduction).max(dec!(0));

    CapCostBreakdown {
        selling_price,
        capitalized_fees,
        capitalized_products,
        capitalized_tax,
        gross_cap_cost: gross_cap_cost.round_dp(2),
        down_payment,
        trade_credit,
        rebates,
        total_cap_reduction: total_cap_reduction.round_dp(2),
        adjusted_cap_cost: adjusted_cap_cost.round_dp(2),
    }
}

/// Convert money factor to APR.
///
/// # Formula
/// ```text
/// APR = Money Factor * 2400
/// ```
///
/// # Arguments
/// * `money_factor` - Lease money factor (e.g., 0.00125)
///
/// # Returns
/// APR as decimal (e.g., 0.03 for 3%)
///
/// # Example
/// ```
/// use udc_engine::algorithms::lease::money_factor_to_apr;
/// use rust_decimal_macros::dec;
///
/// let apr = money_factor_to_apr(dec!(0.00125));
/// assert_eq!(apr, dec!(0.03)); // 3% APR
/// ```
pub fn money_factor_to_apr(money_factor: Decimal) -> Decimal {
    // MF * 2400 / 100 = MF * 24
    money_factor * dec!(24)
}

/// Convert APR to money factor.
///
/// # Formula
/// ```text
/// Money Factor = APR / 2400
/// ```
///
/// # Arguments
/// * `apr` - Annual percentage rate as decimal (e.g., 0.03 for 3%)
///
/// # Returns
/// Money factor (e.g., 0.00125)
pub fn apr_to_money_factor(apr: Decimal) -> Decimal {
    apr / dec!(24)
}

/// Calculate total rent charge (lease finance charge).
///
/// # Formula
/// ```text
/// Rent Charge = (Adjusted Cap + Residual) * Money Factor * Term
/// ```
///
/// # Arguments
/// * `adjusted_cap_cost` - Net capitalized cost
/// * `residual_value` - Residual at lease end
/// * `money_factor` - Lease rate
/// * `term_months` - Lease term
///
/// # Returns
/// Total rent charge for the lease
pub fn calculate_rent_charge(
    adjusted_cap_cost: Decimal,
    residual_value: Decimal,
    money_factor: Decimal,
    term_months: u32,
) -> Decimal {
    let term = Decimal::from(term_months);
    let rent_base = adjusted_cap_cost + residual_value;
    (rent_base * money_factor * term).round_dp(2)
}

/// Calculate total depreciation.
///
/// # Formula
/// ```text
/// Depreciation = Adjusted Cap Cost - Residual Value
/// ```
///
/// # Arguments
/// * `adjusted_cap_cost` - Net capitalized cost
/// * `residual_value` - Residual at lease end
///
/// # Returns
/// Total depreciation (never negative)
pub fn calculate_depreciation(
    adjusted_cap_cost: Decimal,
    residual_value: Decimal,
) -> Decimal {
    (adjusted_cap_cost - residual_value).max(dec!(0))
}

/// Calculate residual value from percentage and MSRP.
///
/// # Arguments
/// * `msrp` - Manufacturer's suggested retail price
/// * `residual_percentage` - Residual as decimal (e.g., 0.55 for 55%)
///
/// # Returns
/// Residual value in dollars
pub fn calculate_residual_value(msrp: Decimal, residual_percentage: Decimal) -> Decimal {
    (msrp * residual_percentage).round_dp(2)
}

/// Calculate due at signing.
///
/// # Arguments
/// * `first_payment` - First month's payment
/// * `security_deposit` - Security deposit (may be waived or MSD)
/// * `acquisition_fee_upfront` - Acquisition fee if not capitalized
/// * `down_payment` - Cash down / cap cost reduction
/// * `upfront_tax` - Taxes due at signing (if upfront tax mode)
/// * `government_fees` - Title, registration, plates, etc.
///
/// # Returns
/// Total amount due at signing
pub fn calculate_due_at_signing(
    first_payment: Decimal,
    security_deposit: Decimal,
    acquisition_fee_upfront: Decimal,
    down_payment: Decimal,
    upfront_tax: Decimal,
    government_fees: Decimal,
) -> Decimal {
    (first_payment + security_deposit + acquisition_fee_upfront
        + down_payment + upfront_tax + government_fees).round_dp(2)
}

/// Calculate effective money factor from lease payment components.
///
/// This is the reverse calculation - given payment, derive money factor.
///
/// # Arguments
/// * `monthly_rent_charge` - The rent charge portion of payment
/// * `adjusted_cap_cost` - Net capitalized cost
/// * `residual_value` - Residual value
///
/// # Returns
/// Calculated money factor
pub fn calculate_money_factor_from_rent(
    monthly_rent_charge: Decimal,
    adjusted_cap_cost: Decimal,
    residual_value: Decimal,
) -> Decimal {
    let rent_base = adjusted_cap_cost + residual_value;
    if rent_base == dec!(0) {
        return dec!(0);
    }
    (monthly_rent_charge / rent_base).round_dp(6)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lease_payment_calculation() {
        // $30,000 adjusted cap, $16,500 residual (55%), 0.00125 MF, 36 months
        let result = calculate_lease_payment(
            dec!(30000),
            dec!(16500),
            dec!(0.00125),
            36,
            dec!(0.0825), // 8.25% tax rate
        );

        // Depreciation: (30000 - 16500) / 36 = $375/mo
        assert_eq!(result.monthly_depreciation, dec!(375.00));

        // Rent charge: (30000 + 16500) * 0.00125 = $58.125 -> $58.13
        assert!(result.monthly_rent_charge >= dec!(58.12) && result.monthly_rent_charge <= dec!(58.13));

        // Base: 375 + ~58.12 = ~$433.12
        let expected_base = result.monthly_depreciation + result.monthly_rent_charge;
        assert_eq!(result.base_payment, expected_base);

        // Tax on ~$433: ~$35.73
        assert!(result.monthly_tax > dec!(35) && result.monthly_tax < dec!(36));

        // Total: ~$469
        assert!(result.total_payment > dec!(460) && result.total_payment < dec!(480));
    }

    #[test]
    fn test_cap_cost_calculation() {
        let breakdown = calculate_cap_cost(
            dec!(35000),    // selling price
            dec!(894),      // fees (doc + acq)
            dec!(1500),     // products
            dec!(0),        // tax (monthly mode)
            dec!(3000),     // down
            dec!(5000),     // trade
            dec!(1000),     // rebates
        );

        // Gross = 35000 + 894 + 1500 + 0 = 37394
        assert_eq!(breakdown.gross_cap_cost, dec!(37394));

        // Reduction = 3000 + 5000 + 1000 = 9000
        assert_eq!(breakdown.total_cap_reduction, dec!(9000));

        // Adjusted = 37394 - 9000 = 28394
        assert_eq!(breakdown.adjusted_cap_cost, dec!(28394));
    }

    #[test]
    fn test_money_factor_conversion() {
        // 0.00125 MF = 3% APR
        let apr = money_factor_to_apr(dec!(0.00125));
        assert_eq!(apr, dec!(0.03));

        // Reverse: 3% APR = 0.00125 MF
        let mf = apr_to_money_factor(dec!(0.03));
        assert_eq!(mf, dec!(0.00125));

        // Round trip
        let original_mf = dec!(0.00150);
        let round_trip = apr_to_money_factor(money_factor_to_apr(original_mf));
        assert_eq!(round_trip, original_mf);
    }

    #[test]
    fn test_rent_charge() {
        let rent = calculate_rent_charge(
            dec!(30000),  // adjusted cap
            dec!(16500),  // residual
            dec!(0.00125), // MF
            36,           // term
        );

        // (30000 + 16500) * 0.00125 * 36 = 2092.50
        assert_eq!(rent, dec!(2092.50));
    }

    #[test]
    fn test_depreciation() {
        let dep = calculate_depreciation(dec!(30000), dec!(16500));
        assert_eq!(dep, dec!(13500));

        // Residual > cap cost (unusual but possible)
        let dep_negative = calculate_depreciation(dec!(15000), dec!(20000));
        assert_eq!(dep_negative, dec!(0)); // Clamped to 0
    }

    #[test]
    fn test_residual_value() {
        let residual = calculate_residual_value(dec!(35000), dec!(0.55));
        assert_eq!(residual, dec!(19250));
    }

    #[test]
    fn test_due_at_signing() {
        let due = calculate_due_at_signing(
            dec!(469),     // first payment
            dec!(0),       // security deposit (waived)
            dec!(0),       // acq fee (capitalized)
            dec!(3000),    // down
            dec!(0),       // upfront tax (monthly mode)
            dec!(300),     // govt fees
        );

        assert_eq!(due, dec!(3769));
    }

    #[test]
    fn test_money_factor_from_rent() {
        // Given known values, calculate MF
        let mf = calculate_money_factor_from_rent(
            dec!(58.125), // monthly rent
            dec!(30000),  // cap cost
            dec!(16500),  // residual
        );

        // Should be close to 0.00125
        assert!(mf >= dec!(0.00124) && mf <= dec!(0.00126));
    }
}
