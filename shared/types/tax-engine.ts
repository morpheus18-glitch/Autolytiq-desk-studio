/**
 * Tax Engine Types
 *
 * Centralized type definitions for the automated tax calculation system.
 * Customer address is the single source of truth for tax jurisdiction.
 */

/**
 * Customer Address - The single source of truth for tax jurisdiction
 * Captured and validated on the Customer card via Google Maps
 */
export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;           // Full name: "California"
  stateCode: string;       // 2-letter: "CA"
  postalCode: string;      // ZIP code
  country: string;         // "US"
  county?: string;         // Critical for local tax: "Los Angeles"
  countyFips?: string;     // FIPS code for precise matching
  lat?: number;
  lng?: number;
  placeId?: string;        // Google Place ID for re-validation
  validatedAt?: string;    // ISO timestamp of last validation
  validationSource?: 'google' | 'usps' | 'manual';
}

/**
 * Tax Method - How tax is calculated (critical for leases)
 */
export type TaxMethod =
  | 'TAX_ON_PRICE'           // Standard retail: tax on selling price
  | 'TAX_ON_PAYMENT'         // CA, TX: tax each lease payment
  | 'TAX_ON_CAP_COST'        // NY, NJ: tax full cap cost upfront
  | 'TAX_ON_CAP_REDUCTION'   // IL: tax only cap cost reduction
  | 'SPECIAL_TAVT'           // GA: Title Ad Valorem Tax
  | 'SPECIAL_HUT'            // NC: Highway Use Tax
  | 'SPECIAL_PRIVILEGE';     // WV: Privilege Tax

/**
 * TaxProfile - Computed tax configuration attached to a Deal
 * This is the output of the tax engine
 */
export interface TaxProfile {
  // Source identification
  customerId: string;
  addressSnapshot: CustomerAddress;  // Frozen copy at calculation time
  calculatedAt: string;              // ISO timestamp

  // Jurisdiction determination
  jurisdiction: {
    stateCode: string;
    countyName?: string;
    cityName?: string;
    specialDistricts?: string[];
  };

  // Rate breakdown
  rates: {
    stateRate: number;       // e.g., 0.0725 for CA
    countyRate: number;      // e.g., 0.01
    cityRate: number;        // e.g., 0.0075
    specialRate: number;     // e.g., 0.005 for transit district
    combinedRate: number;    // Sum of all rates
  };

  // Tax method (critical for leases)
  method: TaxMethod;

  // State-specific rules
  rules: {
    tradeInReducesTaxBase: boolean;
    docFeeTaxable: boolean;
    docFeeCap?: number;
    gapTaxable: boolean;
    vscTaxable: boolean;
    luxuryTaxThreshold?: number;
    luxuryTaxRate?: number;
  };

  // Precomputed values for the deal
  precomputed?: {
    // For retail deals
    totalTaxableAmount?: number;
    estimatedTax?: number;

    // For lease deals
    monthlyTaxRate?: number;      // For TAX_ON_PAYMENT states
    upfrontTaxAmount?: number;    // For TAX_ON_CAP_COST states
    capCostTaxAmount?: number;    // For TAX_ON_CAP_COST_REDUCTION
  };

  // Reciprocity (if customer paid tax in another state)
  reciprocity?: {
    originState: string;
    creditAmount: number;
    applies: boolean;
  };
}

/**
 * Input for tax calculation
 */
export interface TaxQuoteInput {
  customerId: string;
  dealType: 'RETAIL' | 'LEASE';
  vehiclePrice: number;

  // Optional deal details for precomputation
  tradeAllowance?: number;
  tradePayoff?: number;
  downPayment?: number;
  term?: number;
  rebates?: number;
  dealerFees?: number;
  aftermarketProducts?: Array<{ type: string; price: number; taxable?: boolean }>;

  // Lease-specific
  msrp?: number;
  residualPercent?: number;
  moneyFactor?: number;
}

/**
 * Response from tax quote endpoint
 */
export interface TaxQuoteResponse {
  taxProfile: TaxProfile;
  success: boolean;
  message?: string;
}

/**
 * Deal fragment - only tax-relevant fields
 */
export interface DealTaxFields {
  id: string;
  customerId: string | null;
  taxProfile: TaxProfile | null;
  taxProfileOverride?: Partial<TaxProfile>;  // Manual override if needed
  useTaxOverride: boolean;                    // Flag to use override
}
