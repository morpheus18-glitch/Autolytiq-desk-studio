//! P2 - Jurisdiction Resolution
//!
//! Resolves the H/T/G (Home, Transaction, Garaging) jurisdiction triplet
//! and determines which state's rules apply for tax calculations.
//!
//! This is the entry point to the Rule Configuration Framework (RCF).

use crate::types::{DealType, StateCode, UdcResult, UdcError};
use super::p1_mode_routing::RoutedDeal;

/// The resolved jurisdiction context for a deal.
/// Contains the H/T/G triplet and determination of which rules apply.
#[derive(Debug, Clone)]
pub struct JurisdictionContext {
    /// Home state - customer's state of residence
    pub home_state: StateCode,
    /// Transaction state - where the deal is executed (dealer location)
    pub transaction_state: StateCode,
    /// Garaging state - where vehicle will be kept (important for leases)
    pub garaging_state: StateCode,
    /// The primary state whose rules govern this transaction
    pub governing_state: StateCode,
    /// Whether this is an interstate transaction
    pub is_interstate: bool,
    /// The secondary state (if interstate, for reciprocity calculations)
    pub secondary_state: Option<StateCode>,
    /// Special handling flags
    pub flags: JurisdictionFlags,
}

/// Special jurisdiction handling flags
#[derive(Debug, Clone, Default)]
pub struct JurisdictionFlags {
    /// Customer is registering in a no-sales-tax state
    pub no_sales_tax_registration: bool,
    /// Transaction involves military personnel (may affect state)
    pub military_exception: bool,
    /// Business/fleet registration with special rules
    pub commercial_registration: bool,
    /// Vehicle will be garaged in different state from registration
    pub split_registration: bool,
}

/// Deal with resolved jurisdiction context
#[derive(Debug, Clone)]
pub struct JurisdictionResolvedDeal {
    /// The routed deal
    pub deal: RoutedDeal,
    /// Resolved jurisdiction context
    pub jurisdiction: JurisdictionContext,
}

/// States with no general sales tax on vehicles
const NO_SALES_TAX_STATES: &[StateCode] = &[
    StateCode::MT, // Montana
    StateCode::OR, // Oregon
    StateCode::NH, // New Hampshire
    StateCode::DE, // Delaware
];

/// States with special vehicle taxes (not standard sales tax)
const SPECIAL_TAX_STATES: &[StateCode] = &[
    StateCode::GA, // TAVT
    StateCode::NC, // HUT
    StateCode::WV, // Excise
];

/// P2: Resolve jurisdiction and determine governing rules.
///
/// # Algorithm
/// 1. Extract H/T/G triplet from deal input
/// 2. Determine if transaction is intrastate or interstate
/// 3. Apply jurisdiction determination rules:
///    - For cash/finance: typically home state rules apply
///    - For lease: garaging state often determines tax
/// 4. Check for special cases (no-tax states, military, etc.)
/// 5. Set up secondary state for reciprocity if needed
///
/// # State Determination Rules
///
/// ## General Rule
/// - Tax is typically owed to the state of registration (home state)
/// - Transaction state may collect tax on behalf of home state
/// - Or customer pays use tax to home state
///
/// ## Lease Exception
/// - Many states tax leases based on garaging location
/// - Some states (TX, NY) tax at point of sale regardless
///
/// ## Reciprocity
/// - When home != transaction, reciprocity rules apply
/// - Some states give full credit for tax paid elsewhere
/// - Some give partial credit up to their rate
/// - Some give no credit (double taxation)
///
/// # Complexity
/// - Time: O(1) - simple state lookups
/// - Space: O(1)
pub fn resolve_jurisdiction(deal: RoutedDeal) -> UdcResult<JurisdictionResolvedDeal> {
    let input = &deal.input.inner;

    // Extract H/T/G triplet
    let home_state = input.home_state;
    let transaction_state = input.transaction_state;
    let garaging_state = input.garaging_state.unwrap_or(home_state);

    // Determine if interstate
    let is_interstate = home_state != transaction_state;

    // Determine governing state based on deal type and states involved
    let (governing_state, secondary_state) = determine_governing_state(
        home_state,
        transaction_state,
        garaging_state,
        deal.input.inner.deal_type,
    );

    // Build flags
    let flags = build_jurisdiction_flags(
        home_state,
        garaging_state,
        &input.customer,
    );

    let jurisdiction = JurisdictionContext {
        home_state,
        transaction_state,
        garaging_state,
        governing_state,
        is_interstate,
        secondary_state,
        flags,
    };

    log::debug!(
        "P2: Jurisdiction resolved - Home: {:?}, Transaction: {:?}, Garaging: {:?}, Governing: {:?}",
        home_state, transaction_state, garaging_state, governing_state
    );

    Ok(JurisdictionResolvedDeal { deal, jurisdiction })
}

/// Determine which state's rules govern this transaction.
///
/// # Returns
/// (governing_state, optional_secondary_state)
fn determine_governing_state(
    home: StateCode,
    transaction: StateCode,
    garaging: StateCode,
    deal_type: DealType,
) -> (StateCode, Option<StateCode>) {
    // For leases, many states use garaging state
    if deal_type == DealType::Lease {
        // Special lease jurisdiction rules
        return determine_lease_governing_state(home, transaction, garaging);
    }

    // For cash/finance, generally use home state rules
    // but tax may be collected at transaction state
    if home == transaction {
        // Simple case: intrastate transaction
        (home, None)
    } else {
        // Interstate: home state governs, transaction state is secondary
        // (for reciprocity credit calculation)
        (home, Some(transaction))
    }
}

