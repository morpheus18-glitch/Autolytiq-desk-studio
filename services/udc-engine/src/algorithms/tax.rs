//! Tax Calculation Algorithms
//!
//! Core tax algorithms for the UDC engine including:
//! - Tax base calculation with trade/rebate credits
//! - Multi-component rate application
//! - Reciprocity credit calculation
//! - Special state tax formulas (TAVT, HUT, Excise)
//!
//! # Tax Base Formula
//! ```text
//! Base = Selling Price
//!      + Taxable Fees
//!      + Taxable Products
//!      - Trade Credit (if state allows)
//!      - Rebates (if state allows)
//!      - Caps (state-specific)
//! ```
//!
//! # Key Invariants
//! 1. Tax base is never negative
//! 2. Trade credit cannot exceed selling price
//! 3. Reciprocity credit cannot exceed theoretical home state tax
//! 4. All calculations round to cents

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

/// Components used to build the tax base
#[derive(Debug, Clone, Default)]
pub struct TaxBaseComponents {
    pub selling_price: Decimal,
    pub taxable_fees: Decimal,
    pub taxable_products: Decimal,
    pub trade_value: Decimal,
    pub rebates: Decimal,
}

/// Rules for building tax base
#[derive(Debug, Clone)]
pub struct TaxBaseRules {
    /// Does trade-in reduce the taxable amount?
    pub trade_reduces_basis: bool,
    /// Maximum trade credit (if capped)
    pub trade_credit_cap: Option<Decimal>,
    /// Do rebates reduce the taxable amount?
    pub rebates_reduce_basis: bool,
    /// Maximum taxable amount (if capped, e.g., NC $80k)
    pub max_taxable_amount: Option<Decimal>,
    /// Minimum taxable amount (floor)
    pub min_taxable_amount: Option<Decimal>,
}

impl Default for TaxBaseRules {
    fn default() -> Self {
        TaxBaseRules {
            trade_reduces_basis: true,
            trade_credit_cap: None,
            rebates_reduce_basis: false,
            max_taxable_amount: None,
            min_taxable_amount: None,
        }
    }
}

/// Result of tax base calculation
#[derive(Debug, Clone)]
pub struct TaxBaseResult {
    /// Final tax base
    pub tax_base: Decimal,
    /// Trade credit actually applied
    pub trade_credit_applied: Decimal,
    /// Rebates actually applied
    pub rebates_applied: Decimal,
    /// Was a cap applied?
    pub cap_applied: Option<String>,
}

/// Calculate the tax base from components.
///
/// # Algorithm
/// ```text
/// 1. Start with selling price + fees + products
/// 2. Apply trade credit (if allowed):
///    - Cap at max trade credit if specified
///    - Cannot exceed current base
/// 3. Apply rebates (if allowed):
///    - Cannot reduce below zero
/// 4. Apply max taxable cap (if specified)
/// 5. Apply min taxable floor (if specified)
/// 6. Ensure final base >= 0
/// ```
///
/// # Complexity
/// - Time: O(1)
/// - Space: O(1)
///
/// # Invariants
/// - tax_base >= 0
/// - trade_credit_applied <= trade_value
/// - trade_credit_applied <= trade_credit_cap (if specified)
/// - rebates_applied <= rebates
pub fn calculate_tax_base(
    components: &TaxBaseComponents,
    rules: &TaxBaseRules,
) -> TaxBaseResult {
    // Start with gross amount
    let mut base = components.selling_price + components.taxable_fees + components.taxable_products;

    let mut trade_credit_applied = dec!(0);
    let mut rebates_applied = dec!(0);
    let mut cap_applied = None;

    // Apply trade credit if allowed
    if rules.trade_reduces_basis && components.trade_value > dec!(0) {
        let mut credit = components.trade_value;

        // Apply cap if exists
        if let Some(cap) = rules.trade_credit_cap {
            if credit > cap {
                credit = cap;
            }
        }

        // Cannot exceed base
        credit = credit.min(base);

        base -= credit;
        trade_credit_applied = credit;
    }

    // Apply rebates if allowed
    if rules.rebates_reduce_basis && components.rebates > dec!(0) {
        let credit = components.rebates.min(base);
        base -= credit;
        rebates_applied = credit;
    }

    // Apply maximum taxable cap
    if let Some(max) = rules.max_taxable_amount {
        if base > max {
            cap_applied = Some(format!("Capped at ${} per state rule", max));
            base = max;
        }
    }

    // Apply minimum taxable floor
    if let Some(min) = rules.min_taxable_amount {
        if base < min {
            base = min;
        }
    }

    // Ensure non-negative
    base = base.max(dec!(0));

    TaxBaseResult {
        tax_base: base.round_dp(2),
        trade_credit_applied: trade_credit_applied.round_dp(2),
        rebates_applied: rebates_applied.round_dp(2),
        cap_applied,
    }
}

