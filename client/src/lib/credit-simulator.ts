// Credit Score Simulation Service
// Based on FICO scoring model with automotive financing focus

export type CreditTier = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Deep Subprime';

export interface CreditFactors {
  paymentHistory: {
    onTimePayments: number;
    totalPayments: number;
    delinquencies30Days: number;
    delinquencies60Days: number;
    delinquencies90Days: number;
    collections: number;
    bankruptcies: number;
    weight: number;
  };
  creditUtilization: {
    totalBalance: number;
    totalLimit: number;
    utilizationRatio: number;
    weight: number;
  };
  creditHistory: {
    averageAccountAge: number; // in months
    oldestAccountAge: number; // in months
    weight: number;
  };
  creditMix: {
    creditCards: number;
    autoLoans: number;
    mortgages: number;
    studentLoans: number;
    otherLoans: number;
    totalAccounts: number;
    weight: number;
  };
  newCredit: {
    hardInquiries: number;
    newAccounts: number; // opened in last 12 months
    inquiriesLast6Months: number;
    weight: number;
  };
}

export interface CreditSimulationInput {
  currentScore?: number;
  paymentHistory?: Partial<CreditFactors['paymentHistory']>;
  creditUtilization?: Partial<CreditFactors['creditUtilization']>;
  creditHistory?: Partial<CreditFactors['creditHistory']>;
  creditMix?: Partial<CreditFactors['creditMix']>;
  newCredit?: Partial<CreditFactors['newCredit']>;
}

export interface CreditSimulationResult {
  score: number;
  tier: CreditTier;
  factors: CreditFactors;
  recommendations: CreditRecommendation[];
  scoreBreakdown: {
    paymentHistoryScore: number;
    utilizationScore: number;
    historyScore: number;
    mixScore: number;
    newCreditScore: number;
  };
  potentialImprovement: {
    maxPossibleScore: number;
    improvementPoints: number;
    estimatedTimeframe: string;
  };
}

export interface CreditRecommendation {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  estimatedScoreIncrease: string;
  timeframe: string;
  category: string;
}

export interface PreQualificationInput {
  creditScore: number;
  annualIncome: number;
  monthlyDebtPayments: number;
  employmentStatus: 'Employed' | 'Self-Employed' | 'Retired' | 'Other';
  employmentDuration: number; // in months
  housingPayment: number;
  downPayment: number;
  requestedLoanAmount: number;
  vehiclePrice: number;
}

export interface PreQualificationResult {
  approved: boolean;
  approvalOdds: number;
  creditTier: CreditTier;
  estimatedAPR: {
    min: number;
    max: number;
    likely: number;
  };
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  dtiRatio: number;
  ltiRatio: number; // Loan to Income ratio
  recommendations: string[];
  availableLenders: LenderOption[];
}

export interface LenderOption {
  name: string;
  tier: CreditTier[];
  aprRange: { min: number; max: number };
  termOptions: number[];
  specialPrograms: string[];
  requirements: string[];
}

// FICO Score Calculation Weights
const FICO_WEIGHTS = {
  PAYMENT_HISTORY: 0.35,
  CREDIT_UTILIZATION: 0.30,
  CREDIT_HISTORY: 0.15,
  CREDIT_MIX: 0.10,
  NEW_CREDIT: 0.10,
};

// Credit Tier Definitions
const CREDIT_TIERS = {
  Excellent: { min: 720, max: 850, aprBase: 3.5 },
  Good: { min: 660, max: 719, aprBase: 5.5 },
  Fair: { min: 600, max: 659, aprBase: 8.5 },
  Poor: { min: 500, max: 599, aprBase: 12.5 },
  'Deep Subprime': { min: 300, max: 499, aprBase: 18.0 },
};

// Calculate FICO score based on credit factors
export function calculateCreditScore(input: CreditSimulationInput): CreditSimulationResult {
  const factors = buildCreditFactors(input);
  const scoreBreakdown = calculateScoreBreakdown(factors);
  const totalScore = calculateTotalScore(scoreBreakdown);
  const tier = getCreditTier(totalScore);
  const recommendations = generateRecommendations(factors, totalScore);
  const potentialImprovement = calculatePotentialImprovement(factors, totalScore);

  return {
    score: totalScore,
    tier,
    factors,
    recommendations,
    scoreBreakdown,
    potentialImprovement,
  };
}

