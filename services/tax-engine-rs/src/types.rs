//! Tax Engine Type Definitions
//!
//! Rust types for the automotive tax calculation DSL.
//! These match the TypeScript types in /shared/autoTaxEngine/types.ts exactly.
//!
//! # Architecture
//!
//! The type system follows a data-driven approach where:
//! - State rules are pure configuration (TaxRulesConfig)
//! - All business logic lives in interpreter functions
//! - Special tax schemes (TAVT, HUT, Privilege) have dedicated configs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Trade-In Policy
// ============================================================================

/// Trade-in credit policy for a state
///
/// Determines how much of a trade-in value can be used to reduce taxable base.
/// - NONE: No credit (rare, e.g., some lease situations)
/// - FULL: Full credit of trade-in value (most common)
/// - CAPPED: Credit up to a maximum amount (e.g., Michigan)
/// - PERCENT: Credit a percentage of trade-in value
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TradeInPolicy {
    #[serde(rename = "NONE")]
    None { notes: Option<String> },
    #[serde(rename = "FULL")]
    Full { notes: Option<String> },
    #[serde(rename = "CAPPED")]
    Capped {
        #[serde(rename = "capAmount")]
        cap_amount: f64,
        notes: Option<String>,
    },
    #[serde(rename = "PERCENT")]
    Percent {
        percent: f64,
        notes: Option<String>,
    },
}

// ============================================================================
// Rebate Rules
// ============================================================================

/// Rebate taxation rule
///
/// Determines whether rebates reduce the taxable base.
/// - Manufacturer rebates: Often non-taxable (considered price reduction)
/// - Dealer rebates: Usually taxable (considered payment by dealer)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebateRule {
    #[serde(rename = "appliesTo")]
    pub applies_to: RebateType,
    pub taxable: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RebateType {
    Manufacturer,
    Dealer,
    Any,
}

// ============================================================================
// Fee Tax Rules
// ============================================================================

/// Fee taxation rule
///
/// Determines whether specific fees are taxable.
/// Common fee codes: DOC_FEE, SERVICE_CONTRACT, GAP, TITLE, REG, EFILE
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeTaxRule {
    pub code: String,
    pub taxable: bool,
    pub notes: Option<String>,
}

// ============================================================================
// Vehicle Tax Scheme
// ============================================================================

/// How vehicle tax behaves vs generic sales tax system
///
/// - STATE_ONLY: Flat vehicle tax, no local stacking (IN, MI, KY)
/// - STATE_PLUS_LOCAL: Full stacked jurisdictions (CA, CO, OH, IL)
/// - LOCAL_ONLY: No state tax, only local jurisdictions (AK, MT partial)
/// - SPECIAL_HUT: NC-style Highway Use Tax
/// - SPECIAL_TAVT: GA-style Title Ad Valorem Tax
/// - DMV_PRIVILEGE_TAX: WV-style privilege/title tax
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VehicleTaxScheme {
    StateOnly,
    StatePlusLocal,
    LocalOnly,
    SpecialHut,
    SpecialTavt,
    DmvPrivilegeTax,
    SpecialCap,
}

// ============================================================================
// Lease-Specific Types
// ============================================================================

/// Title fee rule for leases
///
/// Determines how title-related fees are handled in lease taxation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleFeeRule {
    pub code: String,
    pub taxable: bool,
    #[serde(rename = "includedInCapCost")]
    pub included_in_cap_cost: bool,
    #[serde(rename = "includedInUpfront")]
    pub included_in_upfront: bool,
    #[serde(rename = "includedInMonthly")]
    pub included_in_monthly: bool,
}

/// Lease taxation method
///
/// - FULL_UPFRONT: Tax whole taxable base upfront (NJ, NY-style)
/// - MONTHLY: Tax each payment (IN-style)
/// - HYBRID: Some upfront + monthly
/// - NET_CAP_COST: Tax adjusted cap cost
/// - REDUCED_BASE: Tax only certain portion (e.g., depreciation)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseMethod {
    FullUpfront,
    Monthly,
    Hybrid,
    NetCapCost,
    ReducedBase,
}

