/**
 * Comprehensive 50-State Automotive Tax Data
 * Current as of 2024
 * 
 * This module contains accurate tax rates, fees, and rules for all 50 US states
 * plus DC, including special automotive tax considerations.
 */

export interface StateTax {
  state: string;
  stateCode: string;
  stateName: string;
  baseTaxRate: number; // State sales tax rate (as decimal, e.g., 0.0625 for 6.25%)
  
  // Trade-in handling
  tradeInCredit: 'full' | 'partial' | 'none' | 'tax_on_difference';
  tradeInCreditLimit?: number; // Dollar limit for partial credit states
  tradeInNotes?: string;
  
  // Documentation fees
  maxDocFee?: number; // Maximum allowed documentation fee (null = no limit)
  docFeeTaxable: boolean; // Whether doc fees are subject to sales tax
  
  // Title and registration fees
  titleFee: number;
  registrationFeeBase: number; // Base registration fee (actual may vary by vehicle value/weight)
  registrationNotes?: string;
  
  // Luxury/additional taxes
  luxuryTaxThreshold?: number;
  luxuryTaxRate?: number;
  
  // Local tax information
  hasLocalTax: boolean;
  localTaxRanges: { min: number; max: number }; // Typical range of local tax rates
  averageLocalTax: number; // Average local tax rate for estimation
  
  // Electric vehicle considerations
  evIncentive?: number; // State EV purchase incentive
  evFee?: number; // Annual EV registration fee
  
  // Special rules and notes
  capOnTax?: number; // Some states cap the total tax amount
  specialRules?: string[];
  notes?: string;
}

export interface LocalTaxRate {
  zipCode: string;
  city?: string;
  county?: string;
  localTaxRate: number; // Combined local rate (county + city + special districts)
  effectiveDate?: string;
}

