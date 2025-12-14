//! Address Normalization and Parsing Module
//!
//! Provides USPS-standard address normalization, parsing, and validation.
//! This is the first step in the tax jurisdiction resolution pipeline.
//!
//! # Pipeline Position
//!
//! ```text
//! [Raw Address] → [Normalizer] → [Geocoder] → [Jurisdiction Resolver] → [ATIE]
//!                     ↑
//!              YOU ARE HERE
//! ```
//!
//! # USPS Standard Format
//!
//! ```text
//! PRIMARY ADDRESS LINE: {number} {predirectional} {street} {suffix} {postdirectional} {unit}
//! CITY, STATE ZIP-PLUS4
//! ```
//!
//! # Examples
//!
//! ```rust,no_run
//! use tax_engine_rs::address::{AddressNormalizer, RawAddressInput};
//!
//! let normalizer = AddressNormalizer::new();
//! let input = RawAddressInput {
//!     line1: "123 N Main St Apt 4B".to_string(),
//!     line2: None,
//!     city: "Chicago".to_string(),
//!     state: "IL".to_string(),
//!     zip: "60601".to_string(),
//!     county: None,
//! };
//!
//! let normalized = normalizer.normalize(&input).expect("normalization failed");
//! assert_eq!(normalized.street_number, Some("123".to_string()));
//! assert_eq!(normalized.predirectional, Some("N".to_string()));
//! assert_eq!(normalized.street_name, "MAIN");
//! assert_eq!(normalized.suffix, Some("ST".to_string()));
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// ADDRESS INPUT TYPES
// ============================================================================

/// Raw address input - what we receive from forms/database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawAddressInput {
    /// Primary address line (street address)
    pub line1: String,

    /// Secondary address line (apt, suite, etc.)
    pub line2: Option<String>,

    /// City name
    pub city: String,

    /// State code (2 letters)
    pub state: String,

    /// ZIP code (5 or 9 digit)
    pub zip: String,

    /// County (if known)
    pub county: Option<String>,
}

/// Customer address from database record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerAddress {
    /// Customer ID
    pub customer_id: String,

    /// Full address string
    pub address: String,

    /// City
    pub city: String,

    /// State (2 letters)
    pub state: String,

    /// ZIP code
    pub zip_code: String,
}

impl From<CustomerAddress> for RawAddressInput {
    fn from(customer: CustomerAddress) -> Self {
        RawAddressInput {
            line1: customer.address,
            line2: None,
            city: customer.city,
            state: customer.state,
            zip: customer.zip_code,
            county: None,
        }
    }
}

// ============================================================================
// NORMALIZED ADDRESS TYPES
// ============================================================================

/// Fully normalized and parsed address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedAddress {
    /// Original input (for audit trail)
    pub original: RawAddressInput,

    // === Street Components ===
    /// Street number (e.g., "123")
    pub street_number: Option<String>,

    /// Pre-directional (N, S, E, W, NE, NW, SE, SW)
    pub predirectional: Option<String>,

    /// Street name (e.g., "MAIN")
    pub street_name: String,

    /// Street suffix (ST, AVE, BLVD, DR, etc.)
    pub suffix: Option<String>,

    /// Post-directional
    pub postdirectional: Option<String>,

    /// Unit type (APT, STE, UNIT, etc.)
    pub unit_type: Option<String>,

    /// Unit number
    pub unit_number: Option<String>,

    // === Location Components ===
    /// City (normalized to uppercase)
    pub city: String,

    /// State (2-letter code, uppercase)
    pub state: String,

    /// ZIP code (5 digits)
    pub zip5: String,

    /// ZIP+4 (4 digits, if available)
    pub zip4: Option<String>,

    /// County name (if resolved)
    pub county: Option<String>,

    /// County FIPS code (5 digits: state + county)
    pub county_fips: Option<String>,

    // === Validation ===
    /// Whether the address passed validation
    pub is_valid: bool,

    /// Validation warnings/notes
    pub validation_notes: Vec<String>,

    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
}

/// Address validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressValidationResult {
    /// Is the address valid?
    pub is_valid: bool,

    /// Validation errors
    pub errors: Vec<AddressValidationError>,

    /// Validation warnings
    pub warnings: Vec<String>,

    /// Suggested corrections
    pub suggestions: Vec<String>,
}

/// Address validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressValidationError {
    /// Field with error
    pub field: String,

    /// Error message
    pub message: String,

    /// Error code
    pub code: AddressErrorCode,
}

/// Error codes for address validation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AddressErrorCode {
    MissingRequired,
    InvalidState,
    InvalidZip,
    InvalidFormat,
    UnparseableAddress,
    AmbiguousAddress,
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

