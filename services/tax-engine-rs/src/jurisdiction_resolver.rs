//! Jurisdiction Resolver Module
//!
//! Resolves customer addresses to complete tax jurisdiction contexts.
//! This is the core of the address-driven tax schema system.
//!
//! # Flow
//!
//! ```text
//! Customer Address → Jurisdiction Resolver → Tax Context
//!                          ↓
//!     [State] + [County FIPS] + [City] + [ZIP]
//!                          ↓
//!     [Combined Rate] + [State Rate] + [Local Rate]
//! ```
//!
//! # Usage
//!
//! When a customer is created or their address is updated, this resolver
//! determines the complete tax jurisdiction. The resolved context is then
//! stored on the customer profile and automatically applied to all deals.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::geocoding::{CountyFipsDatabase, ZipCountyMapper};
use crate::state_rules::load_all_state_rules;

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/// Input address for jurisdiction resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerAddress {
    pub street: Option<String>,
    pub city: Option<String>,
    pub state: String, // Required - 2-letter state code
    pub zip: Option<String>,
    pub county: Option<String>,
}

/// Complete jurisdiction resolution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionResult {
    /// Resolved state code (2-letter)
    pub state_code: String,

    /// Local jurisdiction code (e.g., "TX_HARRIS_HOUSTON" or "IN_MARION")
    pub jurisdiction_code: String,

    /// Human-readable jurisdiction name (e.g., "Houston, Harris County, TX")
    pub jurisdiction_name: String,

    /// Combined tax rate (state + local) as decimal (e.g., 0.0825 for 8.25%)
    pub combined_rate: f64,

    /// State-only tax rate as decimal
    pub state_rate: f64,

    /// Local-only tax rate (county + city + district) as decimal
    pub local_rate: f64,

    /// County FIPS code (5 digits)
    pub county_fips: Option<String>,

    /// County name
    pub county_name: Option<String>,

    /// City name (if resolved)
    pub city_name: Option<String>,

    /// Tax schema version (for audit trail)
    pub schema_version: i32,

    /// Vehicle uses local sales tax (some states exempt vehicles from local)
    pub vehicle_uses_local_tax: bool,

    /// Special notes about this jurisdiction
    pub notes: Option<String>,
}

/// Error type for jurisdiction resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionError {
    pub code: String,
    pub message: String,
}

// ============================================================================
// JURISDICTION RESOLVER
// ============================================================================

/// Main jurisdiction resolver
pub struct JurisdictionResolver {
    /// County FIPS database
    county_db: CountyFipsDatabase,
    /// ZIP to county mapper
    zip_mapper: ZipCountyMapper,
    /// State tax rates (state code → rate info)
    state_rates: HashMap<String, StateRateInfo>,
    /// Local tax rates (jurisdiction code → rate info)
    local_rates: HashMap<String, LocalRateInfo>,
}

/// State-level rate information
#[derive(Debug, Clone)]
struct StateRateInfo {
    state_code: String,
    base_rate: f64,
    vehicle_rate: Option<f64>, // Some states have different vehicle rates
    vehicle_uses_local: bool,
    #[allow(dead_code)]
    notes: Option<String>,
}

/// Local jurisdiction rate information
#[derive(Debug, Clone)]
struct LocalRateInfo {
    jurisdiction_code: String,
    jurisdiction_name: String,
    county_rate: f64,
    city_rate: f64,
    district_rate: f64,
    total_local_rate: f64,
    county_fips: Option<String>,
}

impl Default for JurisdictionResolver {
    fn default() -> Self {
        Self::new()
    }
}

impl JurisdictionResolver {
    /// Create a new jurisdiction resolver with default data
    pub fn new() -> Self {
        let mut resolver = Self {
            county_db: CountyFipsDatabase::new(),
            zip_mapper: ZipCountyMapper::new(),
            state_rates: HashMap::new(),
            local_rates: HashMap::new(),
        };
        resolver.load_default_rates();
        resolver
    }

    /// Load default state and local tax rates
    fn load_default_rates(&mut self) {
        // Load state rates from state rules
        let state_rules = load_all_state_rules();
        for (state_code, rules) in state_rules.iter() {
            self.state_rates.insert(
                state_code.clone(),
                StateRateInfo {
                    state_code: state_code.clone(),
                    base_rate: get_state_base_rate(state_code),
                    vehicle_rate: None, // Uses base_rate for vehicles
                    vehicle_uses_local: rules.vehicle_uses_local_sales_tax,
                    notes: None,
                },
            );
        }

        // Load local rates for major jurisdictions
        self.load_local_rates();
    }

