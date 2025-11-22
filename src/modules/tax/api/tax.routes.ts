/**
 * TAX MODULE API ROUTES
 *
 * Consolidated tax calculation endpoints for the Autolytiq platform.
 * Combines AutoTaxEngine, local tax rates, and customer-based tax calculation.
 *
 * ARCHITECTURE:
 * - All routes use relative imports within the tax module
 * - Integrates with EnhancedTaxService for production-grade calculations
 * - Maintains penny-accurate tax calculations
 * - Comprehensive error handling and validation
 * - Full audit trail for compliance
 *
 * ROUTE GROUPS:
 * 1. Tax Calculation - Calculate tax for deals
 * 2. Local Tax Rates - ZIP code to local rate lookup
 * 3. Tax Jurisdictions - Jurisdiction data management
 * 4. State Rules - State-specific tax rule queries
 * 5. Customer Tax - Customer address-based tax calculation
 * 6. Deal Tax - Deal-specific tax recalculation
 *
 * @module tax/api
 */

import { Router, Request, Response } from 'express';

// ============================================================================
// INTERNAL MODULE IMPORTS
// ============================================================================

import { EnhancedTaxService, DatabaseTaxStorage } from '../index';
import { JurisdictionService } from '../services/jurisdiction.service';
import { StateRulesService } from '../services/state-rules.service';
import {
  SalesTaxRequest,
  DealTaxRequest,
  salesTaxRequestSchema,
  dealTaxRequestSchema,
  ValidationFailedError,
} from '../types/enhanced-tax.types';

// ============================================================================
// EXTERNAL SHARED IMPORTS
// ============================================================================

import {
  calculateTax,
  getRulesForState,
  getAllStateCodes,
  getImplementedStates,
  getStubStates,
  resolveTaxContext,
  createSimpleRooftopConfig,
  buildRateComponentsFromLocalInfo,
  type TaxCalculationInput,
  type TaxContext,
  type RooftopConfig,
  type DealPartyInfo,
} from '../../../shared/autoTaxEngine';
import type {
  TaxProfile,
  TaxQuoteInput,
  CustomerAddress,
} from '../../../shared/types/tax-engine';

// ============================================================================
// SERVER IMPORTS (for backward compatibility)
// ============================================================================

import { getLocalTaxRate as legacyGetLocalTaxRate } from '../../../server/local-tax-service';
import {
  calculateTaxProfile as legacyCalculateTaxProfile,
  recalculateDealTaxes as legacyRecalculateDealTaxes,
} from '../../../server/services/tax-engine-service';

// ============================================================================
// DATABASE
// ============================================================================

import { db } from '../../../server/db';
import { customers } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

// ============================================================================
// ROUTER INITIALIZATION
// ============================================================================

const router = Router();

// Initialize services
const taxStorage = new DatabaseTaxStorage(db);
const taxService = new EnhancedTaxService(taxStorage);
const jurisdictionService = new JurisdictionService(db);
const stateRulesService = new StateRulesService();

// ============================================================================
// GROUP 1: TAX CALCULATION (AutoTaxEngine)
// ============================================================================

/**
 * POST /api/tax/quote
 *
 * Calculate tax for a deal using AutoTaxEngine.
 * Supports both retail and lease deals.
 *
 * @body TaxQuoteRequest
 * @returns TaxQuoteResponse
 */
interface TaxQuoteRequest {
  // Rooftop context (required)
  rooftop?: RooftopConfig;
  dealerStateCode?: string;

  // Deal party info (required)
  deal: {
    buyerResidenceState?: string;
    registrationState?: string;
    vehicleLocationState?: string;
    deliveryState?: string;
    zipCode?: string;
  };

  // Deal financial info (required)
  dealType: 'RETAIL' | 'LEASE';
  asOfDate: string;
  vehiclePrice: number;
  accessoriesAmount?: number;
  tradeInValue?: number;
  rebateManufacturer?: number;
  rebateDealer?: number;
  docFee?: number;
  otherFees?: { code: string; amount: number }[];
  serviceContracts?: number;
  gap?: number;
  negativeEquity?: number;
  taxAlreadyCollected?: number;

  // Tax rates (required for STATE_PLUS_LOCAL states)
  rates?: { label: string; rate: number }[];

  // Lease-specific (required if dealType === 'LEASE')
  grossCapCost?: number;
  capReductionCash?: number;
  capReductionTradeIn?: number;
  capReductionRebateManufacturer?: number;
  capReductionRebateDealer?: number;
  basePayment?: number;
  paymentCount?: number;

  // Reciprocity (optional)
  originTaxInfo?: {
    stateCode: string;
    amount: number;
    taxPaidDate?: string;
  };

