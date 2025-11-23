/**
 * TAX API ROUTES - Placeholder/Example Implementation
 *
 * Production endpoints for automotive tax calculation using the AutoTaxEngine.
 *
 * ROUTES:
 * - POST /api/tax/quote - Calculate tax for a deal
 * - GET /api/tax/states - List supported states
 * - GET /api/tax/states/:code - Get state-specific tax rules
 *
 * ARCHITECTURE:
 * - Uses AutoTaxEngine (shared/autoTaxEngine)
 * - State resolver determines which state's rules apply
 * - Returns structured TaxCalculationResult
 * - All calculations are stateless (no DB writes in this module)
 *
 * TODO FOR PRODUCTION:
 * - Add authentication/authorization
 * - Add rate limiting
 * - Add audit logging (who calculated what, when)
 * - Add caching for frequently-used state rules
 * - Add deal context validation
 * - Hook into main Express app in index.ts
 */

import { Router, Request, Response } from "express";
import {
  calculateTax,
  TaxCalculationInput,
  TaxCalculationResult,
  STATE_RULES_MAP,
  getRulesForState,
  getAllStateCodes,
  getImplementedStates,
  getStubStates,
  resolveTaxContext,
  createSimpleRooftopConfig,
  buildRateComponentsFromLocalInfo,
  TaxContext,
  RooftopConfig,
  DealPartyInfo,
} from "../shared/autoTaxEngine";
import { getLocalTaxRate } from "./local-tax-service";

const router = Router();

// ============================================================================
// POST /api/tax/quote - Calculate Tax for a Deal
// ============================================================================

interface TaxQuoteRequest {
  // Rooftop context (required)
  rooftop?: RooftopConfig; // Optional: provide full rooftop config
  dealerStateCode?: string; // Or just dealer state (creates simple rooftop)

  // Deal party info (required)
  deal: {
    buyerResidenceState?: string;
    registrationState?: string;
    vehicleLocationState?: string;
    deliveryState?: string;
    zipCode?: string; // ZIP code for local tax lookup
  };

  // Deal financial info (required)
  dealType: "RETAIL" | "LEASE";
  asOfDate: string; // ISO date
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

  // Lease-specific (required if dealType === "LEASE")
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
  result: TaxCalculationResult;
  localTaxInfo?: Record<string, unknown>; // Local tax rate info if STATE_PLUS_LOCAL
  error?: string;
}

router.post("/quote", async (req: Request, res: Response) => {
  try {
    const body = req.body as TaxQuoteRequest;

    // Validate required fields
    if (!body.dealType || !body.asOfDate || body.vehiclePrice === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: dealType, asOfDate, vehiclePrice",
      });
    }

    // Resolve tax context (which state's rules to use)
    const rooftop: RooftopConfig =
      body.rooftop ??
      createSimpleRooftopConfig(
        body.dealerStateCode ?? body.deal.registrationState ?? "IN",
        `Dealer in ${body.dealerStateCode ?? "IN"}`
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
    let taxRates = body.rates ?? [{ label: "STATE", rate: 0.07 }];
    let localTaxInfo = null;

    if (
      rules.vehicleTaxScheme === "STATE_PLUS_LOCAL" &&
      body.deal.zipCode &&
      !body.rates
    ) {
      try {
        localTaxInfo = await getLocalTaxRate(
          body.deal.zipCode,
          context.primaryStateCode
        );
        taxRates = buildRateComponentsFromLocalInfo(localTaxInfo);
      } catch (error) {
        console.warn(
          `[TaxRoutes] Could not fetch local tax rates for ZIP ${body.deal.zipCode}:`,
          error
        );
        // Continue with default rates
      }
    }

    // Build base tax calculation input fields
    const baseFields = {
      stateCode: context.primaryStateCode,
      asOfDate: body.asOfDate,

      // Context fields (for future reciprocity logic)
      homeStateCode: context.buyerResidenceStateCode,
      registrationStateCode: context.registrationStateCode,
      originTaxInfo: body.originTaxInfo,

      // Financial fields
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

      // Tax rates (from local lookup or provided rates)
      rates: taxRates,

      // Advanced
      vehicleClass: body.vehicleClass,
      gvw: body.gvw,
      customerIsNewResident: body.customerIsNewResident,
    };

    // Build tax calculation input based on deal type
    const taxInput: TaxCalculationInput = body.dealType === "LEASE"
      ? {
          ...baseFields,
          dealType: "LEASE" as const,
          grossCapCost: body.grossCapCost ?? body.vehiclePrice,
          capReductionCash: body.capReductionCash ?? 0,
          capReductionTradeIn: body.capReductionTradeIn ?? body.tradeInValue ?? 0,
          capReductionRebateManufacturer: body.capReductionRebateManufacturer ?? body.rebateManufacturer ?? 0,
          capReductionRebateDealer: body.capReductionRebateDealer ?? body.rebateDealer ?? 0,
          basePayment: body.basePayment ?? 0,
          paymentCount: body.paymentCount ?? 36,
        }
      : {
          ...baseFields,
          dealType: "RETAIL" as const,
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
    console.error("Tax quote error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// GET /api/tax/states - List All Supported States
// ============================================================================

router.get("/states", (req: Request, res: Response) => {
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

// ============================================================================
// GET /api/tax/states/:code - Get State-Specific Tax Rules
// ============================================================================

router.get("/states/:code", (req: Request, res: Response) => {
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

export default router;
