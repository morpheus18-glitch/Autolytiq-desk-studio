import Decimal from 'decimal.js';
import { STATE_TAX_DATA } from '../shared/tax-data';

// Configure Decimal.js for financial precision - matching frontend
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ✅ NEW: Helper function to determine if F&I product is taxable in a given state
function isAftermarketProductTaxable(
  category: string,
  stateCode: string = 'IN'
): boolean {
  const stateTax = STATE_TAX_DATA[stateCode.toUpperCase()];
  if (!stateTax) return true; // Default to taxable if state not found

  // Check state-specific rules
  switch (category) {
    case 'warranty':
      return stateTax.warrantyTaxable ?? true; // Default taxable if not specified

    case 'gap':
      return stateTax.gapTaxable ?? true;

    case 'maintenance':
    case 'tire_wheel': // Tire & wheel protection plans (service contracts)
      return stateTax.maintenanceTaxable ?? true;

    case 'theft': // Theft protection/LoJack (often bundled with GAP)
      return stateTax.gapTaxable ?? true;

    case 'paint_protection':
    case 'window_tint':
    case 'bedliner':
    case 'etch': // VIN etching
    case 'custom': // Custom accessories
      return stateTax.accessoriesTaxable ?? true; // Physical accessories usually taxable

    default:
      return true; // Default to taxable
  }
}

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
  // Tax method determines how tax is applied to lease
  taxMethod?: 'payment' | 'cap_cost' | 'hybrid';
  // Tax rate for payment-based taxation
  taxRate?: number;
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
    totalFees,
    taxMethod = 'payment',
    taxRate = 0
  } = input;

  // Calculate net trade equity
  const tradeEquity = new Decimal(tradeAllowance).minus(tradePayoff);

  // Build Gross Capitalized Cost
  let grossCapCost = new Decimal(vehiclePrice).plus(totalFees);

  // For cap_cost tax method, add tax to gross cap cost
  if (taxMethod === 'cap_cost') {
    grossCapCost = grossCapCost.plus(totalTax);
  }

  // Calculate Cap Cost Reductions
  let capReductions = new Decimal(downPayment);

  // Trade equity reduces cap cost if positive, increases if negative
  if (tradeEquity.gt(0)) {
    capReductions = capReductions.plus(tradeEquity);
  } else if (tradeEquity.lt(0)) {
    grossCapCost = grossCapCost.plus(tradeEquity.abs());
  }

  // Adjusted Capitalized Cost
  const adjustedCapCost = grossCapCost.minus(capReductions);

  if (adjustedCapCost.lte(0) || term === 0) {
    return {
      monthlyPayment: 0,
      amountFinanced: adjustedCapCost.toNumber(),
      totalCost: adjustedCapCost.toNumber(),
    };
  }

  const residual = new Decimal(residualValue);

  // Standard lease formula
  const depreciation = adjustedCapCost.minus(residual).div(term);
  const financeCharge = adjustedCapCost.plus(residual).times(moneyFactor);
  const baseMonthlyPayment = depreciation.plus(financeCharge);

  // Apply tax based on method
  let monthlyPayment: Decimal;
  let totalCost: Decimal;

  switch (taxMethod) {
    case 'payment':
      const monthlyTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(monthlyTax);
      totalCost = monthlyPayment.times(term);
      break;

    case 'cap_cost':
      monthlyPayment = baseMonthlyPayment;
      totalCost = monthlyPayment.times(term);
      break;

    case 'hybrid':
      const hybridTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(hybridTax);
      totalCost = monthlyPayment.times(term).plus(totalTax);
      break;

    default:
      monthlyPayment = baseMonthlyPayment.plus(baseMonthlyPayment.times(taxRate));
      totalCost = monthlyPayment.times(term);
  }

  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalCost.toDecimalPlaces(2).toNumber(),
  };
}

export interface TaxCalculationInput {
  vehiclePrice: number;
  tradeAllowance: number;
  dealerFees: Array<{ amount: number; taxable: boolean }>;
  accessories: Array<{ amount: number; taxable: boolean }>;

  // ✅ NEW: F&I Products with category-based taxation
  aftermarketProducts?: Array<{
    category: 'warranty' | 'gap' | 'maintenance' | 'tire_wheel' | 'theft' |
              'paint_protection' | 'window_tint' | 'bedliner' | 'etch' | 'custom';
    price: number;
  }>;