// Comprehensive state tax data (2024 rates)
export const STATE_TAX_DATA: Record<string, StateTax> = {
  // ALABAMA
  AL: {
    state: 'AL',
    stateCode: 'AL',
    stateName: 'Alabama',
    baseTaxRate: 0.04,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 18,
    registrationFeeBase: 23,
    hasLocalTax: true,
    localTaxRanges: { min: 0.01, max: 0.07 },
    averageLocalTax: 0.0514,
    evFee: 200,
    notes: 'County and city taxes can add up to 7% additional. Trade-in credit applies to the difference.'
  },

  // ALASKA
  AK: {
    state: 'AK',
    stateCode: 'AK',
    stateName: 'Alaska',
    baseTaxRate: 0, // No state sales tax
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 15,
    registrationFeeBase: 100,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.075 },
    averageLocalTax: 0.0143,
    notes: 'No state sales tax, but some municipalities charge local sales tax up to 7.5%.'
  },

  // ARIZONA
  AZ: {
    state: 'AZ',
    stateCode: 'AZ',
    stateName: 'Arizona',
    baseTaxRate: 0.056, // Vehicle License Tax (VLT) instead of sales tax
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 499,
    titleFee: 4,
    registrationFeeBase: 8,
    hasLocalTax: true,
    localTaxRanges: { min: 0.0025, max: 0.04 },
    averageLocalTax: 0.028,
    evFee: 0,
    specialRules: [
      'Uses Vehicle License Tax (VLT) instead of sales tax',
      'VLT rate decreases annually based on vehicle age'
    ],
    notes: 'Arizona charges VLT based on 60% of MSRP, decreasing annually.'
  },

  // ARKANSAS
  AR: {
    state: 'AR',
    stateCode: 'AR',
    stateName: 'Arkansas',
    baseTaxRate: 0.065,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 10,
    registrationFeeBase: 17,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.055 },
    averageLocalTax: 0.0291,
    evFee: 200,
    notes: 'Trade-in credit reduces taxable amount. Local taxes can add up to 5.5%.'
  },

  // CALIFORNIA
  CA: {
    state: 'CA',
    stateCode: 'CA',
    stateName: 'California',
    baseTaxRate: 0.0725,
    tradeInCredit: 'none',
    docFeeTaxable: true,
    maxDocFee: 85,
    titleFee: 23,
    registrationFeeBase: 74,
    hasLocalTax: true,
    localTaxRanges: { min: 0.01, max: 0.035 },
    averageLocalTax: 0.0157,
    evIncentive: 2000, // Clean Vehicle Rebate Project
    evFee: 100,
    specialRules: [
      'No trade-in tax credit',
      'Doc fee strictly limited to $85',
      'Registration based on vehicle value'
    ],
    notes: 'California has no trade-in tax credit. Total tax can exceed 10% in some areas.'
  },

  // COLORADO
  CO: {
    state: 'CO',
    stateCode: 'CO',
    stateName: 'Colorado',
    baseTaxRate: 0.029,
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 699.5,
    titleFee: 7.2,
    registrationFeeBase: 41.5,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.0811 },
    averageLocalTax: 0.0465,
    evIncentive: 2500,
    evFee: 50,
    notes: 'No trade-in credit. Local taxes vary significantly by county and city.'
  },

  // CONNECTICUT
  CT: {
    state: 'CT',
    stateCode: 'CT',
    stateName: 'Connecticut',
    baseTaxRate: 0.0635,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 699,
    titleFee: 25,
    registrationFeeBase: 120,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    luxuryTaxThreshold: 50000,
    luxuryTaxRate: 0.0775,
    evIncentive: 5000,
    evFee: 0,
    specialRules: [
      'Luxury tax of 7.75% on vehicles over $50,000'
    ],
    notes: 'Trade-in credit available. Luxury tax applies to vehicles over $50,000.'
  },

  // DELAWARE
  DE: {
    state: 'DE',
    stateCode: 'DE',
    stateName: 'Delaware',
    baseTaxRate: 0, // No sales tax
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 429,
    titleFee: 35,
    registrationFeeBase: 40,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 2500,
    evFee: 0,
    specialRules: [
      'Document fee of 4.25% of vehicle price or $429, whichever is less'
    ],
    notes: 'No sales tax, but 4.25% document fee on vehicle purchases.'
  },

  // FLORIDA
  FL: {
    state: 'FL',
    stateCode: 'FL',
    stateName: 'Florida',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 399,
    titleFee: 77.25,
    registrationFeeBase: 28.05,
    hasLocalTax: true,
    localTaxRanges: { min: 0.005, max: 0.02 },
    averageLocalTax: 0.0105,
    evFee: 0,
    capOnTax: 1500, // Cap on discretionary sales surtax
    notes: 'Trade-in credit available. County surtax can add up to 2%. Doc fee max $399.'
  },

  // GEORGIA
  GA: {
    state: 'GA',
    stateCode: 'GA',
    stateName: 'Georgia',
    baseTaxRate: 0.0675, // Title Ad Valorem Tax (TAVT)
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: 699,
    titleFee: 20,
    registrationFeeBase: 20,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evFee: 213,
    specialRules: [
      'Uses Title Ad Valorem Tax (TAVT) instead of annual ad valorem tax',
      'One-time TAVT payment at purchase'
    ],
    notes: 'Georgia charges 6.75% TAVT on fair market value. Trade-in credit available.'
  },

  // HAWAII
  HI: {
    state: 'HI',
    stateCode: 'HI',
    stateName: 'Hawaii',
    baseTaxRate: 0.04,
    tradeInCredit: 'none',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 5,
    registrationFeeBase: 45,
    hasLocalTax: true,
    localTaxRanges: { min: 0.0025, max: 0.005 },
    averageLocalTax: 0.0044,
    evFee: 0,
    notes: 'No trade-in credit. County surcharge can add 0.25% to 0.5%.'
  },

  // IDAHO
  ID: {
    state: 'ID',
    stateCode: 'ID',
    stateName: 'Idaho',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 14,
    registrationFeeBase: 69,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.03 },
    averageLocalTax: 0.0003,
    evFee: 140,
    notes: 'Trade-in credit available. Some resort cities add local option tax.'
  },

  // ILLINOIS
  IL: {
    state: 'IL',
    stateCode: 'IL',
    stateName: 'Illinois',
    baseTaxRate: 0.0625,
    tradeInCredit: 'partial',
    tradeInCreditLimit: 10000,
    tradeInNotes: 'Trade-in credit limited to first $10,000 of trade value',
    docFeeTaxable: true,
    maxDocFee: 300,
    titleFee: 150,
    registrationFeeBase: 151,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.0475 },
    averageLocalTax: 0.0249,
    evFee: 251,
    notes: 'Trade-in credit on first $10,000. Chicago adds 1.25% city tax.'
  },

  // INDIANA
  IN: {
    state: 'IN',
    stateCode: 'IN',
    stateName: 'Indiana',
    baseTaxRate: 0.07,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: 250,
    titleFee: 21.35,
    registrationFeeBase: 21.35,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evFee: 150,
    notes: 'Trade-in credit available. Flat 7% state tax with no local additions.'
  },

  // IOWA
  IA: {
    state: 'IA',
    stateCode: 'IA',
    stateName: 'Iowa',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: 250,
    titleFee: 25,
    registrationFeeBase: 0.01, // 1% of vehicle value up to $400
    registrationNotes: 'Registration is 1% of vehicle value, max $400',
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.01 },
    averageLocalTax: 0.0082,
    evFee: 130,
    notes: 'Trade-in credit available. Registration fee based on vehicle value.'
  },

  // KANSAS
  KS: {
    state: 'KS',
    stateCode: 'KS',
    stateName: 'Kansas',
    baseTaxRate: 0.065,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 10,
    registrationFeeBase: 42.5,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.04 },
    averageLocalTax: 0.0217,
    evFee: 100,
    notes: 'Trade-in credit available. Local taxes can add up to 4%.'
  },

  // KENTUCKY
  KY: {
    state: 'KY',
    stateCode: 'KY',
    stateName: 'Kentucky',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 9,
    registrationFeeBase: 21,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evFee: 120,
    notes: 'Trade-in credit available. 6% state tax, no local additions.'
  },

  // LOUISIANA
  LA: {
    state: 'LA',
    stateCode: 'LA',
    stateName: 'Louisiana',
    baseTaxRate: 0.0445,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 250,
    titleFee: 68.5,
    registrationFeeBase: 20,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.07 },
    averageLocalTax: 0.05,
    evFee: 110,
    notes: 'Trade-in credit available. Parish taxes can be significant.'
  },

  // MAINE
  ME: {
    state: 'ME',
    stateCode: 'ME',
    stateName: 'Maine',
    baseTaxRate: 0.055,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 599,
    titleFee: 33,
    registrationFeeBase: 35,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 2000,
    evFee: 0,
    notes: 'Trade-in credit available. 5.5% state tax with no local additions.'
  },

  // MARYLAND
  MD: {
    state: 'MD',
    stateCode: 'MD',
    stateName: 'Maryland',
    baseTaxRate: 0.06,
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 500,
    titleFee: 100,
    registrationFeeBase: 135,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 3000,
    evFee: 0,
    notes: 'No trade-in credit. 6% excise tax on vehicle purchases.'
  },

  // MASSACHUSETTS
  MA: {
    state: 'MA',
    stateCode: 'MA',
    stateName: 'Massachusetts',
    baseTaxRate: 0.0625,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 399,
    titleFee: 75,
    registrationFeeBase: 60,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 2500,
    evFee: 0,
    notes: 'Trade-in credit available. 6.25% state tax, no local additions.'
  },

  // MICHIGAN
  MI: {
    state: 'MI',
    stateCode: 'MI',
    stateName: 'Michigan',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 250,
    titleFee: 15,
    registrationFeeBase: 135,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evFee: 140,
    notes: 'Trade-in credit available. 6% state tax, no local additions.'
  },

  // MINNESOTA
  MN: {
    state: 'MN',
    stateCode: 'MN',
    stateName: 'Minnesota',
    baseTaxRate: 0.06875,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 125,
    titleFee: 10.25,
    registrationFeeBase: 10,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.0055,
    evFee: 75,
    notes: 'Trade-in credit available. Some transit districts add local tax.'
  },

  // MISSISSIPPI
  MS: {
    state: 'MS',
    stateCode: 'MS',
    stateName: 'Mississippi',
    baseTaxRate: 0.05,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 14,
    registrationFeeBase: 14,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.0007,
    evFee: 150,
    notes: 'Trade-in credit available. 5% state tax on vehicles.'
  },

  // MISSOURI
  MO: {
    state: 'MO',
    stateCode: 'MO',
    stateName: 'Missouri',
    baseTaxRate: 0.04225,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 199,
    titleFee: 11,
    registrationFeeBase: 24,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.0525 },
    averageLocalTax: 0.0391,
    evFee: 75,
    notes: 'Trade-in credit available. Local taxes can be significant.'
  },

  // MONTANA
  MT: {
    state: 'MT',
    stateCode: 'MT',
    stateName: 'Montana',
    baseTaxRate: 0, // No sales tax
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 12.5,
    registrationFeeBase: 30.5,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.03 },
    averageLocalTax: 0,
    evFee: 0,
    notes: 'No state sales tax. Some resort areas have local option tax.'
  },

  // NEBRASKA
  NE: {
    state: 'NE',
    stateCode: 'NE',
    stateName: 'Nebraska',
    baseTaxRate: 0.055,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 10,
    registrationFeeBase: 15,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.014,
    evFee: 75,
    notes: 'Trade-in credit available. Local taxes up to 2%.'
  },

  // NEVADA
  NV: {
    state: 'NV',
    stateCode: 'NV',
    stateName: 'Nevada',
    baseTaxRate: 0.0685,
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 599,
    titleFee: 28.25,
    registrationFeeBase: 33,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.01475 },
    averageLocalTax: 0.0129,
    evFee: 0,
    notes: 'No trade-in credit. Local taxes can add up to 1.475%.'
  },

  // NEW HAMPSHIRE
  NH: {
    state: 'NH',
    stateCode: 'NH',
    stateName: 'New Hampshire',
    baseTaxRate: 0, // No sales tax
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 399,
    titleFee: 25,
    registrationFeeBase: 96,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evFee: 0,
    notes: 'No sales tax on vehicle purchases.'
  },

  // NEW JERSEY
  NJ: {
    state: 'NJ',
    stateCode: 'NJ',
    stateName: 'New Jersey',
    baseTaxRate: 0.06625,
    tradeInCredit: 'none',
    docFeeTaxable: true,
    maxDocFee: 899,
    titleFee: 60,
    registrationFeeBase: 71.5,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 4000,
    evFee: 0,
    notes: 'No trade-in credit. 6.625% state tax.'
  },

  // NEW MEXICO
  NM: {
    state: 'NM',
    stateCode: 'NM',
    stateName: 'New Mexico',
    baseTaxRate: 0.04,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 5,
    registrationFeeBase: 27,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.04875 },
    averageLocalTax: 0.0351,
    evFee: 0,
    notes: 'Trade-in credit available. 4% excise tax on vehicles.'
  },

  // NEW YORK
  NY: {
    state: 'NY',
    stateCode: 'NY',
    stateName: 'New York',
    baseTaxRate: 0.04,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 175,
    titleFee: 50,
    registrationFeeBase: 26,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.04875 },
    averageLocalTax: 0.045,
    evIncentive: 2000,
    evFee: 0,
    specialRules: [
      'NYC adds 4.5% tax on top of state tax'
    ],
    notes: 'Trade-in credit available. NYC has 8.875% total tax.'
  },

  // NORTH CAROLINA
  NC: {
    state: 'NC',
    stateCode: 'NC',
    stateName: 'North Carolina',
    baseTaxRate: 0.03, // Highway Use Tax
    tradeInCredit: 'partial',
    tradeInCreditLimit: null,
    tradeInNotes: 'Trade-in credit up to tax on purchased vehicle',
    docFeeTaxable: false,
    maxDocFee: 699,
    titleFee: 56,
    registrationFeeBase: 38.75,
    hasLocalTax: true,
    localTaxRanges: { min: 0.02, max: 0.0275 },
    averageLocalTax: 0.0218,
    evFee: 140,
    capOnTax: 2000,
    specialRules: [
      'Highway Use Tax capped at $2,000 for vehicles over $66,667'
    ],
    notes: '3% Highway Use Tax with $2,000 cap. Trade-in credit available.'
  },

  // NORTH DAKOTA
  ND: {
    state: 'ND',
    stateCode: 'ND',
    stateName: 'North Dakota',
    baseTaxRate: 0.05,
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 5,
    registrationFeeBase: 49,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.03 },
    averageLocalTax: 0.0196,
    evFee: 120,
    notes: 'No trade-in credit. 5% motor vehicle excise tax.'
  },

  // OHIO
  OH: {
    state: 'OH',
    stateCode: 'OH',
    stateName: 'Ohio',
    baseTaxRate: 0.0575,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 250,
    titleFee: 15,
    registrationFeeBase: 31,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.0225 },
    averageLocalTax: 0.0142,
    evFee: 200,
    notes: 'Trade-in credit available. County tax can add up to 2.25%.'
  },

  // OKLAHOMA
  OK: {
    state: 'OK',
    stateCode: 'OK',
    stateName: 'Oklahoma',
    baseTaxRate: 0.0325, // Excise tax on vehicles
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 11,
    registrationFeeBase: 96,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.065 },
    averageLocalTax: 0.0442,
    evFee: 110,
    notes: 'Trade-in credit available. 3.25% excise tax plus local taxes.'
  },

  // OREGON
  OR: {
    state: 'OR',
    stateCode: 'OR',
    stateName: 'Oregon',
    baseTaxRate: 0, // No sales tax
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 150,
    titleFee: 110,
    registrationFeeBase: 122,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 2500,
    evFee: 0,
    specialRules: [
      'Privilege tax of 0.5% on vehicles 20 MPG or less'
    ],
    notes: 'No sales tax. Privilege tax on low-MPG vehicles.'
  },

  // PENNSYLVANIA
  PA: {
    state: 'PA',
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 58,
    registrationFeeBase: 39,
    hasLocalTax: true,
    localTaxRanges: { min: 0.01, max: 0.02 },
    averageLocalTax: 0.0034,
    evFee: 0,
    specialRules: [
      'Allegheny County adds 1% tax',
      'Philadelphia adds 2% tax'
    ],
    notes: 'Trade-in credit available. Philadelphia has 8% total tax.'
  },

  // RHODE ISLAND
  RI: {
    state: 'RI',
    stateCode: 'RI',
    stateName: 'Rhode Island',
    baseTaxRate: 0.07,
    tradeInCredit: 'partial',
    tradeInCreditLimit: null,
    tradeInNotes: 'Trade-in credit up to tax on purchased vehicle',
    docFeeTaxable: true,
    maxDocFee: 399,
    titleFee: 52.5,
    registrationFeeBase: 65,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 2500,
    evFee: 0,
    notes: 'Trade-in credit up to value of new vehicle. 7% state tax.'
  },

  // SOUTH CAROLINA
  SC: {
    state: 'SC',
    stateCode: 'SC',
    stateName: 'South Carolina',
    baseTaxRate: 0.05,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: 399,
    titleFee: 15,
    registrationFeeBase: 40,
    hasLocalTax: true,
    localTaxRanges: { min: 0.01, max: 0.03 },
    averageLocalTax: 0.0143,
    evFee: 120,
    capOnTax: 500,
    specialRules: [
      'Sales tax capped at $500 per vehicle'
    ],
    notes: 'Trade-in credit available. 5% tax capped at $500.'
  },

  // SOUTH DAKOTA
  SD: {
    state: 'SD',
    stateCode: 'SD',
    stateName: 'South Dakota',
    baseTaxRate: 0.04,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 10,
    registrationFeeBase: 36,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.019,
    evFee: 50,
    notes: 'Trade-in credit available. 4% excise tax on vehicles.'
  },

  // TENNESSEE
  TN: {
    state: 'TN',
    stateCode: 'TN',
    stateName: 'Tennessee',
    baseTaxRate: 0.07,
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: 599,
    titleFee: 14,
    registrationFeeBase: 29,
    hasLocalTax: true,
    localTaxRanges: { min: 0.0125, max: 0.0275 },
    averageLocalTax: 0.0247,
    evFee: 100,
    notes: 'No trade-in credit. Local tax 1.25-2.75% on first $1,600.'
  },

  // TEXAS
  TX: {
    state: 'TX',
    stateCode: 'TX',
    stateName: 'Texas',
    baseTaxRate: 0.0625,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 150,
    titleFee: 33,
    registrationFeeBase: 51.75,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.0192,
    evFee: 200,
    notes: 'Trade-in credit available. Local taxes up to 2% for total of 8.25%.'
  },

  // UTAH
  UT: {
    state: 'UT',
    stateCode: 'UT',
    stateName: 'Utah',
    baseTaxRate: 0.0485,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 399,
    titleFee: 6,
    registrationFeeBase: 44,
    hasLocalTax: true,
    localTaxRanges: { min: 0.0125, max: 0.035 },
    averageLocalTax: 0.0221,
    evFee: 120,
    notes: 'Trade-in credit available. Local taxes can be significant.'
  },

  // VERMONT
  VT: {
    state: 'VT',
    stateCode: 'VT',
    stateName: 'Vermont',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 35,
    registrationFeeBase: 76,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.01 },
    averageLocalTax: 0.0024,
    evIncentive: 4000,
    evFee: 0,
    notes: 'Trade-in credit available. Some towns add 1% local option tax.'
  },

  // VIRGINIA
  VA: {
    state: 'VA',
    stateCode: 'VA',
    stateName: 'Virginia',
    baseTaxRate: 0.0415, // Motor vehicle sales tax
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: 899,
    titleFee: 15,
    registrationFeeBase: 40.75,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.01 },
    averageLocalTax: 0.0035,
    evFee: 0,
    notes: 'Trade-in credit available. 4.15% motor vehicle sales tax.'
  },

  // WASHINGTON
  WA: {
    state: 'WA',
    stateCode: 'WA',
    stateName: 'Washington',
    baseTaxRate: 0.065,
    tradeInCredit: 'none',
    docFeeTaxable: true,
    maxDocFee: 200,
    titleFee: 15,
    registrationFeeBase: 68.25,
    hasLocalTax: true,
    localTaxRanges: { min: 0.005, max: 0.04 },
    averageLocalTax: 0.029,
    evFee: 150,
    notes: 'No trade-in credit. Total tax can exceed 10% in Seattle area.'
  },

  // WEST VIRGINIA
  WV: {
    state: 'WV',
    stateCode: 'WV',
    stateName: 'West Virginia',
    baseTaxRate: 0.06,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: 399,
    titleFee: 15,
    registrationFeeBase: 51.5,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.01 },
    averageLocalTax: 0.007,
    evFee: 200,
    notes: 'Trade-in credit available. Some cities add up to 1%.'
  },

  // WISCONSIN
  WI: {
    state: 'WI',
    stateCode: 'WI',
    stateName: 'Wisconsin',
    baseTaxRate: 0.05,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: true,
    maxDocFee: null,
    titleFee: 164.5,
    registrationFeeBase: 85,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.006 },
    averageLocalTax: 0.0044,
    evFee: 100,
    notes: 'Trade-in credit available. County tax up to 0.6%.'
  },

  // WYOMING
  WY: {
    state: 'WY',
    stateCode: 'WY',
    stateName: 'Wyoming',
    baseTaxRate: 0.04,
    tradeInCredit: 'tax_on_difference',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 15,
    registrationFeeBase: 30,
    hasLocalTax: true,
    localTaxRanges: { min: 0, max: 0.02 },
    averageLocalTax: 0.0136,
    evFee: 200,
    notes: 'Trade-in credit available. Local taxes up to 2%.'
  },

  // WASHINGTON DC
  DC: {
    state: 'DC',
    stateCode: 'DC',
    stateName: 'District of Columbia',
    baseTaxRate: 0.06, // Excise tax on vehicles
    tradeInCredit: 'none',
    docFeeTaxable: false,
    maxDocFee: null,
    titleFee: 26,
    registrationFeeBase: 72,
    hasLocalTax: false,
    localTaxRanges: { min: 0, max: 0 },
    averageLocalTax: 0,
    evIncentive: 0,
    evFee: 0,
    notes: 'No trade-in credit. 6% excise tax on vehicle purchases.'
  }
};

