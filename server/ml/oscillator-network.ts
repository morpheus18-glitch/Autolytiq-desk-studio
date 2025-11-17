/**
 * OSCILLATOR COORDINATION NETWORK
 *
 * Kuramoto-inspired team coordination system for optimal workload distribution.
 * Treats salespeople as coupled oscillators that naturally synchronize.
 *
 * Features:
 * - Optimal lead assignment (based on phase, workload, skill)
 * - Workload balancing across team
 * - Bottleneck detection (who's struggling)
 * - Mentoring recommendations (based on phase relationships)
 * - Team coherence monitoring
 *
 * Based on: Kuramoto model of coupled oscillators
 * When oscillators couple, they naturally synchronize - creating emergent coordination
 */

import fs from 'fs/promises';

// ============================================================================
// TYPES
// ============================================================================

export interface SalespersonOscillator {
  id: string;
  name: string;
  phase: number; // Current position in sales cycle (0 to 2π)
  naturalFrequency: number; // Natural deal velocity
  activeDeals: number;
  skillLevel: number; // 0-1 scale
  dealsClosedToday: number;
  avgDealTimeMinutes: number;
}

export interface Bottleneck {
  salespersonId: string;
  name: string;
  phaseDifference: number;
  activeDeals: number;
  issue: string;
}

export interface MentoringRecommendation {
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  skillGap: number;
  phaseLead: number;
  recommendation: string;
}

export interface TeamStatus {
  coherence: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  totalSalespeople: number;
  bottlenecks: Bottleneck[];
  mentoringOpportunities: MentoringRecommendation[];
  teamMembers: Array<{
    id: string;
    name: string;
    phase: number;
    activeDeals: number;
    dealsToday: number;
    skillLevel: number;
    status: 'overloaded' | 'idle' | 'crushing_it' | 'normal';
  }>;
}

interface OscillatorState {
  oscillators: Record<string, SalespersonOscillator>;
  time: number;
  coherenceHistory: number[];
}

interface HistoryEntry {
  time: number;
  coherence: number;
  phases: Record<string, number>;
}

// ============================================================================
// OSCILLATOR NETWORK CLASS
// ============================================================================

export class OscillatorNetwork {
  private oscillators: Map<string, SalespersonOscillator>;
  private couplingStrength: number;
  private time: number;
  private history: HistoryEntry[];

  constructor(couplingStrength: number = 0.3) {
    this.oscillators = new Map();
    this.couplingStrength = couplingStrength;
    this.time = 0;
    this.history = [];
  }

  /**
   * Add a salesperson to the network
   */
  addSalesperson(
    id: string,
    name: string,
    skillLevel: number = 0.7,
    naturalFrequency: number = 1.0
  ): void {
    this.oscillators.set(id, {
      id,
      name,
      skillLevel,
      naturalFrequency,
      phase: Math.random() * 2 * Math.PI, // Random initial phase
      activeDeals: 0,
      dealsClosedToday: 0,
      avgDealTimeMinutes: 120.0,
    });
  }

  /**
   * Remove a salesperson from the network
   */
  removeSalesperson(id: string): void {
    this.oscillators.delete(id);
  }

