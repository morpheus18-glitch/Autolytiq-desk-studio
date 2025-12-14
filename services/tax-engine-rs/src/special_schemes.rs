//! Special Tax Scheme Calculators
//!
//! Some states use unique vehicle tax systems instead of standard sales tax:
//! - Georgia: TAVT (Title Ad Valorem Tax) - one-time tax at titling
//! - North Carolina: HUT (Highway Use Tax) - state-only tax for highway use
//! - West Virginia: DMV Privilege Tax - registration-based privilege tax
//!
//! These special schemes have different base calculations, credit rules, and
//! often replace both sales tax and annual property tax.

use crate::types::*;

// ============================================================================
// Georgia TAVT (Title Ad Valorem Tax)
// ============================================================================

/// Georgia TAVT Calculation Result
#[derive(Debug, Clone)]
pub struct TAVTResult {
    /// Fair Market Value used (price or assessed value)
    pub fair_market_value: f64,
    /// Trade-in credit applied
    pub trade_in_credit: f64,
    /// Taxable base after credit
    pub taxable_base: f64,
    /// TAVT rate used (typically 6.6% or 7%)
    pub rate: f64,
    /// Calculated TAVT amount
    pub tavt_amount: f64,
    /// Notes about the calculation
    pub notes: Vec<String>,
}

/// Calculate Georgia TAVT
///
/// TAVT replaces both sales tax and annual ad valorem (property) tax.
/// Key rules:
/// - Base: Higher of purchase price or DOR fair market value (for used)
/// - Trade-in: Full credit allowed
/// - Rate: 6.6% for most, 7% for certain counties
/// - One-time: Paid at title transfer, no annual property tax
///
/// # Arguments
/// * `config` - GA TAVT configuration from state rules
/// * `purchase_price` - Actual vehicle purchase price
/// * `assessed_value` - DOR assessed fair market value (for used vehicles)
/// * `trade_in_value` - Trade-in vehicle value
/// * `is_new` - Whether vehicle is new (affects FMV determination)
pub fn calculate_ga_tavt(
    config: &GeorgiaTAVTConfig,
    purchase_price: f64,
    assessed_value: Option<f64>,
    trade_in_value: f64,
    is_new: bool,
) -> TAVTResult {
    let mut notes = Vec::new();

    // Step 1: Determine Fair Market Value (FMV)
    let fair_market_value = if is_new {
        // New vehicles: always use purchase price
        notes.push("New vehicle: using purchase price as FMV".to_string());
        purchase_price
    } else if config.use_higher_of_price_or_assessed {
        // Used vehicles: higher of price or assessed
        let assessed = assessed_value.unwrap_or(purchase_price);
        if assessed > purchase_price {
            notes.push(format!(
                "Using assessed value ${:.2} (higher than purchase price ${:.2})",
                assessed, purchase_price
            ));
            assessed
        } else {
            notes.push("Using purchase price (higher than or equal to assessed value)".to_string());
            purchase_price
        }
    } else if config.use_assessed_value {
        // Use assessed value if provided
        assessed_value.unwrap_or(purchase_price)
    } else {
        purchase_price
    };

    // Step 2: Apply trade-in credit
    let trade_in_credit = if config.allow_trade_in_credit {
        match config.trade_in_applies_to {
            TAVTTradeInApplication::Full => {
                notes.push("Full trade-in credit applied".to_string());
                trade_in_value
            }
            TAVTTradeInApplication::VehicleOnly => {
                notes.push("Trade-in credit limited to vehicle portion".to_string());
                trade_in_value
            }
        }
    } else {
        notes.push("Trade-in credit not allowed for TAVT".to_string());
        0.0
    };

    // Step 3: Calculate taxable base
    let taxable_base = (fair_market_value - trade_in_credit).max(0.0);

    // Step 4: Apply TAVT rate
    let tavt_amount = taxable_base * config.default_rate;

    notes.push(format!(
        "TAVT rate: {:.2}%",
        config.default_rate * 100.0
    ));

    TAVTResult {
        fair_market_value,
        trade_in_credit,
        taxable_base,
        rate: config.default_rate,
        tavt_amount,
        notes,
    }
}

