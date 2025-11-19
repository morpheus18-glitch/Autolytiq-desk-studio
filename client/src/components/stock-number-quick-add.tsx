import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hash, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Vehicle } from '@shared/schema';
import { useDebounce } from 'use-debounce';

interface StockNumberQuickAddProps {
  onVehicleSelect: (vehicle: Vehicle) => void;
  onClear?: () => void;
  selectedVehicle?: Vehicle | null;
  value?: string;
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function StockNumberQuickAdd({
  onVehicleSelect,
  onClear,
  selectedVehicle: controlledVehicle,
  value: controlledValue,
  className,
  label = "Stock Number",
  placeholder = "Enter stock# for quick add",
  disabled = false,
}: StockNumberQuickAddProps) {
  const [stockNumber, setStockNumber] = useState(controlledValue || '');
  const [debouncedStockNumber] = useDebounce(stockNumber, 400);

  // Search vehicles by stock number
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/inventory/search', debouncedStockNumber],
    enabled: debouncedStockNumber.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/inventory/search?q=${encodeURIComponent(debouncedStockNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to search vehicles');
      }
      return response.json();
    },
  });

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== stockNumber) {
      setStockNumber(controlledValue);
    }
  }, [controlledValue]);

  // Sync input with selected vehicle (handles Browse dialog and fallback search selections)
  useEffect(() => {
    if (controlledVehicle && controlledVehicle.stockNumber && controlledVehicle.stockNumber !== stockNumber) {
      setStockNumber(controlledVehicle.stockNumber);
    }
  }, [controlledVehicle]);

  // Auto-select vehicle if exact stock number match ONLY
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      return;
    }

    // Find exact stock number match (case insensitive)
    const exactMatch = vehicles.find(
      v => v.stockNumber && v.stockNumber.toLowerCase() === debouncedStockNumber.toLowerCase()
    );

    // Only auto-select on exact match (not single result)
    if (exactMatch && exactMatch.id !== controlledVehicle?.id) {
      onVehicleSelect(exactMatch);
    }
  }, [vehicles, debouncedStockNumber, onVehicleSelect, controlledVehicle?.id]);

  const showLoading = isLoading && debouncedStockNumber.length >= 2;
  const showSuccess = controlledVehicle && controlledVehicle.stockNumber && stockNumber.toLowerCase() === controlledVehicle.stockNumber.toLowerCase();
  const showNotFound = !isLoading && debouncedStockNumber.length >= 2 && (!vehicles || vehicles.length === 0);

  const handleClear = () => {
    setStockNumber('');
    onClear?.();
  };

  return (
    <div className={className}>
      <Label htmlFor="stock-number-input" className="flex items-center gap-2">
        {label}
        {showSuccess && (
          <Badge variant="default" className="text-xs" data-testid="badge-stock-found">
            <CheckCircle className="h-3 w-3 mr-1" />
            Found
          </Badge>
        )}
        {showNotFound && (
          <Badge variant="secondary" className="text-xs" data-testid="badge-stock-not-found">
            <XCircle className="h-3 w-3 mr-1" />
            Not found
          </Badge>
        )}
      </Label>
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="stock-number-input"
          type="text"
          placeholder={placeholder}
          value={stockNumber}
          onChange={(e) => {
            const newValue = e.target.value.toUpperCase();
            setStockNumber(newValue);
            // Clear parent's selection when typed value differs from selected vehicle's stock#
            // This allows user to type a new stock# while keeping their typed text
            if (controlledVehicle && newValue !== controlledVehicle.stockNumber && onClear) {
              onClear();
            }
          }}
          className="pl-10 pr-10 font-mono"
          disabled={disabled}
          data-testid="input-stock-number"
        />
        {showLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" data-testid="icon-stock-loading" />
        )}
        {showSuccess && (
          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" data-testid="icon-stock-success" />
        )}
      </div>
      
      {/* Display selected vehicle info */}
      {controlledVehicle && showSuccess && (
        <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1" data-testid="card-selected-vehicle">
          <div className="font-semibold text-sm" data-testid="text-vehicle-description">
            {controlledVehicle.year} {controlledVehicle.make} {controlledVehicle.model}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono" data-testid="text-vehicle-stock">{controlledVehicle.stockNumber}</span>
            <span>•</span>
            <span data-testid="text-vehicle-mileage">{controlledVehicle.mileage.toLocaleString()} mi</span>
            {controlledVehicle.trim && (
              <>
                <span>•</span>
                <span data-testid="text-vehicle-trim">{controlledVehicle.trim}</span>
              </>
            )}
          </div>
          <div className="text-lg font-mono font-bold tabular-nums" data-testid="text-vehicle-price">
            ${parseFloat(controlledVehicle.price).toLocaleString()}
          </div>
        </div>
      )}
      
      {/* Show multiple matches */}
      {!showSuccess && vehicles && vehicles.length > 1 && debouncedStockNumber.length >= 2 && (
        <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50" data-testid="card-multiple-matches">
          <div className="text-xs text-muted-foreground mb-2" data-testid="text-match-count">
            Found {vehicles.length} matches. Type complete stock# for exact match:
          </div>
          <div className="space-y-1">
            {vehicles.slice(0, 3).map((v) => (
              <div key={v.id} className="text-xs" data-testid={`row-match-${v.stockNumber}`}>
                <span className="font-mono font-medium">{v.stockNumber}</span>
                <span className="text-muted-foreground ml-2">
                  {v.year} {v.make} {v.model}
                </span>
              </div>
            ))}
            {vehicles.length > 3 && (
              <div className="text-xs text-muted-foreground" data-testid="text-more-matches">
                +{vehicles.length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
