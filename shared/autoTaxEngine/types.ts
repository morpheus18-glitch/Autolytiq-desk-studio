// ============================================================================
// AUTO TAX ENGINE - TYPE DEFINITIONS (Retail + Lease DSL)
// ============================================================================

// ---- DSL: Global + Retail Rules ----

export type TradeInPolicy =
  | { type: "NONE" }
  | { type: "FULL" }
  | { type: "CAPPED"; capAmount: number } // e.g. MI cap
  | { type: "PERCENT"; percent: number }; // e.g. 80% credit

export interface RebateRule {
  appliesTo: "MANUFACTURER" | "DEALER" | "ANY";
  taxable: boolean; // if false, that portion reduces the taxable base
}

export interface FeeTaxRule {
  code: string; // e.g. "DOC_FEE", "SERVICE_CONTRACT", "GAP", "TITLE", "REG"
  taxable: boolean;
}

// How vehicle tax behaves vs generic sales tax system for that state
export type VehicleTaxScheme =
  | "STATE_ONLY" // flat vehicle tax, no local stacking (e.g. IN, MI, KY)
  | "STATE_PLUS_LOCAL" // full stacked jurisdictions (CA, CO, OH, IL, etc.)
  | "SPECIAL_HUT" // NC-style Highway Use Tax
  | "SPECIAL_TAVT" // GA-style Title Ad Valorem Tax
  | "DMV_PRIVILEGE_TAX"; // WV-style privilege/title tax

// ---- DSL: Lease-Specific Rules ----

export interface TitleFeeRule {
  code: string; // "TITLE", "EFILE", "MTA_SURCHARGE", "WHEEL_TAX"
  taxable: boolean;
  includedInCapCost: boolean; // if true, it's part of cap cost
  includedInUpfront: boolean; // if true, taxed at signing
  includedInMonthly: boolean; // if true, spread into payment
}

export type LeaseMethod =
  | "FULL_UPFRONT" // tax whole taxable base upfront (NJ, NY-style)
  | "MONTHLY" // tax each payment (IN-style)
  | "HYBRID" // some upfront + monthly
  | "NET_CAP_COST" // tax adjusted cap cost
  | "REDUCED_BASE"; // tax only certain portion (e.g. depreciation)

export type LeaseRebateBehavior =
  | "ALWAYS_TAXABLE"
  | "FOLLOW_RETAIL_RULE"
  | "NON_TAXABLE_IF_AT_SIGNING"
  | "NON_TAXABLE_IF_ASSIGNABLE";

export type LeaseDocFeeTaxability =
  | "ALWAYS"
  | "FOLLOW_RETAIL_RULE"
  | "NEVER"
  | "ONLY_UPFRONT";

export type LeaseTradeInCreditMode =
  | "NONE" // no trade credit on leases
  | "FULL" // full credit like retail
  | "CAP_COST_ONLY" // reduces cap cost but not separately credited
  | "APPLIED_TO_PAYMENT" // lowers payment, credit reflected there
  | "FOLLOW_RETAIL_RULE";

export type LeaseSpecialScheme =
  | "NONE"
  | "NY_MTR"
  | "NJ_LUXURY"
  | "PA_LEASE_TAX"
  | "IL_CHICAGO_COOK"
  | "TX_LEASE_SPECIAL"
  | "VA_USAGE"
  | "MD_UPFRONT_GAIN"
  | "CO_HOME_RULE_LEASE";

// ---- DSL: Reciprocity Rules (Cross-State Tax Credit) ----

export type ReciprocityMode =
  | "NONE" // no reciprocity, ignore prior tax
  | "CREDIT_UP_TO_STATE_RATE" // credit limited to what this state would charge
  | "CREDIT_FULL" // full credit for tax paid elsewhere
  | "HOME_STATE_ONLY"; // tax liability is determined by home/registration state

export type ReciprocityScope =
  | "RETAIL_ONLY"
  | "LEASE_ONLY"
  | "BOTH";

export interface ReciprocityRules {
  enabled: boolean;
  scope: ReciprocityScope;

  // Which mode this state uses for reciprocity
  homeStateBehavior: ReciprocityMode;

  // Does this state *require* proof to give credit?
  requireProofOfTaxPaid: boolean;

  // Is the credit based on tax PAID or just tax DUE in the other state?
  basis: "TAX_PAID" | "TAX_DUE_AT_OTHER_STATE_RATE";

  // Can the credit exceed this state's own tax?
  capAtThisStatesTax: boolean;

  // Does reciprocity logic differ for leases vs retail?
  // If true, you can branch behavior based on dealType.
  hasLeaseException: boolean;

  notes?: string;
}

export interface LeaseTaxRules {
  method: LeaseMethod;

  // Is cap cost reduction (cash, rebate, trade) itself considered taxable base?
  taxCapReduction: boolean;

  // How manufacturer/dealer rebates behave in leases
  rebateBehavior: LeaseRebateBehavior;

  // Doc fee behavior in leases
  docFeeTaxability: LeaseDocFeeTaxability;

