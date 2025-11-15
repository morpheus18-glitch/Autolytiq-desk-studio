/**
 * ROOFTOP CONFIGURATION SERVICE
 *
 * Manages multi-location dealer rooftop configurations for tax calculations.
 * Each rooftop can have different tax perspectives and allowed registration states.
 *
 * Features:
 * - CRUD operations for rooftop configurations
 * - Convert database records to AutoTaxEngine RooftopConfig format
 * - Validate rooftop settings
 * - Handle multi-location scenarios
 * - Drive-out provision support
 */

import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  rooftopConfigurations,
  RooftopConfiguration,
  InsertRooftopConfiguration,
} from "../shared/schema";
import type { RooftopConfig } from "../shared/autoTaxEngine/types";

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get all rooftops for a dealership
 */
export async function getRooftopsByDealership(
  dealershipId: string
): Promise<RooftopConfiguration[]> {
  try {
    const rooftops = await db
      .select()
      .from(rooftopConfigurations)
      .where(eq(rooftopConfigurations.dealershipId, dealershipId));

    return rooftops;
  } catch (error) {
    console.error("[RooftopService] Error fetching rooftops:", error);
    throw error;
  }
}

/**
 * Get a specific rooftop by ID
 */
export async function getRooftopById(
  rooftopId: string
): Promise<RooftopConfiguration | null> {
  try {
    const rooftops = await db
      .select()
      .from(rooftopConfigurations)
      .where(eq(rooftopConfigurations.id, rooftopId))
      .limit(1);

    return rooftops.length > 0 ? rooftops[0] : null;
  } catch (error) {
    console.error("[RooftopService] Error fetching rooftop:", error);
    throw error;
  }
}

/**
 * Get rooftop by dealership + rooftop ID
 */
export async function getRooftopByIdentifier(
  dealershipId: string,
  rooftopIdent: string
): Promise<RooftopConfiguration | null> {
  try {
    const rooftops = await db
      .select()
      .from(rooftopConfigurations)
      .where(
        and(
          eq(rooftopConfigurations.dealershipId, dealershipId),
          eq(rooftopConfigurations.rooftopId, rooftopIdent)
        )
      )
      .limit(1);

    return rooftops.length > 0 ? rooftops[0] : null;
  } catch (error) {
    console.error("[RooftopService] Error fetching rooftop:", error);
    throw error;
  }
}

/**
 * Get primary rooftop for a dealership
 */
export async function getPrimaryRooftop(
  dealershipId: string
): Promise<RooftopConfiguration | null> {
  try {
    const rooftops = await db
      .select()
      .from(rooftopConfigurations)
      .where(
        and(
          eq(rooftopConfigurations.dealershipId, dealershipId),
          eq(rooftopConfigurations.isPrimary, true),
          eq(rooftopConfigurations.isActive, true)
        )
      )
      .limit(1);

    // If no primary found, return first active rooftop
    if (rooftops.length === 0) {
      const activeRooftops = await db
        .select()
        .from(rooftopConfigurations)
        .where(
          and(
            eq(rooftopConfigurations.dealershipId, dealershipId),
            eq(rooftopConfigurations.isActive, true)
          )
        )
        .limit(1);

      return activeRooftops.length > 0 ? activeRooftops[0] : null;
    }

    return rooftops[0];
  } catch (error) {
    console.error("[RooftopService] Error fetching primary rooftop:", error);
    throw error;
  }
}

/**
 * Create a new rooftop configuration
 */
export async function createRooftop(
  data: InsertRooftopConfiguration
): Promise<RooftopConfiguration> {
  try {
    // If this is marked as primary, unset other primaries for this dealership
    if (data.isPrimary) {
      await db
        .update(rooftopConfigurations)
        .set({ isPrimary: false })
        .where(eq(rooftopConfigurations.dealershipId, data.dealershipId));
    }

    const [rooftop] = await db
      .insert(rooftopConfigurations)
      .values(data)
      .returning();

    return rooftop;
  } catch (error) {
    console.error("[RooftopService] Error creating rooftop:", error);
    throw error;
  }
}

/**
 * Update an existing rooftop configuration
 */
