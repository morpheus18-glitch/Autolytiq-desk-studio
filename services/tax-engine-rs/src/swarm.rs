//! Swarm Jurisdiction Resolver
//!
//! Parallel multi-jurisdiction tax resolution using a swarm of workers.
//! Each jurisdiction (state, county, city, district) is resolved independently
//! and results are aggregated deterministically.
//!
//! # Architecture
//!
//! ```text
//!                    SWARM COORDINATOR
//!                          │
//!          ┌───────────────┼───────────────┐
//!          ▼               ▼               ▼
//!     ┌─────────┐    ┌─────────┐    ┌─────────┐
//!     │ Worker1 │    │ Worker2 │    │ Worker3 │
//!     │ State   │    │ County  │    │ City    │
//!     │ 6.25%   │    │ 1.00%   │    │ 1.00%   │
//!     └────┬────┘    └────┬────┘    └────┬────┘
//!          │               │               │
//!          └───────────────┴───────┬───────┘
//!                                  ▼
//!                          ┌──────────────┐
//!                          │  AGGREGATOR  │
//!                          │  Total: 8.25%│
//!                          └──────────────┘
//! ```
//!
//! # Features
//!
//! - Parallel resolution of independent jurisdictions
//! - Deterministic aggregation
//! - Jurisdiction hierarchy support (state > county > city > district)
//! - Address-based jurisdiction lookup (future: geocoding)

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::chunks::{JurisdictionChunk, JurisdictionEntry, JurisdictionType};

// ============================================================================
// SWARM INPUT/OUTPUT
// ============================================================================

/// Input for jurisdiction resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmInput {
    /// Address for jurisdiction lookup
    pub address: Option<AddressInput>,

    /// Or explicit jurisdiction codes
    pub jurisdiction_codes: Option<Vec<String>>,

    /// State code (required)
    pub state_code: String,

    /// Taxable amount
    pub taxable_amount: f64,
}

/// Address input for geocoding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressInput {
    pub street: Option<String>,
    pub city: Option<String>,
    pub county: Option<String>,
    pub state: String,
    pub zip: Option<String>,
}

/// Single jurisdiction result from a worker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionResult {
    /// Jurisdiction code
    pub code: String,

    /// Jurisdiction name
    pub name: String,

    /// Jurisdiction type
    pub jurisdiction_type: JurisdictionType,

    /// Tax rate
    pub rate: f64,

    /// Tax amount
    pub tax_amount: f64,

    /// Notes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Aggregated swarm output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmOutput {
    /// Individual jurisdiction results
    pub jurisdictions: Vec<JurisdictionResult>,

    /// Combined tax rate
    pub combined_rate: f64,

    /// Combined tax amount
    pub combined_tax: f64,

    /// Taxable amount used
    pub taxable_amount: f64,

    /// Resolution method used
    pub resolution_method: ResolutionMethod,

    /// Execution stats
    pub stats: SwarmStats,
}

/// How jurisdictions were resolved
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResolutionMethod {
    /// Used explicit jurisdiction codes
    ExplicitCodes,
    /// Used address geocoding
    AddressGeocoding,
    /// Used default for state
    StateDefault,
    /// Used ZIP code lookup
    ZipCodeLookup,
}

/// Swarm execution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmStats {
    /// Number of workers spawned
    pub workers_spawned: usize,

    /// Execution time in microseconds
    pub execution_time_us: u64,

    /// Cache hits
    pub cache_hits: usize,
}

// ============================================================================
// SWARM WORKER
// ============================================================================

/// A single worker that resolves one jurisdiction
#[derive(Debug, Clone)]
pub struct SwarmWorker {
    /// Worker ID
    pub id: usize,

    /// Jurisdiction entry
    pub entry: JurisdictionEntry,
}

impl SwarmWorker {
    /// Create a new worker
    pub fn new(id: usize, entry: JurisdictionEntry) -> Self {
        Self { id, entry }
    }

    /// Execute the worker (calculate tax for this jurisdiction)
    pub fn execute(&self, taxable_amount: f64) -> JurisdictionResult {
        let tax_amount = taxable_amount * self.entry.rate;

        JurisdictionResult {
            code: self.entry.code.clone(),
            name: self.entry.name.clone(),
            jurisdiction_type: self.entry.jurisdiction_type,
            rate: self.entry.rate,
            tax_amount: round_currency(tax_amount),
            notes: None,
        }
    }
}

