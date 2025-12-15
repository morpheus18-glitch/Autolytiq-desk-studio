# Tax Rate Update Architecture

## Overview

This document describes the architecture for keeping tax rates and rules current without requiring WASM recompilation.

## The Problem

Currently, tax rates are **hardcoded in Rust** and compiled into the WASM binary:

```rust
// CURRENT (BAD): Requires recompilation to change
fn load_indiana_rules() -> Option<TaxRulesConfig> {
    Some(TaxRulesConfig {
        state_code: "IN".to_string(),
        // ... rates hardcoded here
    })
}
```

**Issues:**
- Rate changes require Rust code edits
- Must recompile WASM (5-10 minutes)
- Must redeploy to all environments
- **2-5 day lag** behind actual law changes

## Solution: Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: TAX DATA SOURCES                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Primary:        │  │ Secondary:      │  │ Tertiary:                   │ │
│  │ Avalara/Vertex  │  │ State DOR APIs  │  │ Manual Admin Updates        │ │
│  │ (Real-time)     │  │ (Weekly sync)   │  │ (Emergency overrides)       │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘ │
│           │                    │                          │                 │
│           └────────────────────┼──────────────────────────┘                 │
│                                ▼                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: TAX RULES DATABASE                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL / Redis                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │ state_rates │  │ local_rates │  │ policy_rules│  │ audit_log  │  │   │
│  │  │ (versioned) │  │ (12K+ rows) │  │ (trade-in,  │  │ (changes)  │  │   │
│  │  │             │  │             │  │  rebates)   │  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    ▼                       ▼                               │
│           ┌────────────────┐     ┌────────────────┐                        │
│           │ Tax Rules API  │     │ Admin Dashboard│                        │
│           │ (Go service)   │     │ (React)        │                        │
│           └───────┬────────┘     └────────────────┘                        │
│                   │                                                         │
└───────────────────┼─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: CALCULATION ENGINE                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    WASM Tax Engine (Rust)                            │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ STATIC: Calculation Logic (never changes)                    │    │   │
│  │  │ - DAG pipeline                                               │    │   │
│  │  │ - Reciprocity algorithms                                     │    │   │
│  │  │ - Finance/lease formulas                                     │    │   │
│  │  │ - Special scheme handlers                                    │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                              +                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ DYNAMIC: Rate Data (loaded at runtime via JSON)              │    │   │
│  │  │ - State rates                                                │    │   │
│  │  │ - Local jurisdiction rates                                   │    │   │
│  │  │ - Policy rules (trade-in caps, exemptions)                   │    │   │
│  │  │ - Effective dates                                            │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Schema

### State Rates Table

```sql
CREATE TABLE tax_state_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code CHAR(2) NOT NULL,
    version INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,  -- NULL = currently active

    -- Core rates
    state_rate DECIMAL(6,5) NOT NULL,  -- e.g., 0.07000
    avg_local_rate DECIMAL(6,5),       -- Fallback if no jurisdiction match
    max_local_rate DECIMAL(6,5),

    -- Special schemes
    tax_scheme VARCHAR(20) DEFAULT 'STANDARD',  -- STANDARD, TAVT, HUT, PRIVILEGE
    scheme_rate DECIMAL(6,5),           -- e.g., GA TAVT 7%
    scheme_notes TEXT,

    -- Metadata
    source VARCHAR(50) NOT NULL,        -- 'avalara', 'manual', 'state_dor'
    source_reference TEXT,              -- Link to bulletin/law
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),

    UNIQUE(state_code, version)
);

-- Index for fast lookups
CREATE INDEX idx_state_rates_lookup ON tax_state_rates(state_code, effective_date);
```

### Local Jurisdiction Rates Table

```sql
CREATE TABLE tax_local_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code CHAR(2) NOT NULL,
    jurisdiction_fips VARCHAR(10),      -- County FIPS code
    jurisdiction_name VARCHAR(100) NOT NULL,
    jurisdiction_type VARCHAR(20),      -- 'county', 'city', 'district'

    -- ZIP code mapping
    zip_codes TEXT[],                   -- Array of covered ZIPs

    -- Rates
    local_rate DECIMAL(6,5) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,

    -- Combined rate (state + local for convenience)
    combined_rate DECIMAL(6,5),

    -- Metadata
    source VARCHAR(50) NOT NULL,
    source_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(state_code, jurisdiction_fips, effective_date)
);

-- Index for ZIP lookup
CREATE INDEX idx_local_rates_zip ON tax_local_rates USING GIN(zip_codes);
```

