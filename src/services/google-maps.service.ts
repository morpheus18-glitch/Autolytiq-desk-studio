/**
 * Google Maps API Integration Service
 *
 * Provides address autocomplete, validation, and geocoding using Google Maps Platform.
 * Ensures accurate customer addresses for tax calculation and compliance.
 */

/**
 * Address structure
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

/**
 * Validated address with Google metadata
 */
export interface ValidatedAddress extends Address {
  formattedAddress: string; // Google's formatted address string
  latitude?: number;
  longitude?: number;
  placeId?: string; // Google Place ID
  addressComponents: AddressComponent[];
  validationStatus: 'valid' | 'partial' | 'invalid';
  validationMessages: string[];
}

/**
 * Address component from Google
 */
export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

/**
 * Address suggestion for autocomplete
 */
export interface AddressSuggestion {
  description: string; // Display text
  placeId: string; // Google Place ID
  mainText: string; // Primary text (e.g., street address)
  secondaryText: string; // Secondary text (e.g., city, state)
}

/**
 * Geocoding result
 */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Google Maps Service
 */
export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[GoogleMapsService] API key not configured - address features will be disabled');
    }
  }

  /**
   * Check if Google Maps is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Autocomplete address suggestions
   */
  async autocompleteAddress(input: string, options?: {
    types?: string[]; // e.g., ['address'] to restrict to street addresses
    componentRestrictions?: { country: string }; // e.g., { country: 'us' }
  }): Promise<AddressSuggestion[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Maps API key not configured');
    }

    if (!input || input.trim().length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        input: input.trim(),
        key: this.apiKey,
        types: options?.types?.join('|') || 'address',
      });

      if (options?.componentRestrictions?.country) {
        params.append('components', `country:${options.componentRestrictions.country}`);
      }

      const url = `${this.baseUrl}/place/autocomplete/json?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return [];
      }

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      return data.predictions.map((prediction: any) => ({
        description: prediction.description,
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
      }));
    } catch (error) {
      console.error('[GoogleMapsService] Autocomplete error:', error);
      throw error;
    }
  }

  /**
   * Get place details by Place ID
   */
  async getPlaceDetails(placeId: string): Promise<ValidatedAddress> {
    if (!this.isConfigured()) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        fields: 'address_components,formatted_address,geometry',
      });

      const url = `${this.baseUrl}/place/details/json?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const result = data.result;
      return this.parseGooglePlace(result);
    } catch (error) {
      console.error('[GoogleMapsService] Place details error:', error);
      throw error;
    }
  }

  /**
   * Validate an address
   */
  async validateAddress(address: Address): Promise<ValidatedAddress> {
    if (!this.isConfigured()) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // Geocode the address
      const addressString = this.formatAddressForGeocoding(address);
      const params = new URLSearchParams({
        address: addressString,
        key: this.apiKey,
      });

      const url = `${this.baseUrl}/geocode/json?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return {
          ...address,
          formattedAddress: addressString,
          addressComponents: [],
          validationStatus: 'invalid',
          validationMessages: ['Address not found - please verify'],
        };
      }

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const result = data.results[0];
      return this.parseGooglePlace(result);
    } catch (error) {
      console.error('[GoogleMapsService] Address validation error:', error);
      throw error;
    }
  }

  /**
   * Geocode an address to latitude/longitude
   */
  async geocodeAddress(address: Address): Promise<LatLng> {
    if (!this.isConfigured()) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const addressString = this.formatAddressForGeocoding(address);
      const params = new URLSearchParams({
        address: addressString,
        key: this.apiKey,
      });

      const url = `${this.baseUrl}/geocode/json?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        throw new Error('Address not found');
      }

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (error) {
      console.error('[GoogleMapsService] Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Parse Google Place result into ValidatedAddress
   */
  private parseGooglePlace(place: any): ValidatedAddress {
    const components = place.address_components || [];
    const messages: string[] = [];

    // Extract address components
    const getComponent = (types: string[], format: 'long' | 'short' = 'long'): string => {
      const component = components.find((c: any) =>
        types.some((type: string) => c.types.includes(type))
      );
      return component ? (format === 'long' ? component.long_name : component.short_name) : '';
    };

    const street = [
      getComponent(['street_number'], 'short'),
      getComponent(['route']),
    ].filter(Boolean).join(' ');

    const city = getComponent(['locality', 'sublocality', 'postal_town']);
    const state = getComponent(['administrative_area_level_1'], 'short');
    const zipCode = getComponent(['postal_code'], 'short');
    const country = getComponent(['country'], 'short');

    // Validation checks
    let validationStatus: 'valid' | 'partial' | 'invalid' = 'valid';

    if (!street) {
      messages.push('Street address is missing');
      validationStatus = 'partial';
    }
    if (!city) {
      messages.push('City is missing');
      validationStatus = 'partial';
    }
    if (!state) {
      messages.push('State is missing');
      validationStatus = 'partial';
    }
    if (!zipCode) {
      messages.push('ZIP code is missing');
      validationStatus = 'partial';
    }

    // Extract coordinates
    const latitude = place.geometry?.location?.lat;
    const longitude = place.geometry?.location?.lng;

    return {
      street,
      city,
      state,
      zipCode,
      country,
      formattedAddress: place.formatted_address,
      latitude,
      longitude,
      placeId: place.place_id,
      addressComponents: components.map((c: any) => ({
        longName: c.long_name,
        shortName: c.short_name,
        types: c.types,
      })),
      validationStatus,
      validationMessages: messages.length > 0 ? messages : ['Address validated successfully'],
    };
  }

  /**
   * Format address for geocoding query
   */
  private formatAddressForGeocoding(address: Address): string {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country || 'US',
    ].filter(Boolean);

    return parts.join(', ');
  }
}

/**
 * Singleton instance (server-side usage)
 */
export const googleMapsService = new GoogleMapsService();