  // ✅ NEW: Rebate handling (new cars only)
  manufacturerRebate?: number;
  isNewVehicle?: boolean; // Rebates only apply to new vehicles

  stateTaxRate: number;
  countyTaxRate: number;
  cityTaxRate: number;
  townshipTaxRate?: number;
  specialDistrictTaxRate?: number;
  tradeInCreditType: string;

  // ✅ NEW: State code for F&I product taxation lookup
  stateCode?: string;
}

export function calculateSalesTax(input: TaxCalculationInput): number {
  const {
    vehiclePrice,
    tradeAllowance,
    dealerFees,
    accessories,
    aftermarketProducts = [],
    manufacturerRebate = 0,
    isNewVehicle = false,
    stateTaxRate,
    countyTaxRate,
    cityTaxRate,
    townshipTaxRate = 0,
    specialDistrictTaxRate = 0,
    tradeInCreditType,
    stateCode = 'IN',
  } = input;

  let taxableAmount = new Decimal(vehiclePrice);

  // ✅ NEW: Subtract manufacturer rebate FIRST (only on new vehicles)
  // Most states treat rebates as a reduction in purchase price
  if (isNewVehicle && manufacturerRebate > 0) {
    const stateTax = STATE_TAX_DATA[stateCode.toUpperCase()];
    const rebateReducesTaxable = stateTax?.rebateReducesTaxable ?? true;

    if (rebateReducesTaxable) {
      taxableAmount = taxableAmount.minus(manufacturerRebate);
    }
    // Note: Some states tax the rebate amount - handle via rebateTaxable flag if needed
  }

  // Apply trade-in credit
  if (tradeInCreditType === 'tax_on_difference') {
    taxableAmount = taxableAmount.minus(tradeAllowance);
  }

  // Add taxable dealer fees
  const taxableFees = dealerFees
    .filter(f => f.taxable)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));

  // Add taxable accessories
  const taxableAccessories = accessories
    .filter(a => a.taxable)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));

  // ✅ NEW: Add taxable F&I products (state-specific rules)
  const taxableAftermarketProducts = aftermarketProducts
    .filter(p => isAftermarketProductTaxable(p.category, stateCode))
    .reduce((sum, p) => sum.plus(p.price), new Decimal(0));

  taxableAmount = taxableAmount
    .plus(taxableFees)
    .plus(taxableAccessories)
    .plus(taxableAftermarketProducts);

  // Ensure non-negative taxable amount
  if (taxableAmount.lt(0)) {
    taxableAmount = new Decimal(0);
  }

  // Calculate total tax rate
  const totalRate = new Decimal(stateTaxRate)
    .plus(countyTaxRate)
    .plus(cityTaxRate)
    .plus(townshipTaxRate)
    .plus(specialDistrictTaxRate);

  const totalTax = taxableAmount.times(totalRate);

  return totalTax.toDecimalPlaces(2).toNumber();
}

// ============================================================================
// DEALER-GRADE LEASE CALCULATION ENGINE
// ============================================================================

// Input interface for comprehensive lease calculation
export interface DealerGradeLeaseInput {
  // Vehicle
  msrp: number;
  sellingPrice: number;
  residualPercent: number; // e.g., 0.60 for 60%
  term: number; // months
  moneyFactor: number; // e.g., 0.00250

  // Capitalized fees (rolled into lease)
  acquisitionFee: number;
  acquisitionFeeCapitalized: boolean;
  docFee: number;
  docFeeCapitalized: boolean;
  dealerFees: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  governmentFees: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
  }>;
  accessories: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  aftermarketProducts: Array<{
    category: string;
    name: string;
    price: number;
    capitalized: boolean;
    taxable: boolean;
  }>;

  // Cap cost reductions
  cashDown: number;
  tradeAllowance: number;
  tradePayoff: number;
  manufacturerRebate: number;
  otherIncentives: number;

  // Tax configuration
  taxMethod: 'payment' | 'total_cap' | 'selling_price' | 'cap_reduction';
  taxRate: number; // Combined state + local rate (e.g., 0.095 for 9.5%)
  stateCode: string;

  // Optional
  securityDeposit?: number;
  firstPaymentDueAtSigning?: boolean;
}

// Output interface for comprehensive lease calculation
export interface DealerGradeLeaseOutput {
  // Intermediate calculations
  residualValue: number;
  grossCapCost: number;
  totalCapReductions: number;
  adjustedCapCost: number;
  depreciation: number;
  monthlyDepreciationCharge: number;
  monthlyRentCharge: number;

