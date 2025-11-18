/**
 * Google Maps Places Autocomplete Hook
 *
 * Provides address autocomplete functionality using Google Maps Places API
 * Requires GOOGLE_MAPS_API_KEY to be configured on the backend
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
}

export interface GoogleAutocompleteOptions {
  types?: string[];
  componentRestrictions?: google.maps.places.ComponentRestrictions;
}

export function useGoogleAutocomplete(
  inputRef: React.RefObject<HTMLInputElement>,
  onPlaceSelected?: (address: AddressComponents) => void,
  options?: GoogleAutocompleteOptions
) {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps Script
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      toast({
        title: 'Error Loading Maps',
        description: 'Failed to load Google Maps. Address autocomplete disabled.',
        variant: 'destructive',
      });
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [toast]);

  // Initialize Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: options?.types || ['address'],
        componentRestrictions: options?.componentRestrictions || { country: 'us' },
        fields: [
          'address_components',
          'formatted_address',
          'geometry',
          'place_id',
        ],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.address_components || !place.geometry) {
          toast({
            title: 'Incomplete Address',
            description: 'Please select a complete address from the dropdown.',
            variant: 'destructive',
          });
          return;
        }

        // Extract address components
        const components = place.address_components;
        const getComponent = (type: string, useShort = false) => {
          const comp = components.find((c) => c.types.includes(type));
          return comp ? (useShort ? comp.short_name : comp.long_name) : '';
        };

        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        const city =
          getComponent('locality') ||
          getComponent('sublocality') ||
          getComponent('administrative_area_level_3');
        const state = getComponent('administrative_area_level_1');
        const stateCode = getComponent('administrative_area_level_1', true);
        const zipCode = getComponent('postal_code');
        const county = getComponent('administrative_area_level_2');
        const country = getComponent('country', true);

        const addressData: AddressComponents = {
          street: `${streetNumber} ${route}`.trim(),
          city,
          state,
          stateCode,
          zipCode,
          county: county.replace(' County', ''),
          country: country || 'US',
          latitude: place.geometry.location?.lat(),
          longitude: place.geometry.location?.lng(),
        };

        onPlaceSelected?.(addressData);
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('[Google Autocomplete] Initialization error:', error);
      toast({
        title: 'Autocomplete Error',
        description: 'Failed to initialize address autocomplete.',
        variant: 'destructive',
      });
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, inputRef, onPlaceSelected, options, toast]);

  // Validate address using backend API
  const validateAddress = useCallback(async (address: {
    street: string;
    city?: string;
    state?: string;
    zipCode: string;
  }): Promise<AddressComponents | null> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        throw new Error('Address validation failed');
      }

      const data = await response.json();

      if (!data.validated) {
        toast({
          title: 'Address Not Validated',
          description: data.warnings?.[0] || 'Could not validate address',
          variant: 'default',
        });
        return null;
      }

      return {
        street: data.normalized.street,
        city: data.normalized.city,
        state: data.normalized.state,
        stateCode: data.normalized.stateCode,
        zipCode: data.normalized.zipCode,
        county: data.normalized.county,
        country: data.normalized.country,
        latitude: data.metadata?.latitude,
        longitude: data.metadata?.longitude,
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

  return {
    isLoaded,
    isLoading,
    validateAddress,
  };
}
