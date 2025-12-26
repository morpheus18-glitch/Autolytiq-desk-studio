/**
 * INDIANA LEASE VEHICLE TAX CALCULATOR - CERTIFIED KERNEL
 *
 * Kernel ID: indiana-lease-v1.0.0
 * Version: 1.0.0
 * Jurisdiction: Indiana (statewide, all 92 counties)
 * Transaction Type: Lease - New and Used Vehicles
 * Tax Method: MONTHLY (tax on each payment)
 *
 * CRITICAL DIFFERENCES FROM RETAIL:
 * - Service contracts (VSC): NOT taxable on leases (saves 7%)
 * - GAP insurance: NOT taxable on leases (saves 7%)
 * - Cap cost reductions: NOT taxed (down payment, rebates, trade-in)
 * - Tax collected monthly on each payment
 * - Doc fee taxed upfront at inception
 *
 * This is a LIABILITY-CRITICAL, PURE, DETERMINISTIC calculator.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface OriginTaxInfo {
  stateCode: string;
  amount: number;
}

export interface IndianaLeaseInput {
  // === REQUIRED ===
  dealType: 'LEASE';
  grossCapCost: number;
  baseMonthlyPayment: number;
  paymentCount: number;
  residualValue: number;

  // === OPTIONAL ===
  docFee?: number;
  firstPaymentDueAtSigning?: boolean;

  // === CAP COST REDUCTIONS (NOT taxed) ===
  capReductionCash?: number;
  capReductionRebateMfr?: number;
  capReductionRebateDealer?: number;
  capReductionTradeIn?: number;

  // === TRADE-IN DETAILS ===
  tradeInValue?: number;
  tradeInPayoff?: number;

  // === BACKEND PRODUCTS (NOT taxable on leases) ===
  serviceContracts?: number;
  gap?: number;

  // === RECIPROCITY ===
  originTaxInfo?: OriginTaxInfo;

  // === OUT OF SCOPE FLAGS ===
  isRetail?: boolean;
  isCommercialVehicle?: boolean;
  isTaxExempt?: boolean;
  isLeaseBuyout?: boolean;
}

export interface UpfrontBreakdown {
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  components: {
    docFeeTax: number;
    firstPaymentTax: number;
  };
}

export interface MonthlyBreakdown {
  basePayment: number;
  taxRate: number;
  taxPerPayment: number;
  totalPaymentWithTax: number;
}

export interface CapCostReductions {
  cash: number;
  rebateMfr: number;
  rebateDealer: number;
  tradeInEquity: number;
  total: number;
}

export interface ReciprocityInfo {
  creditApplied: number;
  originState: string | null;
  originalUpfrontTax: number;
}

export interface LeaseBreakdown {
  upfront: UpfrontBreakdown;
  monthly: MonthlyBreakdown;
  totalTaxOverTerm: number;
  capCostReductions: CapCostReductions;
  negativeEquity: number;
  reciprocity: ReciprocityInfo;
  backendProductsNotTaxed: {
    serviceContracts: number;
    gap: number;
    taxSavingsVsRetail: number;
  };
}

export interface AuditTrail {
  rulesApplied: string[];
  notes: string[];
  calculatedAt: string;
}

export interface IndianaLeaseSuccess {
  success: true;
  kernelVersion: string;
  breakdown: LeaseBreakdown;
  audit: AuditTrail;
}

export interface IndianaLeaseError {
  success: false;
  errorCode: string;
  message: string;
  violatedRule: string | null;
  kernelVersion: string;
}

export type IndianaLeaseResult = IndianaLeaseSuccess | IndianaLeaseError;

// =============================================================================
// CONSTANTS
// =============================================================================

const KERNEL_VERSION = 'indiana-lease-v1.0.0';
const INDIANA_TAX_RATE = 0.07;
const DOC_FEE_CAP = 250;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  INVALID_DEAL_TYPE: 'ERR_INVALID_DEAL_TYPE',
  INVALID_CAP_COST: 'ERR_INVALID_CAP_COST',
  INVALID_PAYMENT: 'ERR_INVALID_PAYMENT',
  INVALID_TERM: 'ERR_INVALID_TERM',
  INVALID_RESIDUAL: 'ERR_INVALID_RESIDUAL',
  DOC_FEE_EXCEEDS_CAP: 'ERR_DOC_FEE_EXCEEDS_CAP',
  INVALID_AMOUNT: 'ERR_INVALID_AMOUNT',
  RETAIL_NOT_SUPPORTED: 'ERR_RETAIL_NOT_SUPPORTED',
  COMMERCIAL_VEHICLE_NOT_SUPPORTED: 'ERR_COMMERCIAL_VEHICLE_NOT_SUPPORTED',
  TAX_EXEMPT_NOT_SUPPORTED: 'ERR_TAX_EXEMPT_NOT_SUPPORTED',
  LEASE_BUYOUT_NOT_SUPPORTED: 'ERR_LEASE_BUYOUT_NOT_SUPPORTED',
} as const;

// =============================================================================
// HELPERS
// =============================================================================

function createError(
  errorCode: string,
  message: string,
  violatedRule: string | null = null
): IndianaLeaseError {
  return {
    success: false,
    errorCode,
    message,
    violatedRule,
    kernelVersion: KERNEL_VERSION,
  };
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateInput(input: IndianaLeaseInput): IndianaLeaseError | null {
  // === OUT OF SCOPE CHECKS ===

  if (input.isRetail === true) {
    return createError(
      ErrorCodes.RETAIL_NOT_SUPPORTED,
      'Retail purchases require the indiana-retail kernel. This kernel only supports LEASE transactions.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isCommercialVehicle === true) {
    return createError(
      ErrorCodes.COMMERCIAL_VEHICLE_NOT_SUPPORTED,
      'Commercial vehicle leases (>16,000 lbs GVWR) are out of scope.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isTaxExempt === true) {
    return createError(
      ErrorCodes.TAX_EXEMPT_NOT_SUPPORTED,
      'Tax-exempt lease transactions are out of scope.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  if (input.isLeaseBuyout === true) {
    return createError(
      ErrorCodes.LEASE_BUYOUT_NOT_SUPPORTED,
      'Lease buyouts have different tax treatment and are out of scope.',
      'SCOPE_CONTRACT.md Section 2'
    );
  }

  // === REQUIRED FIELD VALIDATION ===

  if (input.dealType !== 'LEASE') {
    return createError(
      ErrorCodes.INVALID_DEAL_TYPE,
      `Deal type "${input.dealType}" is not supported. This kernel only supports LEASE transactions.`,
      'VAL-001'
    );
  }

  if (!isValidPositive(input.grossCapCost)) {
    return createError(
      ErrorCodes.INVALID_CAP_COST,
      'Gross capitalized cost must be a positive number.',
      'VAL-002'
    );
  }

  if (!isValidPositive(input.baseMonthlyPayment)) {
    return createError(
      ErrorCodes.INVALID_PAYMENT,
      'Base monthly payment must be a positive number.',
      'VAL-003'
    );
  }

  if (!isValidPositive(input.paymentCount) || !Number.isInteger(input.paymentCount)) {
    return createError(
      ErrorCodes.INVALID_TERM,
      'Payment count must be a positive integer.',
      'VAL-004'
    );
  }

  if (!isValidAmount(input.residualValue)) {
    return createError(
      ErrorCodes.INVALID_RESIDUAL,
      'Residual value must be a non-negative number.',
      'VAL-005'
    );
  }

  // === DOC FEE CAP ===

  const docFee = input.docFee ?? 0;
  if (!isValidAmount(docFee)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Doc fee must be a valid non-negative number.',
      'VAL-006'
    );
  }
  if (docFee > DOC_FEE_CAP) {
    return createError(
      ErrorCodes.DOC_FEE_EXCEEDS_CAP,
      `Doc fee of $${docFee.toFixed(2)} exceeds Indiana statutory cap of $${DOC_FEE_CAP} (IC 6-6-5.5).`,
      'IN-L-002'
    );
  }

  // === OPTIONAL FIELD VALIDATION ===

  const optionalAmounts = [
    { name: 'capReductionCash', value: input.capReductionCash },
    { name: 'capReductionRebateMfr', value: input.capReductionRebateMfr },
    { name: 'capReductionRebateDealer', value: input.capReductionRebateDealer },
    { name: 'capReductionTradeIn', value: input.capReductionTradeIn },
    { name: 'tradeInValue', value: input.tradeInValue },
    { name: 'tradeInPayoff', value: input.tradeInPayoff },
    { name: 'serviceContracts', value: input.serviceContracts },
    { name: 'gap', value: input.gap },
  ];

  for (const { name, value } of optionalAmounts) {
    if (value !== undefined && !isValidAmount(value)) {
      return createError(
        ErrorCodes.INVALID_AMOUNT,
        `${name} must be a valid non-negative number.`,
        'VAL-007'
      );
    }
  }

  if (input.originTaxInfo && !isValidAmount(input.originTaxInfo.amount)) {
    return createError(
      ErrorCodes.INVALID_AMOUNT,
      'Origin tax amount must be a valid non-negative number.',
      'VAL-008'
    );
  }

  return null;
}

// =============================================================================
// MAIN CALCULATION
// =============================================================================

export function calculateIndianaLeaseTax(
  input: IndianaLeaseInput
): IndianaLeaseResult {
  // === VALIDATE ===
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  // === INITIALIZE ===
  const rulesApplied: string[] = [];
  const notes: string[] = [];
  const calculatedAt = new Date().toISOString();

  // === NORMALIZE INPUTS ===
  const docFee = input.docFee ?? 0;
  const firstPaymentDueAtSigning = input.firstPaymentDueAtSigning ?? true;
  const capReductionCash = input.capReductionCash ?? 0;
  const capReductionRebateMfr = input.capReductionRebateMfr ?? 0;
  const capReductionRebateDealer = input.capReductionRebateDealer ?? 0;
  const capReductionTradeIn = input.capReductionTradeIn ?? 0;
  const tradeInValue = input.tradeInValue ?? 0;
  const tradeInPayoff = input.tradeInPayoff ?? 0;
  const serviceContracts = input.serviceContracts ?? 0;
  const gap = input.gap ?? 0;

  rulesApplied.push('IN-L-001');
  notes.push(`Lease method: MONTHLY (tax on each payment)`);
  notes.push(`Base monthly payment: $${input.baseMonthlyPayment.toFixed(2)}`);
  notes.push(`Term: ${input.paymentCount} months`);

  // === CALCULATE NEGATIVE EQUITY (IN-L-006) ===
  const negativeEquity = Math.max(0, tradeInPayoff - tradeInValue);
  if (negativeEquity > 0) {
    rulesApplied.push('IN-L-006');
    notes.push(`Negative equity: $${negativeEquity.toFixed(2)} (increases cap cost and monthly payment)`);
  }

  // === CALCULATE CAP COST REDUCTIONS (IN-L-004, IN-L-005) ===
  const totalCapReductions = capReductionCash + capReductionRebateMfr +
                             capReductionRebateDealer + capReductionTradeIn;

  if (totalCapReductions > 0) {
    rulesApplied.push('IN-L-004');
    notes.push(`Total cap cost reductions: $${totalCapReductions.toFixed(2)} (NOT taxed)`);
  }

  if (capReductionTradeIn > 0) {
    rulesApplied.push('IN-L-005');
    notes.push(`Trade-in equity applied as cap reduction: $${capReductionTradeIn.toFixed(2)}`);
  }

  // === DOCUMENT NON-TAXABLE BACKEND PRODUCTS (IN-L-007, IN-L-008) ===
  if (serviceContracts > 0) {
    rulesApplied.push('IN-L-007');
    notes.push(`Service contract: $${serviceContracts.toFixed(2)} - NOT TAXABLE on leases (saves $${(serviceContracts * INDIANA_TAX_RATE).toFixed(2)} vs retail)`);
  }

  if (gap > 0) {
    rulesApplied.push('IN-L-008');
    notes.push(`GAP insurance: $${gap.toFixed(2)} - NOT TAXABLE on leases (saves $${(gap * INDIANA_TAX_RATE).toFixed(2)} vs retail)`);
  }

  const backendTaxSavings = roundCurrency((serviceContracts + gap) * INDIANA_TAX_RATE);

  // === CALCULATE UPFRONT TAX (IN-L-002, IN-L-003) ===
  let upfrontTaxableBase = 0;
  let docFeeTax = 0;
  let firstPaymentTax = 0;

  // Doc fee is always taxed upfront
  if (docFee > 0) {
    rulesApplied.push('IN-L-002');
    upfrontTaxableBase += docFee;
    docFeeTax = roundCurrency(docFee * INDIANA_TAX_RATE);
    notes.push(`Doc fee tax (upfront): $${docFee.toFixed(2)} × 7% = $${docFeeTax.toFixed(2)}`);
  }

  // First payment taxed if due at signing
  if (firstPaymentDueAtSigning) {
    rulesApplied.push('IN-L-003');
    upfrontTaxableBase += input.baseMonthlyPayment;
    firstPaymentTax = roundCurrency(input.baseMonthlyPayment * INDIANA_TAX_RATE);
    notes.push(`First payment tax (upfront): $${input.baseMonthlyPayment.toFixed(2)} × 7% = $${firstPaymentTax.toFixed(2)}`);
  }

  const baseUpfrontTax = roundCurrency(docFeeTax + firstPaymentTax);
  notes.push(`Total upfront tax (before reciprocity): $${baseUpfrontTax.toFixed(2)}`);

  // === APPLY RECIPROCITY TO UPFRONT (IN-L-009) ===
  let reciprocityCredit = 0;
  let originState: string | null = null;

  if (input.originTaxInfo && input.originTaxInfo.amount > 0) {
    rulesApplied.push('IN-L-009');
    originState = input.originTaxInfo.stateCode;
    reciprocityCredit = Math.min(input.originTaxInfo.amount, baseUpfrontTax);
    notes.push(`Reciprocity credit from ${originState}: $${reciprocityCredit.toFixed(2)} (applied to upfront only)`);
  }

  const finalUpfrontTax = roundCurrency(Math.max(0, baseUpfrontTax - reciprocityCredit));

  // === CALCULATE MONTHLY TAX ===
  const taxPerPayment = roundCurrency(input.baseMonthlyPayment * INDIANA_TAX_RATE);
  const totalPaymentWithTax = roundCurrency(input.baseMonthlyPayment + taxPerPayment);
  notes.push(`Monthly payment tax: $${input.baseMonthlyPayment.toFixed(2)} × 7% = $${taxPerPayment.toFixed(2)}`);
  notes.push(`Total monthly with tax: $${totalPaymentWithTax.toFixed(2)}`);

  // === CALCULATE TOTAL TAX OVER TERM ===
  // If first payment is at signing, remaining payments = paymentCount - 1
  const remainingPayments = firstPaymentDueAtSigning ? input.paymentCount - 1 : input.paymentCount;
  const totalMonthlyTax = roundCurrency(taxPerPayment * remainingPayments);
  const totalTaxOverTerm = roundCurrency(finalUpfrontTax + totalMonthlyTax);

  notes.push(`Remaining monthly payments: ${remainingPayments}`);
  notes.push(`Total monthly tax over term: $${taxPerPayment.toFixed(2)} × ${remainingPayments} = $${totalMonthlyTax.toFixed(2)}`);
  notes.push(`Total tax over lease term: $${finalUpfrontTax.toFixed(2)} (upfront) + $${totalMonthlyTax.toFixed(2)} (monthly) = $${totalTaxOverTerm.toFixed(2)}`);

  // === BUILD RESULT ===
  const breakdown: LeaseBreakdown = {
    upfront: {
      taxableBase: roundCurrency(upfrontTaxableBase),
      taxRate: INDIANA_TAX_RATE,
      taxAmount: finalUpfrontTax,
      components: {
        docFeeTax,
        firstPaymentTax: firstPaymentDueAtSigning ? firstPaymentTax : 0,
      },
    },
    monthly: {
      basePayment: input.baseMonthlyPayment,
      taxRate: INDIANA_TAX_RATE,
      taxPerPayment,
      totalPaymentWithTax,
    },
    totalTaxOverTerm,
    capCostReductions: {
      cash: capReductionCash,
      rebateMfr: capReductionRebateMfr,
      rebateDealer: capReductionRebateDealer,
      tradeInEquity: capReductionTradeIn,
      total: totalCapReductions,
    },
    negativeEquity,
    reciprocity: {
      creditApplied: reciprocityCredit,
      originState,
      originalUpfrontTax: baseUpfrontTax,
    },
    backendProductsNotTaxed: {
      serviceContracts,
      gap,
      taxSavingsVsRetail: backendTaxSavings,
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