lazy_static::lazy_static! {
    /// Valid US state codes
    static ref VALID_STATES: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("AL", "ALABAMA"); m.insert("AK", "ALASKA"); m.insert("AZ", "ARIZONA");
        m.insert("AR", "ARKANSAS"); m.insert("CA", "CALIFORNIA"); m.insert("CO", "COLORADO");
        m.insert("CT", "CONNECTICUT"); m.insert("DE", "DELAWARE"); m.insert("FL", "FLORIDA");
        m.insert("GA", "GEORGIA"); m.insert("HI", "HAWAII"); m.insert("ID", "IDAHO");
        m.insert("IL", "ILLINOIS"); m.insert("IN", "INDIANA"); m.insert("IA", "IOWA");
        m.insert("KS", "KANSAS"); m.insert("KY", "KENTUCKY"); m.insert("LA", "LOUISIANA");
        m.insert("ME", "MAINE"); m.insert("MD", "MARYLAND"); m.insert("MA", "MASSACHUSETTS");
        m.insert("MI", "MICHIGAN"); m.insert("MN", "MINNESOTA"); m.insert("MS", "MISSISSIPPI");
        m.insert("MO", "MISSOURI"); m.insert("MT", "MONTANA"); m.insert("NE", "NEBRASKA");
        m.insert("NV", "NEVADA"); m.insert("NH", "NEW HAMPSHIRE"); m.insert("NJ", "NEW JERSEY");
        m.insert("NM", "NEW MEXICO"); m.insert("NY", "NEW YORK"); m.insert("NC", "NORTH CAROLINA");
        m.insert("ND", "NORTH DAKOTA"); m.insert("OH", "OHIO"); m.insert("OK", "OKLAHOMA");
        m.insert("OR", "OREGON"); m.insert("PA", "PENNSYLVANIA"); m.insert("RI", "RHODE ISLAND");
        m.insert("SC", "SOUTH CAROLINA"); m.insert("SD", "SOUTH DAKOTA"); m.insert("TN", "TENNESSEE");
        m.insert("TX", "TEXAS"); m.insert("UT", "UTAH"); m.insert("VT", "VERMONT");
        m.insert("VA", "VIRGINIA"); m.insert("WA", "WASHINGTON"); m.insert("WV", "WEST VIRGINIA");
        m.insert("WI", "WISCONSIN"); m.insert("WY", "WYOMING"); m.insert("DC", "DISTRICT OF COLUMBIA");
        m.insert("PR", "PUERTO RICO"); m.insert("VI", "VIRGIN ISLANDS"); m.insert("GU", "GUAM");
        m
    };

    /// Street suffix standardization (USPS Publication 28)
    static ref STREET_SUFFIXES: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        // Standard suffixes
        m.insert("STREET", "ST"); m.insert("STR", "ST"); m.insert("STRT", "ST");
        m.insert("AVENUE", "AVE"); m.insert("AV", "AVE"); m.insert("AVEN", "AVE");
        m.insert("BOULEVARD", "BLVD"); m.insert("BOUL", "BLVD"); m.insert("BOULV", "BLVD");
        m.insert("DRIVE", "DR"); m.insert("DRIV", "DR"); m.insert("DRV", "DR");
        m.insert("ROAD", "RD");
        m.insert("LANE", "LN");
        m.insert("COURT", "CT"); m.insert("CRT", "CT");
        m.insert("CIRCLE", "CIR"); m.insert("CIRCL", "CIR"); m.insert("CRCL", "CIR");
        m.insert("PLACE", "PL");
        m.insert("TRAIL", "TRL"); m.insert("TRAILS", "TRL"); m.insert("TR", "TRL");
        m.insert("WAY", "WAY");
        m.insert("HIGHWAY", "HWY"); m.insert("HIWAY", "HWY"); m.insert("HWAY", "HWY");
        m.insert("PARKWAY", "PKWY"); m.insert("PARKWY", "PKWY"); m.insert("PKY", "PKWY");
        m.insert("EXPRESSWAY", "EXPY"); m.insert("EXPRESS", "EXPY"); m.insert("EXPW", "EXPY");
        m.insert("FREEWAY", "FWY"); m.insert("FREEWY", "FWY"); m.insert("FRWAY", "FWY");
        m.insert("TERRACE", "TER"); m.insert("TERR", "TER");
        m.insert("SQUARE", "SQ"); m.insert("SQR", "SQ");
        m.insert("CROSSING", "XING"); m.insert("CRSSNG", "XING");
        m.insert("COVE", "CV");
        m.insert("RIDGE", "RDG"); m.insert("RDG", "RDG");
        m.insert("PIKE", "PIKE");
        m.insert("POINT", "PT"); m.insert("POINTE", "PT");
        m.insert("PASS", "PASS");
        m.insert("PATH", "PATH");
        m.insert("ALLEY", "ALY"); m.insert("ALLY", "ALY");
        m.insert("BEND", "BND");
        m.insert("BROOK", "BRK"); m.insert("BROOKS", "BRKS");
        m.insert("CANYON", "CYN"); m.insert("CNYN", "CYN");
        m.insert("CENTER", "CTR"); m.insert("CENTRE", "CTR"); m.insert("CNTR", "CTR");
        m.insert("COMMONS", "CMNS"); m.insert("COMMON", "CMN");
        m.insert("CORNER", "COR"); m.insert("CORNERS", "CORS");
        m.insert("CREEK", "CRK");
        m.insert("CRESCENT", "CRES"); m.insert("CRSNT", "CRES");
        m.insert("ESTATE", "EST"); m.insert("ESTATES", "ESTS");
        m.insert("FERRY", "FRY"); m.insert("FRRY", "FRY");
        m.insert("FIELD", "FLD"); m.insert("FIELDS", "FLDS");
        m.insert("FLAT", "FLT"); m.insert("FLATS", "FLTS");
        m.insert("FORD", "FRD"); m.insert("FORDS", "FRDS");
        m.insert("FOREST", "FRST"); m.insert("FORESTS", "FRST");
        m.insert("FORGE", "FRG"); m.insert("FORGES", "FRGS");
        m.insert("FORK", "FRK"); m.insert("FORKS", "FRKS");
        m.insert("FORT", "FT");
        m.insert("GARDEN", "GDN"); m.insert("GARDENS", "GDNS"); m.insert("GARDN", "GDN");
        m.insert("GATEWAY", "GTWY"); m.insert("GATEWY", "GTWY");
        m.insert("GLEN", "GLN"); m.insert("GLENS", "GLNS");
        m.insert("GREEN", "GRN"); m.insert("GREENS", "GRNS");
        m.insert("GROVE", "GRV"); m.insert("GROVES", "GRVS");
        m.insert("HARBOR", "HBR"); m.insert("HARBORS", "HBRS"); m.insert("HARBR", "HBR");
        m.insert("HAVEN", "HVN");
        m.insert("HEIGHTS", "HTS"); m.insert("HEIGHT", "HTS"); m.insert("HT", "HTS");
        m.insert("HILL", "HL"); m.insert("HILLS", "HLS");
        m.insert("HOLLOW", "HOLW"); m.insert("HOLLOWS", "HOLW"); m.insert("HLLW", "HOLW");
        m.insert("INLET", "INLT");
        m.insert("ISLAND", "IS"); m.insert("ISLANDS", "ISS"); m.insert("ISLND", "IS");
        m.insert("ISLE", "ISLE"); m.insert("ISLES", "ISLE");
        m.insert("JUNCTION", "JCT"); m.insert("JUNCTIONS", "JCTS"); m.insert("JUNCTN", "JCT");
        m.insert("KEY", "KY"); m.insert("KEYS", "KYS");
        m.insert("KNOLL", "KNL"); m.insert("KNOLLS", "KNLS");
        m.insert("LAKE", "LK"); m.insert("LAKES", "LKS");
        m.insert("LANDING", "LNDG"); m.insert("LANDNG", "LNDG");
        m.insert("LIGHT", "LGT"); m.insert("LIGHTS", "LGTS");
        m.insert("LOAF", "LF");
        m.insert("LOCK", "LCK"); m.insert("LOCKS", "LCKS");
        m.insert("LODGE", "LDG"); m.insert("LDGE", "LDG");
        m.insert("LOOP", "LOOP");
        m.insert("MALL", "MALL");
        m.insert("MANOR", "MNR"); m.insert("MANORS", "MNRS");
        m.insert("MEADOW", "MDW"); m.insert("MEADOWS", "MDWS"); m.insert("MEDOWS", "MDWS");
        m.insert("MEWS", "MEWS");
        m.insert("MILL", "ML"); m.insert("MILLS", "MLS");
        m.insert("MISSION", "MSN"); m.insert("MISSN", "MSN");
        m.insert("MOTORWAY", "MTWY");
        m.insert("MOUNT", "MT"); m.insert("MOUNTAIN", "MTN"); m.insert("MOUNTAINS", "MTNS");
        m.insert("NECK", "NCK");
        m.insert("ORCHARD", "ORCH"); m.insert("ORCHRD", "ORCH");
        m.insert("OVAL", "OVAL"); m.insert("OVL", "OVAL");
        m.insert("OVERPASS", "OPAS");
        m.insert("PARK", "PARK"); m.insert("PARKS", "PARK"); m.insert("PRK", "PARK");
        m.insert("PASSAGE", "PSGE");
        m.insert("PINE", "PNE"); m.insert("PINES", "PNES");
        m.insert("PLAIN", "PLN"); m.insert("PLAINS", "PLNS");
        m.insert("PLAZA", "PLZ"); m.insert("PLZA", "PLZ");
        m.insert("PORT", "PRT"); m.insert("PORTS", "PRTS");
        m.insert("PRAIRIE", "PR"); m.insert("PRR", "PR");
        m.insert("RADIAL", "RADL"); m.insert("RAD", "RADL");
        m.insert("RAMP", "RAMP");
        m.insert("RANCH", "RNCH"); m.insert("RANCHES", "RNCH");
        m.insert("RAPID", "RPD"); m.insert("RAPIDS", "RPDS");
        m.insert("REST", "RST");
        m.insert("RIVER", "RIV"); m.insert("RVR", "RIV"); m.insert("RIVR", "RIV");
        m.insert("ROW", "ROW");
        m.insert("RUN", "RUN");
        m.insert("SHOAL", "SHL"); m.insert("SHOALS", "SHLS");
        m.insert("SHORE", "SHR"); m.insert("SHORES", "SHRS");
        m.insert("SKYWAY", "SKWY");
        m.insert("SPRING", "SPG"); m.insert("SPRINGS", "SPGS"); m.insert("SPNG", "SPG");
        m.insert("SPUR", "SPUR"); m.insert("SPURS", "SPUR");
        m.insert("STATION", "STA"); m.insert("STATN", "STA");
        m.insert("STRAVENUE", "STRA"); m.insert("STRAVEN", "STRA");
        m.insert("STREAM", "STRM"); m.insert("STREME", "STRM");
        m.insert("SUMMIT", "SMT"); m.insert("SUMIT", "SMT"); m.insert("SUMITT", "SMT");
        m.insert("THROUGHWAY", "TRWY");
        m.insert("TRACE", "TRCE"); m.insert("TRACES", "TRCE");
        m.insert("TRACK", "TRAK"); m.insert("TRACKS", "TRAK"); m.insert("TRK", "TRAK");
        m.insert("TRAFFICWAY", "TRFY");
        m.insert("TUNNEL", "TUNL"); m.insert("TUNNELS", "TUNL"); m.insert("TUNLS", "TUNL");
        m.insert("TURNPIKE", "TPKE"); m.insert("TURNPK", "TPKE");
        m.insert("UNDERPASS", "UPAS");
        m.insert("UNION", "UN"); m.insert("UNIONS", "UNS");
        m.insert("VALLEY", "VLY"); m.insert("VALLEYS", "VLYS"); m.insert("VALLY", "VLY");
        m.insert("VIADUCT", "VIA"); m.insert("VIADCT", "VIA");
        m.insert("VIEW", "VW"); m.insert("VIEWS", "VWS");
        m.insert("VILLAGE", "VLG"); m.insert("VILLAGES", "VLGS"); m.insert("VILLG", "VLG");
        m.insert("VILLE", "VL");
        m.insert("VISTA", "VIS"); m.insert("VST", "VIS"); m.insert("VSTA", "VIS");
        m.insert("WALK", "WALK"); m.insert("WALKS", "WALK");
        m.insert("WALL", "WALL");
        m.insert("WAYS", "WAYS");
        m.insert("WELL", "WL"); m.insert("WELLS", "WLS");
        m
    };

    /// Directional standardization
    static ref DIRECTIONALS: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("NORTH", "N"); m.insert("NO", "N");
        m.insert("SOUTH", "S"); m.insert("SO", "S");
        m.insert("EAST", "E");
        m.insert("WEST", "W");
        m.insert("NORTHEAST", "NE"); m.insert("NORTH EAST", "NE");
        m.insert("NORTHWEST", "NW"); m.insert("NORTH WEST", "NW");
        m.insert("SOUTHEAST", "SE"); m.insert("SOUTH EAST", "SE");
        m.insert("SOUTHWEST", "SW"); m.insert("SOUTH WEST", "SW");
        m
    };

    /// Unit type standardization
    static ref UNIT_TYPES: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("APARTMENT", "APT"); m.insert("APARTMNT", "APT");
        m.insert("SUITE", "STE"); m.insert("SUIT", "STE");
        m.insert("UNIT", "UNIT"); m.insert("UN", "UNIT");
        m.insert("FLOOR", "FL"); m.insert("FLR", "FL");
        m.insert("ROOM", "RM");
        m.insert("BUILDING", "BLDG"); m.insert("BLDNG", "BLDG");
        m.insert("DEPARTMENT", "DEPT");
        m.insert("PENTHOUSE", "PH");
        m.insert("BASEMENT", "BSMT");
        m.insert("FRONT", "FRNT");
        m.insert("REAR", "REAR");
        m.insert("SIDE", "SIDE");
        m.insert("UPPER", "UPPR");
        m.insert("LOWER", "LOWR");
        m.insert("OFFICE", "OFC");
        m.insert("HANGAR", "HNGR");
        m.insert("LOT", "LOT");
        m.insert("PIER", "PIER");
        m.insert("SLIP", "SLIP");
        m.insert("SPACE", "SPC");
        m.insert("STOP", "STOP");
        m.insert("TRAILER", "TRLR");
        m
    };
}

