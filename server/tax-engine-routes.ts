/**
 * Tax Engine API Routes
 *
 * Endpoints for centralized tax calculation based on customer address.
 */

import { Router } from 'express';
import { calculateTaxProfile, recalculateDealTaxes } from './services/tax-engine-service';
import { db } from './db';
import { customers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { TaxQuoteInput } from '@shared/types/tax-engine';

const router = Router();

/**
 * POST /api/tax/quote
 * Calculate tax profile for a customer + deal draft
 */
router.post('/quote', async (req, res) => {
  try {
    const input = req.body as TaxQuoteInput;

    if (!input.customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    if (!input.dealType) {
      return res.status(400).json({ error: 'dealType is required (RETAIL or LEASE)' });
    }

    if (input.vehiclePrice === undefined || input.vehiclePrice === null) {
      return res.status(400).json({ error: 'vehiclePrice is required' });
    }

    const taxProfile = await calculateTaxProfile(input);

    res.json({
      success: true,
      taxProfile,
    });
  } catch (error: any) {
    console.error('[Tax Quote] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate tax',
    });
  }
});

/**
 * POST /api/tax/deals/:dealId/recalculate
 * Recalculate and save taxes for an existing deal
 */
router.post('/deals/:dealId/recalculate', async (req, res) => {
  try {
    const { dealId } = req.params;

    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }

    const result = await recalculateDealTaxes(dealId);

    res.json({
      success: true,
      taxProfile: result.taxProfile,
      scenarioId: result.scenarioId,
      message: 'Taxes recalculated successfully',
    });
  } catch (error: any) {
    console.error('[Recalculate Taxes] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recalculate taxes',
    });
  }
});

/**
 * GET /api/tax/customers/:customerId/preview
 * Quick preview of tax rates for a customer (before deal exists)
 */
router.get('/customers/:customerId/preview', async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    // Get basic preview with default values
    const taxProfile = await calculateTaxProfile({
      customerId,
      dealType: 'RETAIL',
      vehiclePrice: 30000, // Default preview price
    });

    res.json({
      success: true,
      jurisdiction: taxProfile.jurisdiction,
      rates: taxProfile.rates,
      method: taxProfile.method,
      rules: taxProfile.rules,
    });
  } catch (error: any) {
    console.error('[Tax Preview] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tax preview',
    });
  }
});

/**
 * GET /api/tax/customers/:customerId/validate-address
 * Check if customer has valid address for tax calculation
 */
router.get('/customers/:customerId/validate-address', async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return res.status(404).json({
        valid: false,
        error: 'Customer not found',
      });
    }

    const hasState = !!customer.state;
    const hasZip = !!customer.zipCode;
    const hasCity = !!customer.city;
    const hasCounty = !!customer.county;

    const valid = hasState && hasZip;
    const complete = valid && hasCity && hasCounty;

    res.json({
      valid,
      complete,
      missing: {
        state: !hasState,
        zipCode: !hasZip,
        city: !hasCity,
        county: !hasCounty,
      },
      address: valid ? {
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
        county: customer.county,
      } : null,
    });
  } catch (error: any) {
    console.error('[Validate Address] Error:', error);
    res.status(500).json({
      valid: false,
      error: error.message || 'Failed to validate address',
    });
  }
});

export default router;
