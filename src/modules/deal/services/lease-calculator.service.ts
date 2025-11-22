/**
 * CDK/Reynolds-Grade Lease Calculation Engine
 *
 * Implements industry-standard automotive lease calculations with penny accuracy.
 * All calculations use Decimal.js to avoid floating-point errors.
 *
 * Formula References:
 * - CDK DMS Lease Calculation Guide
 * - Reynolds & Reynolds Lease Module
 * - Automotive Leasing Guide (ALG)
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Input parameters for lease calculation
 */
export interface LeaseCalculationRequest {
  // Vehicle pricing
  msrp: string; // Manufacturer's Suggested Retail Price
  sellingPrice: string; // Negotiated selling price (usually < MSRP)

  // Lease terms
  term: number; // Months (typically 24, 36, 39, 48)
  moneyFactor: string; // Lease rate (e.g., "0.00125" = 3% APR)
  residualPercent: string; // Percentage of MSRP (e.g., "60" = 60%)

  // Cap cost reductions
  cashDown: string; // Customer cash at signing
  tradeAllowance: string; // Trade-in value
  tradePayoff: string; // Trade-in payoff
  manufacturerRebate: string; // Factory incentives (cap cost reduction)
  otherIncentives: string; // Dealer cash, loyalty bonuses, etc.

  // Fees
  acquisitionFee: string; // Bank acquisition fee (typically $595-$995)
  docFee: string; // Dealer documentation fee
  governmentFees: FeeItem[]; // DMV, title, registration
  dealerFees: FeeItem[]; // Other dealer fees
  accessories: FeeItem[]; // Dealer-installed accessories
  aftermarketProducts: FeeItem[]; // VSC, GAP, etc.

  // Tax configuration
  taxRate: string; // Combined sales tax rate (e.g., "0.0825" = 8.25%)
  taxOnMonthlyPayment: boolean; // true = tax monthly payment, false = tax cap cost
  taxableAmount?: string; // Override for states with special tax rules

  // Security deposit (rare, but some leases require it)
  securityDeposit?: string; // Often = 1 monthly payment rounded up

  // State-specific rules
  stateCode: string; // For state-specific tax and fee rules
}

/**
 * Fee item structure
 */
export interface FeeItem {
  name: string;
  amount: string;
  capitalized: boolean; // true = rolled into lease, false = due at signing
  taxable: boolean; // true = subject to sales tax
}

/**
 * Complete lease calculation result
 */
export interface LeaseCalculationResult {
  // Core lease components
  grossCapCost: string; // MSRP + fees + accessories
  totalCapReductions: string; // Down + trade equity + rebates
  adjustedCapCost: string; // Gross cap cost - cap reductions
  residualValue: string; // MSRP × residual %

  // Monthly payment breakdown
  depreciation: string; // Total depreciation over term
  monthlyDepreciationCharge: string; // Depreciation / term
  monthlyRentCharge: string; // (Adj cap cost + residual) × money factor
  baseMonthlyPayment: string; // Depreciation + rent charge (pre-tax)
  monthlyTax: string; // Tax on monthly payment (if applicable)
  monthlyPayment: string; // Total monthly payment (base + tax)

  // Tax breakdown
  upfrontTax: string; // Tax on cap cost (if applicable)
  totalTax: string; // Total tax over life of lease
  taxableAmount: string; // Amount subject to tax

  // Drive-off breakdown
  driveOffBreakdown: DriveOffBreakdown;

  // Total costs
  totalOfPayments: string; // Monthly payment × term
  totalLeaseCost: string; // Total of payments + drive-off
  totalCapitalizedCost: string; // Adjusted cap cost (what's being financed)

  // Validation
  validated: boolean;
  validationWarnings: string[];
}

/**
 * Drive-off amount breakdown (cash due at signing)
 */
export interface DriveOffBreakdown {
  firstPayment: string; // First month's payment
  cashDown: string; // Customer cash down
  acquisitionFee: string; // Bank fee (if not capitalized)
  docFee: string; // Doc fee (if not capitalized)
  upfrontFees: string; // Government fees not capitalized
  upfrontTax: string; // Upfront tax (if applicable)
  securityDeposit: string; // Security deposit (refundable)
  otherCharges: string; // Miscellaneous charges
  total: string; // Total cash due at signing
}

/**
 * Main lease calculator service
 */