  // Advanced (optional)
  vehicleClass?: string;
  gvw?: number;
  customerIsNewResident?: boolean;
}

interface TaxQuoteResponse {
  success: boolean;
  context: TaxContext;
  result: any;
  localTaxInfo?: any;
  error?: string;
}

router.post('/quote', async (req: Request, res: Response) => {
  try {
    const body = req.body as TaxQuoteRequest;

    // Validate required fields
    if (!body.dealType || !body.asOfDate || body.vehiclePrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dealType, asOfDate, vehiclePrice',
      });
    }

    // Resolve tax context (which state's rules to use)
    const rooftop: RooftopConfig =
      body.rooftop ??
      createSimpleRooftopConfig(
        body.dealerStateCode ?? body.deal.registrationState ?? 'IN',
        `Dealer in ${body.dealerStateCode ?? 'IN'}`
      );

    const dealParty: DealPartyInfo = {
      buyerResidenceState: body.deal.buyerResidenceState,
      registrationState: body.deal.registrationState,
      vehicleLocationState: body.deal.vehicleLocationState,
      deliveryState: body.deal.deliveryState,
    };

    const context = resolveTaxContext(rooftop, dealParty);

    // Get state rules
    const rules = getRulesForState(context.primaryStateCode);
    if (!rules) {
      return res.status(400).json({
        success: false,
        error: `Invalid state code: ${context.primaryStateCode}`,
      });
    }

    // Fetch local tax rates if STATE_PLUS_LOCAL and ZIP code provided
    let taxRates = body.rates ?? [{ label: 'STATE', rate: 0.07 }];
    let localTaxInfo = null;

    if (
      rules.vehicleTaxScheme === 'STATE_PLUS_LOCAL' &&
      body.deal.zipCode &&
      !body.rates
    ) {
      try {
        localTaxInfo = await legacyGetLocalTaxRate(
          body.deal.zipCode,
          context.primaryStateCode
        );
        taxRates = buildRateComponentsFromLocalInfo(localTaxInfo);
      } catch (error) {
        console.warn(
          `[TaxRoutes] Could not fetch local tax rates for ZIP ${body.deal.zipCode}:`,
          error
        );
      }
    }

    // Build base tax calculation input fields
    const baseFields = {
      stateCode: context.primaryStateCode,
      asOfDate: body.asOfDate,
      homeStateCode: context.buyerResidenceStateCode,
      registrationStateCode: context.registrationStateCode,
      originTaxInfo: body.originTaxInfo,
      vehiclePrice: body.vehiclePrice,
      accessoriesAmount: body.accessoriesAmount ?? 0,
      tradeInValue: body.tradeInValue ?? 0,
      rebateManufacturer: body.rebateManufacturer ?? 0,
      rebateDealer: body.rebateDealer ?? 0,
      docFee: body.docFee ?? 0,
      otherFees: body.otherFees ?? [],
      serviceContracts: body.serviceContracts ?? 0,
      gap: body.gap ?? 0,
      negativeEquity: body.negativeEquity ?? 0,
      taxAlreadyCollected: body.taxAlreadyCollected ?? 0,
      rates: taxRates,
      vehicleClass: body.vehicleClass,
      gvw: body.gvw,
      customerIsNewResident: body.customerIsNewResident,
    };

    // Build tax calculation input based on deal type
    const taxInput: TaxCalculationInput =
      body.dealType === 'LEASE'
        ? {
            ...baseFields,
            dealType: 'LEASE' as const,
            grossCapCost: body.grossCapCost ?? body.vehiclePrice,
            capReductionCash: body.capReductionCash ?? 0,
            capReductionTradeIn:
              body.capReductionTradeIn ?? body.tradeInValue ?? 0,
            capReductionRebateManufacturer:
              body.capReductionRebateManufacturer ?? body.rebateManufacturer ?? 0,
            capReductionRebateDealer:
              body.capReductionRebateDealer ?? body.rebateDealer ?? 0,
            basePayment: body.basePayment ?? 0,
            paymentCount: body.paymentCount ?? 36,
          }
        : {
            ...baseFields,
            dealType: 'RETAIL' as const,
          };

    // Calculate tax
    const result = calculateTax(taxInput, rules);

    // Return result
    const response: TaxQuoteResponse = {
      success: true,
      context,
      result,
      localTaxInfo: localTaxInfo || undefined,
    };

    res.json(response);
  } catch (error) {
    console.error('[TaxRoutes] Tax quote error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tax/calculate
 *
 * Enhanced tax calculation endpoint using EnhancedTaxService.
 * Provides penny-accurate calculations with full audit trail.
 *
 * @body DealTaxRequest
 * @returns CompleteTaxBreakdown
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const input = req.body as DealTaxRequest;

    // Validate using Zod schema
    const validation = dealTaxRequestSchema.safeParse(input);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    // Calculate tax using enhanced service
    const result = await taxService.calculateDealTax(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[TaxRoutes] Enhanced tax calculation error:', error);

    if (error instanceof ValidationFailedError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Tax calculation failed',
    });
  }
});