// Build complete credit factors from input
function buildCreditFactors(input: CreditSimulationInput): CreditFactors {
  return {
    paymentHistory: {
      onTimePayments: input.paymentHistory?.onTimePayments ?? 24,
      totalPayments: input.paymentHistory?.totalPayments ?? 24,
      delinquencies30Days: input.paymentHistory?.delinquencies30Days ?? 0,
      delinquencies60Days: input.paymentHistory?.delinquencies60Days ?? 0,
      delinquencies90Days: input.paymentHistory?.delinquencies90Days ?? 0,
      collections: input.paymentHistory?.collections ?? 0,
      bankruptcies: input.paymentHistory?.bankruptcies ?? 0,
      weight: FICO_WEIGHTS.PAYMENT_HISTORY,
    },
    creditUtilization: {
      totalBalance: input.creditUtilization?.totalBalance ?? 2000,
      totalLimit: input.creditUtilization?.totalLimit ?? 10000,
      utilizationRatio: 
        input.creditUtilization?.utilizationRatio ?? 
        ((input.creditUtilization?.totalBalance ?? 2000) / 
         (input.creditUtilization?.totalLimit ?? 10000)),
      weight: FICO_WEIGHTS.CREDIT_UTILIZATION,
    },
    creditHistory: {
      averageAccountAge: input.creditHistory?.averageAccountAge ?? 48,
      oldestAccountAge: input.creditHistory?.oldestAccountAge ?? 84,
      weight: FICO_WEIGHTS.CREDIT_HISTORY,
    },
    creditMix: {
      creditCards: input.creditMix?.creditCards ?? 2,
      autoLoans: input.creditMix?.autoLoans ?? 0,
      mortgages: input.creditMix?.mortgages ?? 0,
      studentLoans: input.creditMix?.studentLoans ?? 0,
      otherLoans: input.creditMix?.otherLoans ?? 0,
      totalAccounts: input.creditMix?.totalAccounts ?? 2,
      weight: FICO_WEIGHTS.CREDIT_MIX,
    },
    newCredit: {
      hardInquiries: input.newCredit?.hardInquiries ?? 1,
      newAccounts: input.newCredit?.newAccounts ?? 0,
      inquiriesLast6Months: input.newCredit?.inquiriesLast6Months ?? 1,
      weight: FICO_WEIGHTS.NEW_CREDIT,
    },
  };
}

// Calculate individual score components
function calculateScoreBreakdown(factors: CreditFactors) {
  return {
    paymentHistoryScore: calculatePaymentHistoryScore(factors.paymentHistory),
    utilizationScore: calculateUtilizationScore(factors.creditUtilization),
    historyScore: calculateHistoryScore(factors.creditHistory),
    mixScore: calculateMixScore(factors.creditMix),
    newCreditScore: calculateNewCreditScore(factors.newCredit),
  };
}

// Calculate payment history score (35% of total)
function calculatePaymentHistoryScore(history: CreditFactors['paymentHistory']): number {
  let baseScore = 300; // Base for this component
  
  // On-time payment ratio
  const onTimeRatio = history.totalPayments > 0 
    ? history.onTimePayments / history.totalPayments 
    : 1;
  baseScore += onTimeRatio * 200;
  
  // Deduct for delinquencies
  baseScore -= history.delinquencies30Days * 20;
  baseScore -= history.delinquencies60Days * 40;
  baseScore -= history.delinquencies90Days * 60;
  baseScore -= history.collections * 80;
  baseScore -= history.bankruptcies * 150;
  
  return Math.max(100, Math.min(500, baseScore)) * history.weight;
}

