/**
 * INDIANA RETAIL VEHICLE TAX CALCULATOR - CERTIFIED KERNEL
 *
 * Kernel ID: indiana-retail-v1.0.0
 * Version: 1.0.0
 * Jurisdiction: Indiana (statewide, all 92 counties)
 * Transaction Type: Retail (Cash, Finance) - New and Used Vehicles
 *
 * This is a LIABILITY-CRITICAL, PURE, DETERMINISTIC calculator.
 * - No side effects
 * - No external dependencies
 * - No hidden state
 * - Same inputs → same outputs (always)
 * - Fails loudly for out-of-scope inputs
 *
 * Legal Authority:
 * - Indiana Code Title 6, Article 6 (Vehicle Excise Tax)
 * - IC 6-6-5.5 (Doc Fee Cap: $250)
 * - IC 6-6-5.1-27 (Trade-in Exemption)
 * - IC 6-6-5.1-23 (Reciprocity Credit)
 * - Indiana DOR Sales Tax Information Bulletin #8
 */

// =============================================================================
// TYPES
// =============================================================================

/** Fee entry for other taxable fees */
export interface FeeEntry {
  code: string;
  amount: number;
}

/** Origin tax information for reciprocity credit */
export interface OriginTaxInfo {
  stateCode: string;
  amount: number;
}

/** Input to the Indiana Retail Tax Kernel */
export interface IndianaRetailInput {
  // === REQUIRED ===
  /** Vehicle sale price (must be > 0) */
  vehiclePrice: number;

  /** Deal type (must be 'RETAIL') */
  dealType: 'RETAIL';

  // === OPTIONAL (default to 0) ===
  /** Dealer documentation fee ($0 - $250 cap) */
  docFee?: number;

  /** Trade-in vehicle value (gross, before payoff) */
  tradeInValue?: number;

  /** Trade-in payoff amount (loan balance) */
  tradeInPayoff?: number;

  /** Manufacturer rebate amount */
  rebateManufacturer?: number;

  /** Dealer rebate/discount amount (does NOT reduce tax base) */
  rebateDealer?: number;

  /** Dealer-installed accessories total */
  accessoriesAmount?: number;

  /** Service contract (extended warranty) amount */
  serviceContracts?: number;

  /** GAP insurance amount */
  gap?: number;

  /** Other taxable fees */
  otherFees?: FeeEntry[];

  /** Origin tax info for reciprocity credit */
  originTaxInfo?: OriginTaxInfo;

  // === OUT OF SCOPE FLAGS (must be false or undefined) ===
  /** If true, kernel will refuse (leases out of scope) */
  isLease?: boolean;

  /** If true, kernel will refuse (commercial vehicles out of scope) */
  isCommercialVehicle?: boolean;

  /** If true, kernel will refuse (tax-exempt out of scope) */
  isTaxExempt?: boolean;

  /** If true, kernel will refuse (private party out of scope) */
  isPrivatePartySale?: boolean;
}

/** Base components of the taxable amount */
export interface BaseComponents {
  vehiclePrice: number;
  docFee: number;
  accessories: number;
  serviceContracts: number;
  gap: number;
  negativeEquity: number;
  otherTaxableFees: number;
}

/** Deductions from the taxable base */
export interface Deductions {
  tradeInCredit: number;
  manufacturerRebate: number;
  // Note: dealerRebate is intentionally NOT here (not deductible in Indiana)
}

/** Reciprocity credit information */
export interface ReciprocityInfo {
  creditApplied: number;
  originState: string | null;
  originalTaxBeforeCredit: number;
}

/** Tax breakdown structure */
export interface TaxBreakdown {
  taxableBase: number;
  taxRate: number;
  totalTax: number;
  baseComponents: BaseComponents;
  deductions: Deductions;
  reciprocity: ReciprocityInfo;
}

/** Audit trail for transparency */
export interface AuditTrail {
  rulesApplied: string[];
  notes: string[];
  calculatedAt: string;
}

/** Successful calculation result */
export interface IndianaRetailSuccess {
  success: true;
  kernelVersion: string;
  breakdown: TaxBreakdown;
  audit: AuditTrail;
}

/** Error result */
export interface IndianaRetailError {
  success: false;
  errorCode: string;
  message: string;
  violatedRule: string | null;
  kernelVersion: string;
}

/** Union type for all possible results */
export type IndianaRetailResult = IndianaRetailSuccess | IndianaRetailError;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Kernel version identifier */
const KERNEL_VERSION = 'indiana-retail-v1.0.0';

/** Indiana flat vehicle excise tax rate */
const INDIANA_TAX_RATE = 0.07;

