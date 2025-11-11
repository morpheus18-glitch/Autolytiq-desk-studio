/**
 * State Tax Selector Component
 * Dropdown selector for all 50 US states with tax information display
 * Auto-detects state from ZIP code and shows relevant tax rules
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MapPin, 
  DollarSign, 
  Car, 
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  TrendingDown,
  FileText,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATE_TAX_DATA, getStateTaxInfo, getAllStates, type StateTax } from '@shared/tax-data';
import { formatPercentage } from '@/lib/tax-calculator';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

interface StateTaxSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  zipCode?: string;
  onZipCodeChange?: (zipCode: string) => void;
  className?: string;
  showDetails?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function StateTaxSelector({
  value,
  onValueChange,
  zipCode,
  onZipCodeChange,
  className,
  showDetails = true,
  disabled = false,
  required = false
}: StateTaxSelectorProps) {
  const [localZipCode, setLocalZipCode] = useState(zipCode || '');
  const [debouncedZipCode] = useDebounce(localZipCode, 500);
  const [showManualOverride, setShowManualOverride] = useState(false);
  
  // Fetch all states data
  const allStates = useMemo(() => getAllStates(), []);
  
  // Get current state tax info
  const currentStateTax = value ? getStateTaxInfo(value) : null;
  
  // Auto-detect state from ZIP code
  const { data: zipData, isLoading: isLoadingZip } = useQuery({
    queryKey: [`/api/tax/zip/${debouncedZipCode}`],
    enabled: debouncedZipCode.length === 5,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
  
  // Auto-select state when ZIP data is received
  useEffect(() => {
    if (zipData && zipData.stateCode) {
      onValueChange(zipData.stateCode);
    }
  }, [zipData, onValueChange]);
  
  const handleZipCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const zip = e.target.value.replace(/\D/g, '').slice(0, 5);
    setLocalZipCode(zip);
    if (onZipCodeChange) {
      onZipCodeChange(zip);
    }
  }, [onZipCodeChange]);
  
  // Group states by region for better UX
  const statesByRegion = useMemo(() => {
    const regions: Record<string, StateTax[]> = {
      'Northeast': [],
      'Southeast': [],
      'Midwest': [],
      'Southwest': [],
      'West': [],
      'Non-Continental': []
    };
    
    allStates.forEach(state => {
      // Simple regional grouping
      if (['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'].includes(state.stateCode)) {
        regions['Northeast'].push(state);
      } else if (['MD', 'DE', 'DC', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY'].includes(state.stateCode)) {
        regions['Southeast'].push(state);
      } else if (['OH', 'IN', 'MI', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'].includes(state.stateCode)) {
        regions['Midwest'].push(state);
      } else if (['TX', 'OK', 'AR', 'LA', 'NM', 'AZ'].includes(state.stateCode)) {
        regions['Southwest'].push(state);
      } else if (['WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO'].includes(state.stateCode)) {
        regions['West'].push(state);
      } else {
        regions['Non-Continental'].push(state);
      }
    });
    
    return regions;
  }, [allStates]);
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* ZIP Code Input for Auto-Detection */}
      {onZipCodeChange && (
        <div className="space-y-2">
          <Label htmlFor="zip-code">
            ZIP Code
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="inline-block h-3 w-3 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enter ZIP code to auto-detect state and local tax rates</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <Input
              id="zip-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Enter ZIP code"
              value={localZipCode}
              onChange={handleZipCodeChange}
              disabled={disabled}
              className="pr-10"
              data-testid="input-zip-code"
            />
            {isLoadingZip && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!isLoadingZip && debouncedZipCode.length === 5 && (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {zipData && debouncedZipCode.length === 5 && (
            <Alert className="py-3">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{zipData.city}, {zipData.state} {zipData.zipCode}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {zipData.county} County • Local: {formatPercentage(zipData.localTaxRate)} • State: {formatPercentage(zipData.stateTaxRate || 0)}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowManualOverride(!showManualOverride)}
                    className="text-xs"
                    data-testid="button-override-state"
                  >
                    {showManualOverride ? 'Hide' : 'Change'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      {/* State Selector - Show if ZIP is not provided, failed, or manual override requested */}
      {((!zipData || debouncedZipCode.length !== 5) || showManualOverride) && (
        <div className="space-y-2">
          <Label htmlFor="state-selector">
            State {required && <span className="text-destructive">*</span>}
            <span className="text-xs text-muted-foreground ml-2">(or enter ZIP code above)</span>
          </Label>
          <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger 
              id="state-selector"
              className="w-full"
              data-testid="select-state"
            >
              <SelectValue placeholder="Select a state or enter ZIP code">
              {value && currentStateTax && (
                <div className="flex items-center justify-between w-full pr-2">
                  <span>{currentStateTax.stateName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {formatPercentage(currentStateTax.baseTaxRate)}
                    </Badge>
                    {currentStateTax.tradeInCredit !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Trade-in
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {/* Popular States */}
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold uppercase tracking-wide">
                Popular States
              </SelectLabel>
              {['CA', 'TX', 'FL', 'NY', 'IL'].map(stateCode => {
                const state = STATE_TAX_DATA[stateCode];
                return (
                  <SelectItem 
                    key={stateCode} 
                    value={stateCode}
                    data-testid={`select-state-${stateCode}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{state.stateName}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatPercentage(state.baseTaxRate)}
                        </span>
                        {state.tradeInCredit !== 'none' && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
            
            <SelectSeparator />
            
            {/* All States by Region */}
            {Object.entries(statesByRegion).map(([region, states]) => (
              states.length > 0 && (
                <SelectGroup key={region}>
                  <SelectLabel className="text-xs font-semibold uppercase tracking-wide">
                    {region}
                  </SelectLabel>
                  {states.map(state => (
                    <SelectItem 
                      key={state.stateCode} 
                      value={state.stateCode}
                      data-testid={`select-state-${state.stateCode}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{state.stateName}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatPercentage(state.baseTaxRate)}
                          </span>
                          {state.tradeInCredit !== 'none' && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            ))}
          </SelectContent>
        </Select>
      </div>
      )}
      
      {/* State Tax Details */}
      {showDetails && currentStateTax && (
        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {currentStateTax.stateName} Tax Information
            </h4>
            <Badge 
              variant={currentStateTax.baseTaxRate === 0 ? "secondary" : "default"}
              data-testid="badge-tax-rate"
            >
              {currentStateTax.baseTaxRate === 0 
                ? "No Sales Tax" 
                : `${formatPercentage(currentStateTax.baseTaxRate)} State Tax`}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Trade-in Credit */}
            <div className="flex items-start gap-2">
              {currentStateTax.tradeInCredit !== 'none' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Trade-in Credit</div>
                    <div className="text-xs text-muted-foreground">
                      {currentStateTax.tradeInCredit === 'full' && 'Full credit'}
                      {currentStateTax.tradeInCredit === 'partial' && 
                        `Limited to $${(currentStateTax.tradeInCreditLimit || 0).toLocaleString()}`}
                      {currentStateTax.tradeInCredit === 'tax_on_difference' && 'Tax on difference'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium">No Trade-in Credit</div>
                    <div className="text-xs text-muted-foreground">Full tax on purchase</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Doc Fee */}
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Doc Fee</div>
                <div className="text-xs text-muted-foreground">
                  {currentStateTax.maxDocFee 
                    ? `Max $${currentStateTax.maxDocFee}` 
                    : 'No limit'}
                  {currentStateTax.docFeeTaxable && ' (taxable)'}
                </div>
              </div>
            </div>
            
            {/* Title & Registration */}
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Title Fee</div>
                <div className="text-xs text-muted-foreground">${currentStateTax.titleFee}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Registration</div>
                <div className="text-xs text-muted-foreground">
                  Base ${currentStateTax.registrationFeeBase}
                </div>
              </div>
            </div>
            
            {/* Local Tax */}
            {currentStateTax.hasLocalTax && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Local Tax</div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(currentStateTax.localTaxRanges.min)} - {formatPercentage(currentStateTax.localTaxRanges.max)}
                  </div>
                </div>
              </div>
            )}
            
            {/* EV Incentive/Fee */}
            {(currentStateTax.evIncentive || currentStateTax.evFee) && (
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium">Electric Vehicle</div>
                  <div className="text-xs text-muted-foreground">
                    {currentStateTax.evIncentive && `$${currentStateTax.evIncentive} incentive`}
                    {currentStateTax.evIncentive && currentStateTax.evFee && ', '}
                    {currentStateTax.evFee && `$${currentStateTax.evFee} annual fee`}
                  </div>
                </div>
              </div>
            )}
            
            {/* Luxury Tax */}
            {currentStateTax.luxuryTaxThreshold && (
              <div className="flex items-start gap-2 col-span-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium">Luxury Tax</div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(currentStateTax.luxuryTaxRate || 0)} on vehicles over ${currentStateTax.luxuryTaxThreshold.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Special Notes */}
          {currentStateTax.notes && (
            <Alert className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {currentStateTax.notes}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}