// Calculate credit utilization score (30% of total)
function calculateUtilizationScore(utilization: CreditFactors['creditUtilization']): number {
  let baseScore = 300;
  const ratio = utilization.utilizationRatio;
  
  if (ratio <= 0.10) {
    baseScore = 500; // Excellent
  } else if (ratio <= 0.30) {
    baseScore = 450 - (ratio - 0.10) * 250; // Good
  } else if (ratio <= 0.50) {
    baseScore = 400 - (ratio - 0.30) * 200; // Fair
  } else if (ratio <= 0.70) {
    baseScore = 350 - (ratio - 0.50) * 150; // Poor
  } else {
    baseScore = 300 - Math.min((ratio - 0.70) * 100, 200); // Very Poor
  }
  
  return Math.max(100, Math.min(500, baseScore)) * utilization.weight;
}

// Calculate credit history score (15% of total)
function calculateHistoryScore(history: CreditFactors['creditHistory']): number {
  let baseScore = 200;
  
  // Average account age bonus
  if (history.averageAccountAge >= 84) {
    baseScore += 300; // 7+ years excellent
  } else if (history.averageAccountAge >= 60) {
    baseScore += 250; // 5+ years good
  } else if (history.averageAccountAge >= 36) {
    baseScore += 200; // 3+ years fair
  } else if (history.averageAccountAge >= 24) {
    baseScore += 150; // 2+ years
  } else {
    baseScore += history.averageAccountAge * 6; // Less than 2 years
  }
  
  // Oldest account bonus
  if (history.oldestAccountAge >= 120) {
    baseScore += 50; // 10+ years bonus
  } else if (history.oldestAccountAge >= 60) {
    baseScore += 25; // 5+ years bonus
  }
  
  return Math.max(100, Math.min(500, baseScore)) * history.weight;
}

// Calculate credit mix score (10% of total)
function calculateMixScore(mix: CreditFactors['creditMix']): number {
  let baseScore = 300;
  let diversityScore = 0;
  
  // Count different types of credit
  if (mix.creditCards > 0) diversityScore += 100;
  if (mix.autoLoans > 0) diversityScore += 100;
  if (mix.mortgages > 0) diversityScore += 100;
  if (mix.studentLoans > 0) diversityScore += 50;
  if (mix.otherLoans > 0) diversityScore += 50;
  
  // Cap diversity score
  diversityScore = Math.min(200, diversityScore);
  
  // Account quantity factor
  let quantityScore = 0;
  if (mix.totalAccounts >= 11) {
    quantityScore = 100; // Many accounts managed well
  } else if (mix.totalAccounts >= 6) {
    quantityScore = 150; // Optimal range
  } else if (mix.totalAccounts >= 3) {
    quantityScore = 100; // Good
  } else {
    quantityScore = mix.totalAccounts * 30; // Limited history
  }
  
  baseScore += diversityScore + quantityScore;
  
  return Math.max(100, Math.min(500, baseScore)) * mix.weight;
}

// Calculate new credit score (10% of total)
function calculateNewCreditScore(newCredit: CreditFactors['newCredit']): number {
  let baseScore = 450;
  
  // Deduct for recent inquiries
  baseScore -= newCredit.inquiriesLast6Months * 30;
  baseScore -= Math.max(0, newCredit.hardInquiries - 2) * 20;
  
  // Deduct for new accounts
  baseScore -= Math.max(0, newCredit.newAccounts - 1) * 25;
  
  return Math.max(100, Math.min(500, baseScore)) * newCredit.weight;
}

// Calculate total FICO score
function calculateTotalScore(breakdown: CreditSimulationResult['scoreBreakdown']): number {
  const total = 
    breakdown.paymentHistoryScore +
    breakdown.utilizationScore +
    breakdown.historyScore +
    breakdown.mixScore +
    breakdown.newCreditScore;
  
  // Scale to FICO range (300-850)
  const scaledScore = 300 + (total / 500) * 550;
  
  return Math.round(Math.max(300, Math.min(850, scaledScore)));
}

// Determine credit tier based on score
export function getCreditTier(score: number): CreditTier {
  for (const [tier, range] of Object.entries(CREDIT_TIERS)) {
    if (score >= range.min && score <= range.max) {
      return tier as CreditTier;
    }
  }
  return 'Deep Subprime';
}

