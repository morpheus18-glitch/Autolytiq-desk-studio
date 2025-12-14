//! Geocoding Module - Address Validation and Location Resolution
//!
//! Provides geocoding capabilities for resolving addresses to coordinates,
//! counties, and tax jurisdictions.
//!
//! # Pipeline Position
//!
//! ```text
//! [Raw Address] → [Normalizer] → [Geocoder] → [Jurisdiction Resolver] → [ATIE]
//!                                    ↑
//!                              YOU ARE HERE
//! ```
//!
//! # Architecture Notes
//!
//! Since WASM can't make HTTP calls directly, this module provides:
//! 1. Type definitions for geocoding requests/responses
//! 2. Mock implementations for testing
//! 3. Interfaces that backend services (Go/Node) implement
//!
//! The actual Google Places API calls are made by the backend service,
//! which then passes the results to WASM for tax calculation.
//!
//! # Supported Providers
//!
//! - Google Places API (primary)
//! - US Census Geocoder (fallback, free)
//! - USPS Address Validation (verification only)

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::address::{NormalizedAddress, GeocodeAccuracy, GeocodeResult};

// ============================================================================
// GEOCODING PROVIDER TYPES
// ============================================================================

/// Geocoding provider
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GeocodingProvider {
    /// Google Places API
    GooglePlaces,
    /// US Census Bureau Geocoder (free)
    USCensus,
    /// Smarty (formerly SmartyStreets)
    Smarty,
    /// HERE Maps
    Here,
    /// Mock provider for testing
    Mock,
}

/// Geocoding request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeocodingRequest {
    /// Normalized address to geocode
    pub address: NormalizedAddress,

    /// Preferred provider
    pub provider: Option<GeocodingProvider>,

    /// Include county FIPS lookup
    pub include_county: bool,

    /// Include special tax districts
    pub include_districts: bool,

    /// Session token for Google Places (for billing)
    pub session_token: Option<String>,
}

/// Geocoding response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeocodingResponse {
    /// Was geocoding successful?
    pub success: bool,

    /// Provider used
    pub provider: GeocodingProvider,

    /// Geocoding result
    pub result: Option<GeocodeResult>,

    /// County information
    pub county: Option<CountyResult>,

    /// Tax jurisdictions found
    pub jurisdictions: Vec<JurisdictionCode>,

    /// Error message (if any)
    pub error: Option<String>,

    /// Response metadata
    pub metadata: GeocodingMetadata,
}

/// County result from geocoding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountyResult {
    /// County name
    pub name: String,

    /// Full FIPS code (5 digits: state + county)
    pub fips_code: String,

    /// State FIPS (2 digits)
    pub state_fips: String,

    /// County FIPS (3 digits)
    pub county_fips: String,

    /// County seat
    pub county_seat: Option<String>,

    /// Time zone
    pub timezone: Option<String>,
}

/// Tax jurisdiction code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionCode {
    /// Jurisdiction type
    pub jurisdiction_type: JurisdictionType,

    /// Jurisdiction code
    pub code: String,

    /// Jurisdiction name
    pub name: String,

    /// FIPS code (if applicable)
    pub fips: Option<String>,
}

/// Jurisdiction type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JurisdictionType {
    /// State level
    State,
    /// County level
    County,
    /// City/Municipality level
    City,
    /// Special tax district
    SpecialDistrict,
    /// Transit district
    Transit,
    /// School district
    School,
}

/// Geocoding metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeocodingMetadata {
    /// Time taken (ms)
    pub latency_ms: u64,

    /// Cache hit?
    pub cached: bool,

    /// API calls made
    pub api_calls: u32,

    /// Provider response ID
    pub response_id: Option<String>,
}

// ============================================================================
// COUNTY FIPS DATABASE
// ============================================================================

/// County FIPS database - maps state + county name to FIPS codes
#[derive(Debug, Clone)]
pub struct CountyFipsDatabase {
    /// Map of state code → county name → FIPS
    counties: HashMap<String, HashMap<String, CountyRecord>>,
}