// ============================================================================
// SWARM COORDINATOR
// ============================================================================

/// The main swarm coordinator
#[derive(Debug, Clone)]
pub struct SwarmCoordinator {
    /// Jurisdiction data by state
    jurisdiction_data: HashMap<String, JurisdictionChunk>,

    /// State base rates
    state_rates: HashMap<String, f64>,

    /// ZIP code to jurisdiction mapping (simplified)
    zip_mapping: HashMap<String, Vec<String>>,
}

impl SwarmCoordinator {
    /// Create a new coordinator
    pub fn new() -> Self {
        let mut coordinator = Self {
            jurisdiction_data: HashMap::new(),
            state_rates: HashMap::new(),
            zip_mapping: HashMap::new(),
        };
        coordinator.populate_defaults();
        coordinator
    }

    /// Resolve jurisdictions and calculate tax
    pub fn resolve(&self, input: &SwarmInput) -> SwarmOutput {
        let start = std::time::Instant::now();

        // Get state base rate
        let state_rate = self.state_rates
            .get(&input.state_code.to_uppercase())
            .copied()
            .unwrap_or(0.05);

        // Determine resolution method and get jurisdiction codes
        let (method, jurisdiction_codes) = self.determine_jurisdictions(input);

        // Create workers for each jurisdiction
        let mut workers = vec![];
        let mut results = vec![];

        // Add state as first jurisdiction
        results.push(JurisdictionResult {
            code: input.state_code.to_uppercase(),
            name: format!("{} State Tax", input.state_code.to_uppercase()),
            jurisdiction_type: JurisdictionType::State,
            rate: state_rate,
            tax_amount: round_currency(input.taxable_amount * state_rate),
            notes: None,
        });

        // Add local jurisdictions
        if let Some(chunk) = self.jurisdiction_data.get(&input.state_code.to_uppercase()) {
            for code in &jurisdiction_codes {
                if let Some(entry) = chunk.jurisdictions.iter().find(|j| j.code == *code) {
                    let worker = SwarmWorker::new(workers.len(), entry.clone());
                    results.push(worker.execute(input.taxable_amount));
                    workers.push(worker);
                }
            }
        }

        let elapsed = start.elapsed();

        // Aggregate results
        let combined_rate: f64 = results.iter().map(|r| r.rate).sum();
        let combined_tax: f64 = results.iter().map(|r| r.tax_amount).sum();

        SwarmOutput {
            jurisdictions: results,
            combined_rate,
            combined_tax: round_currency(combined_tax),
            taxable_amount: input.taxable_amount,
            resolution_method: method,
            stats: SwarmStats {
                workers_spawned: workers.len() + 1, // +1 for state
                execution_time_us: elapsed.as_micros() as u64,
                cache_hits: 0,
            },
        }
    }

    /// Determine which jurisdictions apply
    fn determine_jurisdictions(&self, input: &SwarmInput) -> (ResolutionMethod, Vec<String>) {
        // Priority 1: Explicit codes
        if let Some(codes) = &input.jurisdiction_codes {
            if !codes.is_empty() {
                return (ResolutionMethod::ExplicitCodes, codes.clone());
            }
        }

        // Priority 2: Address-based lookup
        if let Some(address) = &input.address {
            // Try ZIP code first
            if let Some(zip) = &address.zip {
                if let Some(codes) = self.zip_mapping.get(zip) {
                    return (ResolutionMethod::ZipCodeLookup, codes.clone());
                }
            }

            // Try city name lookup
            if let Some(city) = &address.city {
                if let Some(chunk) = self.jurisdiction_data.get(&input.state_code.to_uppercase()) {
                    let city_normalized = city.to_uppercase().replace(" ", "_");
                    let matching: Vec<String> = chunk.jurisdictions
                        .iter()
                        .filter(|j| j.code.contains(&city_normalized))
                        .map(|j| j.code.clone())
                        .collect();

                    if !matching.is_empty() {
                        return (ResolutionMethod::AddressGeocoding, matching);
                    }
                }
            }
        }

        // Priority 3: State default (no local taxes)
        (ResolutionMethod::StateDefault, vec![])
    }