  // Does the state allow trade-in credit on leases, and how?
  tradeInCredit: LeaseTradeInCreditMode;

  // Is rolled-in negative equity part of the taxable base in leases?
  negativeEquityTaxable: boolean;

  // Fee-level rules specific to leases (which fees get taxed in upfront vs monthly)
  feeTaxRules: FeeTaxRule[];

  // Title-related fee behavior in leases
  titleFeeRules: TitleFeeRule[];

  // Should taxable fees (doc, certain titling) be taxed upfront?
  taxFeesUpfront: boolean;

  // Special scheme indicator for more complex future handling
  specialScheme: LeaseSpecialScheme;

  notes?: string;
}

// ---- DSL: Full State Config ----

export interface TaxRulesConfig {
  stateCode: string; // "IN", "MI", etc.
  version: number; // bump when legal rules change

  // Retail side
  tradeInPolicy: TradeInPolicy;
  rebates: RebateRule[]; // default retail treatment
  docFeeTaxable: boolean;
  feeTaxRules: FeeTaxRule[];
  taxOnAccessories: boolean;
  taxOnNegativeEquity: boolean;
  taxOnServiceContracts: boolean;
  taxOnGap: boolean;
  vehicleTaxScheme: VehicleTaxScheme;
  vehicleUsesLocalSalesTax: boolean; // whether to apply local jurisdiction rates at all

  // Lease side
  leaseRules: LeaseTaxRules;

  // Reciprocity (cross-state tax credit)
  reciprocity: ReciprocityRules;

  extras?: Record<string, unknown>; // state-specific weirdness
}

// ---- Runtime Types ----

export type DealType = "RETAIL" | "LEASE";

export interface TaxRateComponent {
  label: string; // "STATE", "COUNTY", "CITY", "DISTRICT_1", etc.
  rate: number; // 0.065 = 6.5%
}

// Origin tax info for reciprocity calculations
export interface OriginTaxInfo {
  stateCode: string; // where tax was originally paid
  amount: number; // amount of tax already paid
  effectiveRate?: number; // optional, for audit/debug (amount / base)
}

// Retail + shared fields
export interface BaseDealFields {
  stateCode: string; // state whose rules we're applying NOW
  asOfDate: string; // ISO date
  dealType: DealType;

  // Reciprocity fields (for cross-state deals)
  homeStateCode?: string; // buyer's home/residence state
  registrationStateCode?: string; // where the vehicle will be titled/registered
  originTaxInfo?: OriginTaxInfo; // tax previously paid elsewhere (trade, prior title, etc.)

  vehiclePrice: number; // selling price (or agreed value for lease)
  accessoriesAmount: number;
  tradeInValue: number;
  rebateManufacturer: number;
  rebateDealer: number;
  docFee: number;
  otherFees: { code: string; amount: number }[];
  serviceContracts: number;
  gap: number;
  negativeEquity: number;
  taxAlreadyCollected: number;

  rates: TaxRateComponent[];
}

// Lease-specific fields (only used when dealType === "LEASE")
export interface LeaseFields {
  // Core lease math inputs
  grossCapCost: number; // starting cap
  capReductionCash: number;
  capReductionTradeIn: number;
  capReductionRebateManufacturer: number;
  capReductionRebateDealer: number;

  basePayment: number; // pre-tax payment per period
  paymentCount: number; // number of payments in term
}

export type TaxCalculationInput =
  | (BaseDealFields & { dealType: "RETAIL" })
  | (BaseDealFields & LeaseFields & { dealType: "LEASE" });

export interface TaxBaseBreakdown {
  vehicleBase: number; // for RETAIL or lease base when applicable
  feesBase: number;
  productsBase: number;
  totalTaxableBase: number;
}

// For retail or "single-shot" lease tax (FULL_UPFRONT)
export interface TaxAmountBreakdown {
  componentTaxes: {
    label: string;
    rate: number;
    amount: number;
  }[];
  totalTax: number;
}

// Lease-specific tax result (upfront + monthly)
export interface LeaseTaxBreakdown {
  upfrontTaxableBase: number; // base taxed at signing
  upfrontTaxes: TaxAmountBreakdown;

  paymentTaxableBasePerPeriod: number; // taxable amount of each payment
  paymentTaxesPerPeriod: TaxAmountBreakdown;

  totalTaxOverTerm: number; // upfront + all payments
}

// Debug info for both retail + lease
export interface AutoTaxDebug {
  appliedTradeIn: number;
  appliedRebatesNonTaxable: number;
  appliedRebatesTaxable: number;
  taxableDocFee: number;
  taxableFees: { code: string; amount: number }[];
  taxableServiceContracts: number;
  taxableGap: number;
  reciprocityCredit: number; // amount of tax credit from reciprocity
  notes: string[];
}

export interface TaxCalculationResult {
  mode: DealType;
  bases: TaxBaseBreakdown; // For RETAIL or overall lease base (if single-shot)
  taxes: TaxAmountBreakdown; // For RETAIL or upfront lease case
  leaseBreakdown?: LeaseTaxBreakdown; // Present when dealType === "LEASE"
  debug: AutoTaxDebug;
}
