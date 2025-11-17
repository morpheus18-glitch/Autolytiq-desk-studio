/**
 * HIERARCHICAL OSCILLATOR NETWORK
 *
 * Extends oscillator network with role hierarchy and performance optimization.
 * Tracks manager-subordinate relationships and team dynamics.
 *
 * Features:
 * - Role-based oscillator behavior
 * - Manager-subordinate coupling
 * - Team performance aggregation
 * - Performance optimization recommendations
 * - Role-specific metrics tracking
 */

import { OscillatorNetwork, type SalespersonOscillator, type TeamStatus } from './oscillator-network';
import { UserRole, RoleLevel, ROLE_METADATA, type RoleSettings } from './role-hierarchy';
import fs from 'fs/promises';

// ============================================================================
// TYPES
// ============================================================================

export interface HierarchicalOscillator extends SalespersonOscillator {
  role: UserRole;
  roleLevel: RoleLevel;
  managerId?: string;
  subordinateIds: string[];
  settings: RoleSettings;

  // Performance Metrics
  metrics: PerformanceMetrics;

  // Role-specific state
  roleState: RoleSpecificState;
}

export interface PerformanceMetrics {
  // Sales Metrics (all roles)
  dealsThisMonth: number;
  dealsThisQuarter: number;
  revenueThisMonth: number;
  grossProfitThisMonth: number;

  // Conversion Metrics
  leadsReceived: number;
  appointmentsSet: number;
  appointmentsShown: number;
  dealsClosed: number;

  // Quality Metrics
  avgCustomerSatisfaction: number;
  surveyResponseRate: number;
  repeatCustomerRate: number;

  // Activity Metrics
  callsMade: number;
  emailsSent: number;
  testDrivesGiven: number;

  // Time Metrics
  avgDealTime: number; // minutes
  avgResponseTime: number; // minutes

  // Team Metrics (managers only)
  teamDeals?: number;
  teamRevenue?: number;
  teamAvgSatisfaction?: number;
}

export interface RoleSpecificState {
  // BDC specific
  activeLeads?: number;
  appointmentsToday?: number;

  // Sales specific
  testDrivesToday?: number;
  presentationsToday?: number;

  // Manager specific
  approvalsToday?: number;
  coachingSessions?: number;
  teamMeetings?: number;
}

export interface TeamPerformance {
  teamId: string;
  managerId: string;
  managerName: string;
  role: UserRole;

  // Team Metrics
  teamSize: number;
  activeMembers: number;
  teamCoherence: number;

  // Aggregate Performance
  totalDeals: number;
  totalRevenue: number;
  avgPerformanceScore: number;

  // Team Health
  bottlenecks: number;
  topPerformers: Array<{
    id: string;
    name: string;
    score: number;
  }>;
  underperformers: Array<{
    id: string;
    name: string;
    score: number;
    issues: string[];
  }>;

  // Recommendations
  recommendations: string[];
}

export interface PerformanceOptimization {
  oscillatorId: string;
  name: string;
  role: UserRole;
  currentScore: number;
  targetScore: number;
  gap: number;

  // Specific Optimizations
  optimizations: Array<{
    category: string;
    current: number;
    target: number;
    improvement: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: number; // % improvement
  }>;

  // Action Items
  actionItems: Array<{
    action: string;
    deadline: string;
    owner: string;
  }>;
}

// ============================================================================
// HIERARCHICAL OSCILLATOR NETWORK
// ============================================================================

export class HierarchicalOscillatorNetwork extends OscillatorNetwork {
  private hierarchicalOscillators: Map<string, HierarchicalOscillator>;
  private managerSubordinateMap: Map<string, Set<string>>;

  constructor(couplingStrength: number = 0.3) {
    super(couplingStrength);
    this.hierarchicalOscillators = new Map();
    this.managerSubordinateMap = new Map();
  }

  /**
   * Add user with role hierarchy
   */
  addUserToNetwork(
    id: string,
    name: string,
    role: UserRole,
    settings: RoleSettings,
    managerId?: string
  ): void {
    const metadata = ROLE_METADATA[role];

    // Add to base oscillator network
    super.addSalesperson(
      id,
      name,
      settings.intelligence.skillLevel,
      settings.intelligence.naturalFrequency
    );

    // Create hierarchical oscillator
    const hierarchicalOsc: HierarchicalOscillator = {
      ...(super.getOscillator(id)!),
      role,
      roleLevel: metadata.level,
      managerId,
      subordinateIds: [],
      settings,
      metrics: this.initializeMetrics(),
      roleState: this.initializeRoleState(role),
    };

    this.hierarchicalOscillators.set(id, hierarchicalOsc);

    // Setup manager-subordinate relationship
    if (managerId) {
      this.addSubordinate(managerId, id);
    }
  }