  /**
   * Update network state (call this periodically)
   *
   * Kuramoto equation:
   * dθ_i/dt = ω_i + (K/N) * Σ_j sin(θ_j - θ_i)
   *
   * Each salesperson influences others through phase coupling.
   */
  update(dt: number = 0.1): void {
    const n = this.oscillators.size;
    if (n === 0) return;

    // Store old phases
    const oldPhases = new Map<string, number>();
    for (const [id, osc] of this.oscillators) {
      oldPhases.set(id, osc.phase);
    }

    // Update each oscillator
    for (const [id, osc] of this.oscillators) {
      // Natural evolution
      let phaseDelta = osc.naturalFrequency * dt;

      // Coupling term (synchronization pressure)
      let couplingSum = 0;
      for (const [otherId, otherOsc] of this.oscillators) {
        if (otherId === id) continue;

        // Weight coupling by skill similarity
        const skillSimilarity = 1.0 - Math.abs(osc.skillLevel - otherOsc.skillLevel);
        const weight = skillSimilarity;

        const phaseDiff = oldPhases.get(otherId)! - oldPhases.get(id)!;
        couplingSum += weight * Math.sin(phaseDiff);
      }

      const couplingTerm = (this.couplingStrength / n) * couplingSum;

      // Workload adjustment (slow down if overloaded)
      const workloadFactor = 1.0 / (1.0 + 0.1 * osc.activeDeals);

      // Update phase
      osc.phase += (phaseDelta + couplingTerm) * workloadFactor * dt;
      osc.phase = osc.phase % (2 * Math.PI); // Keep in [0, 2π]
    }

    this.time += dt;

    // Record state
    const phases: Record<string, number> = {};
    for (const [id, osc] of this.oscillators) {
      phases[id] = osc.phase;
    }

    this.history.push({
      time: this.time,
      coherence: this.computeCoherence(),
      phases,
    });

    // Keep last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  /**
   * Assign new lead to optimal salesperson
   *
   * Considers:
   * - Current phase (prefer those ready for new customer)
   * - Workload (active deals)
   * - Skill level (match to lead priority)
   *
   * Returns: salesperson ID or null
   */
  assignNewLead(leadPriority: number = 0.5): string | null {
    if (this.oscillators.size === 0) return null;

    const scores = new Map<string, number>();

    for (const [id, osc] of this.oscillators) {
      // Phase score (prefer phase near 0, ready for new deal)
      const phaseScore = Math.cos(osc.phase); // High when phase ≈ 0

      // Workload score (prefer less loaded)
      const workloadScore = 1.0 / (1.0 + osc.activeDeals);

      // Skill match score
      const skillMatch = 1.0 - Math.abs(osc.skillLevel - leadPriority);

      // Combined score
      const totalScore = 0.4 * phaseScore + 0.4 * workloadScore + 0.2 * skillMatch;

      scores.set(id, totalScore);
    }

    // Return salesperson with highest score
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const [id, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestId;
  }

  /**
   * Update salesperson's active deal count
   */
  updateWorkload(salespersonId: string, activeDeals: number): void {
    const osc = this.oscillators.get(salespersonId);
    if (osc) {
      osc.activeDeals = activeDeals;
    }
  }

  /**
   * Record that salesperson closed a deal
   */
  recordDealClosed(salespersonId: string): void {
    const osc = this.oscillators.get(salespersonId);
    if (osc) {
      osc.dealsClosedToday += 1;
      osc.activeDeals = Math.max(0, osc.activeDeals - 1);

      // Advance phase (completed cycle)
      osc.phase = (osc.phase + Math.PI / 2) % (2 * Math.PI);
    }
  }

  /**
   * Measure team synchronization (0 to 1)
   *
   * High coherence = team is well-coordinated
   * Low coherence = team is disorganized
   */
  computeCoherence(): number {
    if (this.oscillators.size === 0) return 0;

    const phases = Array.from(this.oscillators.values()).map((osc) => osc.phase);

    // Order parameter (complex mean of phase vectors)
    let realSum = 0;
    let imagSum = 0;

    for (const phase of phases) {
      realSum += Math.cos(phase);
      imagSum += Math.sin(phase);
    }

    realSum /= phases.length;
    imagSum /= phases.length;

    // Magnitude of complex mean
    const coherence = Math.sqrt(realSum * realSum + imagSum * imagSum);

    return coherence;
  }

  /**
   * Identify salespeople who are struggling (out of sync)
   */
  detectBottlenecks(): Bottleneck[] {
    if (this.oscillators.size === 0) return [];

    // Compute mean phase
    const phases = Array.from(this.oscillators.values()).map((osc) => osc.phase);

    let realSum = 0;
    let imagSum = 0;
    for (const phase of phases) {
      realSum += Math.cos(phase);
      imagSum += Math.sin(phase);
    }
    const meanPhase = Math.atan2(imagSum, realSum);

    const bottlenecks: Bottleneck[] = [];

    for (const [id, osc] of this.oscillators) {
      // Phase difference from mean
      let phaseDiff = Math.abs(osc.phase - meanPhase);
      if (phaseDiff > Math.PI) {
        phaseDiff = 2 * Math.PI - phaseDiff; // Wrap around
      }

      // Check if significantly out of sync
      if (phaseDiff > Math.PI / 3) {
        // More than 60 degrees off
        bottlenecks.push({
          salespersonId: id,
          name: osc.name,
          phaseDifference: phaseDiff,
          activeDeals: osc.activeDeals,
          issue: this.diagnoseIssue(osc, phaseDiff),
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Diagnose why salesperson is out of sync
   */
  private diagnoseIssue(osc: SalespersonOscillator, phaseDiff: number): string {
    if (osc.activeDeals > 5) {
      return 'Overloaded - too many active deals';
    } else if (osc.dealsClosedToday === 0 && this.time > 4) {
      return 'Slow day - no deals closed yet';
    } else if (phaseDiff > Math.PI / 2) {
      return 'Significantly behind team rhythm';
    } else {
      return 'Slightly out of sync with team';
    }
  }

  /**
   * Suggest mentor/mentee pairs based on phase relationships
   *
   * Salespeople ahead in phase can mentor those behind.
   */
  recommendMentoring(): MentoringRecommendation[] {
    if (this.oscillators.size < 2) return [];

    const recommendations: MentoringRecommendation[] = [];

    for (const [idI, oscI] of this.oscillators) {
      for (const [idJ, oscJ] of this.oscillators) {
        if (idI === idJ) continue;

        // Check if i is ahead of j
        let phaseDiff = (oscI.phase - oscJ.phase) % (2 * Math.PI);
        if (phaseDiff < 0) phaseDiff += 2 * Math.PI;

        // Check if skill difference suggests mentoring
        const skillDiff = oscI.skillLevel - oscJ.skillLevel;

        // Good mentoring opportunity:
        // - i is ahead in cycle (0.5 < phaseDiff < 1.5)
        // - i has higher skill (skillDiff > 0.15)
        if (phaseDiff > 0.5 && phaseDiff < 1.5 && skillDiff > 0.15) {
          recommendations.push({
            mentorId: idI,
            mentorName: oscI.name,
            menteeId: idJ,
            menteeName: oscJ.name,
            skillGap: skillDiff,
            phaseLead: phaseDiff,
            recommendation: `${oscI.name} can help ${oscJ.name} move deals faster`,
          });
        }
      }
    }

    // Sort by skill gap (biggest gaps first)
    recommendations.sort((a, b) => b.skillGap - a.skillGap);

    return recommendations.slice(0, 3); // Top 3
  }

  /**
   * Get comprehensive team status
   */
  getTeamStatus(): TeamStatus {
    const coherence = this.computeCoherence();
    const bottlenecks = this.detectBottlenecks();

    let status: TeamStatus['status'];
    if (coherence > 0.8) status = 'excellent';
    else if (coherence > 0.6) status = 'good';
    else if (coherence > 0.4) status = 'needs_attention';
    else status = 'critical';

    return {
      coherence,
      status,
      totalSalespeople: this.oscillators.size,
      bottlenecks,
      mentoringOpportunities: this.recommendMentoring(),
      teamMembers: Array.from(this.oscillators.values()).map((osc) => ({
        id: osc.id,
        name: osc.name,
        phase: osc.phase,
        activeDeals: osc.activeDeals,
        dealsToday: osc.dealsClosedToday,
        skillLevel: osc.skillLevel,
        status: this.getMemberStatus(osc),
      })),
    };
  }

  /**
   * Get status for individual team member
   */
  private getMemberStatus(
    osc: SalespersonOscillator
  ): 'overloaded' | 'idle' | 'crushing_it' | 'normal' {
    if (osc.activeDeals > 5) return 'overloaded';
    else if (osc.activeDeals === 0 && osc.dealsClosedToday === 0) return 'idle';
    else if (osc.dealsClosedToday >= 2) return 'crushing_it';
    else return 'normal';
  }

  /**
   * Reset daily stats (call at end of business day)
   */
  resetDailyStats(): void {
    for (const osc of this.oscillators.values()) {
      osc.dealsClosedToday = 0;
    }
  }

  /**
   * Get oscillator details
   */
  getOscillator(id: string): SalespersonOscillator | undefined {
    return this.oscillators.get(id);
  }

  /**
   * Get all oscillators
   */
  getAllOscillators(): SalespersonOscillator[] {
    return Array.from(this.oscillators.values());
  }

  /**
   * Save network state to disk
   */
  async saveState(filepath: string): Promise<void> {
    const oscillatorsObj: Record<string, SalespersonOscillator> = {};
    for (const [id, osc] of this.oscillators) {
      oscillatorsObj[id] = osc;
    }

    const state: OscillatorState = {
      oscillators: oscillatorsObj,
      time: this.time,
      coherenceHistory: this.history.slice(-100).map((h) => h.coherence),
    };

    await fs.writeFile(filepath, JSON.stringify(state, null, 2));
  }

  /**
   * Load network state from disk
   */
  async loadState(filepath: string): Promise<void> {
    try {
      const data = await fs.readFile(filepath, 'utf-8');
      const state: OscillatorState = JSON.parse(data);

      this.oscillators.clear();
      for (const [id, osc] of Object.entries(state.oscillators)) {
        this.oscillators.set(id, osc);
      }

      this.time = state.time;

      console.log(`[OscillatorNetwork] Loaded state from ${filepath}`);
    } catch (error) {
      console.log('[OscillatorNetwork] No saved state found, using defaults');
    }
  }

  /**
   * Reset network to initial state
   */
  reset(): void {
    for (const osc of this.oscillators.values()) {
      osc.phase = Math.random() * 2 * Math.PI;
      osc.activeDeals = 0;
      osc.dealsClosedToday = 0;
    }
    this.time = 0;
    this.history = [];
  }
}

// Export singleton instance
export const oscillatorNetwork = new OscillatorNetwork();
