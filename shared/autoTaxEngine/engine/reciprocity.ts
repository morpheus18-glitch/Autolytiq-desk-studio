/**
 * Reciprocity Engine - Pairwise Directional Credit Logic
 *
 * Handles complex reciprocity scenarios including:
 * - Directional reciprocity (FL → OK different from OK → FL)
 * - Time-window restrictions (NC 90-day rule)
 * - Mutual credit requirements (PA requires origin state to also give credit)
 * - Nonreciprocal state lists (IN has list of states it doesn't reciprocate with)
 * - Vehicle class restrictions
 * - GVW range restrictions
 */

import type {
  TaxCalculationInput,
  TaxRulesConfig,
  StatePairReciprocity,
  ReciprocityMode,
  VehicleClass,
  GVWRange
} from '../types';

/**
 * Result of reciprocity calculation
 */
export interface ReciprocityResult {
  /** Final tax after reciprocity credit applied */
  finalTax: number;
  /** Amount of reciprocity credit given */
  reciprocityCredit: number;
  /** Whether credit was allowed */
  creditAllowed: boolean;
  /** Human-readable explanation of credit decision */
  note: string;
  /** Debug information for troubleshooting */
  debug?: {
    reciprocityEnabled: boolean;
    originTaxAvailable: boolean;
    overrideApplied: boolean;
    overrideReason?: string;
    mode: ReciprocityMode;
    calculatedCredit: number;
    creditCapped: boolean;
  };
}

/**
 * Time window check result
 */
export interface TimeWindowResult {
  /** Whether the tax payment is within the allowed window */
  withinWindow: boolean;
  /** Days since tax was paid */
  daysSince: number;
  /** Message explaining the result */
  message: string;
}

/**
 * Mutual credit check result
 */
export interface MutualCreditResult {
  /** Whether mutual credit exists */
  exists: boolean;
  /** Message explaining the result */
  message: string;
  /** The reciprocity mode found for the reverse direction */
  reverseMode?: ReciprocityMode;
}

/**
 * Main reciprocity calculation function
 *
 * @param calculatedTax - Tax calculated for destination state
 * @param input - Original tax calculation input with origin tax info
 * @param rules - Tax rules configuration for destination state
 * @returns Reciprocity calculation result with final tax and debug info
 */
