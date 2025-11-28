//! P3 - Profile Loading
//!
//! Loads the required profiles (keys) for the deal cipher:
//! - RuleProfile: State tax rules
//! - ProgramProfile: Lender/lessor program parameters
//! - ProductProfiles: F&I product tax treatments

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::NaiveDate;

use crate::types::{
    DealType, StateCode, TaxType, LeaseTaxMode,
    RuleProfile, TaxRates, BaseRules, AncillaryRules, ReciprocityRules, ProfileMeta,
    UdcResult, UdcError,
};
use super::p2_jurisdiction::JurisdictionResolvedDeal;

/// Loaded profile context for deal calculations
#[derive(Debug, Clone)]
pub struct ProfileContext {
    /// Primary rule profile for governing state
    pub primary_rules: RuleProfile,
    /// Secondary rule profile (if interstate, for reciprocity)
    pub secondary_rules: Option<RuleProfile>,
    /// Program profile (lender/lessor parameters)
    pub program: Option<ProgramProfile>,
    /// Product tax treatments
    pub product_rules: Vec<ProductTaxRule>,
}

/// Simplified program profile for calculations
#[derive(Debug, Clone)]
pub struct ProgramProfile {
    pub lender_id: String,
    pub max_term: u32,
    pub max_ltv: Option<Decimal>,
    pub payment_rounding: PaymentRounding,
}

/// Payment rounding rules
#[derive(Debug, Clone, Copy, Default)]
pub enum PaymentRounding {
    #[default]
    NearestCent,
    RoundUp,
    RoundDown,
}

/// Product-specific tax rule
#[derive(Debug, Clone)]
pub struct ProductTaxRule {
    pub product_type: String,
    pub taxable: bool,
    pub capitalizable: bool,
}

/// Deal with loaded profiles
#[derive(Debug, Clone)]
pub struct ProfileLoadedDeal {
    /// The jurisdiction-resolved deal
    pub deal: JurisdictionResolvedDeal,
    /// Loaded profile context
    pub profiles: ProfileContext,
}

/// Profile repository trait for loading profiles.
/// This allows for dependency injection and testing.
pub trait ProfileRepository {
    fn get_rule_profile(&self, state: StateCode, deal_type: DealType) -> UdcResult<RuleProfile>;
    fn get_program_profile(&self, lender_id: &str) -> UdcResult<Option<ProgramProfile>>;
}

/// P3: Load all required profiles for the deal.
///
/// # Algorithm
/// 1. Load primary RuleProfile for governing state + deal type
/// 2. If interstate, load secondary RuleProfile for secondary state
/// 3. Load ProgramProfile if lender specified
/// 4. Build ProductTaxRule list from state rules + product overrides
///
/// # Profile Resolution Priority
/// 1. Exact match: (state, deal_type, effective_date)
/// 2. Deal type fallback: (state, any_deal_type, effective_date)
/// 3. Default profile with warnings
///
/// # Complexity
/// - Time: O(p) where p = number of products (for tax rule building)
/// - Space: O(p) for product rules
pub fn load_profiles(deal: JurisdictionResolvedDeal) -> UdcResult<ProfileLoadedDeal> {
    let jurisdiction = &deal.jurisdiction;
    let input = &deal.deal.input.inner;

    // Load primary rules for governing state
    let primary_rules = load_rule_profile(
        jurisdiction.governing_state,
        input.deal_type,
    )?;

    // Load secondary rules if interstate
    let secondary_rules = if let Some(secondary) = jurisdiction.secondary_state {
        Some(load_rule_profile(secondary, input.deal_type)?)
    } else {
        None
    };

    // Load program profile if lender specified
    let program = load_program_profile(input)?;

    // Build product tax rules
    let product_rules = build_product_tax_rules(&primary_rules, &input.products);

    let profiles = ProfileContext {
        primary_rules,
        secondary_rules,
        program,
        product_rules,
    };

    log::debug!(
        "P3: Loaded profiles - Primary: {:?}, Secondary: {:?}",
        profiles.primary_rules.state_code,
        profiles.secondary_rules.as_ref().map(|r| r.state_code)
    );

    Ok(ProfileLoadedDeal { deal, profiles })
}

/// Load a rule profile for a state/deal type combination.
/// In production, this would query a database or cache.
fn load_rule_profile(state: StateCode, deal_type: DealType) -> UdcResult<RuleProfile> {
    // For now, use the built-in state profiles
    // In production, this would be a database lookup
    get_builtin_profile(state, deal_type)
}

/// Get a built-in state profile.
/// These are default profiles - production would load from database.
fn get_builtin_profile(state: StateCode, deal_type: DealType) -> UdcResult<RuleProfile> {
    // Special state handling
    match state {
        StateCode::GA => Ok(georgia_profile(deal_type)),
        StateCode::NC => Ok(north_carolina_profile(deal_type)),
        StateCode::WV => Ok(west_virginia_profile(deal_type)),
        StateCode::TX => Ok(texas_profile(deal_type)),
        StateCode::CA => Ok(california_profile(deal_type)),
        StateCode::FL => Ok(florida_profile(deal_type)),
        StateCode::NY => Ok(new_york_profile(deal_type)),
        StateCode::MT | StateCode::OR | StateCode::NH | StateCode::DE => {
            Ok(no_tax_state_profile(state, deal_type))
        }
        _ => Ok(default_profile(state, deal_type)),
    }
}

