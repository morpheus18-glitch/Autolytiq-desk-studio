//! State Tax Rules Loader (DEPRECATED - USE JSON BUNDLE)
//!
//! ⚠️ DEPRECATION NOTICE ⚠️
//!
//! This module contains hardcoded Rust implementations that are DUPLICATES of
//! the authoritative TypeScript rules. DO NOT modify these rules directly.
//!
//! # Single Source of Truth
//!
//! The TypeScript rules in `/shared/autoTaxEngine/rules/` are the ONLY source
//! of truth. This module exists only as a fallback when no JSON bundle is loaded.
//!
//! # Correct Workflow
//!
//! 1. Edit rules in `/shared/autoTaxEngine/rules/US_*.ts` (TypeScript)
//! 2. Run `npx tsx scripts/export-tax-rules.ts` to generate JSON bundle
//! 3. Load the JSON bundle via `initialize_state_rules()` in WASM
//!
//! # Production Usage
//!
//! Always call `initialize_state_rules(bundleJson)` before any calculations
//! to load rules from the JSON bundle. Use `get_state_rules_v2()` which
//! prefers the JSON bundle over these compiled defaults.
//!
//! # Why This Module Still Exists
//!
//! - Provides fallback for development/testing without bundle
//! - Maintains backward compatibility with existing code
//! - Will be removed in future version once all clients use JSON bundle

use crate::types::*;
use std::collections::HashMap;

// ============================================================================
// State Rules Registry
// ============================================================================

/// Load all state rules into a HashMap
pub fn load_all_state_rules() -> HashMap<String, TaxRulesConfig> {
    let mut rules = HashMap::new();

    // Add each state's rules
    // We'll add more states as we convert them from TypeScript

    // States with unique tax systems
    if let Some(r) = load_indiana_rules() { rules.insert("IN".to_string(), r); }
    if let Some(r) = load_texas_rules() { rules.insert("TX".to_string(), r); }
    if let Some(r) = load_california_rules() { rules.insert("CA".to_string(), r); }
    if let Some(r) = load_florida_rules() { rules.insert("FL".to_string(), r); }
    if let Some(r) = load_georgia_rules() { rules.insert("GA".to_string(), r); }  // TAVT
    if let Some(r) = load_north_carolina_rules() { rules.insert("NC".to_string(), r); }  // HUT
    if let Some(r) = load_michigan_rules() { rules.insert("MI".to_string(), r); }  // Capped trade-in
    if let Some(r) = load_new_york_rules() { rules.insert("NY".to_string(), r); }
    if let Some(r) = load_ohio_rules() { rules.insert("OH".to_string(), r); }
    if let Some(r) = load_illinois_rules() { rules.insert("IL".to_string(), r); }
    if let Some(r) = load_pennsylvania_rules() { rules.insert("PA".to_string(), r); }
    if let Some(r) = load_arizona_rules() { rules.insert("AZ".to_string(), r); }
    if let Some(r) = load_colorado_rules() { rules.insert("CO".to_string(), r); }
    if let Some(r) = load_new_jersey_rules() { rules.insert("NJ".to_string(), r); }
    if let Some(r) = load_virginia_rules() { rules.insert("VA".to_string(), r); }
    if let Some(r) = load_west_virginia_rules() { rules.insert("WV".to_string(), r); }  // Privilege Tax
    if let Some(r) = load_maryland_rules() { rules.insert("MD".to_string(), r); }
    if let Some(r) = load_tennessee_rules() { rules.insert("TN".to_string(), r); }
    if let Some(r) = load_kentucky_rules() { rules.insert("KY".to_string(), r); }
    if let Some(r) = load_alabama_rules() { rules.insert("AL".to_string(), r); }
    if let Some(r) = load_south_carolina_rules() { rules.insert("SC".to_string(), r); }
    if let Some(r) = load_missouri_rules() { rules.insert("MO".to_string(), r); }
    if let Some(r) = load_wisconsin_rules() { rules.insert("WI".to_string(), r); }
    if let Some(r) = load_minnesota_rules() { rules.insert("MN".to_string(), r); }
    if let Some(r) = load_iowa_rules() { rules.insert("IA".to_string(), r); }
    if let Some(r) = load_arkansas_rules() { rules.insert("AR".to_string(), r); }
    if let Some(r) = load_louisiana_rules() { rules.insert("LA".to_string(), r); }
    if let Some(r) = load_oklahoma_rules() { rules.insert("OK".to_string(), r); }
    if let Some(r) = load_kansas_rules() { rules.insert("KS".to_string(), r); }
    if let Some(r) = load_nebraska_rules() { rules.insert("NE".to_string(), r); }
    if let Some(r) = load_washington_rules() { rules.insert("WA".to_string(), r); }
    if let Some(r) = load_nevada_rules() { rules.insert("NV".to_string(), r); }
    if let Some(r) = load_utah_rules() { rules.insert("UT".to_string(), r); }
    if let Some(r) = load_new_mexico_rules() { rules.insert("NM".to_string(), r); }
    if let Some(r) = load_idaho_rules() { rules.insert("ID".to_string(), r); }
    if let Some(r) = load_hawaii_rules() { rules.insert("HI".to_string(), r); }
    if let Some(r) = load_maine_rules() { rules.insert("ME".to_string(), r); }
    if let Some(r) = load_vermont_rules() { rules.insert("VT".to_string(), r); }
    if let Some(r) = load_new_hampshire_rules() { rules.insert("NH".to_string(), r); }  // No sales tax
    if let Some(r) = load_massachusetts_rules() { rules.insert("MA".to_string(), r); }
    if let Some(r) = load_connecticut_rules() { rules.insert("CT".to_string(), r); }
    if let Some(r) = load_rhode_island_rules() { rules.insert("RI".to_string(), r); }
    if let Some(r) = load_delaware_rules() { rules.insert("DE".to_string(), r); }  // No sales tax
    if let Some(r) = load_montana_rules() { rules.insert("MT".to_string(), r); }  // No sales tax
    if let Some(r) = load_oregon_rules() { rules.insert("OR".to_string(), r); }  // No sales tax
    if let Some(r) = load_alaska_rules() { rules.insert("AK".to_string(), r); }  // Local only
    if let Some(r) = load_wyoming_rules() { rules.insert("WY".to_string(), r); }
    if let Some(r) = load_north_dakota_rules() { rules.insert("ND".to_string(), r); }
    if let Some(r) = load_south_dakota_rules() { rules.insert("SD".to_string(), r); }
    if let Some(r) = load_mississippi_rules() { rules.insert("MS".to_string(), r); }
    if let Some(r) = load_dc_rules() { rules.insert("DC".to_string(), r); }

    rules
}