    /// Populate default jurisdiction data
    fn populate_defaults(&mut self) {
        // State base rates
        self.state_rates.insert("AL".to_string(), 0.02);
        self.state_rates.insert("AK".to_string(), 0.0);
        self.state_rates.insert("AZ".to_string(), 0.056);
        self.state_rates.insert("AR".to_string(), 0.065);
        self.state_rates.insert("CA".to_string(), 0.0725);
        self.state_rates.insert("CO".to_string(), 0.029);
        self.state_rates.insert("CT".to_string(), 0.0635);
        self.state_rates.insert("DE".to_string(), 0.0);
        self.state_rates.insert("FL".to_string(), 0.06);
        self.state_rates.insert("GA".to_string(), 0.04);
        self.state_rates.insert("HI".to_string(), 0.04);
        self.state_rates.insert("ID".to_string(), 0.06);
        self.state_rates.insert("IL".to_string(), 0.0625);
        self.state_rates.insert("IN".to_string(), 0.07);
        self.state_rates.insert("IA".to_string(), 0.06);
        self.state_rates.insert("KS".to_string(), 0.065);
        self.state_rates.insert("KY".to_string(), 0.06);
        self.state_rates.insert("LA".to_string(), 0.0445);
        self.state_rates.insert("ME".to_string(), 0.055);
        self.state_rates.insert("MD".to_string(), 0.06);
        self.state_rates.insert("MA".to_string(), 0.0625);
        self.state_rates.insert("MI".to_string(), 0.06);
        self.state_rates.insert("MN".to_string(), 0.065);
        self.state_rates.insert("MS".to_string(), 0.07);
        self.state_rates.insert("MO".to_string(), 0.04225);
        self.state_rates.insert("MT".to_string(), 0.0);
        self.state_rates.insert("NE".to_string(), 0.055);
        self.state_rates.insert("NV".to_string(), 0.0685);
        self.state_rates.insert("NH".to_string(), 0.0);
        self.state_rates.insert("NJ".to_string(), 0.06625);
        self.state_rates.insert("NM".to_string(), 0.05125);
        self.state_rates.insert("NY".to_string(), 0.04);
        self.state_rates.insert("NC".to_string(), 0.03);
        self.state_rates.insert("ND".to_string(), 0.05);
        self.state_rates.insert("OH".to_string(), 0.0575);
        self.state_rates.insert("OK".to_string(), 0.045);
        self.state_rates.insert("OR".to_string(), 0.0);
        self.state_rates.insert("PA".to_string(), 0.06);
        self.state_rates.insert("RI".to_string(), 0.07);
        self.state_rates.insert("SC".to_string(), 0.06);
        self.state_rates.insert("SD".to_string(), 0.045);
        self.state_rates.insert("TN".to_string(), 0.07);
        self.state_rates.insert("TX".to_string(), 0.0625);
        self.state_rates.insert("UT".to_string(), 0.0485);
        self.state_rates.insert("VT".to_string(), 0.06);
        self.state_rates.insert("VA".to_string(), 0.043);
        self.state_rates.insert("WA".to_string(), 0.065);
        self.state_rates.insert("WV".to_string(), 0.06);
        self.state_rates.insert("WI".to_string(), 0.05);
        self.state_rates.insert("WY".to_string(), 0.04);
        self.state_rates.insert("DC".to_string(), 0.06);

        // Texas jurisdictions
        let mut tx_chunk = JurisdictionChunk::new("TX", 0.0625);
        tx_chunk.add_jurisdiction(JurisdictionEntry {
            code: "TX_DALLAS".to_string(),
            name: "Dallas".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: None,
            fips_code: Some("48113".to_string()),
        });
        tx_chunk.add_jurisdiction(JurisdictionEntry {
            code: "TX_HOUSTON".to_string(),
            name: "Houston".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: None,
            fips_code: Some("48201".to_string()),
        });
        tx_chunk.add_jurisdiction(JurisdictionEntry {
            code: "TX_SAN_ANTONIO".to_string(),
            name: "San Antonio".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: None,
            fips_code: Some("48029".to_string()),
        });
        tx_chunk.add_jurisdiction(JurisdictionEntry {
            code: "TX_AUSTIN".to_string(),
            name: "Austin".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: None,
            fips_code: Some("48453".to_string()),
        });
        self.jurisdiction_data.insert("TX".to_string(), tx_chunk);

        // California jurisdictions
        let mut ca_chunk = JurisdictionChunk::new("CA", 0.0725);
        ca_chunk.add_jurisdiction(JurisdictionEntry {
            code: "CA_LOS_ANGELES".to_string(),
            name: "Los Angeles".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0225,
            parent_code: None,
            fips_code: Some("06037".to_string()),
        });
        ca_chunk.add_jurisdiction(JurisdictionEntry {
            code: "CA_SAN_FRANCISCO".to_string(),
            name: "San Francisco".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0125,
            parent_code: None,
            fips_code: Some("06075".to_string()),
        });
        ca_chunk.add_jurisdiction(JurisdictionEntry {
            code: "CA_SAN_DIEGO".to_string(),
            name: "San Diego".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0075,
            parent_code: None,
            fips_code: Some("06073".to_string()),
        });
        ca_chunk.add_jurisdiction(JurisdictionEntry {
            code: "CA_SAN_JOSE".to_string(),
            name: "San Jose".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0175,
            parent_code: None,
            fips_code: Some("06085".to_string()),
        });
        self.jurisdiction_data.insert("CA".to_string(), ca_chunk);

        // New York jurisdictions
        let mut ny_chunk = JurisdictionChunk::new("NY", 0.04);
        ny_chunk.add_jurisdiction(JurisdictionEntry {
            code: "NY_NYC".to_string(),
            name: "New York City".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.045,
            parent_code: None,
            fips_code: Some("36061".to_string()),
        });
        ny_chunk.add_jurisdiction(JurisdictionEntry {
            code: "NY_BUFFALO".to_string(),
            name: "Buffalo".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.04,
            parent_code: None,
            fips_code: Some("36029".to_string()),
        });
        self.jurisdiction_data.insert("NY".to_string(), ny_chunk);

        // Florida jurisdictions
        let mut fl_chunk = JurisdictionChunk::new("FL", 0.06);
        fl_chunk.add_jurisdiction(JurisdictionEntry {
            code: "FL_MIAMI_DADE".to_string(),
            name: "Miami-Dade County".to_string(),
            jurisdiction_type: JurisdictionType::County,
            rate: 0.01,
            parent_code: None,
            fips_code: Some("12086".to_string()),
        });
        fl_chunk.add_jurisdiction(JurisdictionEntry {
            code: "FL_HILLSBOROUGH".to_string(),
            name: "Hillsborough County".to_string(),
            jurisdiction_type: JurisdictionType::County,
            rate: 0.015,
            parent_code: None,
            fips_code: Some("12057".to_string()),
        });
        self.jurisdiction_data.insert("FL".to_string(), fl_chunk);

        // Illinois jurisdictions
        let mut il_chunk = JurisdictionChunk::new("IL", 0.0625);
        il_chunk.add_jurisdiction(JurisdictionEntry {
            code: "IL_CHICAGO".to_string(),
            name: "Chicago".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0275,
            parent_code: None,
            fips_code: Some("17031".to_string()),
        });
        il_chunk.add_jurisdiction(JurisdictionEntry {
            code: "IL_COOK_COUNTY".to_string(),
            name: "Cook County".to_string(),
            jurisdiction_type: JurisdictionType::County,
            rate: 0.0175,
            parent_code: None,
            fips_code: Some("17031".to_string()),
        });
        self.jurisdiction_data.insert("IL".to_string(), il_chunk);

        // Sample ZIP code mappings
        self.zip_mapping.insert("90012".to_string(), vec!["CA_LOS_ANGELES".to_string()]);
        self.zip_mapping.insert("94102".to_string(), vec!["CA_SAN_FRANCISCO".to_string()]);
        self.zip_mapping.insert("75201".to_string(), vec!["TX_DALLAS".to_string()]);
        self.zip_mapping.insert("77001".to_string(), vec!["TX_HOUSTON".to_string()]);
        self.zip_mapping.insert("10001".to_string(), vec!["NY_NYC".to_string()]);
        self.zip_mapping.insert("33101".to_string(), vec!["FL_MIAMI_DADE".to_string()]);
        self.zip_mapping.insert("60601".to_string(), vec!["IL_CHICAGO".to_string(), "IL_COOK_COUNTY".to_string()]);
    }