### Policy Rules Table

```sql
CREATE TABLE tax_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code CHAR(2) NOT NULL,
    version INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,

    -- Trade-in policies
    trade_in_policy VARCHAR(20) NOT NULL,  -- 'FULL', 'CAPPED', 'PERCENT', 'NONE'
    trade_in_cap DECIMAL(12,2),             -- For CAPPED policy
    trade_in_percent DECIMAL(5,4),          -- For PERCENT policy
    trade_in_cap_schedule JSONB,            -- For time-based caps (MI)

    -- Rebate rules
    manufacturer_rebate_taxable BOOLEAN DEFAULT FALSE,
    dealer_rebate_taxable BOOLEAN DEFAULT TRUE,

    -- Fee taxability
    doc_fee_taxable BOOLEAN DEFAULT FALSE,
    doc_fee_cap DECIMAL(8,2),              -- Max doc fee (where regulated)

    -- F&I products
    service_contract_taxable BOOLEAN DEFAULT FALSE,
    gap_insurance_taxable BOOLEAN DEFAULT FALSE,

    -- Negative equity
    negative_equity_taxable BOOLEAN DEFAULT FALSE,

    -- Lease-specific
    lease_tax_method VARCHAR(20) DEFAULT 'MONTHLY',  -- 'MONTHLY', 'UPFRONT', 'CAPITALIZED'
    lease_trade_in_credit BOOLEAN DEFAULT TRUE,

    -- Reciprocity
    reciprocity_mode VARCHAR(20) DEFAULT 'NONE',
    reciprocity_days_limit INTEGER,         -- NC has 90-day limit
    reciprocity_proof_required BOOLEAN DEFAULT FALSE,

    -- Source tracking
    source VARCHAR(50) NOT NULL,
    source_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),

    UNIQUE(state_code, version)
);
```

### Audit Log Table

```sql
CREATE TABLE tax_rate_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_reason TEXT,
    ticket_reference VARCHAR(100)  -- Link to support ticket/bulletin
);
```

---

## JSON Schema for WASM Runtime Loading

The WASM engine loads this JSON at initialization:

```json
{
  "schema_version": "2.0",
  "generated_at": "2025-01-15T00:00:00Z",
  "source": "autolytiq-tax-service",

  "states": {
    "IN": {
      "version": 3,
      "effective_date": "2025-01-01",

      "rates": {
        "state_rate": 0.07,
        "avg_local_rate": 0.0,
        "has_local_tax": false
      },

      "policy": {
        "trade_in": {
          "type": "FULL",
          "cap": null,
          "percent": null
        },
        "rebates": {
          "manufacturer_taxable": false,
          "dealer_taxable": true
        },
        "fees": {
          "doc_fee_taxable": false,
          "doc_fee_cap": null
        },
        "fi_products": {
          "service_contract_taxable": false,
          "gap_taxable": false
        },
        "negative_equity_taxable": false
      },

      "lease": {
        "method": "MONTHLY",
        "trade_in_credit": true,
        "tax_cap_reduction": false
      },

      "reciprocity": {
        "mode": "CREDIT",
        "days_limit": null,
        "proof_required": false
      },

      "special_scheme": null
    },

    "GA": {
      "version": 2,
      "effective_date": "2025-01-01",

      "rates": {
        "state_rate": 0.0,
        "avg_local_rate": 0.0,
        "has_local_tax": false
      },

      "policy": {
        "trade_in": {
          "type": "NONE",
          "cap": null,
          "percent": null
        }
      },

      "special_scheme": {
        "type": "TAVT",
        "rate": 0.07,
        "description": "Title Ad Valorem Tax - One-time at titling",
        "applies_to": ["NEW", "USED"],
        "replaces_sales_tax": true
      }
    },

    "MI": {
      "version": 4,
      "effective_date": "2025-01-01",

      "rates": {
        "state_rate": 0.06,
        "avg_local_rate": 0.0,
        "has_local_tax": false
      },

      "policy": {
        "trade_in": {
          "type": "CAPPED",
          "cap": 6000.00,
          "percent": null,
          "schedule": [
            {"effective_date": "2025-01-01", "cap": 6000.00},
            {"effective_date": "2026-01-01", "cap": null, "notes": "Cap eliminated"}
          ]
        }
      }
    }
  },

  "local_jurisdictions": {
    "CA": [
      {
        "name": "Los Angeles County",
        "fips": "06037",
        "local_rate": 0.0025,
        "combined_rate": 0.095,
        "zip_codes": ["90001", "90002", "90003"]
      }
    ]
  },

  "bilateral_matrix": {
    "IN_OH": {"regime": "FULL_CREDIT", "kappa": 1.0},
    "TX_CA": {"regime": "NO_CREDIT", "kappa": 0.0}
  }
}
```

