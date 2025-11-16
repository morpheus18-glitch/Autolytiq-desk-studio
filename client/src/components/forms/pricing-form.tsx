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
          Cash customer will pay upfront
        </p>
      </div>
    </div>
  );
}
