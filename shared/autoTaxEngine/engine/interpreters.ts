/**
 * TAX SCHEME INTERPRETERS
 *
 * All logic for interpreting state-specific tax schemes lives here.
 * State files contain ONLY data (TaxRulesConfig).
 *
 * This module interprets:
 * - VehicleTaxScheme (STATE_ONLY, STATE_PLUS_LOCAL, SPECIAL_HUT, SPECIAL_TAVT, DMV_PRIVILEGE_TAX)
 * - LeaseSpecialScheme (NY_MTR, NJ_LUXURY, PA_LEASE_TAX, etc.)
 * - Trade-in policies (FULL, CAPPED, PERCENT, NONE)
 * - Rebate rules
 * - Fee taxability
 * - Local tax rate lookup (for STATE_PLUS_LOCAL)
 */

import type {
  TaxRulesConfig,
  VehicleTaxScheme,
  LeaseSpecialScheme,
  TaxRateComponent,
  TradeInPolicy,
} from '../types';

// ============================================================================
// LOCAL TAX RATE HELPER (For SERVER-SIDE Integration)
// ============================================================================

/**
 * Build tax rate components from local tax rate info
 *
 * This is a server-side helper that can be used to convert local tax rate
 * data (from local-tax-service) into TaxRateComponent[] for AutoTaxEngine.
 *
 * Example usage in server routes:
 * ```typescript
 * import { getLocalTaxRate } from "../server/local-tax-service";
 * const localInfo = await getLocalTaxRate(zipCode, stateCode);
 * const rates = buildRateComponentsFromLocalInfo(localInfo);
 * const taxInput = { ...dealData, rates };
 * const result = calculateTax(taxInput, rules);
 * ```
 *
 * @param localInfo - Local tax rate info from local-tax-service
 * @returns Array of tax rate components for AutoTaxEngine
 */
export function buildRateComponentsFromLocalInfo(localInfo: {
  stateTaxRate: number;
  countyRate: number;
  cityRate: number;
  specialDistrictRate: number;
}): TaxRateComponent[] {
  const components: TaxRateComponent[] = [];

  // Always include state rate
  components.push({
    label: 'STATE',
    rate: localInfo.stateTaxRate,
  });

  // Add county if non-zero
  if (localInfo.countyRate > 0) {
    components.push({
      label: 'COUNTY',
      rate: localInfo.countyRate,
    });
  }

  // Add city if non-zero
  if (localInfo.cityRate > 0) {
    components.push({
      label: 'CITY',
      rate: localInfo.cityRate,
    });
  }

  // Add special district if non-zero
  if (localInfo.specialDistrictRate > 0) {
    components.push({
      label: 'SPECIAL_DISTRICT',
      rate: localInfo.specialDistrictRate,
    });
  }

  return components;
}

/**
 * Build tax rate components from detailed breakdown
 *
 * Alternative to buildRateComponentsFromLocalInfo that uses the full
 * jurisdiction breakdown with proper labels for each component.
 *
 * @param breakdown - Detailed breakdown from local-tax-service
 * @returns Array of tax rate components with proper labels
 */
