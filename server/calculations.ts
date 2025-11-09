import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision - matching frontend
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface FinanceCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  apr: number;
  term: number;
  totalTax: number;
  totalFees: number;
}

export interface LeaseCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  moneyFactor: number;
  term: number;
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
  
  const tradeEquity = tradeAllowance - tradePayoff;
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
  
  const periodicRate = new Decimal(apr).div(100).div(12);
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
  
  const tradeEquity = tradeAllowance - tradePayoff;
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
  const depreciation = capitalizedCost.minus(residual).div(term);
  const financeCharge = capitalizedCost.plus(residual).times(moneyFactor);
  const monthlyPayment = depreciation.plus(financeCharge);
  const totalPaid = monthlyPayment.times(term);
  
  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: capitalizedCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalPaid.toDecimalPlaces(2).toNumber(),
  };
}

export interface TaxCalculationInput {
  vehiclePrice: number;
  tradeAllowance: number;
  dealerFees: Array<{ amount: number; taxable: boolean }>;
  accessories: Array<{ amount: number; taxable: boolean }>;
  stateTaxRate: number;
  countyTaxRate: number;
  cityTaxRate: number;
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
    tradeInCreditType,
  } = input;
  
  let taxableAmount = new Decimal(vehiclePrice);
  
  if (tradeInCreditType === 'tax_on_difference') {
    taxableAmount = taxableAmount.minus(tradeAllowance);
  }
  
  const taxableFees = dealerFees
    .filter(f => f.taxable)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  
  const taxableAccessories = accessories
    .filter(a => a.taxable)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  
  taxableAmount = taxableAmount.plus(taxableFees).plus(taxableAccessories);
  
  if (taxableAmount.lt(0)) {
    taxableAmount = new Decimal(0);
  }
  
  const totalRate = new Decimal(stateTaxRate)
    .plus(countyTaxRate)
    .plus(cityTaxRate);
  
  const totalTax = taxableAmount.times(totalRate);
  
  return totalTax.toDecimalPlaces(2).toNumber();
}
