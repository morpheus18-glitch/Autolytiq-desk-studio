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
 * Calculate lease payment
 * Depreciation + Finance Charge
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
    totalFees
  } = input;
  
  // Calculate net trade equity
  const tradeEquity = tradeAllowance - tradePayoff;
  
  // Capitalized cost = vehicle price + fees + tax - down payment - trade equity
  const capitalizedCost = new Decimal(vehiclePrice)
    .plus(totalFees)
    .plus(totalTax)
    .minus(downPayment)
    .minus(tradeEquity);
  
  if (capitalizedCost.lte(0) || term === 0) {
    return {
      monthlyPayment: 0,
      amountFinanced: capitalizedCost.toNumber(),
      totalCost: capitalizedCost.toNumber(),
    };
  }
  
  const residual = new Decimal(residualValue);
  
  // Depreciation = (Capitalized Cost - Residual Value) / Term
  const depreciation = capitalizedCost.minus(residual).div(term);
  
  // Finance charge = (Capitalized Cost + Residual Value) * Money Factor
  const financeCharge = capitalizedCost.plus(residual).times(moneyFactor);
  
  // Monthly payment = Depreciation + Finance Charge
  const monthlyPayment = depreciation.plus(financeCharge);
  
  const totalPaid = monthlyPayment.times(term);
  
  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: capitalizedCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalPaid.toDecimalPlaces(2).toNumber(),
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
  if (tradeInCreditType === 'tax_on_difference') {
    taxableAmount = taxableAmount.minus(tradeAllowance);
  }
  // full_credit: Trade allowance doesn't reduce taxable amount
  // none: No trade-in credit
  
  // Add taxable fees
  const taxableFees = dealerFees
    .filter(f => f.taxable)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  
  const taxableAccessories = accessories
    .filter(a => a.taxable)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  
  taxableAmount = taxableAmount.plus(taxableFees).plus(taxableAccessories);
  
  // Ensure non-negative
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