// ============================================================================
// GROUP 2: LOCAL TAX RATES (ZIP Code Lookup)
// ============================================================================

/**
 * GET /api/tax/local/:zipCode
 *
 * Get local tax rate for a ZIP code.
 * Returns state + county + city + special district rates.
 *
 * @param zipCode - 5-digit ZIP code
 * @query stateCode - Optional 2-letter state code for validation
 */
router.get('/local/:zipCode', async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;
    const { stateCode } = req.query;

    // Validate ZIP code format
    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ZIP code format. Expected 5-digit ZIP (e.g., 90210)',
      });
    }

    // Default to "CA" if no state provided
    const state = (stateCode as string)?.toUpperCase() || 'CA';

    const rateInfo = await legacyGetLocalTaxRate(zipCode, state);

    res.json({
      success: true,
      data: rateInfo,
    });
  } catch (error) {
    console.error('[TaxRoutes] Error fetching local tax rate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tax/zip/:zipCode
 *
 * Alias for /local/:zipCode for backward compatibility
 */
router.get('/zip/:zipCode', async (req: Request, res: Response) => {
  req.url = `/local/${req.params.zipCode}`;
  return router.handle(req, res);
});

/**
 * GET /api/tax/local/breakdown/:zipCode
 *
 * Get detailed rate breakdown for a ZIP code.
 * Separates county, city, and special district rates.
 */
router.get('/breakdown/:zipCode', async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;

    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ZIP code format',
      });
    }

    const breakdown = await jurisdictionService.getJurisdictionBreakdown(zipCode);

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
    console.error('[TaxRoutes] Error fetching breakdown:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// GROUP 3: TAX JURISDICTIONS
// ============================================================================

/**
 * GET /api/tax/jurisdictions/:zipCode
 *
 * Get full jurisdiction info for a ZIP code.
 * Includes all applicable tax authorities with effective dates.
 */
router.get('/jurisdictions/:zipCode', async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;

    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ZIP code format',
      });
    }

    const jurisdictionInfo = await jurisdictionService.getTaxJurisdictionInfo(zipCode);

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
    console.error('[TaxRoutes] Error fetching jurisdiction info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tax/jurisdictions
 *
 * Legacy endpoint - redirects to lookup
 */
router.get('/jurisdictions', async (req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    error: 'Please specify a ZIP code: /api/tax/jurisdictions/:zipCode',
  });
});

// ============================================================================
// GROUP 4: STATE RULES
// ============================================================================

/**
 * GET /api/tax/states
 *
 * List all supported states with implementation status.
 */
router.get('/states', (req: Request, res: Response) => {
  const allStates = getAllStateCodes();
  const implementedStates = getImplementedStates();
  const stubStates = getStubStates();

  res.json({
    totalStates: allStates.length,
    implemented: {
      count: implementedStates.length,
      states: implementedStates,
    },
    stubs: {
      count: stubStates.length,
      states: stubStates,
    },
    allStates,
  });
});

/**
 * GET /api/tax/states/:code
 *
 * Get state-specific tax rules.
 * Alias: GET /api/tax/rules/:state
 */
router.get('/states/:code', (req: Request, res: Response) => {
  const stateCode = req.params.code.toUpperCase();
  const rules = getRulesForState(stateCode);

  if (!rules) {
    return res.status(404).json({
      error: `State not found: ${stateCode}`,
    });
  }

  res.json({
    stateCode: rules.stateCode,
    version: rules.version,
    vehicleTaxScheme: rules.vehicleTaxScheme,
    tradeInPolicy: rules.tradeInPolicy,
    docFeeTaxable: rules.docFeeTaxable,
    leaseRules: {
      method: rules.leaseRules.method,
      specialScheme: rules.leaseRules.specialScheme,
    },
    reciprocity: {
      enabled: rules.reciprocity.enabled,
      scope: rules.reciprocity.scope,
      homeStateBehavior: rules.reciprocity.homeStateBehavior,
    },
    extras: rules.extras,
  });
});

/**
 * GET /api/tax/rules/:state
 *
 * Alias for /states/:code
 */
router.get('/rules/:state', async (req: Request, res: Response) => {
  req.url = `/states/${req.params.state}`;
  return router.handle(req, res);
});

// ============================================================================
// GROUP 5: CUSTOMER TAX (Address-Based)
// ============================================================================

