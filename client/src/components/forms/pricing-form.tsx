import { useScenarioForm } from '@/contexts/scenario-form-context';
import { CurrencyField } from '@/components/ui/currency-field';
import { formatCurrency } from '@/lib/pricing-utils';
import { parseScenarioNumber } from '@/lib/currency';

export function PricingForm() {
  const { scenario, updateField, calculations } = useScenarioForm();

  // Calculate adjusted selling price
  const msrp = parseScenarioNumber(scenario.msrp);
  const vehiclePrice = parseScenarioNumber(scenario.vehiclePrice);
  const manufacturerRebate = parseScenarioNumber((scenario as any).manufacturerRebate);
  const otherIncentives = parseScenarioNumber((scenario as any).otherIncentives);
  const adjustedSellingPrice = (vehiclePrice || 0) - (manufacturerRebate || 0) - (otherIncentives || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* MSRP */}
        <div>
          <CurrencyField
            label="MSRP"
            value={msrp}
            onChange={(value) => updateField('msrp', value)}
            testId="input-msrp"
          />
          <p className="text-xs text-muted-foreground mt-2">Manufacturer's suggested retail price</p>
        </div>

        {/* Selling Price */}
        <div>
          <CurrencyField
            label="Selling Price"
            value={vehiclePrice}
            onChange={(value) => updateField('vehiclePrice', value)}
            testId="input-vehicle-price"
          />
          <p className="text-xs text-muted-foreground mt-2">Negotiated price of the vehicle</p>
        </div>

        {/* Manufacturer Rebate */}
        <div>
          <CurrencyField
            label="Manufacturer Rebate"
            value={manufacturerRebate}
            onChange={(value) => updateField('manufacturerRebate', value)}
            testId="input-manufacturer-rebate"
          />
          <p className="text-xs text-muted-foreground mt-2">Non-taxable rebate from manufacturer</p>
        </div>

        {/* Other Incentives */}
        <div>
          <CurrencyField
            label="Other Incentives"
            value={otherIncentives}
            onChange={(value) => updateField('otherIncentives', value)}
            testId="input-other-incentives"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Additional non-taxable incentives
          </p>
        </div>
      </div>

      {/* Adjusted Selling Price - Read Only */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Adjusted Selling Price</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatCurrency(adjustedSellingPrice)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Selling price minus rebates and incentives
        </p>
      </div>
    </div>
  );
}
