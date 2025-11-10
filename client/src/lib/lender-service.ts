import type { Lender, LenderProgram, ApprovedLender, RateRequest } from "@shared/schema";
import Decimal from "decimal.js";

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Credit score tiers for rate calculation
export const CREDIT_TIERS = {
  SUPER_PRIME: { min: 800, max: 850, label: "Super Prime", tier: 1 },
  PRIME_PLUS: { min: 740, max: 799, label: "Prime Plus", tier: 2 },
  PRIME: { min: 670, max: 739, label: "Prime", tier: 3 },
  NEAR_PRIME: { min: 580, max: 669, label: "Near Prime", tier: 4 },
  SUBPRIME: { min: 300, max: 579, label: "Subprime", tier: 5 },
} as const;

// Lender types
export const LENDER_TYPES = {
  PRIME: "prime",
  CAPTIVE: "captive",
  CREDIT_UNION: "credit_union",
  SUBPRIME: "subprime",
  BHPH: "bhph",
} as const;

// Mock lenders data with realistic information
export const MOCK_LENDERS: Array<Lender & { programs: LenderProgram[] }> = [
  // Prime Lenders
  {
    id: "wells-fargo",
    name: "Wells Fargo Auto",
    logo: "https://logo.clearbit.com/wellsfargo.com",
    type: LENDER_TYPES.PRIME,
    minCreditScore: 650,
    maxLtv: "125.00",
    maxDti: "45.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 250,
    flatMaxBps: 200,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "RouteOne",
    maxFinanceAmount: "150000.00",
    minFinanceAmount: "5000.00",
    maxTerm: 84,
    minTerm: 12,
    newVehicleMaxAge: 1,
    usedVehicleMaxAge: 10,
    usedVehicleMaxMileage: 125000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "wf-new-auto",
        lenderId: "wells-fargo",
        name: "New Auto Standard",
        type: "retail",
        vehicleType: "new",
        minTerm: 24,
        maxTerm: 84,
        availableTerms: [24, 36, 48, 60, 72, 84],
        rateTiers: [
          { minScore: 800, maxScore: 850, apr: 3.99, buyRate: 3.49 },
          { minScore: 740, maxScore: 799, apr: 4.99, buyRate: 4.49 },
          { minScore: 670, maxScore: 739, apr: 6.49, buyRate: 5.99 },
          { minScore: 620, maxScore: 669, apr: 9.99, buyRate: 9.49 },
        ],
        minCreditScore: 620,
        maxLtv: "125.00",
        maxDti: "45.00",
        minDownPercent: "0.00",
        requirements: ["Proof of income", "Proof of residence", "Valid driver's license"],
        incentives: [],
        originationFee: "0.00",
        maxAdvance: "150000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "wf-used-auto",
        lenderId: "wells-fargo",
        name: "Used Auto Standard",
        type: "retail",
        vehicleType: "used",
        minTerm: 24,
        maxTerm: 72,
        availableTerms: [24, 36, 48, 60, 72],
        rateTiers: [
          { minScore: 800, maxScore: 850, apr: 4.99, buyRate: 4.49 },
          { minScore: 740, maxScore: 799, apr: 5.99, buyRate: 5.49 },
          { minScore: 670, maxScore: 739, apr: 7.99, buyRate: 7.49 },
          { minScore: 620, maxScore: 669, apr: 11.99, buyRate: 11.49 },
        ],
        minCreditScore: 620,
        maxLtv: "120.00",
        maxDti: "45.00",
        minDownPercent: "0.00",
        requirements: ["Proof of income", "Proof of residence", "Valid driver's license"],
        incentives: [],
        originationFee: "0.00",
        maxAdvance: "100000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "chase-auto",
    name: "Chase Auto Finance",
    logo: "https://logo.clearbit.com/chase.com",
    type: LENDER_TYPES.PRIME,
    minCreditScore: 660,
    maxLtv: "120.00",
    maxDti: "43.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 225,
    flatMaxBps: 175,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "Dealertrack",
    maxFinanceAmount: "125000.00",
    minFinanceAmount: "4000.00",
    maxTerm: 84,
    minTerm: 12,
    newVehicleMaxAge: 1,
    usedVehicleMaxAge: 10,
    usedVehicleMaxMileage: 125000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "chase-new-auto",
        lenderId: "chase-auto",
        name: "New Auto Preferred",
        type: "retail",
        vehicleType: "new",
        minTerm: 24,
        maxTerm: 84,
        availableTerms: [24, 36, 48, 60, 72, 84],
        rateTiers: [
          { minScore: 800, maxScore: 850, apr: 3.79, buyRate: 3.29 },
          { minScore: 740, maxScore: 799, apr: 4.79, buyRate: 4.29 },
          { minScore: 670, maxScore: 739, apr: 6.29, buyRate: 5.79 },
          { minScore: 620, maxScore: 669, apr: 9.49, buyRate: 8.99 },
        ],
        minCreditScore: 620,
        maxLtv: "120.00",
        maxDti: "43.00",
        minDownPercent: "0.00",
        requirements: ["Proof of income", "References", "Insurance verification"],
        incentives: ["$500 cash back for Chase customers"],
        originationFee: "0.00",
        maxAdvance: "125000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  // Captive Lenders
  {
    id: "ford-credit",
    name: "Ford Credit",
    logo: "https://logo.clearbit.com/ford.com",
    type: LENDER_TYPES.CAPTIVE,
    minCreditScore: 600,
    maxLtv: "130.00",
    maxDti: "50.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 300,
    flatMaxBps: 250,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "FordDirect",
    maxFinanceAmount: "150000.00",
    minFinanceAmount: "3000.00",
    maxTerm: 84,
    minTerm: 12,
    newVehicleMaxAge: 2,
    usedVehicleMaxAge: 12,
    usedVehicleMaxMileage: 150000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "ford-0-apr",
        lenderId: "ford-credit",
        name: "0% APR Special - Select Models",
        type: "promotional",
        vehicleType: "new",
        minTerm: 36,
        maxTerm: 72,
        availableTerms: [36, 48, 60, 72],
        rateTiers: [
          { minScore: 720, maxScore: 850, apr: 0.00, buyRate: 0.00 },
        ],
        minCreditScore: 720,
        maxLtv: "100.00",
        maxDti: "40.00",
        minDownPercent: "0.00",
        requirements: ["Tier 0-1 credit", "Must finance through Ford Credit", "Select models only"],
        incentives: ["0% APR for 72 months on F-150", "$1,000 bonus cash"],
        originationFee: "0.00",
        maxAdvance: "80000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ford-standard",
        lenderId: "ford-credit",
        name: "Ford Standard Retail",
        type: "retail",
        vehicleType: "new",
        minTerm: 24,
        maxTerm: 84,
        availableTerms: [24, 36, 48, 60, 72, 84],
        rateTiers: [
          { minScore: 800, maxScore: 850, apr: 4.49, buyRate: 3.99 },
          { minScore: 740, maxScore: 799, apr: 5.49, buyRate: 4.99 },
          { minScore: 670, maxScore: 739, apr: 6.99, buyRate: 6.49 },
          { minScore: 600, maxScore: 669, apr: 10.99, buyRate: 10.49 },
        ],
        minCreditScore: 600,
        maxLtv: "130.00",
        maxDti: "50.00",
        minDownPercent: "0.00",
        requirements: ["Proof of income", "Insurance verification"],
        incentives: [],
        originationFee: "0.00",
        maxAdvance: "150000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ford-lease",
        lenderId: "ford-credit",
        name: "Ford Red Carpet Lease",
        type: "lease",
        vehicleType: "new",
        minTerm: 24,
        maxTerm: 48,
        availableTerms: [24, 36, 39, 48],
        rateTiers: [
          { minScore: 700, maxScore: 850, moneyFactor: 0.00125 }, // ~3% APR
          { minScore: 640, maxScore: 699, moneyFactor: 0.00208 }, // ~5% APR
        ],
        minCreditScore: 640,
        maxLtv: "100.00",
        maxDti: "45.00",
        minDownPercent: "0.00",
        requirements: ["Tier A or B credit", "Comprehensive and collision insurance"],
        incentives: ["$2,500 lease cash on Explorer"],
        originationFee: "0.00",
        maxAdvance: null,
        moneyFactor: 0.00125,
        residualPercents: {
          "24": 0.62,
          "36": 0.54,
          "39": 0.52,
          "48": 0.46,
        },
        acquisitionFee: "695.00",
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "gm-financial",
    name: "GM Financial",
    logo: "https://logo.clearbit.com/gm.com",
    type: LENDER_TYPES.CAPTIVE,
    minCreditScore: 580,
    maxLtv: "125.00",
    maxDti: "50.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 275,
    flatMaxBps: 225,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "GMDirect",
    maxFinanceAmount: "150000.00",
    minFinanceAmount: "2500.00",
    maxTerm: 84,
    minTerm: 12,
    newVehicleMaxAge: 2,
    usedVehicleMaxAge: 12,
    usedVehicleMaxMileage: 150000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "gm-employee-pricing",
        lenderId: "gm-financial",
        name: "Employee Pricing Plus",
        type: "promotional",
        vehicleType: "new",
        minTerm: 36,
        maxTerm: 72,
        availableTerms: [36, 48, 60, 72],
        rateTiers: [
          { minScore: 700, maxScore: 850, apr: 1.90, buyRate: 1.90 },
          { minScore: 640, maxScore: 699, apr: 3.90, buyRate: 3.90 },
        ],
        minCreditScore: 640,
        maxLtv: "110.00",
        maxDti: "45.00",
        minDownPercent: "0.00",
        requirements: ["Tier 1-3 credit", "Employee pricing eligible"],
        incentives: ["Employee pricing on all 2024 models", "$500 bonus cash"],
        originationFee: "0.00",
        maxAdvance: "100000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  // Credit Unions
  {
    id: "penfed",
    name: "PenFed Credit Union",
    logo: "https://logo.clearbit.com/penfed.org",
    type: LENDER_TYPES.CREDIT_UNION,
    minCreditScore: 650,
    maxLtv: "125.00",
    maxDti: "40.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 150,
    flatMaxBps: 100,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "CUDL",
    maxFinanceAmount: "100000.00",
    minFinanceAmount: "500.00",
    maxTerm: 84,
    minTerm: 12,
    newVehicleMaxAge: 2,
    usedVehicleMaxAge: 15,
    usedVehicleMaxMileage: 175000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "penfed-new",
        lenderId: "penfed",
        name: "New Auto Loan",
        type: "retail",
        vehicleType: "new",
        minTerm: 36,
        maxTerm: 84,
        availableTerms: [36, 48, 60, 72, 84],
        rateTiers: [
          { minScore: 780, maxScore: 850, apr: 3.49, buyRate: 3.49 },
          { minScore: 720, maxScore: 779, apr: 4.49, buyRate: 4.49 },
          { minScore: 650, maxScore: 719, apr: 5.99, buyRate: 5.99 },
        ],
        minCreditScore: 650,
        maxLtv: "125.00",
        maxDti: "40.00",
        minDownPercent: "0.00",
        requirements: ["Membership required", "Proof of income"],
        incentives: ["Rate discount for automatic payments"],
        originationFee: "0.00",
        maxAdvance: "100000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  // Subprime Lenders
  {
    id: "santander",
    name: "Santander Consumer USA",
    logo: "https://logo.clearbit.com/santander.com",
    type: LENDER_TYPES.SUBPRIME,
    minCreditScore: 500,
    maxLtv: "140.00",
    maxDti: "55.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 400,
    flatMaxBps: 350,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "RouteOne",
    maxFinanceAmount: "75000.00",
    minFinanceAmount: "3000.00",
    maxTerm: 75,
    minTerm: 24,
    newVehicleMaxAge: 3,
    usedVehicleMaxAge: 15,
    usedVehicleMaxMileage: 200000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "santander-subprime",
        lenderId: "santander",
        name: "Subprime Auto Finance",
        type: "retail",
        vehicleType: "used",
        minTerm: 36,
        maxTerm: 72,
        availableTerms: [36, 48, 60, 72],
        rateTiers: [
          { minScore: 650, maxScore: 850, apr: 9.99, buyRate: 9.49 },
          { minScore: 600, maxScore: 649, apr: 14.99, buyRate: 14.49 },
          { minScore: 550, maxScore: 599, apr: 19.99, buyRate: 19.49 },
          { minScore: 500, maxScore: 549, apr: 24.99, buyRate: 24.49 },
        ],
        minCreditScore: 500,
        maxLtv: "140.00",
        maxDti: "55.00",
        minDownPercent: "10.00",
        requirements: ["Proof of income", "6 months employment", "Proof of residence"],
        incentives: [],
        originationFee: "595.00",
        maxAdvance: "50000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "exeter",
    name: "Exeter Finance",
    logo: null,
    type: LENDER_TYPES.SUBPRIME,
    minCreditScore: 525,
    maxLtv: "130.00",
    maxDti: "50.00",
    states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
    active: true,
    dealerReserveMaxBps: 350,
    flatMaxBps: 300,
    apiEndpoint: null,
    apiKey: null,
    routingCode: "Dealertrack",
    maxFinanceAmount: "50000.00",
    minFinanceAmount: "5000.00",
    maxTerm: 72,
    minTerm: 36,
    newVehicleMaxAge: 3,
    usedVehicleMaxAge: 12,
    usedVehicleMaxMileage: 150000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "exeter-standard",
        lenderId: "exeter",
        name: "Standard Program",
        type: "retail",
        vehicleType: "used",
        minTerm: 36,
        maxTerm: 72,
        availableTerms: [36, 48, 60, 72],
        rateTiers: [
          { minScore: 640, maxScore: 850, apr: 11.99, buyRate: 11.49 },
          { minScore: 580, maxScore: 639, apr: 16.99, buyRate: 16.49 },
          { minScore: 525, maxScore: 579, apr: 21.99, buyRate: 21.49 },
        ],
        minCreditScore: 525,
        maxLtv: "130.00",
        maxDti: "50.00",
        minDownPercent: "15.00",
        requirements: ["Stable employment", "Verifiable income", "Down payment"],
        incentives: [],
        originationFee: "495.00",
        maxAdvance: "40000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  // Buy Here Pay Here
  {
    id: "in-house",
    name: "In-House Financing",
    logo: null,
    type: LENDER_TYPES.BHPH,
    minCreditScore: 300,
    maxLtv: "100.00",
    maxDti: "60.00",
    states: ["CA"],
    active: true,
    dealerReserveMaxBps: 0,
    flatMaxBps: 0,
    apiEndpoint: null,
    apiKey: null,
    routingCode: null,
    maxFinanceAmount: "25000.00",
    minFinanceAmount: "2000.00",
    maxTerm: 48,
    minTerm: 12,
    newVehicleMaxAge: 5,
    usedVehicleMaxAge: 20,
    usedVehicleMaxMileage: 250000,
    createdAt: new Date(),
    updatedAt: new Date(),
    programs: [
      {
        id: "bhph-standard",
        lenderId: "in-house",
        name: "Buy Here Pay Here",
        type: "retail",
        vehicleType: "used",
        minTerm: 12,
        maxTerm: 48,
        availableTerms: [12, 24, 36, 48],
        rateTiers: [
          { minScore: 300, maxScore: 850, apr: 29.99, buyRate: 29.99 },
        ],
        minCreditScore: 300,
        maxLtv: "100.00",
        maxDti: "60.00",
        minDownPercent: "20.00",
        requirements: ["$1,500 minimum down", "Proof of income", "Local references"],
        incentives: [],
        originationFee: "995.00",
        maxAdvance: "20000.00",
        moneyFactor: null,
        residualPercents: {},
        acquisitionFee: null,
        active: true,
        effectiveDate: new Date(),
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

// Get credit tier based on score
export function getCreditTier(creditScore: number) {
  for (const [key, tier] of Object.entries(CREDIT_TIERS)) {
    if (creditScore >= tier.min && creditScore <= tier.max) {
      return { key, ...tier };
    }
  }
  return { key: "SUBPRIME", ...CREDIT_TIERS.SUBPRIME };
}

// Calculate monthly payment
export function calculateMonthlyPayment(
  principal: number,
  apr: number,
  termMonths: number
): number {
  const principalDec = new Decimal(principal);
  const aprDec = new Decimal(apr);
  
  if (apr === 0) {
    return principalDec.dividedBy(termMonths).toDP(2).toNumber();
  }
  
  const monthlyRate = aprDec.dividedBy(100).dividedBy(12);
  const onePlusRate = monthlyRate.plus(1);
  const powerTerm = onePlusRate.pow(termMonths);
  
  const payment = principalDec
    .times(monthlyRate.times(powerTerm))
    .dividedBy(powerTerm.minus(1));
  
  return payment.toDP(2).toNumber();
}

// Calculate total finance charge
export function calculateFinanceCharge(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  const totalPayments = new Decimal(monthlyPayment).times(termMonths);
  const principalDec = new Decimal(principal);
  return totalPayments.minus(principalDec).toDP(2).toNumber();
}

// Calculate LTV ratio
export function calculateLTV(
  loanAmount: number,
  vehicleValue: number
): number {
  const loanDec = new Decimal(loanAmount);
  const valueDec = new Decimal(vehicleValue);
  return loanDec.dividedBy(valueDec).times(100).toDP(2).toNumber();
}

// Calculate DTI ratio
export function calculateDTI(
  monthlyPayment: number,
  monthlyIncome: number,
  monthlyDebt: number = 0
): number {
  const totalDebt = new Decimal(monthlyPayment).plus(monthlyDebt);
  const incomeDec = new Decimal(monthlyIncome);
  return totalDebt.dividedBy(incomeDec).times(100).toDP(2).toNumber();
}

// Calculate approval likelihood
export function calculateApprovalLikelihood(
  creditScore: number,
  ltv: number,
  dti: number,
  lenderType: string
): "high" | "medium" | "low" {
  let score = 0;
  
  // Credit score factor (40%)
  if (creditScore >= 740) score += 40;
  else if (creditScore >= 670) score += 30;
  else if (creditScore >= 600) score += 20;
  else if (creditScore >= 550) score += 10;
  else score += 5;
  
  // LTV factor (30%)
  if (ltv <= 80) score += 30;
  else if (ltv <= 100) score += 20;
  else if (ltv <= 120) score += 10;
  else score += 5;
  
  // DTI factor (30%)
  if (dti <= 25) score += 30;
  else if (dti <= 35) score += 20;
  else if (dti <= 45) score += 10;
  else score += 5;
  
  // Adjust for lender type
  if (lenderType === LENDER_TYPES.SUBPRIME || lenderType === LENDER_TYPES.BHPH) {
    score += 10; // More lenient
  } else if (lenderType === LENDER_TYPES.PRIME) {
    score -= 10; // More strict
  }
  
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// Generate stipulations based on credit and loan details
export function generateStipulations(
  creditScore: number,
  ltv: number,
  dti: number,
  lenderType: string
): string[] {
  const stips: string[] = [];
  
  // Always required
  stips.push("Valid driver's license");
  stips.push("Proof of insurance");
  
  // Credit-based stips
  if (creditScore < 600) {
    stips.push("Last 2 months bank statements");
    stips.push("3 personal references");
    stips.push("Proof of residence (utility bill)");
  }
  
  if (creditScore < 650) {
    stips.push("Last 2 pay stubs");
    stips.push("Employment verification");
  } else if (creditScore < 700) {
    stips.push("Last pay stub");
  }
  
  // LTV-based stips
  if (ltv > 100) {
    stips.push("Gap insurance required");
  }
  
  if (ltv > 120) {
    stips.push("Additional collateral may be required");
  }
  
  // DTI-based stips
  if (dti > 40) {
    stips.push("Proof of additional income");
    stips.push("Co-signer may strengthen application");
  }
  
  // Lender-specific
  if (lenderType === LENDER_TYPES.CREDIT_UNION) {
    stips.push("Membership enrollment required");
  }
  
  if (lenderType === LENDER_TYPES.CAPTIVE) {
    stips.push("Must finance manufacturer vehicle");
  }
  
  return stips;
}

// Generate dealer reserve based on buy rate and max allowed
export function calculateDealerReserve(
  buyRate: number,
  maxReserveBps: number,
  creditScore: number
): number {
  // Higher credit scores get more reserve opportunity
  let reserveMultiplier = new Decimal(1.0);
  if (creditScore >= 740) reserveMultiplier = new Decimal(1.0);
  else if (creditScore >= 670) reserveMultiplier = new Decimal(0.8);
  else if (creditScore >= 600) reserveMultiplier = new Decimal(0.6);
  else reserveMultiplier = new Decimal(0.4);
  
  const maxReserve = new Decimal(maxReserveBps)
    .dividedBy(100)
    .times(reserveMultiplier);
  
  // Can't exceed rate caps (typically 2-2.5% markup)
  const actualReserve = Decimal.min(maxReserve, new Decimal(2.5));
  
  return actualReserve.toDP(2).toNumber();
}

// Mock function to shop rates from all lenders
export async function shopRates(
  creditScore: number,
  requestedAmount: number,
  vehiclePrice: number,
  downPayment: number,
  tradeValue: number,
  tradePayoff: number,
  requestedTerm: number,
  vehicleType: "new" | "used",
  monthlyIncome?: number,
  monthlyDebt?: number,
  state: string = "CA"
): Promise<ApprovedLender[]> {
  const approvedLenders: ApprovedLender[] = [];
  const loanAmount = new Decimal(vehiclePrice)
    .minus(downPayment)
    .minus(new Decimal(tradeValue).minus(tradePayoff))
    .toNumber();
  const ltv = calculateLTV(loanAmount, vehiclePrice);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  for (const lender of MOCK_LENDERS) {
    // Check if lender operates in state
    if (!lender.states.includes(state)) continue;
    
    // Check minimum credit score
    if (creditScore < lender.minCreditScore) continue;
    
    // Check LTV limits
    if (ltv > parseFloat(lender.maxLtv)) continue;
    
    // Find matching programs
    for (const program of lender.programs) {
      // Check vehicle type
      if (program.vehicleType !== vehicleType && program.vehicleType !== "certified") continue;
      
      // Check credit score for program
      if (creditScore < program.minCreditScore) continue;
      
      // Check term limits
      if (requestedTerm < program.minTerm || requestedTerm > program.maxTerm) continue;
      
      // Find applicable rate tier
      let apr = 0;
      let buyRate = 0;
      let moneyFactor = program.moneyFactor;
      
      for (const tier of program.rateTiers) {
        if (creditScore >= tier.minScore && creditScore <= tier.maxScore) {
          apr = tier.apr || 0;
          buyRate = tier.buyRate || apr;
          if (tier.moneyFactor) {
            moneyFactor = tier.moneyFactor;
            // Convert money factor to APR for display
            apr = new Decimal(moneyFactor).times(2400).toNumber();
          }
          break;
        }
      }
      
      // Skip if no rate found
      if (apr === 0 && program.type !== "promotional") continue;
      
      // Calculate dealer reserve
      const dealerReserve = calculateDealerReserve(buyRate, lender.dealerReserveMaxBps, creditScore);
      const customerApr = Decimal.min(
        new Decimal(apr).plus(dealerReserve), 
        new Decimal(29.99)
      ).toNumber(); // Legal max in most states
      
      // Calculate payment
      const amountFinanced = new Decimal(loanAmount)
        .plus(parseFloat(program.originationFee || "0"))
        .toNumber();
      const monthlyPayment = calculateMonthlyPayment(amountFinanced, customerApr, requestedTerm);
      const financeCharge = calculateFinanceCharge(amountFinanced, monthlyPayment, requestedTerm);
      
      // Calculate DTI if income provided
      let dti = null;
      let pti = null;
      if (monthlyIncome && monthlyIncome > 0) {
        dti = calculateDTI(monthlyPayment, monthlyIncome, monthlyDebt);
        pti = new Decimal(monthlyPayment)
          .dividedBy(monthlyIncome)
          .times(100)
          .toDP(2)
          .toNumber();
        
        // Skip if DTI exceeds program limits
        if (dti > parseFloat(program.maxDti)) continue;
      }
      
      // Generate stipulations
      const stips = generateStipulations(creditScore, ltv, dti || 30, lender.type);
      
      // Calculate approval likelihood
      const approvalLikelihood = calculateApprovalLikelihood(
        creditScore,
        ltv,
        dti || 30,
        lender.type
      );
      
      // Create approved lender record
      const approvedLender: ApprovedLender = {
        id: `${lender.id}-${program.id}-${Date.now()}`,
        rateRequestId: `request-${Date.now()}`,
        lenderId: lender.id,
        programId: program.id,
        approvalStatus: creditScore >= 650 ? "approved" : "conditional",
        approvalAmount: amountFinanced.toFixed(2),
        apr: customerApr.toFixed(3),
        buyRate: buyRate.toFixed(3),
        dealerReserve: dealerReserve.toFixed(3),
        flatFee: "0.00",
        term: requestedTerm,
        monthlyPayment: monthlyPayment.toFixed(2),
        totalFinanceCharge: financeCharge.toFixed(2),
        totalOfPayments: new Decimal(monthlyPayment).times(requestedTerm).toFixed(2),
        ltv: ltv.toFixed(2),
        dti: dti ? dti.toFixed(2) : null,
        pti: pti ? pti.toFixed(2) : null,
        stipulations: stips,
        specialConditions: program.requirements.join(", "),
        approvalScore: Math.floor(Math.random() * 30) + 70,
        approvalLikelihood,
        incentives: program.incentives,
        specialRate: program.type === "promotional",
        selected: false,
        selectedAt: null,
        selectedBy: null,
        offerExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add lender and program details for display
        lenderName: lender.name,
        lenderLogo: lender.logo,
        lenderType: lender.type,
        programName: program.name,
        programType: program.type,
      } as any;
      
      approvedLenders.push(approvedLender);
      
      // Only include best rate from each lender
      break;
    }
  }
  
  // Sort by APR
  approvedLenders.sort((a, b) => parseFloat(a.apr) - parseFloat(b.apr));
  
  return approvedLenders;
}

// Calculate backend gross (dealer profit)
export function calculateBackendGross(
  dealerReserve: number,
  flatFee: number,
  loanAmount: number,
  term: number
): number {
  // Reserve is annual percentage, so calculate total over loan term
  const reserveDec = new Decimal(dealerReserve).dividedBy(100);
  const loanDec = new Decimal(loanAmount);
  const termYears = new Decimal(term).dividedBy(12);
  
  const reserveIncome = reserveDec.times(loanDec).times(termYears);
  const totalBackend = reserveIncome.plus(flatFee);
  
  return totalBackend.toDP(2).toNumber();
}

// Cache for rate requests (in production, use Redis or similar)
const rateCache = new Map<string, { data: ApprovedLender[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached rates or fetch new ones
export async function getCachedRates(
  cacheKey: string,
  fetchFn: () => Promise<ApprovedLender[]>
): Promise<ApprovedLender[]> {
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  rateCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// Generate cache key for rate request
export function generateRateCacheKey(
  creditScore: number,
  loanAmount: number,
  term: number,
  vehicleType: string
): string {
  return `rates:${creditScore}:${loanAmount}:${term}:${vehicleType}`;
}

// Export types
export type { Lender, LenderProgram, ApprovedLender, RateRequest };