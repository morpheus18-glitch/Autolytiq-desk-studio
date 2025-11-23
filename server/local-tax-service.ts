/**
 * LOCAL TAX RATE SERVICE
 *
 * Production-grade service for looking up local tax rates by ZIP code.
 * Integrates with AutoTaxEngine for STATE_PLUS_LOCAL vehicle tax schemes.
 *
 * Features:
 * - Fast ZIP code to local rate lookup
 * - Rate stacking (state + county + city + special districts)
 * - In-memory caching with 24-hour TTL
 * - Fallback to state average for missing ZIPs
 * - Detailed jurisdiction breakdowns
 * - Missing ZIP logging for data population
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

export interface LocalTaxRateInfo {
  zipCode: string;
  stateCode: string;
  countyName: string;
  cityName: string | null;
  stateTaxRate: number;
  countyRate: number;
  cityRate: number;
  specialDistrictRate: number;
  combinedLocalRate: number;
  totalRate: number;
  breakdown: TaxRateBreakdown[];
  source: "database" | "fallback";
}

export interface TaxRateBreakdown {
  jurisdictionType: "STATE" | "COUNTY" | "CITY" | "SPECIAL_DISTRICT";
  name: string;
  rate: number;
}

export interface JurisdictionInfo {
  zipCode: string;
  stateCode: string;
  countyFips: string | null;
  countyName: string;
  cityName: string | null;
  applicableJurisdictions: {
    id: string;
    type: string;
    name: string;
    rate: number;
    effectiveDate: Date;
    endDate: Date | null;
  }[];
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LocalTaxCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    // 24 hours default
    this.ttlMs = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const taxRateCache = new LocalTaxCache();

// ============================================================================
// STATE AVERAGE FALLBACKS
// ============================================================================

// State average local rates (used when ZIP not found)
// These should be updated periodically from real data
const STATE_AVERAGE_LOCAL_RATES: Record<string, number> = {
  CA: 0.0125, // California average local: 1.25%
  TX: 0.0195, // Texas average local: 1.95%
  FL: 0.0100, // Florida average local: 1.00%
  NY: 0.0450, // New York average local: 4.50%
  PA: 0.0100, // Pennsylvania average local: 1.00%
  IL: 0.0250, // Illinois average local: 2.50%
  OH: 0.0225, // Ohio average local: 2.25%
  GA: 0.0300, // Georgia average local: 3.00%
  NC: 0.0225, // North Carolina average local: 2.25%
  MI: 0.0000, // Michigan: STATE_ONLY, no local
};

// State base rates for automotive sales tax
const STATE_BASE_RATES: Record<string, number> = {
  CA: 0.0725, // California state: 7.25%
  TX: 0.0625, // Texas state: 6.25%
  FL: 0.0600, // Florida state: 6.00%
  NY: 0.0400, // New York state: 4.00%
  PA: 0.0600, // Pennsylvania state: 6.00%
  IL: 0.0625, // Illinois state: 6.25%
  OH: 0.0575, // Ohio state: 5.75%
  GA: 0.0400, // Georgia state: 4.00% (TAVT alternative)
  NC: 0.0300, // North Carolina: 3.00% (HUT)
  MI: 0.0600, // Michigan state: 6.00%
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get local tax rate for a ZIP code
 *
 * This is the primary function used by AutoTaxEngine for STATE_PLUS_LOCAL states.
 * Returns combined local rate (county + city + special districts, excluding state).
 *
 * @param zipCode - 5-digit ZIP code
 * @param stateCode - 2-character state code (for validation and fallback)
 * @returns Local tax rate info with full breakdown
 */
export async function getLocalTaxRate(
  zipCode: string,
  stateCode: string
): Promise<LocalTaxRateInfo> {
  // Normalize inputs
  const normalizedZip = zipCode.trim().substring(0, 5);
  const normalizedState = stateCode.trim().toUpperCase();

  // Check cache first
  const cacheKey = `local-tax:${normalizedState}:${normalizedZip}`;
  const cached = taxRateCache.get<LocalTaxRateInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Look up ZIP in database
    const zipData = await db
      .select()
      .from(zipToLocalTaxRates)
      .where(eq(zipToLocalTaxRates.zipCode, normalizedZip))
      .limit(1);

    if (zipData.length === 0) {
      // ZIP not found, use fallback
      console.warn(
        `[LocalTaxService] ZIP ${normalizedZip} not found, using state average for ${normalizedState}`
      );
      const fallback = buildFallbackRate(normalizedZip, normalizedState);
      taxRateCache.set(cacheKey, fallback);
      return fallback;
    }

    const zip = zipData[0];

    // Validate state matches
    if (zip.stateCode !== normalizedState) {
      console.warn(
        `[LocalTaxService] ZIP ${normalizedZip} state mismatch: expected ${normalizedState}, got ${zip.stateCode}`
      );
    }

    // Get detailed rate breakdown from local tax rates table
    const taxRateIds = (zip.taxRateIds as string[]) || [];

    if (taxRateIds.length === 0) {
      // No detailed rates, use pre-calculated combined rate
      const result = buildRateInfoFromZipData(zip, normalizedState);
      taxRateCache.set(cacheKey, result);
      return result;
    }

    // Fetch all applicable tax rates
    const rates = await db
      .select()
      .from(localTaxRates)
      .where(
        and(
          sql`${localTaxRates.id} = ANY(${taxRateIds})`,
          isNull(localTaxRates.endDate) // Only active rates
        )
      );

    const result = buildRateInfoFromRates(
      normalizedZip,
      normalizedState,
      zip,
      rates
    );
    taxRateCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `[LocalTaxService] Error fetching local tax rate for ZIP ${normalizedZip}:`,
      error
    );
    // On error, return fallback
    const fallback = buildFallbackRate(normalizedZip, normalizedState);
    return fallback;
  }
}