// === Built-in State Profiles ===

fn georgia_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::GA,
        mode: deal_type,
        tax_type: TaxType::Tavt,
        rates: TaxRates {
            state_rate: dec!(0), // No sales tax
            tavt_rate: Some(dec!(0.0675)), // 6.75% TAVT on new, 7% on used
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: true,
            ..Default::default()
        },
        ancillaries: AncillaryRules::default(),
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::CapCostUpfront),
        meta: ProfileMeta {
            version: "2024.1".to_string(),
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            source: Some("GA DOR".to_string()),
            ..Default::default()
        },
    }
}

fn north_carolina_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::NC,
        mode: deal_type,
        tax_type: TaxType::Hut,
        rates: TaxRates {
            state_rate: dec!(0), // No sales tax on vehicles
            hut_rate: Some(dec!(0.03)), // 3% Highway Use Tax
            flat_tax_amount: None,
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: false, // HUT based on purchase price
            max_taxable_amount: Some(dec!(80000)), // Cap at first $80k
            ..Default::default()
        },
        ancillaries: AncillaryRules::default(),
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta {
            version: "2024.1".to_string(),
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            source: Some("NC DMV".to_string()),
            ..Default::default()
        },
    }
}

fn west_virginia_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::WV,
        mode: deal_type,
        tax_type: TaxType::Excise,
        rates: TaxRates {
            state_rate: dec!(0.06), // 6% sales tax
            excise_rate: Some(dec!(0.05)), // 5% privilege tax
            max_local_rate: Some(dec!(0.01)),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            max_trade_in_credit: Some(dec!(25000)), // Cap trade credit
            ..Default::default()
        },
        ancillaries: AncillaryRules::default(),
        reciprocity: ReciprocityRules::default(),
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta::default(),
    }
}

fn texas_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::TX,
        mode: deal_type,
        tax_type: TaxType::Sales,
        rates: TaxRates {
            state_rate: dec!(0.0625), // 6.25%
            max_local_rate: Some(dec!(0.02)),
            default_combined_rate: dec!(0.0825),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: false, // TX does not reduce for rebates
            doc_fee_taxable: true,
            ..Default::default()
        },
        ancillaries: AncillaryRules {
            vsc_taxable: false, // Service contracts exempt in TX
            gap_taxable: false,
            ..Default::default()
        },
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            use_higher_rate: false,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta {
            version: "2024.1".to_string(),
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            source: Some("TX Comptroller".to_string()),
            ..Default::default()
        },
    }
}

fn california_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::CA,
        mode: deal_type,
        tax_type: TaxType::Sales,
        rates: TaxRates {
            state_rate: dec!(0.0725), // 7.25% base
            max_local_rate: Some(dec!(0.0275)),
            default_combined_rate: dec!(0.0825),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: false, // CA does NOT allow trade credit
            rebates_reduce_basis: true,
            doc_fee_taxable: false, // Doc fee not taxable in CA
            ..Default::default()
        },
        ancillaries: AncillaryRules {
            vsc_taxable: false,
            gap_taxable: false,
            ..Default::default()
        },
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            max_credit_rate: Some(dec!(0.0725)), // Credit up to state rate only
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta {
            version: "2024.1".to_string(),
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            source: Some("CA CDTFA".to_string()),
            ..Default::default()
        },
    }
}

fn florida_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::FL,
        mode: deal_type,
        tax_type: TaxType::Sales,
        rates: TaxRates {
            state_rate: dec!(0.06), // 6%
            max_local_rate: Some(dec!(0.015)),
            default_combined_rate: dec!(0.07),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: true,
            ..Default::default()
        },
        ancillaries: AncillaryRules {
            vsc_taxable: true,
            gap_taxable: false,
            ..Default::default()
        },
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta::default(),
    }
}

fn new_york_profile(deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: StateCode::NY,
        mode: deal_type,
        tax_type: TaxType::Sales,
        rates: TaxRates {
            state_rate: dec!(0.04), // 4% state
            max_local_rate: Some(dec!(0.045)),
            default_combined_rate: dec!(0.08),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: true,
            ..Default::default()
        },
        ancillaries: AncillaryRules {
            vsc_taxable: true,
            ..Default::default()
        },
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::CapCostUpfront), // NY taxes lease upfront
        meta: ProfileMeta::default(),
    }
}

fn no_tax_state_profile(state: StateCode, deal_type: DealType) -> RuleProfile {
    RuleProfile {
        state_code: state,
        mode: deal_type,
        tax_type: TaxType::None,
        rates: TaxRates {
            state_rate: dec!(0),
            ..Default::default()
        },
        base_rules: BaseRules::default(),
        ancillaries: AncillaryRules::default(),
        reciprocity: ReciprocityRules::default(),
        lease_tax_mode: Some(LeaseTaxMode::Exempt),
        meta: ProfileMeta::default(),
    }
}