/// Get rules for a specific state
#[cfg(not(target_arch = "wasm32"))]
pub fn get_state_rules(state_code: &str) -> Option<TaxRulesConfig> {
    let all_rules = load_all_state_rules();
    all_rules.get(state_code).cloned()
}

// ============================================================================
// Default Builders
// ============================================================================

fn default_lease_rules() -> LeaseTaxRules {
    LeaseTaxRules {
        method: LeaseMethod::Monthly,
        tax_cap_reduction: false,
        rebate_behavior: LeaseRebateBehavior::FollowRetailRule,
        doc_fee_taxability: LeaseDocFeeTaxability::FollowRetailRule,
        trade_in_credit: LeaseTradeInCreditMode::FollowRetailRule,
        negative_equity_taxable: false,
        fee_tax_rules: vec![],
        title_fee_rules: vec![],
        tax_fees_upfront: true,
        special_scheme: LeaseSpecialScheme::None,
        notes: None,
    }
}

fn default_reciprocity() -> ReciprocityRules {
    ReciprocityRules {
        enabled: false,
        scope: ReciprocityScope::None,
        home_state_behavior: ReciprocityMode::None,
        require_proof_of_tax_paid: false,
        basis: ReciprocityBasis::TaxPaid,
        cap_at_this_states_tax: true,
        has_lease_exception: false,
        overrides: None,
        exempt_states: None,
        non_reciprocal_states: None,
        notes: None,
    }
}

// ============================================================================
// State Implementations
// ============================================================================