// Sample local tax rates for major cities/counties
export const LOCAL_TAX_RATES: LocalTaxRate[] = [
  // California
  { zipCode: '90001', city: 'Los Angeles', county: 'Los Angeles', localTaxRate: 0.025 },
  { zipCode: '94102', city: 'San Francisco', county: 'San Francisco', localTaxRate: 0.01375 },
  { zipCode: '92101', city: 'San Diego', county: 'San Diego', localTaxRate: 0.0175 },
  { zipCode: '95814', city: 'Sacramento', county: 'Sacramento', localTaxRate: 0.0175 },
  
  // Texas
  { zipCode: '77001', city: 'Houston', county: 'Harris', localTaxRate: 0.02 },
  { zipCode: '78701', city: 'Austin', county: 'Travis', localTaxRate: 0.02 },
  { zipCode: '75201', city: 'Dallas', county: 'Dallas', localTaxRate: 0.02 },
  { zipCode: '78201', city: 'San Antonio', county: 'Bexar', localTaxRate: 0.02 },
  
  // Florida
  { zipCode: '33101', city: 'Miami', county: 'Miami-Dade', localTaxRate: 0.01 },
  { zipCode: '32801', city: 'Orlando', county: 'Orange', localTaxRate: 0.005 },
  { zipCode: '33601', city: 'Tampa', county: 'Hillsborough', localTaxRate: 0.015 },
  { zipCode: '32202', city: 'Jacksonville', county: 'Duval', localTaxRate: 0.015 },
  
  // New York
  { zipCode: '10001', city: 'New York City', county: 'New York', localTaxRate: 0.04875 },
  { zipCode: '11201', city: 'Brooklyn', county: 'Kings', localTaxRate: 0.04875 },
  { zipCode: '10451', city: 'Bronx', county: 'Bronx', localTaxRate: 0.04875 },
  { zipCode: '14201', city: 'Buffalo', county: 'Erie', localTaxRate: 0.0475 },
  
  // Illinois
  { zipCode: '60601', city: 'Chicago', county: 'Cook', localTaxRate: 0.0475 },
  { zipCode: '60101', city: 'Addison', county: 'DuPage', localTaxRate: 0.0175 },
  { zipCode: '61601', city: 'Peoria', county: 'Peoria', localTaxRate: 0.035 },
  { zipCode: '62701', city: 'Springfield', county: 'Sangamon', localTaxRate: 0.03 },
  
  // Add more as needed for accurate calculations
];

