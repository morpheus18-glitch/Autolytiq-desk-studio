/**
 * STATE RULES SERVICE
 *
 * Manages state-specific tax rules from database and autoTaxEngine.
 * Provides a unified interface for accessing state tax rules with fallback
 * to the comprehensive autoTaxEngine rules.
 */

import { eq, and, isNull, lte, or, gte } from 'drizzle-orm';
import type { Database } from '../../../lib/types';
import type { StateSpecificRules } from '../types/enhanced-tax.types';
import { UnsupportedStateError } from '../types/enhanced-tax.types';
import { stateTaxRules } from '../../../../shared/schema';
import { getRulesForState, STATE_RULES_MAP } from '../../../../shared/autoTaxEngine/rules';
import type { TaxRulesConfig } from '../../../../shared/autoTaxEngine/types';
import { toMoneyString } from '../utils/decimal-calculator';

export class StateRulesService {
  constructor(private db: Database) {}

  /**
   * Get state-specific tax rules
   * First checks database, then falls back to autoTaxEngine rules
   */
  async getStateRules(stateCode: string): Promise<StateSpecificRules | null> {
    // Try database first
    const dbRules = await this.getStateRulesFromDb(stateCode);
    if (dbRules) {
      return dbRules;
    }

    // Fallback to autoTaxEngine rules
    return this.getStateRulesFromEngine(stateCode);
  }

  /**
   * Get state rules from database
   */
  private async getStateRulesFromDb(stateCode: string): Promise<StateSpecificRules | null> {
    const now = new Date();

    const results = await this.db
      .select()
      .from(stateTaxRules)
      .where(
        and(
          eq(stateTaxRules.stateCode, stateCode.toUpperCase()),
          lte(stateTaxRules.effectiveDate, now),
          or(
            isNull(stateTaxRules.endDate),
            gte(stateTaxRules.endDate, now)
          )
        )
      )
      .orderBy(stateTaxRules.effectiveDate)
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];