    /// Load local tax rates for major jurisdictions
    fn load_local_rates(&mut self) {
        // Texas jurisdictions
        self.add_local("TX", "HARRIS", "HOUSTON", 0.01, 0.01, 0.0, "48201");
        self.add_local("TX", "DALLAS", "DALLAS", 0.0, 0.0175, 0.0, "48113");
        self.add_local("TX", "TARRANT", "FORT WORTH", 0.0, 0.0175, 0.0, "48439");
        self.add_local("TX", "BEXAR", "SAN ANTONIO", 0.01125, 0.00375, 0.0, "48029");
        self.add_local("TX", "TRAVIS", "AUSTIN", 0.01, 0.01, 0.0, "48453");
        self.add_local("TX", "COLLIN", "PLANO", 0.0, 0.02, 0.0, "48085");
        self.add_local("TX", "EL PASO", "EL PASO", 0.005, 0.0175, 0.0, "48141");
        self.add_local("TX", "DENTON", "DENTON", 0.0, 0.02, 0.0, "48121");
        self.add_local("TX", "HIDALGO", "MCALLEN", 0.005, 0.015, 0.0, "48215");

        // California jurisdictions (complex district taxes)
        self.add_local("CA", "LOS ANGELES", "LOS ANGELES", 0.0025, 0.0075, 0.0125, "06037");
        self.add_local("CA", "SAN DIEGO", "SAN DIEGO", 0.005, 0.0025, 0.0025, "06073");
        self.add_local("CA", "ORANGE", "ANAHEIM", 0.0025, 0.0, 0.005, "06059");
        self.add_local("CA", "SANTA CLARA", "SAN JOSE", 0.01, 0.0, 0.0025, "06085");
        self.add_local("CA", "SAN FRANCISCO", "SAN FRANCISCO", 0.01, 0.0, 0.0125, "06075");
        self.add_local("CA", "ALAMEDA", "OAKLAND", 0.01, 0.0, 0.0175, "06001");
        self.add_local("CA", "SACRAMENTO", "SACRAMENTO", 0.0075, 0.0, 0.0025, "06067");

        // Florida jurisdictions (surtax by county)
        self.add_local("FL", "MIAMI-DADE", "MIAMI", 0.01, 0.0, 0.0, "12086");
        self.add_local("FL", "BROWARD", "FORT LAUDERDALE", 0.01, 0.0, 0.0, "12011");
        self.add_local("FL", "PALM BEACH", "WEST PALM BEACH", 0.01, 0.0, 0.0, "12099");
        self.add_local("FL", "HILLSBOROUGH", "TAMPA", 0.015, 0.0, 0.0, "12057");
        self.add_local("FL", "ORANGE", "ORLANDO", 0.005, 0.0, 0.0, "12095");
        self.add_local("FL", "DUVAL", "JACKSONVILLE", 0.005, 0.0, 0.0, "12031");
        self.add_local("FL", "PINELLAS", "ST PETERSBURG", 0.01, 0.0, 0.0, "12103");

        // Illinois jurisdictions (Chicago has special rates)
        self.add_local("IL", "COOK", "CHICAGO", 0.0175, 0.0125, 0.01, "17031");
        self.add_local("IL", "DUPAGE", "NAPERVILLE", 0.0075, 0.0, 0.0, "17043");
        self.add_local("IL", "LAKE", "WAUKEGAN", 0.0075, 0.005, 0.0, "17097");
        self.add_local("IL", "WILL", "JOLIET", 0.0075, 0.005, 0.0, "17197");

        // Indiana jurisdictions (food/bev tax in some cities, but no local sales tax for vehicles)
        self.add_local("IN", "MARION", "INDIANAPOLIS", 0.0, 0.0, 0.0, "18097");
        self.add_local("IN", "LAKE", "GARY", 0.0, 0.0, 0.0, "18089");
        self.add_local("IN", "ALLEN", "FORT WAYNE", 0.0, 0.0, 0.0, "18003");
        self.add_local("IN", "HAMILTON", "CARMEL", 0.0, 0.0, 0.0, "18057");
        self.add_local("IN", "ST JOSEPH", "SOUTH BEND", 0.0, 0.0, 0.0, "18141");

        // New York jurisdictions
        self.add_local("NY", "NEW YORK", "NEW YORK", 0.045, 0.0, 0.00375, "36061");
        self.add_local("NY", "KINGS", "BROOKLYN", 0.045, 0.0, 0.00375, "36047");
        self.add_local("NY", "QUEENS", "QUEENS", 0.045, 0.0, 0.00375, "36081");
        self.add_local("NY", "SUFFOLK", "LONG ISLAND", 0.04625, 0.0, 0.0, "36103");
        self.add_local("NY", "NASSAU", "NASSAU", 0.04625, 0.0, 0.0, "36059");
        self.add_local("NY", "WESTCHESTER", "WHITE PLAINS", 0.0375, 0.0, 0.0, "36119");
        self.add_local("NY", "ERIE", "BUFFALO", 0.04, 0.0, 0.0, "36029");

        // Ohio jurisdictions
        self.add_local("OH", "CUYAHOGA", "CLEVELAND", 0.0225, 0.0, 0.0, "39035");
        self.add_local("OH", "FRANKLIN", "COLUMBUS", 0.0175, 0.0, 0.0, "39049");
        self.add_local("OH", "HAMILTON", "CINCINNATI", 0.0175, 0.0, 0.0, "39061");
        self.add_local("OH", "SUMMIT", "AKRON", 0.0175, 0.0, 0.0, "39153");
        self.add_local("OH", "LUCAS", "TOLEDO", 0.0175, 0.0, 0.0, "39095");

        // Pennsylvania jurisdictions (Philly and Allegheny have local tax)
        self.add_local("PA", "PHILADELPHIA", "PHILADELPHIA", 0.02, 0.0, 0.0, "42101");
        self.add_local("PA", "ALLEGHENY", "PITTSBURGH", 0.01, 0.0, 0.0, "42003");

        // Georgia (TAVT state - special handling)
        self.add_local("GA", "FULTON", "ATLANTA", 0.0, 0.0, 0.0, "13121");
        self.add_local("GA", "GWINNETT", "LAWRENCEVILLE", 0.0, 0.0, 0.0, "13135");
        self.add_local("GA", "COBB", "MARIETTA", 0.0, 0.0, 0.0, "13067");
        self.add_local("GA", "DEKALB", "DECATUR", 0.0, 0.0, 0.0, "13089");

        // North Carolina (HUT state - special handling)
        self.add_local("NC", "MECKLENBURG", "CHARLOTTE", 0.0, 0.0, 0.0, "37119");
        self.add_local("NC", "WAKE", "RALEIGH", 0.0, 0.0, 0.0, "37183");
        self.add_local("NC", "GUILFORD", "GREENSBORO", 0.0, 0.0, 0.0, "37081");

        // Arizona jurisdictions
        self.add_local("AZ", "MARICOPA", "PHOENIX", 0.007, 0.023, 0.0, "04013");
        self.add_local("AZ", "PIMA", "TUCSON", 0.005, 0.025, 0.0, "04019");

        // Colorado jurisdictions (RTD and other districts)
        self.add_local("CO", "DENVER", "DENVER", 0.01, 0.04, 0.0125, "08031");
        self.add_local("CO", "EL PASO", "COLORADO SPRINGS", 0.01, 0.0315, 0.0, "08041");
        self.add_local("CO", "ARAPAHOE", "AURORA", 0.0025, 0.0375, 0.01, "08005");
        self.add_local("CO", "JEFFERSON", "LAKEWOOD", 0.005, 0.03, 0.01, "08059");

        // Tennessee jurisdictions
        self.add_local("TN", "SHELBY", "MEMPHIS", 0.0225, 0.0, 0.0, "47157");
        self.add_local("TN", "DAVIDSON", "NASHVILLE", 0.0225, 0.0, 0.0, "47037");
        self.add_local("TN", "KNOX", "KNOXVILLE", 0.0225, 0.0, 0.0, "47093");
        self.add_local("TN", "HAMILTON", "CHATTANOOGA", 0.0225, 0.0, 0.0, "47065");

        // Michigan jurisdictions (no local sales tax for vehicles)
        self.add_local("MI", "WAYNE", "DETROIT", 0.0, 0.0, 0.0, "26163");
        self.add_local("MI", "OAKLAND", "TROY", 0.0, 0.0, 0.0, "26125");
        self.add_local("MI", "KENT", "GRAND RAPIDS", 0.0, 0.0, 0.0, "26081");

        // No-sales-tax states (MT, OR, DE, NH, AK partial)
        // These still get entries for completeness
        self.add_local("MT", "YELLOWSTONE", "BILLINGS", 0.0, 0.0, 0.0, "30111");
        self.add_local("OR", "MULTNOMAH", "PORTLAND", 0.0, 0.0, 0.0, "41051");
        self.add_local("DE", "NEW CASTLE", "WILMINGTON", 0.0, 0.0, 0.0, "10003");
        self.add_local("NH", "HILLSBOROUGH", "MANCHESTER", 0.0, 0.0, 0.0, "33011");
    }