// Generate personalized recommendations
function generateRecommendations(
  factors: CreditFactors,
  currentScore: number
): CreditRecommendation[] {
  const recommendations: CreditRecommendation[] = [];
  
  // Payment history recommendations
  if (factors.paymentHistory.delinquencies30Days > 0 || 
      factors.paymentHistory.delinquencies60Days > 0 ||
      factors.paymentHistory.delinquencies90Days > 0) {
    recommendations.push({
      title: 'Bring Accounts Current',
      description: 'Pay off any past-due accounts to stop further damage to your credit score',
      impact: 'High',
      estimatedScoreIncrease: '20-60 points',
      timeframe: '1-2 months',
      category: 'Payment History',
    });
  }
  
  // Utilization recommendations
  if (factors.creditUtilization.utilizationRatio > 0.30) {
    const targetBalance = factors.creditUtilization.totalLimit * 0.10;
    const paydownAmount = factors.creditUtilization.totalBalance - targetBalance;
    recommendations.push({
      title: 'Reduce Credit Card Balances',
      description: `Pay down $${paydownAmount.toFixed(0)} to reach 10% utilization for optimal scoring`,
      impact: 'High',
      estimatedScoreIncrease: '10-40 points',
      timeframe: '1-3 months',
      category: 'Credit Utilization',
    });
  }
  
  if (factors.creditUtilization.utilizationRatio > 0.10 && 
      factors.creditUtilization.utilizationRatio <= 0.30) {
    recommendations.push({
      title: 'Optimize Utilization Further',
      description: 'Consider reducing credit card balances below 10% for maximum score benefit',
      impact: 'Medium',
      estimatedScoreIncrease: '5-15 points',
      timeframe: '1-2 months',
      category: 'Credit Utilization',
    });
  }
  
  // New credit recommendations
  if (factors.newCredit.inquiriesLast6Months > 2) {
    recommendations.push({
      title: 'Avoid New Credit Applications',
      description: 'Wait 6 months before applying for new credit to let inquiries age',
      impact: 'Medium',
      estimatedScoreIncrease: '5-10 points',
      timeframe: '6 months',
      category: 'New Credit',
    });
  }
  
  // Collections recommendations
  if (factors.paymentHistory.collections > 0) {
    recommendations.push({
      title: 'Address Collections',
      description: 'Contact collection agencies to negotiate pay-for-delete agreements',
      impact: 'High',
      estimatedScoreIncrease: '30-80 points',
      timeframe: '2-3 months',
      category: 'Payment History',
    });
  }
  
  // Credit mix recommendations
  if (factors.creditMix.totalAccounts < 3) {
    recommendations.push({
      title: 'Build Credit History',
      description: 'Consider becoming an authorized user on a family member\'s account with good history',
      impact: 'Medium',
      estimatedScoreIncrease: '10-30 points',
      timeframe: '1-2 months',
      category: 'Credit Mix',
    });
  }
  
  // Credit history recommendations
  if (factors.creditHistory.averageAccountAge < 24) {
    recommendations.push({
      title: 'Keep Accounts Open',
      description: 'Avoid closing old credit cards to maintain account age',
      impact: 'Low',
      estimatedScoreIncrease: '5-10 points',
      timeframe: '12+ months',
      category: 'Credit History',
    });
  }
  
  return recommendations;
}

