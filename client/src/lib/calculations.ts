import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface FinanceCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  apr: number;
  term: number; // months
  totalTax: number;
  totalFees: number;
}

export interface LeaseCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  moneyFactor: number;
  term: number; // months
  residualValue: number;
  totalTax: number;
  totalFees: number;
  // Tax method determines how tax is applied to lease
  // - 'payment': Tax applied to each monthly payment (most common - CA, FL, IN, etc.)
  // - 'cap_cost': Tax added to cap cost upfront (TX style)
  // - 'hybrid': Some upfront + some on payment
  taxMethod?: 'payment' | 'cap_cost' | 'hybrid';
  // Tax rate for payment-based taxation (combined state + local)
  taxRate?: number;
}

export interface PaymentCalculationResult {
  monthlyPayment: number;
  amountFinanced: number;
  totalCost: number;
  totalInterest?: number;
}

export interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: Date;
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

/**
 * Calculate finance payment using standard amortization formula
 * P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateFinancePayment(input: FinanceCalculationInput): PaymentCalculationResult {
  const {
    vehiclePrice,
    downPayment,
    tradeAllowance,
    tradePayoff,
    apr,
    term,
    totalTax,
    totalFees
  } = input;
  
  // Calculate net trade equity (can be negative)
  const tradeEquity = tradeAllowance - tradePayoff;
  
  // Amount financed = vehicle price - down payment - trade equity + tax + fees
  const amountFinanced = new Decimal(vehiclePrice)
    .minus(downPayment)
    .minus(tradeEquity)
    .plus(totalTax)
    .plus(totalFees);
  
  if (amountFinanced.lte(0) || term === 0) {
    return {
      monthlyPayment: 0,
      amountFinanced: amountFinanced.toNumber(),
      totalCost: amountFinanced.toNumber(),
      totalInterest: 0,
    };
  }
  
  if (apr === 0) {
    const payment = amountFinanced.div(term);
    return {
      monthlyPayment: payment.toDecimalPlaces(2).toNumber(),
      amountFinanced: amountFinanced.toNumber(),
      totalCost: amountFinanced.toNumber(),
      totalInterest: 0,
    };
  }
  
  // Convert APR to periodic rate (monthly)
  const periodicRate = new Decimal(apr).div(100).div(12);
  
  // Calculate monthly payment: P * [r(1+r)^n] / [(1+r)^n - 1]
  const onePlusR = periodicRate.plus(1);
  const onePlusRtoN = onePlusR.pow(term);
  const numerator = amountFinanced.times(periodicRate).times(onePlusRtoN);
  const denominator = onePlusRtoN.minus(1);
  const monthlyPayment = numerator.div(denominator);
  
  const totalPaid = monthlyPayment.times(term);
  const totalInterest = totalPaid.minus(amountFinanced);
  
  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: amountFinanced.toDecimalPlaces(2).toNumber(),
    totalCost: totalPaid.toDecimalPlaces(2).toNumber(),
    totalInterest: totalInterest.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Calculate lease payment using industry-standard formula
 *
 * Industry-Standard Lease Formula:
 * 1. Depreciation = (Adjusted Cap Cost - Residual Value) / Term
 * 2. Finance Charge = (Adjusted Cap Cost + Residual Value) * Money Factor
 * 3. Base Monthly Payment = Depreciation + Finance Charge
 * 4. Tax Treatment depends on state method:
 *    - 'payment': Tax applied to base monthly payment (most common)
 *    - 'cap_cost': Tax included in cap cost upfront
 *    - 'hybrid': Combination of both
 *
 * IMPORTANT: Money factor is NOT APR. Money Factor = APR / 2400
 * Example: 6% APR = 0.0025 money factor
 */