/// County record in the FIPS database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountyRecord {
    /// Full FIPS code
    pub fips: String,
    /// County name (normalized)
    pub name: String,
    /// State code
    pub state: String,
    /// Population (for disambiguation)
    pub population: Option<u32>,
    /// Primary cities
    pub cities: Vec<String>,
}

impl Default for CountyFipsDatabase {
    fn default() -> Self {
        Self::new()
    }
}

impl CountyFipsDatabase {
    /// Create a new county FIPS database with default data
    pub fn new() -> Self {
        let mut db = Self {
            counties: HashMap::new(),
        };
        db.load_default_counties();
        db
    }

    /// Load default county data (major counties for each state)
    fn load_default_counties(&mut self) {
        // Texas counties
        self.add_county("TX", "48", "HARRIS", "201", vec!["Houston"]);
        self.add_county("TX", "48", "DALLAS", "113", vec!["Dallas"]);
        self.add_county("TX", "48", "TARRANT", "439", vec!["Fort Worth", "Arlington"]);
        self.add_county("TX", "48", "BEXAR", "029", vec!["San Antonio"]);
        self.add_county("TX", "48", "TRAVIS", "453", vec!["Austin"]);
        self.add_county("TX", "48", "COLLIN", "085", vec!["Plano", "McKinney", "Frisco"]);
        self.add_county("TX", "48", "HIDALGO", "215", vec!["McAllen", "Edinburg"]);
        self.add_county("TX", "48", "EL PASO", "141", vec!["El Paso"]);
        self.add_county("TX", "48", "DENTON", "121", vec!["Denton", "Lewisville"]);
        self.add_county("TX", "48", "FORT BEND", "157", vec!["Sugar Land", "Missouri City"]);

        // California counties
        self.add_county("CA", "06", "LOS ANGELES", "037", vec!["Los Angeles", "Long Beach"]);
        self.add_county("CA", "06", "SAN DIEGO", "073", vec!["San Diego"]);
        self.add_county("CA", "06", "ORANGE", "059", vec!["Anaheim", "Santa Ana", "Irvine"]);
        self.add_county("CA", "06", "RIVERSIDE", "065", vec!["Riverside", "Corona"]);
        self.add_county("CA", "06", "SAN BERNARDINO", "071", vec!["San Bernardino", "Ontario"]);
        self.add_county("CA", "06", "SANTA CLARA", "085", vec!["San Jose", "Sunnyvale"]);
        self.add_county("CA", "06", "ALAMEDA", "001", vec!["Oakland", "Fremont"]);
        self.add_county("CA", "06", "SACRAMENTO", "067", vec!["Sacramento"]);
        self.add_county("CA", "06", "CONTRA COSTA", "013", vec!["Concord", "Walnut Creek"]);
        self.add_county("CA", "06", "FRESNO", "019", vec!["Fresno"]);
        self.add_county("CA", "06", "SAN FRANCISCO", "075", vec!["San Francisco"]);

        // Florida counties
        self.add_county("FL", "12", "MIAMI-DADE", "086", vec!["Miami", "Hialeah"]);
        self.add_county("FL", "12", "BROWARD", "011", vec!["Fort Lauderdale", "Hollywood"]);
        self.add_county("FL", "12", "PALM BEACH", "099", vec!["West Palm Beach", "Boca Raton"]);
        self.add_county("FL", "12", "HILLSBOROUGH", "057", vec!["Tampa"]);
        self.add_county("FL", "12", "ORANGE", "095", vec!["Orlando"]);
        self.add_county("FL", "12", "PINELLAS", "103", vec!["St. Petersburg", "Clearwater"]);
        self.add_county("FL", "12", "DUVAL", "031", vec!["Jacksonville"]);
        self.add_county("FL", "12", "LEE", "071", vec!["Fort Myers", "Cape Coral"]);
        self.add_county("FL", "12", "POLK", "105", vec!["Lakeland"]);
        self.add_county("FL", "12", "BREVARD", "009", vec!["Melbourne", "Palm Bay"]);

        // Illinois counties
        self.add_county("IL", "17", "COOK", "031", vec!["Chicago", "Evanston"]);
        self.add_county("IL", "17", "DUPAGE", "043", vec!["Naperville", "Aurora"]);
        self.add_county("IL", "17", "LAKE", "097", vec!["Waukegan"]);
        self.add_county("IL", "17", "WILL", "197", vec!["Joliet"]);
        self.add_county("IL", "17", "KANE", "089", vec!["Aurora", "Elgin"]);
        self.add_county("IL", "17", "MCHENRY", "111", vec!["Crystal Lake"]);

        // Indiana counties
        self.add_county("IN", "18", "MARION", "097", vec!["Indianapolis"]);
        self.add_county("IN", "18", "LAKE", "089", vec!["Gary", "Hammond"]);
        self.add_county("IN", "18", "ALLEN", "003", vec!["Fort Wayne"]);
        self.add_county("IN", "18", "HAMILTON", "057", vec!["Carmel", "Fishers", "Noblesville"]);
        self.add_county("IN", "18", "ST JOSEPH", "141", vec!["South Bend"]);
        self.add_county("IN", "18", "ELKHART", "039", vec!["Elkhart", "Goshen"]);
        self.add_county("IN", "18", "TIPPECANOE", "157", vec!["Lafayette", "West Lafayette"]);
        self.add_county("IN", "18", "VANDERBURGH", "163", vec!["Evansville"]);
        self.add_county("IN", "18", "HENDRICKS", "063", vec!["Plainfield", "Avon"]);
        self.add_county("IN", "18", "JOHNSON", "081", vec!["Greenwood", "Franklin"]);

        // New York counties
        self.add_county("NY", "36", "NEW YORK", "061", vec!["Manhattan"]);
        self.add_county("NY", "36", "KINGS", "047", vec!["Brooklyn"]);
        self.add_county("NY", "36", "QUEENS", "081", vec!["Queens"]);
        self.add_county("NY", "36", "BRONX", "005", vec!["Bronx"]);
        self.add_county("NY", "36", "RICHMOND", "085", vec!["Staten Island"]);
        self.add_county("NY", "36", "SUFFOLK", "103", vec!["Brookhaven"]);
        self.add_county("NY", "36", "NASSAU", "059", vec!["Hempstead"]);
        self.add_county("NY", "36", "WESTCHESTER", "119", vec!["Yonkers", "White Plains"]);
        self.add_county("NY", "36", "ERIE", "029", vec!["Buffalo"]);
        self.add_county("NY", "36", "MONROE", "055", vec!["Rochester"]);

        // Georgia counties
        self.add_county("GA", "13", "FULTON", "121", vec!["Atlanta"]);
        self.add_county("GA", "13", "GWINNETT", "135", vec!["Lawrenceville"]);
        self.add_county("GA", "13", "COBB", "067", vec!["Marietta"]);
        self.add_county("GA", "13", "DEKALB", "089", vec!["Decatur"]);
        self.add_county("GA", "13", "CHATHAM", "051", vec!["Savannah"]);

        // Ohio counties
        self.add_county("OH", "39", "CUYAHOGA", "035", vec!["Cleveland"]);
        self.add_county("OH", "39", "FRANKLIN", "049", vec!["Columbus"]);
        self.add_county("OH", "39", "HAMILTON", "061", vec!["Cincinnati"]);
        self.add_county("OH", "39", "SUMMIT", "153", vec!["Akron"]);
        self.add_county("OH", "39", "MONTGOMERY", "113", vec!["Dayton"]);
        self.add_county("OH", "39", "LUCAS", "095", vec!["Toledo"]);

        // Pennsylvania counties
        self.add_county("PA", "42", "PHILADELPHIA", "101", vec!["Philadelphia"]);
        self.add_county("PA", "42", "ALLEGHENY", "003", vec!["Pittsburgh"]);
        self.add_county("PA", "42", "MONTGOMERY", "091", vec!["Norristown"]);
        self.add_county("PA", "42", "BUCKS", "017", vec!["Doylestown"]);
        self.add_county("PA", "42", "DELAWARE", "045", vec!["Media"]);

        // Arizona counties
        self.add_county("AZ", "04", "MARICOPA", "013", vec!["Phoenix", "Mesa", "Scottsdale"]);
        self.add_county("AZ", "04", "PIMA", "019", vec!["Tucson"]);
        self.add_county("AZ", "04", "PINAL", "021", vec!["Casa Grande"]);

        // Colorado counties
        self.add_county("CO", "08", "DENVER", "031", vec!["Denver"]);
        self.add_county("CO", "08", "EL PASO", "041", vec!["Colorado Springs"]);
        self.add_county("CO", "08", "ARAPAHOE", "005", vec!["Aurora"]);
        self.add_county("CO", "08", "JEFFERSON", "059", vec!["Lakewood"]);
        self.add_county("CO", "08", "ADAMS", "001", vec!["Thornton", "Westminster"]);
        self.add_county("CO", "08", "DOUGLAS", "035", vec!["Castle Rock"]);

        // Michigan counties
        self.add_county("MI", "26", "WAYNE", "163", vec!["Detroit"]);
        self.add_county("MI", "26", "OAKLAND", "125", vec!["Troy", "Southfield"]);
        self.add_county("MI", "26", "MACOMB", "099", vec!["Warren", "Sterling Heights"]);
        self.add_county("MI", "26", "KENT", "081", vec!["Grand Rapids"]);
        self.add_county("MI", "26", "GENESEE", "049", vec!["Flint"]);

        // North Carolina counties
        self.add_county("NC", "37", "MECKLENBURG", "119", vec!["Charlotte"]);
        self.add_county("NC", "37", "WAKE", "183", vec!["Raleigh"]);
        self.add_county("NC", "37", "GUILFORD", "081", vec!["Greensboro", "High Point"]);
        self.add_county("NC", "37", "FORSYTH", "067", vec!["Winston-Salem"]);
        self.add_county("NC", "37", "DURHAM", "063", vec!["Durham"]);

        // Oklahoma counties
        self.add_county("OK", "40", "OKLAHOMA", "109", vec!["Oklahoma City"]);
        self.add_county("OK", "40", "TULSA", "143", vec!["Tulsa"]);
        self.add_county("OK", "40", "CLEVELAND", "027", vec!["Norman"]);
        self.add_county("OK", "40", "CANADIAN", "017", vec!["Mustang"]);
        self.add_county("OK", "40", "COMANCHE", "031", vec!["Lawton"]);

        // Tennessee counties
        self.add_county("TN", "47", "SHELBY", "157", vec!["Memphis"]);
        self.add_county("TN", "47", "DAVIDSON", "037", vec!["Nashville"]);
        self.add_county("TN", "47", "KNOX", "093", vec!["Knoxville"]);
        self.add_county("TN", "47", "HAMILTON", "065", vec!["Chattanooga"]);
        self.add_county("TN", "47", "RUTHERFORD", "149", vec!["Murfreesboro"]);
        self.add_county("TN", "47", "WILLIAMSON", "187", vec!["Franklin", "Brentwood"]);
    }

