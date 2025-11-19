/**
 * LOCAL TAX RATE UPDATE SERVICE
 *
 * Handles monthly/quarterly updates to local tax rates from external sources.
 * Supports bulk imports, rate versioning, and automatic cache invalidation.
 *
 * Features:
 * - Import rates from CSV/JSON files
 * - Track rate changes over time
 * - End-date old rates when new rates are imported
 * - Bulk update operations
 * - Validate rate data before import
 * - Clear cache after updates
 */

import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  localTaxRates,
  zipToLocalTaxRates,
  LocalTaxRate,
  ZipToLocalTaxRate,
} from "../shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface TaxRateImportData {
  stateCode: string;
  jurisdictions: JurisdictionImportData[];
  metadata?: {
    version?: string;
    effectiveDate?: string;
    source?: string;
    notes?: string;
  };
}

export interface JurisdictionImportData {
  jurisdictionType: "STATE" | "COUNTY" | "CITY" | "SPECIAL_DISTRICT";
  stateCode: string;
  countyName?: string;
  countyFips?: string;
  cityName?: string;
  districtName?: string;
  taxRate: number;
  effectiveDate: string; // ISO date
  zipCodes?: string[]; // ZIPs where this rate applies
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

export interface RateChangeLog {
  zipCode: string;
  stateCode: string;
  oldRate: number;
  newRate: number;
  changeDate: Date;
  reason: string;
}

// ============================================================================
// IMPORT/UPDATE FUNCTIONS
// ============================================================================

/**
 * Import tax rates from structured data
 * Ends old rates and creates new ones with proper versioning
 */
export async function importTaxRates(
  data: TaxRateImportData
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Validate data
    const validation = validateImportData(data);
    if (!validation.valid) {
      result.success = false;
      result.errors.push(...validation.errors);
      return result;
    }

    // Process each jurisdiction
    for (const jurisdiction of data.jurisdictions) {
      try {
        const effectiveDate = new Date(jurisdiction.effectiveDate);

        // Check if rate already exists
        const existing = await db
          .select()
          .from(localTaxRates)
          .where(
            and(
              eq(localTaxRates.stateCode, jurisdiction.stateCode),
              eq(localTaxRates.jurisdictionType, jurisdiction.jurisdictionType),
              jurisdiction.countyFips
                ? eq(localTaxRates.countyFips, jurisdiction.countyFips)
                : sql`1=1`,
              jurisdiction.cityName
                ? eq(localTaxRates.cityName, jurisdiction.cityName)
                : sql`1=1`,
              isNull(localTaxRates.endDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          const existingRate = existing[0];
          const oldRate = parseFloat(existingRate.taxRate);
          const newRate = jurisdiction.taxRate;

          // Check if rate actually changed
          if (Math.abs(oldRate - newRate) < 0.0001) {
            result.skipped++;
            continue;
          }

          // End the old rate
          await db
            .update(localTaxRates)
            .set({ endDate: new Date() })
            .where(eq(localTaxRates.id, existingRate.id));

          result.updated++;
        }

        // Create new rate record
        const [newRate] = await db
          .insert(localTaxRates)
          .values({
            stateCode: jurisdiction.stateCode,
            jurisdictionType: jurisdiction.jurisdictionType,
            countyName: jurisdiction.countyName || null,
            countyFips: jurisdiction.countyFips || null,
            cityName: jurisdiction.cityName || null,
            specialDistrictName: jurisdiction.districtName || null,
            taxRate: jurisdiction.taxRate.toString(),
            effectiveDate,
            endDate: null,
          })
          .returning();

        // Update ZIP mappings if provided
        if (jurisdiction.zipCodes && jurisdiction.zipCodes.length > 0) {
          await updateZipMappings(
            jurisdiction.zipCodes,
            jurisdiction.stateCode,
            newRate.id
          );
        }

        result.imported++;
      } catch (error) {
        result.errors.push(
          `Error importing ${jurisdiction.jurisdictionType} ${jurisdiction.cityName || jurisdiction.countyName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Clear cache after import
    if (result.imported > 0 || result.updated > 0) {
      await clearRateCache();
      result.warnings.push(
        "Cache cleared. New rates will be reflected in next calculation."
      );
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

/**
 * Update ZIP code mappings for a jurisdiction
 */
async function updateZipMappings(
  zipCodes: string[],
  stateCode: string,
  jurisdictionId: string
): Promise<void> {
  for (const zipCode of zipCodes) {
    try {
      // Check if ZIP mapping exists
      const existing = await db
        .select()
        .from(zipToLocalTaxRates)
        .where(
          and(
            eq(zipToLocalTaxRates.zipCode, zipCode),
            eq(zipToLocalTaxRates.stateCode, stateCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing mapping
        const currentIds = (existing[0].taxRateIds as string[]) || [];
        if (!currentIds.includes(jurisdictionId)) {
          await db
            .update(zipToLocalTaxRates)
            .set({
              taxRateIds: [...currentIds, jurisdictionId] as any,
              lastUpdated: new Date(),
            })
            .where(eq(zipToLocalTaxRates.id, existing[0].id));
        }
      } else {
        // Create new mapping
        await db.insert(zipToLocalTaxRates).values({
          zipCode,
          stateCode,
          taxRateIds: [jurisdictionId] as any,
          countyFips: null,
          countyName: "",
          cityName: null,
          combinedLocalRate: "0",
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      console.error(`Error updating ZIP mapping for ${zipCode}:`, error);
    }
  }
}

/**
 * Validate import data structure
 */
function validateImportData(data: TaxRateImportData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.stateCode || data.stateCode.length !== 2) {
    errors.push("Invalid or missing state code");
  }

  if (!data.jurisdictions || data.jurisdictions.length === 0) {
    errors.push("No jurisdictions provided");
  }

  for (const [index, jurisdiction] of data.jurisdictions.entries()) {
    if (!jurisdiction.stateCode || jurisdiction.stateCode.length !== 2) {
      errors.push(`Jurisdiction ${index}: Invalid state code`);
    }

    if (!jurisdiction.jurisdictionType) {
      errors.push(`Jurisdiction ${index}: Missing jurisdiction type`);
    }

    if (
      typeof jurisdiction.taxRate !== "number" ||
      jurisdiction.taxRate < 0 ||
      jurisdiction.taxRate > 1
    ) {
      errors.push(
        `Jurisdiction ${index}: Invalid tax rate (must be 0-1 decimal)`
      );
    }

    if (!jurisdiction.effectiveDate) {
      errors.push(`Jurisdiction ${index}: Missing effective date`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clear local tax rate cache
 * Call this after updating rates
 */
export async function clearRateCache(): Promise<void> {
  // Import the cache instance from local-tax-service
  const { clearCache } = await import("./local-tax-service");
  clearCache();
}

/**
 * Export current rates to JSON format
 * Useful for backups and rate comparison
 */
export async function exportCurrentRates(
  stateCode?: string
): Promise<TaxRateImportData[]> {
  try {
    const query = stateCode
      ? db
          .select()
          .from(localTaxRates)
          .where(
            and(
              eq(localTaxRates.stateCode, stateCode),
              isNull(localTaxRates.endDate)
            )
          )
      : db.select().from(localTaxRates).where(isNull(localTaxRates.endDate));

    const rates = await query;

    // Group by state
    const ratesByState = new Map<string, LocalTaxRate[]>();
    for (const rate of rates) {
      const existing = ratesByState.get(rate.stateCode) || [];
      existing.push(rate);
      ratesByState.set(rate.stateCode, existing);
    }

    // Convert to export format
    const exports: TaxRateImportData[] = [];
    for (const [state, stateRates] of ratesByState.entries()) {
      exports.push({
        stateCode: state,
        jurisdictions: stateRates.map((rate) => ({
          jurisdictionType: rate.jurisdictionType as any,
          stateCode: rate.stateCode,
          countyName: rate.countyName || undefined,
          countyFips: rate.countyFips || undefined,
          cityName: rate.cityName || undefined,
          districtName: rate.specialDistrictName || undefined,
          taxRate: parseFloat(rate.taxRate),
          effectiveDate: rate.effectiveDate.toISOString(),
        })),
        metadata: {
          version: "1.0",
          effectiveDate: new Date().toISOString(),
          source: "database_export",
          notes: `Exported from database on ${new Date().toISOString()}`,
        },
      });
    }

    return exports;
  } catch (error) {
    console.error("Error exporting rates:", error);
    throw error;
  }
}

/**
 * Get rate change history for a ZIP code
 */
export async function getRateChangeHistory(
  zipCode: string
): Promise<RateChangeLog[]> {
  try {
    // Get ZIP mapping
    const zipMapping = await db
      .select()
      .from(zipToLocalTaxRates)
      .where(eq(zipToLocalTaxRates.zipCode, zipCode))
      .limit(1);

    if (zipMapping.length === 0) {
      return [];
    }

    const stateCode = zipMapping[0].stateCode;

    // Get all historical rates for this ZIP's jurisdictions
    const rates = await db
      .select()
      .from(localTaxRates)
      .where(eq(localTaxRates.stateCode, stateCode))
      .orderBy(localTaxRates.effectiveDate);

    // Build change log
    const changes: RateChangeLog[] = [];
    let previousRate = 0;

    for (const rate of rates) {
      const currentRate = parseFloat(rate.taxRate);
      if (previousRate !== currentRate && previousRate > 0) {
        changes.push({
          zipCode,
          stateCode,
          oldRate: previousRate,
          newRate: currentRate,
          changeDate: rate.effectiveDate,
          reason: "Rate update",
        });
      }
      previousRate = currentRate;
    }

    return changes;
  } catch (error) {
    console.error("Error getting rate history:", error);
    return [];
  }
}

/**
 * Schedule periodic rate updates
 * Call this function monthly/quarterly to check for rate updates
 */
export async function scheduleRateUpdate(
  updateInterval: "monthly" | "quarterly" = "quarterly"
): Promise<void> {
  console.log(`[LocalTaxUpdateService] Scheduled ${updateInterval} rate updates`);

  // This function would be called by a cron job or scheduler
  // In production, integrate with a task queue or scheduler service

  // Example: Check for updates from external data sources
  // - Download latest rates from CDTFA (California), DOR (Georgia), etc.
  // - Parse and validate the data
  // - Call importTaxRates() to update the database
  // - Send notification email to admins about rate changes

  // TODO: Implement actual update logic based on data sources
}
