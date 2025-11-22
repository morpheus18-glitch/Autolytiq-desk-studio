/**
 * GOOGLE MAPS API ROUTES
 *
 * Server-side proxy for Google Maps API calls to protect API key.
 * Provides address autocomplete, validation, and geocoding endpoints.
 *
 * @module CoreAPI
 */

import { Router } from 'express';
import { GoogleMapsService, type Address } from '../services/google-maps.service';

/**
 * Create Google Maps router
 */
export function createGoogleMapsRouter(requireAuth?: any) {
  const router = Router();
  const googleMapsService = new GoogleMapsService();

  /**
   * GET /autocomplete
   * Address autocomplete suggestions
   *
   * Query params:
   * - input: string (required) - Search input
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
    } catch (error: any) {
      console.error('[Google Maps] Autocomplete error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
    }
  });

  /**
   * GET /place-details
   * Get full address details from Place ID
   *
   * Query params:
   * - placeId: string (required) - Google Place ID
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
    } catch (error: any) {
      console.error('[Google Maps] Place details error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get place details' });
    }
  });

  /**
   * POST /validate-address
   * Validate an address
   *
   * Body:
   * - street: string (required)
   * - city: string
   * - state: string
   * - zipCode: string (required)
   * - country?: string
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
    } catch (error: any) {
      console.error('[Google Maps] Validation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to validate address' });
    }
  });

  /**
   * POST /geocode
   * Geocode an address to lat/lng
   *
   * Body:
   * - street: string (required)
   * - city: string
   * - state: string
   * - zipCode: string (required)
   * - country?: string
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
    } catch (error: any) {
      console.error('[Google Maps] Geocoding error:', error);
      return res.status(500).json({ error: error.message || 'Failed to geocode address' });
    }
  });

  return router;
}

/**
 * Default export for backward compatibility
 */
export default createGoogleMapsRouter();