/// How rebates behave in leases
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseRebateBehavior {
    AlwaysTaxable,
    AlwaysNonTaxable,
    FollowRetailRule,
    NonTaxableIfAtSigning,
    NonTaxableIfAssignable,
}

/// Doc fee taxability in leases
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseDocFeeTaxability {
    Always,
    FollowRetailRule,
    Never,
    OnlyUpfront,
}

/// Trade-in credit mode for leases
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseTradeInCreditMode {
    None,
    Full,
    CapCostOnly,
    AppliedToPayment,
    FollowRetailRule,
}

/// Special lease tax schemes
///
/// Handles state-specific lease taxation quirks.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseSpecialScheme {
    None,
    NyMtr,           // NY MCTD surcharge
    NjLuxury,        // NJ 0.4% on luxury vehicles (>$45k)
    PaLeaseTax,      // PA monthly only
    IlChicagoCook,   // Chicago + Cook County special
    TxLeaseSpecial,  // TX motor vehicle sales tax
    VaUsage,         // VA usage tax on leases
    MdUpfrontGain,   // MD tax on upfront gain
    CoHomeRuleLease, // CO home-rule city complexity
    GaTavt,          // GA TAVT for leases
}

/// Complete lease tax rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseTaxRules {
    pub method: LeaseMethod,
    #[serde(rename = "taxCapReduction")]
    pub tax_cap_reduction: bool,
    #[serde(rename = "rebateBehavior")]
    pub rebate_behavior: LeaseRebateBehavior,
    #[serde(rename = "docFeeTaxability")]
    pub doc_fee_taxability: LeaseDocFeeTaxability,
    #[serde(rename = "tradeInCredit")]
    pub trade_in_credit: LeaseTradeInCreditMode,
    #[serde(rename = "negativeEquityTaxable")]
    pub negative_equity_taxable: bool,
    #[serde(rename = "feeTaxRules")]
    pub fee_tax_rules: Vec<FeeTaxRule>,
    #[serde(rename = "titleFeeRules")]
    pub title_fee_rules: Vec<TitleFeeRule>,
    #[serde(rename = "taxFeesUpfront")]
    pub tax_fees_upfront: bool,
    #[serde(rename = "specialScheme")]
    pub special_scheme: LeaseSpecialScheme,
    pub notes: Option<String>,
}

// ============================================================================
// Reciprocity (Cross-State Tax Credit)
// ============================================================================

/// Reciprocity mode for cross-state tax credit
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityMode {
    None,              // No credit given
    CreditUpToStateRate, // Credit limited to state rate
    CreditFull,        // Full credit for tax paid elsewhere
    HomeStateOnly,     // Tax determined by home/registration state
}

/// Scope of reciprocity rules
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityScope {
    None,
    RetailOnly,
    LeaseOnly,
    Both,
}

/// Basis for reciprocity credit calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityBasis {
    TaxPaid,
    TaxDueAtOtherStateRate,
}

/// Pairwise reciprocity override rule
///
/// Handles complex directional reciprocity cases where state A → state B
/// reciprocity differs from state B → state A.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReciprocityOverrideRule {
    #[serde(rename = "originState")]
    pub origin_state: String,
    #[serde(rename = "modeOverride")]
    pub mode_override: Option<ReciprocityMode>,
    #[serde(rename = "scopeOverride")]
    pub scope_override: Option<ReciprocityScope>,
    #[serde(rename = "disallowCredit")]
    pub disallow_credit: Option<bool>,
    #[serde(rename = "maxAgeDaysSinceTaxPaid")]
    pub max_age_days_since_tax_paid: Option<u32>,
    #[serde(rename = "requiresMutualCredit")]
    pub requires_mutual_credit: Option<bool>,
    #[serde(rename = "requiresSameOwner")]
    pub requires_same_owner: Option<bool>,
    #[serde(rename = "appliesToVehicleClass")]
    pub applies_to_vehicle_class: Option<String>,
    #[serde(rename = "appliesToGVWRange")]
    pub applies_to_gvw_range: Option<GVWRange>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GVWRange {
    pub min: Option<u32>,
    pub max: Option<u32>,
}