// Calculate potential improvement
function calculatePotentialImprovement(
  factors: CreditFactors,
  currentScore: number
): CreditSimulationResult['potentialImprovement'] {
  // Calculate max possible score with perfect behavior
  const perfectFactors: CreditFactors = {
    ...factors,
    paymentHistory: {
      ...factors.paymentHistory,
      onTimePayments: factors.paymentHistory.totalPayments,
      delinquencies30Days: 0,
      delinquencies60Days: 0,
      delinquencies90Days: 0,
      collections: 0,
      bankruptcies: 0,
    },
    creditUtilization: {
      ...factors.creditUtilization,
      utilizationRatio: 0.05,
      totalBalance: factors.creditUtilization.totalLimit * 0.05,
    },
    newCredit: {
      ...factors.newCredit,
      hardInquiries: 0,
      newAccounts: 0,
      inquiriesLast6Months: 0,
    },
  };
  
  const perfectBreakdown = calculateScoreBreakdown(perfectFactors);
  const maxScore = calculateTotalScore(perfectBreakdown);
  const improvement = maxScore - currentScore;
  
  // Estimate timeframe
  let timeframe = '3-6 months';
  if (improvement > 100) {
    timeframe = '12-18 months';
  } else if (improvement > 50) {
    timeframe = '6-12 months';
  }
  
  return {
    maxPossibleScore: maxScore,
    improvementPoints: improvement,
    estimatedTimeframe: timeframe,
  };
}