// ============================================================================
// ADDRESS NORMALIZER
// ============================================================================

/// Address normalizer and parser
#[derive(Debug, Clone)]
pub struct AddressNormalizer {
    /// Whether to be strict about validation
    strict_mode: bool,
}

impl Default for AddressNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl AddressNormalizer {
    /// Create a new address normalizer
    pub fn new() -> Self {
        Self { strict_mode: false }
    }

    /// Create normalizer with strict validation
    pub fn strict() -> Self {
        Self { strict_mode: true }
    }

    /// Normalize a raw address input
    pub fn normalize(&self, input: &RawAddressInput) -> Result<NormalizedAddress, AddressValidationError> {
        // First, validate the input
        let validation = self.validate(input);
        if !validation.is_valid && self.strict_mode {
            if let Some(err) = validation.errors.first() {
                return Err(err.clone());
            }
        }

        // Parse the address components
        let (street_number, predirectional, street_name, suffix, postdirectional, unit_type, unit_number) =
            self.parse_street_address(&input.line1, input.line2.as_deref());

        // Normalize city
        let city = self.normalize_city(&input.city);

        // Normalize state
        let state = self.normalize_state(&input.state)?;

        // Parse ZIP
        let (zip5, zip4) = self.parse_zip(&input.zip);

        // Calculate confidence
        let confidence = self.calculate_confidence(&street_name, &city, &state, &zip5);

        Ok(NormalizedAddress {
            original: input.clone(),
            street_number,
            predirectional,
            street_name,
            suffix,
            postdirectional,
            unit_type,
            unit_number,
            city,
            state,
            zip5,
            zip4,
            county: input.county.clone(),
            county_fips: None, // Will be set by geocoding
            is_valid: validation.is_valid,
            validation_notes: validation.warnings,
            confidence,
        })
    }

