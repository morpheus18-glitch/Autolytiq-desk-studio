/**
 * DEAL CALCULATOR SERVICE
 * Financial calculations for deals
 *
 * Responsibilities:
 * - Calculate deal totals
 * - Calculate monthly payments
 * - Calculate tax amounts
 * - Calculate profit margins
 */

import type { DealCalculation, DealFees, Product } from '../types/deal.types';

// ============================================================================
// CALCULATOR SERVICE
// ============================================================================

export class DealCalculatorService {
  /**
   * Calculate complete deal financials
   */
  async calculateDeal(params: {
    vehiclePrice: number;
    dealerDiscount?: number;
    manufacturerRebate?: number;
    tradeInAllowance?: number;
    tradeInPayoff?: number;
    fees?: DealFees;
    products?: Product[];
    taxCalculation?: unknown;
  }): Promise<DealCalculation> {
    const {
      vehiclePrice,
      dealerDiscount = 0,
      manufacturerRebate = 0,
      tradeInAllowance = 0,
      tradeInPayoff = 0,
      fees = this.getDefaultFees(),
      products = [],
      taxCalculation,
    } = params;

    // Calculate sale price
    const salePrice = vehiclePrice - dealerDiscount - manufacturerRebate;

    // Calculate net trade-in
    const netTradeIn = tradeInAllowance - tradeInPayoff;

    // Calculate total fees
    const totalFees = this.calculateTotalFees(fees);

    // Calculate total products
    const totalProducts = products.reduce((sum, p) => sum + p.price, 0);

    // Calculate taxable amount (depends on state - using simplified version)
    const taxableAmount = salePrice + totalFees + totalProducts - tradeInAllowance;

    // Calculate tax (if tax calculation provided, use it; otherwise estimate)
    const totalTax = taxCalculation?.totalTax ?? taxableAmount * 0.07; // 7% default

    // Calculate cash price
    const cashPrice = salePrice + totalFees + totalProducts + totalTax;

    // Calculate amount to be financed
    const amountFinanced = cashPrice - netTradeIn;

    // Calculate down payment (if provided in financing details)
    const totalDownPayment = 0; // Will be set from financing details

    // Calculate out-the-door price
    const outTheDoorPrice = cashPrice - netTradeIn;

    // Calculate profit metrics
    const frontEndProfit = salePrice - vehiclePrice; // Simplified
    const backEndProfit = products.reduce((sum, p) => sum + (p.price - p.cost), 0);
    const totalProfit = frontEndProfit + backEndProfit;

    return {
      vehiclePrice,
      dealerDiscount,
      manufacturerRebate,
      salePrice,
      tradeInAllowance,
      tradeInPayoff,
      netTradeIn,
      taxCalculation: taxCalculation || null,
      totalTax,
      fees,
      totalFees,
      products,
      totalProducts,
      cashPrice,
      amountFinanced,
      totalDownPayment,
      outTheDoorPrice,
      frontEndProfit,
      backEndProfit,
      totalProfit,
    };
  }

  /**
   * Calculate monthly payment for financing
   */
  calculateMonthlyPayment(params: {
    principal: number;
    rate: number; // Annual percentage rate
    term: number; // Months
  }): number {
    const { principal, rate, term } = params;

    if (rate === 0) {
      return principal / term;
    }

    const monthlyRate = rate / 100 / 12;
    const payment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);

    return Math.round(payment * 100) / 100;
  }

  /**
   * Calculate total finance charge
   */
  calculateTotalFinanceCharge(params: {
    monthlyPayment: number;
    term: number;
    principal: number;
  }): number {
    const { monthlyPayment, term, principal } = params;
    const totalOfPayments = monthlyPayment * term;
    return totalOfPayments - principal;
  }

  /**
   * Calculate APR (if different from rate due to fees)
   */
  calculateAPR(params: {
    principal: number;
    monthlyPayment: number;
    term: number;
    financingFees?: number;
  }): number {
    // Simplified APR calculation
    // In production, use proper APR calculation (iterative method)
    const { principal, monthlyPayment, term, financingFees = 0 } = params;
    const totalPaid = monthlyPayment * term;
    const totalCost = totalPaid + financingFees;
    const totalInterest = totalCost - principal;
    const apr = (totalInterest / principal / (term / 12)) * 100;
    return Math.round(apr * 100) / 100;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateTotalFees(fees: DealFees): number {
    const standardFees =
      fees.documentationFee +
      fees.licensingFee +
      fees.registrationFee +
      fees.dealerFee +
      fees.advertisingFee +
      fees.deliveryFee +
      fees.processingFee;

    const customFeesTotal = fees.customFees.reduce((sum, fee) => sum + fee.amount, 0);

    return standardFees + customFeesTotal;
  }

  private getDefaultFees(): DealFees {
    return {
      documentationFee: 0,
      licensingFee: 0,
      registrationFee: 0,
      dealerFee: 0,
      advertisingFee: 0,
      deliveryFee: 0,
      processingFee: 0,
      customFees: [],
    };
  }
}
