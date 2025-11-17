/**
 * WHACO ENGINE - Weighted Heuristic Adaptive Clustering with Outliers
 *
 * Real-time incremental clustering for customer segmentation and anomaly detection.
 * Adapts cluster centroids and feature weights as new data arrives - no retraining needed.
 *
 * Features:
 * - Adaptive clustering (centroids evolve with data)
 * - Dynamic feature weighting (learns which features matter most)
 * - Outlier detection (fraud signals, unusual patterns)
 * - Customer segmentation (hot leads, tire kickers, credit risks)
 * - Zero external dependencies
 *
 * Based on: Adaptive clustering with online learning
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerFeatures {
  ficoScore: number;
  income: number;
  downPaymentPercent: number;
  previousVisits: number;
  timeOnLotMinutes: number;
  engagementScore: number;
  dealComplexity: number;
  tradeInValue: number;
  desiredTerm: number;
  monthlyPaymentSensitivity: number;
}

export interface ClusterProfile {
  name: string;
  description: string;
  approach: string;
  priority: number;
}

export interface ClusterResult {
  clusterId: number;
  clusterName: string;
  clusterDescription: string;
  isOutlier: boolean;
  outlierReason: string | null;
  confidence: number;
  recommendedApproach: string;
  priorityScore: number;
}

export interface OutlierRecord {
  timestamp: string;
  features: Partial<CustomerFeatures>;
  clusterId: number;
  reason: string;
}

export interface ClusterSummary {
  totalCustomersProcessed: number;
  outliersDetected: number;
  clusters: Array<{
    id: number;
    profile: ClusterProfile;
    centroid: number[];
    sizeEstimate: number;
  }>;
}

interface WHACOState {
  centroids: number[][];
  featureWeights: number[];
  variances: number[][];
  totalPoints: number;
  outliers: OutlierRecord[];
}

// ============================================================================
// WHACO ENGINE CLASS
// ============================================================================

export class WHACOEngine {
  private nClusters: number;
  private featureDim: number;
  private learningRate: number;
  private outlierThreshold: number;
  private windowSize: number;

  private centroids: number[][];
  private featureWeights: number[];
  private variances: number[][];
  private dataWindow: number[][];
  private totalPoints: number;
  private outliersDetected: OutlierRecord[];

  constructor(options: {
    nClusters?: number;
    featureDim?: number;
    learningRate?: number;
    outlierThreshold?: number;
    windowSize?: number;
  } = {}) {
    this.nClusters = options.nClusters || 5;
    this.featureDim = options.featureDim || 10;
    this.learningRate = options.learningRate || 0.05;
    this.outlierThreshold = options.outlierThreshold || 3.5;
    this.windowSize = options.windowSize || 500;

    // Initialize cluster centroids randomly
    this.centroids = Array.from({ length: this.nClusters }, () =>
      Array.from({ length: this.featureDim }, () => Math.random())
    );

    // Feature importance weights (all equal initially)
    this.featureWeights = Array(this.featureDim).fill(1 / this.featureDim);

    // Variance estimates for each cluster
    this.variances = Array.from({ length: this.nClusters }, () =>
      Array(this.featureDim).fill(0.1)
    );

    // Recent data window
    this.dataWindow = [];

    // Tracking
    this.totalPoints = 0;
    this.outliersDetected = [];
  }

  /**
   * Process a new customer and return cluster assignment + analysis
   */
  processCustomer(customerFeatures: Partial<CustomerFeatures>): ClusterResult {
    // Convert features to vector
    const featureVector = this.dictToVector(customerFeatures);

    // Apply feature weighting
    const weightedFeatures = featureVector.map(
      (val, idx) => val * this.featureWeights[idx]
    );

    // Find nearest cluster
    const clusterId = this.findNearestCluster(weightedFeatures);

    // Check if outlier
    const isOutlier = this.isOutlier(
      weightedFeatures,
      this.centroids[clusterId],
      this.variances[clusterId]
    );

    // Update cluster centroid (incremental learning)
    if (!isOutlier) {
      this.updateCentroid(clusterId, weightedFeatures);
      this.updateFeatureWeights(weightedFeatures, clusterId);
      this.updateVariance(clusterId, weightedFeatures);
    }

    // Add to window
    this.dataWindow.push(weightedFeatures);
    if (this.dataWindow.length > this.windowSize) {
      this.dataWindow.shift();
    }
    this.totalPoints++;

    // Generate insights
    const clusterProfile = this.getClusterProfile(clusterId);

    const result: ClusterResult = {
      clusterId,
      clusterName: clusterProfile.name,
      clusterDescription: clusterProfile.description,
      isOutlier,
      outlierReason: isOutlier
        ? this.explainOutlier(weightedFeatures, clusterId)
        : null,
      confidence: this.calculateConfidence(weightedFeatures, clusterId),
      recommendedApproach: clusterProfile.approach,
      priorityScore: clusterProfile.priority,
    };

    if (isOutlier) {
      this.outliersDetected.push({
        timestamp: new Date().toISOString(),
        features: customerFeatures,
        clusterId,
        reason: result.outlierReason || 'Unknown anomaly',
      });

      // Keep only last 1000 outliers
      if (this.outliersDetected.length > 1000) {
        this.outliersDetected = this.outliersDetected.slice(-1000);
      }
    }

    return result;
  }

  /**
   * Convert feature dict to normalized vector
   */
  private dictToVector(features: Partial<CustomerFeatures>): number[] {
    const vector: number[] = [];

    // FICO score (300-850 range)
    const fico = features.ficoScore ?? 650;
    vector.push((fico - 300) / (850 - 300));

    // Income (cap at $200k)
    const income = features.income ?? 50000;
    vector.push(Math.min(income / 200000, 1.0));

    // Down payment percent (0-1)
    vector.push(features.downPaymentPercent ?? 0.1);

    // Previous visits (cap at 10)
    const visits = features.previousVisits ?? 0;
    vector.push(Math.min(visits / 10, 1.0));

    // Time on lot (cap at 180 minutes)
    const timeOnLot = features.timeOnLotMinutes ?? 30;
    vector.push(Math.min(timeOnLot / 180, 1.0));

    // Engagement score (0-1)
    vector.push(features.engagementScore ?? 0.5);

    // Deal complexity (0-1)
    vector.push(features.dealComplexity ?? 0.5);

    // Trade-in value (normalize by $30k)
    const tradeValue = features.tradeInValue ?? 0;
    vector.push(Math.min(tradeValue / 30000, 1.0));

    // Desired term (normalize by 84 months)
    const term = features.desiredTerm ?? 60;
    vector.push(term / 84);

    // Payment sensitivity (0-1)
    vector.push(features.monthlyPaymentSensitivity ?? 0.5);

    return vector.slice(0, this.featureDim);
  }

  /**
   * Find closest cluster to point
   */
  private findNearestCluster(point: number[]): number {
    let minDistance = Infinity;
    let nearestCluster = 0;

    for (let i = 0; i < this.nClusters; i++) {
      const distance = this.euclideanDistance(point, this.centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = i;
      }
    }

    return nearestCluster;
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Check if point is an outlier (Mahalanobis-like distance)
   */
  private isOutlier(
    point: number[],
    centroid: number[],
    variance: number[]
  ): boolean {
    let distance = 0;

    for (let i = 0; i < point.length; i++) {
      const diff = point[i] - centroid[i];
      const safeVariance = Math.max(variance[i], 1e-6);
      distance += (diff * diff) / safeVariance;
    }

    distance = Math.sqrt(distance);
    return distance > this.outlierThreshold;
  }

  /**
   * Update cluster centroid incrementally
   */
  private updateCentroid(clusterId: number, point: number[]): void {
    const oldCentroid = this.centroids[clusterId];
    this.centroids[clusterId] = oldCentroid.map(
      (val, idx) => val + this.learningRate * (point[idx] - val)
    );
  }

  /**
   * Adjust feature importance based on variance
   */
  private updateFeatureWeights(point: number[], clusterId: number): void {
    const centroid = this.centroids[clusterId];
    const update = point.map((val, idx) => Math.abs(val - centroid[idx]));

    // Increase weights for discriminative features
    this.featureWeights = this.featureWeights.map(
      (weight, idx) => weight + 0.001 * update[idx]
    );

    // Normalize
    const sum = this.featureWeights.reduce((a, b) => a + b, 0);
    this.featureWeights = this.featureWeights.map((w) => w / sum);
  }

  /**
   * Update variance estimate for cluster
   */
  private updateVariance(clusterId: number, point: number[]): void {
    const centroid = this.centroids[clusterId];
    const diff = point.map((val, idx) => val - centroid[idx]);
    const squaredDiff = diff.map((d) => d * d);

    // Exponential moving average
    const alpha = 0.1;
    this.variances[clusterId] = this.variances[clusterId].map(
      (variance, idx) => (1 - alpha) * variance + alpha * squaredDiff[idx]
    );
  }

  /**
   * Calculate confidence of cluster assignment
   */
  private calculateConfidence(point: number[], clusterId: number): number {
    const distance = this.euclideanDistance(point, this.centroids[clusterId]);
    const avgVariance =
      this.variances[clusterId].reduce((a, b) => a + b, 0) /
      this.variances[clusterId].length;

    const confidence = Math.exp(-distance / (avgVariance + 1e-6));
    return Math.min(confidence, 1.0);
  }

  /**
   * Get human-readable profile for cluster
   */
  private getClusterProfile(clusterId: number): ClusterProfile {
    const centroid = this.centroids[clusterId];

    // Extract key features
    const fico = centroid[0]; // Normalized FICO
    const income = centroid[1]; // Normalized income
    const engagement = centroid[5]; // Engagement score
    const downPayment = centroid[2]; // Down payment %

    // Rule-based profiling
    if (fico > 0.7 && income > 0.6) {
      return {
        name: 'Prime Buyers',
        description: 'High credit, strong income, serious buyers',
        approach: 'Premium vehicles, competitive rates, quick close',
        priority: 0.95,
      };
    } else if (fico > 0.5 && engagement > 0.6) {
      return {
        name: 'Motivated Shoppers',
        description: 'Decent credit, actively engaged, ready to buy',
        approach: 'Focus on value, flexible terms, build rapport',
        priority: 0.85,
      };
    } else if (engagement < 0.3) {
      return {
        name: 'Tire Kickers',
        description: 'Low engagement, browsing, not serious',
        approach: 'Minimal time investment, capture info for follow-up',
        priority: 0.3,
      };
    } else if (fico < 0.4) {
      return {
        name: 'Credit Challenged',
        description: 'Subprime credit, needs special financing',
        approach:
          'Larger down payment, subprime lenders, realistic expectations',
        priority: 0.6,
      };
    } else if (downPayment > 0.3 && fico > 0.45) {
      return {
        name: 'Cash Strong Buyers',
        description: 'High down payment, moderate credit',
        approach: 'Leverage cash position, focus on deal structure',
        priority: 0.8,
      };
    } else {
      return {
        name: 'Average Shoppers',
        description: 'Middle-of-road credit and income',
        approach: 'Standard process, competitive financing',
        priority: 0.7,
      };
    }
  }

  /**
   * Explain why point is an outlier
   */
  private explainOutlier(point: number[], clusterId: number): string {
    const centroid = this.centroids[clusterId];
    const diff = point.map((val, idx) => Math.abs(val - centroid[idx]));

    const featureNames = [
      'FICO',
      'Income',
      'Down%',
      'Visits',
      'TimeOnLot',
      'Engagement',
      'Complexity',
      'TradeValue',
      'Term',
      'PaymentSens',
    ];

    // Find top 3 most anomalous features
    const indexed = diff.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => b.value - a.value);
    const topAnomalies = indexed.slice(0, 3);

    const reasons = topAnomalies
      .map(({ index }) => {
        if (index < featureNames.length) {
          return `${featureNames[index]} significantly different from cluster pattern`;
        }
        return null;
      })
      .filter((r): r is string => r !== null);

    return reasons.join(' | ') || 'Unusual pattern detected';
  }

  /**
   * Get summary of all clusters
   */
  getClusterSummary(): ClusterSummary {
    return {
      totalCustomersProcessed: this.totalPoints,
      outliersDetected: this.outliersDetected.length,
      clusters: Array.from({ length: this.nClusters }, (_, i) => ({
        id: i,
        profile: this.getClusterProfile(i),
        centroid: this.centroids[i],
        sizeEstimate: this.estimateClusterSize(i),
      })),
    };
  }

  /**
   * Estimate how many points belong to this cluster
   */
  private estimateClusterSize(clusterId: number): number {
    if (this.dataWindow.length === 0) return 0;

    return this.dataWindow.filter(
      (point) => this.findNearestCluster(point) === clusterId
    ).length;
  }

  /**
   * Get most recent outliers detected
   */
  getRecentOutliers(limit: number = 10): OutlierRecord[] {
    return this.outliersDetected.slice(-limit);
  }

  /**
   * Save engine state to disk
   */
  async saveState(filepath: string): Promise<void> {
    const state: WHACOState = {
      centroids: this.centroids,
      featureWeights: this.featureWeights,
      variances: this.variances,
      totalPoints: this.totalPoints,
      outliers: this.outliersDetected.slice(-100), // Keep last 100
    };

    await fs.writeFile(filepath, JSON.stringify(state, null, 2));
  }

  /**
   * Load engine state from disk
   */
  async loadState(filepath: string): Promise<void> {
    try {
      const data = await fs.readFile(filepath, 'utf-8');
      const state: WHACOState = JSON.parse(data);

      this.centroids = state.centroids;
      this.featureWeights = state.featureWeights;
      this.variances = state.variances;
      this.totalPoints = state.totalPoints;
      this.outliersDetected = state.outliers || [];

      console.log(`[WHACOEngine] Loaded state from ${filepath}`);
    } catch (error) {
      console.log('[WHACOEngine] No saved state found, using defaults');
    }
  }

  /**
   * Reset engine to initial state
   */
  reset(): void {
    this.centroids = Array.from({ length: this.nClusters }, () =>
      Array.from({ length: this.featureDim }, () => Math.random())
    );
    this.featureWeights = Array(this.featureDim).fill(1 / this.featureDim);
    this.variances = Array.from({ length: this.nClusters }, () =>
      Array(this.featureDim).fill(0.1)
    );
    this.dataWindow = [];
    this.totalPoints = 0;
    this.outliersDetected = [];
  }
}

// Export singleton instance
export const whacoEngine = new WHACOEngine();