    /// Validate address input
    pub fn validate(&self, input: &RawAddressInput) -> AddressValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut suggestions = Vec::new();

        // Check required fields
        if input.line1.trim().is_empty() {
            errors.push(AddressValidationError {
                field: "line1".to_string(),
                message: "Street address is required".to_string(),
                code: AddressErrorCode::MissingRequired,
            });
        }

        if input.city.trim().is_empty() {
            errors.push(AddressValidationError {
                field: "city".to_string(),
                message: "City is required".to_string(),
                code: AddressErrorCode::MissingRequired,
            });
        }

        if input.state.trim().is_empty() {
            errors.push(AddressValidationError {
                field: "state".to_string(),
                message: "State is required".to_string(),
                code: AddressErrorCode::MissingRequired,
            });
        } else {
            let state_upper = input.state.trim().to_uppercase();
            if !VALID_STATES.contains_key(state_upper.as_str()) {
                errors.push(AddressValidationError {
                    field: "state".to_string(),
                    message: format!("Invalid state code: {}", input.state),
                    code: AddressErrorCode::InvalidState,
                });
            }
        }

        if input.zip.trim().is_empty() {
            errors.push(AddressValidationError {
                field: "zip".to_string(),
                message: "ZIP code is required".to_string(),
                code: AddressErrorCode::MissingRequired,
            });
        } else {
            let zip_clean: String = input.zip.chars().filter(|c| c.is_ascii_digit()).collect();
            if zip_clean.len() != 5 && zip_clean.len() != 9 {
                errors.push(AddressValidationError {
                    field: "zip".to_string(),
                    message: "ZIP code must be 5 or 9 digits".to_string(),
                    code: AddressErrorCode::InvalidZip,
                });
            }
        }