/// Calculate GA TAVT for lease
///
/// Leases in Georgia still pay TAVT, but the base is typically the
/// agreed-upon value or cap cost, not the full vehicle price.
pub fn calculate_ga_tavt_lease(
    config: &GeorgiaTAVTConfig,
    agreed_value: f64,
    cap_cost: f64,
    trade_in_value: f64,
) -> TAVTResult {
    let mut notes = vec!["GA TAVT for lease".to_string()];

    // Determine base based on lease mode
    let fair_market_value = match config.lease_base_mode {
        TAVTLeaseBaseMode::AgreedValue => {
            notes.push("Using agreed value as TAVT base".to_string());
            agreed_value
        }
        TAVTLeaseBaseMode::CapCost => {
            notes.push("Using cap cost as TAVT base".to_string());
            cap_cost
        }
        TAVTLeaseBaseMode::Custom => {
            notes.push("Using agreed value (custom mode defaults)".to_string());
            agreed_value
        }
    };

    // Trade-in credit for leases
    let trade_in_credit = if config.allow_trade_in_credit {
        trade_in_value
    } else {
        0.0
    };

    let taxable_base = (fair_market_value - trade_in_credit).max(0.0);
    let tavt_amount = taxable_base * config.default_rate;

    TAVTResult {
        fair_market_value,
        trade_in_credit,
        taxable_base,
        rate: config.default_rate,
        tavt_amount,
        notes,
    }
}

// ============================================================================
// North Carolina HUT (Highway Use Tax)
// ============================================================================

/// NC Highway Use Tax Calculation Result
#[derive(Debug, Clone)]
pub struct HUTResult {
    /// Purchase price used
    pub purchase_price: f64,
    /// Trade-in reduction applied
    pub trade_in_reduction: f64,
    /// Taxable base
    pub taxable_base: f64,
    /// HUT rate (typically 3%)
    pub rate: f64,
    /// Maximum HUT (capped at certain amount)
    pub max_hut: Option<f64>,
    /// Calculated HUT amount (before cap)
    pub calculated_hut: f64,
    /// Final HUT amount (after any cap)
    pub final_hut: f64,
    /// Reciprocity credit applied
    pub reciprocity_credit: f64,
    /// Notes about the calculation
    pub notes: Vec<String>,
}

/// Calculate North Carolina Highway Use Tax
///
/// NC uses Highway Use Tax instead of general sales tax for vehicles:
/// - Rate: 3% (as of 2024)
/// - Base: Purchase price minus trade-in
/// - Cap: No maximum for standard vehicles
/// - Reciprocity: Credit for tax paid in other states
///
/// # Arguments
/// * `config` - NC HUT configuration
/// * `purchase_price` - Vehicle purchase price
/// * `trade_in_value` - Trade-in vehicle value
/// * `tax_paid_other_state` - Tax already paid in another state (for reciprocity)
/// * `days_since_tax_paid` - Days since original tax was paid
pub fn calculate_nc_hut(
    config: &NorthCarolinaHUTConfig,
    purchase_price: f64,
    trade_in_value: f64,
    tax_paid_other_state: f64,
    days_since_tax_paid: Option<u32>,
) -> HUTResult {
    let mut notes = vec!["NC Highway Use Tax calculation".to_string()];

    // Step 1: Determine taxable base
    let trade_in_reduction = if config.include_trade_in_reduction {
        notes.push("Trade-in reduction applied".to_string());
        trade_in_value
    } else {
        0.0
    };

    let taxable_base = if config.apply_to_net_price_only {
        (purchase_price - trade_in_reduction).max(0.0)
    } else {
        purchase_price
    };

    // Step 2: Calculate HUT
    let rate = config.base_rate;
    let calculated_hut = taxable_base * rate;

    notes.push(format!("HUT rate: {:.2}%", rate * 100.0));

    // Step 3: Apply any cap (NC doesn't typically cap, but config allows it)
    let final_hut_before_credit = calculated_hut; // No cap by default

    // Step 4: Check reciprocity credit
    let reciprocity_credit = if tax_paid_other_state > 0.0 {
        // Check age requirement
        if let Some(days) = days_since_tax_paid {
            if days > config.max_reciprocity_age_days {
                notes.push(format!(
                    "Reciprocity denied: {} days exceeds {} day limit",
                    days, config.max_reciprocity_age_days
                ));
                0.0
            } else {
                let credit = tax_paid_other_state.min(final_hut_before_credit);
                notes.push(format!(
                    "Reciprocity credit applied: ${:.2} (tax paid ${:.2})",
                    credit, tax_paid_other_state
                ));
                credit
            }
        } else {
            // No date provided, allow credit
            let credit = tax_paid_other_state.min(final_hut_before_credit);
            notes.push(format!("Reciprocity credit: ${:.2}", credit));
            credit
        }
    } else {
        0.0
    };

    let final_hut = (final_hut_before_credit - reciprocity_credit).max(0.0);

    HUTResult {
        purchase_price,
        trade_in_reduction,
        taxable_base,
        rate,
        max_hut: None,
        calculated_hut,
        final_hut,
        reciprocity_credit,
        notes,
    }
}