/**
 * Get complete tax information for a state
 */
export function getStateTaxInfo(stateCode: string): StateTax | null {
  return STATE_TAX_DATA[stateCode.toUpperCase()] || null;
}

/**
 * Get local tax rate by ZIP code
 */
export function getLocalTaxRate(zipCode: string): LocalTaxRate | null {
  return LOCAL_TAX_RATES.find(rate => rate.zipCode === zipCode) || null;
}

/**
 * Calculate effective total tax rate (state + local)
 */
export function getEffectiveTaxRate(stateCode: string, zipCode?: string): number {
  const stateTax = getStateTaxInfo(stateCode);
  if (!stateTax) return 0;
  
  let effectiveRate = stateTax.baseTaxRate;
  
  if (zipCode) {
    const localTax = getLocalTaxRate(zipCode);
    if (localTax) {
      effectiveRate += localTax.localTaxRate;
    } else if (stateTax.hasLocalTax) {
      // Use average if specific ZIP not found but state has local taxes
      effectiveRate += stateTax.averageLocalTax;
    }
  }
  
  return effectiveRate;
}

/**
 * Check if a state allows trade-in tax credit
 */
export function hasTradeInCredit(stateCode: string): boolean {
  const stateTax = getStateTaxInfo(stateCode);
  return stateTax ? stateTax.tradeInCredit !== 'none' : false;
}

/**
 * Get all states sorted alphabetically
 */
export function getAllStates(): StateTax[] {
  return Object.values(STATE_TAX_DATA).sort((a, b) => 
    a.stateName.localeCompare(b.stateName)
  );
}