        // Warnings for potential issues
        if input.line1.len() > 100 {
            warnings.push("Address line 1 is unusually long".to_string());
        }

        // Check for PO Box (which affects tax jurisdiction)
        let line1_upper = input.line1.to_uppercase();
        if line1_upper.contains("PO BOX") || line1_upper.contains("P.O. BOX") || line1_upper.contains("P O BOX") {
            warnings.push("PO Box addresses may have different tax jurisdiction than physical location".to_string());
            suggestions.push("Consider using physical street address for accurate tax calculation".to_string());
        }

        AddressValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            suggestions,
        }
    }

    /// Parse street address into components
    fn parse_street_address(
        &self,
        line1: &str,
        line2: Option<&str>,
    ) -> (Option<String>, Option<String>, String, Option<String>, Option<String>, Option<String>, Option<String>) {
        let mut street_number = None;
        let mut predirectional = None;
        #[allow(unused_assignments)]
        let mut street_name = String::new();
        let mut suffix = None;
        let mut postdirectional = None;
        let mut unit_type = None;
        let mut unit_number = None;

        // Normalize the input
        let combined = if let Some(l2) = line2 {
            format!("{} {}", line1, l2)
        } else {
            line1.to_string()
        };

        let normalized = combined
            .to_uppercase()
            .replace(',', " ")
            .replace('.', " ")
            .replace('#', " # ");

        let tokens: Vec<&str> = normalized.split_whitespace().collect();

        if tokens.is_empty() {
            return (None, None, String::new(), None, None, None, None);
        }

        let mut idx = 0;

        // 1. Extract street number (first numeric token)
        if let Some(first) = tokens.first() {
            if first.chars().all(|c| c.is_ascii_digit() || c == '-') {
                street_number = Some(first.to_string());
                idx = 1;
            }
        }

        // 2. Check for pre-directional
        if idx < tokens.len() {
            let token = tokens[idx];
            if let Some(dir) = DIRECTIONALS.get(token) {
                predirectional = Some(dir.to_string());
                idx += 1;
            } else if ["N", "S", "E", "W", "NE", "NW", "SE", "SW"].contains(&token) {
                predirectional = Some(token.to_string());
                idx += 1;
            }
        }

        // 3. Collect street name tokens until we hit a suffix or unit
        let mut name_tokens = Vec::new();
        while idx < tokens.len() {
            let token = tokens[idx];

            // Check if this is a suffix
            if STREET_SUFFIXES.contains_key(token) || STREET_SUFFIXES.values().any(|&v| v == token) {
                suffix = Some(
                    STREET_SUFFIXES
                        .get(token)
                        .copied()
                        .unwrap_or(token)
                        .to_string(),
                );
                idx += 1;
                break;
            }

            // Check if this is a unit type
            if UNIT_TYPES.contains_key(token) || UNIT_TYPES.values().any(|&v| v == token) || token == "#" {
                break;
            }

            name_tokens.push(token);
            idx += 1;
        }

        street_name = name_tokens.join(" ");

        // 4. Check for post-directional after suffix
        if idx < tokens.len() {
            let token = tokens[idx];
            if let Some(dir) = DIRECTIONALS.get(token) {
                postdirectional = Some(dir.to_string());
                idx += 1;
            } else if ["N", "S", "E", "W", "NE", "NW", "SE", "SW"].contains(&token) {
                postdirectional = Some(token.to_string());
                idx += 1;
            }
        }

        // 5. Extract unit information
        if idx < tokens.len() {
            let token = tokens[idx];

            // Handle "#" notation
            if token == "#" {
                unit_type = Some("#".to_string());
                idx += 1;
                if idx < tokens.len() {
                    unit_number = Some(tokens[idx].to_string());
                }
            } else if let Some(ut) = UNIT_TYPES.get(token) {
                unit_type = Some(ut.to_string());
                idx += 1;
                if idx < tokens.len() {
                    unit_number = Some(tokens[idx].to_string());
                }
            } else if UNIT_TYPES.values().any(|&v| v == token) {
                unit_type = Some(token.to_string());
                idx += 1;
                if idx < tokens.len() {
                    unit_number = Some(tokens[idx].to_string());
                }
            }
        }

        (
            street_number,
            predirectional,
            street_name,
            suffix,
            postdirectional,
            unit_type,
            unit_number,
        )
    }

    /// Normalize city name
    fn normalize_city(&self, city: &str) -> String {
        city.trim()
            .to_uppercase()
            .replace('.', "")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Normalize state code
    fn normalize_state(&self, state: &str) -> Result<String, AddressValidationError> {
        let state_upper = state.trim().to_uppercase();

        // Check if it's already a valid 2-letter code
        if VALID_STATES.contains_key(state_upper.as_str()) {
            return Ok(state_upper);
        }

        // Check if it's a full state name
        for (code, name) in VALID_STATES.iter() {
            if *name == state_upper {
                return Ok(code.to_string());
            }
        }

        Err(AddressValidationError {
            field: "state".to_string(),
            message: format!("Invalid state: {}", state),
            code: AddressErrorCode::InvalidState,
        })
    }

    /// Parse ZIP code
    fn parse_zip(&self, zip: &str) -> (String, Option<String>) {
        let clean: String = zip.chars().filter(|c| c.is_ascii_digit()).collect();

        match clean.len() {
            5 => (clean, None),
            9 => (clean[..5].to_string(), Some(clean[5..].to_string())),
            _ => {
                // Try to extract 5 digits
                if clean.len() >= 5 {
                    (clean[..5].to_string(), None)
                } else {
                    (clean, None)
                }
            }
        }
    }

    /// Calculate confidence score based on completeness
    fn calculate_confidence(
        &self,
        street_name: &str,
        city: &str,
        state: &str,
        zip: &str,
    ) -> f64 {
        let mut score = 0.0;

        if !street_name.is_empty() {
            score += 0.25;
        }
        if !city.is_empty() {
            score += 0.25;
        }
        if !state.is_empty() && state.len() == 2 {
            score += 0.25;
        }
        if zip.len() == 5 {
            score += 0.25;
        }

        score
    }

    /// Format address as single line (USPS standard)
    pub fn format_single_line(&self, addr: &NormalizedAddress) -> String {
        let mut parts = Vec::new();

        // Street line
        if let Some(ref num) = addr.street_number {
            parts.push(num.clone());
        }
        if let Some(ref dir) = addr.predirectional {
            parts.push(dir.clone());
        }
        parts.push(addr.street_name.clone());
        if let Some(ref suf) = addr.suffix {
            parts.push(suf.clone());
        }
        if let Some(ref dir) = addr.postdirectional {
            parts.push(dir.clone());
        }
        if let Some(ref ut) = addr.unit_type {
            parts.push(ut.clone());
        }
        if let Some(ref un) = addr.unit_number {
            parts.push(un.clone());
        }

        let street_line = parts.join(" ");

        // City, State ZIP
        let zip_full = if let Some(ref z4) = addr.zip4 {
            format!("{}-{}", addr.zip5, z4)
        } else {
            addr.zip5.clone()
        };

        format!("{}, {} {} {}", street_line, addr.city, addr.state, zip_full)
    }
}

