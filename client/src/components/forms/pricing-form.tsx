import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { DollarSign } from 'lucide-react';

export function PricingForm() {
  const { scenario, updateField, calculations } = useScenarioForm();
  
  const handleCurrencyChange = (field: string, value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    updateField(field as any, cleaned);
  };
  
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Vehicle Price */}
      <div className="space-y-2">
        <Label htmlFor="vehiclePrice" className="text-sm font-medium">
          Vehicle Price
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="vehiclePrice"
            type="text"
            inputMode="decimal"
            value={formatCurrency(scenario.vehiclePrice)}
            onChange={(e) => handleCurrencyChange('vehiclePrice', e.target.value)}
            className="pl-9 font-mono tabular-nums min-h-11 text-base"
            data-testid="input-vehicle-price"
          />
        </div>
        <p className="text-xs text-muted-foreground">Base selling price of the vehicle</p>
      </div>
      
      {/* Down Payment */}
      <div className="space-y-2">
        <Label htmlFor="downPayment" className="text-sm font-medium">
          Down Payment
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="downPayment"
            type="text"
            inputMode="decimal"
            value={formatCurrency(scenario.downPayment)}
            onChange={(e) => handleCurrencyChange('downPayment', e.target.value)}
            className="pl-9 font-mono tabular-nums min-h-11 text-base"
            data-testid="input-down-payment"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Cash down: {calculations.downPayment.toFixed(2)}
        </p>
      </div>
      
      {/* Calculated Summary */}
      <div className="md:col-span-2 calc-surface p-3 md:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Selling Price</div>
            <div className="text-step-0 font-semibold" data-testid="text-selling-price" data-currency>
              ${calculations.sellingPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Down Payment</div>
            <div className="text-step-0 font-semibold" data-testid="text-down-payment" data-currency>
              ${calculations.downPayment.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Net After Down</div>
            <div className="text-step-0 font-semibold" data-currency>
              ${calculations.sellingPrice.minus(calculations.downPayment).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">To Finance</div>
            <div className="text-step-0 font-semibold text-primary" data-testid="text-amount-financed" data-currency>
              ${calculations.amountFinanced.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