  // Payment results
  baseMonthlyPayment: number; // Pre-tax
  monthlyTax: number;
  totalMonthlyPayment: number;
  aprEquivalent: number; // Money factor × 2400

  // Drive-off breakdown
  driveOffTotal: number;
  driveOffBreakdown: {
    firstPayment: number;
    cashDown: number;
    acquisitionFee: number;
    docFee: number;
    upfrontFees: number;
    upfrontTax: number;
    securityDeposit: number;
    otherCharges: number;
  };

  // Total lease cost
  totalOfPayments: number;
  totalLeaseCost: number;

  // For backward compatibility
  monthlyPayment: number;
  amountFinanced: number;
  totalCost: number;
}

// Money Factor <-> APR conversion utilities
export function moneyFactorToAPR(moneyFactor: number): number {
  return new Decimal(moneyFactor).times(2400).toDecimalPlaces(2).toNumber();
}

export function aprToMoneyFactor(apr: number): number {
  return new Decimal(apr).div(2400).toDecimalPlaces(6).toNumber();
}

/**
 * DEALER-GRADE LEASE CALCULATION ENGINE
 *
 * This function implements a complete, accurate automotive lease calculation
 * following industry-standard formulas used by OEMs and dealerships.
 *
 * Tax Methods Supported:
 * - "payment": Tax applied to each monthly payment (CA, FL, NY, etc.)
 * - "total_cap": Tax applied upfront on adjusted cap cost (TX, etc.)
 * - "selling_price": Tax applied upfront on selling price only (IL, etc.)
 * - "cap_reduction": Tax on cap reduction + tax on payment (special cases)
 */
