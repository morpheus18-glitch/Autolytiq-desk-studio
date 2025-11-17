/**
 * LOCAL DEAL ANALYZER SERVICE
 *
 * Rule-based AI agent for automotive deal analysis.
 * No external API calls - fast, free, and privacy-preserving.
 *
 * Features:
 * - Deal scoring (0-100) based on multiple factors
 * - Actionable recommendations for improving deals
 * - Risk assessment and red flags
 * - Sales talking points generation
 * - Pattern-based optimization (learns from Prime Engine)
 */

import { getLocalTaxRate, type LocalTaxRateInfo } from '../local-tax-service';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface DealAnalysisRequest {
  vehiclePrice: number;
  downPayment?: number;
  tradeValue?: number;
  tradePayoff?: number;
  termMonths?: number;
  interestRate?: number;
  zipCode: string;
  customerFico?: number;
  customerMonthlyIncome?: number;
}

export interface DealAnalysisResult {
  dealScore: number;
  scoreGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  monthlyPayment: number;
  amountFinanced: number;
  taxBreakdown: {
    taxAmount: number;
    taxableAmount: number;
    totalRate: number;
    jurisdiction: string;
    breakdown: Array<{
      type: string;
      name: string;
      rate: number;
    }>;
  };
  recommendations: DealRecommendation[];
  risks: string[];
  talkingPoints: string[];
  dealMetrics: DealMetrics;
}

export interface DealRecommendation {
  type: 'down_payment' | 'term' | 'rate' | 'combined' | 'trade' | 'income';
  priority: 'high' | 'medium' | 'low';
  current?: number | string;
  suggested?: number | string;
  reason: string;
  impact: string;
  estimatedScoreIncrease?: number;
}

export interface DealMetrics {
  downPaymentPercent: number;
  loanToValue: number;
  paymentToIncome?: number;
  debtToIncome?: number;
  totalInterest: number;
  totalCost: number;
  interestToPrice: number;
}

interface LearnedPatterns {
  successfulDownPayments: number[];
  successfulTerms: number[];
  ficoToApprovalRate: Record<string, number>;
  optimalLTV: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PATTERNS: LearnedPatterns = {
  successfulDownPayments: [0.15, 0.20],
  successfulTerms: [60, 72],
  ficoToApprovalRate: {
    '720+': 0.95,
    '680-719': 0.85,
    '640-679': 0.70,
    '620-639': 0.50,
    '<620': 0.25,
  },
  optimalLTV: 1.15,
};

// ============================================================================
// DEAL ANALYZER CLASS
// ============================================================================

export class DealAnalyzer {
  private patterns: LearnedPatterns = DEFAULT_PATTERNS;
  private dataPath: string;

  constructor(dataPath: string = 'server/data') {
    this.dataPath = dataPath;
    this.loadPatterns();
  }

