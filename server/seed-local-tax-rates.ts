/**
 * SEED LOCAL TAX RATES
 *
 * Populates the database with sample local tax rates from the JSON data file.
 * Run this script after database migration to load initial tax rate data.
 *
 * Usage:
 * ```bash
 * tsx server/seed-local-tax-rates.ts
 * ```
 *
 * This script:
 * 1. Reads sample-local-rates.json
 * 2. Creates local tax rate records for each jurisdiction
 * 3. Creates ZIP code mapping records
 * 4. Handles rate stacking (county + city + special districts)
 */

import { db } from "./db";
import { localTaxRates, zipToLocalTaxRates } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";
import { eq } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface SampleDataFile {
  metadata: {
    version: string;
    lastUpdated: string;
    description: string;
  };
  states: StateData[];
}

interface StateData {
  stateCode: string;
  stateName: string;
  baseRate: number;
  jurisdictions: JurisdictionData[];
}

interface JurisdictionData {
  countyName: string;
  countyFips: string;
  countyRate: number;
  cities: CityData[];
}

interface CityData {
  cityName: string;
  cityRate: number;
  zipCodes: string[];
  combinedLocalRate: number;
  specialDistricts?: SpecialDistrictData[];
  notes?: string;
}

interface SpecialDistrictData {
  name: string;
  rate: number;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedLocalTaxRates() {
  console.log("🌱 Starting local tax rates seed...");

  try {
    // Read sample data file
    const dataPath = path.join(
      __dirname,
      "../shared/autoTaxEngine/data/sample-local-rates.json"
    );
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const sampleData: SampleDataFile = JSON.parse(rawData);

    console.log(`📊 Loaded data version: ${sampleData.metadata.version}`);
    console.log(`📅 Last updated: ${sampleData.metadata.lastUpdated}`);
    console.log(`🗺️  Processing ${sampleData.states.length} states...`);

    let totalJurisdictions = 0;
    let totalZipMappings = 0;

    // Process each state
    for (const state of sampleData.states) {
      console.log(`\n🏛️  Processing ${state.stateName} (${state.stateCode})...`);

      // Process each county/jurisdiction
      for (const jurisdiction of state.jurisdictions) {
        console.log(
          `  📍 ${jurisdiction.countyName} (FIPS: ${jurisdiction.countyFips})`
        );

        // Create county-level tax rate if rate > 0
        let countyRateId: string | null = null;
        if (jurisdiction.countyRate > 0) {
          const countyRate = await db
            .insert(localTaxRates)
            .values({
              stateCode: state.stateCode,
              countyName: jurisdiction.countyName,
              countyFips: jurisdiction.countyFips,
              cityName: null,
              specialDistrictName: null,
              jurisdictionType: "COUNTY",
              taxRate: jurisdiction.countyRate.toString(),
              effectiveDate: new Date(),
              endDate: null,
              notes: `County rate for ${jurisdiction.countyName}`,
              sourceUrl: null,
              lastVerified: new Date(),
            })
            .returning({ id: localTaxRates.id });

          countyRateId = countyRate[0].id;
          totalJurisdictions++;
        }

        // Process each city
        for (const city of jurisdiction.cities) {
          console.log(`    🏙️  ${city.cityName} (${city.zipCodes.length} ZIPs)`);

          const applicableRateIds: string[] = [];

          // Add county rate if exists
          if (countyRateId) {
            applicableRateIds.push(countyRateId);
          }

          // Create city-level tax rate if rate > 0
          if (city.cityRate > 0) {
            const cityRate = await db
              .insert(localTaxRates)
              .values({
                stateCode: state.stateCode,
                countyName: jurisdiction.countyName,
                countyFips: jurisdiction.countyFips,
                cityName: city.cityName,
                specialDistrictName: null,
                jurisdictionType: "CITY",
                taxRate: city.cityRate.toString(),
                effectiveDate: new Date(),
                endDate: null,
                notes: city.notes || `City rate for ${city.cityName}`,
                sourceUrl: null,
                lastVerified: new Date(),
              })
              .returning({ id: localTaxRates.id });

            applicableRateIds.push(cityRate[0].id);
            totalJurisdictions++;
          }

          // Create special district tax rates if any
          if (city.specialDistricts) {
            for (const district of city.specialDistricts) {
              const districtRate = await db
                .insert(localTaxRates)
                .values({
                  stateCode: state.stateCode,
                  countyName: jurisdiction.countyName,
                  countyFips: jurisdiction.countyFips,
                  cityName: city.cityName,
                  specialDistrictName: district.name,
                  jurisdictionType: "SPECIAL_DISTRICT",
                  taxRate: district.rate.toString(),
                  effectiveDate: new Date(),
                  endDate: null,
                  notes: `Special district: ${district.name}`,
                  sourceUrl: null,
                  lastVerified: new Date(),
                })
                .returning({ id: localTaxRates.id });

              applicableRateIds.push(districtRate[0].id);
              totalJurisdictions++;
            }
          }

          // Create ZIP code mappings for each ZIP in this city
          for (const zipCode of city.zipCodes) {
            // Check if ZIP already exists (prevent duplicates)
            const existing = await db
              .select()
              .from(zipToLocalTaxRates)
              .where(eq(zipToLocalTaxRates.zipCode, zipCode))
              .limit(1);

            if (existing.length > 0) {
              console.log(`    ⚠️  ZIP ${zipCode} already exists, skipping...`);
              continue;
            }

            await db.insert(zipToLocalTaxRates).values({
              zipCode,
              stateCode: state.stateCode,
              countyFips: jurisdiction.countyFips,
              countyName: jurisdiction.countyName,
              cityName: city.cityName,
              taxRateIds: applicableRateIds,
              combinedLocalRate: city.combinedLocalRate.toString(),
              lastUpdated: new Date(),
            });

            totalZipMappings++;
          }
        }
      }
    }

    console.log("\n✅ Seed complete!");
    console.log(`📊 Total jurisdictions created: ${totalJurisdictions}`);
    console.log(`📮 Total ZIP code mappings created: ${totalZipMappings}`);
  } catch (error) {
    console.error("❌ Error seeding local tax rates:", error);
    throw error;
  }
}

// ============================================================================
// CLEAR FUNCTION (for re-seeding)
// ============================================================================

async function clearLocalTaxRates() {
  console.log("🗑️  Clearing existing local tax rates...");

  try {
    // Delete all ZIP mappings first (due to foreign key constraints)
    const deletedZips = await db.delete(zipToLocalTaxRates);
    console.log(`   Deleted ZIP mappings`);

    // Delete all local tax rates
    const deletedRates = await db.delete(localTaxRates);
    console.log(`   Deleted local tax rates`);

    console.log("✅ Clear complete!");
  } catch (error) {
    console.error("❌ Error clearing local tax rates:", error);
    throw error;
  }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

(async () => {
  try {
    if (command === "--clear") {
      await clearLocalTaxRates();
    } else if (command === "--reseed") {
      await clearLocalTaxRates();
      await seedLocalTaxRates();
    } else {
      await seedLocalTaxRates();
    }

    console.log("\n🎉 All done!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
})();

// ============================================================================
// EXPORT FOR PROGRAMMATIC USE
// ============================================================================

export { seedLocalTaxRates, clearLocalTaxRates };
