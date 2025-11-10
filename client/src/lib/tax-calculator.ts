/**
 * Enhanced Automotive Tax Calculation Service
 * Handles all tax calculations for vehicle sales including state, local, luxury, and special fees
 */

import Decimal from 'decimal.js';
import { 
  STATE_TAX_DATA, 
  getStateTaxInfo, 
  getLocalTaxRate, 
  getEffectiveTaxRate,
  hasTradeInCredit,
  type StateTax,
  type LocalTaxRate 
} from '@shared/tax-data';
import type { DealScenario, TradeVehicle } from '@shared/schema';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface TaxCalculationOptions {
  // Vehicle information
  vehiclePrice: number;
  vehicleType?: 'new' | 'used' | 'certified';
  fuelType?: 'gasoline' | 'hybrid' | 'electric' | 'diesel';
  
  // Location information
  stateCode: string;
  zipCode?: string;
  countyOverride?: string;
  cityOverride?: string;
  
  // Trade-in information
  tradeValue?: number;
  tradePayoff?: number;
  
  // Additional charges
  docFee?: number;
  dealerFees?: number;
  aftermarketProducts?: number;
  warrantyAmount?: number;
  gapInsurance?: number;
  maintenanceAmount?: number;
  accessoriesAmount?: number;
  
  // Rebates and discounts
  rebates?: number;
  dealerDiscount?: number;
  
  // Special considerations
  isFleetSale?: boolean;
  isMilitaryBuyer?: boolean;
  isNativeAmericanReservation?: boolean;
  isOutOfStateBuyer?: boolean;
  temporaryRegistration?: boolean;
  taxExempt?: boolean;
  taxExemptionReason?: string;
}

export interface TaxCalculationResult {
  // Base amounts
  taxableAmount: number;
  
  // Tax components
  stateTax: number;
  stateTaxRate: number;
  localTax: number;
  localTaxRate: number;
  luxuryTax: number;
  luxuryTaxRate: number;
  totalTax: number;
  effectiveTaxRate: number;
  
  // Fees
  titleFee: number;
  registrationFee: number;
  docFeeTax: number;
  totalFees: number;
  
  // Trade-in benefit
  tradeInTaxSavings: number;
  tradeInCreditApplied: number;
  
  // EV considerations
  evIncentive: number;
  evAdditionalFee: number;
  
  // Special adjustments
  taxCapApplied: boolean;
  taxCapAmount?: number;
  
  // Grand total
  totalTaxAndFees: number;
  
  // Breakdown details
  breakdown: TaxBreakdownItem[];
  
  // Compliance notes
  notes: string[];
  warnings: string[];
}

export interface TaxBreakdownItem {
  label: string;
  amount: number;
  rate?: number;
  type: 'tax' | 'fee' | 'credit' | 'incentive';
  description?: string;
}

/**
 * Main tax calculation function for automotive sales
 */
