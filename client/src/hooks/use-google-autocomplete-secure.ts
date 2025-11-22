/**
 * Secure Google Maps Places Autocomplete Hook
 *
 * Uses server-side proxy to protect API key - NEVER exposes key to client
 * Provides address autocomplete functionality via backend API
 */

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  stateCode: string;
  zipCode: string;
  county?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

export interface AddressSuggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

/**
 * Secure autocomplete hook using server-side proxy
 */
export function useGoogleAutocompleteSecure() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  /**
   * Fetch autocomplete suggestions from server
   */
  const fetchSuggestions = useCallback(async (input: string): Promise<void> => {
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/google-maps/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await response.json();

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('[Autocomplete] Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get full address details from place ID
   */
  const getPlaceDetails = useCallback(async (placeId: string): Promise<AddressComponents | null> => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/google-maps/place-details?placeId=${encodeURIComponent(placeId)}`);
      const validated = await response.json();

      return {
        street: validated.street || '',
        city: validated.city || '',
        state: validated.state || '',
        stateCode: validated.state || '', // Google returns short form
        zipCode: validated.zipCode || '',
        county: '', // Extract from addressComponents if needed
        country: validated.country || 'US',
        latitude: validated.latitude,
        longitude: validated.longitude,
        formattedAddress: validated.formattedAddress,
      };
    } catch (error) {
      console.error('[Place Details] Error:', error);
      toast({
        title: 'Error Loading Address',
        description: 'Failed to load address details. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Validate address using server
   */
  const validateAddress = useCallback(async (address: {
    street: string;
    city?: string;
    state?: string;
    zipCode: string;
  }): Promise<AddressComponents | null> => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/google-maps/validate-address', address);
      const validated = await response.json();

      if (validated.validationStatus === 'invalid') {
        toast({
          title: 'Address Not Found',
          description: validated.validationMessages?.[0] || 'Could not validate address',
          variant: 'default',
        });
        return null;
      }

      return {
        street: validated.street || '',
        city: validated.city || '',
        state: validated.state || '',
        stateCode: validated.state || '',
        zipCode: validated.zipCode || '',
        county: '', // Extract from addressComponents if needed
        country: validated.country || 'US',
        latitude: validated.latitude,
        longitude: validated.longitude,
        formattedAddress: validated.formattedAddress,
      };
    } catch (error) {
      console.error('[Address Validation] Error:', error);
      toast({
        title: 'Validation Error',
        description: 'Failed to validate address',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Clear suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    isLoading,
    suggestions,
    fetchSuggestions,
    getPlaceDetails,
    validateAddress,
    clearSuggestions,
  };
}
