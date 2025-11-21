/**
 * DATABASE STORAGE ADAPTER FOR TAX SERVICE
 *
 * Implements TaxStorage interface with database integration.
 * Provides data access layer for tax calculations.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '../../../lib/types';
import type { TaxStorage } from '../services/enhanced-tax.service';
import type {
  Jurisdiction,
  TaxRateBreakdown,
  StateSpecificRules,
  TaxAuditTrail,
} from '../types/enhanced-tax.types';
import { JurisdictionService } from '../services/jurisdiction.service';
import { StateRulesService } from '../services/state-rules.service';
import { taxAuditLog, dealershipSettings } from '../../../../shared/schema';
import { toMoneyString } from '../utils/decimal-calculator';

export class DatabaseTaxStorage implements TaxStorage {
  private jurisdictionService: JurisdictionService;
  private stateRulesService: StateRulesService;

  constructor(private db: Database) {
    this.jurisdictionService = new JurisdictionService(db);
    this.stateRulesService = new StateRulesService(db);
  }

  // ==========================================================================
  // JURISDICTION LOOKUP
  // ==========================================================================

  async getJurisdictionByZip(zipCode: string): Promise<Jurisdiction | null> {
    return await this.jurisdictionService.getJurisdictionByZip(zipCode);
  }

  async getTaxRates(jurisdiction: Jurisdiction): Promise<TaxRateBreakdown> {
    return await this.jurisdictionService.getTaxRates(jurisdiction);
  }

  // ==========================================================================
  // STATE RULES
  // ==========================================================================

  async getStateRules(state: string): Promise<StateSpecificRules | null> {
    return await this.stateRulesService.getStateRules(state);
  }

  async listAllStateRules(): Promise<StateSpecificRules[]> {
    const stateCodes = this.stateRulesService.getAllStateCodes();
    const rules: StateSpecificRules[] = [];

    for (const code of stateCodes) {
      const stateRules = await this.stateRulesService.getStateRules(code);
      if (stateRules) {
        rules.push(stateRules);
      }
    }

    return rules;
  }

  // ==========================================================================
  // AUDIT TRAIL
  // ==========================================================================

  async saveAuditLog(log: TaxAuditTrail): Promise<void> {
    await this.db.insert(taxAuditLog).values({
      calculationId: log.calculationId,
      dealId: log.dealId || null,
      dealershipId: log.dealershipId,
      calculatedBy: log.calculatedBy,
      calculatedAt: log.calculatedAt,
      calculationType: 'COMPLETE_DEAL',
      inputs: log.inputs as unknown,
      outputs: log.outputs as unknown,
      rulesApplied: log.rulesApplied as unknown,
      engineVersion: log.engineVersion,
      stateRulesVersion: log.stateRulesVersion,
      validationPassed: true,
      validationErrors: [],
    });
  }

  async getAuditLog(dealId: string): Promise<TaxAuditTrail[]> {
    const results = await this.db
      .select()
      .from(taxAuditLog)
      .where(eq(taxAuditLog.dealId, dealId))
      .orderBy(taxAuditLog.calculatedAt);

    return results.map((row) => ({
      calculationId: row.calculationId,
      dealId: row.dealId || undefined,
      dealershipId: row.dealershipId,
      calculatedBy: row.calculatedBy,
      calculatedAt: row.calculatedAt,
      inputs: row.inputs as unknown,
      outputs: row.outputs as unknown,
      rulesApplied: row.rulesApplied as unknown,
      engineVersion: row.engineVersion,
      stateRulesVersion: row.stateRulesVersion,
    }));
  }

  // ==========================================================================
  // DEALERSHIP SETTINGS
  // ==========================================================================

  async getDealershipDocFee(dealershipId: string): Promise<string> {
    const results = await this.db
      .select()
      .from(dealershipSettings)
      .where(eq(dealershipSettings.dealershipId, dealershipId))
      .limit(1);

    if (results.length === 0) {
      // Return default doc fee
      return '299.00';
    }

    const docFee = results[0].docFee;
    return toMoneyString(docFee);
  }
}