/// Complete reciprocity rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReciprocityRules {
    pub enabled: bool,
    pub scope: ReciprocityScope,
    #[serde(rename = "homeStateBehavior")]
    pub home_state_behavior: ReciprocityMode,
    #[serde(rename = "requireProofOfTaxPaid")]
    pub require_proof_of_tax_paid: bool,
    pub basis: ReciprocityBasis,
    #[serde(rename = "capAtThisStatesTax")]
    pub cap_at_this_states_tax: bool,
    #[serde(rename = "hasLeaseException")]
    pub has_lease_exception: bool,
    pub overrides: Option<Vec<ReciprocityOverrideRule>>,
    #[serde(rename = "exemptStates")]
    pub exempt_states: Option<Vec<String>>,
    #[serde(rename = "nonReciprocalStates")]
    pub non_reciprocal_states: Option<Vec<String>>,
    pub notes: Option<String>,
}

// ============================================================================
// State-Specific Extras (Special Configurations)
// ============================================================================

/// Georgia TAVT (Title Ad Valorem Tax) Configuration
///
/// Georgia uses TAVT instead of traditional sales tax for vehicle purchases.
/// TAVT is a one-time tax paid at title/registration based on fair market value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeorgiaTAVTConfig {
    #[serde(rename = "defaultRate")]
    pub default_rate: f64,
    #[serde(rename = "useAssessedValue")]
    pub use_assessed_value: bool,
    #[serde(rename = "useHigherOfPriceOrAssessed")]
    pub use_higher_of_price_or_assessed: bool,
    #[serde(rename = "allowTradeInCredit")]
    pub allow_trade_in_credit: bool,
    #[serde(rename = "tradeInAppliesTo")]
    pub trade_in_applies_to: TAVTTradeInApplication,
    #[serde(rename = "applyNegativeEquityToBase")]
    pub apply_negative_equity_to_base: bool,
    #[serde(rename = "leaseBaseMode")]
    pub lease_base_mode: TAVTLeaseBaseMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TAVTTradeInApplication {
    VehicleOnly,
    Full,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TAVTLeaseBaseMode {
    AgreedValue,
    CapCost,
    Custom,
}

/// North Carolina Highway Use Tax (HUT) Configuration
///
/// North Carolina uses Highway Use Tax instead of general sales tax for vehicles.
/// HUT is a state-only tax (no local rates) with specific rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NorthCarolinaHUTConfig {
    #[serde(rename = "baseRate")]
    pub base_rate: f64,
    #[serde(rename = "useHighwayUseTax")]
    pub use_highway_use_tax: bool,
    #[serde(rename = "includeTradeInReduction")]
    pub include_trade_in_reduction: bool,
    #[serde(rename = "applyToNetPriceOnly")]
    pub apply_to_net_price_only: bool,
    #[serde(rename = "maxReciprocityAgeDays")]
    pub max_reciprocity_age_days: u32,
}

/// West Virginia Privilege Tax Configuration
///
/// West Virginia uses a privilege tax for vehicle registration which is
/// similar to sales tax but with different base calculation rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WestVirginiaPrivilegeConfig {
    #[serde(rename = "baseRate")]
    pub base_rate: f64,
    #[serde(rename = "useAssessedValue")]
    pub use_assessed_value: bool,
    #[serde(rename = "useHigherOfPriceOrAssessed")]
    pub use_higher_of_price_or_assessed: bool,
    #[serde(rename = "allowTradeInCredit")]
    pub allow_trade_in_credit: bool,
    #[serde(rename = "applyNegativeEquityToBase")]
    pub apply_negative_equity_to_base: bool,
    #[serde(rename = "vehicleClassRates")]
    pub vehicle_class_rates: Option<HashMap<String, f64>>,
}

/// South Carolina Tax Cap Configuration
///
/// SC caps vehicle sales tax at a maximum amount ($500) regardless of purchase price.
/// This is one of the most favorable vehicle tax schemes in the US for expensive vehicles.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SouthCarolinaCapConfig {
    /// Maximum tax amount (typically $500)
    #[serde(rename = "capAmount")]
    pub cap_amount: f64,
    /// State rate used to calculate tax before cap
    #[serde(rename = "stateRate")]
    pub state_rate: f64,
    /// Whether trade-in credit applies before cap calculation
    #[serde(rename = "allowTradeInCredit")]
    pub allow_trade_in_credit: bool,
    /// Applies to leases as well
    #[serde(rename = "appliesToLeases")]
    pub applies_to_leases: bool,
}