fn default_profile(state: StateCode, deal_type: DealType) -> RuleProfile {
    // Generic profile for states without special handling
    // Production system would have all 50 states defined
    RuleProfile {
        state_code: state,
        mode: deal_type,
        tax_type: TaxType::Sales,
        rates: TaxRates {
            state_rate: dec!(0.06), // Assume 6% as default
            default_combined_rate: dec!(0.07),
            ..Default::default()
        },
        base_rules: BaseRules {
            trade_in_reduces_basis: true,
            rebates_reduce_basis: false,
            ..Default::default()
        },
        ancillaries: AncillaryRules::default(),
        reciprocity: ReciprocityRules {
            offers_reciprocity: true,
            ..Default::default()
        },
        lease_tax_mode: Some(LeaseTaxMode::MonthlyPayment),
        meta: ProfileMeta {
            version: "default".to_string(),
            notes: Some("Default profile - verify state-specific rules".to_string()),
            ..Default::default()
        },
    }
}

/// Load program profile from input
fn load_program_profile(input: &crate::types::DealInput) -> UdcResult<Option<ProgramProfile>> {
    // Extract lender ID based on deal type
    let lender_id = match input.deal_type {
        DealType::Finance => input.finance_params.as_ref().and_then(|p| p.lender_id.clone()),
        DealType::Lease => input.lease_params.as_ref().and_then(|p| p.lessor_id.clone()),
        DealType::Cash => None,
    };

    match lender_id {
        Some(id) => {
            // In production, load from database
            // For now, return a default program
            Ok(Some(ProgramProfile {
                lender_id: id,
                max_term: 84,
                max_ltv: Some(dec!(1.25)),
                payment_rounding: PaymentRounding::NearestCent,
            }))
        }
        None => Ok(None),
    }
}

/// Build product tax rules from state rules and product list
fn build_product_tax_rules(
    rules: &RuleProfile,
    products: &[crate::types::Product],
) -> Vec<ProductTaxRule> {
    products
        .iter()
        .map(|p| {
            let product_type = format!("{:?}", p.product_type).to_lowercase();
            let taxable = rules.ancillaries.is_product_taxable(&product_type);
            ProductTaxRule {
                product_type,
                taxable,
                capitalizable: true, // Default to capitalizable
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DealInput, DealFees, CustomerInfo, FinanceParams};
    use crate::phases::p0_normalize::normalize_deal_input;
    use crate::phases::p1_mode_routing::route_deal;
    use crate::phases::p2_jurisdiction::resolve_jurisdiction;

    fn make_test_deal(home: StateCode, deal_type: DealType) -> JurisdictionResolvedDeal {
        let input = DealInput {
            deal_type,
            vehicle_price: dec!(30000),
            trade_in_value: Some(dec!(10000)),
            trade_in_payoff: Some(dec!(5000)),
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: home,
            transaction_state: home,
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
        };

        let normalized = normalize_deal_input(input).unwrap();
        let routed = route_deal(normalized).unwrap();
        resolve_jurisdiction(routed).unwrap()
    }

    #[test]
    fn test_load_texas_profile() {
        let deal = make_test_deal(StateCode::TX, DealType::Finance);
        let loaded = load_profiles(deal).unwrap();

        assert_eq!(loaded.profiles.primary_rules.state_code, StateCode::TX);
        assert_eq!(loaded.profiles.primary_rules.rates.state_rate, dec!(0.0625));
        assert!(loaded.profiles.primary_rules.base_rules.trade_in_reduces_basis);
        assert!(!loaded.profiles.primary_rules.base_rules.rebates_reduce_basis);
    }

    #[test]
    fn test_load_california_profile() {
        let deal = make_test_deal(StateCode::CA, DealType::Finance);
        let loaded = load_profiles(deal).unwrap();

        // CA does NOT allow trade-in credit
        assert!(!loaded.profiles.primary_rules.base_rules.trade_in_reduces_basis);
        // CA DOES allow rebate reduction
        assert!(loaded.profiles.primary_rules.base_rules.rebates_reduce_basis);
    }

    #[test]
    fn test_load_georgia_tavt() {
        let deal = make_test_deal(StateCode::GA, DealType::Finance);
        let loaded = load_profiles(deal).unwrap();

        assert_eq!(loaded.profiles.primary_rules.tax_type, TaxType::Tavt);
        assert_eq!(loaded.profiles.primary_rules.rates.tavt_rate, Some(dec!(0.0675)));
    }

    #[test]
    fn test_load_no_tax_state() {
        let deal = make_test_deal(StateCode::MT, DealType::Cash);
        let loaded = load_profiles(deal).unwrap();

        assert_eq!(loaded.profiles.primary_rules.tax_type, TaxType::None);
        assert_eq!(loaded.profiles.primary_rules.rates.state_rate, dec!(0));
    }
}
