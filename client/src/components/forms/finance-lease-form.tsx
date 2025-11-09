import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { Percent, Calendar } from 'lucide-react';

const COMMON_TERMS = [24, 36, 48, 60, 72, 84];

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
  
  return (
    <div className="space-y-6">
      {/* Scenario Type Badge */}
      <div className="flex items-center gap-3">
        <Badge variant={isFinance ? 'default' : isLease ? 'secondary' : 'outline'} className="text-xs">
          {isFinance ? 'Finance Deal' : isLease ? 'Lease Deal' : 'Cash Deal'}
        </Badge>
        {(isFinance || isLease) && (
          <span className="text-xs text-muted-foreground">
            Configure payment terms below
          </span>
        )}
      </div>
      
      {isFinance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                value={formatPercent(scenario.apr)}
                onChange={(e) => handlePercentChange('apr', e.target.value)}
                className="pl-9 font-mono tabular-nums"
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
                <SelectTrigger className="pl-9" data-testid="select-term">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Money Factor */}
          <div className="space-y-2">
            <Label htmlFor="moneyFactor" className="text-sm font-medium">
              Money Factor
            </Label>
            <Input
              id="moneyFactor"
              type="text"
              value={scenario.moneyFactor || '0.00125'}
              onChange={(e) => updateField('moneyFactor', e.target.value)}
              className="font-mono tabular-nums"
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
                <SelectTrigger className="pl-9" data-testid="select-lease-term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {[24, 36, 39, 48].map(term => (
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
          
          {/* Residual Value */}
          <div className="space-y-2">
            <Label htmlFor="residualValue" className="text-sm font-medium">
              Residual Value
            </Label>
            <Input
              id="residualValue"
              type="text"
              value={scenario.residualValue || ''}
              onChange={(e) => updateField('residualValue', e.target.value.replace(/[^0-9.]/g, ''))}
              className="font-mono tabular-nums"
              placeholder="18000.00"
              data-testid="input-residual-value"
            />
            <p className="text-xs text-muted-foreground">Vehicle value at lease end</p>
          </div>
        </div>
      )}
      
      {/* Payment Summary */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted-foreground">Monthly Payment</span>
          <span className="text-2xl font-mono font-bold tabular-nums text-primary" data-testid="text-monthly-payment">
            ${calculations.monthlyPayment.toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Term</div>
            <div className="font-mono font-semibold tabular-nums">{scenario.term || 0} mo</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Financed</div>
            <div className="font-mono font-semibold tabular-nums">${calculations.amountFinanced.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Total Cost</div>
            <div className="font-mono font-semibold tabular-nums">${calculations.totalCost.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
