/**
 * INTELLIGENCE SERVICE
 *
 * Unified intelligence layer combining:
 * - WHACO clustering for customer segmentation
 * - Oscillator coordination for team management
 *
 * Provides high-level API for:
 * - Customer analysis and assignment
 * - Team coordination insights
 * - Anomaly detection
 * - Performance optimization
 */

import { WHACOEngine, type CustomerFeatures, type ClusterResult } from '../ml/whaco-engine';
import { OscillatorNetwork, type TeamStatus } from '../ml/oscillator-network';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerData {
  customerId: string;
  creditScore?: number;
  annualIncome?: number;
  vehiclePrice: number;
  downPayment?: number;
  tradeValue?: number;
  visitCount?: number;
  timeOnLot?: number; // minutes
  engagement?: number; // 0-1 scale
  coBuyer?: boolean;
  termMonths?: number;
  paymentSensitivity?: number; // 0-1 scale
}

export interface CustomerAnalysis {
  customerAnalysis: ClusterResult;
  assignedTo: string | null;
  teamStatus: TeamStatus;
  recommendedActions: string[];
}

export interface TeamInsights {
  teamStatus: TeamStatus;
  customerSegments: any;
  recentAnomalies: any[];
}

// ============================================================================
// INTELLIGENCE SERVICE CLASS
// ============================================================================

export class IntelligenceService {
  private whaco: WHACOEngine;
  private oscillators: OscillatorNetwork;
  private dataPath: string;

  constructor(dataPath: string = 'server/data') {
    this.dataPath = dataPath;

    // Initialize engines
    this.whaco = new WHACOEngine({
      nClusters: 5,
      featureDim: 10,
      learningRate: 0.05,
      outlierThreshold: 3.5,
    });

    this.oscillators = new OscillatorNetwork(0.3);

    // Load saved states
    this.loadStates();
  }

  /**
   * Load saved states from disk
   */
  private async loadStates(): Promise<void> {
    try {
      await this.whaco.loadState(path.join(this.dataPath, 'whaco_state.json'));
      await this.oscillators.loadState(path.join(this.dataPath, 'oscillator_state.json'));
    } catch (error) {
      console.log('[IntelligenceService] No saved states found, using fresh engines');
    }
  }

  /**
   * Full customer intelligence analysis
   *
   * Returns:
   * - Customer segment
   * - Fraud/anomaly detection
   * - Recommended salesperson assignment
   * - Priority level
   * - Recommended actions
   */
  analyzeCustomer(customerData: CustomerData): CustomerAnalysis {
    // Extract features for WHACO
    const features = this.extractCustomerFeatures(customerData);

    // Get clustering results
    const clusterResult = this.whaco.processCustomer(features);

    // Get optimal salesperson assignment
    const assignedSalesperson = this.oscillators.assignNewLead(
      clusterResult.priorityScore
    );

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(
      clusterResult,
      customerData
    );

    return {
      customerAnalysis: clusterResult,
      assignedTo: assignedSalesperson,
      teamStatus: this.oscillators.getTeamStatus(),
      recommendedActions,
    };
  }

  /**
   * Extract normalized features for WHACO
   */
  private extractCustomerFeatures(customerData: CustomerData): Partial<CustomerFeatures> {
    const { vehiclePrice } = customerData;

    return {
      ficoScore: customerData.creditScore || 650,
      income: customerData.annualIncome || 50000,
      downPaymentPercent: (customerData.downPayment || 0) / vehiclePrice,
      previousVisits: customerData.visitCount || 0,
      timeOnLotMinutes: customerData.timeOnLot || 30,
      engagementScore: customerData.engagement || 0.5,
      dealComplexity: this.calculateComplexity(customerData),
      tradeInValue: customerData.tradeValue || 0,
      desiredTerm: customerData.termMonths || 60,
      monthlyPaymentSensitivity: customerData.paymentSensitivity || 0.5,
    };
  }

