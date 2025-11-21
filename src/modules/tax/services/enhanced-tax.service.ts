/**
 * ENHANCED TAX SERVICE - BULLETPROOF TAX CALCULATIONS
 *
 * This service consolidates ALL tax calculation logic.
 * CRITICAL: All monetary calculations use Decimal.js for penny accuracy.
 *
 * Financial/Legal Requirements:
 * 1. Penny-accurate calculations
 * 2. Full audit trail
 * 3. Reproducible calculations
 * 4. Jurisdiction-based rules
 * 5. Itemized tax breakdown
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SalesTaxRequest,
  SalesTaxResult,
  DealTaxRequest,
  CompleteTaxBreakdown,
  Jurisdiction,
  TaxRateBreakdown,
  StateSpecificRules,
  TradeInParams,
  TradeInCreditResult,
  RegistrationRequest,
  RegistrationFeeResult,
  TaxAuditTrail,
  ValidationResult,
  TaxCalculationValidation,
  DealFee,
} from '../types/enhanced-tax.types';
import {
  JurisdictionNotFoundError,
  InvalidTaxCalculationError,
  UnsupportedStateError,
  ValidationFailedError,
} from '../types/enhanced-tax.types';
import {
  add,
  subtract,
  multiply,
  calculateTax,
  applyTradeInCredit,
  applyCap,
  applyPercent,
  sum,
  isGreaterThan,
  isZero,
  max,
  validateNonNegative,
  validateRate,
  toMoneyString,
  isEqual,
} from '../utils/decimal-calculator';

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface TaxStorage {
  // Jurisdiction lookup
  getJurisdictionByZip(zipCode: string): Promise<Jurisdiction | null>;
  getTaxRates(jurisdiction: Jurisdiction): Promise<TaxRateBreakdown>;

  // State rules
  getStateRules(state: string): Promise<StateSpecificRules | null>;
  listAllStateRules(): Promise<StateSpecificRules[]>;

  // Audit trail
  saveAuditLog(log: TaxAuditTrail): Promise<void>;
  getAuditLog(dealId: string): Promise<TaxAuditTrail[]>;

  // Dealership settings
  getDealershipDocFee(dealershipId: string): Promise<string>; // Returns decimal string
}

// ============================================================================
// ENHANCED TAX SERVICE
// ============================================================================

export class EnhancedTaxService {
  private readonly engineVersion = '2.0.0';

  constructor(private storage: TaxStorage) {}

  // ==========================================================================
  // CORE TAX CALCULATIONS
  // ==========================================================================

  /**
   * Calculate sales tax for a vehicle sale
   * CRITICAL: All monetary values use decimal strings for precision
   */
  async calculateSalesTax(request: SalesTaxRequest): Promise<SalesTaxResult> {
    // Validate inputs
    this.validateSalesTaxRequest(request);

    // Get jurisdiction
    const jurisdiction = await this.storage.getJurisdictionByZip(request.zipCode);
    if (!jurisdiction) {
      throw new JurisdictionNotFoundError(request.zipCode);
    }

    // Get tax rates
    const taxRates = await this.storage.getTaxRates(jurisdiction);

    // Get state rules
    const stateRules = await this.storage.getStateRules(request.state);
    if (!stateRules) {
      throw new UnsupportedStateError(request.state);
    }

    // Calculate taxable amount (after trade-in credit)
    let taxableAmount = request.vehiclePrice;

    if (request.tradeInValue && stateRules.allowsTradeInCredit) {
      const tradeInResult = await this.calculateTradeInCredit({
        state: request.state,
        tradeInValue: request.tradeInValue,
        vehiclePrice: request.vehiclePrice,
        stateRules,
      });

      taxableAmount = tradeInResult.taxableAmount;
    }

    // Apply rebates
    if (request.rebateManufacturer && !stateRules.manufacturerRebateTaxable) {
      taxableAmount = subtract(taxableAmount, request.rebateManufacturer);
    }

    if (request.rebateDealer && !stateRules.dealerRebateTaxable) {
      taxableAmount = subtract(taxableAmount, request.rebateDealer);
    }

    // Ensure taxable amount is non-negative
    taxableAmount = max(taxableAmount, '0.00');

    // Calculate tax breakdown
    const stateTax = calculateTax(taxableAmount, taxRates.stateRate);
    const countyTax = calculateTax(taxableAmount, taxRates.countyRate);
    const cityTax = calculateTax(taxableAmount, taxRates.cityRate);
    const specialDistrictTax = calculateTax(taxableAmount, taxRates.specialDistrictRate);

    // Total tax
    const totalTax = sum([stateTax, countyTax, cityTax, specialDistrictTax]);

    // Create result
    const calculationId = uuidv4();
    const result: SalesTaxResult = {
      totalTax,
      breakdown: {
        stateTax,
        countyTax,
        cityTax,
        specialDistrictTax,
      },
      taxRate: taxRates,
      taxableAmount,
      jurisdiction,
      calculatedAt: request.calculationDate || new Date(),
      calculatedBy: request.userId,
      calculationId,
    };

    return result;
  }

  /**
   * Calculate complete tax breakdown for a deal
   * Includes sales tax, fees, and all charges
   */
  async calculateDealTaxes(request: DealTaxRequest): Promise<CompleteTaxBreakdown> {
    // Validate inputs
    this.validateDealTaxRequest(request);

    // Get state rules
    const stateRules = await this.storage.getStateRules(request.state);
    if (!stateRules) {
      throw new UnsupportedStateError(request.state);
    }

    // Calculate sales tax
    const salesTaxRequest: SalesTaxRequest = {
      dealershipId: request.dealershipId,
      vehiclePrice: request.vehiclePrice,
      zipCode: request.zipCode,
      state: request.state,
      county: request.county,
      city: request.city,
      tradeInValue: request.tradeInValue,
      rebateManufacturer: request.rebateManufacturer,
      rebateDealer: request.rebateDealer,
      userId: request.userId,
      dealId: request.dealId,
      calculationDate: request.calculationDate,
    };

    const salesTax = await this.calculateSalesTax(salesTaxRequest);

    // Calculate doc fee
    const docFee = await this.calculateDocFee(
      request.state,
      request.dealershipId,
      request.docFee
    );

    // Calculate title fee
    const titleFee = await this.calculateTitleFee(request.state);

    // Calculate registration fee
    const registrationFee = await this.calculateRegistrationFee({
      state: request.state,
      vehicleValue: request.vehiclePrice,
    });

    // Calculate taxable fees and products
    const taxableFees: DealFee[] = [];
    const nonTaxableFees: DealFee[] = [];

    // Doc fee taxation
    if (stateRules.docFeeTaxable && !isZero(docFee)) {
      taxableFees.push({
        code: 'DOC_FEE',
        name: 'Documentation Fee',
        amount: docFee,
        taxable: true,
      });
    } else if (!isZero(docFee)) {
      nonTaxableFees.push({
        code: 'DOC_FEE',
        name: 'Documentation Fee',
        amount: docFee,
        taxable: false,
      });
    }

    // Service contracts
    if (request.serviceContracts && !isZero(request.serviceContracts)) {
      if (stateRules.serviceContractsTaxable) {
        taxableFees.push({
          code: 'SERVICE_CONTRACT',
          name: 'Service Contract',
          amount: request.serviceContracts,
          taxable: true,
        });
      } else {
        nonTaxableFees.push({
          code: 'SERVICE_CONTRACT',
          name: 'Service Contract',
          amount: request.serviceContracts,
          taxable: false,
        });
      }
    }

    // GAP insurance
    if (request.gap && !isZero(request.gap)) {
      if (stateRules.gapTaxable) {
        taxableFees.push({
          code: 'GAP',
          name: 'GAP Insurance',
          amount: request.gap,
          taxable: true,
        });
      } else {
        nonTaxableFees.push({
          code: 'GAP',
          name: 'GAP Insurance',
          amount: request.gap,
          taxable: false,
        });
      }
    }

    // Accessories
    for (const accessory of request.accessories) {
      if (stateRules.accessoriesTaxable && accessory.taxable) {
        taxableFees.push(accessory);
      } else {
        nonTaxableFees.push({ ...accessory, taxable: false });
      }
    }

    // Other fees
    for (const fee of request.otherFees) {
      if (fee.taxable) {
        taxableFees.push(fee);
      } else {
        nonTaxableFees.push(fee);
      }
    }

    // Calculate tax on taxable fees/products
    let additionalTax = '0.00';
    if (taxableFees.length > 0) {
      const taxableFeeAmount = sum(taxableFees.map((f) => f.amount));
      const totalRate = salesTax.taxRate.totalRate;
      additionalTax = calculateTax(taxableFeeAmount, totalRate);
    }

    // Total tax
    const totalTax = add(salesTax.totalTax, additionalTax);

    // Total fees
    const allFees = [...taxableFees, ...nonTaxableFees];
    const totalFees = sum([
      docFee,
      registrationFee.totalFee,
      titleFee,
      ...allFees.map((f) => f.amount),
    ]);

    // Calculate totals
    const totalTaxable = sum([
      salesTax.taxableAmount,
      ...taxableFees.map((f) => f.amount),
    ]);

    const totalNonTaxable = sum(nonTaxableFees.map((f) => f.amount));
    const totalTaxesAndFees = add(totalTax, totalFees);

    // Create audit trail
    const auditTrail: TaxAuditTrail = {
      calculationId: salesTax.calculationId,
      dealId: request.dealId,
      dealershipId: request.dealershipId,
      calculatedBy: request.userId,
      calculatedAt: request.calculationDate || new Date(),
      inputs: {
        vehiclePrice: request.vehiclePrice,
        tradeInValue: request.tradeInValue,
        rebates: {
          manufacturer: request.rebateManufacturer,
          dealer: request.rebateDealer,
        },
        fees: allFees,
        products: {
          serviceContracts: request.serviceContracts,
          gap: request.gap,
        },
        jurisdiction: {
          zipCode: request.zipCode,
          state: request.state,
          county: request.county,
          city: request.city,
        },
      },
      outputs: {
        totalTax,
        totalFees,
        breakdown: salesTax.breakdown,
      },
      rulesApplied: {
        stateRules,
        jurisdiction: salesTax.jurisdiction,
        taxRates: salesTax.taxRate,
      },
      engineVersion: this.engineVersion,
      stateRulesVersion: stateRules.version,
    };

    // Save audit log
    await this.storage.saveAuditLog(auditTrail);

    // Validate calculation
    const validation = this.validateTaxCalculation(salesTax, stateRules);

    // Create result
    const result: CompleteTaxBreakdown = {
      salesTax,
      docFee,
      registrationFee: registrationFee.totalFee,
      titleFee,
      otherFees: allFees,
      totalTaxesAndFees,
      totalTaxable,
      totalNonTaxable,
      auditTrail,
      validated: validation.allChecksPass,
      validationErrors: validation.errors.map((e) => e.message),
    };

    return result;
  }

  // ==========================================================================
  // TRADE-IN CREDIT CALCULATION
  // ==========================================================================

  /**
   * Calculate trade-in credit based on state rules
   */
  async calculateTradeInCredit(params: TradeInParams): Promise<TradeInCreditResult> {
    validateNonNegative(params.tradeInValue, 'Trade-in value');
    validateNonNegative(params.vehiclePrice, 'Vehicle price');

    const { state, tradeInValue, vehiclePrice, stateRules } = params;

    if (!stateRules.allowsTradeInCredit) {
      return {
        creditAllowed: false,
        creditAmount: '0.00',
        taxableAmount: vehiclePrice,
        appliedRule: `${state} does not allow trade-in credit`,
      };
    }

    let creditAmount = tradeInValue;
    let appliedRule = `Full trade-in credit: ${state}`;

    // Apply cap if applicable
    if (stateRules.tradeInCreditCap) {
      const cappedAmount = creditAmount;
      creditAmount = applyCap(creditAmount, stateRules.tradeInCreditCap);

      if (creditAmount !== cappedAmount) {
        appliedRule = `Trade-in credit capped at ${stateRules.tradeInCreditCap} (${state})`;
      }
    }

    // Apply percentage if applicable
    if (stateRules.tradeInCreditPercent) {
      const fullAmount = creditAmount;
      creditAmount = applyPercent(creditAmount, stateRules.tradeInCreditPercent);
      appliedRule = `Trade-in credit at ${stateRules.tradeInCreditPercent}% (${state})`;
    }

    // Calculate taxable amount
    const taxableAmount = applyTradeInCredit(vehiclePrice, creditAmount);

    return {
      creditAllowed: true,
      creditAmount,
      cappedAmount: stateRules.tradeInCreditCap
        ? applyCap(tradeInValue, stateRules.tradeInCreditCap)
        : undefined,
      percentApplied: stateRules.tradeInCreditPercent,
      taxableAmount,
      appliedRule,
    };
  }

  // ==========================================================================
  // FEE CALCULATIONS
  // ==========================================================================

  /**
   * Calculate doc fee with state-specific caps
   */
  async calculateDocFee(
    state: string,
    dealershipId: string,
    requestedFee?: string
  ): Promise<string> {
    const stateRules = await this.storage.getStateRules(state);
    if (!stateRules) {
      throw new UnsupportedStateError(state);
    }

    // Get dealership's configured doc fee or use requested fee
    let docFee = requestedFee || (await this.storage.getDealershipDocFee(dealershipId));

    // Apply state cap if applicable
    if (stateRules.docFeeCapped && stateRules.docFeeMax) {
      docFee = applyCap(docFee, stateRules.docFeeMax);
    }

    return toMoneyString(docFee);
  }

  /**
   * Calculate title fee for a state
   */
  async calculateTitleFee(state: string): Promise<string> {
    const stateRules = await this.storage.getStateRules(state);
    if (!stateRules) {
      throw new UnsupportedStateError(state);
    }

    return stateRules.titleFee;
  }

  /**
   * Calculate registration fee
   * TODO: Implement weight-based and value-based registration fees
   */
  async calculateRegistrationFee(request: RegistrationRequest): Promise<RegistrationFeeResult> {
    const stateRules = await this.storage.getStateRules(request.state);
    if (!stateRules) {
      throw new UnsupportedStateError(request.state);
    }

    // For now, return a simplified flat fee
    // This should be expanded based on state rules
    const baseFee = '50.00'; // Placeholder

    return {
      baseFee,
      additionalFees: [],
      totalFee: baseFee,
      breakdown: ['Base registration fee'],
    };
  }

  // ==========================================================================
  // JURISDICTION LOOKUP
  // ==========================================================================

  /**
   * Lookup tax jurisdiction by ZIP code
   */
  async lookupJurisdiction(zipCode: string): Promise<Jurisdiction> {
    const jurisdiction = await this.storage.getJurisdictionByZip(zipCode);
    if (!jurisdiction) {
      throw new JurisdictionNotFoundError(zipCode);
    }
    return jurisdiction;
  }

  /**
   * Get tax rate breakdown for a jurisdiction
   */
  async getTaxRate(jurisdiction: Jurisdiction): Promise<TaxRateBreakdown> {
    return await this.storage.getTaxRates(jurisdiction);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate a tax calculation
   */
  validateTaxCalculation(
    result: SalesTaxResult,
    stateRules: StateSpecificRules
  ): TaxCalculationValidation {
    const errors = [];
    const warnings = [];

    // Validate breakdown sums to total
    const breakdownSum = sum([
      result.breakdown.stateTax,
      result.breakdown.countyTax,
      result.breakdown.cityTax,
      result.breakdown.specialDistrictTax,
    ]);

    const breakdownSumMatchesTotal = isEqual(breakdownSum, result.totalTax);
    if (!breakdownSumMatchesTotal) {
      errors.push({
        code: 'BREAKDOWN_MISMATCH',
        message: `Tax breakdown sum (${breakdownSum}) does not match total tax (${result.totalTax})`,
        severity: 'critical' as const,
      });
    }

    // Validate rate is reasonable (0-15%)
    const totalRate = result.taxRate.totalRate;
    const rateWithinBounds = !isGreaterThan(totalRate, '0.15');

    if (!rateWithinBounds) {
      warnings.push({
        code: 'HIGH_TAX_RATE',
        message: `Total tax rate ${totalRate} exceeds 15% - verify jurisdiction`,
      });
    }

    // Validate taxable amount
    const taxableAmountValid = !isGreaterThan(result.taxableAmount, '0');
    if (!taxableAmountValid) {
      errors.push({
        code: 'NEGATIVE_TAXABLE',
        message: 'Taxable amount cannot be negative',
        severity: 'error' as const,
      });
    }

    // Validate jurisdiction is current
    const now = new Date();
    const jurisdictionCurrent = result.jurisdiction.effectiveDate <= now &&
      (!result.jurisdiction.endDate || result.jurisdiction.endDate >= now);

    if (!jurisdictionCurrent) {
      warnings.push({
        code: 'EXPIRED_JURISDICTION',
        message: 'Tax jurisdiction data may be expired',
      });
    }

    return {
      breakdownSumMatchesTotal,
      sumDifference: breakdownSumMatchesTotal ? undefined : subtract(breakdownSum, result.totalTax),
      rateWithinBounds,
      totalRate,
      rateLimit: '0.15',
      taxableAmountValid,
      jurisdictionFound: true,
      jurisdictionCurrent,
      allChecksPass: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get audit trail for a deal
   */
  async auditTaxCalculation(dealId: string): Promise<TaxAuditTrail[]> {
    return await this.storage.getAuditLog(dealId);
  }

  // ==========================================================================
  // PRIVATE VALIDATION HELPERS
  // ==========================================================================

  private validateSalesTaxRequest(request: SalesTaxRequest): void {
    validateNonNegative(request.vehiclePrice, 'Vehicle price');

    if (request.tradeInValue) {
      validateNonNegative(request.tradeInValue, 'Trade-in value');
    }

    if (request.rebateManufacturer) {
      validateNonNegative(request.rebateManufacturer, 'Manufacturer rebate');
    }

    if (request.rebateDealer) {
      validateNonNegative(request.rebateDealer, 'Dealer rebate');
    }

    if (!/^\d{5}(-\d{4})?$/.test(request.zipCode)) {
      throw new InvalidTaxCalculationError('Invalid ZIP code format');
    }

    if (request.state.length !== 2) {
      throw new InvalidTaxCalculationError('State code must be 2 characters');
    }
  }

  private validateDealTaxRequest(request: DealTaxRequest): void {
    validateNonNegative(request.vehiclePrice, 'Vehicle price');

    if (request.tradeInValue) {
      validateNonNegative(request.tradeInValue, 'Trade-in value');
    }

    if (request.serviceContracts) {
      validateNonNegative(request.serviceContracts, 'Service contracts');
    }

    if (request.gap) {
      validateNonNegative(request.gap, 'GAP insurance');
    }

    for (const accessory of request.accessories) {
      validateNonNegative(accessory.amount, `Accessory: ${accessory.name}`);
    }

    for (const fee of request.otherFees) {
      validateNonNegative(fee.amount, `Fee: ${fee.name}`);
    }
  }
}