export function calculateAutomotiveTax(options: TaxCalculationOptions): TaxCalculationResult {
  const stateTax = getStateTaxInfo(options.stateCode);
  if (!stateTax) {
    throw new Error(`Invalid state code: ${options.stateCode}`);
  }
  
  const result: TaxCalculationResult = {
    taxableAmount: 0,
    stateTax: 0,
    stateTaxRate: stateTax.baseTaxRate,
    localTax: 0,
    localTaxRate: 0,
    luxuryTax: 0,
    luxuryTaxRate: 0,
    totalTax: 0,
    effectiveTaxRate: 0,
    titleFee: stateTax.titleFee,
    registrationFee: stateTax.registrationFeeBase,
    docFeeTax: 0,
    totalFees: 0,
    tradeInTaxSavings: 0,
    tradeInCreditApplied: 0,
    evIncentive: 0,
    evAdditionalFee: 0,
    taxCapApplied: false,
    totalTaxAndFees: 0,
    breakdown: [],
    notes: [],
    warnings: []
  };
  
  // Handle tax-exempt sales
  if (options.taxExempt) {
    result.notes.push(`Tax-exempt sale: ${options.taxExemptionReason || 'Reason not specified'}`);
    result.totalFees = result.titleFee + result.registrationFee;
    result.totalTaxAndFees = result.totalFees;
    result.breakdown.push(
      { label: 'Title Fee', amount: result.titleFee, type: 'fee' },
      { label: 'Registration Fee', amount: result.registrationFee, type: 'fee' }
    );
    return result;
  }
  
  // Calculate base taxable amount
  let basePrice = new Decimal(options.vehiclePrice || 0);
  const rebates = new Decimal(options.rebates || 0);
  const dealerDiscount = new Decimal(options.dealerDiscount || 0);
  
  // Apply rebates based on state rules
  if (stateTax.specialRules?.includes('rebate_taxable')) {
    result.notes.push('Rebates are taxable in this state');
  } else {
    basePrice = basePrice.minus(rebates).minus(dealerDiscount);
  }
  
  // Handle trade-in credit
  let taxableAmount = basePrice;
  if (options.tradeValue && options.tradeValue > 0) {
    const tradeAllowance = new Decimal(options.tradeValue);
    const tradePayoff = new Decimal(options.tradePayoff || 0);
    const tradeEquity = tradeAllowance.minus(tradePayoff);
    
    switch (stateTax.tradeInCredit) {
      case 'tax_on_difference':
        // Tax only on the difference between new vehicle and trade-in
        const creditAmount = Decimal.min(tradeAllowance, basePrice);
        taxableAmount = taxableAmount.minus(creditAmount);
        result.tradeInCreditApplied = creditAmount.toNumber();
        result.notes.push('Trade-in credit applied to reduce taxable amount');
        break;
        
      case 'full':
        // Full trade-in value reduces taxable amount
        const fullCredit = Decimal.min(tradeAllowance, basePrice);
        taxableAmount = taxableAmount.minus(fullCredit);
        result.tradeInCreditApplied = fullCredit.toNumber();
        result.notes.push('Full trade-in value credited against purchase price');
        break;
        
      case 'partial':
        // Partial trade-in credit (e.g., Illinois's $10,000 limit)
        const partialCredit = stateTax.tradeInCreditLimit 
          ? Decimal.min(tradeAllowance, new Decimal(stateTax.tradeInCreditLimit))
          : tradeAllowance;
        const appliedCredit = Decimal.min(partialCredit, basePrice);
        taxableAmount = taxableAmount.minus(appliedCredit);
        result.tradeInCreditApplied = appliedCredit.toNumber();
        if (stateTax.tradeInCreditLimit) {
          result.notes.push(`Trade-in credit limited to $${stateTax.tradeInCreditLimit.toLocaleString()}`);
        }
        break;
        
      case 'none':
        result.notes.push('No trade-in tax credit available in this state');
        break;
    }
    
    // Calculate trade-in tax savings
    if (result.tradeInCreditApplied > 0) {
      const effectiveRate = getEffectiveTaxRate(options.stateCode, options.zipCode);
      result.tradeInTaxSavings = new Decimal(result.tradeInCreditApplied)
        .times(effectiveRate)
        .toNumber();
    }
  }
  
  // Add taxable fees and products based on state rules
  if (stateTax.docFeeTaxable && options.docFee) {
    const docFee = stateTax.maxDocFee 
      ? Math.min(options.docFee, stateTax.maxDocFee)
      : options.docFee;
    taxableAmount = taxableAmount.plus(docFee);
    result.notes.push(`Documentation fee ($${docFee}) is taxable`);
  }
  
  if (stateTax.warrantyTaxable && options.warrantyAmount) {
    taxableAmount = taxableAmount.plus(options.warrantyAmount);
  }
  
  if (stateTax.gapTaxable && options.gapInsurance) {
    taxableAmount = taxableAmount.plus(options.gapInsurance);
  }
  
  if (stateTax.maintenanceTaxable && options.maintenanceAmount) {
    taxableAmount = taxableAmount.plus(options.maintenanceAmount);
  }
  
  if (stateTax.accessoriesTaxable && options.accessoriesAmount) {
    taxableAmount = taxableAmount.plus(options.accessoriesAmount);
  }
  
  result.taxableAmount = taxableAmount.toNumber();
  
  // Calculate state tax
  result.stateTax = taxableAmount.times(stateTax.baseTaxRate).toNumber();
  
  // Calculate local tax
  if (stateTax.hasLocalTax) {
    if (options.zipCode) {
      const localRate = getLocalTaxRate(options.zipCode);
      if (localRate) {
        result.localTaxRate = localRate.localTaxRate;
        result.localTax = taxableAmount.times(localRate.localTaxRate).toNumber();
        result.notes.push(`Local tax rate for ${localRate.city || localRate.county || options.zipCode}: ${(localRate.localTaxRate * 100).toFixed(3)}%`);
      } else {
        // Use average local tax if ZIP not found
        result.localTaxRate = stateTax.averageLocalTax;
        result.localTax = taxableAmount.times(stateTax.averageLocalTax).toNumber();
        result.warnings.push(`Using average local tax rate for ${stateTax.stateName}: ${(stateTax.averageLocalTax * 100).toFixed(3)}%`);
      }
    } else {
      // No ZIP provided, use average
      result.localTaxRate = stateTax.averageLocalTax;
      result.localTax = taxableAmount.times(stateTax.averageLocalTax).toNumber();
      result.warnings.push('No ZIP code provided; using average local tax rate');
    }
  }
  
  // Calculate luxury tax if applicable
  if (stateTax.luxuryTaxThreshold && options.vehiclePrice >= stateTax.luxuryTaxThreshold) {
    const luxuryTaxableAmount = new Decimal(options.vehiclePrice).minus(stateTax.luxuryTaxThreshold);
    result.luxuryTaxRate = stateTax.luxuryTaxRate || 0;
    result.luxuryTax = luxuryTaxableAmount.times(result.luxuryTaxRate).toNumber();
    result.notes.push(`Luxury tax applied on amount over $${stateTax.luxuryTaxThreshold.toLocaleString()}`);
  }
  
  // Calculate total tax
  result.totalTax = result.stateTax + result.localTax + result.luxuryTax;
  
  // Apply tax cap if applicable
  if (stateTax.capOnTax && result.totalTax > stateTax.capOnTax) {
    result.taxCapApplied = true;
    result.taxCapAmount = stateTax.capOnTax;
    result.totalTax = stateTax.capOnTax;
    result.notes.push(`Tax capped at $${stateTax.capOnTax.toLocaleString()}`);
  }
  
  // Calculate effective tax rate
  if (result.taxableAmount > 0) {
    result.effectiveTaxRate = result.totalTax / result.taxableAmount;
  }
  
  // Handle documentation fee
  let docFeeAmount = 0;
  if (options.docFee) {
    docFeeAmount = stateTax.maxDocFee 
      ? Math.min(options.docFee, stateTax.maxDocFee)
      : options.docFee;
    if (stateTax.maxDocFee && options.docFee > stateTax.maxDocFee) {
      result.warnings.push(`Documentation fee limited to $${stateTax.maxDocFee} (requested: $${options.docFee})`);
    }
  }
  
  // Calculate registration fee (may vary by vehicle value/weight)
  if (stateTax.registrationNotes) {
    result.notes.push(stateTax.registrationNotes);
  }
  
  // Apply special state rules for registration
  if (options.stateCode === 'IA' && options.vehiclePrice) {
    // Iowa: 1% of vehicle value up to $400
    result.registrationFee = Math.min(options.vehiclePrice * 0.01, 400);
  } else if (options.stateCode === 'CA' && options.vehiclePrice) {
    // California: Based on vehicle value
    result.registrationFee = stateTax.registrationFeeBase + (options.vehiclePrice * 0.0065);
  }
  
  // Electric vehicle considerations
  if (options.fuelType === 'electric') {
    if (stateTax.evIncentive && stateTax.evIncentive > 0) {
      result.evIncentive = stateTax.evIncentive;
      result.notes.push(`Electric vehicle incentive: $${stateTax.evIncentive.toLocaleString()}`);
    }
    if (stateTax.evFee && stateTax.evFee > 0) {
      result.evAdditionalFee = stateTax.evFee;
      result.notes.push(`Electric vehicle annual fee: $${stateTax.evFee}`);
    }
  }
  
  // Special considerations
  if (options.isMilitaryBuyer) {
    result.notes.push('Military buyer - check for state-specific exemptions');
  }
  
  if (options.isNativeAmericanReservation) {
    result.warnings.push('Native American reservation sale - special tax rules may apply');
  }
  
  if (options.isOutOfStateBuyer) {
    result.warnings.push('Out-of-state buyer - verify tax reciprocity agreements');
  }
  
  if (options.temporaryRegistration) {
    result.notes.push('Temporary registration for interstate transport');
  }
  
  // Calculate total fees
  result.totalFees = result.titleFee + result.registrationFee + docFeeAmount + result.evAdditionalFee;
  
  // Calculate grand total
  result.totalTaxAndFees = result.totalTax + result.totalFees - result.evIncentive;
  
  // Build detailed breakdown
  result.breakdown = buildTaxBreakdown(result, stateTax, docFeeAmount);
  
  return result;
}