// ============================================================================
// ADDRESS RESOLUTION CONTEXT
// ============================================================================

/// Context for address-based tax resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressResolutionContext {
    /// Normalized address
    pub address: NormalizedAddress,

    /// Resolved county (from geocoding)
    pub county: Option<CountyInfo>,

    /// Resolved city (canonical name)
    pub city_canonical: Option<String>,

    /// Special tax districts
    pub special_districts: Vec<SpecialTaxDistrict>,

    /// Resolution method used
    pub resolution_method: ResolutionMethod,

    /// Geocoding result (if available)
    pub geocode: Option<GeocodeResult>,
}

/// County information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountyInfo {
    /// County name
    pub name: String,

    /// FIPS code (5 digits: 2 state + 3 county)
    pub fips: String,

    /// State FIPS (2 digits)
    pub state_fips: String,

    /// County FIPS (3 digits)
    pub county_fips: String,
}

/// Special tax district (transit, stadium, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialTaxDistrict {
    /// District name
    pub name: String,

    /// District code
    pub code: String,

    /// District type
    pub district_type: SpecialDistrictType,

    /// Tax rate for this district
    pub rate: f64,
}

/// Types of special tax districts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SpecialDistrictType {
    Transit,
    Stadium,
    Tourism,
    Hospital,
    School,
    FireProtection,
    WaterDistrict,
    Other,
}