/**
 * Get full jurisdiction information for a ZIP code
 *
 * Returns detailed breakdown of all tax jurisdictions that apply to a ZIP code,
 * including jurisdiction IDs, types, names, and effective dates.
 *
 * @param zipCode - 5-digit ZIP code
 * @returns Jurisdiction info with all applicable jurisdictions
 */
export async function getTaxJurisdictionInfo(
  zipCode: string
): Promise<JurisdictionInfo | null> {
  const normalizedZip = zipCode.trim().substring(0, 5);

  try {
    const zipData = await db
      .select()
      .from(zipToLocalTaxRates)
      .where(eq(zipToLocalTaxRates.zipCode, normalizedZip))
      .limit(1);

    if (zipData.length === 0) {
      return null;
    }

    const zip = zipData[0];
    const taxRateIds = (zip.taxRateIds as string[]) || [];

    if (taxRateIds.length === 0) {
      return {
        zipCode: normalizedZip,
        stateCode: zip.stateCode,
        countyFips: zip.countyFips,
        countyName: zip.countyName,
        cityName: zip.cityName,
        applicableJurisdictions: [],
      };
    }

    const rates = await db
      .select()
      .from(localTaxRates)
      .where(
        and(
          sql`${localTaxRates.id} = ANY(${taxRateIds})`,
          isNull(localTaxRates.endDate)
        )
      );

    return {
      zipCode: normalizedZip,
      stateCode: zip.stateCode,
      countyFips: zip.countyFips,
      countyName: zip.countyName,
      cityName: zip.cityName,
      applicableJurisdictions: rates.map((r) => ({
        id: r.id,
        type: r.jurisdictionType,
        name:
          r.jurisdictionType === "COUNTY"
            ? r.countyName || ""
            : r.jurisdictionType === "CITY"
              ? r.cityName || ""
              : r.specialDistrictName || "",
        rate: parseFloat(r.taxRate),
        effectiveDate: r.effectiveDate,
        endDate: r.endDate,
      })),
    };
  } catch (error) {
    console.error(
      `[LocalTaxService] Error fetching jurisdiction info for ZIP ${normalizedZip}:`,
      error
    );
    return null;
  }
}

/**
 * Get jurisdiction breakdown for a ZIP code
 *
 * Returns a structured breakdown of county, city, and special district rates.
 * Useful for displaying itemized tax breakdowns to users.
 *
 * @param zipCode - 5-digit ZIP code
 * @returns Structured breakdown of all jurisdiction rates
 */
