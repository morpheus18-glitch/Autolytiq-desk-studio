/**
 * STATE RESOLVER - Multi-State Tax Context Resolution
 *
 * Determines which state's tax rules to apply based on:
 * - Dealer location (rooftop state)
 * - Buyer residence state
 * - Vehicle registration state
 * - Rooftop configuration (tax perspective)
 *
 * This is critical for:
 * - Multi-state dealer groups
 * - Cross-state deliveries
 * - Border city dealers
 * - Snowbird customers
 *
 * ARCHITECTURE:
 * - Pure function (no DB, no HTTP, no side effects)
 * - Rooftop config determines perspective (DEALER_STATE, REGISTRATION_STATE, BUYER_STATE)
 * - State-specific overrides handle edge cases
 * - Falls back to safe defaults if data is incomplete
 *
 * EXAMPLES:
 *
 * 1. Indiana dealer, Indiana buyer, Indiana registration:
 *    → primaryStateCode: "IN" (simple case)
 *
 * 2. Ohio dealer (registration perspective), buyer lives in IN, registers in OH:
 *    → primaryStateCode: "OH" (follows rooftop perspective)
 *
 * 3. Kentucky dealer (dealer perspective), buyer lives in IN, registers in IN:
 *    → primaryStateCode: "KY" (dealer state wins, IN pays KY tax + IN reg fees)
 *
 * 4. Florida dealer, snowbird buyer (MI resident), registers in FL:
 *    → primaryStateCode: "FL" (registration state, MI reciprocity may apply)
 *
 * SOURCES:
 * - Reynolds DMS dealer configuration patterns
 * - Vitu multi-state tax resolution logic
 * - Opus rooftop-based tax perspective system
 */

import { TaxContext, RooftopConfig, DealPartyInfo } from "../types";

/**
 * Resolve Tax Context: Determine which state's rules to apply
 *
 * @param rooftop - Dealer/rooftop configuration
 * @param deal - Deal party information (buyer, registration, delivery states)
 * @returns TaxContext with primaryStateCode and all relevant state codes
 */
export function resolveTaxContext(
  rooftop: RooftopConfig,
  deal: DealPartyInfo
): TaxContext {
  const dealerState = rooftop.dealerStateCode;

  // Default fallbacks if data is missing
  const regState = deal.registrationState ?? dealerState;
  const buyerState = deal.buyerResidenceState ?? regState;

  // Check for state-specific overrides
  const regOverride = rooftop.stateOverrides?.[regState];
  const buyerOverride = rooftop.stateOverrides?.[buyerState];

  // OVERRIDE: Force registration state as primary (highest priority)
  if (regOverride?.forcePrimary) {
    return {
      primaryStateCode: regState,
      dealerStateCode: dealerState,
      buyerResidenceStateCode: buyerState,
      registrationStateCode: regState,
    };
  }

  // OVERRIDE: Force buyer state as primary (second priority)
  if (buyerOverride?.forcePrimary && buyerState !== dealerState) {
    return {
      primaryStateCode: buyerState,
      dealerStateCode: dealerState,
      buyerResidenceStateCode: buyerState,
      registrationStateCode: regState,
    };
  }

  // Apply rooftop's default tax perspective
  switch (rooftop.defaultTaxPerspective) {
    case "DEALER_STATE": {
      // DEALER_STATE: Use dealer's state unless explicitly disallowed
      if (regOverride?.disallowPrimary || buyerOverride?.disallowPrimary) {
        // If dealer state is disallowed for this registration/buyer combo,
        // fall back to registration state
        return {
          primaryStateCode: regState,
          dealerStateCode: dealerState,
          buyerResidenceStateCode: buyerState,
          registrationStateCode: regState,
        };
      }

      return {
        primaryStateCode: dealerState,
        dealerStateCode: dealerState,
        buyerResidenceStateCode: buyerState,
        registrationStateCode: regState,
      };
    }

    case "BUYER_STATE": {
      // BUYER_STATE: Use buyer's state IF it's in allowed list
      // (This is rare - only certain dealer groups do this)
      if (
        buyerState &&
        buyerState !== dealerState &&
        rooftop.allowedRegistrationStates.includes(buyerState) &&
        !buyerOverride?.disallowPrimary
      ) {
        return {
          primaryStateCode: buyerState,
          dealerStateCode: dealerState,
          buyerResidenceStateCode: buyerState,
          registrationStateCode: regState,
        };
      }

      // Fall back to registration state if buyer state not allowed
      return {
        primaryStateCode: regState,
        dealerStateCode: dealerState,
        buyerResidenceStateCode: buyerState,
        registrationStateCode: regState,
      };
    }

    case "REGISTRATION_STATE":
    default: {
      // REGISTRATION_STATE: Use state where vehicle will be registered
      // (Most common for multi-state dealer groups)
      if (regOverride?.disallowPrimary) {
        // If registration state is disallowed, fall back to dealer state
        return {
          primaryStateCode: dealerState,
          dealerStateCode: dealerState,
          buyerResidenceStateCode: buyerState,
          registrationStateCode: regState,
        };
      }

      return {
        primaryStateCode: regState,
        dealerStateCode: dealerState,
        buyerResidenceStateCode: buyerState,
        registrationStateCode: regState,
      };
    }
  }
}