    return {
      stateCode: row.stateCode,
      allowsTradeInCredit: row.allowsTradeInCredit,
      tradeInCreditCap: row.tradeInCreditCap ? toMoneyString(row.tradeInCreditCap) : undefined,
      tradeInCreditPercent: row.tradeInCreditPercent ? toMoneyString(row.tradeInCreditPercent) : undefined,
      docFeeMax: row.docFeeMax ? toMoneyString(row.docFeeMax) : undefined,
      docFeeCapped: row.docFeeCapped,
      docFeeTaxable: row.docFeeTaxable,
      registrationBased: row.registrationBased as 'vehicleValue' | 'vehicleWeight' | 'flat' | 'custom',
      titleFee: toMoneyString(row.titleFee),
      titleFeeTaxable: row.titleFeeTaxable,
      serviceContractsTaxable: row.serviceContractsTaxable,
      gapTaxable: row.gapTaxable,
      accessoriesTaxable: row.accessoriesTaxable,
      manufacturerRebateTaxable: row.manufacturerRebateTaxable,
      dealerRebateTaxable: row.dealerRebateTaxable,
      specialScheme: row.specialScheme as 'TAVT' | 'HUT' | 'PRIVILEGE_TAX' | 'STANDARD' | undefined,
      notes: row.notes || undefined,
      lastUpdated: row.updatedAt,
      version: row.version,
    };
  }

  /**
   * Get state rules from autoTaxEngine
   * Converts autoTaxEngine TaxRulesConfig to StateSpecificRules format
   */
  private getStateRulesFromEngine(stateCode: string): StateSpecificRules | null {
    const engineRules = getRulesForState(stateCode);
    if (!engineRules) {
      return null;
    }

    return this.convertEngineRulesToStateRules(engineRules);
  }

  /**
   * Convert autoTaxEngine TaxRulesConfig to StateSpecificRules
   */
  private convertEngineRulesToStateRules(engineRules: TaxRulesConfig): StateSpecificRules {
    // Parse trade-in policy
    let allowsTradeInCredit = false;
    let tradeInCreditCap: string | undefined;
    let tradeInCreditPercent: string | undefined;

    switch (engineRules.tradeInPolicy.type) {
      case 'FULL':
        allowsTradeInCredit = true;
        break;
      case 'CAPPED':
        allowsTradeInCredit = true;
        tradeInCreditCap = toMoneyString(engineRules.tradeInPolicy.capAmount || 0);
        break;
      case 'PERCENT':
        allowsTradeInCredit = true;
        tradeInCreditPercent = toMoneyString(engineRules.tradeInPolicy.percent || 0);
        break;
      case 'NONE':
        allowsTradeInCredit = false;
        break;
    }

    // Parse fee taxability
    const docFeeTaxable = engineRules.docFeeTaxable;
    const serviceContractsTaxable = engineRules.taxOnServiceContracts;
    const gapTaxable = engineRules.taxOnGap;
    const accessoriesTaxable = engineRules.taxOnAccessories;

    // Parse rebate taxability
    const manufacturerRebate = engineRules.rebates.find((r) => r.appliesTo === 'MANUFACTURER');
    const dealerRebate = engineRules.rebates.find((r) => r.appliesTo === 'DEALER');

    const manufacturerRebateTaxable = manufacturerRebate?.taxable || false;
    const dealerRebateTaxable = dealerRebate?.taxable || true;

    // Map special schemes
    let specialScheme: 'TAVT' | 'HUT' | 'PRIVILEGE_TAX' | 'STANDARD' | undefined;
    switch (engineRules.vehicleTaxScheme) {
      case 'SPECIAL_TAVT':
        specialScheme = 'TAVT';
        break;
      case 'SPECIAL_HUT':
        specialScheme = 'HUT';
        break;
      case 'DMV_PRIVILEGE_TAX':
        specialScheme = 'PRIVILEGE_TAX';
        break;
      default:
        specialScheme = 'STANDARD';
    }

    return {
      stateCode: engineRules.stateCode,
      allowsTradeInCredit,
      tradeInCreditCap,
      tradeInCreditPercent,
      docFeeMax: undefined, // Not in engine rules
      docFeeCapped: false, // Not in engine rules
      docFeeTaxable,
      registrationBased: 'flat', // Not in engine rules
      titleFee: '0.00', // Not in engine rules
      titleFeeTaxable: false,
      serviceContractsTaxable,
      gapTaxable,
      accessoriesTaxable,
      manufacturerRebateTaxable,
      dealerRebateTaxable,
      specialScheme,
      notes: engineRules.extras?.notes as string | undefined,
      lastUpdated: new Date(),
      version: engineRules.version,
    };
  }

  /**
   * List all available state codes
   */
  getAllStateCodes(): string[] {
    return Object.keys(STATE_RULES_MAP);
  }

  /**
   * Check if a state is supported
   */
  async isStateSupported(stateCode: string): Promise<boolean> {
    const rules = await this.getStateRules(stateCode);
    return rules !== null;
  }

  /**
   * Save or update state rules in database
   * Administrative function for managing state tax rules
   */
  async saveStateRules(rules: Omit<StateSpecificRules, 'lastUpdated'>): Promise<StateSpecificRules> {
    // Check if rules exist
    const existing = await this.getStateRulesFromDb(rules.stateCode);

    if (existing) {
      // End date the existing rules
      await this.db
        .update(stateTaxRules)
        .set({ endDate: new Date() })
        .where(eq(stateTaxRules.stateCode, rules.stateCode));
    }

    // Insert new rules
    const [inserted] = await this.db
      .insert(stateTaxRules)
      .values({
        stateCode: rules.stateCode,
        stateName: this.getStateName(rules.stateCode),
        version: rules.version,
        effectiveDate: new Date(),
        allowsTradeInCredit: rules.allowsTradeInCredit,
        tradeInCreditCap: rules.tradeInCreditCap || null,
        tradeInCreditPercent: rules.tradeInCreditPercent || null,
        docFeeMax: rules.docFeeMax || null,
        docFeeCapped: rules.docFeeCapped,
        docFeeTaxable: rules.docFeeTaxable,
        registrationBased: rules.registrationBased,
        titleFee: rules.titleFee,
        titleFeeTaxable: rules.titleFeeTaxable,
        serviceContractsTaxable: rules.serviceContractsTaxable,
        gapTaxable: rules.gapTaxable,
        accessoriesTaxable: rules.accessoriesTaxable,
        manufacturerRebateTaxable: rules.manufacturerRebateTaxable,
        dealerRebateTaxable: rules.dealerRebateTaxable,
        specialScheme: rules.specialScheme || null,
        notes: rules.notes || null,
      })
      .returning();

    return {
      stateCode: inserted.stateCode,
      allowsTradeInCredit: inserted.allowsTradeInCredit,
      tradeInCreditCap: inserted.tradeInCreditCap ? toMoneyString(inserted.tradeInCreditCap) : undefined,
      tradeInCreditPercent: inserted.tradeInCreditPercent ? toMoneyString(inserted.tradeInCreditPercent) : undefined,
      docFeeMax: inserted.docFeeMax ? toMoneyString(inserted.docFeeMax) : undefined,
      docFeeCapped: inserted.docFeeCapped,
      docFeeTaxable: inserted.docFeeTaxable,
      registrationBased: inserted.registrationBased as 'vehicleValue' | 'vehicleWeight' | 'flat' | 'custom',
      titleFee: toMoneyString(inserted.titleFee),
      titleFeeTaxable: inserted.titleFeeTaxable,
      serviceContractsTaxable: inserted.serviceContractsTaxable,
      gapTaxable: inserted.gapTaxable,
      accessoriesTaxable: inserted.accessoriesTaxable,
      manufacturerRebateTaxable: inserted.manufacturerRebateTaxable,
      dealerRebateTaxable: inserted.dealerRebateTaxable,
      specialScheme: inserted.specialScheme as 'TAVT' | 'HUT' | 'PRIVILEGE_TAX' | 'STANDARD' | undefined,
      notes: inserted.notes || undefined,
      lastUpdated: inserted.updatedAt,
      version: inserted.version,
    };
  }

  /**
   * Get state name from code
   */
  private getStateName(stateCode: string): string {
    const stateNames: Record<string, string> = {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
      CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
      FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
      IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
      KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
      MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
      MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
      NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
      NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
      OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
      SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
      VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
      WI: 'Wisconsin', WY: 'Wyoming',
    };

    return stateNames[stateCode.toUpperCase()] || stateCode;
  }
}