/// Calculate NC HUT for lease
///
/// Leases in NC are taxed differently - typically on the total lease payments
/// or the gross cap cost, depending on the structure.
pub fn calculate_nc_hut_lease(
    config: &NorthCarolinaHUTConfig,
    cap_cost: f64,
    trade_in_value: f64,
) -> HUTResult {
    let mut notes = vec!["NC HUT for lease".to_string()];

    let trade_in_reduction = if config.include_trade_in_reduction {
        trade_in_value
    } else {
        0.0
    };

    let taxable_base = (cap_cost - trade_in_reduction).max(0.0);
    let calculated_hut = taxable_base * config.base_rate;

    notes.push(format!("Lease HUT rate: {:.2}%", config.base_rate * 100.0));

    HUTResult {
        purchase_price: cap_cost,
        trade_in_reduction,
        taxable_base,
        rate: config.base_rate,
        max_hut: None,
        calculated_hut,
        final_hut: calculated_hut,
        reciprocity_credit: 0.0,
        notes,
    }
}

// ============================================================================
// West Virginia Privilege Tax
// ============================================================================

/// WV Privilege Tax Calculation Result
#[derive(Debug, Clone)]
pub struct PrivilegeTaxResult {
    /// Value used for calculation
    pub base_value: f64,
    /// Trade-in credit applied
    pub trade_in_credit: f64,
    /// Negative equity added (if applicable)
    pub negative_equity_added: f64,
    /// Taxable base
    pub taxable_base: f64,
    /// Privilege tax rate
    pub rate: f64,
    /// Vehicle class (affects rate)
    pub vehicle_class: Option<String>,
    /// Calculated privilege tax
    pub privilege_tax: f64,
    /// Notes about the calculation
    pub notes: Vec<String>,
}

/// Calculate West Virginia Privilege Tax
///
/// WV uses a privilege tax (also called title tax) for vehicle registration:
/// - Rate: 6% standard (may vary by vehicle class)
/// - Base: Higher of actual price or NADA value (for used)
/// - Trade-in: Credit allowed
/// - Negative equity: Added to taxable base in some cases
///
/// # Arguments
/// * `config` - WV Privilege Tax configuration
/// * `purchase_price` - Actual vehicle purchase price
/// * `assessed_value` - NADA/Kelly Blue Book value (for used vehicles)
/// * `trade_in_value` - Trade-in vehicle value
/// * `negative_equity` - Negative equity on trade
/// * `vehicle_class` - Optional vehicle class for rate lookup
pub fn calculate_wv_privilege(
    config: &WestVirginiaPrivilegeConfig,
    purchase_price: f64,
    assessed_value: Option<f64>,
    trade_in_value: f64,
    negative_equity: f64,
    vehicle_class: Option<&str>,
) -> PrivilegeTaxResult {
    let mut notes = vec!["WV Privilege Tax calculation".to_string()];

    // Step 1: Determine base value
    let base_value = if config.use_higher_of_price_or_assessed {
        let assessed = assessed_value.unwrap_or(purchase_price);
        if assessed > purchase_price {
            notes.push(format!(
                "Using assessed value ${:.2} (higher than price)",
                assessed
            ));
            assessed
        } else {
            purchase_price
        }
    } else if config.use_assessed_value {
        assessed_value.unwrap_or(purchase_price)
    } else {
        purchase_price
    };

    // Step 2: Apply trade-in credit
    let trade_in_credit = if config.allow_trade_in_credit {
        notes.push("Trade-in credit applied".to_string());
        trade_in_value
    } else {
        0.0
    };

    // Step 3: Handle negative equity
    let negative_equity_added = if config.apply_negative_equity_to_base && negative_equity > 0.0 {
        notes.push(format!("Negative equity ${:.2} added to base", negative_equity));
        negative_equity
    } else {
        0.0
    };

    // Step 4: Calculate taxable base
    let taxable_base = (base_value - trade_in_credit + negative_equity_added).max(0.0);

    // Step 5: Determine rate (may vary by vehicle class)
    let rate = if let Some(class) = vehicle_class {
        if let Some(class_rates) = &config.vehicle_class_rates {
            class_rates.get(class).copied().unwrap_or(config.base_rate)
        } else {
            config.base_rate
        }
    } else {
        config.base_rate
    };

    notes.push(format!("Privilege tax rate: {:.2}%", rate * 100.0));

    // Step 6: Calculate tax
    let privilege_tax = taxable_base * rate;

    PrivilegeTaxResult {
        base_value,
        trade_in_credit,
        negative_equity_added,
        taxable_base,
        rate,
        vehicle_class: vehicle_class.map(|s| s.to_string()),
        privilege_tax,
        notes,
    }
}

