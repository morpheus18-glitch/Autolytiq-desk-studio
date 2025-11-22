/**
 * JURISDICTION SERVICE
 *
 * Manages tax jurisdiction lookup and tax rate retrieval.
 * Integrates with database for accurate, up-to-date jurisdiction data.
 */

import { eq, and, isNull, lte, or, gte } from 'drizzle-orm';
import type { Database } from '../../../lib/types';
import type {
  Jurisdiction,
  TaxRateBreakdown,
} from '../types/enhanced-tax.types';
import { JurisdictionNotFoundError } from '../types/enhanced-tax.types';
import { taxJurisdictions, zipCodeLookup } from '../../../../shared/schema';
import { add, toMoneyString } from '../utils/decimal-calculator';

export class JurisdictionService {
  constructor(private db: Database) {}

  /**
   * Lookup jurisdiction by ZIP code
   * Returns most recent active jurisdiction for the ZIP
   */
  async getJurisdictionByZip(zipCode: string): Promise<Jurisdiction | null> {
    // Clean ZIP code (remove +4 if present)
    const cleanZip = zipCode.split('-')[0];

    // Query for jurisdiction
    const now = new Date();
    const results = await this.db
      .select()
      .from(taxJurisdictions)
      .where(
        and(
          eq(taxJurisdictions.zipCode, cleanZip),
          lte(taxJurisdictions.effectiveDate, now),
          or(
            isNull(taxJurisdictions.endDate),
            gte(taxJurisdictions.endDate, now)
          )
        )
      )
      .orderBy(taxJurisdictions.effectiveDate)
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];