export class LeaseCalculatorService {
  /**
   * Calculate complete lease breakdown
   */
  calculateLease(request: LeaseCalculationRequest): LeaseCalculationResult {
    const warnings: string[] = [];

    // Validate inputs
    this.validateInputs(request, warnings);

    // Step 1: Calculate gross capitalized cost
    const grossCapCost = this.calculateGrossCapCost(request);

    // Step 2: Calculate total cap cost reductions
    const totalCapReductions = this.calculateCapCostReductions(request);

    // Step 3: Calculate adjusted capitalized cost
    const adjustedCapCost = grossCapCost.minus(totalCapReductions);

    // Validation: Negative equity warning
    if (adjustedCapCost.lessThan(0)) {
      warnings.push('Negative adjusted cap cost - cap reductions exceed gross cap cost');
    }

    // Step 4: Calculate residual value
    const msrp = new Decimal(request.msrp);
    const residualPercent = new Decimal(request.residualPercent).dividedBy(100);
    const residualValue = msrp.times(residualPercent);

    // Step 5: Calculate depreciation
    const depreciation = adjustedCapCost.minus(residualValue);
    const monthlyDepreciationCharge = depreciation.dividedBy(request.term);

    // Validation: Negative depreciation warning
    if (depreciation.lessThan(0)) {
      warnings.push('Negative depreciation - residual value exceeds adjusted cap cost');
    }

    // Step 6: Calculate rent charge
    const moneyFactor = new Decimal(request.moneyFactor);
    const monthlyRentCharge = adjustedCapCost.plus(residualValue).times(moneyFactor);

    // Step 7: Calculate base monthly payment (pre-tax)
    const baseMonthlyPayment = monthlyDepreciationCharge.plus(monthlyRentCharge);

    // Step 8: Calculate tax
    const taxRate = new Decimal(request.taxRate);
    let monthlyTax = new Decimal(0);
    let upfrontTax = new Decimal(0);
    let taxableAmount = new Decimal(0);

    if (request.taxOnMonthlyPayment) {
      // Most states: tax the monthly payment
      monthlyTax = baseMonthlyPayment.times(taxRate);
      taxableAmount = baseMonthlyPayment.times(request.term);
    } else {
      // Some states (e.g., Texas): tax the full cap cost upfront
      taxableAmount = request.taxableAmount
        ? new Decimal(request.taxableAmount)
        : adjustedCapCost;
      upfrontTax = taxableAmount.times(taxRate);
    }

    const totalTax = monthlyTax.times(request.term).plus(upfrontTax);

    // Step 9: Calculate final monthly payment
    const monthlyPayment = baseMonthlyPayment.plus(monthlyTax);

    // Step 10: Calculate drive-off breakdown
    const driveOffBreakdown = this.calculateDriveOff(request, monthlyPayment, upfrontTax);

    // Step 11: Calculate totals
    const totalOfPayments = monthlyPayment.times(request.term);
    const totalLeaseCost = totalOfPayments.plus(new Decimal(driveOffBreakdown.total));

    return {
      grossCapCost: grossCapCost.toFixed(2),
      totalCapReductions: totalCapReductions.toFixed(2),
      adjustedCapCost: adjustedCapCost.toFixed(2),
      residualValue: residualValue.toFixed(2),
      depreciation: depreciation.toFixed(2),
      monthlyDepreciationCharge: monthlyDepreciationCharge.toFixed(2),
      monthlyRentCharge: monthlyRentCharge.toFixed(2),
      baseMonthlyPayment: baseMonthlyPayment.toFixed(2),
      monthlyTax: monthlyTax.toFixed(2),
      monthlyPayment: monthlyPayment.toFixed(2),
      upfrontTax: upfrontTax.toFixed(2),
      totalTax: totalTax.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      driveOffBreakdown,
      totalOfPayments: totalOfPayments.toFixed(2),
      totalLeaseCost: totalLeaseCost.toFixed(2),
      totalCapitalizedCost: adjustedCapCost.toFixed(2),
      validated: warnings.length === 0,
      validationWarnings: warnings,
    };
  }

  /**
   * Calculate gross capitalized cost
   * Formula: Selling Price + Acquisition Fee (if cap) + Capitalized Fees + Accessories
   */
  private calculateGrossCapCost(request: LeaseCalculationRequest): Decimal {
    let grossCapCost = new Decimal(request.sellingPrice);

    // Add acquisition fee if capitalized
    const acquisitionFee = new Decimal(request.acquisitionFee || 0);
    grossCapCost = grossCapCost.plus(acquisitionFee);

    // Add doc fee if capitalized
    const docFee = new Decimal(request.docFee || 0);
    grossCapCost = grossCapCost.plus(docFee);

    // Add capitalized government fees
    request.governmentFees?.forEach(fee => {
      if (fee.capitalized) {
        grossCapCost = grossCapCost.plus(new Decimal(fee.amount));
      }
    });

    // Add capitalized dealer fees
    request.dealerFees?.forEach(fee => {
      if (fee.capitalized) {
        grossCapCost = grossCapCost.plus(new Decimal(fee.amount));
      }
    });

    // Add capitalized accessories
    request.accessories?.forEach(item => {
      if (item.capitalized) {
        grossCapCost = grossCapCost.plus(new Decimal(item.amount));
      }
    });

    // Add capitalized aftermarket products
    request.aftermarketProducts?.forEach(item => {
      if (item.capitalized) {
        grossCapCost = grossCapCost.plus(new Decimal(item.amount));
      }
    });

    return grossCapCost;
  }