/// Individual tax rate component
#[derive(Debug, Clone)]
pub struct TaxRateComponent {
    pub name: String,
    pub rate: Decimal,
    pub applies_to_vehicles: bool,
}

/// Result of tax rate application
#[derive(Debug, Clone)]
pub struct TaxResult {
    /// Individual component results
    pub components: Vec<TaxComponentResult>,
    /// Total tax amount
    pub total_tax: Decimal,
    /// Combined effective rate
    pub effective_rate: Decimal,
}

/// Single tax component result
#[derive(Debug, Clone)]
pub struct TaxComponentResult {
    pub name: String,
    pub rate: Decimal,
    pub base: Decimal,
    pub amount: Decimal,
}

/// Apply tax rates to a tax base.
///
/// # Algorithm
/// For each component rate:
/// 1. Check if it applies to vehicles
/// 2. Calculate: amount = base * rate
/// 3. Round to cents
/// 4. Sum all components
///
/// # Complexity
/// - Time: O(n) where n = number of rate components
/// - Space: O(n) for result storage
pub fn apply_tax_rate(
    tax_base: Decimal,
    components: &[TaxRateComponent],
) -> TaxResult {
    let mut results = Vec::with_capacity(components.len());
    let mut total_tax = dec!(0);
    let mut total_rate = dec!(0);

    for component in components {
        if !component.applies_to_vehicles {
            continue;
        }

        let amount = (tax_base * component.rate).round_dp(2);

        results.push(TaxComponentResult {
            name: component.name.clone(),
            rate: component.rate,
            base: tax_base,
            amount,
        });

        total_tax += amount;
        total_rate += component.rate;
    }

    TaxResult {
        components: results,
        total_tax: total_tax.round_dp(2),
        effective_rate: total_rate,
    }
}

/// Reciprocity rules for multi-state transactions
#[derive(Debug, Clone)]
pub struct ReciprocityRules {
    /// Does home state offer reciprocity?
    pub offers_reciprocity: bool,
    /// Credit type
    pub credit_type: ReciprocityCreditType,
    /// Maximum credit rate (for partial credit states)
    pub max_credit_rate: Option<Decimal>,
}

/// Type of reciprocity credit offered
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReciprocityCreditType {
    /// Full credit for taxes paid in transaction state
    FullCredit,
    /// Credit up to home state's rate
    PartialCredit,
    /// No credit (pay both)
    NoCredit,
}

impl Default for ReciprocityRules {
    fn default() -> Self {
        ReciprocityRules {
            offers_reciprocity: true,
            credit_type: ReciprocityCreditType::FullCredit,
            max_credit_rate: None,
        }
    }
}

/// Calculate reciprocity credit for interstate transactions.
///
/// # Algorithm
/// ```text
/// 1. If not interstate or no reciprocity, return 0
/// 2. Calculate theoretical tax in transaction state
/// 3. Apply credit based on credit type:
///    - Full: credit = min(transaction_tax, home_tax)
///    - Partial: credit = min(transaction_tax, base * max_rate, home_tax)
///    - None: credit = 0
/// ```
///
/// # Arguments
/// * `tax_base` - The taxable amount
/// * `home_tax` - Tax calculated using home state rates
/// * `transaction_rate` - Combined rate in transaction state
/// * `rules` - Reciprocity rules
///
/// # Returns
/// Reciprocity credit amount
///
/// # Invariant
/// Credit never exceeds home_tax (prevents negative net tax)
pub fn calculate_reciprocity_credit(
    tax_base: Decimal,
    home_tax: Decimal,
    transaction_rate: Decimal,
    rules: &ReciprocityRules,
) -> Decimal {
    if !rules.offers_reciprocity {
        return dec!(0);
    }

    let transaction_tax = (tax_base * transaction_rate).round_dp(2);

    let credit = match rules.credit_type {
        ReciprocityCreditType::FullCredit => {
            transaction_tax.min(home_tax)
        }
        ReciprocityCreditType::PartialCredit => {
            let max_credit = match rules.max_credit_rate {
                Some(rate) => (tax_base * rate).round_dp(2),
                None => home_tax,
            };
            transaction_tax.min(max_credit).min(home_tax)
        }
        ReciprocityCreditType::NoCredit => {
            dec!(0)
        }
    };

    credit.max(dec!(0))
}

