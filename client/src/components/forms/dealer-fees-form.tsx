import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, DollarSign, Receipt } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';

interface DealerFee {
  name: string;
  amount: number;
  taxable: boolean;
}

const COMMON_FEES = [
  { name: 'Documentation Fee', amount: 299, taxable: false },
  { name: 'Registration Fee', amount: 150, taxable: false },
  { name: 'Title Fee', amount: 75, taxable: false },
  { name: 'Dealer Prep', amount: 495, taxable: true },
];

export function DealerFeesForm() {
  const { scenario, updateField } = useScenarioForm();
  
  // Derive fees from context (no local state)
  const fees: DealerFee[] = (scenario.dealerFees as DealerFee[]) || [];

  const addFee = (template?: typeof COMMON_FEES[0]) => {
    const newFee: DealerFee = {
      name: template?.name || 'New Fee',
      amount: template?.amount || 0,
      taxable: template?.taxable ?? true,
    };
    
    const updated = [...fees, newFee];
    updateField('dealerFees', updated);
  };

  const removeFee = (index: number) => {
    const updated = fees.filter((_, i) => i !== index);
    updateField('dealerFees', updated);
  };

  const updateFee = (index: number, field: keyof DealerFee, value: any) => {
    const updated = [...fees];
    updated[index] = { ...updated[index], [field]: value };
    updateField('dealerFees', updated);
  };

  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const taxableFees = fees.filter(f => f.taxable).reduce((sum, f) => sum + f.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Dealer Fees</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addFee()}
          className="gap-2"
          data-testid="button-add-fee"
        >
          <Plus className="w-4 h-4" />
          Add Fee
        </Button>
      </div>

      {/* Quick Add Common Fees */}
      <div className="flex flex-wrap gap-2">
        {COMMON_FEES.map((fee, index) => (
          <Button
            key={index}
            variant="secondary"
            size="sm"
            onClick={() => addFee(fee)}
            className="text-xs"
            data-testid={`button-add-common-fee-${index}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            {fee.name}
          </Button>
        ))}
      </div>

      {/* Fees List */}
      <div className="space-y-3">
        {fees.map((fee, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Fee Name */}
                <div>
                  <Label htmlFor={`fee-name-${index}`} className="text-xs">Fee Name</Label>
                  <Input
                    id={`fee-name-${index}`}
                    value={fee.name}
                    onChange={(e) => updateFee(index, 'name', e.target.value)}
                    placeholder="Fee name"
                    data-testid={`input-fee-name-${index}`}
                  />
                </div>

                {/* Fee Amount */}
                <div>
                  <Label htmlFor={`fee-amount-${index}`} className="text-xs">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id={`fee-amount-${index}`}
                      type="number"
                      step="0.01"
                      value={fee.amount}
                      onChange={(e) => updateFee(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="pl-10 font-mono"
                      data-testid={`input-fee-amount-${index}`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                {/* Taxable Checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`fee-taxable-${index}`}
                    checked={fee.taxable}
                    onCheckedChange={(checked) => updateFee(index, 'taxable', checked)}
                    data-testid={`checkbox-fee-taxable-${index}`}
                  />
                  <Label htmlFor={`fee-taxable-${index}`} className="text-sm cursor-pointer">
                    Taxable
                  </Label>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFee(index)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-remove-fee-${index}`}
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
      {fees.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxable Fees</span>
              <span className="font-mono tabular-nums">{formatCurrency(taxableFees)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Non-Taxable Fees</span>
              <span className="font-mono tabular-nums">{formatCurrency(totalFees - taxableFees)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total Fees</span>
              <span className="font-mono tabular-nums" data-testid="text-total-fees">{formatCurrency(totalFees)}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
