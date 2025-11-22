import { Badge } from '@/components/ui/badge';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { CurrencyField } from '@/components/ui/currency-field';
import { formatCurrency, getValueColorClass } from '@/lib/pricing-utils';
import { parseScenarioNumber } from '@/lib/currency';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TradeForm() {
  const { scenario, tradeVehicle, updateField, calculations } = useScenarioForm();
  
  const hasPositiveEquity = calculations.tradeEquity.greaterThan(0);
  const hasNegativeEquity = calculations.tradeEquity.lessThan(0);
  
  return (
    <div className="space-y-6">
      {/* Trade Vehicle Info */}
      {tradeVehicle && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Trade-In Vehicle</h4>
            <Badge variant="outline" className="text-xs">
              {tradeVehicle.year} {tradeVehicle.make} {tradeVehicle.model}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">VIN:</span>
              <span className="ml-2 font-mono">{tradeVehicle.vin}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mileage:</span>
              <span className="ml-2 font-mono">{tradeVehicle.mileage.toLocaleString()} mi</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trade Allowance */}
        <div>
          <CurrencyField
            label="Trade Allowance (ACV)"
            value={parseScenarioNumber(scenario.tradeAllowance)}
            onChange={(value) => updateField('tradeAllowance', value)}
            testId="input-trade-allowance"
          />
          <p className="text-xs text-muted-foreground mt-2">Actual cash value credit to customer</p>
        </div>
        
        {/* Trade Payoff */}
        <div>
          <CurrencyField
            label="Trade Payoff"
            value={parseScenarioNumber(scenario.tradePayoff)}
            onChange={(value) => updateField('tradePayoff', value)}
            testId="input-trade-payoff"
          />
          <p className="text-xs text-muted-foreground mt-2">Lien amount owed on trade</p>
        </div>
      </div>
      
      {/* Trade Equity Indicator */}
      <div className={cn(
        "calc-surface border p-4",
        hasPositiveEquity && 'bg-success/10 border-success/20',
        hasNegativeEquity && 'bg-destructive/10 border-destructive/20'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPositiveEquity && <TrendingUp className={cn("w-4 h-4", getValueColorClass(calculations.tradeEquity))} />}
            {hasNegativeEquity && <TrendingDown className={cn("w-4 h-4", getValueColorClass(calculations.tradeEquity))} />}
            <span className="text-step--1 font-medium">
              {hasPositiveEquity ? 'Positive Equity' : hasNegativeEquity ? 'Negative Equity' : 'No Trade'}
            </span>
          </div>
          <div className={cn(
            "text-step-1 font-bold font-mono tabular-nums",
            getValueColorClass(calculations.tradeEquity)
          )} data-testid="text-trade-equity" data-currency>
            {formatCurrency(Math.abs(calculations.tradeEquity.toNumber()))}
          </div>
        </div>
        <p className="text-step--2 text-muted-foreground mt-2">
          {hasPositiveEquity && 'Customer has equity that reduces amount financed'}
          {hasNegativeEquity && 'Negative equity will be added to amount financed'}
          {!hasPositiveEquity && !hasNegativeEquity && 'Allowance = Payoff (zero equity)'}
        </p>
      </div>
    </div>
  );
}