/// Special jurisdiction logic for leases.
fn determine_lease_governing_state(
    home: StateCode,
    transaction: StateCode,
    garaging: StateCode,
) -> (StateCode, Option<StateCode>) {
    // States that tax leases at garaging location
    let garaging_tax_states = [
        StateCode::CA,
        StateCode::IL,
        StateCode::MA,
        StateCode::NJ,
        StateCode::NY,
        StateCode::PA,
    ];

    // States that tax leases at transaction location regardless
    let transaction_tax_states = [
        StateCode::TX,
        StateCode::FL,
    ];

    if transaction_tax_states.contains(&transaction) {
        // Transaction state rules, home state for reciprocity if different
        let secondary = if home != transaction { Some(home) } else { None };
        (transaction, secondary)
    } else if garaging_tax_states.contains(&garaging) {
        // Garaging state rules
        let secondary = if transaction != garaging { Some(transaction) } else { None };
        (garaging, secondary)
    } else {
        // Default: home state rules
        let secondary = if transaction != home { Some(transaction) } else { None };
        (home, secondary)
    }
}

/// Build jurisdiction flags based on deal context.
fn build_jurisdiction_flags(
    home: StateCode,
    garaging: StateCode,
    customer: &crate::types::CustomerInfo,
) -> JurisdictionFlags {
    JurisdictionFlags {
        no_sales_tax_registration: NO_SALES_TAX_STATES.contains(&home),
        military_exception: customer.is_military,
        commercial_registration: matches!(
            customer.customer_type,
            crate::types::CustomerType::FleetCommercial | crate::types::CustomerType::Business
        ),
        split_registration: home != garaging,
    }
}

/// Check if a state has no general sales tax.
pub fn is_no_sales_tax_state(state: StateCode) -> bool {
    NO_SALES_TAX_STATES.contains(&state)
}

/// Check if a state has special vehicle tax treatment.
pub fn has_special_vehicle_tax(state: StateCode) -> bool {
    SPECIAL_TAX_STATES.contains(&state)
}

/// Get the special tax type for a state (if any).
pub fn get_special_tax_type(state: StateCode) -> Option<&'static str> {
    match state {
        StateCode::GA => Some("TAVT"), // Title Ad Valorem Tax
        StateCode::NC => Some("HUT"),  // Highway Use Tax
        StateCode::WV => Some("EXCISE"),
        StateCode::MT | StateCode::OR | StateCode::NH | StateCode::DE => Some("NONE"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealInput, DealFees, CustomerInfo, FinanceParams};
    use crate::phases::p0_normalize::normalize_deal_input;
    use crate::phases::p1_mode_routing::route_deal;
    use rust_decimal_macros::dec;

    fn make_test_deal(
        home: StateCode,
        transaction: StateCode,
        garaging: Option<StateCode>,
        deal_type: DealType,
    ) -> RoutedDeal {
        let input = DealInput {
            deal_type,
            vehicle_price: dec!(30000),
            trade_in_value: None,
            trade_in_payoff: None,
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: home,
            transaction_state: transaction,
            garaging_state: garaging,
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
        };

        let normalized = normalize_deal_input(input).unwrap();
        route_deal(normalized).unwrap()
    }

    #[test]
    fn test_intrastate_transaction() {
        let deal = make_test_deal(StateCode::TX, StateCode::TX, None, DealType::Finance);
        let resolved = resolve_jurisdiction(deal).unwrap();

        assert!(!resolved.jurisdiction.is_interstate);
        assert_eq!(resolved.jurisdiction.governing_state, StateCode::TX);
        assert!(resolved.jurisdiction.secondary_state.is_none());
    }

    #[test]
    fn test_interstate_transaction() {
        let deal = make_test_deal(StateCode::CA, StateCode::AZ, None, DealType::Finance);
        let resolved = resolve_jurisdiction(deal).unwrap();

        assert!(resolved.jurisdiction.is_interstate);
        assert_eq!(resolved.jurisdiction.governing_state, StateCode::CA);
        assert_eq!(resolved.jurisdiction.secondary_state, Some(StateCode::AZ));
    }

    #[test]
    fn test_no_sales_tax_state() {
        let deal = make_test_deal(StateCode::MT, StateCode::WA, None, DealType::Cash);
        let resolved = resolve_jurisdiction(deal).unwrap();

        assert!(resolved.jurisdiction.flags.no_sales_tax_registration);
    }

    #[test]
    fn test_special_tax_states() {
        assert!(has_special_vehicle_tax(StateCode::GA));
        assert!(has_special_vehicle_tax(StateCode::NC));
        assert!(!has_special_vehicle_tax(StateCode::TX));

        assert_eq!(get_special_tax_type(StateCode::GA), Some("TAVT"));
        assert_eq!(get_special_tax_type(StateCode::NC), Some("HUT"));
    }
}