// ============================================================================
// South Carolina Tax Cap
// ============================================================================

/// SC Tax Cap Calculation Result
#[derive(Debug, Clone)]
pub struct SCTaxCapResult {
    /// Purchase price
    pub purchase_price: f64,
    /// Trade-in credit
    pub trade_in_credit: f64,
    /// Taxable base
    pub taxable_base: f64,
    /// Calculated tax (before cap)
    pub calculated_tax: f64,
    /// Cap amount ($500)
    pub cap_amount: f64,
    /// Final tax (after cap)
    pub final_tax: f64,
    /// Was cap applied?
    pub cap_applied: bool,
}

/// Calculate South Carolina vehicle tax with $500 cap
///
/// SC caps vehicle sales tax at $500 regardless of price.
/// This is very favorable for expensive vehicle purchases.
pub fn calculate_sc_capped_tax(
    purchase_price: f64,
    trade_in_value: f64,
    state_rate: f64,
    cap_amount: f64, // Typically $500
) -> SCTaxCapResult {
    let trade_in_credit = trade_in_value;
    let taxable_base = (purchase_price - trade_in_credit).max(0.0);
    let calculated_tax = taxable_base * state_rate;

    let (final_tax, cap_applied) = if calculated_tax > cap_amount {
        (cap_amount, true)
    } else {
        (calculated_tax, false)
    };

    SCTaxCapResult {
        purchase_price,
        trade_in_credit,
        taxable_base,
        calculated_tax,
        cap_amount,
        final_tax,
        cap_applied,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ga_tavt_basic() {
        let config = GeorgiaTAVTConfig {
            default_rate: 0.066,
            use_assessed_value: false,
            use_higher_of_price_or_assessed: true,
            allow_trade_in_credit: true,
            trade_in_applies_to: TAVTTradeInApplication::Full,
            apply_negative_equity_to_base: false,
            lease_base_mode: TAVTLeaseBaseMode::AgreedValue,
        };

        let result = calculate_ga_tavt(&config, 40000.0, None, 10000.0, true);

        // Base: $40,000 - $10,000 = $30,000
        // TAVT: $30,000 * 6.6% = $1,980
        assert_eq!(result.taxable_base, 30000.0);
        assert!((result.tavt_amount - 1980.0).abs() < 0.01);
    }

    #[test]
    fn test_ga_tavt_assessed_higher() {
        let config = GeorgiaTAVTConfig {
            default_rate: 0.07,
            use_assessed_value: false,
            use_higher_of_price_or_assessed: true,
            allow_trade_in_credit: true,
            trade_in_applies_to: TAVTTradeInApplication::Full,
            apply_negative_equity_to_base: false,
            lease_base_mode: TAVTLeaseBaseMode::AgreedValue,
        };

        // Used car: price $25,000 but assessed at $28,000
        let result = calculate_ga_tavt(&config, 25000.0, Some(28000.0), 5000.0, false);

        // Base: $28,000 (assessed, higher) - $5,000 = $23,000
        // TAVT: $23,000 * 7% = $1,610
        assert_eq!(result.fair_market_value, 28000.0);
        assert_eq!(result.taxable_base, 23000.0);
        assert!((result.tavt_amount - 1610.0).abs() < 0.01);
    }

    #[test]
    fn test_nc_hut_basic() {
        let config = NorthCarolinaHUTConfig {
            base_rate: 0.03,
            use_highway_use_tax: true,
            include_trade_in_reduction: true,
            apply_to_net_price_only: true,
            max_reciprocity_age_days: 90,
        };

        let result = calculate_nc_hut(&config, 35000.0, 8000.0, 0.0, None);

        // Base: $35,000 - $8,000 = $27,000
        // HUT: $27,000 * 3% = $810
        assert_eq!(result.taxable_base, 27000.0);
        assert!((result.final_hut - 810.0).abs() < 0.01);
    }

    #[test]
    fn test_nc_hut_with_reciprocity() {
        let config = NorthCarolinaHUTConfig {
            base_rate: 0.03,
            use_highway_use_tax: true,
            include_trade_in_reduction: true,
            apply_to_net_price_only: true,
            max_reciprocity_age_days: 90,
        };

        // Customer already paid $500 tax in another state
        let result = calculate_nc_hut(&config, 30000.0, 0.0, 500.0, Some(30));

        // Base: $30,000
        // Calculated HUT: $30,000 * 3% = $900
        // After $500 credit: $400
        assert_eq!(result.calculated_hut, 900.0);
        assert_eq!(result.reciprocity_credit, 500.0);
        assert!((result.final_hut - 400.0).abs() < 0.01);
    }

    #[test]
    fn test_nc_hut_reciprocity_expired() {
        let config = NorthCarolinaHUTConfig {
            base_rate: 0.03,
            use_highway_use_tax: true,
            include_trade_in_reduction: true,
            apply_to_net_price_only: true,
            max_reciprocity_age_days: 90,
        };

        // Tax paid 120 days ago (exceeds 90 day limit)
        let result = calculate_nc_hut(&config, 30000.0, 0.0, 500.0, Some(120));

        // No credit because too old
        assert_eq!(result.reciprocity_credit, 0.0);
        assert_eq!(result.final_hut, 900.0);
    }

    #[test]
    fn test_wv_privilege_basic() {
        let config = WestVirginiaPrivilegeConfig {
            base_rate: 0.06,
            use_assessed_value: false,
            use_higher_of_price_or_assessed: false,
            allow_trade_in_credit: true,
            apply_negative_equity_to_base: false,
            vehicle_class_rates: None,
        };

        let result = calculate_wv_privilege(&config, 25000.0, None, 5000.0, 0.0, None);

        // Base: $25,000 - $5,000 = $20,000
        // Tax: $20,000 * 6% = $1,200
        assert_eq!(result.taxable_base, 20000.0);
        assert!((result.privilege_tax - 1200.0).abs() < 0.01);
    }

    #[test]
    fn test_wv_privilege_with_negative_equity() {
        let config = WestVirginiaPrivilegeConfig {
            base_rate: 0.06,
            use_assessed_value: false,
            use_higher_of_price_or_assessed: false,
            allow_trade_in_credit: true,
            apply_negative_equity_to_base: true,
            vehicle_class_rates: None,
        };

        let result = calculate_wv_privilege(&config, 30000.0, None, 10000.0, 3000.0, None);

        // Base: $30,000 - $10,000 + $3,000 (negative equity) = $23,000
        // Tax: $23,000 * 6% = $1,380
        assert_eq!(result.taxable_base, 23000.0);
        assert!((result.privilege_tax - 1380.0).abs() < 0.01);
    }

    #[test]
    fn test_sc_tax_cap() {
        let result = calculate_sc_capped_tax(50000.0, 10000.0, 0.06, 500.0);

        // Base: $50,000 - $10,000 = $40,000
        // Calculated: $40,000 * 6% = $2,400
        // Final (capped): $500
        assert_eq!(result.calculated_tax, 2400.0);
        assert_eq!(result.final_tax, 500.0);
        assert!(result.cap_applied);
    }

    #[test]
    fn test_sc_tax_no_cap_needed() {
        let result = calculate_sc_capped_tax(6000.0, 0.0, 0.06, 500.0);

        // Base: $6,000
        // Calculated: $6,000 * 6% = $360
        // Final: $360 (no cap needed)
        assert!((result.calculated_tax - 360.0).abs() < 0.01);
        assert!((result.final_tax - 360.0).abs() < 0.01);
        assert!(!result.cap_applied);
    }
}