  /**
   * Main analysis function - analyzes a deal and returns comprehensive results
   */
  async analyzeDeal(request: DealAnalysisRequest): Promise<DealAnalysisResult> {
    // Normalize inputs with defaults
    const {
      vehiclePrice,
      downPayment = 0,
      tradeValue = 0,
      tradePayoff = 0,
      termMonths = 60,
      interestRate = 5.9,
      zipCode,
      customerFico,
      customerMonthlyIncome,
    } = request;

    // Calculate trade equity
    const netTrade = tradeValue - tradePayoff;

    // Get tax information using existing local tax service
    const taxInfo = await this.calculateTax(vehiclePrice, tradeValue, zipCode);

    // Calculate amount financed
    const amountFinanced = Math.max(
      0,
      vehiclePrice + taxInfo.taxAmount - downPayment - netTrade
    );

    // Calculate monthly payment
    const monthlyPayment = this.calculatePayment(
      amountFinanced,
      interestRate,
      termMonths
    );

    // Calculate deal metrics
    const dealMetrics = this.calculateMetrics(
      vehiclePrice,
      downPayment,
      amountFinanced,
      monthlyPayment,
      termMonths,
      interestRate,
      customerMonthlyIncome
    );

    // Score the deal
    const dealScore = this.scoreDeal({
      vehiclePrice,
      downPayment,
      termMonths,
      customerFico,
      monthlyPayment,
      customerMonthlyIncome,
      loanToValue: dealMetrics.loanToValue,
      paymentToIncome: dealMetrics.paymentToIncome,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      vehiclePrice,
      downPayment,
      termMonths,
      interestRate,
      customerFico,
      currentScore: dealScore,
      amountFinanced,
      monthlyPayment,
      customerMonthlyIncome,
      loanToValue: dealMetrics.loanToValue,
    });

    // Assess risks
    const risks = this.assessRisks({
      customerFico,
      downPayment,
      vehiclePrice,
      amountFinanced,
      paymentToIncome: dealMetrics.paymentToIncome,
      loanToValue: dealMetrics.loanToValue,
    });

    // Generate talking points
    const talkingPoints = this.generateTalkingPoints(
      recommendations,
      monthlyPayment,
      customerFico,
      dealScore
    );

    return {
      dealScore: Math.round(dealScore),
      scoreGrade: this.getScoreGrade(dealScore),
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      amountFinanced: Math.round(amountFinanced * 100) / 100,
      taxBreakdown: taxInfo,
      recommendations,
      risks,
      talkingPoints,
      dealMetrics,
    };
  }

  /**
   * Calculate tax using existing local tax service
   */
  private async calculateTax(
    vehiclePrice: number,
    tradeValue: number,
    zipCode: string
  ): Promise<DealAnalysisResult['taxBreakdown']> {
    try {
      // Extract state from ZIP (simplified - first 3 digits)
      const stateCode = this.zipToState(zipCode);

      // Get local tax rate using existing service
      const taxRate = await getLocalTaxRate(zipCode, stateCode);

      // Determine taxable amount based on jurisdiction rules
      let taxableAmount = vehiclePrice;

      // Most states allow trade deduction
      if (taxRate.source === 'database') {
        taxableAmount -= tradeValue; // Assume trade deduction allowed
      }

      const taxAmount = taxableAmount * taxRate.totalRate;

      return {
        taxAmount: Math.round(taxAmount * 100) / 100,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        totalRate: taxRate.totalRate * 100, // Convert to percentage
        jurisdiction: `${taxRate.cityName || 'Unknown'}, ${taxRate.countyName}, ${taxRate.stateCode}`,
        breakdown: taxRate.breakdown.map(b => ({
          type: b.jurisdictionType,
          name: b.name,
          rate: b.rate * 100, // Convert to percentage
        })),
      };
    } catch (error) {
      console.error('[DealAnalyzer] Tax calculation error:', error);

      // Fallback tax calculation
      const fallbackRate = 0.08; // 8% average
      const taxableAmount = vehiclePrice - tradeValue;
      const taxAmount = taxableAmount * fallbackRate;

      return {
        taxAmount: Math.round(taxAmount * 100) / 100,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        totalRate: 8.0,
        jurisdiction: 'Unknown (using fallback)',
        breakdown: [
          { type: 'COMBINED', name: 'Estimated', rate: 8.0 },
        ],
      };
    }
  }

  /**
   * Calculate monthly payment using standard amortization formula
   */
  private calculatePayment(
    principal: number,
    annualRate: number,
    termMonths: number
  ): number {
    if (principal <= 0) return 0;
    if (annualRate === 0) return principal / termMonths;

    const monthlyRate = annualRate / 100 / 12;
    const payment =
      principal *
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    return payment;
  }