/// Indiana - 7% state-only, full trade-in credit, monthly lease tax
fn load_indiana_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "IN".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full {
            notes: Some("Full trade-in credit allowed".to_string()),
        },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: Some("Manufacturer rebates reduce taxable base".to_string()),
            },
        ],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            special_scheme: LeaseSpecialScheme::None,
            notes: Some("Indiana taxes lease payments monthly at 7%".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            notes: Some("Credit for tax paid to other states".to_string()),
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.07),
            ..Default::default()
        }),
    })
}

/// Texas - 6.25% state + up to 2% local, full trade-in credit
fn load_texas_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "TX".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full {
            notes: Some("Full trade-in credit allowed".to_string()),
        },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            special_scheme: LeaseSpecialScheme::TxLeaseSpecial,
            notes: Some("Texas motor vehicle sales tax on leases".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            notes: Some("Credit for tax paid elsewhere, capped at TX rate".to_string()),
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0625),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.02 }),
            combined_rate_range: Some(LocalTaxRange { min: 0.0625, max: 0.0825 }),
            ..Default::default()
        }),
    })
}

/// California - 7.25% state + local (varies), complex jurisdiction system
fn load_california_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "CA".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full {
            notes: Some("Full trade-in credit".to_string()),
        },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: false,
        fee_tax_rules: vec![
            FeeTaxRule { code: "SMOG".to_string(), taxable: false, notes: None },
        ],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            special_scheme: LeaseSpecialScheme::None,
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0725),
            local_tax_range: Some(LocalTaxRange { min: 0.0125, max: 0.035 }),
            combined_rate_range: Some(LocalTaxRange { min: 0.0775, max: 0.1075 }),
            jurisdiction_count: Some(400),
            notes: Some("California has ~400 distinct tax jurisdictions".to_string()),
            ..Default::default()
        }),
    })
}

/// Florida - 6% state + local, doc fee taxable
fn load_florida_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "FL".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.015 }),
            ..Default::default()
        }),
    })
}

/// Georgia - TAVT (Title Ad Valorem Tax) instead of sales tax
fn load_georgia_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "GA".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full {
            notes: Some("Trade-in credit applies to TAVT calculation".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::SpecialTavt,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::FullUpfront,
            special_scheme: LeaseSpecialScheme::GaTavt,
            notes: Some("TAVT calculated on fair market value at lease inception".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: false,
            notes: Some("TAVT is a title tax, not sales tax - different reciprocity rules".to_string()),
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            ga_tavt: Some(GeorgiaTAVTConfig {
                default_rate: 0.07,
                use_assessed_value: true,
                use_higher_of_price_or_assessed: false,
                allow_trade_in_credit: true,
                trade_in_applies_to: TAVTTradeInApplication::VehicleOnly,
                apply_negative_equity_to_base: false,
                lease_base_mode: TAVTLeaseBaseMode::AgreedValue,
            }),
            notes: Some("Georgia TAVT replaced traditional sales tax in 2013".to_string()),
            ..Default::default()
        }),
    })
}

/// North Carolina - Highway Use Tax (HUT) instead of sales tax
fn load_north_carolina_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NC".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: false,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::SpecialHut,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::FullUpfront,
            notes: Some("HUT collected upfront on lease".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::RetailOnly,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            notes: Some("Credit within 90 days of purchase".to_string()),
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            nc_hut: Some(NorthCarolinaHUTConfig {
                base_rate: 0.03,
                use_highway_use_tax: true,
                include_trade_in_reduction: true,
                apply_to_net_price_only: true,
                max_reciprocity_age_days: 90,
            }),
            notes: Some("NC Highway Use Tax: 3% on retail price less trade-in".to_string()),
            ..Default::default()
        }),
    })
}

/// Michigan - 6% state only, CAPPED trade-in credit ($6000 for 2025)
fn load_michigan_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MI".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Capped {
            cap_amount: 6000.0,
            notes: Some("Michigan caps trade-in credit at $6,000 for 2025; increases $1,000/year until fully removed in 2026".to_string()),
        },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            trade_in_credit: LeaseTradeInCreditMode::Full, // No cap on lease
            notes: Some("6% on each payment, trade-in fully reduces cap cost".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            notes: Some("Trade-in cap increases annually by $1000 until removed".to_string()),
            ..Default::default()
        }),
    })
}