    /// Add a local jurisdiction
    ///
    /// Keys are stored UPPERCASE for consistent lookups.
    fn add_local(&mut self, state: &str, county: &str, city: &str, county_rate: f64, city_rate: f64, district_rate: f64, fips: &str) {
        let code = format!("{}_{}_{}",
            state.to_uppercase(),
            county.to_uppercase().replace(' ', "_").replace('-', "_"),
            city.to_uppercase().replace(' ', "_")
        );
        let name = format!("{}, {} County, {}", city, county, state);
        let total = county_rate + city_rate + district_rate;

        self.local_rates.insert(
            code.clone(),
            LocalRateInfo {
                jurisdiction_code: code,
                jurisdiction_name: name,
                county_rate,
                city_rate,
                district_rate,
                total_local_rate: total,
                county_fips: Some(fips.to_string()),
            },
        );
    }

    /// Resolve an address to a complete tax jurisdiction
    pub fn resolve(&self, address: &CustomerAddress) -> Result<JurisdictionResult, JurisdictionError> {
        // Validate state code
        let state = address.state.to_uppercase();
        if state.len() != 2 {
            return Err(JurisdictionError {
                code: "INVALID_STATE".to_string(),
                message: format!("State code must be 2 letters, got: {}", address.state),
            });
        }

        // Get state rate info
        let state_info = self.state_rates.get(&state)
            .ok_or_else(|| JurisdictionError {
                code: "UNKNOWN_STATE".to_string(),
                message: format!("Unknown state code: {}", state),
            })?;

        // Try to resolve county from ZIP code first
        let (county_fips, county_name, city_name) = self.resolve_location(&address, &state);

        // Build jurisdiction code
        let jurisdiction_code = self.build_jurisdiction_code(&state, &county_name, &city_name);

        // Get local rates
        let local_info = self.local_rates.get(&jurisdiction_code);
        let (local_rate, jurisdiction_name) = match local_info {
            Some(info) => (info.total_local_rate, info.jurisdiction_name.clone()),
            None => {
                // Fall back to county-only or state-only
                let name = match (&county_name, &city_name) {
                    (Some(county), Some(city)) => format!("{}, {} County, {}", city, county, state),
                    (Some(county), None) => format!("{} County, {}", county, state),
                    (None, Some(city)) => format!("{}, {}", city, state),
                    (None, None) => format!("State of {}", state),
                };
                (0.0, name)
            }
        };

        // Calculate effective rates
        let state_rate = state_info.vehicle_rate.unwrap_or(state_info.base_rate);
        let effective_local_rate = if state_info.vehicle_uses_local {
            local_rate
        } else {
            0.0
        };
        let combined_rate = state_rate + effective_local_rate;

        Ok(JurisdictionResult {
            state_code: state.clone(),
            jurisdiction_code,
            jurisdiction_name,
            combined_rate,
            state_rate,
            local_rate: effective_local_rate,
            county_fips,
            county_name,
            city_name,
            schema_version: 1, // Current schema version
            vehicle_uses_local_tax: state_info.vehicle_uses_local,
            notes: self.get_state_notes(&state),
        })
    }