/// Local Jurisdiction Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalJurisdictionConfig {
    pub rate: Option<f64>,
    #[serde(rename = "baseRate")]
    pub base_rate: Option<f64>,
    #[serde(rename = "countyRate")]
    pub county_rate: Option<f64>,
    #[serde(rename = "cityRate")]
    pub city_rate: Option<f64>,
    #[serde(rename = "specialRate")]
    pub special_rate: Option<f64>,
    #[serde(rename = "effectiveRate")]
    pub effective_rate: Option<f64>,
    #[serde(rename = "maxPassOnRate")]
    pub max_pass_on_rate: Option<f64>,
    #[serde(rename = "countySurcharge")]
    pub county_surcharge: Option<f64>,
    #[serde(rename = "allowTradeInCredit")]
    pub allow_trade_in_credit: Option<bool>,
}

/// Major Jurisdiction Rate Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MajorJurisdictionRate {
    pub state: Option<f64>,
    pub local: Option<f64>,
    pub total: Option<f64>,
    pub county: Option<f64>,
    pub city: Option<f64>,
}

/// Lease-Specific Extra Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseExtrasConfig {
    #[serde(rename = "leasePriceFormula")]
    pub lease_price_formula: Option<String>,
    #[serde(rename = "tradeInAddsToLeasePrice")]
    pub trade_in_adds_to_lease_price: Option<bool>,
    #[serde(rename = "tradeInReducesBase")]
    pub trade_in_reduces_base: Option<bool>,
    #[serde(rename = "flatFee")]
    pub flat_fee: Option<f64>,
    #[serde(rename = "baseRate")]
    pub base_rate: Option<f64>,
    #[serde(rename = "excludedFromBase")]
    pub excluded_from_base: Option<Vec<String>>,
    #[serde(rename = "includedInBase")]
    pub included_in_base: Option<Vec<String>>,
}

/// County Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountyConfig {
    pub rate: Option<f64>,
    #[serde(rename = "effectiveRate")]
    pub effective_rate: Option<f64>,
    pub surcharge: Option<f64>,
}

/// Local Tax Range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalTaxRange {
    pub min: f64,
    pub max: f64,
}

/// Doc Fee Cap Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum DocFeeCap {
    Amount(f64),
    Text(String),
    Complex {
        #[serde(rename = "withIntegrator")]
        with_integrator: Option<f64>,
        #[serde(rename = "withoutIntegrator")]
        without_integrator: Option<f64>,
        notes: Option<String>,
    },
}

