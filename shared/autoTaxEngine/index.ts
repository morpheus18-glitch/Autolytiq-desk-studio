/**
 * AUTO TAX ENGINE
 *
 * A pure TypeScript tax calculation engine for automotive retail and lease deals.
 * Supports all 50 US states with state-specific rule configurations.
 *
 * ============================================================================
 * ARCHITECTURE: PURE DATA-DRIVEN DESIGN (OPUS VTR PATTERN)
 * ============================================================================
 *
 * This engine follows a **pure data-driven architecture** where:
 *
 * 1. **State Files Contain ONLY Data** (`rules/US_*.ts`)
 *    - Each state file exports a single `TaxRulesConfig` object
 *    - No logic, no functions, no conditionals
 *    - Just configuration data describing tax rules
 *
 * 2. **Interpreters Contain ALL Logic** (`engine/interpreters.ts`)
 *    - All rule interpretation logic lives in dedicated interpreter functions
 *    - Interpreters read the data and apply the correct tax treatment
 *    - State files never contain implementation details
 *
 * 3. **Engine Orchestrates** (`engine/calculateTax.ts`)
 *    - Main calculation function delegates to interpreters
 *    - Gathers context, calls appropriate interpreters
 *    - Returns structured results with debug information
 *
 * **Why This Architecture?**
 * - ✅ **Maintainability**: Tax rules change frequently; updating data files is safe
 * - ✅ **Testability**: Logic is centralized and easily unit tested
 * - ✅ **Scalability**: Adding new states or schemes is just adding data
 * - ✅ **Auditability**: Tax rules are human-readable configuration
 * - ✅ **Type Safety**: TypeScript enforces valid configurations at compile time
 *
 * **Example Workflow:**
 * ```
 * calculateTax(input, rules)
 *   → interpretVehicleTaxScheme(rules.vehicleTaxScheme, rates)
 *   → interpretTradeInPolicy(rules.tradeInPolicy, tradeInValue)
 *   → interpretLeaseSpecialScheme(rules.leaseRules.specialScheme)
 *   → isFeeTaxable(feeCode, dealType, rules)
 *   → return TaxCalculationResult
 * ```
 *
 * ============================================================================
 * FEATURES
 * ============================================================================
 *
 * ✅ Retail Tax Calculation
 *    - Trade-in credit (full, capped, percent, none)
 *    - Rebate handling (manufacturer vs dealer, taxable vs non-taxable)
 *    - Fee taxability (doc fee, service contracts, GAP, title, registration)
 *    - Accessories and negative equity treatment
 *    - Multi-jurisdiction tax rates (state + local)
 *
 * ✅ Lease Tax Calculation
 *    - Monthly taxation (tax on each payment)
 *    - Upfront taxation (tax whole base at signing)
 *    - Hybrid taxation (partial upfront + monthly)
 *    - Cap cost reduction handling
 *    - Trade-in credit on leases
 *    - Rebate treatment specific to leases
 *    - Fee and product taxability on leases
 *
 * ✅ State-Specific Rules
 *    - 50 state configurations (5 detailed: IN, MI, KY, SC, TN)
 *    - Version tracking for rule changes
 *    - Special tax schemes (TAVT, HUT, privilege tax, etc.)
 *    - Reciprocity support (cross-state tax credits)
 *
 * ✅ Pure & Testable
 *    - No side effects
 *    - No database, HTTP, or process.env
 *    - Deterministic output for same inputs
 *    - Comprehensive debug information
 *
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 *
 * ## Example 1: Basic Retail Tax Calculation
 *
 * ```typescript
 * import { calculateTax, getRulesForState, TaxCalculationInput } from './autoTaxEngine';
 *
 * const input: TaxCalculationInput = {
 *   stateCode: "IN",
 *   asOfDate: "2025-01-15",
 *   dealType: "RETAIL",
 *   vehiclePrice: 35000,
 *   accessoriesAmount: 2000,
 *   tradeInValue: 10000,
 *   rebateManufacturer: 2000,
 *   rebateDealer: 500,
 *   docFee: 200,
 *   otherFees: [
 *     { code: "TITLE", amount: 31 },
 *     { code: "REG", amount: 50 },
 *   ],
 *   serviceContracts: 2500,
 *   gap: 800,
 *   negativeEquity: 0,
 *   taxAlreadyCollected: 0,
 *   rates: [{ label: "STATE", rate: 0.07 }], // 7% flat rate for IN
 * };
 *
 * const rules = getRulesForState("IN");
 * if (!rules) throw new Error("State not supported");
 *
 * const result = calculateTax(input, rules);
 *
 * console.log("Total Tax:", result.taxes.totalTax);
 * console.log("Taxable Base:", result.bases.totalTaxableBase);
 * console.log("Applied Trade-In:", result.debug.appliedTradeIn);
 * ```
 *
 * ## Example 2: Lease Tax Calculation (Monthly)
 *
 * ```typescript
 * const leaseInput: TaxCalculationInput = {
 *   stateCode: "IN",
 *   asOfDate: "2025-01-15",
 *   dealType: "LEASE",
 *   vehiclePrice: 35000,
 *   accessoriesAmount: 0,
 *   tradeInValue: 0,
 *   rebateManufacturer: 0,
 *   rebateDealer: 0,
 *   docFee: 200,
 *   otherFees: [
 *     { code: "TITLE", amount: 31 },
 *     { code: "REG", amount: 50 },
 *   ],
 *   serviceContracts: 0,
 *   gap: 0,
 *   negativeEquity: 0,
 *   taxAlreadyCollected: 0,
 *   rates: [{ label: "STATE", rate: 0.07 }],
 *
 *   // Lease-specific fields
 *   grossCapCost: 35000,
 *   capReductionCash: 3000,
 *   capReductionTradeIn: 0,
 *   capReductionRebateManufacturer: 0,
 *   capReductionRebateDealer: 0,
 *   basePayment: 450,
 *   paymentCount: 36,
 * };
 *
 * const rules = getRulesForState("IN");
 * const result = calculateTax(leaseInput, rules!);
 *
 * if (result.leaseBreakdown) {
 *   console.log("Upfront Tax:", result.leaseBreakdown.upfrontTaxes.totalTax);
 *   console.log("Tax Per Payment:", result.leaseBreakdown.paymentTaxesPerPeriod.totalTax);
 *   console.log("Total Tax Over Term:", result.leaseBreakdown.totalTaxOverTerm);
 * }
 * ```
 *
 * ## Example 3: Express.js API Integration
 *
 * ```typescript
 * import express from 'express';
 * import { calculateTax, getRulesForState, TaxCalculationInput } from './autoTaxEngine';
 *
 * const app = express();
 *
 * app.post('/api/tax/preview', (req, res) => {
 *   try {
 *     const body = req.body as TaxCalculationInput;
 *
 *     const rules = getRulesForState(body.stateCode);
 *     if (!rules) {
 *       return res.status(400).json({ error: `Unsupported state: ${body.stateCode}` });
 *     }
 *
 *     const result = calculateTax(body, rules);
 *     res.json(result);
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * ```
 *
 * ============================================================================
 * STATE RULE MANAGEMENT
 * ============================================================================
 *
 * ## Checking Implementation Status
 *
 * ```typescript
 * import {
 *   getImplementedStates,
 *   getStubStates,
 *   isStateImplemented
 * } from './autoTaxEngine';
 *
 * console.log("Fully implemented:", getImplementedStates()); // ["IN", "MI", "KY", "SC", "TN"]
 * console.log("Stubs (need research):", getStubStates()); // ["AL", "AK", ...]
 * console.log("Is IN implemented?", isStateImplemented("IN")); // true
 * ```
 *
 * ## Adding/Modifying State Rules (PURE DATA APPROACH)
 *
 * To add or modify a state's tax rules, you ONLY edit the state's data file.
 * **NEVER add logic to state files** - all logic lives in `engine/interpreters.ts`.
 *
 * ### Step 1: Edit the state file (`shared/autoTaxEngine/rules/US_XX.ts`)
 *
 * ```typescript
 * import { TaxRulesConfig } from "../types";
 *
 * export const US_XX: TaxRulesConfig = {
 *   stateCode: "XX",
 *   version: 1,
 *
 *   // Trade-in policy (ONLY data, no logic)
 *   tradeInPolicy: { type: "FULL" }, // or CAPPED, PERCENT, NONE
 *
 *   // Rebate rules (ONLY data)
 *   rebates: [
 *     { appliesTo: "MANUFACTURER", taxable: false },
 *     { appliesTo: "DEALER", taxable: true },
 *   ],
 *
 *   // Vehicle tax scheme (ONLY data)
 *   vehicleTaxScheme: "STATE_PLUS_LOCAL", // or STATE_ONLY, SPECIAL_HUT, etc.
 *
 *   // Lease rules (ONLY data)
 *   leaseRules: {
 *     method: "MONTHLY", // or FULL_UPFRONT, HYBRID
 *     specialScheme: "NONE", // or NY_MTR, NJ_LUXURY, PA_LEASE_TAX, etc.
 *     // ... more lease configuration data
 *   },
 *
 *   // Reciprocity (ONLY data)
 *   reciprocity: {
 *     enabled: true,
 *     homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
 *     // ... more reciprocity configuration
 *   },
 * };
 * ```
 *
 * ### Step 2: Increment version number when rules change
 *
 * ```typescript
 * version: 2, // Was 1, now 2 after updating trade-in policy
 * ```
 *
 * ### Step 3: Remove stub status when fully researched
 *
 * ```typescript
 * // Before (stub):
 * extras: { status: "STUB" }
 *
 * // After (implemented):
 * extras: {} // or omit entirely
 * ```
 *
 * ### Step 4: If you need NEW logic, add an interpreter function
 *
 * **IMPORTANT**: If your state has a unique tax treatment that doesn't fit existing
 * interpreters, add a new interpreter function to `engine/interpreters.ts`:
 *
 * ```typescript
 * // In engine/interpreters.ts
 * export function interpretNewTaxScheme(
 *   scheme: NewTaxScheme,
 *   context: SomeContext,
 *   rules: TaxRulesConfig
 * ): CalculationResult {
 *   // ALL logic here, NOT in state files
 *   switch (scheme) {
 *     case "NEW_SCHEME_TYPE_A":
 *       // Implementation for scheme A
 *       return { ... };
 *     case "NEW_SCHEME_TYPE_B":
 *       // Implementation for scheme B
 *       return { ... };
 *     default:
 *       return { ... };
 *   }
 * }
 * ```
 *
 * Then reference the scheme in your state file:
 *
 * ```typescript
 * // In rules/US_XX.ts (ONLY data)
 * export const US_XX: TaxRulesConfig = {
 *   // ...
 *   someNewScheme: "NEW_SCHEME_TYPE_A", // Just the enum value
 * };
 * ```
 *
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */

// Core types
export * from "./types";

// Tax calculation engine
export * from "./engine/calculateTax";

// Interpreters (for DSL interpretation)
export * from "./engine/interpreters";

// State rules management
export * from "./rules";