    /// Resolve location details (county, city) from address
    fn resolve_location(&self, address: &CustomerAddress, state: &str) -> (Option<String>, Option<String>, Option<String>) {
        // Try ZIP code first
        if let Some(zip) = &address.zip {
            if let Some(zip_info) = self.zip_mapper.lookup(zip) {
                // Found ZIP, look up county details
                if let Some(county_record) = self.county_db.lookup_by_fips(&zip_info.primary_county_fips) {
                    return (
                        Some(county_record.fips.clone()),
                        Some(county_record.name.clone()),
                        zip_info.primary_city.clone(),
                    );
                }
            }
        }

        // Try city lookup
        if let Some(city) = &address.city {
            if let Some(county_record) = self.county_db.lookup_by_city(state, city) {
                return (
                    Some(county_record.fips.clone()),
                    Some(county_record.name.clone()),
                    Some(city.to_uppercase()),
                );
            }
        }

        // Try county name directly
        if let Some(county) = &address.county {
            if let Some(county_record) = self.county_db.lookup_by_name(state, county) {
                return (
                    Some(county_record.fips.clone()),
                    Some(county_record.name.clone()),
                    address.city.as_ref().map(|c| c.to_uppercase()),
                );
            }
        }

        // Return what we have
        (None, address.county.as_ref().map(|c| c.to_uppercase()), address.city.as_ref().map(|c| c.to_uppercase()))
    }