export function buildRateComponentsFromBreakdown(
  breakdown: {
    jurisdictionType: 'STATE' | 'COUNTY' | 'CITY' | 'SPECIAL_DISTRICT';
    name: string;
    rate: number;
  }[]
): TaxRateComponent[] {
  return breakdown.map((item) => ({
    label:
      item.jurisdictionType === 'SPECIAL_DISTRICT'
        ? `DISTRICT_${item.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
        : item.jurisdictionType,
    rate: item.rate,
  }));
}

// ============================================================================
// VEHICLE TAX SCHEME INTERPRETERS
// ============================================================================

/**
 * Interprets how tax rates should be applied based on vehicle tax scheme
 */
export function interpretVehicleTaxScheme(
  scheme: VehicleTaxScheme,
  rates: TaxRateComponent[],
  _rules: TaxRulesConfig
): {
  effectiveRates: TaxRateComponent[];
  notes: string[];
} {
  const notes: string[] = [];

  switch (scheme) {
    case 'STATE_ONLY': {
      // Only state-level tax, ignore any local components
      const stateRates = rates.filter((r) => r.label === 'STATE');
      notes.push(`Vehicle tax scheme: STATE_ONLY (ignoring local rates, state only)`);
      return { effectiveRates: stateRates, notes };
    }

    case 'STATE_PLUS_LOCAL':
      // Full stacked jurisdictions (state + county + city + districts)
      notes.push(`Vehicle tax scheme: STATE_PLUS_LOCAL (all jurisdiction rates apply)`);
      return { effectiveRates: rates, notes };

    case 'SPECIAL_HUT':
      // North Carolina Highway Use Tax
      // Special calculation - flat rate on vehicle price
      notes.push(`Vehicle tax scheme: SPECIAL_HUT (NC Highway Use Tax - special calculation)`);
      // In real implementation, this would apply NC-specific HUT logic
      // For now, pass through rates
      return { effectiveRates: rates, notes };

    case 'SPECIAL_TAVT':
      // Georgia Title Ad Valorem Tax
      // One-time tax instead of annual property tax
      notes.push(`Vehicle tax scheme: SPECIAL_TAVT (GA Title Ad Valorem Tax - one-time charge)`);
      // In real implementation, this would apply GA-specific TAVT logic
      return { effectiveRates: rates, notes };

    case 'DMV_PRIVILEGE_TAX':
      // West Virginia style privilege/title tax
      notes.push(`Vehicle tax scheme: DMV_PRIVILEGE_TAX (WV-style privilege tax)`);
      // In real implementation, this would apply WV-specific logic
      return { effectiveRates: rates, notes };

    default:
      notes.push(`Vehicle tax scheme: Unknown scheme, using all rates`);
      return { effectiveRates: rates, notes };
  }
}

// ============================================================================
// TRADE-IN POLICY INTERPRETER
// ============================================================================

/**
 * Interprets trade-in policy and returns the credit amount
 */
export function interpretTradeInPolicy(
  policy: TradeInPolicy,
  tradeInValue: number,
  vehiclePrice: number,
  notes: string[]
): number {
  switch (policy.type) {
    case 'NONE':
      notes.push('Trade-in policy: No credit allowed');
      return 0;

    case 'FULL':
      notes.push(`Trade-in policy: Full credit of $${tradeInValue.toFixed(2)}`);
      return tradeInValue;

    case 'CAPPED': {
      const cappedAmount = Math.min(tradeInValue, policy.capAmount);
      notes.push(
        `Trade-in policy: Capped at $${policy.capAmount} (applied: $${cappedAmount.toFixed(2)})`
      );
      return cappedAmount;
    }

    case 'PERCENT': {
      const percentAmount = tradeInValue * policy.percent;
      notes.push(
        `Trade-in policy: ${policy.percent * 100}% credit (applied: $${percentAmount.toFixed(2)})`
      );
      return percentAmount;
    }

    default:
      notes.push('Trade-in policy: Unknown policy, no credit applied');
      return 0;
  }
}

// ============================================================================
// LEASE SPECIAL SCHEME INTERPRETERS
// ============================================================================

export interface LeaseSchemeAdjustment {
  upfrontBaseAdjustment: number;
  monthlyBaseAdjustment: number;
  specialFees: { code: string; amount: number }[];
  notes: string[];
}

/**
 * Interprets lease special schemes and returns adjustments to apply
 */
// eslint-disable-next-line max-params
export function interpretLeaseSpecialScheme(
  scheme: LeaseSpecialScheme,
  grossCapCost: number,
  basePayment: number,
  paymentCount: number,
  rules: TaxRulesConfig
): LeaseSchemeAdjustment {
  const notes: string[] = [];
  const specialFees: { code: string; amount: number }[] = [];

  switch (scheme) {
    case 'NONE':
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees: [],
        notes: ['Lease scheme: Standard (no special adjustments)'],
      };

    case 'NY_MTR':
      // New York Metropolitan Commuter Transportation District (MCTD) surcharge
      // Additional 0.375% in certain counties
      notes.push('Lease scheme: NY_MTR (Metropolitan Commuter Transportation District)');
      notes.push(
        'NY MCTD surcharge: 0.375% may apply in certain counties (Bronx, Kings, New York, Queens, Richmond, Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester)'
      );
      // In real implementation, would check if jurisdiction is in MCTD zone
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'NJ_LUXURY':
      // New Jersey luxury tax on leases over certain threshold
      notes.push('Lease scheme: NJ_LUXURY (luxury vehicle surcharge)');
      // NJ: Additional tax on vehicles over $45,000 MSRP
      if (grossCapCost > 45000) {
        const luxuryFee = (grossCapCost - 45000) * 0.004; // 0.4% on amount over $45k
        specialFees.push({ code: 'NJ_LUXURY_TAX', amount: luxuryFee });
        notes.push(`NJ luxury tax: 0.4% on amount over $45,000 = $${luxuryFee.toFixed(2)}`);
      }
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'PA_LEASE_TAX':
      // Pennsylvania lease tax (tax on monthly payment only, no upfront)
      notes.push('Lease scheme: PA_LEASE_TAX (tax on monthly payments, no upfront)');
      // PA: Monthly only, no special adjustments needed (handled by method: MONTHLY)
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'IL_CHICAGO_COOK':
      // Illinois Chicago/Cook County special lease rules
      notes.push('Lease scheme: IL_CHICAGO_COOK (Chicago/Cook County lease rules)');
      // Chicago: Additional 0.5% lease tax in city limits
      // Cook County: Additional lease-specific rates
      notes.push('IL: Chicago adds 0.5% lease tax, Cook County may have additional rates');
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'TX_LEASE_SPECIAL':
      // Texas lease tax (motor vehicle sales tax on lease payments)
      notes.push('Lease scheme: TX_LEASE_SPECIAL (motor vehicle sales tax)');
      // TX: 6.25% state + local on monthly payments
      // No special adjustments needed (handled by rates)
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'VA_USAGE':
      // Virginia motor vehicle sales and use tax on leases
      notes.push('Lease scheme: VA_USAGE (motor vehicle sales/use tax)');
      // VA: Tax on monthly payments, with county-specific rates
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'MD_UPFRONT_GAIN':
      // Maryland taxes upfront gain on leases
      notes.push('Lease scheme: MD_UPFRONT_GAIN (tax on upfront gain)');
      // MD: Taxes the "upfront gain" (cap cost - residual)
      // This is a simplified interpretation
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    case 'CO_HOME_RULE_LEASE':
      // Colorado home-rule city lease complications
      notes.push('Lease scheme: CO_HOME_RULE_LEASE (home-rule city complications)');
      notes.push('CO: Home-rule cities may have different lease tax rates and rules');
      // CO: Each home-rule city can have its own rules
      // Need jurisdiction-specific logic (handled by jurisdiction resolver)
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees,
        notes,
      };

    default:
      return {
        upfrontBaseAdjustment: 0,
        monthlyBaseAdjustment: 0,
        specialFees: [],
        notes: ['Lease scheme: Unknown scheme, no adjustments applied'],
      };
  }
}

// ============================================================================
// FEE TAXABILITY INTERPRETER
// ============================================================================

/**
 * Determines if a fee is taxable based on state rules
 */
export function isFeeTaxable(
  feeCode: string,
  dealType: 'RETAIL' | 'LEASE',
  rules: TaxRulesConfig
): boolean {
  if (dealType === 'RETAIL') {
    const feeRule = rules.feeTaxRules.find((r) => r.code === feeCode);
    return feeRule?.taxable ?? false;
  } else {
    const feeRule = rules.leaseRules.feeTaxRules.find((r) => r.code === feeCode);
    return feeRule?.taxable ?? false;
  }
}

/**
 * Determines if doc fee is taxable based on state rules and deal type
 */
export function isDocFeeTaxable(dealType: 'RETAIL' | 'LEASE', rules: TaxRulesConfig): boolean {
  if (dealType === 'RETAIL') {
    return rules.docFeeTaxable;
  } else {
    switch (rules.leaseRules.docFeeTaxability) {
      case 'ALWAYS':
        return true;
      case 'FOLLOW_RETAIL_RULE':
        return rules.docFeeTaxable;
      case 'NEVER':
        return false;
      case 'ONLY_UPFRONT':
        return true; // Taxable, but only upfront (handled in lease logic)
      default:
        return false;
    }
  }
}

// ============================================================================
// REBATE TAXABILITY INTERPRETER
// ============================================================================

/**
 * Determines if a rebate is taxable based on state rules
 */
export function isRebateTaxable(
  rebateType: 'MANUFACTURER' | 'DEALER',
  rules: TaxRulesConfig
): boolean {
  const rebateRule = rules.rebates.find((r) => r.appliesTo === rebateType || r.appliesTo === 'ANY');
  return rebateRule?.taxable ?? false;
}

// ============================================================================
// UTILITY: APPLY CAP/FLOOR
// ============================================================================

/**
 * Applies cap and floor to a value
 */
export function applyCapAndFloor(value: number, cap?: number, floor: number = 0): number {
  let result = value;
  if (cap !== undefined) {
    result = Math.min(result, cap);
  }
  result = Math.max(result, floor);
  return result;
}