/// State-Specific Extra Configurations
///
/// Allows states with unique tax systems (TAVT, HUT, Privilege Tax, etc.) to
/// provide additional configuration beyond the standard DSL.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StateExtras {
    // Special tax scheme configs
    #[serde(rename = "gaTAVT")]
    pub ga_tavt: Option<GeorgiaTAVTConfig>,
    #[serde(rename = "ncHUT")]
    pub nc_hut: Option<NorthCarolinaHUTConfig>,
    #[serde(rename = "wvPrivilege")]
    pub wv_privilege: Option<WestVirginiaPrivilegeConfig>,
    #[serde(rename = "scCap")]
    pub sc_cap: Option<SouthCarolinaCapConfig>,

    // Rate ranges
    #[serde(rename = "localTaxRange")]
    pub local_tax_range: Option<LocalTaxRange>,
    #[serde(rename = "localRateRange")]
    pub local_rate_range: Option<LocalTaxRange>,
    #[serde(rename = "combinedRateRange")]
    pub combined_rate_range: Option<LocalTaxRange>,

    // Jurisdiction data
    #[serde(rename = "localJurisdictions")]
    pub local_jurisdictions: Option<HashMap<String, LocalJurisdictionConfig>>,
    #[serde(rename = "majorJurisdictions")]
    pub major_jurisdictions: Option<HashMap<String, MajorJurisdictionRate>>,
    pub counties: Option<HashMap<String, CountyConfig>>,
    #[serde(rename = "jurisdictionCount")]
    pub jurisdiction_count: Option<u32>,

    // State tax rates
    #[serde(rename = "stateAutomotiveSalesRate")]
    pub state_automotive_sales_rate: Option<f64>,
    #[serde(rename = "stateAutomotiveLeaseRate")]
    pub state_automotive_lease_rate: Option<f64>,
    #[serde(rename = "stateGeneralSalesRate")]
    pub state_general_sales_rate: Option<f64>,
    #[serde(rename = "stateGeneralRentalRate")]
    pub state_general_rental_rate: Option<f64>,
    #[serde(rename = "baseRate")]
    pub base_rate: Option<f64>,
    #[serde(rename = "effectiveRate")]
    pub effective_rate: Option<f64>,
    #[serde(rename = "maxPassOnRate")]
    pub max_pass_on_rate: Option<f64>,

    // Fee information
    #[serde(rename = "avgDocFee")]
    pub avg_doc_fee: Option<f64>,
    #[serde(rename = "docFeeCap")]
    pub doc_fee_cap: Option<DocFeeCap>,
    #[serde(rename = "titleFee")]
    pub title_fee: Option<f64>,

    // Lease-specific extras
    #[serde(rename = "leaseRules")]
    pub lease_rules: Option<LeaseExtrasConfig>,

    // Exemption and credit info
    #[serde(rename = "allowTradeInCredit")]
    pub allow_trade_in_credit: Option<bool>,
    #[serde(rename = "tradeInMethod")]
    pub trade_in_method: Option<String>,
    #[serde(rename = "useTax")]
    pub use_tax: Option<bool>,

    // Metadata
    #[serde(rename = "lastUpdated")]
    pub last_updated: Option<String>,
    pub sources: Option<Vec<String>>,
    pub notes: Option<String>,

    // Drive-out provision (AL, etc.)
    #[serde(rename = "driveOutProvisionEffectiveDate")]
    pub drive_out_provision_effective_date: Option<String>,
    #[serde(rename = "driveOutRemovalWindow")]
    pub drive_out_removal_window: Option<String>,
}

// ============================================================================
// Complete State Configuration
// ============================================================================

/// Complete state tax rules configuration
///
/// This is THE main configuration struct for each state.
/// Contains all rules for retail and lease taxation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxRulesConfig {
    #[serde(rename = "stateCode")]
    pub state_code: String,
    pub version: u32,

    // Retail side
    #[serde(rename = "tradeInPolicy")]
    pub trade_in_policy: TradeInPolicy,
    pub rebates: Vec<RebateRule>,
    #[serde(rename = "docFeeTaxable")]
    pub doc_fee_taxable: bool,
    #[serde(rename = "feeTaxRules")]
    pub fee_tax_rules: Vec<FeeTaxRule>,
    #[serde(rename = "taxOnAccessories")]
    pub tax_on_accessories: bool,
    #[serde(rename = "taxOnNegativeEquity")]
    pub tax_on_negative_equity: bool,
    #[serde(rename = "taxOnServiceContracts")]
    pub tax_on_service_contracts: bool,
    #[serde(rename = "taxOnGap")]
    pub tax_on_gap: bool,
    #[serde(rename = "vehicleTaxScheme")]
    pub vehicle_tax_scheme: VehicleTaxScheme,
    #[serde(rename = "vehicleUsesLocalSalesTax")]
    pub vehicle_uses_local_sales_tax: bool,

    // Lease side
    #[serde(rename = "leaseRules")]
    pub lease_rules: LeaseTaxRules,

    // Reciprocity (cross-state tax credit)
    pub reciprocity: ReciprocityRules,

    // State-specific extras
    pub extras: Option<StateExtras>,
}

// ============================================================================
// State Resolver & Multi-State Context
// ============================================================================