export async function getJurisdictionBreakdown(zipCode: string): Promise<{
  county: { name: string; rate: number } | null;
  city: { name: string; rate: number } | null;
  specialDistricts: { name: string; rate: number }[];
  combinedLocalRate: number;
} | null> {
  const info = await getTaxJurisdictionInfo(zipCode);
  if (!info) return null;

  const county = info.applicableJurisdictions.find(
    (j) => j.type === "COUNTY"
  );
  const city = info.applicableJurisdictions.find((j) => j.type === "CITY");
  const specialDistricts = info.applicableJurisdictions.filter(
    (j) => j.type === "SPECIAL_DISTRICT"
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

/**
 * Bulk lookup for multiple ZIP codes
 *
 * Efficiently fetches local tax rates for multiple ZIPs in a single call.
 * Uses caching and batching for performance.
 *
 * @param zipCodes - Array of 5-digit ZIP codes
 * @param stateCode - 2-character state code (for validation)
 * @returns Map of ZIP code to local tax rate info
 */
export async function bulkGetLocalTaxRates(
  zipCodes: string[],
  stateCode: string
): Promise<Map<string, LocalTaxRateInfo>> {
  const results = new Map<string, LocalTaxRateInfo>();

  for (const zip of zipCodes) {
    const rate = await getLocalTaxRate(zip, stateCode);
    results.set(zip, rate);
  }

  return results;
}

/**
 * Search for jurisdictions by city or county name
 *
 * Useful for autocomplete and manual jurisdiction selection.
 *
 * @param query - Search query (city or county name)
 * @param stateCode - 2-character state code (optional filter)
 * @returns Array of matching jurisdictions
 */
export async function searchJurisdictions(
  query: string,
  stateCode?: string
): Promise<ZipToLocalTaxRate[]> {
  const normalizedQuery = query.trim().toLowerCase();

  try {
    const searchCondition = sql`LOWER(${zipToLocalTaxRates.cityName}) LIKE ${`%${normalizedQuery}%`} OR LOWER(${zipToLocalTaxRates.countyName}) LIKE ${`%${normalizedQuery}%`}`;

    const whereCondition = stateCode
      ? and(searchCondition, eq(zipToLocalTaxRates.stateCode, stateCode.toUpperCase()))
      : searchCondition;

    const results = await db
      .select()
      .from(zipToLocalTaxRates)
      .where(whereCondition)
      .limit(50);

    return results;
  } catch (error) {
    console.error(
      `[LocalTaxService] Error searching jurisdictions for query "${query}":`,
      error
    );
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFallbackRate(
  zipCode: string,
  stateCode: string
): LocalTaxRateInfo {
  const stateRate = STATE_BASE_RATES[stateCode] || 0.07;
  const avgLocalRate = STATE_AVERAGE_LOCAL_RATES[stateCode] || 0.01;

  return {
    zipCode,
    stateCode,
    countyName: "Unknown County",
    cityName: null,
    stateTaxRate: stateRate,
    countyRate: avgLocalRate,
    cityRate: 0,
    specialDistrictRate: 0,
    combinedLocalRate: avgLocalRate,
    totalRate: stateRate + avgLocalRate,
    breakdown: [
      { jurisdictionType: "STATE", name: stateCode, rate: stateRate },
      {
        jurisdictionType: "COUNTY",
        name: "Average Local",
        rate: avgLocalRate,
      },
    ],
    source: "fallback",
  };
}

function buildRateInfoFromZipData(
  zip: ZipToLocalTaxRate,
  stateCode: string
): LocalTaxRateInfo {
  const stateRate = STATE_BASE_RATES[stateCode] || 0.07;
  const localRate = parseFloat(zip.combinedLocalRate);

  return {
    zipCode: zip.zipCode,
    stateCode: zip.stateCode,
    countyName: zip.countyName,
    cityName: zip.cityName,
    stateTaxRate: stateRate,
    countyRate: localRate, // Combined as county for simplicity
    cityRate: 0,
    specialDistrictRate: 0,
    combinedLocalRate: localRate,
    totalRate: stateRate + localRate,
    breakdown: [
      { jurisdictionType: "STATE", name: stateCode, rate: stateRate },
      { jurisdictionType: "COUNTY", name: zip.countyName, rate: localRate },
    ],
    source: "database",
  };
}

function buildRateInfoFromRates(
  zipCode: string,
  stateCode: string,
  zip: ZipToLocalTaxRate,
  rates: LocalTaxRate[]
): LocalTaxRateInfo {
  const stateRate = STATE_BASE_RATES[stateCode] || 0.07;

  let countyRate = 0;
  let cityRate = 0;
  let specialDistrictRate = 0;

  const breakdown: TaxRateBreakdown[] = [
    { jurisdictionType: "STATE", name: stateCode, rate: stateRate },
  ];

  for (const rate of rates) {
    const rateValue = parseFloat(rate.taxRate);

    if (rate.jurisdictionType === "COUNTY") {
      countyRate += rateValue;
      breakdown.push({
        jurisdictionType: "COUNTY",
        name: rate.countyName || "County",
        rate: rateValue,
      });
    } else if (rate.jurisdictionType === "CITY") {
      cityRate += rateValue;
      breakdown.push({
        jurisdictionType: "CITY",
        name: rate.cityName || "City",
        rate: rateValue,
      });
    } else if (rate.jurisdictionType === "SPECIAL_DISTRICT") {
      specialDistrictRate += rateValue;
      breakdown.push({
        jurisdictionType: "SPECIAL_DISTRICT",
        name: rate.specialDistrictName || "Special District",
        rate: rateValue,
      });
    }
  }

  const combinedLocalRate = countyRate + cityRate + specialDistrictRate;

  return {
    zipCode,
    stateCode,
    countyName: zip.countyName,
    cityName: zip.cityName,
    stateTaxRate: stateRate,
    countyRate,
    cityRate,
    specialDistrictRate,
    combinedLocalRate,
    totalRate: stateRate + combinedLocalRate,
    breakdown,
    source: "database",
  };
}

/**
 * Clear the local tax rate cache
 * Useful for testing or forcing fresh data
 */
export function clearCache(): void {
  taxRateCache.clear();
}

/**
 * Get cache statistics
 * Useful for monitoring and debugging
 */
export function getCacheStats(): { size: number; ttlMs: number } {
  return {
    size: taxRateCache.size(),
    ttlMs: 24 * 60 * 60 * 1000,
  };
}
