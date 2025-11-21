/**
 * Address Validation Service
 * 
 * Validates and normalizes addresses using external APIs.
 * Supports multiple providers: USPS, Google Places, Smarty
 * 
 * Priority: Use Google Places API for speed and accuracy in production
 * Fallback: USPS Web Tools (free but slower)
 */

import type { Request, Response } from 'express';

export interface AddressInput {
  street: string;
  city?: string;
  state?: string;
  zipCode: string;
}

export interface ValidatedAddress {
  validated: boolean;
  normalized: {
    street: string;
    city: string;
    state: string;
    stateCode: string; // 2-letter state code (e.g., "CA", "TX")
    zipCode: string;
    zip4?: string; // ZIP+4 extension
    county?: string;
    country: string;
  };
  metadata?: {
    deliveryPoint?: string; // DPV (Delivery Point Validation)
    carrierRoute?: string;
    congressionalDistrict?: string;
    fips?: string; // FIPS county code
    latitude?: number;
    longitude?: number;
  };
  provider: 'google' | 'usps' | 'smarty' | 'manual';
  confidence?: 'high' | 'medium' | 'low';
  warnings?: string[];
}

/**
 * Validate address using Google Places API (Geocoding + Place Details)
 * Requires GOOGLE_MAPS_API_KEY environment variable
 */
async function validateWithGoogle(address: AddressInput): Promise<ValidatedAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('[Address Validation] Google Maps API key not configured');
    return null;
  }

  try {
    // Format address for geocoding
    const addressString = `${address.street}, ${address.city || ''}, ${address.state || ''} ${address.zipCode}`.trim();
    
    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('[Address Validation] Google geocoding failed:', data.status);
      return null;
    }

    const result = data.results[0];
    const components = result.address_components;
    
    // Extract normalized components
    const getComponent = (type: string, useShort = false) => {
      const comp = components.find((c: Record<string, unknown>) => c.types.includes(type));
      return comp ? (useShort ? comp.short_name : comp.long_name) : '';
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const city = getComponent('locality') || getComponent('sublocality') || getComponent('administrative_area_level_3');
    const state = getComponent('administrative_area_level_1');
    const stateCode = getComponent('administrative_area_level_1', true);
    const zipCode = getComponent('postal_code');
    const county = getComponent('administrative_area_level_2');
    const country = getComponent('country', true);

    // Determine confidence based on location_type
    const locationType = result.geometry?.location_type;
    const confidence: 'high' | 'medium' | 'low' = 
      locationType === 'ROOFTOP' ? 'high' :
      locationType === 'RANGE_INTERPOLATED' ? 'medium' :
      'low';

    return {
      validated: true,
      normalized: {
        street: `${streetNumber} ${route}`.trim(),
        city,
        state,
        stateCode,
        zipCode,
        county: county.replace(' County', ''), // Remove "County" suffix
        country: country || 'US',
      },
      metadata: {
        latitude: result.geometry?.location?.lat,
        longitude: result.geometry?.location?.lng,
      },
      provider: 'google',
      confidence,
      warnings: confidence === 'low' ? ['Address validation confidence is low - verify manually'] : [],
    };
  } catch (error) {
    console.error('[Address Validation] Google API error:', error);
    return null;
  }
}

/**
 * Validate address using USPS Web Tools API
 * Requires USPS_USER_ID environment variable (free registration at usps.com)
 */
async function validateWithUSPS(address: AddressInput): Promise<ValidatedAddress | null> {
  const userId = process.env.USPS_USER_ID;
  
  if (!userId) {
    console.warn('[Address Validation] USPS User ID not configured');
    return null;
  }

  try {
    // Build USPS XML request
    const xml = `
      <AddressValidateRequest USERID="${userId}">
        <Address>
          <Address1></Address1>
          <Address2>${address.street}</Address2>
          <City>${address.city || ''}</City>
          <State>${address.state || ''}</State>
          <Zip5>${address.zipCode.slice(0, 5)}</Zip5>
          <Zip4></Zip4>
        </Address>
      </AddressValidateRequest>
    `.trim();

    const response = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xml)}`
    );
    
    const xmlText = await response.text();
    
    // Parse XML response (basic parsing - could use xml2js library for production)
    const addressMatch = xmlText.match(/<Address2>(.*?)<\/Address2>/);
    const cityMatch = xmlText.match(/<City>(.*?)<\/City>/);
    const stateMatch = xmlText.match(/<State>(.*?)<\/State>/);
    const zip5Match = xmlText.match(/<Zip5>(.*?)<\/Zip5>/);
    const zip4Match = xmlText.match(/<Zip4>(.*?)<\/Zip4>/);
    
    // Check for errors
    if (xmlText.includes('<Error>')) {
      console.warn('[Address Validation] USPS validation failed:', xmlText);
      return null;
    }

    if (!addressMatch || !cityMatch || !stateMatch || !zip5Match) {
      return null;
    }

    return {
      validated: true,
      normalized: {
        street: addressMatch[1],
        city: cityMatch[1],
        state: stateMatch[1],
        stateCode: stateMatch[1], // USPS returns 2-letter code
        zipCode: zip5Match[1],
        zip4: zip4Match?.[1],
        country: 'US',
      },
      provider: 'usps',
      confidence: 'high', // USPS validates to rooftop level
      warnings: [],
    };
  } catch (error) {
    console.error('[Address Validation] USPS API error:', error);
    return null;
  }
}

/**
 * Fallback: Basic validation using ZIP code lookup
 * Uses local ZIP code database to get city/state/county
 */
async function validateWithZipLookup(address: AddressInput): Promise<ValidatedAddress | null> {
  // This would query the zipCodeLookup table in the database
  // For now, return null to indicate no validation available
  return null;
}

/**
 * Main validation function - tries providers in order of preference
 */
export async function validateAddress(address: AddressInput): Promise<ValidatedAddress> {
  // Try Google first (fastest, most accurate)
  const googleResult = await validateWithGoogle(address);
  if (googleResult) {
    return googleResult;
  }

  // Fallback to USPS
  const uspsResult = await validateWithUSPS(address);
  if (uspsResult) {
    return uspsResult;
  }

  // Final fallback: Basic ZIP lookup
  const zipResult = await validateWithZipLookup(address);
  if (zipResult) {
    return zipResult;
  }

  // No validation available - return input as-is with warning
  return {
    validated: false,
    normalized: {
      street: address.street,
      city: address.city || '',
      state: address.state || '',
      stateCode: address.state || '',
      zipCode: address.zipCode,
      country: 'US',
    },
    provider: 'manual',
    confidence: 'low',
    warnings: ['Address could not be validated - using input as provided'],
  };
}

/**
 * Express route handler for address validation
 */
export async function validateAddressHandler(req: Request, res: Response) {
  try {
    const { street, city, state, zipCode } = req.body;

    if (!street || !zipCode) {
      return res.status(400).json({
        error: 'Missing required fields: street and zipCode are required',
      });
    }

    const result = await validateAddress({ street, city, state, zipCode });
    
    return res.json(result);
  } catch (error) {
    console.error('[Address Validation] Handler error:', error);
    return res.status(500).json({
      error: 'Address validation failed',
      message: error.message,
    });
  }
}
