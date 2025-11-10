import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { Percent, Calendar, DollarSign } from 'lucide-react';

const COMMON_TERMS = [24, 36, 48, 60, 72, 84];
const COMMON_LEASE_TERMS = [24, 36, 39, 48];

export function FinanceLeaseForm() {
  const { scenario, updateField, calculations } = useScenarioForm();
  
  const isFinance = scenario.scenarioType === 'FINANCE_DEAL';
  const isLease = scenario.scenarioType === 'LEASE_DEAL';
  
  const handlePercentChange = (field: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    updateField(field as any, cleaned);
  };
  
  const formatPercent = (value: string | number | null) => {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toFixed(2);
  };
  
  const switchToFinance = () => {
    updateField('scenarioType', 'FINANCE_DEAL');
    // Only set defaults if truly undefined/null (preserves fetched server values including '0')
    if (scenario.apr === undefined || scenario.apr === null) {
      updateField('apr', '5.99');
    }
    if (scenario.term === undefined || scenario.term === null || scenario.term === 0) {
      updateField('term', 60);
    }
  };
  
  const switchToLease = () => {
    updateField('scenarioType', 'LEASE_DEAL');
    // Only set defaults if truly undefined/null (preserves fetched server values)
    if (scenario.moneyFactor === undefined || scenario.moneyFactor === null) {
      updateField('moneyFactor', '0.00125');
    }
    if (scenario.term === undefined || scenario.term === null || scenario.term === 0) {
      updateField('term', 36);
    }
    if (scenario.residualPercent === undefined || scenario.residualPercent === null) {
      updateField('residualPercent', '50');
    }
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Deal Type Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Deal Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isFinance ? 'default' : 'outline'}
            size="lg"
            className="flex-1 toggle-elevate"
            data-class={isFinance ? 'toggle-elevated' : ''}
            data-testid="button-finance-deal"
            onClick={switchToFinance}
          >
            Finance
          </Button>
          <Button
            type="button"
            variant={isLease ? 'default' : 'outline'}
            size="lg"
            className="flex-1 toggle-elevate"
            data-class={isLease ? 'toggle-elevated' : ''}
            data-testid="button-lease-deal"
            onClick={switchToLease}
          >
            Lease
          </Button>
        </div>
      </div>
      
      {isFinance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* APR */}
          <div className="space-y-2">
            <Label htmlFor="apr" className="text-sm font-medium">
              APR (Annual Percentage Rate)
            </Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="apr"
                type="text"
                inputMode="decimal"
                value={scenario.apr || ''}
                onChange={(e) => handlePercentChange('apr', e.target.value)}
                className="pl-9 font-mono tabular-nums min-h-11 text-base"
                placeholder="5.99"
                data-testid="input-apr"
              />
            </div>
            <p className="text-xs text-muted-foreground">Interest rate for financing</p>
          </div>
          
          {/* Term */}
          <div className="space-y-2">
            <Label htmlFor="term" className="text-sm font-medium">
              Term (Months)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Select
                value={scenario.term?.toString() || '60'}
                onValueChange={(value) => updateField('term', parseInt(value))}
              >
                <SelectTrigger className="pl-9 min-h-11" data-testid="select-term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TERMS.map(term => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Loan length: {scenario.term || 60} months ({((scenario.term || 60) / 12).toFixed(1)} years)
            </p>
          </div>
        </div>
      )}
      
      {isLease && (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Money Factor */}
            <div className="space-y-2">
              <Label htmlFor="moneyFactor" className="text-sm font-medium">
                Money Factor
              </Label>
              <Input
                id="moneyFactor"
                type="text"
                inputMode="decimal"
                value={scenario.moneyFactor || '0.00125'}
                onChange={(e) => updateField('moneyFactor', e.target.value)}
                className="font-mono tabular-nums min-h-11 text-base"
                placeholder="0.00125"
                data-testid="input-money-factor"
              />
              <p className="text-xs text-muted-foreground">
                Lease rate (approx. {((parseFloat(scenario.moneyFactor || '0.00125') * 2400)).toFixed(2)}% APR)
              </p>
            </div>
            
            {/* Term */}
            <div className="space-y-2">
              <Label htmlFor="leaseTerm" className="text-sm font-medium">
                Lease Term (Months)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Select
                  value={scenario.term?.toString() || '36'}
                  onValueChange={(value) => updateField('term', parseInt(value))}
                >
                  <SelectTrigger className="pl-9 min-h-11" data-testid="select-lease-term">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LEASE_TERMS.map(term => (
                      <SelectItem key={term} value={term.toString()}>
                        {term} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Lease period: {scenario.term || 36} months
              </p>
            </div>
            
            {/* Residual Percentage */}
            <div className="space-y-2">
              <Label htmlFor="residualPercent" className="text-sm font-medium">
                Residual Percentage
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="residualPercent"
                  type="text"
                  inputMode="decimal"
                  value={scenario.residualPercent || ''}
                  onChange={(e) => handlePercentChange('residualPercent', e.target.value)}
                  className="pl-9 font-mono tabular-nums min-h-11 text-base"
                  placeholder="50.00"
                  data-testid="input-residual-percent"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Of MSRP (${(parseFloat(scenario.vehiclePrice || '0') * parseFloat(scenario.residualPercent || '0') / 100).toFixed(0)})
              </p>
            </div>
            
            {/* Residual Value */}
            <div className="space-y-2">
              <Label htmlFor="residualValue" className="text-sm font-medium">
                Residual Value
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="residualValue"
                  type="text"
                  inputMode="decimal"
                  value={scenario.residualValue || ''}
                  onChange={(e) => updateField('residualValue', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="pl-9 font-mono tabular-nums min-h-11 text-base"
                  placeholder="18000.00"
                  data-testid="input-residual-value"
                />
              </div>
              <p className="text-xs text-muted-foreground">Vehicle value at lease end</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Summary */}
      <div className="calc-surface p-4 bg-primary/5 border-primary/20">
        <div className="flex items-baseline justify-between">
          <span className="text-step--1 font-medium text-muted-foreground">Monthly Payment</span>
          <span className="text-step-2 font-bold text-primary transition-smooth" data-testid="text-monthly-payment" data-currency>
            ${calculations.monthlyPayment.toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Term</div>
            <div className="text-step--1 font-semibold" data-numeric>{scenario.term || 0} mo</div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Financed</div>
            <div className="text-step--1 font-semibold" data-currency>${calculations.amountFinanced.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Total Cost</div>
            <div className="text-step--1 font-semibold" data-currency>${calculations.totalCost.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
