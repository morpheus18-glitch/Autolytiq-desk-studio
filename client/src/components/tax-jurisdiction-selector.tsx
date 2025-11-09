import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { TaxJurisdiction } from '@shared/schema';
import Decimal from 'decimal.js';

interface TaxJurisdictionSelectorProps {
  selectedJurisdictionId?: string;
  onSelect: (jurisdiction: TaxJurisdiction | null) => void;
}

export function TaxJurisdictionSelector({
  selectedJurisdictionId,
  onSelect,
}: TaxJurisdictionSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedJurisdictionId);

  const { data: jurisdictions, isLoading } = useQuery<TaxJurisdiction[]>({
    queryKey: ['/api/tax-jurisdictions'],
  });

  const selectedJurisdiction = jurisdictions?.find(j => j.id === selectedId);

  // Sync selectedId when prop changes
  useEffect(() => {
    setSelectedId(selectedJurisdictionId);
  }, [selectedJurisdictionId]);

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
    <div className="space-y-3">
      <div>
        <Label htmlFor="tax-jurisdiction">Tax Jurisdiction</Label>
        <Select
          value={selectedId}
          onValueChange={setSelectedId}
          disabled={isLoading}
        >
          <SelectTrigger id="tax-jurisdiction" data-testid="select-tax-jurisdiction">
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
      </div>

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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trade-In Credit:</span>
              <span className="capitalize" data-testid="text-trade-in-credit-type">
                {selectedJurisdiction.tradeInCreditType.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
