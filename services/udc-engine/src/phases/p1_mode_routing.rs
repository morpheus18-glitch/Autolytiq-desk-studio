//! P1 - Mode Routing
//!
//! Routes the deal to the appropriate calculation path based on deal type.
//! This is the "branch point" in our cipher algorithm.
//!
//! dealType in {cash, finance, lease} -> route to appropriate pipeline

use crate::types::{DealType, UdcResult};
use super::p0_normalize::NormalizedDealInput;

/// Calculation mode after routing
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CalculationMode {
    /// Cash purchase - simplest path
    Cash,
    /// Finance (retail installment) - loan calculations
    Finance,
    /// Lease - depreciation and rent charge calculations
    Lease,
}

impl From<DealType> for CalculationMode {
    fn from(deal_type: DealType) -> Self {
        match deal_type {
            DealType::Cash => CalculationMode::Cash,
            DealType::Finance => CalculationMode::Finance,
            DealType::Lease => CalculationMode::Lease,
        }
    }
}

/// Routed deal with its calculation mode
#[derive(Debug, Clone)]
pub struct RoutedDeal {
    /// The normalized input
    pub input: NormalizedDealInput,
    /// Determined calculation mode
    pub mode: CalculationMode,
}

/// P1: Route the deal to the appropriate calculation path.
///
/// # Algorithm
/// This is a simple mapping phase that:
/// 1. Extracts deal_type from input
/// 2. Maps to CalculationMode enum
/// 3. Bundles input with mode for downstream phases
///
/// # Design Rationale
/// While this seems trivial, having an explicit routing phase:
/// - Makes the pipeline structure explicit
/// - Provides a hook point for future deal type extensions
/// - Enables mode-specific pre-processing if needed
///
/// # Complexity
/// - Time: O(1)
/// - Space: O(1)
pub fn route_deal(input: NormalizedDealInput) -> UdcResult<RoutedDeal> {
    let mode = CalculationMode::from(input.inner.deal_type);

    // Log the routing decision for audit purposes
    log::debug!(
        "P1: Routing deal as {:?} (original type: {:?})",
        mode,
        input.inner.deal_type
    );

    Ok(RoutedDeal { input, mode })
}

/// Check if a mode requires amortization schedule generation
pub fn requires_amortization(mode: CalculationMode) -> bool {
    matches!(mode, CalculationMode::Finance)
}

/// Check if a mode involves periodic payments
pub fn has_periodic_payments(mode: CalculationMode) -> bool {
    matches!(mode, CalculationMode::Finance | CalculationMode::Lease)
}

/// Check if mode requires lease-specific calculations
pub fn is_lease_mode(mode: CalculationMode) -> bool {
    matches!(mode, CalculationMode::Lease)
}

/// Check if mode requires finance-specific calculations
pub fn is_finance_mode(mode: CalculationMode) -> bool {
    matches!(mode, CalculationMode::Finance)
}

/// Get the pipeline stages for a given mode
pub fn get_pipeline_stages(mode: CalculationMode) -> Vec<&'static str> {
    match mode {
        CalculationMode::Cash => vec![
            "P0_NORMALIZE",
            "P1_ROUTE",
            "P2_JURISDICTION",
            "P3_PROFILES",
            "P4_TAX",
            "P5_STRUCTURE_CASH",
            "P7_FINALIZE",
        ],
        CalculationMode::Finance => vec![
            "P0_NORMALIZE",
            "P1_ROUTE",
            "P2_JURISDICTION",
            "P3_PROFILES",
            "P4_TAX",
            "P5_STRUCTURE_FINANCE",
            "P6_AMORTIZATION",
            "P7_FINALIZE",
        ],
        CalculationMode::Lease => vec![
            "P0_NORMALIZE",
            "P1_ROUTE",
            "P2_JURISDICTION",
            "P3_PROFILES",
            "P4_TAX",
            "P5_STRUCTURE_LEASE",
            "P6_LEASE_PAYMENT",
            "P7_FINALIZE",
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealInput, DealFees, CustomerInfo, FinanceParams, StateCode};
    use crate::phases::p0_normalize::normalize_deal_input;
    use rust_decimal_macros::dec;

    fn make_test_input(deal_type: DealType) -> DealInput {
        DealInput {
            deal_type,
            vehicle_price: dec!(30000),
            trade_in_value: None,
            trade_in_payoff: None,
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: StateCode::TX,
            transaction_state: StateCode::TX,
            garaging_state: None,
            customer: CustomerInfo::default(),
            finance_params: if deal_type == DealType::Finance {
                Some(FinanceParams {
                    term_months: 60,
                    apr: dec!(0.0599),
                    lender_id: None,
                    buy_rate: None,
                    max_reserve_points: None,
                    deferred_first_payment: false,
                    days_to_first_payment: None,
                })
            } else {
                None
            },
            lease_params: None,
            deal_date: None,
            first_payment_date: None,
        }
    }

    #[test]
    fn test_route_cash_deal() {
        let input = make_test_input(DealType::Cash);
        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();

        assert_eq!(routed.mode, CalculationMode::Cash);
        assert!(!requires_amortization(routed.mode));
        assert!(!has_periodic_payments(routed.mode));
    }

    #[test]
    fn test_route_finance_deal() {
        let input = make_test_input(DealType::Finance);
        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();

        assert_eq!(routed.mode, CalculationMode::Finance);
        assert!(requires_amortization(routed.mode));
        assert!(has_periodic_payments(routed.mode));
        assert!(is_finance_mode(routed.mode));
    }

    #[test]
    fn test_pipeline_stages() {
        let cash_stages = get_pipeline_stages(CalculationMode::Cash);
        let finance_stages = get_pipeline_stages(CalculationMode::Finance);
        let lease_stages = get_pipeline_stages(CalculationMode::Lease);

        // Cash should not have amortization
        assert!(!cash_stages.contains(&"P6_AMORTIZATION"));

        // Finance should have amortization
        assert!(finance_stages.contains(&"P6_AMORTIZATION"));

        // Lease should have lease payment stage
        assert!(lease_stages.contains(&"P6_LEASE_PAYMENT"));
    }
}