---

## Go Tax Service API

### Endpoints

```
GET  /api/tax/rates/current
     Returns current rate bundle JSON for WASM initialization

GET  /api/tax/rates/state/{code}
     Returns single state's current rules

GET  /api/tax/rates/version/{version}
     Returns specific version (for auditing)

POST /api/tax/rates/validate
     Validates a deal calculation against current rules

GET  /api/tax/jurisdictions?zip={zip}
     Returns jurisdiction for a ZIP code

POST /api/tax/admin/rates (Admin only)
     Updates rates with audit trail

GET  /api/tax/admin/changes?since={date}
     Returns all rate changes since date

GET  /api/tax/admin/audit/{state_code}
     Returns audit history for a state
```

### Rate Bundle Caching

```go
type TaxRateService struct {
    db        *sql.DB
    redis     *redis.Client
    bundleKey string
}

func (s *TaxRateService) GetCurrentBundle() (*RateBundle, error) {
    // Try cache first (5 min TTL)
    cached, err := s.redis.Get(s.bundleKey).Result()
    if err == nil {
        var bundle RateBundle
        json.Unmarshal([]byte(cached), &bundle)
        return &bundle, nil
    }

    // Build from database
    bundle := s.buildBundleFromDB()

    // Cache it
    data, _ := json.Marshal(bundle)
    s.redis.Set(s.bundleKey, data, 5*time.Minute)

    return bundle, nil
}
```

---

## WASM Engine Changes

### New Initialization Function

```rust
// lib.rs - NEW: Initialize with external rate data

/// Initialize the tax engine with external rate data
/// This MUST be called before any calculations
#[wasm_bindgen]
pub fn initialize_rates(rate_bundle_json: &str) -> Result<(), JsValue> {
    let bundle: RateBundle = serde_json::from_str(rate_bundle_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid rate bundle: {}", e)))?;

    // Validate bundle version
    if bundle.schema_version != "2.0" {
        return Err(JsValue::from_str("Incompatible schema version"));
    }

    // Store in thread-local static
    RATE_BUNDLE.with(|cell| {
        cell.replace(Some(bundle));
    });

    Ok(())
}

/// Check if rates are loaded
#[wasm_bindgen]
pub fn rates_loaded() -> bool {
    RATE_BUNDLE.with(|cell| cell.borrow().is_some())
}

/// Get the current rate bundle version
#[wasm_bindgen]
pub fn get_rates_version() -> String {
    RATE_BUNDLE.with(|cell| {
        cell.borrow()
            .as_ref()
            .map(|b| b.generated_at.clone())
            .unwrap_or_else(|| "NOT_LOADED".to_string())
    })
}

// Thread-local storage for rate bundle
thread_local! {
    static RATE_BUNDLE: RefCell<Option<RateBundle>> = RefCell::new(None);
}
```

### Modified State Rules Lookup

```rust
// state_rules.rs - MODIFIED: Look up from runtime bundle first

pub fn get_state_rules(state_code: &str) -> Option<TaxRulesConfig> {
    // First try runtime bundle
    if let Some(rules) = get_rules_from_bundle(state_code) {
        return Some(rules);
    }

    // Fall back to compiled defaults (safety net)
    let all_rules = load_all_state_rules();
    all_rules.get(state_code).cloned()
}

fn get_rules_from_bundle(state_code: &str) -> Option<TaxRulesConfig> {
    RATE_BUNDLE.with(|cell| {
        let bundle = cell.borrow();
        let bundle = bundle.as_ref()?;

        let state_data = bundle.states.get(state_code)?;

        Some(convert_bundle_to_config(state_code, state_data))
    })
}
```