  /**
   * Calculate deal complexity score
   */
  private calculateComplexity(customerData: CustomerData): number {
    let complexity = 0.5; // Base

    if ((customerData.tradeValue || 0) > 0) {
      complexity += 0.2; // Trade-in adds complexity
    }

    if ((customerData.creditScore || 700) < 620) {
      complexity += 0.2; // Subprime adds complexity
    }

    if (customerData.coBuyer) {
      complexity += 0.1; // Co-buyer adds complexity
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Generate recommended actions based on analysis
   */
  private generateRecommendedActions(
    clusterResult: ClusterResult,
    customerData: CustomerData
  ): string[] {
    const actions: string[] = [];

    // Cluster-based recommendations
    if (clusterResult.clusterName === 'Prime Buyers') {
      actions.push('Show premium inventory');
      actions.push('Offer competitive financing rates');
      actions.push('Quick close approach - minimal back and forth');
    } else if (clusterResult.clusterName === 'Motivated Shoppers') {
      actions.push('Build rapport and trust');
      actions.push('Emphasize value proposition');
      actions.push('Flexible terms and options');
    } else if (clusterResult.clusterName === 'Tire Kickers') {
      actions.push('Capture contact information');
      actions.push('Minimal time investment');
      actions.push('Add to follow-up campaign');
    } else if (clusterResult.clusterName === 'Credit Challenged') {
      actions.push('Set realistic expectations');
      actions.push('Focus on larger down payment');
      actions.push('Contact subprime lenders');
    }

    // Outlier-based recommendations
    if (clusterResult.isOutlier) {
      actions.push('⚠️ ALERT: Unusual pattern detected - extra verification recommended');
      actions.push('Review customer history for fraud signals');
      actions.push('Consider manager approval for deal structure');
    }

    // Priority-based recommendations
    if (clusterResult.priorityScore > 0.8) {
      actions.push('🔥 HIGH PRIORITY - Assign experienced salesperson');
    } else if (clusterResult.priorityScore < 0.4) {
      actions.push('LOW PRIORITY - Can be handled by junior staff');
    }

    return actions;
  }

  /**
   * Update oscillator network (call periodically)
   */
  updateTeamState(): void {
    this.oscillators.update(0.1);
  }

  /**
   * Record that a deal was closed
   */
  recordDealClosed(salespersonId: string): void {
    this.oscillators.recordDealClosed(salespersonId);
  }

  /**
   * Update salesperson workload
   */
  updateSalespersonWorkload(salespersonId: string, activeDeals: number): void {
    this.oscillators.updateWorkload(salespersonId, activeDeals);
  }

  /**
   * Add salesperson to team
   */
  addSalesperson(
    id: string,
    name: string,
    skillLevel: number = 0.7,
    naturalFrequency: number = 1.0
  ): void {
    this.oscillators.addSalesperson(id, name, skillLevel, naturalFrequency);
  }

  /**
   * Remove salesperson from team
   */
  removeSalesperson(id: string): void {
    this.oscillators.removeSalesperson(id);
  }

  /**
   * Get comprehensive team coordination insights
   */
  getTeamInsights(): TeamInsights {
    return {
      teamStatus: this.oscillators.getTeamStatus(),
      customerSegments: this.whaco.getClusterSummary(),
      recentAnomalies: this.whaco.getRecentOutliers(20),
    };
  }

  /**
   * Get team status only
   */
  getTeamStatus(): TeamStatus {
    return this.oscillators.getTeamStatus();
  }

  /**
   * Get customer segments summary
   */
  getCustomerSegments() {
    return this.whaco.getClusterSummary();
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit: number = 10) {
    return this.whaco.getRecentOutliers(limit);
  }

  /**
   * Reset daily stats (call at end of business day)
   */
  resetDailyStats(): void {
    this.oscillators.resetDailyStats();
  }

  /**
   * Persist all engine states to disk
   */
  async saveStates(): Promise<void> {
    try {
      await this.whaco.saveState(path.join(this.dataPath, 'whaco_state.json'));
      await this.oscillators.saveState(path.join(this.dataPath, 'oscillator_state.json'));
      console.log('[IntelligenceService] States saved successfully');
    } catch (error) {
      console.error('[IntelligenceService] Error saving states:', error);
    }
  }

  /**
   * Reset all engines (for testing)
   */
  reset(): void {
    this.whaco.reset();
    this.oscillators.reset();
  }

  /**
   * Get WHACO engine instance (for direct access)
   */
  getWHACOEngine(): WHACOEngine {
    return this.whaco;
  }

  /**
   * Get Oscillator network instance (for direct access)
   */
  getOscillatorNetwork(): OscillatorNetwork {
    return this.oscillators;
  }
}

// Export singleton instance
export const intelligenceService = new IntelligenceService();