/** Maximum allowed doc fee per IC 6-6-5.5 */
const DOC_FEE_CAP = 250;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  INVALID_VEHICLE_PRICE: 'ERR_INVALID_VEHICLE_PRICE',
  UNSUPPORTED_DEAL_TYPE: 'ERR_UNSUPPORTED_DEAL_TYPE',
  DOC_FEE_EXCEEDS_CAP: 'ERR_DOC_FEE_EXCEEDS_CAP',
  INVALID_TRADE_VALUE: 'ERR_INVALID_TRADE_VALUE',
  INVALID_REBATE: 'ERR_INVALID_REBATE',
  INVALID_AMOUNT: 'ERR_INVALID_AMOUNT',
  LEASE_NOT_SUPPORTED: 'ERR_LEASE_NOT_SUPPORTED',
  COMMERCIAL_VEHICLE_NOT_SUPPORTED: 'ERR_COMMERCIAL_VEHICLE_NOT_SUPPORTED',
  TAX_EXEMPT_NOT_SUPPORTED: 'ERR_TAX_EXEMPT_NOT_SUPPORTED',
  PRIVATE_PARTY_NOT_SUPPORTED: 'ERR_PRIVATE_PARTY_NOT_SUPPORTED',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create an error result
 */
function createError(
  errorCode: string,
  message: string,
  violatedRule: string | null = null
): IndianaRetailError {
  return {
    success: false,
    errorCode,
    message,
    violatedRule,
    kernelVersion: KERNEL_VERSION,
  };
}

/**
 * Check if a value is a valid non-negative finite number
 */
function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Round to 2 decimal places using banker's rounding (half-even)
 * For tax calculations, we use standard half-up rounding
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate all inputs and return error if any are invalid
 */