---

## Change Detection & Monitoring

### Automated Monitoring Sources

1. **Avalara Content API** (Primary)
   ```
   GET https://api.avalara.com/content/v2/rates
   Webhook: Tax rate changes pushed to our endpoint
   ```

2. **State DOR RSS Feeds** (Secondary)
   ```
   Many states publish RSS feeds for tax bulletins:
   - California: https://www.cdtfa.ca.gov/news/rss/
   - Texas: https://comptroller.texas.gov/rss/
   - etc.
   ```

3. **Manual Override** (Emergency)
   ```
   Admin dashboard for immediate updates when automated sources lag
   ```

### Change Detection Service

```go
type TaxChangeMonitor struct {
    avalara    *AvalaraClient
    stateFeeds map[string]*RSSFeed
    db         *sql.DB
    alerting   *AlertService
}

func (m *TaxChangeMonitor) CheckForChanges() error {
    // Check Avalara
    changes, err := m.avalara.GetRecentChanges(24 * time.Hour)
    if err != nil {
        m.alerting.Warn("Avalara check failed", err)
    }

    for _, change := range changes {
        m.processChange(change)
    }

    // Check state RSS feeds
    for state, feed := range m.stateFeeds {
        items, err := feed.GetNewItems()
        if err != nil {
            continue
        }
        for _, item := range items {
            if m.isTaxRelated(item) {
                m.alerting.NotifyTaxBulletin(state, item)
            }
        }
    }

    return nil
}

func (m *TaxChangeMonitor) processChange(change AvalaraChange) {
    // 1. Update database
    m.db.Exec(`
        INSERT INTO tax_state_rates (...) VALUES (...)
        ON CONFLICT (state_code, version) DO UPDATE SET ...
    `, change.StateCode, change.NewRate, ...)

    // 2. Invalidate cache
    m.redis.Del("tax_bundle_current")

    // 3. Log to audit trail
    m.logAudit(change)

    // 4. Alert if significant change
    if change.RateDelta > 0.005 { // > 0.5% change
        m.alerting.NotifySignificantChange(change)
    }
}
```

### Alert Channels

```yaml
# alerts.yaml
tax_rate_changes:
  channels:
    - slack: "#tax-updates"
    - email: "tax-team@autolytiq.com"

  thresholds:
    rate_change_alert: 0.005    # Alert if rate changes > 0.5%
    policy_change_alert: true   # Alert on any policy change
    scheme_change_alert: true   # Alert on special scheme changes

  escalation:
    unacknowledged_after: 4h
    escalate_to: "ops-team@autolytiq.com"
```

---

## Admin Dashboard Features

### Rate Management UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tax Rate Administration                                    [Refresh] [Save]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  State: [Indiana (IN) ▼]                     Effective: [2025-01-15]       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RATES                                                                │   │
│  │ ┌────────────────┬────────────────┬────────────────┐                │   │
│  │ │ State Rate     │ Avg Local Rate │ Combined       │                │   │
│  │ │ [7.000    ]%   │ [0.000    ]%   │ 7.000%         │                │   │
│  │ └────────────────┴────────────────┴────────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TRADE-IN POLICY                                                      │   │
│  │ ○ Full Credit  ○ Capped  ○ Percentage  ○ None                       │   │
│  │ Cap Amount: [________]  OR  Percentage: [___]%                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TAXABILITY                                                           │   │
│  │ ☑ Doc Fees    ☐ Service Contracts    ☐ GAP Insurance               │   │
│  │ ☐ Negative Equity    ☑ Accessories                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SOURCE DOCUMENTATION                                                 │   │
│  │ Source: [State DOR Bulletin ▼]                                      │   │
│  │ Reference: [https://dor.in.gov/bulletin-2025-01____________]        │   │
│  │ Notes: [Rate unchanged for 2025_________________________]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Preview Change Impact]  [Save as Draft]  [Publish Immediately]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Change Preview