export function applyReciprocity(
  calculatedTax: number,
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): ReciprocityResult {
  const debug = {
    reciprocityEnabled: false,
    originTaxAvailable: false,
    overrideApplied: false,
    mode: 'NONE' as ReciprocityMode,
    calculatedCredit: 0,
    creditCapped: false
  };

  // Step 1: Check if reciprocity is enabled for this state
  if (!rules.reciprocity?.enabled) {
    return {
      finalTax: calculatedTax,
      reciprocityCredit: 0,
      creditAllowed: false,
      note: `${rules.stateCode} does not offer reciprocity credits.`,
      debug
    };
  }
  debug.reciprocityEnabled = true;

  // Step 2: Check if origin tax info exists and has amount > 0
  if (!input.originTaxInfo?.amount || input.originTaxInfo.amount <= 0) {
    return {
      finalTax: calculatedTax,
      reciprocityCredit: 0,
      creditAllowed: false,
      note: 'No origin state tax paid to apply as reciprocity credit.',
      debug
    };
  }
  debug.originTaxAvailable = true;

  const originTaxAmount = input.originTaxInfo.amount;
  const originStateCode = input.originTaxInfo.stateCode;
  const destStateCode = rules.stateCode;

  // Step 3: Check for reciprocity overrides
  const override = findApplicableOverride(
    input,
    rules,
    originStateCode,
    destStateCode
  );

  let reciprocityMode: ReciprocityMode = rules.reciprocity.defaultMode || 'CREDIT_UP_TO_STATE_RATE';
  let creditAllowed = true;
  let disallowReason = '';

  if (override) {
    debug.overrideApplied = true;
    debug.overrideReason = buildOverrideReason(override, originStateCode);

    // Check disallowCredit (e.g., Indiana nonreciprocals)
    if (override.disallowCredit) {
      return {
        finalTax: calculatedTax,
        reciprocityCredit: 0,
        creditAllowed: false,
        note: `${destStateCode} does not reciprocate with ${originStateCode}.`,
        debug: { ...debug, mode: 'NONE' }
      };
    }

    // Check time window (e.g., NC 90-day rule)
    if (override.maxAgeDaysSinceTaxPaid !== undefined) {
      const timeWindowCheck = checkReciprocityTimeWindow(
        input.originTaxInfo.taxPaidDate,
        input.asOfDate || new Date().toISOString().split('T')[0],
        override.maxAgeDaysSinceTaxPaid
      );

      if (!timeWindowCheck.withinWindow) {
        return {
          finalTax: calculatedTax,
          reciprocityCredit: 0,
          creditAllowed: false,
          note: timeWindowCheck.message,
          debug: { ...debug, mode: 'NONE' }
        };
      }
    }

    // Check mutual credit requirement (e.g., PA)
    if (override.requiresMutualCredit) {
      const mutualCreditCheck = checkMutualCredit(
        originStateCode,
        destStateCode,
        rules.reciprocity.overrides || []
      );

      if (!mutualCreditCheck.exists) {
        return {
          finalTax: calculatedTax,
          reciprocityCredit: 0,
          creditAllowed: false,
          note: mutualCreditCheck.message,
          debug: { ...debug, mode: 'NONE' }
        };
      }
    }

    // Check same owner requirement
    if (override.requiresSameOwner && !input.originTaxInfo.sameOwner) {
      return {
        finalTax: calculatedTax,
        reciprocityCredit: 0,
        creditAllowed: false,
        note: `${destStateCode} requires the vehicle owner to be the same as when tax was paid in ${originStateCode}.`,
        debug: { ...debug, mode: 'NONE' }
      };
    }

    // Use override mode if specified
    if (override.mode) {
      reciprocityMode = override.mode;
    }
  }

  debug.mode = reciprocityMode;

  // Step 5: Calculate credit based on mode
  let credit = 0;
  let modeNote = '';

  switch (reciprocityMode) {
    case 'NONE':
      credit = 0;
      modeNote = 'No reciprocity credit allowed.';
      creditAllowed = false;
      break;

    case 'CREDIT_UP_TO_STATE_RATE':
      credit = Math.min(originTaxAmount, calculatedTax);
      modeNote = `Credit up to ${destStateCode} tax rate: $${credit.toFixed(2)} (origin tax: $${originTaxAmount.toFixed(2)}, ${destStateCode} tax: $${calculatedTax.toFixed(2)}).`;
      break;

    case 'CREDIT_FULL':
      credit = originTaxAmount;
      modeNote = `Full credit for ${originStateCode} tax paid: $${credit.toFixed(2)}.`;
      break;

    case 'HOME_STATE_ONLY':
      // Special logic: only credit if origin state is the owner's home state
      if (input.originTaxInfo.isHomeState) {
        credit = Math.min(originTaxAmount, calculatedTax);
        modeNote = `Home state credit: $${credit.toFixed(2)} (${originStateCode} is owner's home state).`;
      } else {
        credit = 0;
        modeNote = `No credit: ${originStateCode} is not the owner's home state.`;
        creditAllowed = false;
      }
      break;

    default:
      // Should never happen with proper typing
      credit = 0;
      modeNote = `Unknown reciprocity mode: ${reciprocityMode}.`;
      creditAllowed = false;
  }

  debug.calculatedCredit = credit;

  // Step 6: Apply cap if configured
  const capAtThisStatesTax = override?.capAtThisStatesTax ?? rules.reciprocity.capAtThisStatesTax ?? true;

  if (capAtThisStatesTax && credit > calculatedTax) {
    credit = calculatedTax;
    modeNote += ` Credit capped at ${destStateCode} tax amount.`;
    debug.creditCapped = true;
  }

  // Step 7: Calculate final tax
  const finalTax = Math.max(0, calculatedTax - credit);

  // Build comprehensive note
  const note = creditAllowed
    ? `Reciprocity credit applied: ${modeNote}`
    : modeNote;

  return {
    finalTax,
    reciprocityCredit: credit,
    creditAllowed,
    note,
    debug
  };
}

