/**
 * CDK/Reynolds-Grade Finance Calculation Engine
 *
 * Implements industry-standard automotive finance calculations with penny accuracy.
 * All calculations use Decimal.js to avoid floating-point errors.
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Input parameters for finance calculation
 */
export interface FinanceCalculationRequest {
  // Vehicle pricing
  vehiclePrice: string; // Selling price of vehicle
  tradeAllowance: string; // Trade-in value
  tradePayoff: string; // Trade-in payoff
  downPayment: string; // Cash down payment
  manufacturerRebate: string; // Factory rebates
  dealerRebate: string; // Dealer incentives

  // Loan terms
  apr: string; // Annual Percentage Rate (e.g., "4.99")
  term: number; // Months (typically 24, 36, 48, 60, 72, 84)

  // Fees
  totalTax: string; // Sales tax (from tax engine)
  totalFees: string; // Doc fee + registration + title + other fees

  // Aftermarket
  aftermarketTotal: string; // VSC, GAP, etc.
}

/**
 * Complete finance calculation result
 */
export interface FinanceCalculationResult {
  // Core components
  vehiclePrice: string;
  tradeEquity: string; // Allowance - payoff
  downPayment: string;
  totalRebates: string; // Manufacturer + dealer rebates
  totalTax: string;
  totalFees: string;
  aftermarketTotal: string;

  // Financed amount
  amountFinanced: string; // Total amount being financed

  // Payment breakdown
  monthlyPayment: string; // Principal + interest payment
  totalInterest: string; // Total interest over life of loan
  totalOfPayments: string; // Monthly payment × term
  totalCost: string; // Down + total of payments

  // APR breakdown
  monthlyInterestRate: string; // APR / 12 / 100

  // Validation
  validated: boolean;
  validationWarnings: string[];
}

/**
 * Main finance calculator service
 */
export class FinanceCalculatorService {
  /**
   * Calculate complete finance breakdown
   */
  calculateFinance(request: FinanceCalculationRequest): FinanceCalculationResult {
    const warnings: string[] = [];

    // Validate inputs
    this.validateInputs(request, warnings);

    // Step 1: Calculate trade equity
    const tradeAllowance = new Decimal(request.tradeAllowance || 0);
    const tradePayoff = new Decimal(request.tradePayoff || 0);
    const tradeEquity = tradeAllowance.minus(tradePayoff);

    // Warning for negative equity
    if (tradeEquity.lessThan(0)) {
      warnings.push(`Negative equity: ${tradeEquity.toFixed(2)} (trade payoff exceeds allowance)`);
    }

    // Step 2: Calculate total rebates
    const manufacturerRebate = new Decimal(request.manufacturerRebate || 0);
    const dealerRebate = new Decimal(request.dealerRebate || 0);
    const totalRebates = manufacturerRebate.plus(dealerRebate);

    // Step 3: Calculate amount financed
    // Formula: Vehicle Price + Tax + Fees + Aftermarket + Trade Payoff - Down - Rebates - Trade Allowance
    const vehiclePrice = new Decimal(request.vehiclePrice);
    const totalTax = new Decimal(request.totalTax || 0);
    const totalFees = new Decimal(request.totalFees || 0);
    const aftermarketTotal = new Decimal(request.aftermarketTotal || 0);
    const downPayment = new Decimal(request.downPayment || 0);

    const amountFinanced = vehiclePrice
      .plus(totalTax)
      .plus(totalFees)
      .plus(aftermarketTotal)
      .plus(tradePayoff)
      .minus(downPayment)
      .minus(totalRebates)
      .minus(tradeAllowance);

    // Warning for negative amount financed
    if (amountFinanced.lessThan(0)) {
      warnings.push('Amount financed is negative - down payment and credits exceed total cost');
    }

    // Step 4: Calculate monthly payment using standard amortization formula
    const apr = new Decimal(request.apr || 0);
    const monthlyInterestRate = apr.dividedBy(100).dividedBy(12);
    const term = new Decimal(request.term);

    let monthlyPayment: Decimal;
    let totalInterest: Decimal;

    if (apr.equals(0)) {
      // Zero percent financing
      monthlyPayment = amountFinanced.dividedBy(term);
      totalInterest = new Decimal(0);
    } else {
      // Standard amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
      // Where: P = principal, r = monthly rate, n = number of payments
      const onePlusR = monthlyInterestRate.plus(1);
      const power = onePlusR.pow(term);
      monthlyPayment = amountFinanced
        .times(monthlyInterestRate)
        .times(power)
        .dividedBy(power.minus(1));

      const totalOfPayments = monthlyPayment.times(term);
      totalInterest = totalOfPayments.minus(amountFinanced);
    }

    // Step 5: Calculate totals
    const totalOfPayments = monthlyPayment.times(term);
    const totalCost = downPayment.plus(totalOfPayments);

    return {
      vehiclePrice: vehiclePrice.toFixed(2),
      tradeEquity: tradeEquity.toFixed(2),
      downPayment: downPayment.toFixed(2),
      totalRebates: totalRebates.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalFees: totalFees.toFixed(2),
      aftermarketTotal: aftermarketTotal.toFixed(2),
      amountFinanced: amountFinanced.toFixed(2),
      monthlyPayment: monthlyPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      totalOfPayments: totalOfPayments.toFixed(2),
      totalCost: totalCost.toFixed(2),
      monthlyInterestRate: monthlyInterestRate.toFixed(6),
      validated: warnings.length === 0,
      validationWarnings: warnings,
    };
  }

