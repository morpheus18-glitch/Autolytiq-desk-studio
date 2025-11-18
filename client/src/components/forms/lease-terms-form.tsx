import { useScenarioForm } from '@/contexts/scenario-form-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function LeaseTermsForm() {
  const { scenario, updateField, updateMultipleFields } = useScenarioForm();

  // Parse values safely
  const msrp = parseFloat(String((scenario as any).msrp || scenario.vehiclePrice || 0));
  const sellingPrice = parseFloat(String((scenario as any).sellingPrice || scenario.vehiclePrice || 0));
  const residualPercent = parseFloat(String(scenario.residualPercent || 60));
  const moneyFactor = parseFloat(String(scenario.moneyFactor || 0.00125));
  const term = scenario.term || 36;
  const acquisitionFee = parseFloat(String((scenario as any).acquisitionFee || 595));
  const acquisitionFeeCapitalized = (scenario as any).acquisitionFeeCapitalized !== false;
  const cashDown = parseFloat(String((scenario as any).cashDown || scenario.downPayment || 0));
  const manufacturerRebate = parseFloat(String((scenario as any).manufacturerRebate || 0));

  // Calculate residual value and APR equivalent
  const residualValue = msrp * (residualPercent / 100);
  const aprEquivalent = moneyFactor * 2400;

  return (
    <div className="space-y-6">
      {/* MSRP and Selling Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="msrp" className="flex items-center gap-1.5">
            MSRP
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Manufacturer's Suggested Retail Price. Residual value is calculated as a percentage of MSRP.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="msrp"
              type="number"
              value={msrp || ''}
              onChange={(e) => updateField('msrp' as any, parseFloat(e.target.value) || 0)}
              className="pl-7 tabular-nums"
              placeholder="35000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Selling Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="sellingPrice"
              type="number"
              value={sellingPrice || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                updateMultipleFields({
                  sellingPrice: value as any,
                  vehiclePrice: value.toString() as any,
                });
              }}
              className="pl-7 tabular-nums"
              placeholder="33500"
            />
          </div>
        </div>
      </div>

      {/* Term and Money Factor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="term">Term (Months)</Label>
          <Select
            value={String(term)}
            onValueChange={(value) => updateField('term', parseInt(value))}
          >
            <SelectTrigger id="term">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 months</SelectItem>
              <SelectItem value="27">27 months</SelectItem>
              <SelectItem value="30">30 months</SelectItem>
              <SelectItem value="33">33 months</SelectItem>
              <SelectItem value="36">36 months</SelectItem>
              <SelectItem value="39">39 months</SelectItem>
              <SelectItem value="42">42 months</SelectItem>
              <SelectItem value="48">48 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="moneyFactor" className="flex items-center gap-1.5">
            Money Factor
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Lease interest rate. Multiply by 2400 to get APR equivalent.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="moneyFactor"
            type="number"
            step="0.00001"
            value={moneyFactor || ''}
            onChange={(e) => updateField('moneyFactor', e.target.value)}
            className="tabular-nums"
            placeholder="0.00125"
          />
          <p className="text-xs text-muted-foreground">
            = {aprEquivalent.toFixed(2)}% APR
          </p>
        </div>
      </div>

      {/* Residual */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="residualPercent">Residual %</Label>
          <div className="relative">
            <Input
              id="residualPercent"
              type="number"
              step="1"
              value={residualPercent || ''}
              onChange={(e) => {
                const percent = parseFloat(e.target.value) || 0;
                const value = msrp * (percent / 100);
                updateMultipleFields({
                  residualPercent: percent.toString() as any,
                  residualValue: value.toString() as any,
                });
              }}
              className="pr-7 tabular-nums"
              placeholder="60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="residualValue">Residual Value</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="residualValue"
              type="number"
              value={residualValue.toFixed(0)}
              readOnly
              className="pl-7 tabular-nums bg-muted/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {residualPercent}% of MSRP
          </p>
        </div>
      </div>

      {/* Acquisition Fee */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <Label htmlFor="acquisitionFee" className="font-medium">Acquisition Fee</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="acqFeeCapitalized" className="text-xs text-muted-foreground">
              Capitalize
            </Label>
            <Switch
              id="acqFeeCapitalized"
              checked={acquisitionFeeCapitalized}
              onCheckedChange={(checked) => updateField('acquisitionFeeCapitalized' as any, checked)}
            />
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="acquisitionFee"
            type="number"
            value={acquisitionFee || ''}
            onChange={(e) => updateField('acquisitionFee' as any, parseFloat(e.target.value) || 0)}
            className="pl-7 tabular-nums"
            placeholder="595"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {acquisitionFeeCapitalized
            ? 'Rolled into lease (increases cap cost)'
            : 'Due at signing (upfront)'}
        </p>
      </Card>

      {/* Cap Cost Reductions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Cap Cost Reductions</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cashDown">Cash Down</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="cashDown"
                type="number"
                value={cashDown || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  updateMultipleFields({
                    cashDown: value as any,
                    downPayment: value.toString() as any,
                  });
                }}
                className="pl-7 tabular-nums"
                placeholder="3500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturerRebate">Rebates</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="manufacturerRebate"
                type="number"
                value={manufacturerRebate || ''}
                onChange={(e) => updateField('manufacturerRebate' as any, parseFloat(e.target.value) || 0)}
                className="pl-7 tabular-nums"
                placeholder="1000"
              />
            </div>
            <p className="text-xs text-muted-foreground">Non-taxable incentives</p>
          </div>
        </div>
      </div>
    </div>
  );
}