  /**
   * Add subordinate to manager
   */
  private addSubordinate(managerId: string, subordinateId: string): void {
    if (!this.managerSubordinateMap.has(managerId)) {
      this.managerSubordinateMap.set(managerId, new Set());
    }
    this.managerSubordinateMap.get(managerId)!.add(subordinateId);

    const managerOsc = this.hierarchicalOscillators.get(managerId);
    if (managerOsc) {
      managerOsc.subordinateIds.push(subordinateId);
    }
  }

  /**
   * Remove user from network
   */
  removeUserFromNetwork(id: string): void {
    const osc = this.hierarchicalOscillators.get(id);
    if (!osc) return;

    // Remove from manager's subordinates
    if (osc.managerId) {
      const managerSubs = this.managerSubordinateMap.get(osc.managerId);
      if (managerSubs) {
        managerSubs.delete(id);
      }

      const managerOsc = this.hierarchicalOscillators.get(osc.managerId);
      if (managerOsc) {
        managerOsc.subordinateIds = managerOsc.subordinateIds.filter(sid => sid !== id);
      }
    }

    // Reassign subordinates if this was a manager
    if (osc.subordinateIds.length > 0) {
      osc.subordinateIds.forEach(subId => {
        const subordinate = this.hierarchicalOscillators.get(subId);
        if (subordinate && osc.managerId) {
          subordinate.managerId = osc.managerId;
          this.addSubordinate(osc.managerId, subId);
        }
      });
    }

    this.hierarchicalOscillators.delete(id);
    super.removeSalesperson(id);
  }

  /**
   * Update performance metrics for user
   */
  updatePerformanceMetrics(id: string, metrics: Partial<PerformanceMetrics>): void {
    const osc = this.hierarchicalOscillators.get(id);
    if (osc) {
      osc.metrics = { ...osc.metrics, ...metrics };

      // Update team metrics if this is a manager
      if (ROLE_METADATA[osc.role].isManagement) {
        this.updateTeamMetrics(id);
      }
    }
  }

  /**
   * Update team metrics for a manager
   */
  private updateTeamMetrics(managerId: string): void {
    const manager = this.hierarchicalOscillators.get(managerId);
    if (!manager) return;

    const subordinates = manager.subordinateIds
      .map(id => this.hierarchicalOscillators.get(id))
      .filter((osc): osc is HierarchicalOscillator => osc !== undefined);

    if (subordinates.length === 0) return;

    const teamDeals = subordinates.reduce((sum, osc) => sum + osc.metrics.dealsThisMonth, 0);
    const teamRevenue = subordinates.reduce((sum, osc) => sum + osc.metrics.revenueThisMonth, 0);
    const teamAvgSatisfaction = subordinates.reduce((sum, osc) => sum + osc.metrics.avgCustomerSatisfaction, 0) / subordinates.length;

    manager.metrics.teamDeals = teamDeals;
    manager.metrics.teamRevenue = teamRevenue;
    manager.metrics.teamAvgSatisfaction = teamAvgSatisfaction;
  }