    /// Add a county to the database
    fn add_county(&mut self, state: &str, state_fips: &str, county_name: &str, county_fips: &str, cities: Vec<&str>) {
        let fips = format!("{}{}", state_fips, county_fips);
        let record = CountyRecord {
            fips: fips.clone(),
            name: county_name.to_string(),
            state: state.to_string(),
            population: None,
            cities: cities.into_iter().map(|s| s.to_uppercase()).collect(),
        };

        self.counties
            .entry(state.to_string())
            .or_insert_with(HashMap::new)
            .insert(county_name.to_string(), record);
    }

    /// Look up county by state and county name
    pub fn lookup_by_name(&self, state: &str, county_name: &str) -> Option<&CountyRecord> {
        self.counties
            .get(&state.to_uppercase())
            .and_then(|counties| counties.get(&county_name.to_uppercase()))
    }

    /// Look up county by state and city name
    pub fn lookup_by_city(&self, state: &str, city: &str) -> Option<&CountyRecord> {
        let city_upper = city.to_uppercase();
        self.counties
            .get(&state.to_uppercase())
            .and_then(|counties| {
                counties.values().find(|record| {
                    record.cities.iter().any(|c| c == &city_upper)
                })
            })
    }

    /// Look up county by FIPS code
    pub fn lookup_by_fips(&self, fips: &str) -> Option<&CountyRecord> {
        for counties in self.counties.values() {
            for record in counties.values() {
                if record.fips == fips {
                    return Some(record);
                }
            }
        }
        None
    }