  /**
   * Calculate comprehensive deal metrics
   */
  private calculateMetrics(
    vehiclePrice: number,
    downPayment: number,
    amountFinanced: number,
    monthlyPayment: number,
    termMonths: number,
    interestRate: number,
    customerMonthlyIncome?: number
  ): DealMetrics {
    const totalCost = monthlyPayment * termMonths;
    const totalInterest = totalCost - amountFinanced;
    const interestToPrice = totalInterest / vehiclePrice;
    const downPaymentPercent = (downPayment / vehiclePrice) * 100;
    const loanToValue = (amountFinanced / vehiclePrice) * 100;

    const metrics: DealMetrics = {
      downPaymentPercent: Math.round(downPaymentPercent * 100) / 100,
      loanToValue: Math.round(loanToValue * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      interestToPrice: Math.round(interestToPrice * 1000) / 10, // As percentage
    };

    if (customerMonthlyIncome) {
      metrics.paymentToIncome =
        Math.round((monthlyPayment / customerMonthlyIncome) * 10000) / 100;
    }

    return metrics;
  }

  /**
   * Score deal from 0-100 based on multiple factors
   */
  private scoreDeal(params: {
    vehiclePrice: number;
    downPayment: number;
    termMonths: number;
    customerFico?: number;
    monthlyPayment: number;
    customerMonthlyIncome?: number;
    loanToValue: number;
    paymentToIncome?: number;
  }): number {
    let score = 70; // Base score

    const {
      vehiclePrice,
      downPayment,
      termMonths,
      customerFico,
      monthlyPayment,
      customerMonthlyIncome,
      loanToValue,
      paymentToIncome,
    } = params;

    // Down payment factor (max +15)
    const downPercent = (downPayment / vehiclePrice) * 100;
    if (downPercent >= 20) score += 15;
    else if (downPercent >= 15) score += 10;
    else if (downPercent >= 10) score += 5;
    else if (downPercent < 5) score -= 15;

    // Term factor (max +10)
    if (termMonths === 60) score += 5;
    else if (termMonths <= 48) score += 10;
    else if (termMonths === 72) score -= 3;
    else if (termMonths >= 84) score -= 8;

    // FICO factor (max +15)
    if (customerFico) {
      if (customerFico >= 720) score += 15;
      else if (customerFico >= 680) score += 10;
      else if (customerFico >= 640) score += 5;
      else if (customerFico < 620) score -= 20;
      else score -= 10;
    }

    // LTV factor (max +10)
    if (loanToValue <= 100) score += 10;
    else if (loanToValue <= 110) score += 5;
    else if (loanToValue >= 130) score -= 15;
    else if (loanToValue >= 120) score -= 10;

    // Payment to income factor (max +10)
    if (paymentToIncome) {
      if (paymentToIncome <= 10) score += 10;
      else if (paymentToIncome <= 15) score += 5;
      else if (paymentToIncome >= 25) score -= 15;
      else if (paymentToIncome >= 20) score -= 8;
    }

    // Ensure score is in valid range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(params: {
    vehiclePrice: number;
    downPayment: number;
    termMonths: number;
    interestRate: number;
    customerFico?: number;
    currentScore: number;
    amountFinanced: number;
    monthlyPayment: number;
    customerMonthlyIncome?: number;
    loanToValue: number;
  }): DealRecommendation[] {
    const recommendations: DealRecommendation[] = [];

    const {
      vehiclePrice,
      downPayment,
      termMonths,
      interestRate,
      customerFico,
      currentScore,
      amountFinanced,
      monthlyPayment,
      customerMonthlyIncome,
      loanToValue,
    } = params;

    const downPercent = (downPayment / vehiclePrice) * 100;

    // Down payment recommendations
    if (downPercent < 10) {
      const target = vehiclePrice * 0.15;
      recommendations.push({
        type: 'down_payment',
        priority: 'high',
        current: downPayment,
        suggested: Math.round(target),
        reason: 'Increase to 15% minimum to improve approval odds significantly',
        impact: 'Approval rate increases by ~30%',
        estimatedScoreIncrease: 15,
      });
    } else if (downPercent < 15) {
      const target = vehiclePrice * 0.20;
      recommendations.push({
        type: 'down_payment',
        priority: 'medium',
        current: downPayment,
        suggested: Math.round(target),
        reason: 'Increase to 20% for optimal deal structure and best rates',
        impact: 'Qualify for better rates, lower monthly payment',
        estimatedScoreIncrease: 8,
      });
    }

    // Term recommendations
    if (customerFico && customerFico >= 720 && termMonths > 60) {
      const newPayment = this.calculatePayment(amountFinanced, interestRate, 60);
      const savings = (monthlyPayment * termMonths) - (newPayment * 60);

      recommendations.push({
        type: 'term',
        priority: 'medium',
        current: termMonths,
        suggested: 60,
        reason: 'Excellent credit qualifies for shorter term with substantial interest savings',
        impact: `Save $${Math.round(savings).toLocaleString()} in total interest`,
        estimatedScoreIncrease: 5,
      });
    } else if (termMonths >= 84) {
      recommendations.push({
        type: 'term',
        priority: 'high',
        current: termMonths,
        suggested: 72,
        reason: 'Very long terms (7+ years) significantly increase risk and total cost',
        impact: 'Reduce negative equity risk, save on interest',
        estimatedScoreIncrease: 10,
      });
    }

    // Subprime customer recommendations
    if (customerFico && customerFico < 680 && downPercent < 20) {
      recommendations.push({
        type: 'combined',
        priority: 'high',
        reason: 'Subprime credit needs one of: (1) 20%+ down payment, (2) Co-signer, or (3) Lower vehicle price',
        impact: 'Significantly improves approval odds from ~50% to ~80%',
        estimatedScoreIncrease: 20,
      });
    }

    // LTV recommendations
    if (loanToValue > 120) {
      recommendations.push({
        type: 'down_payment',
        priority: 'high',
        reason: `High LTV (${Math.round(loanToValue)}%) means customer is underwater from day 1`,
        impact: 'Reduce negative equity risk and improve financing options',
        estimatedScoreIncrease: 15,
      });
    }

    // Payment to income recommendations
    if (customerMonthlyIncome) {
      const pti = (monthlyPayment / customerMonthlyIncome) * 100;
      if (pti > 20) {
        recommendations.push({
          type: 'income',
          priority: 'high',
          current: `${Math.round(pti)}%`,
          suggested: '15% or less',
          reason: 'Payment is too high relative to income (lenders prefer 15% or less)',
          impact: 'May not qualify for financing',
          estimatedScoreIncrease: 25,
        });
      }
    }

    // Sort by priority and score impact
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.estimatedScoreIncrease || 0) - (a.estimatedScoreIncrease || 0);
    });

    return recommendations.slice(0, 5); // Return top 5
  }

  /**
   * Assess risks and red flags
   */
  private assessRisks(params: {
    customerFico?: number;
    downPayment: number;
    vehiclePrice: number;
    amountFinanced: number;
    paymentToIncome?: number;
    loanToValue: number;
  }): string[] {
    const risks: string[] = [];

    const {
      customerFico,
      downPayment,
      vehiclePrice,
      amountFinanced,
      paymentToIncome,
      loanToValue,
    } = params;

    // Credit risks
    if (!customerFico) {
      risks.push('⚠️ No FICO score provided - unable to assess approval likelihood');
    } else if (customerFico < 580) {
      risks.push('🚨 Deep subprime credit (FICO <580) - approval highly unlikely without co-signer');
    } else if (customerFico < 620) {
      risks.push('⚠️ Subprime credit - expect limited financing options and higher rates');
    }

    // LTV risks
    if (loanToValue > 130) {
      risks.push(`🚨 Extremely high LTV (${Math.round(loanToValue)}%) - customer severely underwater, very high repossession risk`);
    } else if (loanToValue > 120) {
      risks.push(`⚠️ High LTV (${Math.round(loanToValue)}%) - customer starts underwater, increased default risk`);
    }

    // Down payment risks
    const downPercent = (downPayment / vehiclePrice) * 100;
    if (downPercent < 5) {
      risks.push('⚠️ Very low down payment (<5%) - increases lender risk and repossession likelihood');
    }

    // Payment to income risks
    if (paymentToIncome) {
      if (paymentToIncome > 25) {
        risks.push(`🚨 Payment-to-income ratio (${Math.round(paymentToIncome)}%) exceeds safe limits - likely to be declined`);
      } else if (paymentToIncome > 20) {
        risks.push(`⚠️ High payment-to-income ratio (${Math.round(paymentToIncome)}%) - borderline for approval`);
      }
    }

    // Amount financed risks
    if (amountFinanced > vehiclePrice * 1.3) {
      risks.push('🚨 Amount financed significantly exceeds vehicle value - rolling in excessive negative equity or fees');
    }

    return risks;
  }

  /**
   * Generate sales talking points
   */
  private generateTalkingPoints(
    recommendations: DealRecommendation[],
    monthlyPayment: number,
    customerFico?: number,
    dealScore?: number
  ): string[] {
    const points: string[] = [];

    // Payment highlight
    points.push(`💰 Monthly payment: $${Math.round(monthlyPayment).toLocaleString()}`);

    // Credit assessment
    if (customerFico) {
      if (customerFico >= 740) {
        points.push('✨ Excellent credit - you qualify for our best rates and terms');
      } else if (customerFico >= 680) {
        points.push('✅ Good credit - you have access to competitive financing options');
      } else if (customerFico >= 620) {
        points.push('📊 Fair credit - we can work with you to structure a deal that works');
      } else {
        points.push('🤝 We work with all credit levels - let\'s explore your options together');
      }
    }

    // Deal score messaging
    if (dealScore) {
      if (dealScore >= 85) {
        points.push('⭐ Strong deal structure - excellent approval odds');
      } else if (dealScore >= 70) {
        points.push('👍 Solid deal - good approval potential');
      } else if (dealScore >= 50) {
        points.push('📈 Room for improvement - let\'s optimize this deal together');
      } else {
        points.push('🔧 Deal needs restructuring for best approval chances');
      }
    }

    // Top recommendation
    if (recommendations.length > 0 && recommendations[0].priority === 'high') {
      const topRec = recommendations[0];
      if (topRec.type === 'down_payment' && topRec.suggested) {
        points.push(
          `💡 Increasing down payment to $${typeof topRec.suggested === 'number' ? topRec.suggested.toLocaleString() : topRec.suggested} ` +
          `significantly improves approval odds and lowers your monthly payment`
        );
      } else {
        points.push(`💡 ${topRec.reason}`);
      }
    }

    return points.slice(0, 4); // Return top 4 points
  }

  /**
   * Convert score to letter grade
   */
  private getScoreGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Map ZIP code to state (simplified)
   */
  private zipToState(zipCode: string): string {
    const zip = parseInt(zipCode.substring(0, 3));

    // ZIP code ranges by state
    if (zip >= 900 && zip <= 961) return 'CA';
    if (zip >= 750 && zip <= 799) return 'TX';
    if ((zip >= 885 && zip <= 885)) return 'TX';
    if (zip >= 320 && zip <= 349) return 'FL';
    if (zip >= 100 && zip <= 149) return 'NY';
    if (zip >= 150 && zip <= 196) return 'PA';
    if (zip >= 600 && zip <= 629) return 'IL';
    if (zip >= 430 && zip <= 458) return 'OH';
    if (zip >= 300 && zip <= 319) return 'GA';
    if (zip >= 270 && zip <= 289) return 'NC';
    if (zip >= 480 && zip <= 499) return 'MI';

    return 'CA'; // Default fallback
  }

  /**
   * Load learned patterns from disk
   */
  private async loadPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(this.dataPath, 'learned_patterns.json');
      const data = await fs.readFile(patternsPath, 'utf-8');
      this.patterns = { ...DEFAULT_PATTERNS, ...JSON.parse(data) };
    } catch (error) {
      // Use defaults if file doesn't exist
      this.patterns = DEFAULT_PATTERNS;
    }
  }

  /**
   * Save learned patterns to disk
   */
  async savePatterns(patterns: Partial<LearnedPatterns>): Promise<void> {
    try {
      this.patterns = { ...this.patterns, ...patterns };
      const patternsPath = path.join(this.dataPath, 'learned_patterns.json');
      await fs.writeFile(patternsPath, JSON.stringify(this.patterns, null, 2));
    } catch (error) {
      console.error('[DealAnalyzer] Error saving patterns:', error);
    }
  }
}

// Export singleton instance
export const dealAnalyzer = new DealAnalyzer();