  /**
   * Get team performance for a manager
   */
  getTeamPerformance(managerId: string): TeamPerformance | null {
    const manager = this.hierarchicalOscillators.get(managerId);
    if (!manager || !ROLE_METADATA[manager.role].isManagement) {
      return null;
    }

    const subordinates = manager.subordinateIds
      .map(id => this.hierarchicalOscillators.get(id))
      .filter((osc): osc is HierarchicalOscillator => osc !== undefined);

    const activeMembers = subordinates.filter(osc => osc.activeDeals > 0).length;

    // Calculate team coherence (for subordinates only)
    const teamPhases = subordinates.map(osc => osc.phase);
    const teamCoherence = this.calculateCoherenceForPhases(teamPhases);

    // Calculate performance scores
    const performanceScores = subordinates.map(osc => this.calculatePerformanceScore(osc));
    const avgPerformanceScore = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length || 0;

    // Identify top performers (top 20%)
    const threshold = performanceScores.length > 0
      ? Math.max(...performanceScores) * 0.8
      : 0;

    const topPerformers = subordinates
      .map((osc, idx) => ({
        id: osc.id,
        name: osc.name,
        score: performanceScores[idx],
      }))
      .filter(p => p.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Identify underperformers (bottom 20%)
    const underperformThreshold = performanceScores.length > 0
      ? Math.max(...performanceScores) * 0.5
      : 0;

    const underperformers = subordinates
      .map((osc, idx) => ({
        id: osc.id,
        name: osc.name,
        score: performanceScores[idx],
        issues: this.identifyPerformanceIssues(osc),
      }))
      .filter(p => p.score < underperformThreshold)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    // Generate recommendations
    const recommendations = this.generateTeamRecommendations(manager, subordinates);

    return {
      teamId: managerId,
      managerId,
      managerName: manager.name,
      role: manager.role,
      teamSize: subordinates.length,
      activeMembers,
      teamCoherence,
      totalDeals: manager.metrics.teamDeals || 0,
      totalRevenue: manager.metrics.teamRevenue || 0,
      avgPerformanceScore,
      bottlenecks: underperformers.length,
      topPerformers,
      underperformers,
      recommendations,
    };
  }

  /**
   * Calculate coherence for specific phase array
   */
  private calculateCoherenceForPhases(phases: number[]): number {
    if (phases.length === 0) return 0;

    let realSum = 0;
    let imagSum = 0;

    for (const phase of phases) {
      realSum += Math.cos(phase);
      imagSum += Math.sin(phase);
    }

    realSum /= phases.length;
    imagSum /= phases.length;

    return Math.sqrt(realSum * realSum + imagSum * imagSum);
  }

  /**
   * Calculate performance score for an oscillator
   */
  private calculatePerformanceScore(osc: HierarchicalOscillator): number {
    const targets = osc.settings.performanceTargets;
    const metrics = osc.metrics;

    let score = 0;
    let weight = 0;

    // Deals performance
    if (targets.monthlyDealsTarget) {
      score += (metrics.dealsThisMonth / targets.monthlyDealsTarget) * 30;
      weight += 30;
    }

    // Revenue performance
    if (targets.monthlyRevenueTarget) {
      score += (metrics.revenueThisMonth / targets.monthlyRevenueTarget) * 25;
      weight += 25;
    }

    // Customer satisfaction
    if (targets.customerSatisfactionTarget) {
      score += (metrics.avgCustomerSatisfaction / targets.customerSatisfactionTarget) * 20;
      weight += 20;
    }

    // Conversion rate
    if (metrics.appointmentsShown > 0) {
      const conversionRate = metrics.dealsClosed / metrics.appointmentsShown;
      const targetRate = (targets.showToSoldRate || 20) / 100;
      score += (conversionRate / targetRate) * 15;
      weight += 15;
    }

    // Activity
    if (targets.dailyCallsTarget) {
      const callsPerDay = metrics.callsMade / 20; // Assume 20 working days
      score += (callsPerDay / targets.dailyCallsTarget) * 10;
      weight += 10;
    }

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Identify performance issues
   */
  private identifyPerformanceIssues(osc: HierarchicalOscillator): string[] {
    const issues: string[] = [];
    const targets = osc.settings.performanceTargets;
    const metrics = osc.metrics;

    if (targets.monthlyDealsTarget && metrics.dealsThisMonth < targets.monthlyDealsTarget * 0.5) {
      issues.push('Low deal volume - 50% below target');
    }

    if (targets.customerSatisfactionTarget && metrics.avgCustomerSatisfaction < targets.customerSatisfactionTarget * 0.8) {
      issues.push('Low customer satisfaction');
    }

    if (metrics.appointmentsShown > 5) {
      const conversionRate = metrics.dealsClosed / metrics.appointmentsShown;
      if (conversionRate < 0.1) {
        issues.push('Poor conversion rate (<10%)');
      }
    }

    if (osc.activeDeals > 10) {
      issues.push('Overloaded - too many active deals');
    }

    if (osc.dealsClosedToday === 0 && osc.activeDeals === 0) {
      issues.push('Idle - no activity today');
    }

    return issues;
  }

  /**
   * Generate team recommendations
   */
  private generateTeamRecommendations(
    manager: HierarchicalOscillator,
    subordinates: HierarchicalOscillator[]
  ): string[] {
    const recommendations: string[] = [];

    // Check workload distribution
    const workloads = subordinates.map(osc => osc.activeDeals);
    const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);

    if (maxWorkload > avgWorkload * 1.5) {
      recommendations.push('⚠️ Workload imbalance - redistribute leads to balance team');
    }

    // Check team coherence
    const teamPhases = subordinates.map(osc => osc.phase);
    const coherence = this.calculateCoherenceForPhases(teamPhases);

    if (coherence < 0.5) {
      recommendations.push('🔄 Low team synchronization - schedule team meeting');
    }

    // Check for skill gaps
    const skillLevels = subordinates.map(osc => osc.skillLevel);
    const skillGap = Math.max(...skillLevels) - Math.min(...skillLevels);

    if (skillGap > 0.3) {
      recommendations.push('📚 Large skill gap - implement mentoring program');
    }

    // Check team performance vs targets
    const teamTarget = manager.settings.performanceTargets.monthlyDealsTarget || 0;
    const teamActual = manager.metrics.teamDeals || 0;

    if (teamActual < teamTarget * 0.8) {
      recommendations.push('📈 Team 20% below target - review processes and motivation');
    }

    return recommendations;
  }

  /**
   * Get performance optimization for a user
   */
  getPerformanceOptimization(id: string): PerformanceOptimization | null {
    const osc = this.hierarchicalOscillators.get(id);
    if (!osc) return null;

    const currentScore = this.calculatePerformanceScore(osc);
    const targetScore = 85; // Target 85% performance
    const gap = targetScore - currentScore;

    const optimizations: PerformanceOptimization['optimizations'] = [];
    const targets = osc.settings.performanceTargets;
    const metrics = osc.metrics;

    // Deals optimization
    if (targets.monthlyDealsTarget) {
      const dealPerf = (metrics.dealsThisMonth / targets.monthlyDealsTarget) * 100;
      if (dealPerf < 80) {
        optimizations.push({
          category: 'Deal Volume',
          current: metrics.dealsThisMonth,
          target: targets.monthlyDealsTarget,
          improvement: `Increase by ${targets.monthlyDealsTarget - metrics.dealsThisMonth} deals`,
          priority: 'high',
          estimatedImpact: 30,
        });
      }
    }

    // Conversion optimization
    if (metrics.appointmentsShown > 0) {
      const conversionRate = (metrics.dealsClosed / metrics.appointmentsShown) * 100;
      const targetRate = targets.showToSoldRate || 20;

      if (conversionRate < targetRate * 0.8) {
        optimizations.push({
          category: 'Conversion Rate',
          current: conversionRate,
          target: targetRate,
          improvement: 'Improve closing techniques and follow-up',
          priority: 'high',
          estimatedImpact: 25,
        });
      }
    }

    // Customer satisfaction optimization
    if (targets.customerSatisfactionTarget && metrics.avgCustomerSatisfaction < targets.customerSatisfactionTarget) {
      optimizations.push({
        category: 'Customer Satisfaction',
        current: metrics.avgCustomerSatisfaction,
        target: targets.customerSatisfactionTarget,
        improvement: 'Focus on customer experience and follow-up',
        priority: 'medium',
        estimatedImpact: 20,
      });
    }

    // Activity optimization
    if (targets.dailyCallsTarget) {
      const callsPerDay = metrics.callsMade / 20;
      if (callsPerDay < targets.dailyCallsTarget * 0.8) {
        optimizations.push({
          category: 'Activity Level',
          current: callsPerDay,
          target: targets.dailyCallsTarget,
          improvement: 'Increase daily call activity',
          priority: 'medium',
          estimatedImpact: 15,
        });
      }
    }

    // Sort by priority and impact
    optimizations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : b.estimatedImpact - a.estimatedImpact;
    });

