import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export function TradeForm() {
  const { scenario, tradeVehicle, updateField, calculations } = useScenarioForm();
  
  const handleCurrencyChange = (field: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    updateField(field as any, cleaned);
  };
  
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
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
        <div className="space-y-2">
          <Label htmlFor="tradeAllowance" className="text-sm font-medium">
            Trade Allowance (ACV)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="tradeAllowance"
              type="text"
              value={formatCurrency(scenario.tradeAllowance)}
              onChange={(e) => handleCurrencyChange('tradeAllowance', e.target.value)}
              className="pl-9 font-mono tabular-nums"
              data-testid="input-trade-allowance"
            />
          </div>
          <p className="text-xs text-muted-foreground">Actual cash value credit to customer</p>
        </div>
        
        {/* Trade Payoff */}
        <div className="space-y-2">
          <Label htmlFor="tradePayoff" className="text-sm font-medium">
            Trade Payoff
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="tradePayoff"
              type="text"
              value={formatCurrency(scenario.tradePayoff)}
              onChange={(e) => handleCurrencyChange('tradePayoff', e.target.value)}
              className="pl-9 font-mono tabular-nums"
              data-testid="input-trade-payoff"
            />
          </div>
          <p className="text-xs text-muted-foreground">Lien amount owed on trade</p>
        </div>
      </div>
      
      {/* Trade Equity Indicator */}
      <div className={`calc-surface border p-4 ${
        hasPositiveEquity ? 'bg-green-500/10 border-green-500/20' :
        hasNegativeEquity ? 'bg-red-500/10 border-red-500/20' :
        ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPositiveEquity && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />}
            {hasNegativeEquity && <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
            <span className="text-step--1 font-medium">
              {hasPositiveEquity ? 'Positive Equity' : hasNegativeEquity ? 'Negative Equity' : 'No Trade'}
            </span>
          </div>
          <div className={`text-step-1 font-bold ${
            hasPositiveEquity ? 'text-green-600 dark:text-green-400' :
            hasNegativeEquity ? 'text-red-600 dark:text-red-400' :
            'text-muted-foreground'
          }`} data-testid="text-trade-equity" data-currency>
            ${Math.abs(calculations.tradeEquity.toNumber()).toFixed(2)}
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