export function calculateDealerGradeLease(input: DealerGradeLeaseInput): DealerGradeLeaseOutput {
  const {
    msrp,
    sellingPrice,
    residualPercent,
    term,
    moneyFactor,
    acquisitionFee,
    acquisitionFeeCapitalized,
    docFee,
    docFeeCapitalized,
    dealerFees,
    governmentFees,
    accessories,
    aftermarketProducts,
    cashDown,
    tradeAllowance,
    tradePayoff,
    manufacturerRebate,
    otherIncentives,
    taxMethod,
    taxRate,
    securityDeposit = 0,
    firstPaymentDueAtSigning = true,
  } = input;

  // ============================================================================
  // STEP 1: Calculate Residual Value (ALWAYS based on MSRP)
  // ============================================================================
  const residualValue = new Decimal(msrp).times(residualPercent);

  // ============================================================================
  // STEP 2: Calculate Gross Capitalized Cost
  // ============================================================================
  let grossCapCost = new Decimal(sellingPrice);

  // Add capitalized fees
  if (acquisitionFeeCapitalized) {
    grossCapCost = grossCapCost.plus(acquisitionFee);
  }
  if (docFeeCapitalized) {
    grossCapCost = grossCapCost.plus(docFee);
  }

  // Add capitalized dealer fees
  const capitalizedDealerFees = dealerFees
    .filter(f => f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedDealerFees);

  // Add capitalized government fees
  const capitalizedGovFees = governmentFees
    .filter(f => f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedGovFees);

  // Add capitalized accessories
  const capitalizedAccessories = accessories
    .filter(a => a.capitalized)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedAccessories);

  // Add capitalized aftermarket products
  const capitalizedProducts = aftermarketProducts
    .filter(p => p.capitalized)
    .reduce((sum, p) => sum.plus(p.price), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedProducts);

  // ============================================================================
  // STEP 3: Calculate Cap Cost Reductions
  // ============================================================================
  // Handle trade equity (positive reduces cap, negative increases cap)
  const tradeEquity = new Decimal(tradeAllowance).minus(tradePayoff);
  const positiveTradeEquity = tradeEquity.gt(0) ? tradeEquity : new Decimal(0);
  const negativeEquity = tradeEquity.lt(0) ? tradeEquity.abs() : new Decimal(0);

  // Total reductions (only positive amounts reduce cap cost)
  const totalCapReductions = new Decimal(cashDown)
    .plus(positiveTradeEquity)
    .plus(manufacturerRebate)
    .plus(otherIncentives);

  // ============================================================================
  // STEP 4: Calculate Adjusted Capitalized Cost
  // ============================================================================
  // Negative equity gets ADDED to gross cap (it's a cost, not a reduction)
  let adjustedCapCost = grossCapCost
    .plus(negativeEquity)
    .minus(totalCapReductions);

  // Ensure non-negative adjusted cap cost
  if (adjustedCapCost.lt(0)) {
    adjustedCapCost = new Decimal(0);
  }

  // ============================================================================
  // STEP 5: Calculate Depreciation
  // ============================================================================
  const depreciation = adjustedCapCost.minus(residualValue);
  const monthlyDepreciationCharge = depreciation.div(term);

  // ============================================================================
  // STEP 6: Calculate Rent Charge (Finance Charge)
  // ============================================================================
  const monthlyRentCharge = adjustedCapCost.plus(residualValue).times(moneyFactor);

  // ============================================================================
  // STEP 7: Calculate Base Monthly Payment (Pre-Tax)
  // ============================================================================
  const baseMonthlyPayment = monthlyDepreciationCharge.plus(monthlyRentCharge);

  // ============================================================================
  // STEP 8: Apply Tax Based on Method
  // ============================================================================
  let monthlyTax = new Decimal(0);
  let upfrontTax = new Decimal(0);

  // Round base payment FIRST for consistent accounting
  const roundedBasePayment = baseMonthlyPayment.toDecimalPlaces(2);

  switch (taxMethod) {
    case 'payment':
      // Most common: Tax applied to each monthly payment
      // Use rounded base payment for tax calculation (accounting standard)
      monthlyTax = roundedBasePayment.times(taxRate).toDecimalPlaces(2);
      break;

    case 'total_cap':
      // TX style: Full tax on adjusted cap cost upfront
      upfrontTax = adjustedCapCost.times(taxRate);
      break;

    case 'selling_price':
      // IL style: Tax on selling price only (not full cap)
      upfrontTax = new Decimal(sellingPrice).times(taxRate);
      break;

    case 'cap_reduction':
      // Rare: Tax on cap reduction PLUS tax on payment
      const capReductionTaxable = new Decimal(cashDown).plus(positiveTradeEquity);
      upfrontTax = capReductionTaxable.times(taxRate).toDecimalPlaces(2);
      monthlyTax = roundedBasePayment.times(taxRate).toDecimalPlaces(2);
      break;

    default:
      // Default to payment method
      monthlyTax = roundedBasePayment.times(taxRate).toDecimalPlaces(2);
  }

  // ============================================================================
  // STEP 9: Calculate Total Monthly Payment
  // ============================================================================
  // Use rounded values for correct accounting display
  const totalMonthlyPayment = roundedBasePayment.plus(monthlyTax);

  // ============================================================================
  // STEP 10: Calculate Drive-Off / Due at Signing
  // ============================================================================
  // Upfront fees (not capitalized)
  let upfrontFees = new Decimal(0);

  // Doc fee if not capitalized
  const upfrontDocFee = docFeeCapitalized ? 0 : docFee;
  upfrontFees = upfrontFees.plus(upfrontDocFee);

  // Acquisition fee if not capitalized
  const upfrontAcqFee = acquisitionFeeCapitalized ? 0 : acquisitionFee;
  upfrontFees = upfrontFees.plus(upfrontAcqFee);

  // Government fees not capitalized
  const upfrontGovFees = governmentFees
    .filter(f => !f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  upfrontFees = upfrontFees.plus(upfrontGovFees);

  // Dealer fees not capitalized
  const upfrontDealerFees = dealerFees
    .filter(f => !f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  upfrontFees = upfrontFees.plus(upfrontDealerFees);

  // First payment
  const firstPayment = firstPaymentDueAtSigning ? totalMonthlyPayment : new Decimal(0);

  // Total drive-off
  const driveOffTotal = firstPayment
    .plus(cashDown)
    .plus(upfrontFees)
    .plus(upfrontTax)
    .plus(securityDeposit);

  // ============================================================================
  // STEP 11: Calculate Total Lease Cost
  // ============================================================================
  const totalOfPayments = totalMonthlyPayment.times(term);
  const totalLeaseCost = totalOfPayments.plus(driveOffTotal);

  // ============================================================================
  // STEP 12: Calculate APR Equivalent
  // ============================================================================
  const aprEquivalent = moneyFactorToAPR(moneyFactor);

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================
  return {
    // Intermediate calculations
    residualValue: residualValue.toDecimalPlaces(2).toNumber(),
    grossCapCost: grossCapCost.toDecimalPlaces(2).toNumber(),
    totalCapReductions: totalCapReductions.toDecimalPlaces(2).toNumber(),
    adjustedCapCost: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    depreciation: depreciation.toDecimalPlaces(2).toNumber(),
    monthlyDepreciationCharge: monthlyDepreciationCharge.toDecimalPlaces(2).toNumber(),
    monthlyRentCharge: monthlyRentCharge.toDecimalPlaces(2).toNumber(),

    // Payment results
    baseMonthlyPayment: baseMonthlyPayment.toDecimalPlaces(2).toNumber(),
    monthlyTax: monthlyTax.toDecimalPlaces(2).toNumber(),
    totalMonthlyPayment: totalMonthlyPayment.toDecimalPlaces(2).toNumber(),
    aprEquivalent,

    // Drive-off breakdown
    driveOffTotal: driveOffTotal.toDecimalPlaces(2).toNumber(),
    driveOffBreakdown: {
      firstPayment: firstPayment.toDecimalPlaces(2).toNumber(),
      cashDown: cashDown,
      acquisitionFee: upfrontAcqFee,
      docFee: upfrontDocFee,
      upfrontFees: upfrontFees.minus(upfrontAcqFee).minus(upfrontDocFee).toDecimalPlaces(2).toNumber(),
      upfrontTax: upfrontTax.toDecimalPlaces(2).toNumber(),
      securityDeposit: securityDeposit,
      otherCharges: 0,
    },

    // Total lease cost
    totalOfPayments: totalOfPayments.toDecimalPlaces(2).toNumber(),
    totalLeaseCost: totalLeaseCost.toDecimalPlaces(2).toNumber(),

    // Backward compatibility
    monthlyPayment: totalMonthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalLeaseCost.toDecimalPlaces(2).toNumber(),
  };
}

// ============================================================================
// STATE TAX CONFIGURATION FOR LEASES
// ============================================================================

export interface StateLeaseTaxConfig {
  stateCode: string;
  taxMethod: 'payment' | 'total_cap' | 'selling_price' | 'cap_reduction';
  stateTaxRate: number;
  rebateReducesTaxable: boolean;
  docFeeTaxable: boolean;
  acquisitionFeeTaxable: boolean;
  capReductionTaxable: boolean;
  tradeCreditReducesTaxable: boolean;
  negativeEquityTaxable: boolean;
}

// Default lease tax configurations for common states
export const STATE_LEASE_TAX_CONFIG: Record<string, Partial<StateLeaseTaxConfig>> = {
  CA: {
    taxMethod: 'payment',
    stateTaxRate: 0.0725, // Base rate, varies by locality
  },
  TX: {
    taxMethod: 'total_cap',
    stateTaxRate: 0.0625,
    capReductionTaxable: true, // TX taxes everything
  },
  FL: {
    taxMethod: 'payment',
    stateTaxRate: 0.06,
  },
  NY: {
    taxMethod: 'payment',
    stateTaxRate: 0.04, // Base rate + local
  },
  IL: {
    taxMethod: 'selling_price',
    stateTaxRate: 0.0625,
  },
  PA: {
    taxMethod: 'payment',
    stateTaxRate: 0.06,
  },
  OH: {
    taxMethod: 'payment',
    stateTaxRate: 0.0575,
  },
  NJ: {
    taxMethod: 'payment',
    stateTaxRate: 0.06625,
  },
  IN: {
    taxMethod: 'payment',
    stateTaxRate: 0.07,
  },
  MI: {
    taxMethod: 'payment',
    stateTaxRate: 0.06,
  },
};

/**
 * Get lease tax configuration for a state
 * Falls back to default "payment" method if state not found
 */
export function getLeaseTaxConfig(stateCode: string): StateLeaseTaxConfig {
  const stateConfig = STATE_LEASE_TAX_CONFIG[stateCode.toUpperCase()];

  return {
    stateCode: stateCode.toUpperCase(),
    taxMethod: stateConfig?.taxMethod || 'payment',
    stateTaxRate: stateConfig?.stateTaxRate || 0,
    rebateReducesTaxable: stateConfig?.rebateReducesTaxable ?? true,
    docFeeTaxable: stateConfig?.docFeeTaxable ?? true,
    acquisitionFeeTaxable: stateConfig?.acquisitionFeeTaxable ?? true,
    capReductionTaxable: stateConfig?.capReductionTaxable ?? false,
    tradeCreditReducesTaxable: stateConfig?.tradeCreditReducesTaxable ?? true,
    negativeEquityTaxable: stateConfig?.negativeEquityTaxable ?? true,
  };
}
