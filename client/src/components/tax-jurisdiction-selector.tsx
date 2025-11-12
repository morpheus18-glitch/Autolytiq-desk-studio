import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { TaxJurisdiction } from '@shared/schema';
import Decimal from 'decimal.js';
import { useDebounce } from 'use-debounce';

interface TaxJurisdictionSelectorProps {
  selectedJurisdictionId?: string;
  onSelect: (jurisdiction: TaxJurisdiction | null) => void;
  initialZipCode?: string;
}

export function TaxJurisdictionSelector({
  selectedJurisdictionId,
  onSelect,
  initialZipCode,
}: TaxJurisdictionSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedJurisdictionId);
  const [zipCode, setZipCode] = useState(initialZipCode || '');
  const [debouncedZipCode] = useDebounce(zipCode, 500);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const previousZipCodeRef = useRef<string>(debouncedZipCode);

  const { data: jurisdictions, isLoading } = useQuery<TaxJurisdiction[]>({
    queryKey: ['/api/tax-jurisdictions'],
  });

  // Auto-detect jurisdiction from ZIP code
  const { data: zipData, isLoading: isLoadingZip, error: zipError } = useQuery<TaxJurisdiction & { city?: string; state?: string }>({
    queryKey: [`/api/tax-jurisdictions/lookup?zipCode=${debouncedZipCode}`],
    enabled: debouncedZipCode.length === 5 && !showManualSelect,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  const selectedJurisdiction = jurisdictions?.find(j => j.id === selectedId);

  // Sync selectedId when prop changes
  useEffect(() => {
    setSelectedId(selectedJurisdictionId);
  }, [selectedJurisdictionId]);

  // Clear selection ONLY when ZIP code actually changes (not on mount)
  useEffect(() => {
    const zipChanged = previousZipCodeRef.current !== debouncedZipCode;
    previousZipCodeRef.current = debouncedZipCode;
    
    if (zipChanged && debouncedZipCode.length === 5 && !showManualSelect) {
      setSelectedId(undefined);
      onSelect(null);
    }
  }, [debouncedZipCode, showManualSelect, onSelect]);

  // Auto-select jurisdiction when ZIP data is successfully received
  useEffect(() => {
    if (zipData?.id && !showManualSelect) {
      setSelectedId(zipData.id);
    }
  }, [zipData, showManualSelect]);

  // Notify parent when jurisdiction is selected or loaded
  useEffect(() => {
    if (selectedId && jurisdictions) {
      const jurisdiction = jurisdictions.find(j => j.id === selectedId);
      onSelect(jurisdiction || null);
    } else if (!selectedId) {
      onSelect(null);
    }
  }, [selectedId, jurisdictions, onSelect]);

  const formatRate = (rate: string | number) => {
    return new Decimal(rate || 0).times(100).toFixed(4) + '%';
  };

  const getCombinedRate = (jurisdiction: TaxJurisdiction) => {
    // Calculate combined rate dynamically from component rates
    const combined = new Decimal(jurisdiction.stateTaxRate || 0)
      .plus(jurisdiction.countyTaxRate || 0)
      .plus(jurisdiction.cityTaxRate || 0)
      .plus(jurisdiction.townshipTaxRate || 0)
      .plus(jurisdiction.specialDistrictTaxRate || 0);
    return combined.times(100).toFixed(4) + '%';
  };

  const getJurisdictionLabel = (jurisdiction: TaxJurisdiction) => {
    const parts = [jurisdiction.state];
    if (jurisdiction.county) parts.push(jurisdiction.county);
    if (jurisdiction.city) parts.push(jurisdiction.city);
    if (jurisdiction.township) parts.push(jurisdiction.township);
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      {/* ZIP Code Input */}
      <div>
        <Label htmlFor="zip-code" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          ZIP Code (Auto-detect)
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="zip-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Enter ZIP code"
              value={zipCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                setZipCode(value);
                if (showManualSelect) setShowManualSelect(false);
              }}
              disabled={isLoading}
              className="pr-10"
              data-testid="input-zip-code"
            />
            {isLoadingZip && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
            {zipData && debouncedZipCode.length === 5 && !isLoadingZip && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            )}
            {zipError && debouncedZipCode.length === 5 && !isLoadingZip && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
          {!showManualSelect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManualSelect(true)}
              data-testid="button-manual-override"
            >
              Manual
            </Button>
          )}
        </div>
        {zipError && debouncedZipCode.length === 5 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ZIP code not found in tax database. Please select manually.
            </AlertDescription>
          </Alert>
        )}
        {zipData && debouncedZipCode.length === 5 && !showManualSelect && (
          <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-600" />
            Auto-detected: {zipData.city}, {zipData.state}
          </div>
        )}
      </div>

      {/* Manual Tax Jurisdiction Selector */}
      {showManualSelect && (
        <div>
          <Label htmlFor="tax-jurisdiction">Tax Jurisdiction (Manual)</Label>
          <div className="flex gap-2">
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={isLoading}
            >
              <SelectTrigger id="tax-jurisdiction" data-testid="select-tax-jurisdiction" className="flex-1">
                <SelectValue placeholder={isLoading ? "Loading jurisdictions..." : "Select tax jurisdiction"} />
              </SelectTrigger>
              <SelectContent>
                {jurisdictions?.map((jurisdiction) => (
                  <SelectItem key={jurisdiction.id} value={jurisdiction.id}>
                    {getJurisdictionLabel(jurisdiction)} - {getCombinedRate(jurisdiction)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManualSelect(false)}
              data-testid="button-use-zip"
            >
              Use ZIP
            </Button>
          </div>
        </div>
      )}

      {selectedJurisdiction && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-2" data-testid="tax-jurisdiction-details">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Combined Tax Rate</span>
            <Badge variant="secondary" className="font-mono" data-testid="text-combined-tax-rate">
              {getCombinedRate(selectedJurisdiction)}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">State:</span>
              <span className="font-mono" data-testid="text-state-tax-rate">{formatRate(selectedJurisdiction.stateTaxRate)}</span>
            </div>
            {parseFloat(selectedJurisdiction.countyTaxRate as any) > 0 && selectedJurisdiction.county && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  County ({selectedJurisdiction.county}):
                </span>
                <span className="font-mono" data-testid="text-county-tax-rate">{formatRate(selectedJurisdiction.countyTaxRate)}</span>
              </div>
            )}
            {parseFloat(selectedJurisdiction.cityTaxRate as any) > 0 && selectedJurisdiction.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  City ({selectedJurisdiction.city}):
                </span>
                <span className="font-mono" data-testid="text-city-tax-rate">{formatRate(selectedJurisdiction.cityTaxRate)}</span>
              </div>
            )}
            {parseFloat(selectedJurisdiction.townshipTaxRate as any) > 0 && selectedJurisdiction.township && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Township ({selectedJurisdiction.township}):
                </span>
                <span className="font-mono" data-testid="text-township-tax-rate">{formatRate(selectedJurisdiction.townshipTaxRate)}</span>
              </div>
            )}
            {parseFloat(selectedJurisdiction.specialDistrictTaxRate as any) > 0 && selectedJurisdiction.specialDistrict && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Special District ({selectedJurisdiction.specialDistrict}):
                </span>
                <span className="font-mono" data-testid="text-special-district-tax-rate">{formatRate(selectedJurisdiction.specialDistrictTaxRate)}</span>
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration Fee:</span>
              <span className="font-mono" data-testid="text-registration-fee">
                ${parseFloat(selectedJurisdiction.registrationFee as any).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title Fee:</span>
              <span className="font-mono" data-testid="text-title-fee">
                ${parseFloat(selectedJurisdiction.titleFee as any).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
