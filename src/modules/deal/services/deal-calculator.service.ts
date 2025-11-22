/**
 * DEAL CALCULATOR SERVICE
 * Main orchestrator for all deal financial calculations
 *
 * Consolidated from:
 * - /server/calculations.ts
 * - /src/services/finance-calculator.service.ts
 * - /src/services/lease-calculator.service.ts
 *
 * Responsibilities:
 * - Orchestrate finance, lease, and tax calculations
 * - Calculate complete deal totals
 * - Calculate profit margins
 * - Provide high-level deal calculation API
 *
 * Architecture:
 * - This is the MAIN ENTRY POINT for all deal calculations
 * - It delegates to specialized calculators (finance, lease, tax)
 * - All calculations use Decimal.js for financial precision
 * - Results are rounded to 2 decimal places (money) or appropriate precision
 *
 * @module deal/services/deal-calculator
 */

import Decimal from 'decimal.js';
import type { DealCalculation, DealFees, Product } from '../types/deal.types';
import { FinanceCalculatorService, type FinanceCalculationRequest } from './finance-calculator.service';
import { LeaseCalculatorService, type LeaseCalculationRequest } from './lease-calculator.service';
import { TaxCalculatorService, type TaxCalculationInput } from './tax-calculator.service';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// TYPES
// ============================================================================

export interface CalculateDealParams {
  // Vehicle pricing
  vehiclePrice: number;
  dealerDiscount?: number;
  manufacturerRebate?: number;

  // Trade-in
  tradeInAllowance?: number;
  tradeInPayoff?: number;

  // Fees
  fees?: DealFees;

  // Aftermarket products
  products?: Product[];

  // Tax calculation inputs (optional - will use defaults if not provided)
  taxCalculation?: {
    stateTaxRate: number;
    countyTaxRate: number;
    cityTaxRate: number;
    townshipTaxRate?: number;
    specialDistrictTaxRate?: number;
    tradeInCreditType: string;
    stateCode?: string;
    isNewVehicle?: boolean;
  };

  // Financing details (optional - for finance deals)
  financing?: {
    downPayment: number;
    apr: number;
    term: number; // months
  };

  // Leasing details (optional - for lease deals)
  leasing?: {
    cashDown: number;
    term: number;
    moneyFactor: number;
    residualPercent: number;
    msrp: number;
    sellingPrice: number;
    acquisitionFee?: number;
    taxOnMonthlyPayment?: boolean;
  };

  // Dealer cost (for profit calculations)
  vehicleCost?: number;
}

export interface FinancePaymentResult {
  monthlyPayment: number;
  amountFinanced: number;
  totalOfPayments: number;
  totalInterest: number;
  totalCost: number; // Down payment + total of payments
}

export interface LeasePaymentResult {
  monthlyPayment: number;
  baseMonthlyPayment: number;
  monthlyTax: number;
  adjustedCapCost: number;
  residualValue: number;
  totalOfPayments: number;
  totalLeaseCost: number;
  driveOffTotal: number;
}

// ============================================================================
// CALCULATOR SERVICE
// ============================================================================

export class DealCalculatorService {
  private financeCalculator: FinanceCalculatorService;
  private leaseCalculator: LeaseCalculatorService;
  private taxCalculator: TaxCalculatorService;

  constructor() {
    this.financeCalculator = new FinanceCalculatorService();
    this.leaseCalculator = new LeaseCalculatorService();
    this.taxCalculator = new TaxCalculatorService();
  }

