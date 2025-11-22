/**
 * Secure Address Autocomplete Component
 *
 * Uses server-side Google Maps API proxy to protect API key
 * Provides autocomplete dropdown with address suggestions
 */

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleAutocompleteSecure, type AddressComponents } from '@/hooks/use-google-autocomplete-secure';
import { Loader2, MapPin, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AddressAutocompleteSecureProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onSelect'> {
  onAddressSelect?: (address: AddressComponents) => void;
  enableValidation?: boolean;
}

export const AddressAutocompleteSecure = forwardRef<HTMLInputElement, AddressAutocompleteSecureProps>(
  ({ onAddressSelect, enableValidation = true, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [selectedValue, setSelectedValue] = useState('');
    const debounceTimer = useRef<NodeJS.Timeout>();

    // Expose the input ref to parent
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const {
      isLoading,
      suggestions,
      fetchSuggestions,
      getPlaceDetails,
      clearSuggestions,
    } = useGoogleAutocompleteSecure();

    // Debounced fetch suggestions
    useEffect(() => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (inputValue.length >= 3) {
        debounceTimer.current = setTimeout(() => {
          fetchSuggestions(inputValue);
          setOpen(true);
        }, 300);
      } else {
        clearSuggestions();
        setOpen(false);
      }

      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, [inputValue, fetchSuggestions, clearSuggestions]);

    const handleSelect = async (placeId: string, description: string) => {
      setSelectedValue(description);
      setInputValue(description);
      setOpen(false);

      // Fetch full address details
      const addressDetails = await getPlaceDetails(placeId);
      if (addressDetails && onAddressSelect) {
        onAddressSelect(addressDetails);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Clear selection if user modifies selected value
      if (value !== selectedValue) {
        setSelectedValue('');
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            <Input
              ref={inputRef}
              className={cn('pl-9 pr-9', className)}
              placeholder="Start typing address..."
              value={inputValue}
              onChange={handleInputChange}
              autoComplete="off"
              {...props}
            />
            {selectedValue && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Searching...
                </div>
              )}
              {!isLoading && suggestions.length === 0 && inputValue.length >= 3 && (
                <CommandEmpty>No addresses found.</CommandEmpty>
              )}
              {!isLoading && suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.placeId}
                      value={suggestion.placeId}
                      onSelect={() => handleSelect(suggestion.placeId, suggestion.description)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.mainText}</span>
                        <span className="text-xs text-muted-foreground">{suggestion.secondaryText}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

AddressAutocompleteSecure.displayName = 'AddressAutocompleteSecure';