Before publishing, show impact:
```
This change will affect:
- 1,247 pending deals in Indiana
- Average tax difference: +$42.17 per deal
- Largest impact: Deal #IN-2025-0142 (+$156.00)

[Confirm Publish] [Cancel]
```

---

## Implementation Timeline

### Phase 1: Database & API (1 week)
- [ ] Create PostgreSQL tables
- [ ] Build Go tax service with CRUD endpoints
- [ ] Add Redis caching layer
- [ ] Create JSON bundle generation

### Phase 2: WASM Modification (1 week)
- [ ] Add `initialize_rates()` function
- [ ] Modify state_rules.rs for runtime lookup
- [ ] Add fallback to compiled defaults
- [ ] Update TypeScript wrapper

### Phase 3: Admin Dashboard (1 week)
- [ ] Build React admin UI
- [ ] Add audit trail viewing
- [ ] Add change preview/impact analysis
- [ ] Add role-based access control

### Phase 4: Monitoring (1 week)
- [ ] Integrate Avalara API (or chosen provider)
- [ ] Set up state RSS feed parsing
- [ ] Configure alerting
- [ ] Test change propagation

---

## Success Criteria

1. **Rate updates propagate in < 1 hour** (vs. 2-5 days currently)
2. **Zero recompilation** required for rate changes
3. **Full audit trail** of all changes with source documentation
4. **Automated alerts** for significant changes
5. **Admin can override** rates immediately for emergencies
6. **Fallback to compiled defaults** if runtime data unavailable

---

## Appendix A: Comprehensive Tax Rate Monitoring Sources

### Primary Data Providers (Paid - Recommended)

| Provider | Coverage | Update Frequency | Estimated Cost |
|----------|----------|------------------|----------------|
| **Avalara AvaTax** | 11,000+ jurisdictions | Real-time | $200-500/mo |
| **Vertex Inc.** | Gold standard (used by Ford) | Monthly | $1,000+/mo |
| **TaxJar** | All US jurisdictions | Real-time | $200-500/mo |

**Avalara Free Resources:**
- Monthly downloadable rate files: https://www.avalara.com/taxrates/en/state-rates.html
- Free TaxRates API (limited): https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Free/
- 90-day AvaTax free trial (1,000 transactions/day)

### Secondary: Government Sources (Free)

**Federal Resources:**
- **Tax Foundation** - Comprehensive reports on Jan 1 & July 1
  - 2025 State Tax Changes: https://taxfoundation.org/research/all/state/2025-state-tax-changes/
  - EV Taxes by State: https://taxfoundation.org/data/all/state/electric-vehicle-ev-taxes/
- **NHTSA** - Official State DMV contact list
  - https://www.nhtsa.gov/sites/nhtsa.gov/files/2024-01/States-Dept-of-MV_011224_v4a-tag.pdf

**State Revenue Departments (Priority States):**

| State | Agency | Website | Notes |
|-------|--------|---------|-------|
| GA | Georgia DOR | https://dor.georgia.gov/ | TAVT system |
| NC | NC DMV | https://www.ncdot.gov/dmv/title-registration/taxes/ | HUT system |
| SC | SC DOR | https://dor.sc.gov/ | $500 cap |
| WV | WV DMV | https://transportation.wv.gov/DMV/ | Privilege tax |
| MI | Michigan Treasury | https://www.michigan.gov/treasury | Capped trade-in |
| CA | CDTFA | https://www.cdtfa.ca.gov/ | 400+ jurisdictions |
| TX | Texas Comptroller | https://comptroller.texas.gov/ | High volume |
| FL | Florida DOR | https://floridarevenue.com/ | No trade-in credit |

### Tertiary: Industry Sources

**NADA (National Automobile Dealers Association)**
- Website: https://www.nada.org/
- Quarterly economic analysis
- State franchise law compendium

**State Dealer Associations** (Subscribe to top 10 states):
- California New Car Dealers Association
- Texas Automobile Dealers Association
- Florida Automobile Dealers Association
- Georgia Automobile Dealers Association
- Pennsylvania Automobile Dealers Association
- Full list: https://www.nada.org/atae/directory/member-directory