/**
 * Build detailed tax breakdown for display
 */
function buildTaxBreakdown(
  result: TaxCalculationResult, 
  stateTax: StateTax,
  docFeeAmount: number
): TaxBreakdownItem[] {
  const breakdown: TaxBreakdownItem[] = [];
  
  // Tax items
  if (result.stateTax > 0) {
    breakdown.push({
      label: `${stateTax.stateName} State Tax`,
      amount: result.stateTax,
      rate: result.stateTaxRate,
      type: 'tax',
      description: `${(result.stateTaxRate * 100).toFixed(3)}% of $${result.taxableAmount.toLocaleString()}`
    });
  }
  
  if (result.localTax > 0) {
    breakdown.push({
      label: 'Local Tax',
      amount: result.localTax,
      rate: result.localTaxRate,
      type: 'tax',
      description: `${(result.localTaxRate * 100).toFixed(3)}% local rate`
    });
  }
  
  if (result.luxuryTax > 0) {
    breakdown.push({
      label: 'Luxury Tax',
      amount: result.luxuryTax,
      rate: result.luxuryTaxRate,
      type: 'tax',
      description: `Applied to amount over $${stateTax.luxuryTaxThreshold?.toLocaleString()}`
    });
  }
  
  // Fee items
  if (result.titleFee > 0) {
    breakdown.push({
      label: 'Title Fee',
      amount: result.titleFee,
      type: 'fee',
      description: 'State title transfer fee'
    });
  }
  
  if (result.registrationFee > 0) {
    breakdown.push({
      label: 'Registration Fee',
      amount: result.registrationFee,
      type: 'fee',
      description: stateTax.registrationNotes || 'Vehicle registration fee'
    });
  }
  
  if (docFeeAmount > 0) {
    breakdown.push({
      label: 'Documentation Fee',
      amount: docFeeAmount,
      type: 'fee',
      description: stateTax.maxDocFee ? `Limited to $${stateTax.maxDocFee}` : 'Dealer processing fee'
    });
  }
  
  if (result.evAdditionalFee > 0) {
    breakdown.push({
      label: 'EV Registration Fee',
      amount: result.evAdditionalFee,
      type: 'fee',
      description: 'Annual electric vehicle fee'
    });
  }
  
  // Credits and incentives
  if (result.tradeInTaxSavings > 0) {
    breakdown.push({
      label: 'Trade-In Tax Savings',
      amount: -result.tradeInTaxSavings,
      type: 'credit',
      description: `Tax savings from $${result.tradeInCreditApplied.toLocaleString()} trade credit`
    });
  }
  
  if (result.evIncentive > 0) {
    breakdown.push({
      label: 'EV Purchase Incentive',
      amount: -result.evIncentive,
      type: 'incentive',
      description: 'State electric vehicle incentive'
    });
  }
  
  return breakdown;
}