/// New York - 4% state + local, MTR surcharge in NYC metro
fn load_new_york_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NY".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::FullUpfront,
            special_scheme: LeaseSpecialScheme::NyMtr,
            notes: Some("Full tax upfront; MCTD surcharge in metro area".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.04),
            local_tax_range: Some(LocalTaxRange { min: 0.03, max: 0.045 }),
            combined_rate_range: Some(LocalTaxRange { min: 0.07, max: 0.08875 }),
            notes: Some("NYC = 8.875%; MCTD adds 0.375% in metro".to_string()),
            ..Default::default()
        }),
    })
}

/// Ohio - 5.75% state + local, complex county system
fn load_ohio_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "OH".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0575),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.0225 }),
            combined_rate_range: Some(LocalTaxRange { min: 0.065, max: 0.08 }),
            notes: Some("88 counties with varying local rates".to_string()),
            ..Default::default()
        }),
    })
}

/// Illinois - 6.25% state + local, Chicago has special rules
fn load_illinois_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "IL".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            special_scheme: LeaseSpecialScheme::IlChicagoCook,
            notes: Some("Chicago/Cook County has additional lease taxes".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0625),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.05 }),
            notes: Some("Chicago can exceed 10% combined".to_string()),
            ..Default::default()
        }),
    })
}

/// Pennsylvania - 6% state + local, lease taxed monthly
fn load_pennsylvania_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "PA".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![
            RebateRule {
                applies_to: RebateType::Manufacturer,
                taxable: false,
                notes: None,
            },
        ],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::Monthly,
            special_scheme: LeaseSpecialScheme::PaLeaseTax,
            notes: Some("PA taxes lease payments, not full value upfront".to_string()),
            ..default_lease_rules()
        },
        reciprocity: ReciprocityRules {
            enabled: true,
            scope: ReciprocityScope::Both,
            home_state_behavior: ReciprocityMode::CreditUpToStateRate,
            ..default_reciprocity()
        },
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.02 }),
            notes: Some("Allegheny County 7%, Philadelphia 8%".to_string()),
            ..Default::default()
        }),
    })
}

// ============================================================================
// Remaining States (simplified implementations)
// ============================================================================

fn load_arizona_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "AZ".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.056),
            ..Default::default()
        }),
    })
}

fn load_colorado_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "CO".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            special_scheme: LeaseSpecialScheme::CoHomeRuleLease,
            notes: Some("Home-rule cities have complex lease rules".to_string()),
            ..default_lease_rules()
        },
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.029),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.075 }),
            notes: Some("Home-rule cities can exceed 10% combined".to_string()),
            ..Default::default()
        }),
    })
}

fn load_new_jersey_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NJ".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            method: LeaseMethod::FullUpfront,
            special_scheme: LeaseSpecialScheme::NjLuxury,
            notes: Some("0.4% additional tax on luxury vehicles over $45k".to_string()),
            ..default_lease_rules()
        },
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06625),
            ..Default::default()
        }),
    })
}

fn load_virginia_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "VA".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: LeaseTaxRules {
            special_scheme: LeaseSpecialScheme::VaUsage,
            notes: Some("VA usage tax applies to leases".to_string()),
            ..default_lease_rules()
        },
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0415),
            notes: Some("VA motor vehicle sales and use tax is 4.15% (4% state + 0.15% local)".to_string()),
            ..Default::default()
        }),
    })
}

fn load_west_virginia_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "WV".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::DmvPrivilegeTax,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            wv_privilege: Some(WestVirginiaPrivilegeConfig {
                base_rate: 0.06,
                use_assessed_value: true,
                use_higher_of_price_or_assessed: true,
                allow_trade_in_credit: true,
                apply_negative_equity_to_base: false,
                vehicle_class_rates: None,
            }),
            notes: Some("WV privilege tax increased to 6% effective July 1, 2021".to_string()),
            ..Default::default()
        }),
    })
}

fn load_maryland_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MD".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: LeaseTaxRules {
            special_scheme: LeaseSpecialScheme::MdUpfrontGain,
            ..default_lease_rules()
        },
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            ..Default::default()
        }),
    })
}