    /// Get all counties for a state
    pub fn get_state_counties(&self, state: &str) -> Vec<&CountyRecord> {
        self.counties
            .get(&state.to_uppercase())
            .map(|counties| counties.values().collect())
            .unwrap_or_default()
    }

    /// Get total county count
    pub fn county_count(&self) -> usize {
        self.counties.values().map(|m| m.len()).sum()
    }
}

// ============================================================================
// ZIP CODE TO COUNTY MAPPING
// ============================================================================

/// ZIP code to county mapper
#[derive(Debug, Clone)]
pub struct ZipCountyMapper {
    /// Map of ZIP code prefix (3 digits) → state + primary county
    zip_prefixes: HashMap<String, ZipPrefixInfo>,
}

/// ZIP prefix information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZipPrefixInfo {
    /// State code
    pub state: String,
    /// Primary county FIPS
    pub primary_county_fips: String,
    /// Primary city
    pub primary_city: Option<String>,
}

impl Default for ZipCountyMapper {
    fn default() -> Self {
        Self::new()
    }
}

impl ZipCountyMapper {
    /// Create new ZIP to county mapper with default data
    pub fn new() -> Self {
        let mut mapper = Self {
            zip_prefixes: HashMap::new(),
        };
        mapper.load_default_mappings();
        mapper
    }