    /// Get all supported states
    pub fn supported_states(&self) -> Vec<&String> {
        self.state_rates.keys().collect()
    }

    /// Get state base rate
    pub fn get_state_rate(&self, state_code: &str) -> Option<f64> {
        self.state_rates.get(&state_code.to_uppercase()).copied()
    }

    /// Get jurisdiction chunk for a state
    pub fn get_jurisdictions(&self, state_code: &str) -> Option<&JurisdictionChunk> {
        self.jurisdiction_data.get(&state_code.to_uppercase())
    }
}

impl Default for SwarmCoordinator {
    fn default() -> Self {
        Self::new()
    }
}

/// Round to currency
fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_swarm_state_only() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: None,
            jurisdiction_codes: None,
            state_code: "IN".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        // Indiana: 7% state only
        assert_eq!(result.jurisdictions.len(), 1);
        assert_eq!(result.combined_rate, 0.07);
        assert_eq!(result.combined_tax, 2100.0);
        assert_eq!(result.resolution_method, ResolutionMethod::StateDefault);
    }

    #[test]
    fn test_swarm_with_local() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: None,
            jurisdiction_codes: Some(vec!["TX_DALLAS".to_string()]),
            state_code: "TX".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        // Texas: 6.25% state + 2% Dallas
        assert_eq!(result.jurisdictions.len(), 2);
        assert!((result.combined_rate - 0.0825).abs() < 0.0001);
        assert_eq!(result.combined_tax, 2475.0);
        assert_eq!(result.resolution_method, ResolutionMethod::ExplicitCodes);
    }

    #[test]
    fn test_swarm_zip_lookup() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: Some(AddressInput {
                street: Some("123 Main St".to_string()),
                city: None,
                county: None,
                state: "CA".to_string(),
                zip: Some("90012".to_string()),
            }),
            jurisdiction_codes: None,
            state_code: "CA".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        // California LA: 7.25% state + 2.25% LA
        assert_eq!(result.jurisdictions.len(), 2);
        assert!((result.combined_rate - 0.095).abs() < 0.0001);
        assert_eq!(result.resolution_method, ResolutionMethod::ZipCodeLookup);
    }

    #[test]
    fn test_swarm_chicago_stacking() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: Some(AddressInput {
                street: None,
                city: None,
                county: None,
                state: "IL".to_string(),
                zip: Some("60601".to_string()),
            }),
            jurisdiction_codes: None,
            state_code: "IL".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        // Illinois Chicago: 6.25% state + 2.75% city + 1.75% county
        assert_eq!(result.jurisdictions.len(), 3);
        assert!((result.combined_rate - 0.1075).abs() < 0.0001);
    }

    #[test]
    fn test_swarm_stats() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: None,
            jurisdiction_codes: Some(vec!["TX_DALLAS".to_string()]),
            state_code: "TX".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        assert_eq!(result.stats.workers_spawned, 2); // State + Dallas
    }

    #[test]
    fn test_state_rates() {
        let coordinator = SwarmCoordinator::new();

        assert_eq!(coordinator.get_state_rate("TX"), Some(0.0625));
        assert_eq!(coordinator.get_state_rate("CA"), Some(0.0725));
        assert_eq!(coordinator.get_state_rate("IN"), Some(0.07));
        assert_eq!(coordinator.get_state_rate("OR"), Some(0.0)); // No sales tax
        assert_eq!(coordinator.get_state_rate("XX"), None); // Unknown state
    }

    #[test]
    fn test_city_name_lookup() {
        let coordinator = SwarmCoordinator::new();
        let input = SwarmInput {
            address: Some(AddressInput {
                street: None,
                city: Some("Dallas".to_string()),
                county: None,
                state: "TX".to_string(),
                zip: None,
            }),
            jurisdiction_codes: None,
            state_code: "TX".to_string(),
            taxable_amount: 30000.0,
        };

        let result = coordinator.resolve(&input);

        // Should find Dallas via city name
        assert!(result.jurisdictions.iter().any(|j| j.code == "TX_DALLAS"));
    }
}