/**
 * POST /api/tax/customers/quote
 *
 * Calculate tax profile based on customer address.
 * Single source of truth for customer-based tax calculation.
 *
 * @body TaxQuoteInput
 * @returns TaxProfile
 */
router.post('/customers/quote', async (req: Request, res: Response) => {
  try {
    const input = req.body as TaxQuoteInput;

    if (!input.customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    if (!input.dealType) {
      return res
        .status(400)
        .json({ error: 'dealType is required (RETAIL or LEASE)' });
    }

    if (input.vehiclePrice === undefined || input.vehiclePrice === null) {
      return res.status(400).json({ error: 'vehiclePrice is required' });
    }

    const taxProfile = await legacyCalculateTaxProfile(input);

    res.json({
      success: true,
      taxProfile,
    });
  } catch (error: any) {
    console.error('[TaxRoutes] Tax Quote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate tax',
    });
  }
});

/**
 * GET /api/tax/customers/:customerId/preview
 *
 * Quick preview of tax rates for a customer (before deal exists).
 * Uses default vehicle price of $30,000 for preview.
 */
router.get('/customers/:customerId/preview', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    // Get basic preview with default values
    const taxProfile = await legacyCalculateTaxProfile({
      customerId,
      dealType: 'RETAIL',
      vehiclePrice: 30000,
    });

    res.json({
      success: true,
      jurisdiction: taxProfile.jurisdiction,
      rates: taxProfile.rates,
      method: taxProfile.method,
      rules: taxProfile.rules,
    });
  } catch (error: any) {
    console.error('[TaxRoutes] Tax Preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tax preview',
    });
  }
});

/**
 * GET /api/tax/customers/:customerId/validate-address
 *
 * Check if customer has valid address for tax calculation.
 */
router.get(
  '/customers/:customerId/validate-address',
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return res.status(404).json({
          valid: false,
          error: 'Customer not found',
        });
      }

      const hasState = !!customer.state;
      const hasZip = !!customer.zipCode;
      const hasCity = !!customer.city;
      const hasCounty = !!customer.county;

      const valid = hasState && hasZip;
      const complete = valid && hasCity && hasCounty;

      res.json({
        valid,
        complete,
        missing: {
          state: !hasState,
          zipCode: !hasZip,
          city: !hasCity,
          county: !hasCounty,
        },
        address: valid
          ? {
              city: customer.city,
              state: customer.state,
              zipCode: customer.zipCode,
              county: customer.county,
            }
          : null,
      });
    } catch (error: any) {
      console.error('[TaxRoutes] Validate Address error:', error);
      res.status(500).json({
        valid: false,
        error: error.message || 'Failed to validate address',
      });
    }
  }
);

// ============================================================================
// GROUP 6: DEAL TAX (Deal Recalculation)
// ============================================================================

/**
 * POST /api/tax/deals/:dealId/recalculate
 *
 * Recalculate and save taxes for an existing deal.
 * Updates the deal scenario with new tax values.
 */
router.post('/deals/:dealId/recalculate', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }

    const result = await legacyRecalculateDealTaxes(dealId);

    res.json({
      success: true,
      taxProfile: result.taxProfile,
      scenarioId: result.scenarioId,
      message: 'Taxes recalculated successfully',
    });
  } catch (error: any) {
    console.error('[TaxRoutes] Recalculate Taxes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recalculate taxes',
    });
  }
});

// ============================================================================
// HEALTH & UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/tax/health
 *
 * Health check endpoint for tax service
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Tax Calculation Module',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/tax/examples
 *
 * API documentation examples
 */
router.get('/examples', (req: Request, res: Response) => {
  res.json({
    success: true,
    examples: {
      'Calculate tax for a deal (AutoTaxEngine)': {
        method: 'POST',
        url: '/api/tax/quote',
        body: {
          dealType: 'RETAIL',
          asOfDate: '2025-11-21',
          vehiclePrice: 35000,
          dealerStateCode: 'CA',
          deal: {
            zipCode: '90210',
            registrationState: 'CA',
          },
        },
      },
      'Get local rate for Beverly Hills, CA': {
        method: 'GET',
        url: '/api/tax/local/90210?stateCode=CA',
        description: 'Returns state + local rate breakdown for ZIP code 90210',
      },
      'Get jurisdiction info': {
        method: 'GET',
        url: '/api/tax/jurisdictions/90210',
        description: 'Returns detailed jurisdiction information',
      },
      'Get state tax rules': {
        method: 'GET',
        url: '/api/tax/states/CA',
        description: 'Returns California-specific tax rules',
      },
      'Calculate customer tax profile': {
        method: 'POST',
        url: '/api/tax/customers/quote',
        body: {
          customerId: 'customer-uuid',
          dealType: 'RETAIL',
          vehiclePrice: 35000,
        },
      },
    },
  });
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