    /// Load default ZIP prefix mappings
    fn load_default_mappings(&mut self) {
        // Texas
        self.add_prefix("750", "TX", "48113", Some("Dallas"));
        self.add_prefix("751", "TX", "48113", Some("Dallas"));
        self.add_prefix("752", "TX", "48113", Some("Dallas"));
        self.add_prefix("753", "TX", "48113", Some("Dallas"));
        self.add_prefix("760", "TX", "48439", Some("Fort Worth"));
        self.add_prefix("761", "TX", "48439", Some("Fort Worth"));
        self.add_prefix("770", "TX", "48201", Some("Houston"));
        self.add_prefix("771", "TX", "48201", Some("Houston"));
        self.add_prefix("772", "TX", "48201", Some("Houston"));
        self.add_prefix("773", "TX", "48201", Some("Houston"));
        self.add_prefix("774", "TX", "48201", Some("Houston"));
        self.add_prefix("775", "TX", "48201", Some("Houston"));
        self.add_prefix("776", "TX", "48201", Some("Houston"));
        self.add_prefix("777", "TX", "48201", Some("Houston"));
        self.add_prefix("780", "TX", "48029", Some("San Antonio"));
        self.add_prefix("781", "TX", "48029", Some("San Antonio"));
        self.add_prefix("782", "TX", "48029", Some("San Antonio"));
        self.add_prefix("787", "TX", "48453", Some("Austin"));
        self.add_prefix("788", "TX", "48453", Some("Austin"));
        self.add_prefix("789", "TX", "48453", Some("Austin"));
        self.add_prefix("790", "TX", "48141", Some("El Paso"));
        self.add_prefix("791", "TX", "48141", Some("El Paso"));
        self.add_prefix("799", "TX", "48141", Some("El Paso"));
        self.add_prefix("754", "TX", "48121", Some("Denton"));
        self.add_prefix("755", "TX", "48085", Some("Plano"));
        self.add_prefix("756", "TX", "48085", Some("Plano"));

        // Illinois
        self.add_prefix("606", "IL", "17031", Some("Chicago"));
        self.add_prefix("607", "IL", "17031", Some("Chicago"));
        self.add_prefix("608", "IL", "17031", Some("Chicago"));
        self.add_prefix("600", "IL", "17031", Some("Chicago"));
        self.add_prefix("601", "IL", "17031", Some("Chicago"));
        self.add_prefix("602", "IL", "17031", Some("Chicago"));
        self.add_prefix("603", "IL", "17031", Some("Chicago"));
        self.add_prefix("604", "IL", "17031", Some("Chicago"));
        self.add_prefix("605", "IL", "17031", Some("Chicago"));
        self.add_prefix("605", "IL", "17043", Some("Naperville"));
        self.add_prefix("609", "IL", "17097", Some("Waukegan"));

        // California
        self.add_prefix("900", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("901", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("902", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("903", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("904", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("905", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("906", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("907", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("908", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("910", "CA", "06037", Some("Los Angeles"));
        self.add_prefix("911", "CA", "06037", Some("Pasadena"));
        self.add_prefix("912", "CA", "06037", Some("Glendale"));
        self.add_prefix("913", "CA", "06037", Some("Van Nuys"));
        self.add_prefix("914", "CA", "06037", Some("Van Nuys"));
        self.add_prefix("920", "CA", "06073", Some("San Diego"));
        self.add_prefix("921", "CA", "06073", Some("San Diego"));
        self.add_prefix("922", "CA", "06073", Some("San Diego"));
        self.add_prefix("926", "CA", "06059", Some("Irvine"));
        self.add_prefix("927", "CA", "06059", Some("Anaheim"));
        self.add_prefix("928", "CA", "06059", Some("Santa Ana"));
        self.add_prefix("941", "CA", "06075", Some("San Francisco"));
        self.add_prefix("940", "CA", "06075", Some("San Francisco"));
        self.add_prefix("950", "CA", "06085", Some("San Jose"));
        self.add_prefix("951", "CA", "06085", Some("San Jose"));
        self.add_prefix("952", "CA", "06085", Some("San Jose"));
        self.add_prefix("958", "CA", "06067", Some("Sacramento"));
        self.add_prefix("959", "CA", "06067", Some("Sacramento"));
        self.add_prefix("946", "CA", "06001", Some("Oakland"));
        self.add_prefix("947", "CA", "06001", Some("Berkeley"));

        // Florida
        self.add_prefix("331", "FL", "12086", Some("Miami"));
        self.add_prefix("332", "FL", "12086", Some("Miami"));
        self.add_prefix("333", "FL", "12086", Some("Miami"));
        self.add_prefix("334", "FL", "12011", Some("Fort Lauderdale"));
        self.add_prefix("335", "FL", "12086", Some("Miami"));
        self.add_prefix("336", "FL", "12057", Some("Tampa"));
        self.add_prefix("337", "FL", "12103", Some("St. Petersburg"));
        self.add_prefix("338", "FL", "12071", Some("Fort Myers"));
        self.add_prefix("339", "FL", "12011", Some("Fort Lauderdale"));
        self.add_prefix("328", "FL", "12095", Some("Orlando"));
        self.add_prefix("327", "FL", "12095", Some("Orlando"));
        self.add_prefix("322", "FL", "12031", Some("Jacksonville"));

        // Indiana
        self.add_prefix("460", "IN", "18097", Some("Indianapolis"));
        self.add_prefix("461", "IN", "18097", Some("Indianapolis"));
        self.add_prefix("462", "IN", "18097", Some("Indianapolis"));
        self.add_prefix("463", "IN", "18097", Some("Indianapolis"));
        self.add_prefix("464", "IN", "18003", Some("Fort Wayne"));
        self.add_prefix("465", "IN", "18141", Some("South Bend"));
        self.add_prefix("466", "IN", "18141", Some("South Bend"));
        self.add_prefix("467", "IN", "18089", Some("Gary"));
        self.add_prefix("468", "IN", "18057", Some("Carmel"));
        self.add_prefix("469", "IN", "18057", Some("Fishers"));
        self.add_prefix("470", "IN", "18097", Some("Indianapolis"));
        self.add_prefix("478", "IN", "18157", Some("Lafayette"));
        self.add_prefix("479", "IN", "18157", Some("West Lafayette"));
        self.add_prefix("477", "IN", "18163", Some("Evansville"));

        // New York
        self.add_prefix("100", "NY", "36061", Some("Manhattan"));
        self.add_prefix("101", "NY", "36061", Some("Manhattan"));
        self.add_prefix("102", "NY", "36061", Some("Manhattan"));
        self.add_prefix("103", "NY", "36085", Some("Staten Island"));
        self.add_prefix("104", "NY", "36005", Some("Bronx"));
        self.add_prefix("110", "NY", "36081", Some("Queens"));
        self.add_prefix("111", "NY", "36081", Some("Queens"));
        self.add_prefix("112", "NY", "36047", Some("Brooklyn"));
        self.add_prefix("113", "NY", "36047", Some("Brooklyn"));
        self.add_prefix("114", "NY", "36047", Some("Brooklyn"));
        self.add_prefix("115", "NY", "36081", Some("Queens"));
        self.add_prefix("116", "NY", "36081", Some("Queens"));
        self.add_prefix("117", "NY", "36103", Some("Long Island"));
        self.add_prefix("118", "NY", "36059", Some("Nassau"));

        // More states would be added here...
    }

    /// Add a ZIP prefix mapping
    fn add_prefix(&mut self, prefix: &str, state: &str, county_fips: &str, city: Option<&str>) {
        self.zip_prefixes.insert(
            prefix.to_string(),
            ZipPrefixInfo {
                state: state.to_string(),
                primary_county_fips: county_fips.to_string(),
                primary_city: city.map(|s| s.to_string()),
            },
        );
    }

    /// Look up county by ZIP code
    pub fn lookup(&self, zip: &str) -> Option<&ZipPrefixInfo> {
        let prefix = if zip.len() >= 3 { &zip[..3] } else { zip };
        self.zip_prefixes.get(prefix)
    }

    /// Get all ZIP prefixes for a state
    pub fn get_state_prefixes(&self, state: &str) -> Vec<(&String, &ZipPrefixInfo)> {
        self.zip_prefixes
            .iter()
            .filter(|(_, info)| info.state == state)
            .collect()
    }
}

// ============================================================================
// GEOCODING SERVICE (MOCK)
// ============================================================================

/// Mock geocoding service for testing
#[derive(Debug, Clone)]
pub struct MockGeocoder {
    /// County FIPS database
    county_db: CountyFipsDatabase,
    /// ZIP to county mapper
    zip_mapper: ZipCountyMapper,
}

impl Default for MockGeocoder {
    fn default() -> Self {
        Self::new()
    }
}

impl MockGeocoder {
    /// Create a new mock geocoder
    pub fn new() -> Self {
        Self {
            county_db: CountyFipsDatabase::new(),
            zip_mapper: ZipCountyMapper::new(),
        }
    }

    /// Geocode a normalized address
    pub fn geocode(&self, address: &NormalizedAddress) -> GeocodingResponse {
        // Try to resolve county from ZIP code first
        let county = if let Some(zip_info) = self.zip_mapper.lookup(&address.zip5) {
            // Found ZIP prefix, look up county details
            self.county_db.lookup_by_fips(&zip_info.primary_county_fips)
                .map(|record| CountyResult {
                    name: record.name.clone(),
                    fips_code: record.fips.clone(),
                    state_fips: record.fips[..2].to_string(),
                    county_fips: record.fips[2..].to_string(),
                    county_seat: None,
                    timezone: None,
                })
        } else {
            // Try city lookup
            self.county_db.lookup_by_city(&address.state, &address.city)
                .map(|record| CountyResult {
                    name: record.name.clone(),
                    fips_code: record.fips.clone(),
                    state_fips: record.fips[..2].to_string(),
                    county_fips: record.fips[2..].to_string(),
                    county_seat: None,
                    timezone: None,
                })
        };

        // Build jurisdiction codes
        let mut jurisdictions = vec![
            JurisdictionCode {
                jurisdiction_type: JurisdictionType::State,
                code: address.state.clone(),
                name: format!("State of {}", address.state),
                fips: None,
            },
        ];

        if let Some(ref county_result) = county {
            jurisdictions.push(JurisdictionCode {
                jurisdiction_type: JurisdictionType::County,
                code: county_result.fips_code.clone(),
                name: county_result.name.clone(),
                fips: Some(county_result.fips_code.clone()),
            });
        }

        jurisdictions.push(JurisdictionCode {
            jurisdiction_type: JurisdictionType::City,
            code: format!("{}-{}", address.state, address.city.replace(' ', "-")),
            name: address.city.clone(),
            fips: None,
        });

        // Mock geocode result
        let geocode_result = GeocodeResult {
            latitude: 0.0, // Would be real coordinates from API
            longitude: 0.0,
            formatted_address: format!(
                "{}, {} {} {}",
                address.street_name, address.city, address.state, address.zip5
            ),
            place_id: None,
            accuracy: GeocodeAccuracy::Approximate,
        };

        GeocodingResponse {
            success: true,
            provider: GeocodingProvider::Mock,
            result: Some(geocode_result),
            county,
            jurisdictions,
            error: None,
            metadata: GeocodingMetadata {
                latency_ms: 0,
                cached: false,
                api_calls: 0,
                response_id: None,
            },
        }
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::address::RawAddressInput;

    #[test]
    fn test_county_fips_database() {
        let db = CountyFipsDatabase::new();

        // Test lookup by name
        let harris = db.lookup_by_name("TX", "HARRIS");
        assert!(harris.is_some());
        assert_eq!(harris.unwrap().fips, "48201");

        // Test lookup by city
        let dallas_county = db.lookup_by_city("TX", "Dallas");
        assert!(dallas_county.is_some());
        assert_eq!(dallas_county.unwrap().name, "DALLAS");

        // Test lookup by FIPS
        let cook = db.lookup_by_fips("17031");
        assert!(cook.is_some());
        assert_eq!(cook.unwrap().name, "COOK");
        assert!(cook.unwrap().cities.contains(&"CHICAGO".to_string()));
    }

    #[test]
    fn test_zip_county_mapper() {
        let mapper = ZipCountyMapper::new();

        // Houston ZIP
        let houston = mapper.lookup("77001");
        assert!(houston.is_some());
        assert_eq!(houston.unwrap().state, "TX");
        assert_eq!(houston.unwrap().primary_county_fips, "48201");

        // Chicago ZIP
        let chicago = mapper.lookup("60601");
        assert!(chicago.is_some());
        assert_eq!(chicago.unwrap().state, "IL");
        assert_eq!(chicago.unwrap().primary_county_fips, "17031");

        // Indianapolis ZIP
        let indy = mapper.lookup("46220");
        assert!(indy.is_some());
        assert_eq!(indy.unwrap().state, "IN");
    }

    #[test]
    fn test_mock_geocoder() {
        let geocoder = MockGeocoder::new();

        let address = NormalizedAddress {
            original: RawAddressInput {
                line1: "123 Main St".to_string(),
                line2: None,
                city: "Houston".to_string(),
                state: "TX".to_string(),
                zip: "77001".to_string(),
                county: None,
            },
            street_number: Some("123".to_string()),
            predirectional: None,
            street_name: "MAIN".to_string(),
            suffix: Some("ST".to_string()),
            postdirectional: None,
            unit_type: None,
            unit_number: None,
            city: "HOUSTON".to_string(),
            state: "TX".to_string(),
            zip5: "77001".to_string(),
            zip4: None,
            county: None,
            county_fips: None,
            is_valid: true,
            validation_notes: vec![],
            confidence: 1.0,
        };

        let result = geocoder.geocode(&address);

        assert!(result.success);
        assert!(result.county.is_some());
        assert_eq!(result.county.unwrap().name, "HARRIS");
        assert!(result.jurisdictions.len() >= 2);
    }

    #[test]
    fn test_county_count() {
        let db = CountyFipsDatabase::new();
        // We should have a decent number of counties loaded
        assert!(db.county_count() > 50);
    }

    #[test]
    fn test_state_counties() {
        let db = CountyFipsDatabase::new();

        let tx_counties = db.get_state_counties("TX");
        assert!(tx_counties.len() >= 10); // We loaded at least 10 TX counties

        let il_counties = db.get_state_counties("IL");
        assert!(il_counties.len() >= 5);
    }
}