    // Generate action items
    const actionItems = optimizations.slice(0, 3).map((opt, idx) => ({
      action: opt.improvement,
      deadline: new Date(Date.now() + (7 + idx * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: osc.name,
    }));

    return {
      oscillatorId: id,
      name: osc.name,
      role: osc.role,
      currentScore,
      targetScore,
      gap,
      optimizations,
      actionItems,
    };
  }

  /**
   * Get all hierarchical oscillators
   */
  getAllHierarchicalOscillators(): HierarchicalOscillator[] {
    return Array.from(this.hierarchicalOscillators.values());
  }

  /**
   * Get oscillator by ID
   */
  getHierarchicalOscillator(id: string): HierarchicalOscillator | undefined {
    return this.hierarchicalOscillators.get(id);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      dealsThisMonth: 0,
      dealsThisQuarter: 0,
      revenueThisMonth: 0,
      grossProfitThisMonth: 0,
      leadsReceived: 0,
      appointmentsSet: 0,
      appointmentsShown: 0,
      dealsClosed: 0,
      avgCustomerSatisfaction: 0,
      surveyResponseRate: 0,
      repeatCustomerRate: 0,
      callsMade: 0,
      emailsSent: 0,
      testDrivesGiven: 0,
      avgDealTime: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Initialize role-specific state
   */
  private initializeRoleState(role: UserRole): RoleSpecificState {
    switch (role) {
      case UserRole.BDC:
        return {
          activeLeads: 0,
          appointmentsToday: 0,
        };

      case UserRole.SALES:
      case UserRole.SENIOR_SALES:
        return {
          testDrivesToday: 0,
          presentationsToday: 0,
        };

      case UserRole.SALES_MANAGER:
      case UserRole.BDC_MANAGER:
        return {
          approvalsToday: 0,
          coachingSessions: 0,
          teamMeetings: 0,
        };

      default:
        return {};
    }
  }
}

// Export singleton instance
export const hierarchicalOscillatorNetwork = new HierarchicalOscillatorNetwork();