    return {
      id: row.id,
      zipCode: row.zipCode,
      state: row.state,
      county: row.county || undefined,
      city: row.city || undefined,
      specialDistrict: row.specialDistrict || undefined,
      effectiveDate: row.effectiveDate,
      endDate: row.endDate || undefined,
      source: row.source || undefined,
      lastVerified: row.lastVerified || undefined,
    };
  }

  /**
   * Get tax rate breakdown for a jurisdiction
   */
  async getTaxRates(jurisdiction: Jurisdiction): Promise<TaxRateBreakdown> {
    // Query jurisdiction from database to get rates
    const results = await this.db
      .select()
      .from(taxJurisdictions)
      .where(eq(taxJurisdictions.id, jurisdiction.id))
      .limit(1);

    if (results.length === 0) {
      throw new JurisdictionNotFoundError(jurisdiction.zipCode);
    }

    const row = results[0];

    // Convert rates from decimal to string
    const stateRate = toMoneyString(row.stateTaxRate);
    const countyRate = toMoneyString(row.countyTaxRate);
    const cityRate = toMoneyString(row.cityTaxRate);
    const specialDistrictRate = toMoneyString(row.specialDistrictTaxRate);

    // Calculate total rate
    const totalRate = add(stateRate, countyRate, cityRate, specialDistrictRate);

    return {
      stateRate,
      countyRate,
      cityRate,
      specialDistrictRate,
      totalRate,
      effectiveDate: row.effectiveDate,
    };
  }

  /**
   * Get jurisdiction by state, county, and city
   * Useful for manual jurisdiction selection
   */
  async getJurisdictionByLocation(
    state: string,
    county?: string,
    city?: string
  ): Promise<Jurisdiction | null> {
    const now = new Date();

    const conditions = [
      eq(taxJurisdictions.state, state),
      lte(taxJurisdictions.effectiveDate, now),
      or(
        isNull(taxJurisdictions.endDate),
        gte(taxJurisdictions.endDate, now)
      ),
    ];

    if (county) {
      conditions.push(eq(taxJurisdictions.county, county));
    }

    if (city) {
      conditions.push(eq(taxJurisdictions.city, city));
    }

    const results = await this.db
      .select()
      .from(taxJurisdictions)
      .where(and(...conditions))
      .orderBy(taxJurisdictions.effectiveDate)
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];

    return {
      id: row.id,
      zipCode: row.zipCode,
      state: row.state,
      county: row.county || undefined,
      city: row.city || undefined,
      specialDistrict: row.specialDistrict || undefined,
      effectiveDate: row.effectiveDate,
      endDate: row.endDate || undefined,
      source: row.source || undefined,
      lastVerified: row.lastVerified || undefined,
    };
  }

  /**
   * List all jurisdictions for a state
   * Useful for administrative purposes
   */
  async listJurisdictionsByState(state: string): Promise<Jurisdiction[]> {
    const now = new Date();

    const results = await this.db
      .select()
      .from(taxJurisdictions)
      .where(
        and(
          eq(taxJurisdictions.state, state),
          lte(taxJurisdictions.effectiveDate, now),
          or(
            isNull(taxJurisdictions.endDate),
            gte(taxJurisdictions.endDate, now)
          )
        )
      )
      .orderBy(taxJurisdictions.county, taxJurisdictions.city);

    return results.map((row) => ({
      id: row.id,
      zipCode: row.zipCode,
      state: row.state,
      county: row.county || undefined,
      city: row.city || undefined,
      specialDistrict: row.specialDistrict || undefined,
      effectiveDate: row.effectiveDate,
      endDate: row.endDate || undefined,
      source: row.source || undefined,
      lastVerified: row.lastVerified || undefined,
    }));
  }

  /**
   * Save or update jurisdiction
   * Administrative function for managing jurisdiction data
   */
  async saveJurisdiction(jurisdiction: Omit<Jurisdiction, 'id'>): Promise<Jurisdiction> {
    // Check if jurisdiction already exists for this ZIP
    const existing = await this.getJurisdictionByZip(jurisdiction.zipCode);

    if (existing) {
      // End date the existing jurisdiction
      await this.db
        .update(taxJurisdictions)
        .set({ endDate: new Date() })
        .where(eq(taxJurisdictions.id, existing.id));
    }

    // Insert new jurisdiction (rates need to be set separately)
    const [inserted] = await this.db
      .insert(taxJurisdictions)
      .values({
        zipCode: jurisdiction.zipCode,
        state: jurisdiction.state,
        county: jurisdiction.county || null,
        city: jurisdiction.city || null,
        specialDistrict: jurisdiction.specialDistrict || null,
        effectiveDate: jurisdiction.effectiveDate,
        endDate: jurisdiction.endDate || null,
        source: jurisdiction.source || null,
        lastVerified: jurisdiction.lastVerified || null,
        // Rates initialized to zero, must be updated separately
        stateTaxRate: '0',
        countyTaxRate: '0',
        cityTaxRate: '0',
        specialDistrictTaxRate: '0',
      })
      .returning();

    return {
      id: inserted.id,
      zipCode: inserted.zipCode,
      state: inserted.state,
      county: inserted.county || undefined,
      city: inserted.city || undefined,
      specialDistrict: inserted.specialDistrict || undefined,
      effectiveDate: inserted.effectiveDate,
      endDate: inserted.endDate || undefined,
      source: inserted.source || undefined,
      lastVerified: inserted.lastVerified || undefined,
    };
  }

  /**
   * Update tax rates for a jurisdiction
   * Administrative function for managing tax rate data
   */
  async updateTaxRates(
    jurisdictionId: string,
    rates: {
      stateRate: string;
      countyRate: string;
      cityRate: string;
      specialDistrictRate: string;
    }
  ): Promise<void> {
    await this.db
      .update(taxJurisdictions)
      .set({
        stateTaxRate: rates.stateRate,
        countyTaxRate: rates.countyRate,
        cityTaxRate: rates.cityRate,
        specialDistrictTaxRate: rates.specialDistrictRate,
        updatedAt: new Date(),
      })
      .where(eq(taxJurisdictions.id, jurisdictionId));
  }

  /**
   * Verify jurisdiction data is current
   * Returns true if data was verified within the last 90 days
   */
  isJurisdictionCurrent(jurisdiction: Jurisdiction): boolean {
    if (!jurisdiction.lastVerified) {
      return false;
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return jurisdiction.lastVerified >= ninetyDaysAgo;
  }

  /**
   * Mark jurisdiction as verified
   * Should be called after manual verification of rates
   */
  async markJurisdictionVerified(jurisdictionId: string): Promise<void> {
    await this.db
      .update(taxJurisdictions)
      .set({
        lastVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(taxJurisdictions.id, jurisdictionId));
  }

  /**
   * Get full jurisdiction information for a ZIP code
   * Returns detailed breakdown of all tax jurisdictions that apply
   */
  async getTaxJurisdictionInfo(zipCode: string): Promise<{
    zipCode: string;
    stateCode: string;
    countyFips: string | null;
    countyName: string;
    cityName: string | null;
    applicableJurisdictions: Array<{
      id: string;
      type: string;
      name: string;
      rate: number;
      effectiveDate: Date;
      endDate: Date | null;
    }>;
  } | null> {
    const cleanZip = zipCode.split('-')[0];
    const now = new Date();

    const results = await this.db
      .select()
      .from(taxJurisdictions)
      .where(
        and(
          eq(taxJurisdictions.zipCode, cleanZip),
          lte(taxJurisdictions.effectiveDate, now),
          or(
            isNull(taxJurisdictions.endDate),
            gte(taxJurisdictions.endDate, now)
          )
        )
      )
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    const applicableJurisdictions = [];

    // Add state jurisdiction
    if (row.stateTaxRate && parseFloat(row.stateTaxRate) > 0) {
      applicableJurisdictions.push({
        id: `${row.id}-state`,
        type: 'STATE',
        name: row.state,
        rate: parseFloat(row.stateTaxRate),
        effectiveDate: row.effectiveDate,
        endDate: row.endDate,
      });
    }

    // Add county jurisdiction
    if (row.county && row.countyTaxRate && parseFloat(row.countyTaxRate) > 0) {
      applicableJurisdictions.push({
        id: `${row.id}-county`,
        type: 'COUNTY',
        name: row.county,
        rate: parseFloat(row.countyTaxRate),
        effectiveDate: row.effectiveDate,
        endDate: row.endDate,
      });
    }

    // Add city jurisdiction
    if (row.city && row.cityTaxRate && parseFloat(row.cityTaxRate) > 0) {
      applicableJurisdictions.push({
        id: `${row.id}-city`,
        type: 'CITY',
        name: row.city,
        rate: parseFloat(row.cityTaxRate),
        effectiveDate: row.effectiveDate,
        endDate: row.endDate,
      });
    }

    // Add special district jurisdiction
    if (
      row.specialDistrict &&
      row.specialDistrictTaxRate &&
      parseFloat(row.specialDistrictTaxRate) > 0
    ) {
      applicableJurisdictions.push({
        id: `${row.id}-district`,
        type: 'SPECIAL_DISTRICT',
        name: row.specialDistrict,
        rate: parseFloat(row.specialDistrictTaxRate),
        effectiveDate: row.effectiveDate,
        endDate: row.endDate,
      });
    }

    return {
      zipCode: row.zipCode,
      stateCode: row.state,
      countyFips: null, // Not stored in current schema
      countyName: row.county || '',
      cityName: row.city,
      applicableJurisdictions,
    };
  }

  /**
   * Get jurisdiction breakdown for a ZIP code
   * Returns structured breakdown of county, city, and special district rates
   */
  async getJurisdictionBreakdown(zipCode: string): Promise<{
    county: { name: string; rate: number } | null;
    city: { name: string; rate: number } | null;
    specialDistricts: { name: string; rate: number }[];
    combinedLocalRate: number;
  } | null> {
    const info = await this.getTaxJurisdictionInfo(zipCode);
    if (!info) return null;

    const county = info.applicableJurisdictions.find((j) => j.type === 'COUNTY');
    const city = info.applicableJurisdictions.find((j) => j.type === 'CITY');
    const specialDistricts = info.applicableJurisdictions.filter(
      (j) => j.type === 'SPECIAL_DISTRICT'
    );

    const combinedLocalRate =
      (county?.rate || 0) +
      (city?.rate || 0) +
      specialDistricts.reduce((sum, d) => sum + d.rate, 0);

    return {
      county: county ? { name: county.name, rate: county.rate } : null,
      city: city ? { name: city.name, rate: city.rate } : null,
      specialDistricts: specialDistricts.map((d) => ({
        name: d.name,
        rate: d.rate,
      })),
      combinedLocalRate,
    };
  }
}