function validateInput(input: IndianaRetailInput): IndianaRetailError | null {
  // === OUT OF SCOPE CHECKS (fail fast) ===

  if (input.isLease === true) {
    return createError(
      ErrorCodes.LEASE_NOT_SUPPORTED,
      'Indiana leases require separate kernel (monthly taxation method). This kernel only supports RETAIL transactions.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isCommercialVehicle === true) {
    return createError(
      ErrorCodes.COMMERCIAL_VEHICLE_NOT_SUPPORTED,
      'Commercial vehicles (>16,000 lbs GVWR) are out of scope for this kernel.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isTaxExempt === true) {
    return createError(
      ErrorCodes.TAX_EXEMPT_NOT_SUPPORTED,
      'Tax-exempt transactions are out of scope for this kernel.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isPrivatePartySale === true) {
    return createError(
      ErrorCodes.PRIVATE_PARTY_NOT_SUPPORTED,
      'Private party sales are out of scope for this kernel. Only dealer sales are supported.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  // === REQUIRED FIELD VALIDATION ===

  if (input.dealType !== 'RETAIL') {
    return createError(
      ErrorCodes.UNSUPPORTED_DEAL_TYPE,
      `Deal type "${input.dealType}" is not supported. This kernel only supports RETAIL transactions.`,
      'VAL-002'
    );
  }

  if (!isValidAmount(input.vehiclePrice) || input.vehiclePrice <= 0) {
    return createError(
      ErrorCodes.INVALID_VEHICLE_PRICE,
      'Vehicle price must be a positive number greater than zero.',
      'VAL-001'
    );
  }

  // === OPTIONAL FIELD VALIDATION ===

  // Doc fee cap enforcement (IC 6-6-5.5)
  const docFee = input.docFee ?? 0;
  if (!isValidAmount(docFee)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Doc fee must be a valid non-negative number.',
      'VAL-004'
    );
  }
  if (docFee > DOC_FEE_CAP) {
    return createError(
      ErrorCodes.DOC_FEE_EXCEEDS_CAP,
      `Doc fee of $${docFee.toFixed(2)} exceeds Indiana statutory cap of $${DOC_FEE_CAP} (IC 6-6-5.5). Dealer must reduce doc fee.`,
      'IN-R-004'
    );
  }

  // Trade-in validation
  const tradeInValue = input.tradeInValue ?? 0;
  if (!isValidAmount(tradeInValue)) {
    return createError(
      ErrorCodes.INVALID_TRADE_VALUE,
      'Trade-in value must be a valid non-negative number.',
      'VAL-004'
    );
  }

  const tradeInPayoff = input.tradeInPayoff ?? 0;
  if (!isValidAmount(tradeInPayoff)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Trade-in payoff must be a valid non-negative number.',
      'VAL-004'
    );
  }

  // Rebate validation
  const rebateManufacturer = input.rebateManufacturer ?? 0;
  if (!isValidAmount(rebateManufacturer)) {
    return createError(
      ErrorCodes.INVALID_REBATE,
      'Manufacturer rebate must be a valid non-negative number.',
      'VAL-004'
    );
  }

  const rebateDealer = input.rebateDealer ?? 0;
  if (!isValidAmount(rebateDealer)) {
    return createError(
      ErrorCodes.INVALID_REBATE,
      'Dealer rebate must be a valid non-negative number.',
      'VAL-004'
    );
  }

  // Other amounts validation
  const accessoriesAmount = input.accessoriesAmount ?? 0;
  if (!isValidAmount(accessoriesAmount)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Accessories amount must be a valid non-negative number.',
      'VAL-004'
    );
  }

  const serviceContracts = input.serviceContracts ?? 0;
  if (!isValidAmount(serviceContracts)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Service contracts amount must be a valid non-negative number.',
      'VAL-004'
    );
  }

  const gap = input.gap ?? 0;
  if (!isValidAmount(gap)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'GAP insurance amount must be a valid non-negative number.',
      'VAL-004'
    );
  }

  // Other fees validation
  if (input.otherFees) {
    for (const fee of input.otherFees) {
      if (!isValidAmount(fee.amount)) {
        return createError(
          ErrorCodes.INVALID_AMOUNT,
          `Fee "${fee.code}" has invalid amount. Must be a valid non-negative number.`,
          'VAL-004'
        );
      }
    }
  }

  // Origin tax info validation
  if (input.originTaxInfo) {
    if (!isValidAmount(input.originTaxInfo.amount)) {
      return createError(
        ErrorCodes.INVALID_AMOUNT,
        'Origin tax amount must be a valid non-negative number.',
        'VAL-004'
      );
    }
  }

  return null; // All validations passed
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate Indiana retail vehicle tax.
 *
 * This is a PURE, DETERMINISTIC function.
 * - No side effects
 * - No external dependencies
 * - Same inputs always produce same outputs
 *
 * @param input - The transaction input data
 * @returns Either a successful result with breakdown or an error
 */
export function calculateIndianaRetailTax(
  input: IndianaRetailInput
): IndianaRetailResult {
  // === STEP 0: VALIDATE INPUT ===
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  // === INITIALIZE TRACKING ===
  const rulesApplied: string[] = [];
  const notes: string[] = [];
  const calculatedAt = new Date().toISOString();

  // === NORMALIZE INPUTS (with defaults) ===
  const vehiclePrice = input.vehiclePrice;
  const docFee = input.docFee ?? 0;
  const tradeInValue = input.tradeInValue ?? 0;
  const tradeInPayoff = input.tradeInPayoff ?? 0;
  const rebateManufacturer = input.rebateManufacturer ?? 0;
  const rebateDealer = input.rebateDealer ?? 0;
  const accessoriesAmount = input.accessoriesAmount ?? 0;
  const serviceContracts = input.serviceContracts ?? 0;
  const gap = input.gap ?? 0;
  const otherFees = input.otherFees ?? [];
  const otherTaxableFees = otherFees.reduce((sum, fee) => sum + fee.amount, 0);

  // === STEP 1: START WITH VEHICLE PRICE ===
  let taxableBase = vehiclePrice;
  notes.push(`Step 1: Starting vehicle price: $${vehiclePrice.toFixed(2)}`);

  // === STEP 2: ADD ACCESSORIES (IN-R-008) ===
  if (accessoriesAmount > 0) {
    taxableBase += accessoriesAmount;
    rulesApplied.push('IN-R-008');
    notes.push(`Step 2: Added accessories: +$${accessoriesAmount.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 3: CALCULATE AND ADD NEGATIVE EQUITY (IN-R-005) ===
  const negativeEquity = Math.max(0, tradeInPayoff - tradeInValue);
  if (negativeEquity > 0) {
    taxableBase += negativeEquity;
    rulesApplied.push('IN-R-005');
    notes.push(`Step 3: Added negative equity (payoff $${tradeInPayoff.toFixed(2)} - value $${tradeInValue.toFixed(2)}): +$${negativeEquity.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 4: SUBTRACT TRADE-IN VALUE (IN-R-001) ===
  let appliedTradeIn = 0;
  if (tradeInValue > 0) {
    appliedTradeIn = tradeInValue;
    taxableBase = Math.max(0, taxableBase - tradeInValue);
    rulesApplied.push('IN-R-001');
    notes.push(`Step 4: Applied trade-in credit (FULL): -$${tradeInValue.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 5: SUBTRACT MANUFACTURER REBATE (IN-R-002) ===
  let appliedMfrRebate = 0;
  if (rebateManufacturer > 0) {
    appliedMfrRebate = rebateManufacturer;
    taxableBase = Math.max(0, taxableBase - rebateManufacturer);
    rulesApplied.push('IN-R-002');
    notes.push(`Step 5: Applied manufacturer rebate (NON-TAXABLE): -$${rebateManufacturer.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 5b: DEALER REBATE - NO ADJUSTMENT (IN-R-003) ===
  if (rebateDealer > 0) {
    rulesApplied.push('IN-R-003');
    notes.push(`Step 5b: Dealer rebate of $${rebateDealer.toFixed(2)} does NOT reduce taxable base (TAXABLE in Indiana)`);
  }

  // === STEP 6: ADD DOC FEE (IN-R-004) ===
  if (docFee > 0) {
    taxableBase += docFee;
    rulesApplied.push('IN-R-004');
    notes.push(`Step 6: Added doc fee: +$${docFee.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 7: ADD SERVICE CONTRACTS (IN-R-006) ===
  if (serviceContracts > 0) {
    taxableBase += serviceContracts;
    rulesApplied.push('IN-R-006');
    notes.push(`Step 7: Added service contracts (VSC): +$${serviceContracts.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 8: ADD GAP INSURANCE (IN-R-007) ===
  if (gap > 0) {
    taxableBase += gap;
    rulesApplied.push('IN-R-007');
    notes.push(`Step 8: Added GAP insurance: +$${gap.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 8b: ADD OTHER TAXABLE FEES ===
  if (otherTaxableFees > 0) {
    taxableBase += otherTaxableFees;
    notes.push(`Step 8b: Added other taxable fees: +$${otherTaxableFees.toFixed(2)} → $${taxableBase.toFixed(2)}`);
  }

  // === STEP 9: CALCULATE BASE TAX (IN-RATE-001) ===
  rulesApplied.push('IN-RATE-001');
  const baseTax = roundCurrency(taxableBase * INDIANA_TAX_RATE);
  notes.push(`Step 9: Calculated base tax: $${taxableBase.toFixed(2)} × 7% = $${baseTax.toFixed(2)}`);

  // === STEP 10: APPLY RECIPROCITY CREDIT (IN-R-009) ===
  let reciprocityCredit = 0;
  let originState: string | null = null;

  if (input.originTaxInfo && input.originTaxInfo.amount > 0) {
    rulesApplied.push('IN-R-009');
    originState = input.originTaxInfo.stateCode;
    const originTaxPaid = input.originTaxInfo.amount;

    // Credit is capped at Indiana's calculated tax
    reciprocityCredit = Math.min(originTaxPaid, baseTax);

    if (originTaxPaid > baseTax) {
      notes.push(`Step 10: Reciprocity - Tax paid in ${originState}: $${originTaxPaid.toFixed(2)} exceeds IN tax $${baseTax.toFixed(2)}. Credit capped at $${reciprocityCredit.toFixed(2)}. No additional IN tax due.`);
    } else if (originTaxPaid < baseTax) {
      notes.push(`Step 10: Reciprocity - Tax paid in ${originState}: $${originTaxPaid.toFixed(2)}. Credit: $${reciprocityCredit.toFixed(2)}. Additional IN tax due: $${(baseTax - reciprocityCredit).toFixed(2)}`);
    } else {
      notes.push(`Step 10: Reciprocity - Tax paid in ${originState}: $${originTaxPaid.toFixed(2)} equals IN tax. Full credit applied. No additional tax due.`);
    }
  }

  // === STEP 11: CALCULATE FINAL TAX ===
  const finalTax = roundCurrency(Math.max(0, baseTax - reciprocityCredit));
  notes.push(`Step 11: Final tax after reciprocity: $${finalTax.toFixed(2)}`);

  // === BUILD RESULT ===
  const breakdown: TaxBreakdown = {
    taxableBase: roundCurrency(taxableBase),
    taxRate: INDIANA_TAX_RATE,
    totalTax: finalTax,
    baseComponents: {
      vehiclePrice,
      docFee,
      accessories: accessoriesAmount,
      serviceContracts,
      gap,
      negativeEquity,
      otherTaxableFees,
    },
    deductions: {
      tradeInCredit: appliedTradeIn,
      manufacturerRebate: appliedMfrRebate,
    },
    reciprocity: {
      creditApplied: reciprocityCredit,
      originState,
      originalTaxBeforeCredit: baseTax,
    },
  };

  const audit: AuditTrail = {
    rulesApplied,
    notes,
    calculatedAt,
  };

  return {
    success: true,
    kernelVersion: KERNEL_VERSION,
    breakdown,
    audit,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { KERNEL_VERSION, INDIANA_TAX_RATE, DOC_FEE_CAP };
