import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calculator, Plus, Trash2, DollarSign, Search, TrendingUp } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useStore } from '@/lib/store';
import { debounce } from 'lodash';
import Decimal from 'decimal.js';
import type { DealScenario, TradeVehicle, DealerFee, Accessory, TaxJurisdictionWithRules, AftermarketProduct, Deal } from '@shared/schema';
import { calculateFinancePayment, calculateLeasePayment, calculateSalesTax, moneyFactorToAPR, aprToMoneyFactor } from '@/lib/calculations';
import { LenderRateShop } from './lender-rate-shop';
import { useToast } from '@/hooks/use-toast';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

interface ScenarioCalculatorProps {
  scenario: DealScenario;
  dealId: string;
  tradeVehicle: TradeVehicle | null;
  customerZipCode?: string | null;
}

export function ScenarioCalculator({ scenario, dealId, tradeVehicle, customerZipCode }: ScenarioCalculatorProps) {
  const { setIsSaving, setLastSaved, setSaveError } = useStore();
  const { toast } = useToast();
  const [formData, setFormData] = useState(scenario);
  const [selectedTaxJurisdiction, setSelectedTaxJurisdiction] = useState<TaxJurisdictionWithRules | null>(null);
  const [showRateShop, setShowRateShop] = useState(false);
  
  // Parse JSONB fields
  const dealerFees: DealerFee[] = Array.isArray(formData.dealerFees) ? formData.dealerFees : [];
  const accessories: Accessory[] = Array.isArray(formData.accessories) ? formData.accessories : [];
  const aftermarketProducts: AftermarketProduct[] = Array.isArray(formData.aftermarketProducts) ? formData.aftermarketProducts : [];
  
  // Fetch the tax jurisdiction for this scenario with rule groups
  const { data: jurisdictions } = useQuery<TaxJurisdictionWithRules[]>({
    queryKey: ['/api/tax-jurisdictions'],
  });
  
  // Set the selected jurisdiction when the data loads
  useEffect(() => {
    if (jurisdictions && formData.taxJurisdictionId) {
      const jurisdiction = jurisdictions.find(j => j.id === formData.taxJurisdictionId);
      setSelectedTaxJurisdiction(jurisdiction || null);
    }
  }, [jurisdictions, formData.taxJurisdictionId]);
  
  const updateScenarioMutation = useMutation({
    mutationFn: async (data: Partial<DealScenario>) => {
      // Exclude timestamp fields and ID fields from update
      const { id, createdAt, updatedAt, dealId: _, ...updateData } = data;
      return await apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${scenario.id}`, updateData);
    },
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
    },
    onError: (error: any) => {
      setSaveError(error.message || 'Failed to save');
    },
  });
  
  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce((data: Partial<DealScenario>) => {
      updateScenarioMutation.mutate(data);
    }, 500),
    [updateScenarioMutation]
  );
  
  // Calculate totals whenever formData changes
  useEffect(() => {
    // Use tax jurisdiction rates if available, otherwise use defaults
    const stateTaxRate = selectedTaxJurisdiction 
      ? parseFloat(selectedTaxJurisdiction.stateTaxRate as any) 
      : 0.0725;
    const countyTaxRate = selectedTaxJurisdiction 
      ? parseFloat(selectedTaxJurisdiction.countyTaxRate as any) 
      : 0.0025;
    const cityTaxRate = selectedTaxJurisdiction 
      ? parseFloat(selectedTaxJurisdiction.cityTaxRate as any) 
      : 0;
    const townshipTaxRate = selectedTaxJurisdiction 
      ? parseFloat(selectedTaxJurisdiction.townshipTaxRate as any) 
      : 0;
    const specialDistrictTaxRate = selectedTaxJurisdiction 
      ? parseFloat(selectedTaxJurisdiction.specialDistrictTaxRate as any) 
      : 0;
    // Get trade-in credit type from tax rule group (with fallback)
    const tradeInCreditType = selectedTaxJurisdiction?.taxRuleGroup?.tradeInCreditType || 'tax_on_difference';
    
    // Calculate tax on everything that's taxable
    const taxCalc = calculateSalesTax({
      vehiclePrice: parseFloat(formData.vehiclePrice as any) || 0,
      tradeAllowance: parseFloat(formData.tradeAllowance as any) || 0,
      dealerFees: [
        ...dealerFees.map(f => ({ amount: f.amount, taxable: f.taxable })),
        ...accessories.map(a => ({ amount: a.amount, taxable: a.taxable })),
        ...aftermarketProducts.map(p => ({ amount: p.price, taxable: p.taxable }))
      ],
      accessories: [],
      stateTaxRate,
      countyTaxRate,
      cityTaxRate,
      townshipTaxRate,
      specialDistrictTaxRate,
      tradeInCreditType,
    });
    
    // Total fees = dealer fees + accessories + ALL aftermarket products
    const totalFees = dealerFees.reduce((sum, f) => sum.plus(f.amount), new Decimal(0))
      .plus(accessories.reduce((sum, a) => sum.plus(a.amount), new Decimal(0)))
      .plus(aftermarketProducts.reduce((sum, p) => sum.plus(p.price), new Decimal(0)))
      .toNumber();
    
    let monthlyPayment = 0;
    let amountFinanced = 0;
    let totalCost = 0;
    let cashDueAtSigning = 0;
    
    if (formData.scenarioType === 'FINANCE_DEAL') {
      // Amount Financed = Vehicle Price + Tax + Fees + Trade Payoff - Down Payment - Trade Allowance
      const result = calculateFinancePayment({
        vehiclePrice: parseFloat(formData.vehiclePrice as any) || 0,
        downPayment: parseFloat(formData.downPayment as any) || 0,
        tradeAllowance: parseFloat(formData.tradeAllowance as any) || 0,
        tradePayoff: parseFloat(formData.tradePayoff as any) || 0,
        apr: parseFloat(formData.apr as any) || 0,
        term: formData.term || 0,
        totalTax: taxCalc,
        totalFees,
      });
      monthlyPayment = result.monthlyPayment;
      amountFinanced = result.amountFinanced;
      totalCost = result.totalCost;
      cashDueAtSigning = parseFloat(formData.downPayment as any) || 0;
    } else if (formData.scenarioType === 'LEASE_DEAL') {
      const result = calculateLeasePayment({
        vehiclePrice: parseFloat(formData.vehiclePrice as any) || 0,
        downPayment: parseFloat(formData.downPayment as any) || 0,
        tradeAllowance: parseFloat(formData.tradeAllowance as any) || 0,
        tradePayoff: parseFloat(formData.tradePayoff as any) || 0,
        moneyFactor: parseFloat(formData.moneyFactor as any) || 0,
        term: formData.term || 0,
        residualValue: parseFloat(formData.residualValue as any) || 0,
        totalTax: taxCalc,
        totalFees,
      });
      monthlyPayment = result.monthlyPayment;
      amountFinanced = result.amountFinanced;
      totalCost = result.totalCost;
      cashDueAtSigning = parseFloat(formData.downPayment as any) || 0;
    } else {
      // Cash deal: Total = Vehicle + Tax + Fees - Trade Allowance + Trade Payoff
      // (Trade payoff is added because it's an amount the customer owes on their trade)
      const vehiclePrice = new Decimal(formData.vehiclePrice || 0);
      const tradeAllowance = new Decimal(formData.tradeAllowance || 0);
      const tradePayoff = new Decimal(formData.tradePayoff || 0);
      totalCost = vehiclePrice
        .plus(taxCalc)
        .plus(totalFees)
        .minus(tradeAllowance)
        .plus(tradePayoff)
        .toNumber();
      cashDueAtSigning = totalCost;
    }
    
    const updatedData = {
      ...formData,
      totalTax: taxCalc.toString(),
      totalFees: totalFees.toString(),
      monthlyPayment: monthlyPayment.toString(),
      amountFinanced: amountFinanced.toString(),
      totalCost: totalCost.toString(),
      cashDueAtSigning: cashDueAtSigning.toString(),
    };
    
    setFormData(updatedData);
    debouncedSave(updatedData);
  }, [
    formData.vehiclePrice,
    formData.downPayment,
    formData.tradeAllowance,
    formData.tradePayoff,
    formData.apr,
    formData.term,
    formData.moneyFactor,
    formData.residualValue,
    formData.dealerFees,
    formData.accessories,
    formData.aftermarketProducts,
    selectedTaxJurisdiction,
  ]);
  
  const handleFieldChange = (field: keyof DealScenario, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleTaxJurisdictionChange = (jurisdiction: TaxJurisdiction | null) => {
    setSelectedTaxJurisdiction(jurisdiction);
    const updatedData = {
      ...formData,
      taxJurisdictionId: jurisdiction?.id || null,
    };
    setFormData(updatedData);
    debouncedSave(updatedData);
  };
  
  const addDealerFee = () => {
    const newFees = [...dealerFees, { name: 'Doc Fee', amount: 0, taxable: true }];
    handleFieldChange('dealerFees', newFees);
  };
  
  const removeDealerFee = (index: number) => {
    const newFees = dealerFees.filter((_, i) => i !== index);
    handleFieldChange('dealerFees', newFees);
  };
  
  const updateDealerFee = (index: number, field: keyof DealerFee, value: any) => {
    const newFees = [...dealerFees];
    newFees[index] = { ...newFees[index], [field]: value };
    handleFieldChange('dealerFees', newFees);
  };
  
  const addAccessory = () => {
    const newAccessories = [...accessories, { name: 'Accessory', amount: 0, taxable: true }];
    handleFieldChange('accessories', newAccessories);
  };
  
  const removeAccessory = (index: number) => {
    const newAccessories = accessories.filter((_, i) => i !== index);
    handleFieldChange('accessories', newAccessories);
  };
  
  const updateAccessory = (index: number, field: keyof Accessory, value: any) => {
    const newAccessories = [...accessories];
    newAccessories[index] = { ...newAccessories[index], [field]: value };
    handleFieldChange('accessories', newAccessories);
  };
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Monthly Payment
          </div>
          <div className="text-3xl font-mono font-semibold tabular-nums" data-testid="text-monthly-payment">
            ${parseFloat(formData.monthlyPayment as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Amount Financed
          </div>
          <div className="text-3xl font-mono font-semibold tabular-nums" data-testid="text-amount-financed">
            ${parseFloat(formData.amountFinanced as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Total Cost
          </div>
          <div className="text-3xl font-mono font-semibold tabular-nums" data-testid="text-total-cost">
            ${parseFloat(formData.totalCost as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>
      
      {/* Main Form */}
      <Card className="p-6">
        <Tabs defaultValue="pricing">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="pricing">Pricing & Terms</TabsTrigger>
            <TabsTrigger value="fees">Fees & Accessories</TabsTrigger>
            <TabsTrigger value="amortization">Payment Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pricing" className="space-y-6">
            {/* Vehicle Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Vehicle Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle-price">Vehicle Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="vehicle-price"
                      type="number"
                      step="0.01"
                      value={formData.vehiclePrice}
                      onChange={(e) => handleFieldChange('vehiclePrice', e.target.value)}
                      className="pl-10 font-mono"
                      data-testid="input-vehicle-price"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="down-payment">Down Payment</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="down-payment"
                      type="number"
                      step="0.01"
                      value={formData.downPayment}
                      onChange={(e) => handleFieldChange('downPayment', e.target.value)}
                      className="pl-10 font-mono"
                      data-testid="input-down-payment"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tax Jurisdiction Selector */}
            <div>
              <TaxJurisdictionSelector
                selectedJurisdictionId={formData.taxJurisdictionId || undefined}
                initialZipCode={customerZipCode || undefined}
                onSelect={handleTaxJurisdictionChange}
              />
            </div>
            
            {/* Trade-In */}
            {tradeVehicle && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Trade-In Vehicle</h3>
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <div className="font-medium">
                    {tradeVehicle.year} {tradeVehicle.make} {tradeVehicle.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tradeVehicle.mileage.toLocaleString()} miles • VIN: {tradeVehicle.vin}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trade-allowance">Trade Allowance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="trade-allowance"
                        type="number"
                        step="0.01"
                        value={formData.tradeAllowance}
                        onChange={(e) => handleFieldChange('tradeAllowance', e.target.value)}
                        className="pl-10 font-mono"
                        data-testid="input-trade-allowance"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="trade-payoff">Trade Payoff</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="trade-payoff"
                        type="number"
                        step="0.01"
                        value={formData.tradePayoff}
                        onChange={(e) => handleFieldChange('tradePayoff', e.target.value)}
                        className="pl-10 font-mono"
                        data-testid="input-trade-payoff"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center p-3 bg-background rounded border">
                  <span className="text-sm font-medium">Net Trade Equity</span>
                  <span className={`font-mono font-semibold ${parseFloat(formData.tradeAllowance as any) - parseFloat(formData.tradePayoff as any) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ${(parseFloat(formData.tradeAllowance as any) - parseFloat(formData.tradePayoff as any)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
            
            {/* Finance/Lease Terms */}
            {formData.scenarioType !== 'CASH_DEAL' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {formData.scenarioType === 'FINANCE_DEAL' ? 'Finance' : 'Lease'} Terms
                  </h3>
                  {formData.scenarioType === 'FINANCE_DEAL' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRateShop(true)}
                      className="gap-2"
                      data-testid="button-shop-rates"
                    >
                      <Search className="w-4 h-4" />
                      Shop Rates
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {formData.scenarioType === 'FINANCE_DEAL' ? (
                    <>
                      <div>
                        <Label htmlFor="apr">APR (%)</Label>
                        <Input
                          id="apr"
                          type="number"
                          step="0.01"
                          value={formData.apr}
                          onChange={(e) => handleFieldChange('apr', e.target.value)}
                          className="font-mono"
                          data-testid="input-apr"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="term">Term (months)</Label>
                        <Input
                          id="term"
                          type="number"
                          value={formData.term}
                          onChange={(e) => handleFieldChange('term', parseInt(e.target.value) || 0)}
                          className="font-mono"
                          data-testid="input-term"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="money-factor">Money Factor</Label>
                        <Input
                          id="money-factor"
                          type="number"
                          step="0.000001"
                          value={formData.moneyFactor}
                          onChange={(e) => handleFieldChange('moneyFactor', e.target.value)}
                          className="font-mono"
                          data-testid="input-money-factor"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Equivalent APR: {moneyFactorToAPR(parseFloat(formData.moneyFactor as any) || 0).toFixed(2)}%
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="lease-term">Term (months)</Label>
                        <Input
                          id="lease-term"
                          type="number"
                          value={formData.term}
                          onChange={(e) => handleFieldChange('term', parseInt(e.target.value) || 0)}
                          className="font-mono"
                          data-testid="input-lease-term"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="residual-value">Residual Value</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="residual-value"
                            type="number"
                            step="0.01"
                            value={formData.residualValue}
                            onChange={(e) => handleFieldChange('residualValue', e.target.value)}
                            className="pl-10 font-mono"
                            data-testid="input-residual-value"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="residual-percent">Residual %</Label>
                        <Input
                          id="residual-percent"
                          type="number"
                          step="0.01"
                          value={formData.residualPercent}
                          onChange={(e) => handleFieldChange('residualPercent', e.target.value)}
                          className="font-mono"
                          data-testid="input-residual-percent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="fees" className="space-y-6">
            {/* Dealer Fees */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Dealer Fees</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addDealerFee}
                  className="gap-2"
                  data-testid="button-add-fee"
                >
                  <Plus className="w-4 h-4" />
                  Add Fee
                </Button>
              </div>
              
              <div className="space-y-3">
                {dealerFees.map((fee, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Input
                      placeholder="Fee name"
                      value={fee.name}
                      onChange={(e) => updateDealerFee(index, 'name', e.target.value)}
                      className="flex-1"
                      data-testid={`input-fee-name-${index}`}
                    />
                    <div className="relative w-40">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        value={fee.amount}
                        onChange={(e) => updateDealerFee(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="pl-10 font-mono"
                        data-testid={`input-fee-amount-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDealerFee(index)}
                      data-testid={`button-remove-fee-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Accessories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Accessories</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addAccessory}
                  className="gap-2"
                  data-testid="button-add-accessory"
                >
                  <Plus className="w-4 h-4" />
                  Add Accessory
                </Button>
              </div>
              
              <div className="space-y-3">
                {accessories.map((accessory, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Input
                      placeholder="Accessory name"
                      value={accessory.name}
                      onChange={(e) => updateAccessory(index, 'name', e.target.value)}
                      className="flex-1"
                      data-testid={`input-accessory-name-${index}`}
                    />
                    <div className="relative w-40">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        value={accessory.amount}
                        onChange={(e) => updateAccessory(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="pl-10 font-mono"
                        data-testid={`input-accessory-amount-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccessory(index)}
                      data-testid={`button-remove-accessory-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Tax Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Taxable Amount</span>
                <span className="font-mono text-sm">
                  ${(parseFloat(formData.vehiclePrice as any) - parseFloat(formData.tradeAllowance as any)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sales Tax (7.5%)</span>
                <span className="font-mono text-sm">
                  ${parseFloat(formData.totalTax as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Fees</span>
                <span className="font-mono text-sm">
                  ${parseFloat(formData.totalFees as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="amortization">
            {formData.scenarioType === 'FINANCE_DEAL' && parseFloat(formData.amountFinanced as any) > 0 ? (
              <AmortizationTable
                principal={parseFloat(formData.amountFinanced as any)}
                apr={parseFloat(formData.apr as any)}
                term={formData.term || 0}
              />
            ) : formData.scenarioType === 'LEASE_DEAL' ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Lease payment schedules show fixed monthly payments.</p>
                <p className="text-sm mt-2">
                  Monthly Payment: ${parseFloat(formData.monthlyPayment as any).toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                  × {formData.term} months
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payment schedule for cash deals</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
      
      {/* Rate Shopping Dialog */}
      <Dialog open={showRateShop} onOpenChange={setShowRateShop}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shop Competitive Rates</DialogTitle>
            <DialogDescription>
              Compare financing options from multiple lenders in real-time
            </DialogDescription>
          </DialogHeader>
          
          {/* Get customer credit score - for now using a placeholder */}
          <LenderRateShop
            dealId={dealId}
            scenarioId={scenario.id}
            creditScore={700} // In production, get from customer record
            vehiclePrice={parseFloat(formData.vehiclePrice as any) || 0}
            downPayment={parseFloat(formData.downPayment as any) || 0}
            tradeValue={parseFloat(formData.tradeAllowance as any) || 0}
            tradePayoff={parseFloat(formData.tradePayoff as any) || 0}
            term={formData.term || 60}
            vehicleType="used"
            monthlyIncome={5000} // Placeholder - get from customer
            monthlyDebt={1500} // Placeholder - get from customer
            state="CA"
            onSelectRate={(offer) => {
              // Update the scenario with the selected rate
              handleFieldChange('apr', offer.apr);
              handleFieldChange('term', offer.term);
              
              // Calculate new payment with the selected rate
              const newPayment = calculateFinancePayment({
                vehiclePrice: parseFloat(formData.vehiclePrice as any) || 0,
                downPayment: parseFloat(formData.downPayment as any) || 0,
                tradeAllowance: parseFloat(formData.tradeAllowance as any) || 0,
                tradePayoff: parseFloat(formData.tradePayoff as any) || 0,
                apr: parseFloat(offer.apr),
                term: offer.term,
                dealerFees: dealerFees.map(f => ({ amount: f.amount, taxable: f.taxable })),
                accessories: accessories.map(a => ({ amount: a.amount, taxable: a.taxable })),
                tax: parseFloat(formData.totalTax as any) || 0,
              });
              
              // Update the form data
              setFormData({
                ...formData,
                apr: offer.apr,
                term: offer.term,
                monthlyPayment: newPayment.monthlyPayment.toFixed(2),
                amountFinanced: newPayment.amountFinanced.toFixed(2),
              });
              
              // Show success message
              toast({
                title: 'Rate Applied',
                description: `${offer.lenderName} rate of ${offer.apr}% APR has been applied to the scenario.`,
              });
              
              // Close the dialog
              setShowRateShop(false);
            }}
            onClose={() => setShowRateShop(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