/// Tax Context: Describes which states are involved in a deal
///
/// In multi-state transactions, we need to know:
/// - primaryStateCode: Which state's tax rules to apply
/// - dealerStateCode: Where the dealer is located
/// - buyerResidenceStateCode: Where the buyer lives
/// - registrationStateCode: Where the vehicle will be titled/registered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxContext {
    #[serde(rename = "primaryStateCode")]
    pub primary_state_code: String,
    #[serde(rename = "dealerStateCode")]
    pub dealer_state_code: String,
    #[serde(rename = "buyerResidenceStateCode")]
    pub buyer_residence_state_code: Option<String>,
    #[serde(rename = "registrationStateCode")]
    pub registration_state_code: Option<String>,
}

/// Rooftop Configuration: Dealer-specific tax perspective settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RooftopConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "dealerStateCode")]
    pub dealer_state_code: String,
    #[serde(rename = "defaultTaxPerspective")]
    pub default_tax_perspective: TaxPerspective,
    #[serde(rename = "allowedRegistrationStates")]
    pub allowed_registration_states: Vec<String>,
    #[serde(rename = "stateOverrides")]
    pub state_overrides: Option<HashMap<String, StateOverride>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaxPerspective {
    DealerState,
    BuyerState,
    RegistrationState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateOverride {
    #[serde(rename = "forcePrimary")]
    pub force_primary: Option<bool>,
    #[serde(rename = "disallowPrimary")]
    pub disallow_primary: Option<bool>,
}

/// Deal Party Info: Extracted from deal for state resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealPartyInfo {
    #[serde(rename = "buyerResidenceState")]
    pub buyer_residence_state: Option<String>,
    #[serde(rename = "registrationState")]
    pub registration_state: Option<String>,
    #[serde(rename = "vehicleLocationState")]
    pub vehicle_location_state: Option<String>,
    #[serde(rename = "deliveryState")]
    pub delivery_state: Option<String>,
}

// ============================================================================
// Tax Calculation Input/Output
// ============================================================================

/// Deal type (retail purchase or lease)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DealType {
    Retail,
    Lease,
}

/// Tax rate component (label + rate)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxRateComponent {
    pub label: String, // "STATE", "COUNTY", "CITY", "DISTRICT_1", etc.
    pub rate: f64,     // 0.065 = 6.5%
}

/// Origin tax info for reciprocity calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OriginTaxInfo {
    #[serde(rename = "stateCode")]
    pub state_code: String,
    pub amount: f64,
    #[serde(rename = "effectiveRate")]
    pub effective_rate: Option<f64>,
    #[serde(rename = "taxPaidDate")]
    pub tax_paid_date: Option<String>, // ISO date
}

/// Other fee in a deal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtherFee {
    pub code: String,
    pub amount: f64,
}

/// Complete tax calculation input (base fields for both retail and lease)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationInput {
    #[serde(rename = "stateCode")]
    pub state_code: String,
    #[serde(rename = "asOfDate")]
    pub as_of_date: String, // ISO date
    #[serde(rename = "dealType")]
    pub deal_type: DealType,

    // Reciprocity fields
    #[serde(rename = "homeStateCode")]
    pub home_state_code: Option<String>,
    #[serde(rename = "registrationStateCode")]
    pub registration_state_code: Option<String>,
    #[serde(rename = "originTaxInfo")]
    pub origin_tax_info: Option<OriginTaxInfo>,

    // Customer & vehicle classification
    #[serde(rename = "customerIsNewResident")]
    pub customer_is_new_resident: Option<bool>,
    #[serde(rename = "vehicleClass")]
    pub vehicle_class: Option<String>,
    pub gvw: Option<u32>, // Gross Vehicle Weight

    // Pricing
    #[serde(rename = "vehiclePrice")]
    pub vehicle_price: f64,
    #[serde(rename = "accessoriesAmount")]
    pub accessories_amount: f64,
    #[serde(rename = "tradeInValue")]
    pub trade_in_value: f64,
    #[serde(rename = "rebateManufacturer")]
    pub rebate_manufacturer: f64,
    #[serde(rename = "rebateDealer")]
    pub rebate_dealer: f64,
    #[serde(rename = "docFee")]
    pub doc_fee: f64,
    #[serde(rename = "otherFees")]
    pub other_fees: Vec<OtherFee>,
    #[serde(rename = "serviceContracts")]
    pub service_contracts: f64,
    pub gap: f64,
    #[serde(rename = "negativeEquity")]
    pub negative_equity: f64,
    #[serde(rename = "taxAlreadyCollected")]
    pub tax_already_collected: f64,

    // Tax rates to apply
    pub rates: Vec<TaxRateComponent>,

    // Lease-specific fields (only used when dealType == LEASE)
    #[serde(rename = "grossCapCost")]
    pub gross_cap_cost: Option<f64>,
    #[serde(rename = "capReductionCash")]
    pub cap_reduction_cash: Option<f64>,
    #[serde(rename = "capReductionTradeIn")]
    pub cap_reduction_trade_in: Option<f64>,
    #[serde(rename = "capReductionRebateManufacturer")]
    pub cap_reduction_rebate_manufacturer: Option<f64>,
    #[serde(rename = "capReductionRebateDealer")]
    pub cap_reduction_rebate_dealer: Option<f64>,
    #[serde(rename = "basePayment")]
    pub base_payment: Option<f64>,
    #[serde(rename = "paymentCount")]
    pub payment_count: Option<u32>,
}