fn load_tennessee_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "TN".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.07),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.0275 }),
            ..Default::default()
        }),
    })
}

fn load_kentucky_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "KY".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            ..Default::default()
        }),
    })
}

fn load_alabama_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "AL".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.02),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.075 }),
            notes: Some("Low state rate but high local rates".to_string()),
            ..Default::default()
        }),
    })
}

fn load_south_carolina_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "SC".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::SpecialCap,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            sc_cap: Some(SouthCarolinaCapConfig {
                cap_amount: 500.0,
                state_rate: 0.05,
                allow_trade_in_credit: true,
                applies_to_leases: true,
            }),
            notes: Some("SC caps vehicle sales tax at $500 max regardless of purchase price".to_string()),
            ..Default::default()
        }),
    })
}

fn load_missouri_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MO".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.04225),
            ..Default::default()
        }),
    })
}

fn load_wisconsin_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "WI".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            ..Default::default()
        }),
    })
}

fn load_minnesota_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MN".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06875),
            ..Default::default()
        }),
    })
}

fn load_iowa_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "IA".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            ..Default::default()
        }),
    })
}

fn load_arkansas_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "AR".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.065),
            ..Default::default()
        }),
    })
}

fn load_louisiana_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "LA".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.07 }),
            notes: Some("LA state rate increased to 5% effective July 2025; highest combined rates in US".to_string()),
            ..Default::default()
        }),
    })
}

fn load_oklahoma_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "OK".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.045),
            notes: Some("OK motor vehicle excise tax is 4.5% state only; local sales tax does not apply to titled vehicles".to_string()),
            ..Default::default()
        }),
    })
}

fn load_kansas_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "KS".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.065),
            ..Default::default()
        }),
    })
}

fn load_nebraska_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NE".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.055),
            ..Default::default()
        }),
    })
}

fn load_washington_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "WA".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("Washington does not allow trade-in credit; tax applies to full purchase price".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.065),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.04 }),
            notes: Some("Seattle area can exceed 10%".to_string()),
            ..Default::default()
        }),
    })
}

fn load_nevada_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NV".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0685),
            ..Default::default()
        }),
    })
}

fn load_utah_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "UT".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0485),
            ..Default::default()
        }),
    })
}

fn load_new_mexico_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NM".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            notes: Some("NM uses Gross Receipts Tax (GRT) at 5.0% state rate; motor vehicles taxable at point of sale".to_string()),
            ..Default::default()
        }),
    })
}

fn load_idaho_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "ID".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            ..Default::default()
        }),
    })
}

fn load_hawaii_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "HI".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("Hawaii GET does not allow trade-in credit; tax applies to full sale price".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.04),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.005 }),
            notes: Some("Hawaii uses GET (General Excise Tax), not traditional sales tax; county surcharge up to 0.5%".to_string()),
            ..Default::default()
        }),
    })
}

fn load_maine_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "ME".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.055),
            ..Default::default()
        }),
    })
}

fn load_vermont_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "VT".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            ..Default::default()
        }),
    })
}

// ============================================================================
// No Sales Tax States
// ============================================================================

fn load_new_hampshire_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "NH".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("No sales tax in NH".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: false,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0),
            notes: Some("New Hampshire has no sales tax".to_string()),
            ..Default::default()
        }),
    })
}

fn load_delaware_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "DE".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("No sales tax in DE".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: false,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0),
            notes: Some("Delaware has no sales tax. Doc fee of 4.25% applies.".to_string()),
            ..Default::default()
        }),
    })
}

fn load_montana_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MT".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("No sales tax in MT".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: false,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0),
            notes: Some("Montana has no sales tax".to_string()),
            ..Default::default()
        }),
    })
}

fn load_oregon_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "OR".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::None {
            notes: Some("No sales tax in OR".to_string()),
        },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: false,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0),
            notes: Some("Oregon has no sales tax. Vehicle privilege tax applies.".to_string()),
            ..Default::default()
        }),
    })
}

fn load_alaska_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "AK".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: false,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::LocalOnly,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0),
            local_tax_range: Some(LocalTaxRange { min: 0.0, max: 0.075 }),
            notes: Some("No state sales tax; local jurisdictions may tax".to_string()),
            ..Default::default()
        }),
    })
}