  /**
   * Calculate complete deal financials
   *
   * This is the main entry point for deal calculations. It:
   * 1. Calculates sale price (vehicle price - discounts - rebates)
   * 2. Calculates net trade-in (allowance - payoff)
   * 3. Calculates total fees
   * 4. Calculates total products
   * 5. Calculates sales tax using tax calculator
   * 6. Calculates totals (cash price, amount financed, OTD)
   * 7. Calculates profit metrics
   *
   * @example
   * const result = await dealCalc.calculateDeal({
   *   vehiclePrice: 30000,
   *   dealerDiscount: 2000,
   *   manufacturerRebate: 1000,
   *   tradeInAllowance: 8000,
   *   tradeInPayoff: 5000,
   *   fees: { documentationFee: 199, ... },
   *   products: [{ name: 'GAP', price: 500, cost: 200, ... }],
   *   taxCalculation: {
   *     stateTaxRate: 0.07,
   *     countyTaxRate: 0.01,
   *     cityTaxRate: 0.005,
   *     tradeInCreditType: 'tax_on_difference',
   *     stateCode: 'IN',
   *     isNewVehicle: true
   *   }
   * });
   */
  async calculateDeal(params: CalculateDealParams): Promise<DealCalculation> {
    const {
      vehiclePrice,
      dealerDiscount = 0,
      manufacturerRebate = 0,
      tradeInAllowance = 0,
      tradeInPayoff = 0,
      fees = this.getDefaultFees(),
      products = [],
      taxCalculation,
      vehicleCost = vehiclePrice, // Default: no profit margin
    } = params;

    // STEP 1: Calculate sale price
    const salePrice = new Decimal(vehiclePrice)
      .minus(dealerDiscount)
      .minus(manufacturerRebate)
      .toDecimalPlaces(2)
      .toNumber();

    // STEP 2: Calculate net trade-in
    const netTradeIn = new Decimal(tradeInAllowance)
      .minus(tradeInPayoff)
      .toDecimalPlaces(2)
      .toNumber();

    // STEP 3: Calculate total fees
    const totalFees = this.calculateTotalFees(fees);

    // STEP 4: Calculate total products
    const totalProducts = products.reduce((sum, p) => sum + p.price, 0);

    // STEP 5: Calculate sales tax
    let totalTax = 0;
    let taxCalcResult = null;

    if (taxCalculation) {
      // Use tax calculator for accurate calculation
      const taxInput: TaxCalculationInput = {
        vehiclePrice: salePrice,
        tradeAllowance: tradeInAllowance,
        dealerFees: this.getFeesAsArray(fees).map(f => ({
          amount: f.amount,
          taxable: f.taxable ?? true,
        })),
        accessories: [], // Accessories are typically included in products
        aftermarketProducts: products.map(p => ({
          category: this.mapProductTypeToCategory(p.type),
          price: p.price,
        })),
        manufacturerRebate,
        isNewVehicle: taxCalculation.isNewVehicle ?? false,
        stateTaxRate: taxCalculation.stateTaxRate,
        countyTaxRate: taxCalculation.countyTaxRate,
        cityTaxRate: taxCalculation.cityTaxRate,
        townshipTaxRate: taxCalculation.townshipTaxRate ?? 0,
        specialDistrictTaxRate: taxCalculation.specialDistrictTaxRate ?? 0,
        tradeInCreditType: taxCalculation.tradeInCreditType,
        stateCode: taxCalculation.stateCode ?? 'IN',
      };

      taxCalcResult = this.taxCalculator.calculateSalesTax(taxInput);
      totalTax = taxCalcResult.totalTax;
    } else {
      // Fallback: simple 7% tax calculation
      const taxableAmount = salePrice + totalFees + totalProducts - tradeInAllowance;
      totalTax = new Decimal(taxableAmount).times(0.07).toDecimalPlaces(2).toNumber();
    }

    // STEP 6: Calculate cash price (before trade-in equity)
    const cashPrice = new Decimal(salePrice)
      .plus(totalFees)
      .plus(totalProducts)
      .plus(totalTax)
      .toDecimalPlaces(2)
      .toNumber();

    // STEP 7: Calculate amount to be financed
    const amountFinanced = new Decimal(cashPrice)
      .minus(netTradeIn)
      .toDecimalPlaces(2)
      .toNumber();

    // STEP 8: Calculate down payment (will be set from financing/leasing details)
    const totalDownPayment = params.financing?.downPayment || params.leasing?.cashDown || 0;

    // STEP 9: Calculate out-the-door price
    const outTheDoorPrice = new Decimal(cashPrice)
      .minus(netTradeIn)
      .toDecimalPlaces(2)
      .toNumber();

    // STEP 10: Calculate profit metrics
    const vehicleProfitDecimal = new Decimal(salePrice).minus(vehicleCost);
    const frontEndProfit = vehicleProfitDecimal.toDecimalPlaces(2).toNumber();

    const backEndProfit = products.reduce(
      (sum, p) => sum + (p.price - (p.cost || 0)),
      0
    );

    const totalProfit = new Decimal(frontEndProfit)
      .plus(backEndProfit)
      .toDecimalPlaces(2)
      .toNumber();

    return {
      vehiclePrice,
      dealerDiscount,
      manufacturerRebate,
      salePrice,
      tradeInAllowance,
      tradeInPayoff,
      netTradeIn,
      taxCalculation: taxCalcResult,
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
   * Calculate finance payment using CDK/Reynolds-grade engine
   *
   * Uses the FinanceCalculatorService for industry-standard calculations.
   *
   * @example
   * const payment = dealCalc.calculateFinancePayment({
   *   vehiclePrice: 30000,
   *   downPayment: 3000,
   *   tradeAllowance: 8000,
   *   tradePayoff: 5000,
   *   totalTax: 2100,
   *   totalFees: 500,
   *   apr: 4.99,
   *   term: 60
   * });
   * // Result: { monthlyPayment: 512.34, amountFinanced: 26600, ... }
   */
  calculateFinancePayment(params: {
    vehiclePrice: number;
    downPayment: number;
    tradeAllowance: number;
    tradePayoff: number;
    totalTax: number;
    totalFees: number;
    aftermarketTotal?: number;
    apr: number;
    term: number;
    manufacturerRebate?: number;
    dealerRebate?: number;
  }): FinancePaymentResult {
    const request: FinanceCalculationRequest = {
      vehiclePrice: params.vehiclePrice.toString(),
      tradeAllowance: params.tradeAllowance.toString(),
      tradePayoff: params.tradePayoff.toString(),
      downPayment: params.downPayment.toString(),
      manufacturerRebate: (params.manufacturerRebate || 0).toString(),
      dealerRebate: (params.dealerRebate || 0).toString(),
      apr: params.apr.toString(),
      term: params.term,
      totalTax: params.totalTax.toString(),
      totalFees: params.totalFees.toString(),
      aftermarketTotal: (params.aftermarketTotal || 0).toString(),
    };

    const result = this.financeCalculator.calculateFinance(request);

    return {
      monthlyPayment: parseFloat(result.monthlyPayment),
      amountFinanced: parseFloat(result.amountFinanced),
      totalOfPayments: parseFloat(result.totalOfPayments),
      totalInterest: parseFloat(result.totalInterest),
      totalCost: parseFloat(result.totalCost),
    };
  }

  /**
   * Calculate lease payment using CDK/Reynolds-grade engine
   *
   * Uses the LeaseCalculatorService for industry-standard calculations.
   *
   * @example
   * const payment = dealCalc.calculateLeasePayment({
   *   msrp: 35000,
   *   sellingPrice: 33000,
   *   term: 36,
   *   moneyFactor: 0.00125,
   *   residualPercent: 60,
   *   cashDown: 2000,
   *   tradeAllowance: 5000,
   *   tradePayoff: 3000,
   *   taxRate: 0.0825,
   *   taxOnMonthlyPayment: true
   * });
   */
  calculateLeasePayment(params: {
    msrp: number;
    sellingPrice: number;
    term: number;
    moneyFactor: number;
    residualPercent: number;
    cashDown: number;
    tradeAllowance?: number;
    tradePayoff?: number;
    manufacturerRebate?: number;
    taxRate: number;
    taxOnMonthlyPayment: boolean;
    acquisitionFee?: number;
    docFee?: number;
    stateCode?: string;
  }): LeasePaymentResult {
    const request: LeaseCalculationRequest = {
      msrp: params.msrp.toString(),
      sellingPrice: params.sellingPrice.toString(),
      term: params.term,
      moneyFactor: params.moneyFactor.toString(),
      residualPercent: params.residualPercent.toString(),
      cashDown: params.cashDown.toString(),
      tradeAllowance: (params.tradeAllowance || 0).toString(),
      tradePayoff: (params.tradePayoff || 0).toString(),
      manufacturerRebate: (params.manufacturerRebate || 0).toString(),
      otherIncentives: '0',
      acquisitionFee: (params.acquisitionFee || 0).toString(),
      docFee: (params.docFee || 0).toString(),
      governmentFees: [],
      dealerFees: [],
      accessories: [],
      aftermarketProducts: [],
      taxRate: params.taxRate.toString(),
      taxOnMonthlyPayment: params.taxOnMonthlyPayment,
      stateCode: params.stateCode || 'IN',
    };

    const result = this.leaseCalculator.calculateLease(request);

    return {
      monthlyPayment: parseFloat(result.monthlyPayment),
      baseMonthlyPayment: parseFloat(result.baseMonthlyPayment),
      monthlyTax: parseFloat(result.monthlyTax),
      adjustedCapCost: parseFloat(result.adjustedCapCost),
      residualValue: parseFloat(result.residualValue),
      totalOfPayments: parseFloat(result.totalOfPayments),
      totalLeaseCost: parseFloat(result.totalLeaseCost),
      driveOffTotal: parseFloat(result.driveOffBreakdown.total),
    };
  }

  /**
   * Calculate monthly payment (simple version - delegates to finance calculator)
   *
   * @deprecated Use calculateFinancePayment() instead for full breakdown
   */
  calculateMonthlyPayment(params: {
    principal: number;
    rate: number; // Annual percentage rate
    term: number; // Months
  }): number {
    const { principal, rate, term } = params;

    if (rate === 0) {
      return new Decimal(principal).div(term).toDecimalPlaces(2).toNumber();
    }

    const monthlyRate = new Decimal(rate).div(100).div(12);
    const onePlusR = monthlyRate.plus(1);
    const power = onePlusR.pow(term);
    const payment = new Decimal(principal)
      .times(monthlyRate)
      .times(power)
      .div(power.minus(1));

    return payment.toDecimalPlaces(2).toNumber();
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
    const totalOfPayments = new Decimal(monthlyPayment).times(term);
    const financeCharge = totalOfPayments.minus(principal);
    return financeCharge.toDecimalPlaces(2).toNumber();
  }

  /**
   * Calculate APR (if different from rate due to fees)
   *
   * @deprecated This is a simplified calculation. Use finance calculator for accurate APR.
   */
  calculateAPR(params: {
    principal: number;
    monthlyPayment: number;
    term: number;
    financingFees?: number;
  }): number {
    // Simplified APR calculation
    const { principal, monthlyPayment, term, financingFees = 0 } = params;
    const totalPaid = new Decimal(monthlyPayment).times(term);
    const totalCost = totalPaid.plus(financingFees);
    const totalInterest = totalCost.minus(principal);
    const yearsDecimal = new Decimal(term).div(12);
    const apr = totalInterest.div(principal).div(yearsDecimal).times(100);
    return apr.toDecimalPlaces(2).toNumber();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateTotalFees(fees: DealFees): number {
    const standardFees = new Decimal(fees.documentationFee)
      .plus(fees.licensingFee)
      .plus(fees.registrationFee)
      .plus(fees.dealerFee)
      .plus(fees.advertisingFee)
      .plus(fees.deliveryFee)
      .plus(fees.processingFee);

    const customFeesTotal = fees.customFees.reduce(
      (sum, fee) => sum + fee.amount,
      0
    );

    return standardFees.plus(customFeesTotal).toDecimalPlaces(2).toNumber();
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

  private getFeesAsArray(fees: DealFees): Array<{ name: string; amount: number; taxable: boolean }> {
    const feeArray: Array<{ name: string; amount: number; taxable: boolean }> = [];

    if (fees.documentationFee > 0) {
      feeArray.push({ name: 'Documentation Fee', amount: fees.documentationFee, taxable: true });
    }
    if (fees.licensingFee > 0) {
      feeArray.push({ name: 'Licensing Fee', amount: fees.licensingFee, taxable: false });
    }
    if (fees.registrationFee > 0) {
      feeArray.push({ name: 'Registration Fee', amount: fees.registrationFee, taxable: false });
    }
    if (fees.dealerFee > 0) {
      feeArray.push({ name: 'Dealer Fee', amount: fees.dealerFee, taxable: true });
    }
    if (fees.advertisingFee > 0) {
      feeArray.push({ name: 'Advertising Fee', amount: fees.advertisingFee, taxable: true });
    }
    if (fees.deliveryFee > 0) {
      feeArray.push({ name: 'Delivery Fee', amount: fees.deliveryFee, taxable: true });
    }
    if (fees.processingFee > 0) {
      feeArray.push({ name: 'Processing Fee', amount: fees.processingFee, taxable: true });
    }

    fees.customFees.forEach(fee => {
      feeArray.push({
        name: fee.name,
        amount: fee.amount,
        taxable: fee.taxable,
      });
    });

    return feeArray;
  }

  private mapProductTypeToCategory(
    type: 'warranty' | 'gap' | 'maintenance' | 'protection' | 'other'
  ): 'warranty' | 'gap' | 'maintenance' | 'tire_wheel' | 'theft' |
     'paint_protection' | 'window_tint' | 'bedliner' | 'etch' | 'custom' {
    switch (type) {
      case 'warranty':
        return 'warranty';
      case 'gap':
        return 'gap';
      case 'maintenance':
        return 'maintenance';
      case 'protection':
        return 'paint_protection';
      case 'other':
      default:
        return 'custom';
    }
  }
}