/// How the address was resolved
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ResolutionMethod {
    /// Exact geocoding match
    Geocoded,
    /// ZIP code centroid
    ZipCentroid,
    /// City name match
    CityMatch,
    /// State default (fallback)
    StateDefault,
    /// Manual override
    Manual,
}

/// Geocoding result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeocodeResult {
    /// Latitude
    pub latitude: f64,

    /// Longitude
    pub longitude: f64,

    /// Formatted address from geocoder
    pub formatted_address: String,

    /// Place ID (Google Places)
    pub place_id: Option<String>,

    /// Geocoding accuracy level
    pub accuracy: GeocodeAccuracy,
}

/// Geocoding accuracy level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GeocodeAccuracy {
    /// Rooftop/exact address
    Rooftop,
    /// Interpolated along street segment
    RangeInterpolated,
    /// Geometric center (approximate)
    GeometricCenter,
    /// Approximate
    Approximate,
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_normalization() {
        let normalizer = AddressNormalizer::new();
        let input = RawAddressInput {
            line1: "123 Main Street".to_string(),
            line2: None,
            city: "Chicago".to_string(),
            state: "IL".to_string(),
            zip: "60601".to_string(),
            county: None,
        };

        let result = normalizer.normalize(&input).unwrap();
        assert_eq!(result.street_number, Some("123".to_string()));
        assert_eq!(result.street_name, "MAIN");
        assert_eq!(result.suffix, Some("ST".to_string()));
        assert_eq!(result.city, "CHICAGO");
        assert_eq!(result.state, "IL");
        assert_eq!(result.zip5, "60601");
    }

    #[test]
    fn test_directional_parsing() {
        let normalizer = AddressNormalizer::new();
        let input = RawAddressInput {
            line1: "456 North Main Ave NW".to_string(),
            line2: None,
            city: "Austin".to_string(),
            state: "TX".to_string(),
            zip: "78701".to_string(),
            county: None,
        };

        let result = normalizer.normalize(&input).unwrap();
        assert_eq!(result.street_number, Some("456".to_string()));
        assert_eq!(result.predirectional, Some("N".to_string()));
        assert_eq!(result.street_name, "MAIN");
        assert_eq!(result.suffix, Some("AVE".to_string()));
        assert_eq!(result.postdirectional, Some("NW".to_string()));
    }

    #[test]
    fn test_unit_parsing() {
        let normalizer = AddressNormalizer::new();
        let input = RawAddressInput {
            line1: "789 Oak Blvd Apt 4B".to_string(),
            line2: None,
            city: "Dallas".to_string(),
            state: "TX".to_string(),
            zip: "75201".to_string(),
            county: None,
        };

        let result = normalizer.normalize(&input).unwrap();
        assert_eq!(result.street_number, Some("789".to_string()));
        assert_eq!(result.street_name, "OAK");
        assert_eq!(result.suffix, Some("BLVD".to_string()));
        assert_eq!(result.unit_type, Some("APT".to_string()));
        assert_eq!(result.unit_number, Some("4B".to_string()));
    }

    #[test]
    fn test_zip_parsing() {
        let normalizer = AddressNormalizer::new();

        // 5-digit ZIP
        let input5 = RawAddressInput {
            line1: "100 Test St".to_string(),
            line2: None,
            city: "Test".to_string(),
            state: "CA".to_string(),
            zip: "90210".to_string(),
            county: None,
        };
        let result5 = normalizer.normalize(&input5).unwrap();
        assert_eq!(result5.zip5, "90210");
        assert_eq!(result5.zip4, None);

        // 9-digit ZIP
        let input9 = RawAddressInput {
            line1: "100 Test St".to_string(),
            line2: None,
            city: "Test".to_string(),
            state: "CA".to_string(),
            zip: "90210-1234".to_string(),
            county: None,
        };
        let result9 = normalizer.normalize(&input9).unwrap();
        assert_eq!(result9.zip5, "90210");
        assert_eq!(result9.zip4, Some("1234".to_string()));
    }

    #[test]
    fn test_state_normalization() {
        let normalizer = AddressNormalizer::new();

        // Full state name
        let input = RawAddressInput {
            line1: "100 Test St".to_string(),
            line2: None,
            city: "Test".to_string(),
            state: "California".to_string(),
            zip: "90210".to_string(),
            county: None,
        };
        let result = normalizer.normalize(&input).unwrap();
        assert_eq!(result.state, "CA");
    }

    #[test]
    fn test_validation() {
        let normalizer = AddressNormalizer::new();

        // Valid address
        let valid = RawAddressInput {
            line1: "123 Main St".to_string(),
            line2: None,
            city: "Chicago".to_string(),
            state: "IL".to_string(),
            zip: "60601".to_string(),
            county: None,
        };
        let valid_result = normalizer.validate(&valid);
        assert!(valid_result.is_valid);

        // Invalid state
        let invalid_state = RawAddressInput {
            line1: "123 Main St".to_string(),
            line2: None,
            city: "Chicago".to_string(),
            state: "XX".to_string(),
            zip: "60601".to_string(),
            county: None,
        };
        let invalid_result = normalizer.validate(&invalid_state);
        assert!(!invalid_result.is_valid);
    }

    #[test]
    fn test_format_single_line() {
        let normalizer = AddressNormalizer::new();
        let input = RawAddressInput {
            line1: "123 N Main St Apt 4".to_string(),
            line2: None,
            city: "Chicago".to_string(),
            state: "IL".to_string(),
            zip: "60601-1234".to_string(),
            county: None,
        };

        let result = normalizer.normalize(&input).unwrap();
        let formatted = normalizer.format_single_line(&result);
        assert!(formatted.contains("123"));
        assert!(formatted.contains("MAIN"));
        assert!(formatted.contains("CHICAGO"));
        assert!(formatted.contains("IL"));
        assert!(formatted.contains("60601"));
    }

    #[test]
    fn test_po_box_warning() {
        let normalizer = AddressNormalizer::new();
        let input = RawAddressInput {
            line1: "PO Box 123".to_string(),
            line2: None,
            city: "Chicago".to_string(),
            state: "IL".to_string(),
            zip: "60601".to_string(),
            county: None,
        };

        let result = normalizer.validate(&input);
        assert!(result.warnings.iter().any(|w| w.contains("PO Box")));
    }

    #[test]
    fn test_customer_address_conversion() {
        let customer = CustomerAddress {
            customer_id: "cust-123".to_string(),
            address: "456 Oak Ave".to_string(),
            city: "Austin".to_string(),
            state: "TX".to_string(),
            zip_code: "78701".to_string(),
        };

        let raw: RawAddressInput = customer.into();
        assert_eq!(raw.line1, "456 Oak Ave");
        assert_eq!(raw.city, "Austin");
        assert_eq!(raw.state, "TX");
        assert_eq!(raw.zip, "78701");
    }
}