// ============================================================================
// Remaining States
// ============================================================================

fn load_wyoming_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "WY".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.04),
            ..Default::default()
        }),
    })
}

fn load_north_dakota_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "ND".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            ..Default::default()
        }),
    })
}

fn load_south_dakota_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "SD".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StatePlusLocal,
        vehicle_uses_local_sales_tax: true,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.045),
            ..Default::default()
        }),
    })
}

fn load_mississippi_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MS".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.05),
            notes: Some("MS has 5% state tax on motor vehicles".to_string()),
            ..Default::default()
        }),
    })
}

fn load_massachusetts_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "MA".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0625),
            ..Default::default()
        }),
    })
}

fn load_connecticut_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "CT".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.0635),
            ..Default::default()
        }),
    })
}

fn load_rhode_island_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "RI".to_string(),
        version: 2,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: false,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly,
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.07),
            notes: Some("RI exempts service contracts/extended warranties from sales tax".to_string()),
            ..Default::default()
        }),
    })
}

fn load_dc_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "DC".to_string(),
        version: 1,
        trade_in_policy: TradeInPolicy::Full { notes: None },
        rebates: vec![],
        doc_fee_taxable: true,
        fee_tax_rules: vec![],
        tax_on_accessories: true,
        tax_on_negative_equity: false,
        tax_on_service_contracts: true,
        tax_on_gap: false,
        vehicle_tax_scheme: VehicleTaxScheme::StateOnly, // DC is like a state
        vehicle_uses_local_sales_tax: false,
        lease_rules: default_lease_rules(),
        reciprocity: default_reciprocity(),
        extras: Some(StateExtras {
            state_automotive_sales_rate: Some(0.06),
            notes: Some("DC excise tax on vehicle purchases".to_string()),
            ..Default::default()
        }),
    })
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_all_states() {
        let rules = load_all_state_rules();
        // All 50 states + DC = 51
        assert!(rules.len() >= 51, "Expected 51 state rules, got {}", rules.len());
    }

    #[test]
    fn test_indiana_rules() {
        let rules = load_indiana_rules();
        assert!(rules.is_some());
        let rules = rules.unwrap();
        assert_eq!(rules.state_code, "IN");
        assert!(matches!(rules.vehicle_tax_scheme, VehicleTaxScheme::StateOnly));
        assert!(matches!(rules.trade_in_policy, TradeInPolicy::Full { .. }));
    }

    #[test]
    fn test_michigan_capped_trade_in() {
        let rules = load_michigan_rules();
        assert!(rules.is_some());
        let rules = rules.unwrap();
        // MI trade-in cap increased to $6000 for 2025 (was $3000, increases $1000/year until removed in 2026)
        assert!(matches!(rules.trade_in_policy, TradeInPolicy::Capped { cap_amount, .. } if cap_amount == 6000.0));
    }

    #[test]
    fn test_georgia_tavt() {
        let rules = load_georgia_rules();
        assert!(rules.is_some());
        let rules = rules.unwrap();
        assert!(matches!(rules.vehicle_tax_scheme, VehicleTaxScheme::SpecialTavt));
        assert!(rules.extras.is_some());
        let extras = rules.extras.unwrap();
        assert!(extras.ga_tavt.is_some());
    }

    #[test]
    fn test_no_sales_tax_states() {
        let no_tax_states = ["NH", "DE", "MT", "OR"];
        let rules = load_all_state_rules();

        for state in &no_tax_states {
            let state_rules = rules.get(*state);
            assert!(state_rules.is_some(), "{} should have rules", state);
            let state_rules = state_rules.unwrap();
            if let Some(extras) = &state_rules.extras {
                assert_eq!(
                    extras.state_automotive_sales_rate,
                    Some(0.0),
                    "{} should have 0% state rate",
                    state
                );
            }
        }
    }

    #[test]
    fn test_alaska_local_only() {
        let rules = load_alaska_rules();
        assert!(rules.is_some());
        let rules = rules.unwrap();
        assert!(matches!(rules.vehicle_tax_scheme, VehicleTaxScheme::LocalOnly));
    }
}
