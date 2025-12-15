#!/usr/bin/env npx tsx
/**
 * TAX RULES EXPORT SCRIPT
 *
 * Exports TypeScript state tax rules to a JSON bundle for Rust/WASM consumption.
 *
 * The TypeScript rules in /shared/autoTaxEngine/rules/ are the SINGLE SOURCE OF TRUTH.
 * This script generates a JSON bundle that the Rust WASM engine loads at runtime,
 * eliminating the need for duplicate Rust implementations.
 *
 * Usage:
 *   npx tsx scripts/export-tax-rules.ts
 *   npx tsx scripts/export-tax-rules.ts --output ./custom-path.json
 *   npx tsx scripts/export-tax-rules.ts --pretty
 *
 * Output:
 *   Creates a versioned JSON bundle at /services/tax-engine-rs/tax-rules-bundle.json
 *
 * The bundle format is compatible with the rate_bundle.rs loader.
 */

import { STATE_RULES_MAP, getAllStateCodes } from "../shared/autoTaxEngine/rules";
import type { TaxRulesConfig } from "../shared/autoTaxEngine/types";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// TYPES - JSON Bundle Schema
// =============================================================================

interface RulesBundleMetadata {
  bundle_id: string;
  bundle_version: string;
  generated_at: string;
  state_count: number;
  source: string;
  schema_version: string;
  checksum: string;
}

interface StateRuleEntry {
  state_code: string;
  version: number;
  // Core retail rules
  trade_in_policy: TradeInPolicyJson;
  rebates: RebateRuleJson[];
  doc_fee_taxable: boolean;
  fee_tax_rules: FeeTaxRuleJson[];
  tax_on_accessories: boolean;
  tax_on_negative_equity: boolean;
  tax_on_service_contracts: boolean;
  tax_on_gap: boolean;
  vehicle_tax_scheme: string;
  vehicle_uses_local_sales_tax: boolean;
  // Lease rules
  lease_rules: LeaseRulesJson;
  // Reciprocity
  reciprocity: ReciprocityRulesJson;
  // Extras (simplified for WASM)
  extras?: StateExtrasJson;
}

interface TradeInPolicyJson {
  type: "NONE" | "FULL" | "CAPPED" | "PERCENT";
  cap_amount?: number;
  percent?: number;
  notes?: string;
}

interface RebateRuleJson {
  applies_to: "MANUFACTURER" | "DEALER" | "ANY";
  taxable: boolean;
  notes?: string;
}

interface FeeTaxRuleJson {
  code: string;
  taxable: boolean;
  notes?: string;
}

interface LeaseRulesJson {
  method: string;
  tax_cap_reduction: boolean;
  rebate_behavior: string;
  doc_fee_taxability: string;
  trade_in_credit: string;
  negative_equity_taxable: boolean;
  fee_tax_rules: FeeTaxRuleJson[];
  title_fee_rules: TitleFeeRuleJson[];
  tax_fees_upfront: boolean;
  special_scheme: string;
  notes?: string;
}

interface TitleFeeRuleJson {
  code: string;
  taxable: boolean;
  included_in_cap_cost: boolean;
  included_in_upfront: boolean;
  included_in_monthly: boolean;
}

interface ReciprocityRulesJson {
  enabled: boolean;
  scope: string;
  home_state_behavior: string;
  require_proof_of_tax_paid: boolean;
  basis: string;
  cap_at_this_states_tax: boolean;
  has_lease_exception: boolean;
  notes?: string;
}

interface StateExtrasJson {
  state_automotive_sales_rate?: number;
  state_automotive_lease_rate?: number;
  local_tax_range?: { min: number; max: number };
  combined_rate_range?: { min: number; max: number };
  doc_fee_cap?: number | null;
  title_fee?: number;
  notes?: string;
  status?: string;
  // Special schemes
  ga_tavt?: {
    default_rate: number;
    use_assessed_value: boolean;
    allow_trade_in_credit: boolean;
  };
  nc_hut?: {
    base_rate: number;
    use_highway_use_tax: boolean;
    max_reciprocity_age_days: number;
  };
  wv_privilege?: {
    base_rate: number;
    use_assessed_value: boolean;
    allow_trade_in_credit: boolean;
  };
  sc_cap?: {
    cap_amount: number;
    state_rate: number;
  };
}

