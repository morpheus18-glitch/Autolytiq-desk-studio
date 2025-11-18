/**
 * Address Autocomplete Component
 *
 * Google Maps powered address autocomplete input with validation
 * Automatically fills city, state, zipCode fields when address is selected
 */

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleAutocomplete, type AddressComponents } from '@/hooks/use-google-autocomplete';
import { Loader2, MapPin } from 'lucide-react';

export interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect?: (address: AddressComponents) => void;
  enableValidation?: boolean;
  componentRestrictions?: google.maps.places.ComponentRestrictions;
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ onAddressSelect, enableValidation = true, componentRestrictions, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose the input ref to parent
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const { isLoaded, isLoading } = useGoogleAutocomplete(
      inputRef,
      (address) => {
        onAddressSelect?.(address);
      },
      {
        types: ['address'],
        componentRestrictions: componentRestrictions || { country: 'us' },
      }
    );

    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
        <Input
          ref={inputRef}
          className={`pl-9 ${className || ''}`}
          placeholder={isLoaded ? 'Start typing address...' : 'Loading maps...'}
          disabled={!isLoaded || isLoading}
          autoComplete="off"
          {...props}
        />
        {!isLoaded && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';