  /**
   * Validate inputs and populate warnings
   */
  private validateInputs(request: FinanceCalculationRequest, warnings: string[]): void {
    // Vehicle price validation
    const vehiclePrice = new Decimal(request.vehiclePrice);
    if (vehiclePrice.lessThanOrEqualTo(0)) {
      warnings.push('Vehicle price must be greater than zero');
    }

    // APR validation
    const apr = new Decimal(request.apr || 0);
    if (apr.lessThan(0)) {
      warnings.push('APR cannot be negative');
    }
    if (apr.greaterThan(30)) {
      warnings.push('APR is unusually high (>30%) - verify before proceeding');
    }

    // Term validation
    if (request.term <= 0 || request.term > 96) {
      warnings.push('Loan term should be between 1 and 96 months');
    }
    if (![24, 36, 48, 60, 72, 84].includes(request.term)) {
      warnings.push('Non-standard loan term - verify with lender');
    }

    // Down payment validation
    const downPayment = new Decimal(request.downPayment || 0);
    if (downPayment.greaterThan(vehiclePrice)) {
      warnings.push('Down payment exceeds vehicle price');
    }
  }

  /**
   * Calculate loan-to-value ratio (LTV)
   */
  calculateLTV(amountFinanced: string, vehiclePrice: string): string {
    const financed = new Decimal(amountFinanced);
    const price = new Decimal(vehiclePrice);

    if (price.equals(0)) {
      return '0.00';
    }

    const ltv = financed.dividedBy(price).times(100);
    return ltv.toFixed(2);
  }

  /**
   * Calculate payment-to-income ratio (PTI)
   */
  calculatePTI(monthlyPayment: string, monthlyIncome: string): string {
    const payment = new Decimal(monthlyPayment);
    const income = new Decimal(monthlyIncome);

    if (income.equals(0)) {
      return '0.00';
    }

    const pti = payment.dividedBy(income).times(100);
    return pti.toFixed(2);
  }

  /**
   * Calculate dealer reserve (finance reserve)
   * Formula: Amount Financed × (Rate Markup / 100) / 12 × Term
   */
  calculateDealerReserve(
    amountFinanced: string,
    buyRate: string,
    sellRate: string,
    term: number
  ): string {
    const principal = new Decimal(amountFinanced);
    const buy = new Decimal(buyRate);
    const sell = new Decimal(sellRate);
    const rateMarkup = sell.minus(buy);

    // Reserve = Principal × (Rate Markup / 100) / 12 × Term
    const reserve = principal.times(rateMarkup).dividedBy(100).dividedBy(12).times(term);

    return reserve.toFixed(2);
  }
}
