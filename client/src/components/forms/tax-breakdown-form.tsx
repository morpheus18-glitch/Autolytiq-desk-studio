import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, MapPin, Info, Check, AlertCircle } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { StateTaxSelector } from '@/components/state-tax-selector';
import { TaxBreakdown } from '@/components/tax-breakdown';
import { useTaxCalculation, useLeaseCalculationMethod, type TaxCalculationParams } from '@/hooks/use-tax-calculation';
import type { Customer } from '@shared/schema';
import Decimal from 'decimal.js';

export function TaxBreakdownForm({ customer }: { customer?: Customer | null }) {
  const { scenario, tradeVehicle, updateField, updateMultipleFields } = useScenarioForm();

  // Auto-populate state and zip from customer data
  const [stateCode, setStateCode] = useState<string>(customer?.state || '');
  const [zipCode, setZipCode] = useState<string>(customer?.zipCode || '');
  const [autoPopulated, setAutoPopulated] = useState(false);

  // Auto-populate when customer address is entered
  useEffect(() => {
    if (customer?.state && !stateCode) {
      setStateCode(customer.state);
      setAutoPopulated(true);
    }
    if (customer?.zipCode && !zipCode) {
      setZipCode(customer.zipCode);
      setAutoPopulated(true);
    }
  }, [customer?.state, customer?.zipCode]);

  // Get lease calculation method for this state
  const { leaseMethod, methodDescription, hasSpecialScheme, isLoading: isLoadingStateRules } =
    useLeaseCalculationMethod(stateCode);

  // Determine if this is a lease deal
  const isLease = scenario.scenarioType === 'LEASE';

  // Build tax calculation params from scenario
  const taxParams: TaxCalculationParams = useMemo(() => {
    // Get vehicle price
    const vehiclePrice = Number(scenario.vehiclePrice) || 0;

    // Get trade-in values
    const tradeValue = tradeVehicle?.estimatedValue
      ? Number(tradeVehicle.estimatedValue)
      : 0;
    const tradePayoff = Number(scenario.tradePayoff) || 0;

    // Build params object
    const params: TaxCalculationParams = {
      vehiclePrice,
      stateCode,
      zipCode: zipCode || undefined,
      dealType: isLease ? 'LEASE' : 'RETAIL',
      registrationState: stateCode,

      // Trade-in
      tradeValue: tradeValue > 0 ? tradeValue : undefined,
      tradePayoff: tradePayoff > 0 ? tradePayoff : undefined,

      // Fees (use dealerFees as doc fee if available)
      docFee: Number(scenario.dealerFees) || 0,

      // Products (from aftermarketProducts object)
      warrantyAmount: 0, // TODO: Extract from aftermarketProducts
      gapInsurance: 0, // TODO: Extract from aftermarketProducts
      maintenanceAmount: 0, // TODO: Extract from aftermarketProducts
      accessoriesAmount: 0, // TODO: Extract from aftermarketProducts

      // Vehicle type
      vehicleType: 'used', // TODO: Get from vehicle data

      // Lease-specific fields
      ...(isLease && {
        grossCapCost: vehiclePrice,
        capReductionCash: 0, // TODO: Extract from scenario
        basePayment: Number(scenario.monthlyPayment) || 0,
        paymentCount: Number(scenario.term) || 36,
      }),
    };

    return params;
  }, [
    scenario.vehiclePrice,
    scenario.scenarioType,
    scenario.tradePayoff,
    scenario.dealerFees,
    scenario.monthlyPayment,
    scenario.term,
    tradeVehicle?.estimatedValue,
    stateCode,
    zipCode,
    isLease,
  ]);

  // Use tax calculation hook with auto-calculation
  const {
    taxResult,
    isCalculating,
    isError,
    canCalculate,
  } = useTaxCalculation(taxParams, {
    enabled: true,
    autoCalculate: true, // Auto-trigger when params change
    debounceMs: 800, // Wait 800ms after last change
  });

  // Update scenario when tax result changes
  useEffect(() => {
    if (taxResult && !isCalculating) {
      updateMultipleFields({
        salesTax: new Decimal(taxResult.totalTax).toFixed(2),
        // Note: We don't update totalTax/totalFees as they might not exist in schema
      });
    }
  }, [taxResult, isCalculating, updateMultipleFields]);

  const handleStateChange = (newState: string) => {
    setStateCode(newState);
    setAutoPopulated(false);
  };

  const handleZipCodeChange = (newZipCode: string) => {
    setZipCode(newZipCode);
    setAutoPopulated(false);
  };

  return (
    <div className="space-y-4">
      {/* State Tax Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax Jurisdiction</h3>
          {/* Show indicator when auto-populated from customer */}
          {autoPopulated && customer && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Check className="w-3 h-3" />
              From customer
            </Badge>
          )}
        </div>
        <StateTaxSelector
          value={stateCode}
          onValueChange={handleStateChange}
          zipCode={zipCode}
          onZipCodeChange={handleZipCodeChange}
          showDetails={true}
          disabled={isCalculating}
        />

        {/* Show lease calculation method for lease deals */}
        {isLease && stateCode && !isLoadingStateRules && (
          <Card className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {stateCode} Lease Tax Method: {leaseMethod}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {methodDescription}
                </p>
                {hasSpecialScheme && (
                  <Badge variant="outline" className="mt-2 text-xs border-blue-300 dark:border-blue-700">
                    Special tax scheme applies
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Show error if calculation fails */}
        {isError && (
          <Card className="mt-3 p-3 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Tax Calculation Error
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Unable to calculate taxes. Please check the entered values and try again.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Show message if cannot calculate */}
        {!canCalculate && stateCode && (
          <Card className="mt-3 p-3 bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  Enter vehicle price to calculate taxes
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Separator />

      {/* Tax Breakdown Display */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Tax & Fees Calculation</h3>
          {isLease && (
            <Badge variant="outline" className="text-xs">
              Lease
            </Badge>
          )}
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
