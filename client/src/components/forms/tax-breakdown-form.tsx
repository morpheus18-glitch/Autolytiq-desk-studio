import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, MapPin, Info } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { TaxJurisdictionSelector } from '@/components/tax-jurisdiction-selector';
import type { TaxJurisdiction } from '@shared/schema';
import Decimal from 'decimal.js';

export function TaxBreakdownForm() {
  const { scenario, updateField, calculations } = useScenarioForm();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<TaxJurisdiction | null>(null);

  const { data: jurisdictions } = useQuery<TaxJurisdiction[]>({
    queryKey: ['/api/tax-jurisdictions'],
  });

  useEffect(() => {
    if (jurisdictions && scenario.taxJurisdictionId) {
      const jurisdiction = jurisdictions.find(j => j.id === scenario.taxJurisdictionId);
      setSelectedJurisdiction(jurisdiction || null);
    }
  }, [jurisdictions, scenario.taxJurisdictionId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (num * 100).toFixed(4) + '%';
  };

  const handleJurisdictionChange = (jurisdiction: TaxJurisdiction | null) => {
    setSelectedJurisdiction(jurisdiction);
    updateField('taxJurisdictionId', jurisdiction?.id || null);
  };

  // Calculate taxable amount: vehicle price - trade allowance + taxable fees + taxable accessories
  const calculateTaxableAmount = () => {
    const vehiclePrice = new Decimal(scenario.vehiclePrice || 0);
    const tradeAllowance = new Decimal(scenario.tradeAllowance || 0);
    
    // Taxable dealer fees
    const dealerFees = (scenario.dealerFees || []) as Array<{ amount: number; taxable: boolean }>;
    const taxableFees = dealerFees
      .filter(f => f.taxable)
      .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
    
    // Taxable accessories
    const accessories = (scenario.accessories || []) as Array<{ amount: number; taxable: boolean }>;
    const taxableAccessories = accessories
      .filter(a => a.taxable)
      .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
    
    const taxableAmount = vehiclePrice
      .minus(tradeAllowance)
      .plus(taxableFees)
      .plus(taxableAccessories);
    
    return taxableAmount.greaterThan(0) ? taxableAmount.toNumber() : 0;
  };

  const taxableAmount = calculateTaxableAmount();

  return (
    <div className="space-y-4">
      {/* Tax Jurisdiction Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax Jurisdiction</h3>
        </div>
        <TaxJurisdictionSelector
          selectedJurisdictionId={scenario.taxJurisdictionId || undefined}
          onSelect={handleJurisdictionChange}
        />
      </div>

      <Separator />

      {/* Tax Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax Breakdown</h3>
        </div>

        <Card className="p-4">
          <div className="space-y-3">
            {/* Taxable Amount */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Taxable Amount</span>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="font-mono font-medium tabular-nums" data-testid="text-taxable-amount">
                {formatCurrency(taxableAmount)}
              </span>
            </div>

            <Separator />

            {/* Tax Rates */}
            {selectedJurisdiction ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">State Tax Rate</span>
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {formatPercent(selectedJurisdiction.stateTaxRate || 0)}
                  </Badge>
                </div>

                {parseFloat(selectedJurisdiction.countyTaxRate as string || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">County Tax Rate</span>
                    <Badge variant="outline" className="font-mono text-xs tabular-nums">
                      {formatPercent(selectedJurisdiction.countyTaxRate || 0)}
                    </Badge>
                  </div>
                )}

                {parseFloat(selectedJurisdiction.cityTaxRate as string || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">City Tax Rate</span>
                    <Badge variant="outline" className="font-mono text-xs tabular-nums">
                      {formatPercent(selectedJurisdiction.cityTaxRate || 0)}
                    </Badge>
                  </div>
                )}

                {parseFloat(selectedJurisdiction.townshipTaxRate as string || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Township Tax Rate</span>
                    <Badge variant="outline" className="font-mono text-xs tabular-nums">
                      {formatPercent(selectedJurisdiction.townshipTaxRate || 0)}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-md text-center text-sm text-muted-foreground">
                Select a tax jurisdiction above to view detailed rate breakdown
              </div>
            )}

            <Separator />

            {/* Total Tax */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold">Total Sales Tax</span>
              <span className="text-lg font-mono font-bold tabular-nums" data-testid="text-total-tax">
                {formatCurrency(calculations.totalTax.toNumber())}
              </span>
            </div>

            <Separator />

            {/* Total Fees */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Dealer Fees</span>
              <span className="font-mono font-medium tabular-nums" data-testid="text-total-fees-summary">
                {formatCurrency(calculations.totalFees.toNumber())}
              </span>
            </div>

            <Separator />

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold">Tax + Fees Total</span>
              <span className="text-xl font-mono font-bold tabular-nums text-primary" data-testid="text-tax-fees-total">
                {formatCurrency(calculations.totalTax.plus(calculations.totalFees).toNumber())}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