    /// Build jurisdiction code from components
    ///
    /// Jurisdiction codes are UPPERCASE to ensure consistent lookups.
    /// Format: STATE_COUNTY_CITY (e.g., TX_HARRIS_HOUSTON)
    fn build_jurisdiction_code(&self, state: &str, county: &Option<String>, city: &Option<String>) -> String {
        match (county, city) {
            (Some(county), Some(city)) => {
                format!("{}_{}_{}",
                    state,
                    county.to_uppercase().replace(' ', "_").replace('-', "_"),
                    city.to_uppercase().replace(' ', "_").replace('-', "_")
                )
            },
            (Some(county), None) => {
                format!("{}_{}", state, county.to_uppercase().replace(' ', "_").replace('-', "_"))
            },
            (None, Some(city)) => {
                format!("{}_{}", state, city.to_uppercase().replace(' ', "_").replace('-', "_"))
            },
            (None, None) => state.to_string(),
        }
    }

    /// Get special notes for a state
    fn get_state_notes(&self, state: &str) -> Option<String> {
        match state {
            "GA" => Some("Georgia uses TAVT (Title Ad Valorem Tax) instead of sales tax".to_string()),
            "NC" => Some("North Carolina uses Highway Use Tax (HUT) instead of sales tax".to_string()),
            "MT" | "OR" | "DE" | "NH" => Some(format!("{} has no sales tax", state)),
            "AK" => Some("Alaska has no state sales tax but some localities have local tax".to_string()),
            "IN" | "MI" | "KY" => Some("Vehicles are exempt from local sales tax in this state".to_string()),
            _ => None,
        }
    }
}

// ============================================================================
// STATE BASE RATES
// ============================================================================

/// Get base state sales tax rate
fn get_state_base_rate(state: &str) -> f64 {
    match state {
        "AL" => 0.04,
        "AK" => 0.0,
        "AZ" => 0.056,
        "AR" => 0.065,
        "CA" => 0.0725,
        "CO" => 0.029,
        "CT" => 0.0635,
        "DE" => 0.0,
        "FL" => 0.06,
        "GA" => 0.04, // Base rate (TAVT is different)
        "HI" => 0.04,
        "ID" => 0.06,
        "IL" => 0.0625,
        "IN" => 0.07,
        "IA" => 0.06,
        "KS" => 0.065,
        "KY" => 0.06,
        "LA" => 0.0445,
        "ME" => 0.055,
        "MD" => 0.06,
        "MA" => 0.0625,
        "MI" => 0.06,
        "MN" => 0.06875,
        "MS" => 0.07,
        "MO" => 0.04225,
        "MT" => 0.0,
        "NE" => 0.055,
        "NV" => 0.0685,
        "NH" => 0.0,
        "NJ" => 0.06625,
        "NM" => 0.05125,
        "NY" => 0.04,
        "NC" => 0.03, // HUT rate for vehicles
        "ND" => 0.05,
        "OH" => 0.0575,
        "OK" => 0.045,
        "OR" => 0.0,
        "PA" => 0.06,
        "RI" => 0.07,
        "SC" => 0.06, // Capped at $500 for vehicles
        "SD" => 0.045,
        "TN" => 0.07,
        "TX" => 0.0625,
        "UT" => 0.0485,
        "VT" => 0.06,
        "VA" => 0.043, // 4.15% state + 0.15% HMOF
        "WA" => 0.065,
        "WV" => 0.06,
        "WI" => 0.05,
        "WY" => 0.04,
        "DC" => 0.06,
        _ => 0.06, // Default
    }
}

