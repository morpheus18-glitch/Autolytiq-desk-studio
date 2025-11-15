/**
 * ROOFTOP CONFIGURATION API ROUTES
 *
 * RESTful API for managing multi-location dealer rooftop configurations.
 *
 * Endpoints:
 * - GET    /api/rooftops - List all rooftops for current dealership
 * - GET    /api/rooftops/:id - Get specific rooftop
 * - POST   /api/rooftops - Create new rooftop
 * - PUT    /api/rooftops/:id - Update rooftop
 * - DELETE /api/rooftops/:id - Delete rooftop
 * - GET    /api/rooftops/primary - Get primary rooftop
 * - POST   /api/rooftops/:id/set-primary - Set as primary rooftop
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getRooftopsByDealership,
  getRooftopById,
  getPrimaryRooftop,
  createRooftop,
  updateRooftop,
  deleteRooftop,
  validateRooftopConfig,
  getRecommendedRooftop,
} from "./rooftop-service";

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createRooftopSchema = z.object({
  rooftopId: z.string().min(1),
  name: z.string().min(1),
  dealerStateCode: z.string().length(2),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  defaultTaxPerspective: z
    .enum(["DEALER_STATE", "BUYER_STATE", "REGISTRATION_STATE"])
    .default("DEALER_STATE"),
  allowedRegistrationStates: z.array(z.string().length(2)).default([]),
  stateOverrides: z.record(z.any()).optional(),
  driveOutEnabled: z.boolean().default(false),
  driveOutStates: z.array(z.string().length(2)).optional(),
  customTaxRates: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateRooftopSchema = createRooftopSchema.partial();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/rooftops
 * List all rooftops for the current dealership
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // TODO: Get dealershipId from authenticated user
    const dealershipId = req.query.dealershipId as string || "default";

    const rooftops = await getRooftopsByDealership(dealershipId);

    res.json({
      success: true,
      data: rooftops,
      count: rooftops.length,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error fetching rooftops:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/rooftops/primary
 * Get the primary rooftop for the current dealership
 */
router.get("/primary", async (req: Request, res: Response) => {
  try {
    const dealershipId = req.query.dealershipId as string || "default";

    const rooftop = await getPrimaryRooftop(dealershipId);

    if (!rooftop) {
      return res.status(404).json({
        success: false,
        error: "No primary rooftop found",
      });
    }

    res.json({
      success: true,
      data: rooftop,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error fetching primary rooftop:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/rooftops/recommended
 * Get recommended rooftop based on registration state
 */
router.get("/recommended", async (req: Request, res: Response) => {
  try {
    const dealershipId = req.query.dealershipId as string || "default";
    const registrationState = req.query.registrationState as string;

    if (!registrationState) {
      return res.status(400).json({
        success: false,
        error: "Registration state required",
      });
    }

    const rooftop = await getRecommendedRooftop(dealershipId, registrationState);

    if (!rooftop) {
      return res.status(404).json({
        success: false,
        error: "No suitable rooftop found",
      });
    }

    res.json({
      success: true,
      data: rooftop,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error getting recommended rooftop:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/rooftops/:id
 * Get a specific rooftop by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const rooftop = await getRooftopById(req.params.id);

    if (!rooftop) {
      return res.status(404).json({
        success: false,
        error: "Rooftop not found",
      });
    }

    res.json({
      success: true,
      data: rooftop,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error fetching rooftop:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/rooftops
 * Create a new rooftop configuration
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = createRooftopSchema.parse(req.body);

    // TODO: Get dealershipId from authenticated user
    const dealershipId = req.body.dealershipId || "default";

    const validation = validateRooftopConfig(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const rooftop = await createRooftop({
      ...data,
      dealershipId,
    });

    res.status(201).json({
      success: true,
      data: rooftop,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error creating rooftop:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/rooftops/:id
 * Update an existing rooftop configuration
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const data = updateRooftopSchema.parse(req.body);

    const validation = validateRooftopConfig(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const rooftop = await updateRooftop(req.params.id, data);

    if (!rooftop) {
      return res.status(404).json({
        success: false,
        error: "Rooftop not found",
      });
    }

    res.json({
      success: true,
      data: rooftop,
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error updating rooftop:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/rooftops/:id
 * Delete a rooftop configuration
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const success = await deleteRooftop(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Rooftop not found or could not be deleted",
      });
    }

    res.json({
      success: true,
      message: "Rooftop deleted successfully",
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error deleting rooftop:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/rooftops/:id/set-primary
 * Set a rooftop as the primary location
 */
router.post("/:id/set-primary", async (req: Request, res: Response) => {
  try {
    const rooftop = await updateRooftop(req.params.id, { isPrimary: true });

    if (!rooftop) {
      return res.status(404).json({
        success: false,
        error: "Rooftop not found",
      });
    }

    res.json({
      success: true,
      data: rooftop,
      message: "Rooftop set as primary",
    });
  } catch (error) {
    console.error("[RooftopRoutes] Error setting primary rooftop:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
