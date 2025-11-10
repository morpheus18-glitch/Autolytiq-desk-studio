import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, MapPin, Info } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { StateTaxSelector } from '@/components/state-tax-selector';
import { TaxBreakdown } from '@/components/tax-breakdown';
import { calculateDealTax, type TaxCalculationResult } from '@/lib/tax-calculator';
import { apiRequest } from '@/lib/queryClient';
import type { TaxJurisdiction } from '@shared/schema';
import Decimal from 'decimal.js';

export function TaxBreakdownForm() {
  const { scenario, tradeVehicle, updateField, updateMultipleFields, calculations } = useScenarioForm();
  const [stateCode, setStateCode] = useState<string>(scenario.taxState || '');
  const [zipCode, setZipCode] = useState<string>(scenario.taxZipCode || '');
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null);
  
  // Calculate tax using the API
  const { mutate: calculateTax, isPending: isCalculating } = useMutation({
    mutationFn: async (params: any) => {
      return apiRequest('POST', '/api/tax/calculate', params);
    },
    onSuccess: (data: TaxCalculationResult) => {
      setTaxResult(data);
      // Update scenario with calculated tax values
      updateMultipleFields({
        totalTax: data.totalTax.toString(),
        totalFees: data.totalFees.toString(),
      });
    },
  });
  
  // Recalculate tax when relevant fields change
  useEffect(() => {
    if (stateCode && scenario.vehiclePrice) {
      const params = {
        vehiclePrice: Number(scenario.vehiclePrice),
        stateCode,
        zipCode: zipCode || undefined,
        tradeValue: Number(scenario.tradeAllowance) || undefined,
        tradePayoff: Number(scenario.tradePayoff) || undefined,
        docFee: Number(scenario.docFee) || undefined,
        dealerFees: Number(scenario.dealerFees) || undefined,
        aftermarketProducts: Number(scenario.aftermarketTotal) || undefined,
        warrantyAmount: Number(scenario.warrantyAmount) || undefined,
        gapInsurance: Number(scenario.gapInsurance) || undefined,
        maintenanceAmount: Number(scenario.maintenanceAmount) || undefined,
        accessoriesAmount: Number(scenario.accessoriesAmount) || undefined,
        rebates: Number(scenario.rebates) || undefined,
        dealerDiscount: Number(scenario.dealerDiscount) || undefined,
        fuelType: scenario.fuelType as any || 'gasoline',
        vehicleType: scenario.vehicleCondition as any || 'new',
      };
      
      calculateTax(params);
    }
  }, [
    stateCode,
    zipCode,
    scenario.vehiclePrice,
    scenario.tradeAllowance,
    scenario.tradePayoff,
    scenario.docFee,
    scenario.dealerFees,
    scenario.aftermarketTotal,
    scenario.warrantyAmount,
    scenario.gapInsurance,
    scenario.maintenanceAmount,
    scenario.accessoriesAmount,
    scenario.rebates,
    scenario.dealerDiscount,
    calculateTax
  ]);

  const handleStateChange = (newState: string) => {
    setStateCode(newState);
    updateField('taxState', newState);
  };

  const handleZipCodeChange = (newZipCode: string) => {
    setZipCode(newZipCode);
    updateField('taxZipCode', newZipCode);
  };

  return (
    <div className="space-y-4">
      {/* State Tax Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax Jurisdiction</h3>
        </div>
        <StateTaxSelector
          value={stateCode}
          onValueChange={handleStateChange}
          zipCode={zipCode}
          onZipCodeChange={handleZipCodeChange}
          showDetails={true}
          disabled={isCalculating}
        />
      </div>

      <Separator />

      {/* Tax Breakdown Display */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax & Fees Calculation</h3>
        </div>
        
        <TaxBreakdown
          taxResult={taxResult}
          loading={isCalculating}
          showDetails={true}
        />
      </div>
    </div>
  );
}
