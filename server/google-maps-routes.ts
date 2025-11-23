/**
 * Google Maps API Routes
 *
 * Provides server-side proxy for Google Maps API calls to protect API key.
 */

import { Router } from 'express';
import { GoogleMapsService, type Address } from '../src/services/google-maps.service';

const router = Router();
const googleMapsService = new GoogleMapsService();

/**
 * GET /api/google-maps/autocomplete
 * Address autocomplete suggestions
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input parameter required' });
    }

    if (!googleMapsService.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API not configured' });
    }

    const suggestions = await googleMapsService.autocompleteAddress(input, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });

    return res.json({ suggestions });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Google Maps] Autocomplete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
  }
});

/**
 * GET /api/google-maps/place-details
 * Get full address details from Place ID
 */
router.get('/place-details', async (req, res) => {
  try {
    const { placeId } = req.query;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'Place ID required' });
    }

    if (!googleMapsService.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API not configured' });
    }

    const validated = await googleMapsService.getPlaceDetails(placeId);

    return res.json(validated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Google Maps] Place details error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get place details' });
  }
});

/**
 * POST /api/google-maps/validate-address
 * Validate an address
 */
router.post('/validate-address', async (req, res) => {
  try {
    const address: Address = req.body;

    if (!address.street || !address.zipCode) {
      return res.status(400).json({ error: 'Street and ZIP code required' });
    }

    if (!googleMapsService.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API not configured' });
    }

    const validated = await googleMapsService.validateAddress(address);

    return res.json(validated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Google Maps] Validation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to validate address' });
  }
});

/**
 * POST /api/google-maps/geocode
 * Geocode an address to lat/lng
 */
router.post('/geocode', async (req, res) => {
  try {
    const address: Address = req.body;

    if (!address.street || !address.zipCode) {
      return res.status(400).json({ error: 'Street and ZIP code required' });
    }

    if (!googleMapsService.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API not configured' });
    }

    const coordinates = await googleMapsService.geocodeAddress(address);

    return res.json(coordinates);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Google Maps] Geocoding error:', error);
    return res.status(500).json({ error: error.message || 'Failed to geocode address' });
  }
});

export default router;