interface RulesBundle {
  metadata: RulesBundleMetadata;
  states: Record<string, StateRuleEntry>;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

function convertTradeInPolicy(policy: TaxRulesConfig["tradeInPolicy"]): TradeInPolicyJson {
  switch (policy.type) {
    case "NONE":
      return { type: "NONE", notes: policy.notes };
    case "FULL":
      return { type: "FULL", notes: policy.notes };
    case "CAPPED":
      return { type: "CAPPED", cap_amount: policy.capAmount, notes: policy.notes };
    case "PERCENT":
      return { type: "PERCENT", percent: policy.percent, notes: policy.notes };
    default:
      return { type: "FULL" };
  }
}

function convertRebates(rebates: TaxRulesConfig["rebates"]): RebateRuleJson[] {
  return rebates.map((r) => ({
    applies_to: r.appliesTo,
    taxable: r.taxable,
    notes: r.notes,
  }));
}

function convertFeeTaxRules(rules: TaxRulesConfig["feeTaxRules"]): FeeTaxRuleJson[] {
  return rules.map((r) => ({
    code: r.code,
    taxable: r.taxable,
    notes: r.notes,
  }));
}

function convertLeaseRules(lease: TaxRulesConfig["leaseRules"]): LeaseRulesJson {
  return {
    method: lease.method,
    tax_cap_reduction: lease.taxCapReduction,
    rebate_behavior: lease.rebateBehavior,
    doc_fee_taxability: lease.docFeeTaxability,
    trade_in_credit: lease.tradeInCredit,
    negative_equity_taxable: lease.negativeEquityTaxable,
    fee_tax_rules: lease.feeTaxRules.map((r) => ({
      code: r.code,
      taxable: r.taxable,
      notes: r.notes,
    })),
    title_fee_rules: lease.titleFeeRules.map((r) => ({
      code: r.code,
      taxable: r.taxable,
      included_in_cap_cost: r.includedInCapCost,
      included_in_upfront: r.includedInUpfront,
      included_in_monthly: r.includedInMonthly,
    })),
    tax_fees_upfront: lease.taxFeesUpfront,
    special_scheme: lease.specialScheme,
    notes: lease.notes,
  };
}

function convertReciprocity(recip: TaxRulesConfig["reciprocity"]): ReciprocityRulesJson {
  return {
    enabled: recip.enabled,
    scope: recip.scope,
    home_state_behavior: recip.homeStateBehavior,
    require_proof_of_tax_paid: recip.requireProofOfTaxPaid,
    basis: recip.basis,
    cap_at_this_states_tax: recip.capAtThisStatesTax,
    has_lease_exception: recip.hasLeaseException,
    notes: recip.notes,
  };
}

function convertExtras(extras?: TaxRulesConfig["extras"]): StateExtrasJson | undefined {
  if (!extras) return undefined;

  const result: StateExtrasJson = {};

  // Basic rates
  if (extras.stateAutomotiveSalesRate !== undefined) {
    result.state_automotive_sales_rate = extras.stateAutomotiveSalesRate;
  }
  if (extras.stateAutomotiveLeaseRate !== undefined) {
    result.state_automotive_lease_rate = extras.stateAutomotiveLeaseRate;
  }

  // Rate ranges
  if (extras.localTaxRange) {
    result.local_tax_range = { min: extras.localTaxRange.min, max: extras.localTaxRange.max };
  }
  if (extras.localRateRange) {
    result.local_tax_range = { min: extras.localRateRange.min, max: extras.localRateRange.max };
  }
  if (extras.combinedRateRange) {
    result.combined_rate_range = { min: extras.combinedRateRange.min, max: extras.combinedRateRange.max };
  }

  // Fees
  if (extras.docFeeCap !== undefined) {
    result.doc_fee_cap = typeof extras.docFeeCap === "number" ? extras.docFeeCap : null;
  }
  if (extras.titleFee !== undefined) {
    result.title_fee = extras.titleFee;
  }

  // Flat rate (for simple states like IN)
  if ((extras as { flatVehicleTaxRate?: number }).flatVehicleTaxRate !== undefined) {
    result.state_automotive_sales_rate = (extras as { flatVehicleTaxRate: number }).flatVehicleTaxRate;
  }

  // Notes and status
  if (extras.notes) {
    result.notes = extras.notes;
  }
  if ((extras as { status?: string }).status) {
    result.status = (extras as { status: string }).status;
  }

  // Special schemes - Georgia TAVT
  if (extras.gaTAVT) {
    result.ga_tavt = {
      default_rate: extras.gaTAVT.defaultRate,
      use_assessed_value: extras.gaTAVT.useAssessedValue,
      allow_trade_in_credit: extras.gaTAVT.allowTradeInCredit,
    };
  }

  // Special schemes - NC HUT
  if (extras.ncHUT) {
    result.nc_hut = {
      base_rate: extras.ncHUT.baseRate,
      use_highway_use_tax: extras.ncHUT.useHighwayUseTax,
      max_reciprocity_age_days: extras.ncHUT.maxReciprocityAgeDays,
    };
  }

  // Special schemes - WV Privilege Tax
  if (extras.wvPrivilege) {
    result.wv_privilege = {
      base_rate: extras.wvPrivilege.baseRate,
      use_assessed_value: extras.wvPrivilege.useAssessedValue,
      allow_trade_in_credit: extras.wvPrivilege.allowTradeInCredit,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function convertStateRules(config: TaxRulesConfig): StateRuleEntry {
  return {
    state_code: config.stateCode,
    version: config.version,
    trade_in_policy: convertTradeInPolicy(config.tradeInPolicy),
    rebates: convertRebates(config.rebates),
    doc_fee_taxable: config.docFeeTaxable,
    fee_tax_rules: convertFeeTaxRules(config.feeTaxRules),
    tax_on_accessories: config.taxOnAccessories,
    tax_on_negative_equity: config.taxOnNegativeEquity,
    tax_on_service_contracts: config.taxOnServiceContracts,
    tax_on_gap: config.taxOnGap,
    vehicle_tax_scheme: config.vehicleTaxScheme,
    vehicle_uses_local_sales_tax: config.vehicleUsesLocalSalesTax,
    lease_rules: convertLeaseRules(config.leaseRules),
    reciprocity: convertReciprocity(config.reciprocity),
    extras: convertExtras(config.extras),
  };
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

function generateBundle(): RulesBundle {
  const states: Record<string, StateRuleEntry> = {};
  const stateCodes = getAllStateCodes();

  console.log(`\n📦 Exporting ${stateCodes.length} state rules to JSON bundle...\n`);

  for (const code of stateCodes) {
    const rules = STATE_RULES_MAP[code];
    if (rules) {
      states[code] = convertStateRules(rules);
      console.log(`  ✓ ${code}: version ${rules.version}, scheme: ${rules.vehicleTaxScheme}`);
    }
  }

  // Generate checksum of the states object
  const statesJson = JSON.stringify(states, null, 0);
  const checksum = crypto.createHash("sha256").update(statesJson).digest("hex").substring(0, 16);

  const metadata: RulesBundleMetadata = {
    bundle_id: `tax-rules-${Date.now()}`,
    bundle_version: "1.0.0",
    generated_at: new Date().toISOString(),
    state_count: Object.keys(states).length,
    source: "shared/autoTaxEngine/rules",
    schema_version: "1.0",
    checksum,
  };

  return { metadata, states };
}

// =============================================================================
// CLI
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const pretty = args.includes("--pretty");
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex !== -1 && args[outputIndex + 1]
      ? args[outputIndex + 1]
      : path.join(__dirname, "..", "services", "tax-engine-rs", "tax-rules-bundle.json");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         TAX RULES EXPORT - TypeScript → JSON Bundle          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const bundle = generateBundle();

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the bundle
  const jsonContent = pretty ? JSON.stringify(bundle, null, 2) : JSON.stringify(bundle);
  fs.writeFileSync(outputPath, jsonContent);

  const fileSizeKB = (Buffer.byteLength(jsonContent) / 1024).toFixed(1);

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("                         BUNDLE GENERATED                        ");
  console.log("════════════════════════════════════════════════════════════════\n");
  console.log(`  📄 Output:     ${outputPath}`);
  console.log(`  📊 States:     ${bundle.metadata.state_count}`);
  console.log(`  📦 Size:       ${fileSizeKB} KB`);
  console.log(`  🔑 Checksum:   ${bundle.metadata.checksum}`);
  console.log(`  📅 Generated:  ${bundle.metadata.generated_at}`);
  console.log(`  🏷️  Bundle ID:  ${bundle.metadata.bundle_id}`);
  console.log("\n════════════════════════════════════════════════════════════════\n");

  // Also generate a minified rate-only bundle for the existing rate_bundle.rs system
  const rateBundle = generateRateOnlyBundle(bundle);
  const rateBundlePath = path.join(outputDir, "rate-bundle.json");
  const rateBundleJson = JSON.stringify(rateBundle);
  fs.writeFileSync(rateBundlePath, rateBundleJson);

  console.log("  📄 Rate Bundle: " + rateBundlePath);
  console.log(`  📦 Size:        ${(Buffer.byteLength(rateBundleJson) / 1024).toFixed(1)} KB`);
  console.log("\n✅ Export complete! Rust WASM can now load rules from JSON.\n");
}

/**
 * Generate a simplified rate-only bundle for the existing rate_bundle.rs system
 * This is backward compatible with the rate loading system we already built.
 */
function generateRateOnlyBundle(fullBundle: RulesBundle): object {
  const states: Record<
    string,
    {
      state_rate: number;
      local_rate_min?: number;
      local_rate_max?: number;
      effective_date: string;
      notes?: string;
    }
  > = {};

  for (const [code, rules] of Object.entries(fullBundle.states)) {
    const stateRate = rules.extras?.state_automotive_sales_rate ?? 0;
    const entry: (typeof states)[string] = {
      state_rate: stateRate,
      effective_date: fullBundle.metadata.generated_at.split("T")[0],
    };

    if (rules.extras?.local_tax_range) {
      entry.local_rate_min = rules.extras.local_tax_range.min;
      entry.local_rate_max = rules.extras.local_tax_range.max;
    }

    if (rules.extras?.notes) {
      entry.notes = rules.extras.notes;
    }

    states[code] = entry;
  }

  return {
    metadata: {
      bundle_id: fullBundle.metadata.bundle_id,
      bundle_version: fullBundle.metadata.bundle_version,
      generated_at: fullBundle.metadata.generated_at,
      state_count: fullBundle.metadata.state_count,
      source: fullBundle.metadata.source,
    },
    states,
  };
}

main();
