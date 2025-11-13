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