/// Tax base breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBaseBreakdown {
    #[serde(rename = "vehicleBase")]
    pub vehicle_base: f64,
    #[serde(rename = "feesBase")]
    pub fees_base: f64,
    #[serde(rename = "productsBase")]
    pub products_base: f64,
    #[serde(rename = "totalTaxableBase")]
    pub total_taxable_base: f64,
}

/// Component tax (individual rate × base)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTax {
    pub label: String,
    pub rate: f64,
    pub amount: f64,
}

/// Tax amount breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxAmountBreakdown {
    #[serde(rename = "componentTaxes")]
    pub component_taxes: Vec<ComponentTax>,
    #[serde(rename = "totalTax")]
    pub total_tax: f64,
}

/// Lease tax breakdown (upfront + monthly)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseTaxBreakdown {
    #[serde(rename = "upfrontTaxableBase")]
    pub upfront_taxable_base: f64,
    #[serde(rename = "upfrontTaxes")]
    pub upfront_taxes: TaxAmountBreakdown,
    #[serde(rename = "paymentTaxableBasePerPeriod")]
    pub payment_taxable_base_per_period: f64,
    #[serde(rename = "paymentTaxesPerPeriod")]
    pub payment_taxes_per_period: TaxAmountBreakdown,
    #[serde(rename = "totalTaxOverTerm")]
    pub total_tax_over_term: f64,
}

/// Debug/audit info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoTaxDebug {
    #[serde(rename = "appliedTradeIn")]
    pub applied_trade_in: f64,
    #[serde(rename = "appliedRebatesNonTaxable")]
    pub applied_rebates_non_taxable: f64,
    #[serde(rename = "appliedRebatesTaxable")]
    pub applied_rebates_taxable: f64,
    #[serde(rename = "taxableDocFee")]
    pub taxable_doc_fee: f64,
    #[serde(rename = "taxableFees")]
    pub taxable_fees: Vec<OtherFee>,
    #[serde(rename = "taxableServiceContracts")]
    pub taxable_service_contracts: f64,
    #[serde(rename = "taxableGap")]
    pub taxable_gap: f64,
    #[serde(rename = "reciprocityCredit")]
    pub reciprocity_credit: f64,
    pub notes: Vec<String>,
}

/// Complete tax calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationResult {
    pub mode: DealType,
    pub bases: TaxBaseBreakdown,
    pub taxes: TaxAmountBreakdown,
    #[serde(rename = "leaseBreakdown")]
    pub lease_breakdown: Option<LeaseTaxBreakdown>,
    pub debug: AutoTaxDebug,
}

// ============================================================================
// Legacy Simple Result (for backwards compatibility)
// ============================================================================

/// Simple tax calculation result (legacy API)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleTaxResult {
    #[serde(rename = "stateTax")]
    pub state_tax: f64,
    #[serde(rename = "localTax")]
    pub local_tax: f64,
    #[serde(rename = "totalTax")]
    pub total_tax: f64,
    #[serde(rename = "taxableAmount")]
    pub taxable_amount: f64,
    #[serde(rename = "effectiveRate")]
    pub effective_rate: f64,
}
