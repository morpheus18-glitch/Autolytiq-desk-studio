import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, MapPin, Info, Check, AlertCircle } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { StateTaxSelector } from '@/components/state-tax-selector';
import { TaxBreakdown } from '@/components/tax-breakdown';
import { PriorTaxPaid, type PriorTaxInfo } from '@/components/prior-tax-paid';
import { useTaxCalculation, useLeaseCalculationMethod, type TaxCalculationParams } from '@/hooks/use-tax-calculation';
import { extractAftermarketValues } from '@shared/utils/aftermarket-parser';
import type { Customer } from '@shared/schema';
import Decimal from 'decimal.js';

export function TaxBreakdownForm({ customer }: { customer?: Customer | null }) {
  const { scenario, tradeVehicle, updateField, updateMultipleFields } = useScenarioForm();

  // Auto-populate state and zip from customer data
  const [stateCode, setStateCode] = useState<string>(customer?.state || '');
  const [zipCode, setZipCode] = useState<string>(customer?.zipCode || '');
  const [autoPopulated, setAutoPopulated] = useState(false);

  // Prior tax paid (for reciprocity)
  const [priorTaxInfo, setPriorTaxInfo] = useState<PriorTaxInfo | null>(
    scenario.originTaxState && scenario.originTaxAmount
      ? {
          originState: scenario.originTaxState,
          amount: Number(scenario.originTaxAmount),
          paidDate: scenario.originTaxPaidDate
            ? new Date(scenario.originTaxPaidDate).toISOString().split('T')[0]
            : undefined,
        }
      : null
  );

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
  const isLease = scenario.scenarioType === 'LEASE_DEAL';

  // Build tax calculation params from scenario
  const taxParams: TaxCalculationParams = useMemo(() => {
    // Get vehicle price
    const vehiclePrice = Number(scenario.vehiclePrice) || 0;

    // Get trade-in values (use allowance from schema)
    const tradeValue = tradeVehicle?.allowance
      ? Number(tradeVehicle.allowance)
      : 0;
    const tradePayoff = Number(scenario.tradePayoff) || 0;

    // Extract aftermarket products using parser
    const aftermarket = extractAftermarketValues(scenario.aftermarketProducts);

    // Build params object
    const params: TaxCalculationParams = {
      vehiclePrice,
      stateCode,
      zipCode: zipCode || undefined,
      dealType: isLease ? 'LEASE' : 'RETAIL',
      registrationState: scenario.registrationState || stateCode,

      // Trade-in
      tradeValue: tradeValue > 0 ? tradeValue : undefined,
      tradePayoff: tradePayoff > 0 ? tradePayoff : undefined,

      // Fees (use dealerFees as doc fee if available)
      docFee: Number(scenario.dealerFees) || 0,

      // Products (extracted from aftermarketProducts)
      warrantyAmount: aftermarket.warrantyAmount,
      gapInsurance: aftermarket.gapInsurance,
      maintenanceAmount: aftermarket.maintenanceAmount,
      accessoriesAmount: aftermarket.accessoriesAmount,

      // Vehicle type
      vehicleType: 'used', // TODO: Get from vehicle data

      // Lease-specific fields
      ...(isLease && {
        grossCapCost: vehiclePrice,
        capReductionCash: 0, // TODO: Extract from scenario
        basePayment: Number(scenario.monthlyPayment) || 0,
        paymentCount: Number(scenario.term) || 36,
      }),

      // Prior tax paid (reciprocity)
      ...(priorTaxInfo && {
        originTaxState: priorTaxInfo.originState,
        originTaxAmount: priorTaxInfo.amount,
        originTaxPaidDate: priorTaxInfo.paidDate,
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
    scenario.aftermarketProducts,
    tradeVehicle?.allowance,
    stateCode,
    zipCode,
    isLease,
    priorTaxInfo,
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

  // Extract aftermarket for display
  const aftermarketExtracted = useMemo(() => {
    return extractAftermarketValues(scenario.aftermarketProducts);
  }, [scenario.aftermarketProducts]);

  // Update scenario when tax result changes
  useEffect(() => {
    if (taxResult && !isCalculating) {
      updateMultipleFields({
        totalTax: new Decimal(taxResult.totalTax).toFixed(2),
        totalFees: new Decimal(taxResult.totalFees).toFixed(2),
      });
    }
  }, [taxResult, isCalculating, updateMultipleFields]);

  // Update scenario when prior tax info changes
  useEffect(() => {
    updateMultipleFields({
      originTaxState: priorTaxInfo?.originState || null,
      originTaxAmount: priorTaxInfo?.amount
        ? new Decimal(priorTaxInfo.amount).toFixed(2)
        : null,
      originTaxPaidDate: priorTaxInfo?.paidDate
        ? new Date(priorTaxInfo.paidDate)
        : null,
    });
  }, [priorTaxInfo, updateMultipleFields]);

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

      {/* Prior Tax Paid Section */}
      {stateCode && (
        <div>
          <PriorTaxPaid
            value={priorTaxInfo}
            onChange={setPriorTaxInfo}
            currentState={stateCode}
            disabled={isCalculating}
          />
        </div>
      )}

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