### Legislative Tracking Services

**LegiScan** (Recommended - Free tier available)
- Website: https://legiscan.com/
- Tracks 176,823+ bills across all 50 states
- Keyword monitors: "motor vehicle tax", "sales tax automotive", "title fee"
- Free: 30,000 API queries/month
- Paid: 100,000-250,000 queries/month

**StateScape**
- Real-time state legislation monitoring
- AI-assisted filtering
- Commercial service

---

## Appendix B: Recommended Monitoring Strategy

### Tier 1: Free Core Monitoring (1-2 hours/month)

**Monthly Tasks:**
1. Download Avalara free monthly rate files
2. Check Tax Foundation for major updates
3. Review Sales Tax Institute rate page
4. Monitor NADA economic analysis reports

**Quarterly Tasks:**
1. Check top 15 state revenue department websites
2. Review state dealer association newsletters
3. Scan LegiScan for automotive-related tax bills

### Tier 2: Semi-Automated Free Monitoring

**Setup (One-time, 4-8 hours):**

1. **Email Subscriptions:**
   - Top 20 state revenue departments (GovDelivery)
   - Key state dealer associations
   - Tax Foundation newsletter
   - NADA email updates

2. **RSS Feed Aggregator:**
   - State DOR RSS feeds (where available)
   - Tax Foundation blog
   - LegiScan custom searches

3. **LegiScan Keyword Monitors:**
   - "motor vehicle tax"
   - "sales tax automotive"
   - "title fee"
   - "registration fee"
   - "trade-in credit"

4. **Avalara Free API Integration:**
   ```bash
   # Monthly cron job to pull rate files
   curl -o /data/rates/avalara-$(date +%Y%m).json \
     "https://api.avalara.com/content/v2/rates"
   ```

### Tier 3: Paid Integration ($200-500/month)

1. **LegiScan Professional** - Real-time legislative tracking
2. **Avalara AvaTax** - Automated rate updates
3. **2-3 State dealer association memberships** - Insider updates

### Tier 4: Enterprise ($1,000+/month)

1. **Vertex or TaxJar** - Full automation with API
2. **Bloomberg Tax Research** - Comprehensive research access
3. **Multiple state association memberships**

---

## Appendix C: Priority States for Manual Monitoring

### Monthly Review (High Volume/Complexity)

1. **California** - Largest market, highest complexity (400+ jurisdictions)
2. **Texas** - High volume, frequent local changes
3. **Florida** - High volume, no trade-in credit
4. **New York** - Strict regulations, frequent updates
5. **Georgia** - TAVT system unique
6. **North Carolina** - HUT system unique
7. **Pennsylvania** - High volume

### Quarterly Review (Special Systems)

- States with recent EV fee changes
- States with doc fee cap changes
- States with pending legislation (via LegiScan alerts)

### Key Metrics to Track Per State

| Metric | Source | Check Frequency |
|--------|--------|-----------------|
| Sales tax rate (state + local) | DOR website | Monthly |
| Title fee | DMV website | Quarterly |
| Registration fee structure | DMV website | Quarterly |
| Doc fee cap | DOR/Legislature | Quarterly |
| Trade-in credit rule | DOR website | Semi-annually |
| Special schemes (TAVT/HUT) | DOR website | Quarterly |
| EV fees | DMV website | Semi-annually |

---

## Appendix D: Implementation Status

### Completed ✅
- [x] Rate bundle JSON schema
- [x] Rust `rate_bundle.rs` module with thread-safe storage
- [x] WASM exports: `initialize_rates()`, `rates_loaded()`, `clear_rates()`
- [x] WASM exports: `get_rate_bundle_info()`, `get_state_rate_info()`
- [x] TypeScript wrapper with full API
- [x] Example rate bundle JSON file
- [x] Tax Configuration admin dashboard (React)

### In Progress 🔄
- [ ] Go Tax Service API endpoints
- [ ] PostgreSQL schema deployment
- [ ] LegiScan API integration
- [ ] Email alert configuration

### Planned 📋
- [ ] Avalara API integration
- [ ] Vertex API integration (enterprise)
- [ ] Automated RSS feed parsing
- [ ] Mobile-friendly admin dashboard
