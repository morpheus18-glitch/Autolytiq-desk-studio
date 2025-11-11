import { useScenarioForm } from '@/contexts/scenario-form-context';
import { CurrencyField } from '@/components/ui/currency-field';
import { formatCurrency, parseScenarioNumber } from '@/lib/currency';

export function PricingForm() {
  const { scenario, updateField, calculations } = useScenarioForm();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Vehicle Price */}
      <div>
        <CurrencyField
          label="Vehicle Price"
          value={parseScenarioNumber(scenario.vehiclePrice)}
          onChange={(value) => updateField('vehiclePrice', value)}
          testId="input-vehicle-price"
        />
        <p className="text-xs text-muted-foreground mt-2">Base selling price of the vehicle</p>
      </div>
      
      {/* Down Payment */}
      <div>
        <CurrencyField
          label="Down Payment"
          value={parseScenarioNumber(scenario.downPayment)}
          onChange={(value) => updateField('downPayment', value)}
          testId="input-down-payment"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Cash down: {formatCurrency(calculations.downPayment.toNumber())}
        </p>
      </div>
      
      {/* Calculated Summary */}
      <div className="md:col-span-2 calc-surface p-3 md:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Selling Price</div>
            <div className="text-step-0 font-semibold font-mono tabular-nums" data-testid="text-selling-price" data-currency>
              {formatCurrency(calculations.sellingPrice.toNumber())}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Down Payment</div>
            <div className="text-step-0 font-semibold font-mono tabular-nums" data-testid="text-down-payment" data-currency>
              {formatCurrency(calculations.downPayment.toNumber())}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">Net After Down</div>
            <div className="text-step-0 font-semibold font-mono tabular-nums" data-currency>
              {formatCurrency(calculations.sellingPrice.minus(calculations.downPayment).toNumber())}
            </div>
          </div>
          <div>
            <div className="text-step--2 text-muted-foreground mb-1">To Finance</div>
            <div className="text-step-0 font-semibold font-mono tabular-nums text-primary" data-testid="text-amount-financed" data-currency>
              {formatCurrency(calculations.amountFinanced.toNumber())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