  /**
   * Calculate total cap cost reductions
   * Formula: Cash Down + Trade Equity + Manufacturer Rebate + Other Incentives
   */
  private calculateCapCostReductions(request: LeaseCalculationRequest): Decimal {
    let reductions = new Decimal(request.cashDown || 0);

    // Trade equity = allowance - payoff
    const tradeAllowance = new Decimal(request.tradeAllowance || 0);
    const tradePayoff = new Decimal(request.tradePayoff || 0);
    const tradeEquity = tradeAllowance.minus(tradePayoff);
    reductions = reductions.plus(tradeEquity);

    // Manufacturer rebates (always reduce cap cost)
    reductions = reductions.plus(new Decimal(request.manufacturerRebate || 0));

    // Other incentives
    reductions = reductions.plus(new Decimal(request.otherIncentives || 0));

    return reductions;
  }

  /**
   * Calculate drive-off breakdown (cash due at signing)
   */
  private calculateDriveOff(
    request: LeaseCalculationRequest,
    monthlyPayment: Decimal,
    upfrontTax: Decimal
  ): DriveOffBreakdown {
    const firstPayment = monthlyPayment;
    const cashDown = new Decimal(request.cashDown || 0);
    const securityDeposit = new Decimal(request.securityDeposit || 0);

    // Acquisition fee (if not capitalized)
    const acquisitionFee = new Decimal(request.acquisitionFee || 0);

    // Doc fee (if not capitalized - usually it is)
    const docFee = new Decimal(0); // Typically capitalized

    // Government fees not capitalized
    let upfrontFees = new Decimal(0);
    request.governmentFees?.forEach(fee => {
      if (!fee.capitalized) {
        upfrontFees = upfrontFees.plus(new Decimal(fee.amount));
      }
    });

    // Dealer fees not capitalized
    request.dealerFees?.forEach(fee => {
      if (!fee.capitalized) {
        upfrontFees = upfrontFees.plus(new Decimal(fee.amount));
      }
    });

    // Other charges (non-capitalized accessories/aftermarket)
    let otherCharges = new Decimal(0);
    request.accessories?.forEach(item => {
      if (!item.capitalized) {
        otherCharges = otherCharges.plus(new Decimal(item.amount));
      }
    });
    request.aftermarketProducts?.forEach(item => {
      if (!item.capitalized) {
        otherCharges = otherCharges.plus(new Decimal(item.amount));
      }
    });

    // Total drive-off
    const total = firstPayment
      .plus(cashDown)
      .plus(acquisitionFee)
      .plus(docFee)
      .plus(upfrontFees)
      .plus(upfrontTax)
      .plus(securityDeposit)
      .plus(otherCharges);

    return {
      firstPayment: firstPayment.toFixed(2),
      cashDown: cashDown.toFixed(2),
      acquisitionFee: acquisitionFee.toFixed(2),
      docFee: docFee.toFixed(2),
      upfrontFees: upfrontFees.toFixed(2),
      upfrontTax: upfrontTax.toFixed(2),
      securityDeposit: securityDeposit.toFixed(2),
      otherCharges: otherCharges.toFixed(2),
      total: total.toFixed(2),
    };
  }

  /**
   * Validate inputs and populate warnings
   */
  private validateInputs(request: LeaseCalculationRequest, warnings: string[]): void {
    // MSRP validation
    const msrp = new Decimal(request.msrp);
    if (msrp.lessThanOrEqualTo(0)) {
      warnings.push('MSRP must be greater than zero');
    }

    // Selling price validation
    const sellingPrice = new Decimal(request.sellingPrice);
    if (sellingPrice.greaterThan(msrp)) {
      warnings.push('Selling price exceeds MSRP (unusual for lease)');
    }

    // Term validation
    if (request.term <= 0 || request.term > 60) {
      warnings.push('Lease term should be between 1 and 60 months');
    }
    if (![24, 27, 30, 33, 36, 39, 42, 48].includes(request.term)) {
      warnings.push('Non-standard lease term - verify with lender');
    }

    // Money factor validation
    const moneyFactor = new Decimal(request.moneyFactor);
    const aprEquivalent = moneyFactor.times(2400);
    if (aprEquivalent.greaterThan(15)) {
      warnings.push(`Money factor is high (${aprEquivalent.toFixed(2)}% APR equivalent)`);
    }

    // Residual percent validation
    const residualPercent = new Decimal(request.residualPercent);
    if (residualPercent.lessThan(20) || residualPercent.greaterThan(80)) {
      warnings.push('Residual percent outside typical range (20%-80%)');
    }

    // Tax rate validation
    const taxRate = new Decimal(request.taxRate);
    if (taxRate.lessThan(0) || taxRate.greaterThan(0.15)) {
      warnings.push('Tax rate outside typical range (0%-15%)');
    }
  }

  /**
   * Convert money factor to APR
   */
  convertMoneyFactorToAPR(moneyFactor: string): string {
    const mf = new Decimal(moneyFactor);
    const apr = mf.times(2400);
    return apr.toFixed(2);
  }

  /**
   * Convert APR to money factor
   */
  convertAPRToMoneyFactor(apr: string): string {
    const aprDecimal = new Decimal(apr);
    const moneyFactor = aprDecimal.dividedBy(2400);
    return moneyFactor.toFixed(6);
  }
}
