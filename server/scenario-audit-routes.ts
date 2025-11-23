/**
 * Scenario Audit Trail Routes
 *
 * API endpoints for retrieving scenario change history and audit logs.
 */

import { Router } from 'express';
import { db } from './db';
import { scenarioChangeLog, dealScenarios, deals, users } from '@shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/audit/scenarios/:scenarioId/history
 * Get complete change history for a scenario
 */
router.get('/scenarios/:scenarioId/history', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    // Validate scenario exists and user has access
    const scenario = await db.query.dealScenarios.findFirst({
      where: eq(dealScenarios.id, scenarioId),
      with: {
        deal: true,
      },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // TODO: Check user has access to this dealership
    // if (scenario.deal.dealershipId !== req.user.dealershipId) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    // Get change history
    const changes = await db.query.scenarioChangeLog.findMany({
      where: eq(scenarioChangeLog.scenarioId, scenarioId),
      orderBy: [desc(scenarioChangeLog.timestamp)],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get total count
    const totalResult = await db
      .select({ count: scenarioChangeLog.id })
      .from(scenarioChangeLog)
      .where(eq(scenarioChangeLog.scenarioId, scenarioId));

    const total = totalResult.length;

    return res.json({
      changes,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + changes.length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scenario Audit] History error:', error);
    return res.status(500).json({ error: 'Failed to retrieve change history' });
  }
});

/**
 * GET /api/audit/scenarios/:scenarioId/playback
 * Get scenario state at a specific point in time
 */
router.get('/scenarios/:scenarioId/playback', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { timestamp } = req.query;

    if (!timestamp) {
      return res.status(400).json({ error: 'Timestamp required' });
    }

    // Validate scenario exists
    const scenario = await db.query.dealScenarios.findFirst({
      where: eq(dealScenarios.id, scenarioId),
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Get all changes up to the specified timestamp
    const changes = await db.query.scenarioChangeLog.findMany({
      where: and(
        eq(scenarioChangeLog.scenarioId, scenarioId),
        lte(scenarioChangeLog.timestamp, new Date(timestamp as string))
      ),
      orderBy: [desc(scenarioChangeLog.timestamp)],
    });

    // Reconstruct scenario state at that point in time
    const reconstructed: Record<string, any> = {};

    // Process changes in reverse chronological order
    // The most recent change for each field is the value at that timestamp
    const fieldValues = new Map<string, any>();

    for (const change of changes) {
      if (!fieldValues.has(change.fieldName)) {
        fieldValues.set(change.fieldName, change.newValue);
      }
    }

    // Convert to object
    fieldValues.forEach((value, field) => {
      reconstructed[field] = value;
    });

    return res.json({
      scenarioId,
      timestamp: new Date(timestamp as string),
      state: reconstructed,
      changesApplied: changes.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scenario Audit] Playback error:', error);
    return res.status(500).json({ error: 'Failed to reconstruct scenario state' });
  }
});

/**
 * GET /api/audit/scenarios/:scenarioId/field/:fieldName
 * Get change history for a specific field
 */
router.get('/scenarios/:scenarioId/field/:fieldName', async (req, res) => {
  try {
    const { scenarioId, fieldName } = req.params;

    // Validate scenario exists
    const scenario = await db.query.dealScenarios.findFirst({
      where: eq(dealScenarios.id, scenarioId),
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Get field change history
    const changes = await db.query.scenarioChangeLog.findMany({
      where: and(
        eq(scenarioChangeLog.scenarioId, scenarioId),
        eq(scenarioChangeLog.fieldName, fieldName)
      ),
      orderBy: [desc(scenarioChangeLog.timestamp)],
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.json({
      scenarioId,
      fieldName,
      changes,
      totalChanges: changes.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scenario Audit] Field history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve field history' });
  }
});

/**
 * GET /api/audit/deals/:dealId/scenarios
 * Get audit trail for all scenarios in a deal
 */
router.get('/deals/:dealId/scenarios', async (req, res) => {
  try {
    const { dealId } = req.params;
    const { since } = req.query;

    // Validate deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Build query conditions
    const conditions = [eq(scenarioChangeLog.dealId, dealId)];

    if (since) {
      conditions.push(gte(scenarioChangeLog.timestamp, new Date(since as string)));
    }

    // Get changes for all scenarios in the deal
    const changes = await db.query.scenarioChangeLog.findMany({
      where: and(...conditions),
      orderBy: [desc(scenarioChangeLog.timestamp)],
      limit: 1000, // Reasonable limit
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        scenario: {
          columns: {
            id: true,
            name: true,
            scenarioType: true,
          },
        },
      },
    });

    return res.json({
      dealId,
      changes,
      totalChanges: changes.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scenario Audit] Deal audit error:', error);
    return res.status(500).json({ error: 'Failed to retrieve deal audit trail' });
  }
});

/**
 * GET /api/audit/scenarios/:scenarioId/calculation-snapshots
 * Get all calculation snapshots for a scenario
 */
router.get('/scenarios/:scenarioId/calculation-snapshots', async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Get changes with calculation snapshots
    const changes = await db.query.scenarioChangeLog.findMany({
      where: and(
        eq(scenarioChangeLog.scenarioId, scenarioId),
        eq(scenarioChangeLog.changeType, 'recalculation')
      ),
      orderBy: [desc(scenarioChangeLog.timestamp)],
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Extract calculation snapshots
    const snapshots = changes
      .filter(change => change.calculationSnapshot)
      .map(change => ({
        timestamp: change.timestamp,
        user: change.user,
        calculation: change.calculationSnapshot,
      }));

    return res.json({
      scenarioId,
      snapshots,
      totalSnapshots: snapshots.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scenario Audit] Calculation snapshots error:', error);
    return res.status(500).json({ error: 'Failed to retrieve calculation snapshots' });
  }
});

export default router;
