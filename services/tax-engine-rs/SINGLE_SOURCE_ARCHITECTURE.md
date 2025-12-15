# Tax Engine Single Source of Truth Architecture

## Overview

The tax engine follows a **Single Source of Truth (SSOT)** architecture where:

- **TypeScript rules** in `/shared/autoTaxEngine/rules/` are the ONLY authoritative source
- **JSON bundle** is generated from TypeScript via `scripts/export-tax-rules.ts`
- **Rust WASM** loads the JSON bundle at runtime (no recompilation needed)

```
┌─────────────────────────────┐
│   TypeScript Rules          │
│   /shared/autoTaxEngine/    │  ← SINGLE SOURCE OF TRUTH
│   rules/US_*.ts             │
└─────────────┬───────────────┘
              │
              │ npx tsx scripts/export-tax-rules.ts
              ↓
┌─────────────────────────────┐
│   JSON Bundle               │
│   tax-rules-bundle.json     │  ← Generated artifact
│   rate-bundle.json          │
└─────────────┬───────────────┘
              │
              │ initialize_state_rules(bundleJson)
              ↓
┌─────────────────────────────┐
│   Rust WASM Engine          │
│   src/rules_bundle.rs       │  ← Runtime loader
│   src/lib.rs (exports)      │
└─────────────────────────────┘
```

## Why This Architecture?

### Problems with Duplicated Code (Before)

1. **Drift**: TypeScript and Rust rules could diverge
2. **Maintenance Nightmare**: Every rule change required updates in two places
3. **Testing Complexity**: Had to test both implementations
4. **Risk**: Could show R&R demo with wrong calculations

### Benefits of SSOT (Now)

1. **Single Edit Point**: Change TypeScript, regenerate bundle, done
2. **Guaranteed Consistency**: Rust always uses the same rules as TypeScript
3. **Runtime Updates**: Update rates without WASM recompilation
4. **Audit Trail**: JSON bundle has checksum, timestamp, source info
5. **Version Control**: TypeScript files are well-documented, reviewable

## File Structure

```
autolytiq-desk-studio/
├── shared/
│   └── autoTaxEngine/
│       ├── rules/              ← SOURCE OF TRUTH (51 files)
│       │   ├── index.ts        ← Exports all states
│       │   ├── US_IN.ts        ← Indiana rules (36KB, heavily documented)
│       │   ├── US_TX.ts        ← Texas rules
│       │   └── ...             ← All 50 states + DC
│       ├── types.ts            ← Type definitions
│       ├── index.ts            ← Main exports
│       └── wasm-wrapper.ts     ← TypeScript wrapper for WASM
│
├── scripts/
│   └── export-tax-rules.ts     ← Bundle generator script
│
└── services/
    └── tax-engine-rs/
        ├── src/
        │   ├── lib.rs                  ← WASM exports
        │   ├── rules_bundle.rs         ← JSON bundle loader (NEW)
        │   ├── state_rules.rs          ← DEPRECATED fallback
        │   └── types.rs                ← Rust type definitions
        ├── tax-rules-bundle.json       ← Generated bundle (245KB)
        ├── rate-bundle.json            ← Generated rates (30KB)
        └── SINGLE_SOURCE_ARCHITECTURE.md  ← This file
```

## Workflow

### Making a Rule Change

1. **Edit TypeScript**: Modify the appropriate `US_*.ts` file
   ```bash
   # Example: Update Indiana's doc fee cap
   code shared/autoTaxEngine/rules/US_IN.ts
   ```

2. **Increment Version**: Update the `version` field
   ```typescript
   export const US_IN: TaxRulesConfig = {
     stateCode: "IN",
     version: 3,  // Was 2, now 3
     // ...
   };
   ```

3. **Regenerate Bundle**: Run the export script
   ```bash
   npx tsx scripts/export-tax-rules.ts --pretty
   ```

4. **Deploy Bundle**: Copy `tax-rules-bundle.json` to your deployment

5. **No WASM Rebuild Needed**: The Rust engine loads rules at runtime

### Application Startup

```typescript
// In your application initialization
import { initializeTaxRates, initStateRules } from './shared/autoTaxEngine';

async function initTaxEngine() {
  // Load the JSON bundle
  const bundleResponse = await fetch('/tax-rules-bundle.json');
  const bundleJson = await bundleResponse.text();

  // Initialize the WASM engine
  const result = initStateRules(bundleJson);

  if (!result.success) {
    console.error('Failed to initialize tax rules:', result.error);
    // Falls back to compiled defaults (may be outdated)
  }

  console.log(`Loaded ${result.state_count} states from bundle ${result.bundle_id}`);
}
```

## API Reference

### WASM Exports (from lib.rs)

| Function | Description |
|----------|-------------|
| `initialize_state_rules(json)` | Load rules from JSON bundle |
| `state_rules_loaded()` | Check if bundle is loaded |
| `clear_state_rules()` | Clear loaded rules |
| `get_rules_bundle_info()` | Get bundle metadata |
| `get_state_rules_v2(code)` | Get rules (prefers bundle, falls back to compiled) |
| `get_bundle_states()` | List states in loaded bundle |

### Rate Loading (separate system)

| Function | Description |
|----------|-------------|
| `initialize_rates(json)` | Load rate bundle |
| `rates_loaded()` | Check if rates loaded |
| `get_state_tax_rate(code)` | Get rate (prefers bundle) |

## Bundle Schema

### tax-rules-bundle.json

```json
{
  "metadata": {
    "bundle_id": "tax-rules-1765764224522",
    "bundle_version": "1.0.0",
    "generated_at": "2025-12-15T02:03:44.522Z",
    "state_count": 50,
    "source": "shared/autoTaxEngine/rules",
    "schema_version": "1.0",
    "checksum": "d16f1a7bbc18268a"
  },
  "states": {
    "AL": { /* full state rules */ },
    "IN": { /* full state rules */ },
    // ... all 50 states
  }
}
```

### State Rule Entry

```json
{
  "state_code": "IN",
  "version": 2,
  "trade_in_policy": { "type": "FULL" },
  "rebates": [
    { "applies_to": "MANUFACTURER", "taxable": false }
  ],
  "doc_fee_taxable": true,
  "fee_tax_rules": [...],
  "vehicle_tax_scheme": "STATE_ONLY",
  "lease_rules": { ... },
  "reciprocity": { ... },
  "extras": {
    "state_automotive_sales_rate": 0.07
  }
}
```

## Deprecation Plan

### Phase 1 (Current)
- ✅ JSON bundle loader implemented
- ✅ Export script created
- ✅ WASM exports added
- ⬜ state_rules.rs marked deprecated

### Phase 2 (Next)
- Remove state_rules.rs completely
- Require bundle initialization before any calculation
- Update all clients to load bundle at startup

### Phase 3 (Future)
- Bundle served from Tax Service API
- Automatic rate updates from monitoring
- Version history and rollback capability

## Troubleshooting

### "Using compiled default rates"

This message means no bundle was loaded. Either:
1. `initialize_state_rules()` wasn't called
2. The bundle JSON was invalid
3. Bundle loading failed

**Solution**: Ensure `initialize_state_rules(bundleJson)` is called at app startup.

### Bundle checksum mismatch

If you suspect rules changed unexpectedly:
1. Check the `checksum` field in metadata
2. Regenerate bundle and compare
3. Review TypeScript changes in git

### Missing state rules

If `get_state_rules_v2()` returns null:
1. Check if bundle is loaded: `state_rules_loaded()`
2. Check available states: `get_bundle_states()`
3. Verify state code is uppercase (e.g., "IN" not "in")