/**
 * Helper: Create a simple rooftop config for single-state dealers
 *
 * Use this for dealers that only operate in one state and don't need
 * complex multi-state logic.
 *
 * @param dealerStateCode - State where dealer is located
 * @param rooftopName - Optional rooftop name (defaults to state code)
 * @returns Simple RooftopConfig with dealer-state perspective
 */
export function createSimpleRooftopConfig(
  dealerStateCode: string,
  rooftopName?: string
): RooftopConfig {
  return {
    id: `rooftop-${dealerStateCode}`,
    name: rooftopName ?? `${dealerStateCode} Dealership`,
    dealerStateCode,
    defaultTaxPerspective: "DEALER_STATE",
    allowedRegistrationStates: [dealerStateCode],
  };
}

/**
 * Helper: Create a multi-state rooftop config
 *
 * Use this for dealer groups that operate across multiple states
 * (e.g., border city dealers, snowbird markets).
 *
 * @param dealerStateCode - Primary dealer state
 * @param allowedStates - All states this dealer can register in
 * @param perspective - Tax perspective (defaults to REGISTRATION_STATE)
 * @param rooftopName - Optional rooftop name
 * @returns RooftopConfig with multi-state support
 */
export function createMultiStateRooftopConfig(
  dealerStateCode: string,
  allowedStates: string[],
  perspective: "DEALER_STATE" | "REGISTRATION_STATE" | "BUYER_STATE" = "REGISTRATION_STATE",
  rooftopName?: string
): RooftopConfig {
  return {
    id: `rooftop-${dealerStateCode}-multistate`,
    name: rooftopName ?? `${dealerStateCode} Multi-State Dealership`,
    dealerStateCode,
    defaultTaxPerspective: perspective,
    allowedRegistrationStates: [dealerStateCode, ...allowedStates],
  };
}

/**
 * Helper: Check if a deal involves multiple states
 *
 * Returns true if buyer, dealer, or registration states differ.
 * Useful for triggering reciprocity checks or multi-state validations.
 */
export function isMultiStateDeal(context: TaxContext): boolean {
  const states = new Set([
    context.primaryStateCode,
    context.dealerStateCode,
    context.buyerResidenceStateCode,
    context.registrationStateCode,
  ].filter(Boolean));

  return states.size > 1;
}

/**
 * Helper: Get all involved states for audit/logging
 *
 * Returns array of all unique states involved in the deal.
 */
export function getInvolvedStates(context: TaxContext): string[] {
  const states = new Set([
    context.primaryStateCode,
    context.dealerStateCode,
    context.buyerResidenceStateCode,
    context.registrationStateCode,
  ].filter((s): s is string => Boolean(s)));

  return Array.from(states).sort();
}