export async function updateRooftop(
  rooftopId: string,
  data: Partial<InsertRooftopConfiguration>
): Promise<RooftopConfiguration | null> {
  try {
    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      const existing = await getRooftopById(rooftopId);
      if (existing) {
        await db
          .update(rooftopConfigurations)
          .set({ isPrimary: false })
          .where(eq(rooftopConfigurations.dealershipId, existing.dealershipId));
      }
    }

    const [rooftop] = await db
      .update(rooftopConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rooftopConfigurations.id, rooftopId))
      .returning();

    return rooftop || null;
  } catch (error) {
    console.error("[RooftopService] Error updating rooftop:", error);
    throw error;
  }
}

/**
 * Delete a rooftop configuration
 */
export async function deleteRooftop(rooftopId: string): Promise<boolean> {
  try {
    await db
      .delete(rooftopConfigurations)
      .where(eq(rooftopConfigurations.id, rooftopId));

    return true;
  } catch (error) {
    console.error("[RooftopService] Error deleting rooftop:", error);
    return false;
  }
}

/**
 * Convert database rooftop to AutoTaxEngine RooftopConfig format
 */
export function convertToRooftopConfig(
  rooftop: RooftopConfiguration
): RooftopConfig {
  return {
    id: rooftop.rooftopId,
    name: rooftop.name,
    dealerStateCode: rooftop.dealerStateCode,
    defaultTaxPerspective: rooftop.defaultTaxPerspective as
      | "DEALER_STATE"
      | "BUYER_STATE"
      | "REGISTRATION_STATE",
    allowedRegistrationStates: (rooftop.allowedRegistrationStates as string[]) || [],
    stateOverrides: (rooftop.stateOverrides as Record<
      string,
      { forcePrimary?: boolean; disallowPrimary?: boolean }
    >) || {},
  };
}

/**
 * Validate rooftop configuration
 */
export function validateRooftopConfig(
  data: Partial<InsertRooftopConfiguration>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name && data.name.trim().length === 0) {
    errors.push("Name cannot be empty");
  }

  if (data.dealerStateCode && data.dealerStateCode.length !== 2) {
    errors.push("Dealer state code must be 2 characters");
  }

  if (
    data.defaultTaxPerspective &&
    !["DEALER_STATE", "BUYER_STATE", "REGISTRATION_STATE"].includes(
      data.defaultTaxPerspective
    )
  ) {
    errors.push("Invalid tax perspective");
  }

  if (data.allowedRegistrationStates) {
    const states = data.allowedRegistrationStates as string[];
    if (!Array.isArray(states)) {
      errors.push("Allowed registration states must be an array");
    } else {
      for (const state of states) {
        if (typeof state !== "string" || state.length !== 2) {
          errors.push(`Invalid state code: ${state}`);
        }
      }
    }
  }

  if (data.driveOutStates) {
    const states = data.driveOutStates as string[];
    if (!Array.isArray(states)) {
      errors.push("Drive-out states must be an array");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a rooftop supports drive-out to a specific state
 */
export function supportsDriveOut(
  rooftop: RooftopConfiguration,
  targetState: string
): boolean {
  if (!rooftop.driveOutEnabled) {
    return false;
  }

  const driveOutStates = (rooftop.driveOutStates as string[]) || [];
  return driveOutStates.includes(targetState);
}

/**
 * Get recommended rooftop for a deal based on registration state
 */
export async function getRecommendedRooftop(
  dealershipId: string,
  registrationState: string
): Promise<RooftopConfiguration | null> {
  try {
    // Try to find a rooftop that allows this registration state
    const rooftops = await getRooftopsByDealership(dealershipId);

    // Filter to active rooftops
    const active = rooftops.filter((r) => r.isActive);

    // Check for rooftops that explicitly allow this state
    const matchingRooftops = active.filter((r) => {
      const allowed = (r.allowedRegistrationStates as string[]) || [];
      return allowed.includes(registrationState);
    });

    if (matchingRooftops.length > 0) {
      // Prefer primary
      const primary = matchingRooftops.find((r) => r.isPrimary);
      return primary || matchingRooftops[0];
    }

    // Check for drive-out support
    const driveOutRooftops = active.filter((r) =>
      supportsDriveOut(r, registrationState)
    );

    if (driveOutRooftops.length > 0) {
      return driveOutRooftops[0];
    }

    // Fall back to primary rooftop
    return getPrimaryRooftop(dealershipId);
  } catch (error) {
    console.error("[RooftopService] Error getting recommended rooftop:", error);
    return null;
  }
}