/**
 * Find applicable reciprocity override for origin-destination pair
 */
function findApplicableOverride(
  input: TaxCalculationInput,
  rules: TaxRulesConfig,
  originStateCode: string,
  destStateCode: string
): StatePairReciprocity | undefined {
  if (!rules.reciprocity?.overrides) {
    return undefined;
  }

  return rules.reciprocity.overrides.find(override => {
    // Check state codes match (directional)
    if (override.originStateCode !== originStateCode || override.destStateCode !== destStateCode) {
      return false;
    }

    // Check vehicle class if specified
    if (override.appliesToVehicleClass && override.appliesToVehicleClass.length > 0) {
      const vehicleClass = determineVehicleClass(input);
      if (!override.appliesToVehicleClass.includes(vehicleClass)) {
        return false;
      }
    }

    // Check GVW range if specified
    if (override.appliesToGVWRange && input.vehicle.gvwLbs !== undefined) {
      if (!isWithinGVWRange(input.vehicle.gvwLbs, override.appliesToGVWRange)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if tax payment is within allowed time window
 *
 * @param taxPaidDate - Date tax was paid (YYYY-MM-DD format)
 * @param asOfDate - Current date or date to calculate from (YYYY-MM-DD format)
 * @param maxAgeDays - Maximum days allowed since tax payment
 * @returns Time window check result
 */
export function checkReciprocityTimeWindow(
  taxPaidDate: string | undefined,
  asOfDate: string,
  maxAgeDays: number
): TimeWindowResult {
  if (!taxPaidDate) {
    return {
      withinWindow: false,
      daysSince: -1,
      message: 'Tax payment date is required but not provided.'
    };
  }

  try {
    const paidDate = new Date(taxPaidDate);
    const currentDate = new Date(asOfDate);

    // Validate dates
    if (isNaN(paidDate.getTime())) {
      return {
        withinWindow: false,
        daysSince: -1,
        message: `Invalid tax paid date: ${taxPaidDate}.`
      };
    }

    if (isNaN(currentDate.getTime())) {
      return {
        withinWindow: false,
        daysSince: -1,
        message: `Invalid current date: ${asOfDate}.`
      };
    }

    // Calculate days difference
    const daysSince = Math.floor((currentDate.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince < 0) {
      return {
        withinWindow: false,
        daysSince,
        message: `Tax paid date (${taxPaidDate}) is in the future.`
      };
    }

    const withinWindow = daysSince <= maxAgeDays;

    return {
      withinWindow,
      daysSince,
      message: withinWindow
        ? `Tax paid ${daysSince} days ago, within ${maxAgeDays}-day window.`
        : `Tax paid ${daysSince} days ago, exceeds ${maxAgeDays}-day window. Credit denied.`
    };
  } catch (error) {
    return {
      withinWindow: false,
      daysSince: -1,
      message: `Error checking time window: ${error instanceof Error ? error.message : 'Unknown error'}.`
    };
  }
}

/**
 * Check if mutual credit exists (destination state also credits origin state)
 *
 * @param originStateCode - Origin state code
 * @param destStateCode - Destination state code
 * @param pairMatrix - Array of state pair reciprocity rules
 * @returns Mutual credit check result
 */
export function checkMutualCredit(
  originStateCode: string,
  destStateCode: string,
  pairMatrix: StatePairReciprocity[]
): MutualCreditResult {
  // Look for reverse direction rule: origin → dest
  // (We're checking if origin state would credit dest state)
  const reverseRule = pairMatrix.find(
    rule => rule.originStateCode === destStateCode && rule.destStateCode === originStateCode
  );

  if (!reverseRule) {
    return {
      exists: false,
      message: `${originStateCode} does not have a reciprocity rule for vehicles from ${destStateCode}. Mutual credit required but not found.`
    };
  }

  if (reverseRule.disallowCredit) {
    return {
      exists: false,
      message: `${originStateCode} explicitly disallows credit for ${destStateCode}. Mutual credit required but not found.`,
      reverseMode: 'NONE'
    };
  }

  const reverseMode = reverseRule.mode || 'CREDIT_UP_TO_STATE_RATE';

  if (reverseMode === 'NONE') {
    return {
      exists: false,
      message: `${originStateCode} reciprocity mode is NONE for ${destStateCode}. Mutual credit required but not found.`,
      reverseMode
    };
  }

  return {
    exists: true,
    message: `Mutual credit confirmed: ${originStateCode} reciprocates with ${destStateCode} (mode: ${reverseMode}).`,
    reverseMode
  };
}

/**
 * Determine vehicle class from input
 */
function determineVehicleClass(input: TaxCalculationInput): VehicleClass {
  // Priority 1: Explicit vehicle class
  if (input.vehicle.vehicleClass) {
    return input.vehicle.vehicleClass;
  }

  // Priority 2: Infer from vehicle type
  if (input.vehicle.type) {
    const typeMap: Record<string, VehicleClass> = {
      'PASSENGER_CAR': 'PASSENGER',
      'SUV': 'PASSENGER',
      'TRUCK': 'LIGHT_TRUCK',
      'VAN': 'PASSENGER',
      'MOTORCYCLE': 'MOTORCYCLE',
      'RV': 'RV',
      'TRAILER': 'TRAILER',
      'COMMERCIAL': 'COMMERCIAL',
      'HEAVY_TRUCK': 'HEAVY_TRUCK',
      'BUS': 'BUS'
    };

    const mapped = typeMap[input.vehicle.type];
    if (mapped) {
      return mapped;
    }
  }

  // Priority 3: Infer from GVW
  if (input.vehicle.gvwLbs !== undefined) {
    if (input.vehicle.gvwLbs <= 10000) {
      return 'PASSENGER';
    } else if (input.vehicle.gvwLbs <= 26000) {
      return 'LIGHT_TRUCK';
    } else {
      return 'HEAVY_TRUCK';
    }
  }

  // Default
  return 'PASSENGER';
}

/**
 * Check if GVW is within specified range
 */
function isWithinGVWRange(gvwLbs: number, range: GVWRange): boolean {
  const { minLbs, maxLbs } = range;

  if (minLbs !== undefined && gvwLbs < minLbs) {
    return false;
  }

  if (maxLbs !== undefined && gvwLbs > maxLbs) {
    return false;
  }

  return true;
}

/**
 * Build human-readable override reason
 */
function buildOverrideReason(
  override: StatePairReciprocity,
  originStateCode: string
): string {
  const reasons: string[] = [];

  if (override.disallowCredit) {
    reasons.push('nonreciprocal state');
  }

  if (override.maxAgeDaysSinceTaxPaid !== undefined) {
    reasons.push(`${override.maxAgeDaysSinceTaxPaid}-day time window`);
  }

  if (override.requiresMutualCredit) {
    reasons.push('mutual credit requirement');
  }

  if (override.requiresSameOwner) {
    reasons.push('same owner requirement');
  }

  if (override.appliesToVehicleClass && override.appliesToVehicleClass.length > 0) {
    reasons.push(`vehicle class: ${override.appliesToVehicleClass.join(', ')}`);
  }

  if (override.appliesToGVWRange) {
    const { minLbs, maxLbs } = override.appliesToGVWRange;
    const rangeStr = minLbs !== undefined && maxLbs !== undefined
      ? `${minLbs}-${maxLbs} lbs`
      : minLbs !== undefined
      ? `≥${minLbs} lbs`
      : `≤${maxLbs} lbs`;
    reasons.push(`GVW: ${rangeStr}`);
  }

  if (reasons.length === 0) {
    return `Override for ${originStateCode}`;
  }

  return `Override for ${originStateCode}: ${reasons.join(', ')}`;
}

/**
 * Validate reciprocity configuration for a state
 *
 * @param rules - Tax rules to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateReciprocityConfig(rules: TaxRulesConfig): string[] {
  const errors: string[] = [];

  if (!rules.reciprocity) {
    return errors; // Reciprocity is optional
  }

  // Check for circular dependencies in mutual credit requirements
  if (rules.reciprocity.overrides) {
    for (const override of rules.reciprocity.overrides) {
      if (override.requiresMutualCredit) {
        // Find reverse rule
        const reverseRule = rules.reciprocity.overrides.find(
          r => r.originStateCode === override.destStateCode &&
               r.destStateCode === override.originStateCode
        );

        if (reverseRule?.requiresMutualCredit) {
          errors.push(
            `Circular mutual credit requirement: ${override.originStateCode} ↔ ${override.destStateCode}`
          );
        }
      }
    }
  }

  // Check for duplicate overrides
  if (rules.reciprocity.overrides) {
    const seen = new Set<string>();
    for (const override of rules.reciprocity.overrides) {
      const key = `${override.originStateCode}→${override.destStateCode}`;
      if (seen.has(key)) {
        errors.push(`Duplicate reciprocity override: ${key}`);
      }
      seen.add(key);
    }
  }

  // Check for invalid time windows
  if (rules.reciprocity.overrides) {
    for (const override of rules.reciprocity.overrides) {
      if (override.maxAgeDaysSinceTaxPaid !== undefined && override.maxAgeDaysSinceTaxPaid < 0) {
        errors.push(
          `Invalid time window for ${override.originStateCode}→${override.destStateCode}: ${override.maxAgeDaysSinceTaxPaid} days`
        );
      }
    }
  }

  return errors;
}

/**
 * Get all states that have reciprocity with a given state
 *
 * @param stateCode - State code to check
 * @param allRules - Array of all state tax rules
 * @returns Array of state codes that have reciprocity
 */
export function getReciprocalStates(
  stateCode: string,
  allRules: TaxRulesConfig[]
): Array<{
  stateCode: string;
  mode: ReciprocityMode;
  hasRestrictions: boolean;
}> {
  const stateRules = allRules.find(r => r.stateCode === stateCode);

  if (!stateRules?.reciprocity?.enabled) {
    return [];
  }

  const reciprocalStates: Array<{
    stateCode: string;
    mode: ReciprocityMode;
    hasRestrictions: boolean;
  }> = [];

  // If no overrides, all states get default mode
  if (!stateRules.reciprocity.overrides || stateRules.reciprocity.overrides.length === 0) {
    const defaultMode = stateRules.reciprocity.defaultMode || 'CREDIT_UP_TO_STATE_RATE';
    return allRules
      .filter(r => r.stateCode !== stateCode)
      .map(r => ({
        stateCode: r.stateCode,
        mode: defaultMode,
        hasRestrictions: false
      }));
  }

  // Process overrides
  for (const override of stateRules.reciprocity.overrides) {
    if (override.originStateCode !== stateCode) {
      continue; // Wrong direction
    }

    const mode = override.disallowCredit ? 'NONE' : (override.mode || stateRules.reciprocity.defaultMode || 'CREDIT_UP_TO_STATE_RATE');
    const hasRestrictions = Boolean(
      override.maxAgeDaysSinceTaxPaid !== undefined ||
      override.requiresMutualCredit ||
      override.requiresSameOwner ||
      override.appliesToVehicleClass ||
      override.appliesToGVWRange
    );

    reciprocalStates.push({
      stateCode: override.destStateCode,
      mode,
      hasRestrictions
    });
  }

  return reciprocalStates;
}
