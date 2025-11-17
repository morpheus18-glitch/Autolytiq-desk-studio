/**
 * INTELLIGENCE BACKGROUND TASKS
 *
 * Periodic tasks for intelligence system:
 * - Update oscillator network (every 5 minutes)
 * - Save engine states (every 10 minutes)
 * - Reset daily stats (at midnight)
 */

import { intelligenceService } from './intelligence-service';

let updateInterval: NodeJS.Timeout | null = null;
let saveInterval: NodeJS.Timeout | null = null;

/**
 * Start background tasks
 */
export function startIntelligenceBackgroundTasks(): void {
  console.log('[Intelligence] Starting background tasks');

  // Update oscillator network every 5 minutes
  updateInterval = setInterval(() => {
    try {
      intelligenceService.updateTeamState();
      console.log('[Intelligence] Oscillator network updated');
    } catch (error) {
      console.error('[Intelligence] Error updating oscillator network:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Save states every 10 minutes
  saveInterval = setInterval(async () => {
    try {
      await intelligenceService.saveStates();
      console.log('[Intelligence] States saved successfully');
    } catch (error) {
      console.error('[Intelligence] Error saving states:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Schedule daily stats reset at midnight
  scheduleDailyReset();

  console.log('[Intelligence] Background tasks started successfully');
}

/**
 * Stop background tasks
 */
export function stopIntelligenceBackgroundTasks(): void {
  console.log('[Intelligence] Stopping background tasks');

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }

  console.log('[Intelligence] Background tasks stopped');
}

/**
 * Schedule daily stats reset at midnight
 */
function scheduleDailyReset(): void {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    // Reset daily stats
    try {
      intelligenceService.resetDailyStats();
      console.log('[Intelligence] Daily stats reset at midnight');
    } catch (error) {
      console.error('[Intelligence] Error resetting daily stats:', error);
    }

    // Schedule next reset (24 hours from now)
    scheduleDailyReset();
  }, msUntilMidnight);

  console.log(`[Intelligence] Daily reset scheduled for ${tomorrow.toISOString()}`);
}

/**
 * Manual trigger to save states immediately
 */
export async function saveIntelligenceStates(): Promise<void> {
  await intelligenceService.saveStates();
}

/**
 * Manual trigger to update oscillator network immediately
 */
export function updateOscillatorNetwork(): void {
  intelligenceService.updateTeamState();
}
