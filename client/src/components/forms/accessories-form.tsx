import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyField } from '@/components/ui/currency-field';
import { formatCurrency } from '@/lib/pricing-utils';
import { Plus, Trash2, Package } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';

interface Accessory {
  name: string;
  amount: number;
  taxable: boolean;
}

const COMMON_ACCESSORIES = [
  { name: 'Floor Mats', amount: 149, taxable: true },
  { name: 'Mud Guards', amount: 89, taxable: true },
  { name: 'Cargo Tray', amount: 129, taxable: true },
  { name: 'Roof Rack', amount: 495, taxable: true },
  { name: 'Tonneau Cover', amount: 895, taxable: true },
];

export function AccessoriesForm() {
  const { scenario, updateField } = useScenarioForm();
  
  // Derive accessories from context (no local state)
  const accessories: Accessory[] = (scenario.accessories as Accessory[]) || [];

  const addAccessory = (template?: typeof COMMON_ACCESSORIES[0]) => {
    const newAccessory: Accessory = {
      name: template?.name || 'New Accessory',
      amount: template?.amount || 0,
      taxable: template?.taxable ?? true,
    };
    
    const updated = [...accessories, newAccessory];
    updateField('accessories', updated);
  };

  const removeAccessory = (index: number) => {
    const updated = accessories.filter((_, i) => i !== index);
    updateField('accessories', updated);
  };

  const updateAccessory = (index: number, field: keyof Accessory, value: any) => {
    const updated = [...accessories];
    updated[index] = { ...updated[index], [field]: value };
    updateField('accessories', updated);
  };

  const totalAccessories = accessories.reduce((sum, a) => sum + (a.amount ?? 0), 0);
  const taxableAccessories = accessories.filter(a => a.taxable).reduce((sum, a) => sum + (a.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Accessories</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addAccessory()}
          className="gap-2"
          data-testid="button-add-accessory"
        >
          <Plus className="w-4 h-4" />
          Add Accessory
        </Button>
      </div>

      {/* Quick Add Common Accessories */}
      <div className="flex flex-wrap gap-2">
        {COMMON_ACCESSORIES.map((accessory, index) => (
          <Button
            key={index}
            variant="secondary"
            size="sm"
            onClick={() => addAccessory(accessory)}
            className="text-xs"
            data-testid={`button-add-common-accessory-${index}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            {accessory.name}
          </Button>
        ))}
      </div>

      {/* Accessories List */}
      <div className="space-y-3">
        {accessories.map((accessory, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Accessory Name */}
                <div>
                  <Label htmlFor={`accessory-name-${index}`} className="text-xs">Accessory Name</Label>
                  <Input
                    id={`accessory-name-${index}`}
                    value={accessory.name}
                    onChange={(e) => updateAccessory(index, 'name', e.target.value)}
                    placeholder="Accessory name"
                    data-testid={`input-accessory-name-${index}`}
                  />
                </div>

                {/* Accessory Amount */}
                <div>
                  <CurrencyField
                    label="Amount"
                    value={accessory.amount ?? null}
                    onChange={(value) => updateAccessory(index, 'amount', value ?? 0)}
                    testId={`input-accessory-amount-${index}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {/* Taxable Checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`accessory-taxable-${index}`}
                    checked={accessory.taxable}
                    onCheckedChange={(checked) => updateAccessory(index, 'taxable', checked)}
                    data-testid={`checkbox-accessory-taxable-${index}`}
                  />
                  <Label htmlFor={`accessory-taxable-${index}`} className="text-sm cursor-pointer">
                    Taxable
                  </Label>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAccessory(index)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-remove-accessory-${index}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Totals Summary */}
      {accessories.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxable Accessories</span>
              <span className="font-mono tabular-nums">{formatCurrency(taxableAccessories)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Non-Taxable Accessories</span>
              <span className="font-mono tabular-nums">{formatCurrency(totalAccessories - taxableAccessories)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total Accessories</span>
              <span className="font-mono tabular-nums" data-testid="text-total-accessories">{formatCurrency(totalAccessories)}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