export function calculateLeasePayment(input: LeaseCalculationInput): PaymentCalculationResult {
  const {
    vehiclePrice,
    downPayment,
    tradeAllowance,
    tradePayoff,
    moneyFactor,
    term,
    residualValue,
    totalTax,
    totalFees,
    taxMethod = 'payment', // Default to most common method
    taxRate = 0
  } = input;

  // Calculate net trade equity (positive = customer has equity, negative = underwater)
  const tradeEquity = new Decimal(tradeAllowance).minus(tradePayoff);

  // Build Gross Capitalized Cost
  // Gross Cap = Vehicle Price + Fees
  // Note: Tax is handled separately based on taxMethod
  let grossCapCost = new Decimal(vehiclePrice).plus(totalFees);

  // For cap_cost tax method (like TX), add tax to gross cap cost
  if (taxMethod === 'cap_cost') {
    grossCapCost = grossCapCost.plus(totalTax);
  }

  // Calculate Cap Cost Reductions
  // Reductions = Down Payment + Trade Equity (if positive)
  let capReductions = new Decimal(downPayment);

  // Trade equity reduces cap cost if positive
  // If negative (underwater), it's added to gross cap cost
  if (tradeEquity.gt(0)) {
    capReductions = capReductions.plus(tradeEquity);
  } else if (tradeEquity.lt(0)) {
    // Negative equity (underwater trade) INCREASES cap cost
    grossCapCost = grossCapCost.plus(tradeEquity.abs());
  }

  // Adjusted Capitalized Cost = Gross Cap Cost - Cap Reductions
  const adjustedCapCost = grossCapCost.minus(capReductions);

  if (adjustedCapCost.lte(0) || term === 0) {
    return {
      monthlyPayment: 0,
      amountFinanced: adjustedCapCost.toNumber(),
      totalCost: adjustedCapCost.toNumber(),
    };
  }

  const residual = new Decimal(residualValue);

  // STANDARD LEASE CALCULATION FORMULA
  // ===================================

  // Depreciation = (Adjusted Cap Cost - Residual Value) / Term
  // This is the monthly amount for vehicle value lost during lease
  const depreciation = adjustedCapCost.minus(residual).div(term);

  // Finance Charge = (Adjusted Cap Cost + Residual Value) * Money Factor
  // This is the monthly interest/rent charge
  const financeCharge = adjustedCapCost.plus(residual).times(moneyFactor);

  // Base Monthly Payment = Depreciation + Finance Charge
  const baseMonthlyPayment = depreciation.plus(financeCharge);

  // Apply tax based on method
  let monthlyPayment: Decimal;
  let totalCost: Decimal;

  switch (taxMethod) {
    case 'payment':
      // Tax applied to each monthly payment (most common - CA, FL, IN, MI, etc.)
      // This is the most common method
      const monthlyTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(monthlyTax);
      totalCost = monthlyPayment.times(term);
      break;

    case 'cap_cost':
      // Tax already included in cap cost (TX style)
      // No additional tax on payment
      monthlyPayment = baseMonthlyPayment;
      totalCost = monthlyPayment.times(term);
      break;

    case 'hybrid':
      // Some states have hybrid approaches
      // For now, treat similar to payment method
      const hybridMonthlyTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(hybridMonthlyTax);
      totalCost = monthlyPayment.times(term).plus(totalTax);
      break;

    default:
      // Default to payment method
      monthlyPayment = baseMonthlyPayment.plus(baseMonthlyPayment.times(taxRate));
      totalCost = monthlyPayment.times(term);
  }

  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalCost.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Convert money factor to APR
 * APR = Money Factor * 2400
 */
export function moneyFactorToAPR(moneyFactor: number): number {
  return new Decimal(moneyFactor).times(2400).toDecimalPlaces(4).toNumber();
}

/**
 * Convert APR to money factor
 * Money Factor = APR / 2400
 */
export function aprToMoneyFactor(apr: number): number {
  return new Decimal(apr).div(2400).toDecimalPlaces(6).toNumber();
}

/**
 * Generate full amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  apr: number,
  term: number,
  startDate: Date = new Date()
): AmortizationEntry[] {
  if (principal <= 0 || term === 0) return [];
  
  const schedule: AmortizationEntry[] = [];
  const periodicRate = new Decimal(apr).div(100).div(12);
  
  // Calculate monthly payment
  const onePlusR = periodicRate.plus(1);
  const onePlusRtoN = onePlusR.pow(term);
  const numerator = new Decimal(principal).times(periodicRate).times(onePlusRtoN);
  const denominator = onePlusRtoN.minus(1);
  const monthlyPayment = numerator.div(denominator);
  
  let remainingBalance = new Decimal(principal);
  
  for (let i = 1; i <= term; i++) {
    const interestPayment = remainingBalance.times(periodicRate);
    const principalPayment = monthlyPayment.minus(interestPayment);
    remainingBalance = remainingBalance.minus(principalPayment);
    
    // Handle final payment rounding
    if (i === term && !remainingBalance.isZero()) {
      const adjustment = remainingBalance;
      remainingBalance = new Decimal(0);
    }
    
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);
    
    schedule.push({
      paymentNumber: i,
      paymentDate,
      paymentAmount: monthlyPayment.toDecimalPlaces(2).toNumber(),
      principal: principalPayment.toDecimalPlaces(2).toNumber(),
      interest: interestPayment.toDecimalPlaces(2).toNumber(),
      remainingBalance: Math.max(0, remainingBalance.toDecimalPlaces(2).toNumber()),
    });
  }
  
  return schedule;
}

/**
 * Calculate sales tax based on jurisdiction rates
 */
export interface TaxCalculationInput {
  vehiclePrice: number;
  tradeAllowance: number;
  dealerFees: Array<{ amount: number; taxable: boolean }>;
  accessories: Array<{ amount: number; taxable: boolean }>;
  stateTaxRate: number;
  countyTaxRate: number;
  cityTaxRate: number;
  townshipTaxRate?: number;
  specialDistrictTaxRate?: number;
  tradeInCreditType: string;
}

export function calculateSalesTax(input: TaxCalculationInput): number {
  const {
    vehiclePrice,
    tradeAllowance,
    dealerFees,
    accessories,
    stateTaxRate,
    countyTaxRate,
    cityTaxRate,
    townshipTaxRate = 0,
    specialDistrictTaxRate = 0,
    tradeInCreditType,
  } = input;

  let taxableAmount = new Decimal(vehiclePrice);

  // Apply trade-in credit based on jurisdiction rules
  // State rules use: 'full' | 'partial' | 'none' | 'tax_on_difference'
  switch (tradeInCreditType) {
    case 'tax_on_difference':
    case 'full':
      // Trade allowance reduces taxable amount (most states)
      taxableAmount = taxableAmount.minus(tradeAllowance);
      break;

    case 'partial':
      // Partial credit - would need a cap amount
      // For now, treat same as full (the cap is applied elsewhere)
      taxableAmount = taxableAmount.minus(tradeAllowance);
      break;

    case 'none':
    default:
      // No trade-in credit - taxed on full amount (CA, MD, WA, etc.)
      // Trade allowance does NOT reduce taxable amount
      break;
  }

  // Add taxable fees
  const taxableFees = dealerFees
    .filter(f => f.taxable)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));

  const taxableAccessories = accessories
    .filter(a => a.taxable)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));

  taxableAmount = taxableAmount.plus(taxableFees).plus(taxableAccessories);

  // Ensure non-negative taxable amount
  if (taxableAmount.lt(0)) {
    taxableAmount = new Decimal(0);
  }

  // Calculate total tax rate (cumulative) including all jurisdiction levels
  const totalRate = new Decimal(stateTaxRate)
    .plus(countyTaxRate)
    .plus(cityTaxRate)
    .plus(townshipTaxRate)
    .plus(specialDistrictTaxRate);

  const totalTax = taxableAmount.times(totalRate);

  return totalTax.toDecimalPlaces(2).toNumber();
}