// ============================================================================
// SPECIAL STATE TAXES
// ============================================================================

/// Georgia TAVT (Title Ad Valorem Tax) calculation.
///
/// # Rules
/// - Replaces sales tax for vehicles
/// - Rate: 6.75% for new, 7% for used (simplified to single rate)
/// - Trade-in and rebates reduce basis
///
/// # Formula
/// ```text
/// TAVT = (Fair Market Value - Trade Value) * Rate
/// ```
pub fn calculate_georgia_tavt(
    fair_market_value: Decimal,
    trade_value: Decimal,
    is_new_vehicle: bool,
) -> Decimal {
    let rate = if is_new_vehicle { dec!(0.0675) } else { dec!(0.07) };
    let taxable = (fair_market_value - trade_value).max(dec!(0));
    (taxable * rate).round_dp(2)
}

/// North Carolina HUT (Highway Use Tax) calculation.
///
/// # Rules
/// - 3% of purchase price
/// - Capped at first $80,000
/// - Trade-in reduces basis
///
/// # Formula
/// ```text
/// HUT = min(Purchase Price - Trade, $80,000) * 3%
/// ```
pub fn calculate_nc_hut(
    purchase_price: Decimal,
    trade_value: Decimal,
) -> Decimal {
    let cap = dec!(80000);
    let taxable = (purchase_price - trade_value).max(dec!(0));
    let capped_taxable = taxable.min(cap);
    (capped_taxable * dec!(0.03)).round_dp(2)
}

