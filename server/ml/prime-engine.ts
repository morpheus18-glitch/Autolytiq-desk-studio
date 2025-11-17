/**
 * PRIME ENGINE - ML OPTIMIZATION SERVICE
 *
 * Thompson Sampling (Multi-Armed Bandit) for deal strategy optimization.
 * Learns which strategies work best from real outcomes.
 *
 * Features:
 * - Online learning (no retraining needed)
 * - Thompson Sampling for exploration/exploitation balance
 * - Strategy recommendations based on context
 * - Performance tracking and confidence intervals
 * - Automatic pattern learning
 *
 * Based on: Thompson Sampling for Contextual Bandits
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface Strategy {
  key: string;
  name: string;
  description: string;
  wins: number;
  trials: number;
  contextRules?: StrategyContextRules;
}

export interface StrategyContextRules {
  minFico?: number;
  maxFico?: number;
  minDownPercent?: number;
  maxDownPercent?: number;
  minLTV?: number;
  maxLTV?: number;
}

export interface DealContext {
  vehiclePrice: number;
  downPayment: number;
  termMonths: number;
  tradeValue?: number;
  customerFico?: number;
  loanToValue?: number;
}

export interface StrategyRecommendation {
  strategy: string;
  strategyKey: string;
  confidence: number;
  description: string;
  recommendations: StrategyAction[];
  allStrategies: Record<string, StrategyPerformance>;
}

export interface StrategyAction {
  action: string;
  from?: number | string;
  to?: number | string;
  reason: string;
  expectedImpact: string;
}

export interface StrategyPerformance {
  name: string;
  successRate: number;
  trials: number;
  confidence: number;
  confidenceInterval: [number, number];
}

export interface PerformanceReport {
  strategies: Record<string, StrategyPerformance>;
  bestStrategy: string;
  totalTrials: number;
  overallSuccessRate: number;
  lastUpdated: string;
}

// ============================================================================
// PRIME ENGINE CLASS
// ============================================================================

export class PrimeEngine {
  private strategies: Map<string, Strategy> = new Map();
  private stateFile: string;
  private lastSaveTime: number = 0;
  private saveThrottleMs: number = 5000; // Save at most every 5 seconds

  constructor(stateFile: string = 'server/data/ml_state.json') {
    this.stateFile = stateFile;
    this.initializeStrategies();
    this.loadState();
  }

  /**
   * Initialize default strategies
   */
  private initializeStrategies(): void {
    const defaultStrategies: Strategy[] = [
      {
        key: 'high_down_payment',
        name: 'Maximize Down Payment',
        description: 'Push for 20%+ down payment to improve approval odds and rates',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works best when customer can afford it
          minDownPercent: 0,
          maxLTV: 120,
        },
      },
      {
        key: 'extend_term',
        name: 'Extend Term',
        description: 'Use longer terms (72-84 months) for lower monthly payment',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works best for subprime customers who need lower payments
          maxFico: 680,
        },
      },
      {
        key: 'optimize_rate',
        name: 'Optimize Interest Rate',
        description: 'Focus on securing best available interest rate',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works best for prime customers
          minFico: 680,
        },
      },
      {
        key: 'maximize_trade',
        name: 'Maximize Trade Value',
        description: 'Push trade-in value to reduce amount financed',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works when customer has trade
        },
      },
      {
        key: 'reduce_vehicle_price',
        name: 'Reduce Vehicle Price',
        description: 'Guide customer toward lower-priced vehicles for better structure',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works for customers with payment-to-income issues
          maxFico: 640,
        },
      },
      {
        key: 'add_cosigner',
        name: 'Add Co-Signer',
        description: 'Recommend co-signer to improve approval odds',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works for subprime with low down payment
          maxFico: 640,
          maxDownPercent: 15,
        },
      },
      {
        key: 'balanced_structure',
        name: 'Balanced Structure',
        description: 'Use moderate down, term, and rate for stable deal',
        wins: 1,
        trials: 1,
        contextRules: {
          // Works for most mid-range customers
          minFico: 640,
          maxFico: 720,
        },
      },
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.key, strategy);
    });
  }

  /**
   * Select best strategy using Thompson Sampling
   *
   * Thompson Sampling balances:
   * - Exploitation: Use strategies that have worked well
   * - Exploration: Try strategies we're uncertain about
   */
  selectStrategy(context: DealContext): { strategyKey: string; confidence: number } {
    // Filter strategies that match context
    const applicableStrategies = Array.from(this.strategies.values()).filter(
      strategy => this.matchesContext(strategy, context)
    );

    if (applicableStrategies.length === 0) {
      // Fallback to all strategies if none match
      applicableStrategies.push(...Array.from(this.strategies.values()));
    }

    // Thompson Sampling: sample from Beta distribution for each strategy
    const samples = applicableStrategies.map(strategy => {
      const alpha = strategy.wins + 1; // Add 1 for prior
      const beta = strategy.trials - strategy.wins + 1;

      // Sample from Beta(alpha, beta)
      const sample = this.sampleBeta(alpha, beta);

      return {
        strategyKey: strategy.key,
        sample,
      };
    });

    // Select strategy with highest sample
    const best = samples.reduce((prev, curr) =>
      curr.sample > prev.sample ? curr : prev
    );

    return {
      strategyKey: best.strategyKey,
      confidence: best.sample,
    };
  }

  /**
   * Get ML-optimized recommendation for a deal
   */
  getRecommendation(context: DealContext): StrategyRecommendation {
    // Select best strategy using Thompson Sampling
    const { strategyKey, confidence } = this.selectStrategy(context);
    const strategy = this.strategies.get(strategyKey);

    if (!strategy) {
      throw new Error(`Strategy ${strategyKey} not found`);
    }

    // Generate specific actions based on strategy
    const recommendations = this.applyStrategy(strategyKey, context);

    // Get performance data for all strategies
    const allStrategies: Record<string, StrategyPerformance> = {};
    this.strategies.forEach((s, key) => {
      const successRate = s.wins / s.trials;
      const ci = this.calculateConfidenceInterval(s.wins, s.trials);

      allStrategies[key] = {
        name: s.name,
        successRate: Math.round(successRate * 1000) / 10, // As percentage
        trials: s.trials,
        confidence: Math.round(confidence * 100),
        confidenceInterval: [
          Math.round(ci[0] * 1000) / 10,
          Math.round(ci[1] * 1000) / 10,
        ],
      };
    });

    return {
      strategy: strategy.name,
      strategyKey: strategy.key,
      confidence: Math.round(confidence * 100),
      description: strategy.description,
      recommendations,
      allStrategies,
    };
  }

  /**
   * Apply specific strategy to generate actions
   */
  private applyStrategy(strategyKey: string, context: DealContext): StrategyAction[] {
    const actions: StrategyAction[] = [];
    const { vehiclePrice, downPayment, termMonths, tradeValue, customerFico } = context;
    const downPercent = (downPayment / vehiclePrice) * 100;

    switch (strategyKey) {
      case 'high_down_payment':
        if (downPercent < 20) {
          const target = vehiclePrice * 0.20;
          actions.push({
            action: 'increase_down',
            from: downPayment,
            to: Math.round(target),
            reason: 'ML model suggests maximizing down payment for this profile',
            expectedImpact: 'Improves approval odds by 25-30%, qualifies for better rates',
          });
        }
        break;

      case 'extend_term':
        if (termMonths < 72) {
          actions.push({
            action: 'extend_term',
            from: termMonths,
            to: 72,
            reason: 'ML model suggests longer term for this customer profile',
            expectedImpact: 'Lowers monthly payment significantly, easier approval',
          });
        }
        break;

      case 'optimize_rate':
        actions.push({
          action: 'optimize_rate',
          reason: 'ML model suggests focusing on rate shopping for this prime customer',
          expectedImpact: 'Even 0.5% rate reduction saves thousands over loan term',
        });
        if (customerFico && customerFico >= 720) {
          actions.push({
            action: 'shop_multiple_lenders',
            reason: 'Excellent credit qualifies for competitive rate shopping',
            expectedImpact: 'Can secure rates 1-2% lower than average',
          });
        }
        break;

      case 'maximize_trade':
        if (tradeValue && tradeValue > 0) {
          actions.push({
            action: 'maximize_trade',
            reason: 'ML model suggests pushing trade value higher',
            expectedImpact: 'Every $1K increase in trade reduces amount financed and improves LTV',
          });
          actions.push({
            action: 'get_multiple_appraisals',
            reason: 'Get 2-3 trade valuations to maximize value',
            expectedImpact: 'Can increase trade value by $500-$2000',
          });
        }
        break;

      case 'reduce_vehicle_price':
        actions.push({
          action: 'guide_to_lower_price',
          reason: 'ML model suggests customer needs lower price point for successful financing',
          expectedImpact: 'Improves payment-to-income ratio, increases approval odds',
        });
        if (vehiclePrice > 35000) {
          actions.push({
            action: 'target_price_range',
            to: '$25,000-$30,000',
            reason: 'Target mid-range vehicles for better financing options',
            expectedImpact: 'Significantly better approval rates in this price range',
          });
        }
        break;

      case 'add_cosigner':
        actions.push({
          action: 'recommend_cosigner',
          reason: 'ML model suggests co-signer for this credit profile',
          expectedImpact: 'Dramatically improves approval odds (50% → 85%)',
        });
        actions.push({
          action: 'explain_cosigner_benefits',
          reason: 'Co-signer can help secure better rates and terms',
          expectedImpact: 'May qualify for rates 2-4% lower',
        });
        break;

      case 'balanced_structure':
        actions.push({
          action: 'balanced_approach',
          reason: 'ML model suggests balanced structure: 15% down, 60-month term',
          expectedImpact: 'Best balance of approval odds, payment, and total cost',
        });
        if (downPercent < 15) {
          actions.push({
            action: 'target_15_percent_down',
            to: Math.round(vehiclePrice * 0.15),
            reason: '15% down payment is sweet spot for this profile',
            expectedImpact: 'Good approval odds without excessive cash requirement',
          });
        }
        break;
    }

    return actions;
  }

  /**
   * Record outcome of using a strategy
   * This is how the engine learns!
   */
  recordOutcome(strategyKey: string, success: boolean): void {
    const strategy = this.strategies.get(strategyKey);
    if (!strategy) {
      console.error(`[PrimeEngine] Unknown strategy: ${strategyKey}`);
      return;
    }

    // Update strategy statistics
    strategy.trials += 1;
    if (success) {
      strategy.wins += 1;
    }

    // Save state (throttled)
    this.saveStateThrottled();

    console.log(
      `[PrimeEngine] Recorded ${success ? 'success' : 'failure'} for strategy "${strategy.name}". ` +
      `New stats: ${strategy.wins}/${strategy.trials} (${Math.round((strategy.wins / strategy.trials) * 100)}%)`
    );
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const strategies: Record<string, StrategyPerformance> = {};
    let totalTrials = 0;
    let totalWins = 0;

    this.strategies.forEach((strategy, key) => {
      const successRate = strategy.wins / strategy.trials;
      const ci = this.calculateConfidenceInterval(strategy.wins, strategy.trials);

      strategies[key] = {
        name: strategy.name,
        successRate: Math.round(successRate * 1000) / 10,
        trials: strategy.trials,
        confidence: Math.round((1 - (ci[1] - ci[0])) * 100),
        confidenceInterval: [
          Math.round(ci[0] * 1000) / 10,
          Math.round(ci[1] * 1000) / 10,
        ],
      };

      totalTrials += strategy.trials;
      totalWins += strategy.wins;
    });

    // Find best strategy
    let bestStrategy = '';
    let bestRate = 0;
    this.strategies.forEach((strategy, key) => {
      const rate = strategy.wins / strategy.trials;
      if (rate > bestRate) {
        bestRate = rate;
        bestStrategy = key;
      }
    });

    return {
      strategies,
      bestStrategy,
      totalTrials,
      overallSuccessRate: Math.round((totalWins / totalTrials) * 1000) / 10,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStatistics(): void {
    this.strategies.forEach(strategy => {
      strategy.wins = 1;
      strategy.trials = 1;
    });
    this.saveState();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if strategy matches context rules
   */
  private matchesContext(strategy: Strategy, context: DealContext): boolean {
    if (!strategy.contextRules) return true;

    const rules = strategy.contextRules;
    const downPercent = (context.downPayment / context.vehiclePrice) * 100;

    // Check FICO rules
    if (context.customerFico) {
      if (rules.minFico && context.customerFico < rules.minFico) return false;
      if (rules.maxFico && context.customerFico > rules.maxFico) return false;
    }

    // Check down payment rules
    if (rules.minDownPercent && downPercent < rules.minDownPercent) return false;
    if (rules.maxDownPercent && downPercent > rules.maxDownPercent) return false;

    // Check LTV rules
    if (context.loanToValue) {
      if (rules.minLTV && context.loanToValue < rules.minLTV) return false;
      if (rules.maxLTV && context.loanToValue > rules.maxLTV) return false;
    }

    return true;
  }

  /**
   * Sample from Beta distribution
   * Uses rejection sampling for simplicity
   */
  private sampleBeta(alpha: number, beta: number): number {
    // For small alpha/beta, use simple approximation
    if (alpha === 1 && beta === 1) {
      return Math.random();
    }

    // Approximate using ratio of two Gamma samples
    const gammaAlpha = this.sampleGamma(alpha);
    const gammaBeta = this.sampleGamma(beta);

    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  /**
   * Sample from Gamma distribution
   * Using Marsaglia and Tsang method
   */
  private sampleGamma(alpha: number): number {
    if (alpha < 1) {
      // For alpha < 1, use transformation
      return this.sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
    }

    // Marsaglia and Tsang method
    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.randomNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();
      const x2 = x * x;

      if (u < 1 - 0.0331 * x2 * x2) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Generate random normal variable (Box-Muller transform)
   */
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Calculate Wilson score confidence interval
   */
  private calculateConfidenceInterval(
    wins: number,
    trials: number,
    confidence: number = 0.95
  ): [number, number] {
    if (trials === 0) return [0, 1];

    const p = wins / trials;
    const z = 1.96; // 95% confidence

    const denominator = 1 + (z * z) / trials;
    const center = (p + (z * z) / (2 * trials)) / denominator;
    const margin =
      (z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))) /
      denominator;

    return [Math.max(0, center - margin), Math.min(1, center + margin)];
  }

  /**
   * Save state to disk (throttled)
   */
  private async saveStateThrottled(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveTime < this.saveThrottleMs) {
      return; // Skip save if too soon
    }

    this.lastSaveTime = now;
    await this.saveState();
  }

  /**
   * Save state to disk
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        lastUpdated: new Date().toISOString(),
        strategies: Array.from(this.strategies.values()),
      };

      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('[PrimeEngine] Error saving state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      const state = JSON.parse(data);

      if (state.strategies && Array.isArray(state.strategies)) {
        state.strategies.forEach((s: Strategy) => {
          if (this.strategies.has(s.key)) {
            // Update existing strategy statistics
            const strategy = this.strategies.get(s.key)!;
            strategy.wins = s.wins;
            strategy.trials = s.trials;
          }
        });

        console.log(`[PrimeEngine] Loaded state from ${this.stateFile}`);
      }
    } catch (error) {
      // File doesn't exist yet - that's okay, we'll create it
      console.log('[PrimeEngine] No saved state found, using defaults');
    }
  }
}

// Export singleton instance
export const primeEngine = new PrimeEngine();