// ============================================================================
// WASM EXPORTS
// ============================================================================

use wasm_bindgen::prelude::*;

/// Resolve jurisdiction from address (WASM export)
#[wasm_bindgen]
pub fn resolve_jurisdiction(address_json: &str) -> Result<String, JsValue> {
    let address: CustomerAddress = serde_json::from_str(address_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse address: {}", e)))?;

    let resolver = JurisdictionResolver::new();
    let result = resolver.resolve(&address)
        .map_err(|e| JsValue::from_str(&format!("Resolution error: {} - {}", e.code, e.message)))?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Get state tax rate (WASM export)
#[wasm_bindgen]
pub fn get_state_rate(state_code: &str) -> f64 {
    get_state_base_rate(&state_code.to_uppercase())
}

/// Check if state uses local tax for vehicles (WASM export)
#[wasm_bindgen]
pub fn state_uses_local_vehicle_tax(state_code: &str) -> bool {
    let resolver = JurisdictionResolver::new();
    resolver.state_rates
        .get(&state_code.to_uppercase())
        .map(|info| info.vehicle_uses_local)
        .unwrap_or(true) // Default to true for unknown states
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_indiana_address() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: Some("123 Main St".to_string()),
            city: Some("Indianapolis".to_string()),
            state: "IN".to_string(),
            zip: Some("46220".to_string()),
            county: None,
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "IN");
        assert_eq!(result.state_rate, 0.07);
        assert_eq!(result.local_rate, 0.0); // IN doesn't use local for vehicles
        assert_eq!(result.combined_rate, 0.07);
        assert!(!result.vehicle_uses_local_tax);
    }

    #[test]
    fn test_resolve_texas_address() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: Some("456 Oak Lane".to_string()),
            city: Some("Houston".to_string()),
            state: "TX".to_string(),
            zip: Some("77001".to_string()),
            county: None,
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "TX");
        assert_eq!(result.state_rate, 0.0625);
        assert!(result.local_rate > 0.0, "local_rate should be > 0, got {}", result.local_rate);
        assert!(result.combined_rate > 0.0625);
        assert!(result.vehicle_uses_local_tax);
    }

    #[test]
    fn test_resolve_california_address() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: None,
            city: Some("Los Angeles".to_string()),
            state: "CA".to_string(),
            zip: Some("90001".to_string()),
            county: None,
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "CA");
        assert!(result.state_rate > 0.07);
        assert!(result.local_rate > 0.0);
        assert!(result.vehicle_uses_local_tax);
    }

    #[test]
    fn test_resolve_montana_no_tax() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: None,
            city: Some("Billings".to_string()),
            state: "MT".to_string(),
            zip: Some("59101".to_string()),
            county: None,
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "MT");
        assert_eq!(result.state_rate, 0.0);
        assert_eq!(result.local_rate, 0.0);
        assert_eq!(result.combined_rate, 0.0);
        assert!(result.notes.is_some());
        assert!(result.notes.unwrap().contains("no sales tax"));
    }

    #[test]
    fn test_resolve_georgia_tavt() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: None,
            city: Some("Atlanta".to_string()),
            state: "GA".to_string(),
            zip: None,
            county: Some("Fulton".to_string()),
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "GA");
        assert!(result.notes.is_some());
        assert!(result.notes.unwrap().contains("TAVT"));
    }

    #[test]
    fn test_invalid_state() {
        let resolver = JurisdictionResolver::new();

        let address = CustomerAddress {
            street: None,
            city: None,
            state: "XX".to_string(),
            zip: None,
            county: None,
        };

        let result = resolver.resolve(&address);
        assert!(result.is_err());
    }

    #[test]
    fn test_state_only_resolution() {
        let resolver = JurisdictionResolver::new();

        // Minimal address - just state
        let address = CustomerAddress {
            street: None,
            city: None,
            state: "FL".to_string(),
            zip: None,
            county: None,
        };

        let result = resolver.resolve(&address).unwrap();

        assert_eq!(result.state_code, "FL");
        assert_eq!(result.state_rate, 0.06);
        // Without local info, local rate defaults to 0
        assert_eq!(result.local_rate, 0.0);
    }
}
