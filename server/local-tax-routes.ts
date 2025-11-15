/**
 * LOCAL TAX RATE API ROUTES
 *
 * RESTful endpoints for local tax rate lookup and management.
 * Integrates with AutoTaxEngine for STATE_PLUS_LOCAL vehicle tax calculations.
 *
 * ROUTES:
 * - GET /api/tax/local/:zipCode - Get local rate for a ZIP code
 * - GET /api/tax/jurisdictions/:zipCode - Get full jurisdiction info for a ZIP
 * - POST /api/tax/local/bulk - Bulk lookup for multiple ZIPs
 * - GET /api/tax/local/search - Search jurisdictions by city/county name
 * - GET /api/tax/local/breakdown/:zipCode - Get detailed rate breakdown
 * - GET /api/tax/local/stats - Get cache statistics
 *
 * All endpoints support CORS and include proper error handling.
 */

import { Router, Request, Response } from "express";
import {
  getLocalTaxRate,
  getTaxJurisdictionInfo,
  getJurisdictionBreakdown,
  bulkGetLocalTaxRates,
  searchJurisdictions,
  getCacheStats,
  clearCache,
} from "./local-tax-service";

const router = Router();

// ============================================================================
// GET /api/tax/local/:zipCode - Get Local Rate for ZIP Code
// ============================================================================

interface LocalTaxRateRequest {
  zipCode: string;
  stateCode?: string; // Optional, for validation
}

router.get("/local/:zipCode", async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;
    const { stateCode } = req.query;

    // Validate ZIP code format
    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ZIP code format. Expected 5-digit ZIP (e.g., 90210)",
      });
    }

    // Default to "CA" if no state provided (for demo purposes)
    const state = (stateCode as string)?.toUpperCase() || "CA";

    const rateInfo = await getLocalTaxRate(zipCode, state);

    res.json({
      success: true,
      data: rateInfo,
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error fetching local tax rate:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// GET /api/tax/jurisdictions/:zipCode - Get Jurisdiction Info
// ============================================================================

router.get("/jurisdictions/:zipCode", async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;

    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ZIP code format",
      });
    }

    const jurisdictionInfo = await getTaxJurisdictionInfo(zipCode);

    if (!jurisdictionInfo) {
      return res.status(404).json({
        success: false,
        error: `No jurisdiction data found for ZIP code ${zipCode}`,
      });
    }

    res.json({
      success: true,
      data: jurisdictionInfo,
    });
  } catch (error) {
    console.error(
      "[LocalTaxRoutes] Error fetching jurisdiction info:",
      error
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// GET /api/tax/local/breakdown/:zipCode - Get Detailed Rate Breakdown
// ============================================================================

router.get("/breakdown/:zipCode", async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;

    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ZIP code format",
      });
    }

    const breakdown = await getJurisdictionBreakdown(zipCode);

    if (!breakdown) {
      return res.status(404).json({
        success: false,
        error: `No breakdown data found for ZIP code ${zipCode}`,
      });
    }

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error fetching breakdown:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// POST /api/tax/local/bulk - Bulk Lookup for Multiple ZIPs
// ============================================================================

interface BulkLookupRequest {
  zipCodes: string[];
  stateCode: string;
}

router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { zipCodes, stateCode } = req.body as BulkLookupRequest;

    // Validate request
    if (!Array.isArray(zipCodes) || zipCodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "zipCodes must be a non-empty array",
      });
    }

    if (zipCodes.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Maximum 100 ZIP codes per request",
      });
    }

    if (!stateCode || typeof stateCode !== "string") {
      return res.status(400).json({
        success: false,
        error: "stateCode is required",
      });
    }

    // Validate each ZIP code
    const invalidZips = zipCodes.filter(
      (zip) => !/^\d{5}(-\d{4})?$/.test(zip)
    );
    if (invalidZips.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ZIP codes: ${invalidZips.join(", ")}`,
      });
    }

    // Perform bulk lookup
    const results = await bulkGetLocalTaxRates(zipCodes, stateCode);

    // Convert Map to object for JSON response
    const resultsObj: Record<string, any> = {};
    results.forEach((value, key) => {
      resultsObj[key] = value;
    });

    res.json({
      success: true,
      count: results.size,
      data: resultsObj,
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error in bulk lookup:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// GET /api/tax/local/search - Search Jurisdictions by Name
// ============================================================================

router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, stateCode } = req.query;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
      });
    }

    const query = q.trim();
    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Query must be at least 2 characters",
      });
    }

    const results = await searchJurisdictions(
      query,
      stateCode as string | undefined
    );

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error searching jurisdictions:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// GET /api/tax/local/stats - Get Cache Statistics
// ============================================================================

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = getCacheStats();

    res.json({
      success: true,
      data: {
        cacheSize: stats.size,
        cacheTtlMs: stats.ttlMs,
        cacheTtlHours: stats.ttlMs / (1000 * 60 * 60),
      },
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// POST /api/tax/local/cache/clear - Clear Cache (Admin only)
// ============================================================================

router.post("/cache/clear", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication/authorization check here
    // Only admins should be able to clear the cache

    clearCache();

    res.json({
      success: true,
      message: "Local tax rate cache cleared",
    });
  } catch (error) {
    console.error("[LocalTaxRoutes] Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// EXAMPLE USAGE ENDPOINTS (for documentation/testing)
// ============================================================================

router.get("/examples", (req: Request, res: Response) => {
  res.json({
    success: true,
    examples: {
      "Get local rate for Beverly Hills, CA": {
        method: "GET",
        url: "/api/tax/local/90210?stateCode=CA",
        description:
          "Returns state + local rate breakdown for ZIP code 90210 (Beverly Hills)",
      },
      "Get jurisdiction info": {
        method: "GET",
        url: "/api/tax/jurisdictions/90210",
        description:
          "Returns detailed jurisdiction information including all applicable tax authorities",
      },
      "Get rate breakdown": {
        method: "GET",
        url: "/api/tax/breakdown/90210",
        description:
          "Returns structured breakdown of county, city, and special district rates",
      },
      "Bulk lookup": {
        method: "POST",
        url: "/api/tax/local/bulk",
        body: {
          zipCodes: ["90210", "90211", "90212"],
          stateCode: "CA",
        },
        description: "Fetch local rates for multiple ZIP codes at once",
      },
      "Search jurisdictions": {
        method: "GET",
        url: "/api/tax/local/search?q=Los%20Angeles&stateCode=CA",
        description:
          "Search for jurisdictions by city or county name (autocomplete)",
      },
    },
  });
});

export default router;