/// West Virginia vehicle taxes.
///
/// # Rules
/// - Regular sales tax (6%) on purchases
/// - Privilege/excise tax (5%)
/// - Trade credit capped at $25,000
///
/// # Returns
/// Tuple of (sales_tax, privilege_tax)
pub fn calculate_wv_taxes(
    purchase_price: Decimal,
    trade_value: Decimal,
    sales_rate: Decimal,
    privilege_rate: Decimal,
) -> (Decimal, Decimal) {
    let trade_credit_cap = dec!(25000);
    let trade_credit = trade_value.min(trade_credit_cap);

    let taxable = (purchase_price - trade_credit).max(dec!(0));

    let sales_tax = (taxable * sales_rate).round_dp(2);
    let privilege_tax = (taxable * privilege_rate).round_dp(2);

    (sales_tax, privilege_tax)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tax_base_with_trade() {
        let components = TaxBaseComponents {
            selling_price: dec!(30000),
            taxable_fees: dec!(299),
            taxable_products: dec!(0),
            trade_value: dec!(10000),
            rebates: dec!(0),
        };

        let rules = TaxBaseRules {
            trade_reduces_basis: true,
            ..Default::default()
        };

        let result = calculate_tax_base(&components, &rules);

        // Base = 30000 + 299 - 10000 = 20299
        assert_eq!(result.tax_base, dec!(20299));
        assert_eq!(result.trade_credit_applied, dec!(10000));
    }

    #[test]
    fn test_tax_base_no_trade_credit() {
        let components = TaxBaseComponents {
            selling_price: dec!(30000),
            taxable_fees: dec!(0),
            taxable_products: dec!(0),
            trade_value: dec!(10000),
            rebates: dec!(0),
        };

        let rules = TaxBaseRules {
            trade_reduces_basis: false, // California-style
            ..Default::default()
        };

        let result = calculate_tax_base(&components, &rules);

        // Trade should NOT reduce basis
        assert_eq!(result.tax_base, dec!(30000));
        assert_eq!(result.trade_credit_applied, dec!(0));
    }

    #[test]
    fn test_tax_base_with_trade_cap() {
        let components = TaxBaseComponents {
            selling_price: dec!(50000),
            taxable_fees: dec!(0),
            taxable_products: dec!(0),
            trade_value: dec!(30000),
            rebates: dec!(0),
        };

        let rules = TaxBaseRules {
            trade_reduces_basis: true,
            trade_credit_cap: Some(dec!(25000)), // WV-style cap
            ..Default::default()
        };

        let result = calculate_tax_base(&components, &rules);

        // Should only credit $25,000 of the $30,000 trade
        assert_eq!(result.tax_base, dec!(25000));
        assert_eq!(result.trade_credit_applied, dec!(25000));
    }

    #[test]
    fn test_tax_base_with_max_cap() {
        let components = TaxBaseComponents {
            selling_price: dec!(100000),
            taxable_fees: dec!(0),
            taxable_products: dec!(0),
            trade_value: dec!(0),
            rebates: dec!(0),
        };

        let rules = TaxBaseRules {
            max_taxable_amount: Some(dec!(80000)), // NC-style cap
            ..Default::default()
        };

        let result = calculate_tax_base(&components, &rules);

        // Should cap at $80,000
        assert_eq!(result.tax_base, dec!(80000));
        assert!(result.cap_applied.is_some());
    }

    #[test]
    fn test_apply_tax_rate() {
        let base = dec!(20000);
        let components = vec![
            TaxRateComponent {
                name: "State".to_string(),
                rate: dec!(0.0625),
                applies_to_vehicles: true,
            },
            TaxRateComponent {
                name: "Local".to_string(),
                rate: dec!(0.02),
                applies_to_vehicles: true,
            },
        ];

        let result = apply_tax_rate(base, &components);

        // State: 20000 * 0.0625 = 1250
        // Local: 20000 * 0.02 = 400
        // Total: 1650
        assert_eq!(result.total_tax, dec!(1650));
        assert_eq!(result.effective_rate, dec!(0.0825));
        assert_eq!(result.components.len(), 2);
    }

    #[test]
    fn test_reciprocity_full_credit() {
        let credit = calculate_reciprocity_credit(
            dec!(20000),  // base
            dec!(1650),   // home tax
            dec!(0.07),   // transaction rate
            &ReciprocityRules {
                offers_reciprocity: true,
                credit_type: ReciprocityCreditType::FullCredit,
                max_credit_rate: None,
            },
        );

        // Transaction tax: 20000 * 0.07 = 1400
        // Credit = min(1400, 1650) = 1400
        assert_eq!(credit, dec!(1400));
    }

    #[test]
    fn test_reciprocity_partial_credit() {
        let credit = calculate_reciprocity_credit(
            dec!(20000),  // base
            dec!(1650),   // home tax
            dec!(0.10),   // transaction rate (higher)
            &ReciprocityRules {
                offers_reciprocity: true,
                credit_type: ReciprocityCreditType::PartialCredit,
                max_credit_rate: Some(dec!(0.0725)), // CA-style: only credit up to state rate
            },
        );

        // Transaction tax: 20000 * 0.10 = 2000
        // Max credit: 20000 * 0.0725 = 1450
        // Credit = min(2000, 1450, 1650) = 1450
        assert_eq!(credit, dec!(1450));
    }

    #[test]
    fn test_georgia_tavt() {
        let tavt = calculate_georgia_tavt(dec!(30000), dec!(10000), true);
        // (30000 - 10000) * 0.0675 = 1350
        assert_eq!(tavt, dec!(1350));
    }

    #[test]
    fn test_nc_hut() {
        // Test under cap
        let hut1 = calculate_nc_hut(dec!(50000), dec!(10000));
        // (50000 - 10000) * 0.03 = 1200
        assert_eq!(hut1, dec!(1200));

        // Test over cap
        let hut2 = calculate_nc_hut(dec!(120000), dec!(0));
        // min(120000, 80000) * 0.03 = 2400
        assert_eq!(hut2, dec!(2400));
    }

    #[test]
    fn test_wv_taxes() {
        let (sales, privilege) = calculate_wv_taxes(
            dec!(40000),
            dec!(15000),
            dec!(0.06),
            dec!(0.05),
        );

        // Taxable: 40000 - 15000 = 25000
        // Sales: 25000 * 0.06 = 1500
        // Privilege: 25000 * 0.05 = 1250
        assert_eq!(sales, dec!(1500));
        assert_eq!(privilege, dec!(1250));
    }

    #[test]
    fn test_wv_trade_cap() {
        let (sales, _) = calculate_wv_taxes(
            dec!(50000),
            dec!(30000), // Over $25k cap
            dec!(0.06),
            dec!(0.05),
        );

        // Only $25k of trade credited
        // Taxable: 50000 - 25000 = 25000
        // Sales: 25000 * 0.06 = 1500
        assert_eq!(sales, dec!(1500));
    }

    #[test]
    fn test_tax_base_never_negative() {
        let components = TaxBaseComponents {
            selling_price: dec!(10000),
            taxable_fees: dec!(0),
            taxable_products: dec!(0),
            trade_value: dec!(20000), // More than price
            rebates: dec!(5000),
        };

        let rules = TaxBaseRules {
            trade_reduces_basis: true,
            rebates_reduce_basis: true,
            ..Default::default()
        };

        let result = calculate_tax_base(&components, &rules);

        // Should be clamped to 0
        assert_eq!(result.tax_base, dec!(0));
    }
}
