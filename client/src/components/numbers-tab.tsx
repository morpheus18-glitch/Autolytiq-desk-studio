import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import { cn } from '@/lib/utils';

export function NumbersTab() {
  const { scenario, calculations, updateField } = useScenarioForm();
  
  // Local state for controlled inputs
  const [vehiclePrice, setVehiclePrice] = useState(scenario.vehiclePrice || '0');
  const [downPayment, setDownPayment] = useState(scenario.downPayment || '0');
  const [tradeAllowance, setTradeAllowance] = useState(scenario.tradeAllowance || '0');
  const [tradePayoff, setTradePayoff] = useState(scenario.tradePayoff || '0');
  const [apr, setApr] = useState(scenario.apr || '5.99');
  
  // Track which field is focused (to show unformatted value during editing)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Sync local state with scenario changes
  useEffect(() => {
    setVehiclePrice(scenario.vehiclePrice || '0');
    setDownPayment(scenario.downPayment || '0');
    setTradeAllowance(scenario.tradeAllowance || '0');
    setTradePayoff(scenario.tradePayoff || '0');
    setApr(scenario.apr || '5.99');
  }, [scenario]);

  const formatCurrency = (value: string, isFocused: boolean): string => {
    if (isFocused) return value; // Don't format while editing
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (
    value: string,
    setter: (v: string) => void
  ) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    setter(cleaned);
  };

  const handleCurrencyFocus = (fieldName: string) => {
    setFocusedField(fieldName);
  };

  const handleCurrencyBlur = (
    value: string,
    setter: (v: string) => void,
    field: keyof typeof scenario,
    fieldName: string
  ) => {
    setFocusedField(null);
    // Strip commas and any other non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0) {
      const formatted = num.toFixed(2);
      setter(formatted); // Update local state with clean value
      updateField(field, formatted);
    }
  };

  const handleAprChange = (value: string) => {
    setApr(value);
  };

  const handleAprBlur = () => {
    const num = parseFloat(apr);
    if (!isNaN(num)) {
      updateField('apr', num.toFixed(2));
    }
  };

  const tradeEquity = calculations.tradeEquity;
  const isPositiveEquity = tradeEquity.greaterThanOrEqualTo(0);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-32">
      {/* Deal Structure */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Deal Structure</h3>
        </div>

        <div className="space-y-4">
          {/* Vehicle Price */}
          <div className="space-y-2">
            <Label htmlFor="vehicle-price" className="text-sm font-medium">
              Vehicle Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="vehicle-price"
                type="text"
                inputMode="decimal"
                value={formatCurrency(vehiclePrice, focusedField === 'vehicle-price')}
                onChange={(e) => handleCurrencyChange(e.target.value, setVehiclePrice)}
                onFocus={() => handleCurrencyFocus('vehicle-price')}
                onBlur={() => handleCurrencyBlur(vehiclePrice, setVehiclePrice, 'vehiclePrice', 'vehicle-price')}
                className="pl-7 font-mono text-lg"
                data-testid="input-vehicle-price"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div className="space-y-2">
            <Label htmlFor="down-payment" className="text-sm font-medium">
              Down Payment
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="down-payment"
                type="text"
                inputMode="decimal"
                value={formatCurrency(downPayment, focusedField === 'down-payment')}
                onChange={(e) => handleCurrencyChange(e.target.value, setDownPayment)}
                onFocus={() => handleCurrencyFocus('down-payment')}
                onBlur={() => handleCurrencyBlur(downPayment, setDownPayment, 'downPayment', 'down-payment')}
                className="pl-7 font-mono text-lg"
                data-testid="input-down-payment"
              />
            </div>
          </div>

          {/* Trade-In Allowance */}
          <div className="space-y-2">
            <Label htmlFor="trade-allowance" className="text-sm font-medium">
              Trade-In Allowance
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="trade-allowance"
                type="text"
                inputMode="decimal"
                value={formatCurrency(tradeAllowance, focusedField === 'trade-allowance')}
                onChange={(e) => handleCurrencyChange(e.target.value, setTradeAllowance)}
                onFocus={() => handleCurrencyFocus('trade-allowance')}
                onBlur={() => handleCurrencyBlur(tradeAllowance, setTradeAllowance, 'tradeAllowance', 'trade-allowance')}
                className="pl-7 font-mono text-lg"
                data-testid="input-trade-allowance"
              />
            </div>
          </div>

          {/* Trade-In Payoff */}
          <div className="space-y-2">
            <Label htmlFor="trade-payoff" className="text-sm font-medium">
              Trade-In Payoff
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="trade-payoff"
                type="text"
                inputMode="decimal"
                value={formatCurrency(tradePayoff, focusedField === 'trade-payoff')}
                onChange={(e) => handleCurrencyChange(e.target.value, setTradePayoff)}
                onFocus={() => handleCurrencyFocus('trade-payoff')}
                onBlur={() => handleCurrencyBlur(tradePayoff, setTradePayoff, 'tradePayoff', 'trade-payoff')}
                className="pl-7 font-mono text-lg"
                data-testid="input-trade-payoff"
              />
            </div>
          </div>

          {/* Trade Equity - Calculated */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Trade Equity</Label>
                {isPositiveEquity ? (
                  <TrendingUp className="w-4 h-4 text-green-600" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" aria-hidden="true" />
                )}
              </div>
              <div
                className={cn(
                  "text-2xl font-bold font-mono tabular-nums",
                  isPositiveEquity ? "text-green-600" : "text-destructive"
                )}
                data-testid="text-trade-equity"
              >
                {isPositiveEquity ? '+' : ''}{' '}
                ${tradeEquity.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tax & Fees */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tax & Fees</h3>
          <Badge variant="secondary" data-testid="badge-auto-calculated">
            Auto-calculated
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Total Tax */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Total Tax</Label>
            <div className="text-xl font-bold font-mono tabular-nums" data-testid="text-total-tax">
              ${calculations.totalTax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
          </div>

          {/* Total Fees */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Total Fees</Label>
            <div className="text-xl font-bold font-mono tabular-nums" data-testid="text-total-fees">
              ${calculations.totalFees.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
          </div>

          {/* Combined Total */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tax + Fees</Label>
              <div className="text-2xl font-bold font-mono tabular-nums text-primary" data-testid="text-tax-fees-total">
                ${calculations.totalTax.plus(calculations.totalFees).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Finance Terms */}
      <Card className="p-6 space-y-6">
        <h3 className="text-lg font-semibold">Finance Terms</h3>

        <div className="space-y-4">
          {/* APR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apr" className="text-sm font-medium">
                APR
              </Label>
              <span className="text-lg font-bold font-mono tabular-nums text-primary">
                {parseFloat(apr || '0').toFixed(2)}%
              </span>
            </div>
            <div className="relative">
              <Input
                id="apr"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="30"
                value={apr}
                onChange={(e) => handleAprChange(e.target.value)}
                onBlur={handleAprBlur}
                className="font-mono text-lg"
                data-testid="input-apr"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>

          {/* Term - Display only, controlled by Payment Hero */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Term</Label>
            <div className="text-xl font-bold font-mono tabular-nums" data-testid="text-term">
              {scenario.term} months
            </div>
            <p className="text-xs text-muted-foreground">
              Adjust term in Payment Hero above
            </p>
          </div>

          {/* Amount Financed - Calculated */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Amount Financed</Label>
              <div className="text-2xl font-bold font-mono tabular-nums text-primary" data-testid="text-amount-financed">
                ${calculations.amountFinanced.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Deal Summary */}
      <Card className="p-6 space-y-4 bg-primary/5 border-primary/20">
        <h3 className="text-lg font-semibold">Deal Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Selling Price</span>
            <span className="font-mono tabular-nums font-semibold" data-testid="text-summary-selling-price">
              ${calculations.sellingPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Down Payment</span>
            <span className="font-mono tabular-nums font-semibold" data-testid="text-summary-down-payment">
              -${calculations.downPayment.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trade Equity</span>
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                isPositiveEquity ? "text-green-600" : "text-destructive"
              )}
              data-testid="text-summary-trade-equity"
            >
              {isPositiveEquity ? '-' : '+'}${Math.abs(tradeEquity.toNumber()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tax + Fees</span>
            <span className="font-mono tabular-nums font-semibold" data-testid="text-summary-tax-fees">
              +${calculations.totalTax.plus(calculations.totalFees).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
          
          <div className="pt-3 border-t border-primary/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Amount to Finance</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-primary" data-testid="text-summary-amount-financed">
                ${calculations.amountFinanced.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