// Pre-qualification calculation
export function calculatePreQualification(input: PreQualificationInput): PreQualificationResult {
  const creditTier = getCreditTier(input.creditScore);
  const tierData = CREDIT_TIERS[creditTier];
  
  // Calculate DTI ratio
  const monthlyIncome = input.annualIncome / 12;
  const totalMonthlyDebt = input.monthlyDebtPayments + input.housingPayment;
  const dtiRatio = (totalMonthlyDebt / monthlyIncome) * 100;
  
  // Calculate LTI ratio
  const ltiRatio = input.requestedLoanAmount / input.annualIncome;
  
  // Calculate max affordable payment (28% of gross income minus existing debts)
  const maxPaymentBasedOnIncome = monthlyIncome * 0.28 - input.monthlyDebtPayments;
  
  // Determine approval odds
  let approvalOdds = 100;
  if (dtiRatio > 45) approvalOdds -= 30;
  else if (dtiRatio > 40) approvalOdds -= 20;
  else if (dtiRatio > 35) approvalOdds -= 10;
  
  if (input.creditScore < 500) approvalOdds -= 40;
  else if (input.creditScore < 600) approvalOdds -= 20;
  else if (input.creditScore < 660) approvalOdds -= 10;
  
  if (ltiRatio > 6) approvalOdds -= 30;
  else if (ltiRatio > 5) approvalOdds -= 20;
  else if (ltiRatio > 4) approvalOdds -= 10;
  
  if (input.downPayment < input.vehiclePrice * 0.10) approvalOdds -= 15;
  
  approvalOdds = Math.max(0, Math.min(100, approvalOdds));
  
  // Calculate APR range based on credit tier
  const baseAPR = tierData.aprBase;
  const aprRange = {
    min: baseAPR - 1.0,
    max: baseAPR + 3.0,
    likely: baseAPR + (dtiRatio > 35 ? 1.5 : 0.5),
  };
  
  // Calculate max loan amount (lesser of income-based or 6x annual income)
  const maxLoanByIncome = Math.min(
    maxPaymentBasedOnIncome * 72 * 0.9, // 72 months at 90% principal
    input.annualIncome * 6
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (dtiRatio > 40) {
    recommendations.push('Consider paying down existing debts to improve DTI ratio');
  }
  if (input.downPayment < input.vehiclePrice * 0.20) {
    recommendations.push('Increase down payment to 20% for better rates and approval odds');
  }
  if (input.creditScore < 660) {
    recommendations.push('Work on improving credit score before applying for best rates');
  }
  if (input.employmentDuration < 24) {
    recommendations.push('Longer employment history (2+ years) improves approval chances');
  }
  
  // Get available lenders
  const lenders = getAvailableLenders(creditTier, input.creditScore);
  
  return {
    approved: approvalOdds >= 50,
    approvalOdds,
    creditTier,
    estimatedAPR: aprRange,
    maxLoanAmount: Math.round(maxLoanByIncome),
    maxMonthlyPayment: Math.round(maxPaymentBasedOnIncome),
    dtiRatio: Math.round(dtiRatio * 10) / 10,
    ltiRatio: Math.round(ltiRatio * 10) / 10,
    recommendations,
    availableLenders: lenders,
  };
}

// Get available lenders based on credit tier
function getAvailableLenders(tier: CreditTier, score: number): LenderOption[] {
  const allLenders: LenderOption[] = [
    {
      name: 'Chase Auto Finance',
      tier: ['Excellent', 'Good'],
      aprRange: { min: 3.49, max: 7.99 },
      termOptions: [36, 48, 60, 72, 84],
      specialPrograms: ['First-time buyer', 'Military discount'],
      requirements: ['Min 660 credit score', '2 years employment', 'Max 45% DTI'],
    },
    {
      name: 'Capital One Auto Finance',
      tier: ['Good', 'Fair', 'Poor'],
      aprRange: { min: 4.99, max: 14.99 },
      termOptions: [36, 48, 60, 72],
      specialPrograms: ['Pre-qualification available', 'Refinancing'],
      requirements: ['Min 500 credit score', '1 year employment', 'Max 50% DTI'],
    },
    {
      name: 'Ally Financial',
      tier: ['Excellent', 'Good', 'Fair'],
      aprRange: { min: 3.99, max: 11.99 },
      termOptions: [24, 36, 48, 60, 72, 84],
      specialPrograms: ['Lease buyout', 'GAP insurance'],
      requirements: ['Min 620 credit score', '2 years employment', 'Max 45% DTI'],
    },
    {
      name: 'Wells Fargo Auto',
      tier: ['Excellent', 'Good'],
      aprRange: { min: 3.24, max: 8.99 },
      termOptions: [36, 48, 60, 72, 84],
      specialPrograms: ['Relationship discount', 'Student auto loan'],
      requirements: ['Min 650 credit score', 'Existing Wells Fargo customer preferred'],
    },
    {
      name: 'Santander Consumer USA',
      tier: ['Fair', 'Poor', 'Deep Subprime'],
      aprRange: { min: 7.99, max: 24.99 },
      termOptions: [36, 48, 60, 72],
      specialPrograms: ['Subprime specialist', 'Second chance financing'],
      requirements: ['Min 450 credit score', '6 months employment', 'Max 55% DTI'],
    },
    {
      name: 'Credit Acceptance Corp',
      tier: ['Poor', 'Deep Subprime'],
      aprRange: { min: 12.99, max: 29.99 },
      termOptions: [24, 36, 48, 60],
      specialPrograms: ['No credit check options', 'Buy here pay here'],
      requirements: ['Any credit score', 'Proof of income', 'Down payment required'],
    },
    {
      name: 'GM Financial',
      tier: ['Excellent', 'Good', 'Fair'],
      aprRange: { min: 2.99, max: 10.99 },
      termOptions: [36, 48, 60, 72, 84],
      specialPrograms: ['GM employee discount', 'College grad program', 'Military discount'],
      requirements: ['Min 620 credit score', 'For GM vehicles only'],
    },
    {
      name: 'Toyota Financial Services',
      tier: ['Excellent', 'Good'],
      aprRange: { min: 2.49, max: 8.99 },
      termOptions: [36, 48, 60, 72],
      specialPrograms: ['College grad rebate', 'Military rebate', 'Loyalty cash'],
      requirements: ['Min 650 credit score', 'For Toyota/Lexus vehicles only'],
    },
  ];
  
  // Filter lenders by credit tier
  return allLenders.filter(lender => lender.tier.includes(tier));
}

// What-if scenario calculations
export function simulateScenario(
  currentFactors: CreditFactors,
  scenario: string
): CreditSimulationResult {
  const modifiedFactors = { ...currentFactors };
  
  switch (scenario) {
    case 'payoff-cards':
      modifiedFactors.creditUtilization = {
        ...currentFactors.creditUtilization,
        totalBalance: 0,
        utilizationRatio: 0,
      };
      break;
      
    case 'authorized-user':
      modifiedFactors.creditHistory = {
        ...currentFactors.creditHistory,
        averageAccountAge: currentFactors.creditHistory.averageAccountAge + 24,
        oldestAccountAge: Math.max(
          currentFactors.creditHistory.oldestAccountAge,
          84
        ),
      };
      modifiedFactors.creditMix = {
        ...currentFactors.creditMix,
        totalAccounts: currentFactors.creditMix.totalAccounts + 1,
        creditCards: currentFactors.creditMix.creditCards + 1,
      };
      break;
      
    case 'dispute-collections':
      modifiedFactors.paymentHistory = {
        ...currentFactors.paymentHistory,
        collections: 0,
      };
      break;
      
    case 'wait-6-months':
      modifiedFactors.newCredit = {
        ...currentFactors.newCredit,
        inquiriesLast6Months: 0,
        hardInquiries: Math.max(0, currentFactors.newCredit.hardInquiries - 2),
      };
      modifiedFactors.creditHistory = {
        ...currentFactors.creditHistory,
        averageAccountAge: currentFactors.creditHistory.averageAccountAge + 6,
        oldestAccountAge: currentFactors.creditHistory.oldestAccountAge + 6,
      };
      break;
      
    case 'pay-down-50':
      modifiedFactors.creditUtilization = {
        ...currentFactors.creditUtilization,
        totalBalance: currentFactors.creditUtilization.totalBalance * 0.5,
        utilizationRatio: currentFactors.creditUtilization.utilizationRatio * 0.5,
      };
      break;
      
    default:
      break;
  }
  
  const scoreBreakdown = calculateScoreBreakdown(modifiedFactors);
  const newScore = calculateTotalScore(scoreBreakdown);
  const newTier = getCreditTier(newScore);
  const recommendations = generateRecommendations(modifiedFactors, newScore);
  const potentialImprovement = calculatePotentialImprovement(modifiedFactors, newScore);
  
  return {
    score: newScore,
    tier: newTier,
    factors: modifiedFactors,
    recommendations,
    scoreBreakdown,
    potentialImprovement,
  };
}

// Educational content helpers
export function getCreditEducation(score: number): {
  tierName: string;
  description: string;
  tips: string[];
  aprRange: string;
  downPaymentRecommended: string;
} {
  const tier = getCreditTier(score);
  
  const education = {
    Excellent: {
      tierName: 'Excellent (720-850)',
      description: 'You have exceptional credit and qualify for the best rates available.',
      tips: [
        'Maintain low credit utilization below 10%',
        'Continue making all payments on time',
        'Keep old accounts open to maintain credit age',
        'You qualify for prime lending rates',
      ],
      aprRange: '2.5% - 5.5%',
      downPaymentRecommended: '0% - 10%',
    },
    Good: {
      tierName: 'Good (660-719)',
      description: 'You have good credit and qualify for competitive rates.',
      tips: [
        'Work on reducing credit card balances',
        'Avoid new credit applications for 6 months',
        'Consider paying extra on principal',
        'You may qualify for manufacturer incentives',
      ],
      aprRange: '4.5% - 8.5%',
      downPaymentRecommended: '10% - 15%',
    },
    Fair: {
      tierName: 'Fair (600-659)',
      description: 'You have fair credit with room for improvement.',
      tips: [
        'Focus on paying down high-interest debt',
        'Set up automatic payments to avoid late fees',
        'Consider a co-signer for better rates',
        'Build emergency fund to avoid missed payments',
      ],
      aprRange: '7.5% - 12.5%',
      downPaymentRecommended: '15% - 20%',
    },
    Poor: {
      tierName: 'Poor (500-599)',
      description: 'Your credit needs improvement but financing is still possible.',
      tips: [
        'Address any collections or past-due accounts',
        'Consider secured credit cards to rebuild',
        'Larger down payment will help approval',
        'Consider credit counseling services',
      ],
      aprRange: '11.5% - 18.5%',
      downPaymentRecommended: '20% - 30%',
    },
    'Deep Subprime': {
      tierName: 'Deep Subprime (300-499)',
      description: 'Limited financing options available, focus on credit repair.',
      tips: [
        'Work with subprime lenders who specialize in challenged credit',
        'Expect to need significant down payment',
        'Consider buy-here-pay-here dealerships',
        'Focus on credit repair before major purchases',
      ],
      aprRange: '16.5% - 29.9%',
      downPaymentRecommended: '30% - 50%',
    },
  };
  
  return education[tier];
}