/**
 * Calculate tax for a deal scenario
 */
export function calculateDealTax(
  scenario: Partial<DealScenario>,
  tradeVehicle?: TradeVehicle | null,
  stateCode?: string,
  zipCode?: string
): TaxCalculationResult {
  if (!stateCode) {
    throw new Error('State code is required for tax calculation');
  }
  
  const options: TaxCalculationOptions = {
    vehiclePrice: Number(scenario.vehiclePrice) || 0,
    stateCode,
    zipCode,
    tradeValue: Number(scenario.tradeAllowance) || 0,
    tradePayoff: Number(scenario.tradePayoff) || 0,
    docFee: Number(scenario.docFee) || 0,
    dealerFees: Number(scenario.dealerFees) || 0,
    aftermarketProducts: Number(scenario.aftermarketTotal) || 0,
    warrantyAmount: Number(scenario.warrantyAmount) || 0,
    gapInsurance: Number(scenario.gapInsurance) || 0,
    maintenanceAmount: Number(scenario.maintenanceAmount) || 0,
    accessoriesAmount: Number(scenario.accessoriesAmount) || 0,
    rebates: Number(scenario.rebates) || 0,
    dealerDiscount: Number(scenario.dealerDiscount) || 0,
  };
  
  return calculateAutomotiveTax(options);
}

/**
 * Estimate tax for quick calculations
 */
export function estimateTax(
  vehiclePrice: number,
  stateCode: string,
  tradeValue?: number
): { tax: number; fees: number; total: number } {
  const result = calculateAutomotiveTax({
    vehiclePrice,
    stateCode,
    tradeValue
  });
  
  return {
    tax: result.totalTax,
    fees: result.totalFees,
    total: result.totalTaxAndFees
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(rate: number, decimals: number = 3): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}