import { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Car,
  User,
  ArrowLeft,
  MoreHorizontal,
  TrendingUp,
  Receipt,
  DollarSign,
  Calculator,
  Package,
  Calendar,
  Hash
} from 'lucide-react';
import { useStore } from '@/lib/store';
import type { DealWithRelations, DealScenario } from '@shared/schema';
import {
  DealHeaderSkeleton,
  PaymentCardSkeleton,
  FormSectionSkeleton,
  PremiumSkeleton
} from '@/components/skeletons';
import { DeskSection } from '@/components/desk-section';
import { PaymentCommandBar } from '@/components/payment-command-bar';
import { CapCostBreakdown } from '@/components/cap-cost-breakdown';
import { ScenarioCardV2, AddScenarioButton } from '@/components/scenario-card-v2';
import { DriveOffBreakdown } from '@/components/drive-off-breakdown';
import { LeaseCalculationReadonly, LeaseCalculationSummary } from '@/components/lease-calculation-readonly';
import { ScenarioFormProvider } from '@/contexts/scenario-form-context';
import { PricingForm } from '@/components/forms/pricing-form';
import { TradeForm } from '@/components/forms/trade-form';
import { FinanceLeaseForm } from '@/components/forms/finance-lease-form';
import { LeaseTermsForm } from '@/components/forms/lease-terms-form';
import { FIGrid } from '@/components/forms/fi-grid';
import { TaxBreakdownForm } from '@/components/forms/tax-breakdown-form';
import { DealerFeesForm } from '@/components/forms/dealer-fees-form';
import { VehicleSwitcher } from '@/components/vehicle-switcher';
import { CustomerSelectorSheet } from '@/components/customer-selector-sheet';
import { DealTypeSwitcherCompact } from '@/components/deal-type-switcher';
import { apiRequest, queryClient } from '@/lib/queryClient';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-0',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0',
  APPROVED: 'bg-green-100 text-green-800 border-0',
  CANCELLED: 'bg-red-100 text-red-800 border-0',
};

// Helper to get scenario values with defaults
function getScenarioValues(scenario: DealScenario | undefined) {
  if (!scenario) {
    return {
      monthlyPayment: 0,
      term: 36,
      dueAtSigning: 0,
      moneyFactor: 0,
      residualPercent: 0,
      aprEquivalent: 0,
      grossCapCost: 0,
      adjustedCapCost: 0,
      totalCapReductions: 0,
      depreciation: 0,
      monthlyDepreciationCharge: 0,
      monthlyRentCharge: 0,
      baseMonthlyPayment: 0,
      monthlyTax: 0,
      residualValue: 0,
      totalOfPayments: 0,
      cashDown: 0,
      tradeEquity: 0,
      manufacturerRebate: 0,
      driveOffBreakdown: {
        firstPayment: 0,
        cashDown: 0,
        acquisitionFee: 0,
        docFee: 0,
        upfrontFees: 0,
        upfrontTax: 0,
        securityDeposit: 0,
        otherCharges: 0,
      },
    };
  }

  // Parse numeric values
  const monthlyPayment = parseFloat(String(scenario.monthlyPayment || 0));
  const term = scenario.term || 36;
  const dueAtSigning = parseFloat(String(scenario.cashDueAtSigning || 0));
  const moneyFactor = parseFloat(String(scenario.moneyFactor || 0));
  const residualPercent = parseFloat(String(scenario.residualPercent || 0));
  const residualValue = parseFloat(String(scenario.residualValue || 0));
  const grossCapCost = parseFloat(String((scenario as any).grossCapCost || 0));
  const adjustedCapCost = parseFloat(String((scenario as any).adjustedCapCost || 0));
  const totalCapReductions = parseFloat(String((scenario as any).totalCapReductions || 0));
  const depreciation = parseFloat(String((scenario as any).depreciation || 0));
  const monthlyDepreciationCharge = parseFloat(String((scenario as any).monthlyDepreciationCharge || 0));
  const monthlyRentCharge = parseFloat(String((scenario as any).monthlyRentCharge || 0));
  const baseMonthlyPayment = parseFloat(String((scenario as any).baseMonthlyPayment || 0));
  const monthlyTax = parseFloat(String((scenario as any).monthlyTax || 0));
  const totalOfPayments = parseFloat(String((scenario as any).totalOfPayments || 0));
  const cashDown = parseFloat(String((scenario as any).cashDown || scenario.downPayment || 0));
  const tradeAllowance = parseFloat(String(scenario.tradeAllowance || 0));
  const tradePayoff = parseFloat(String(scenario.tradePayoff || 0));
  const tradeEquity = tradeAllowance - tradePayoff;
  const manufacturerRebate = parseFloat(String((scenario as any).manufacturerRebate || 0));

  // Drive-off breakdown
  const driveOffBreakdown = (scenario as any).driveOffBreakdown || {
    firstPayment: monthlyPayment,
    cashDown: cashDown,
    acquisitionFee: 0,
    docFee: 0,
    upfrontFees: 0,
    upfrontTax: 0,
    securityDeposit: 0,
    otherCharges: 0,
  };

  return {
    monthlyPayment,
    term,
    dueAtSigning,
    moneyFactor,
    residualPercent,
    aprEquivalent: moneyFactor * 2400,
    grossCapCost,
    adjustedCapCost,
    totalCapReductions,
    depreciation,
    monthlyDepreciationCharge,
    monthlyRentCharge,
    baseMonthlyPayment,
    monthlyTax,
    residualValue,
    totalOfPayments,
    cashDown,
    tradeEquity,
    manufacturerRebate,
    driveOffBreakdown,
  };
}

export default function DealWorksheetV3() {
  const [, params] = useRoute('/deals/:id');
  const [, setLocation] = useLocation();
  const dealId = params?.id;
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const [vehicleSwitcherOpen, setVehicleSwitcherOpen] = useState(false);
  const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
  const setActiveDealId = useStore(state => state.setActiveDealId);
  const { toast } = useToast();

  // Refs for scrolling to sections
  const termsRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
  });

  // Fetch tax rate based on customer's zip code
  const customerZip = deal?.customer?.zipCode;
  const { data: taxData } = useQuery<{
    zipCode: string;
    effectiveTaxRate: number;
    localTaxRate: number;
    stateTaxRate: number;
  }>({
    queryKey: ['/api/tax/zip', customerZip],
    enabled: !!customerZip,
  });

  useEffect(() => {
    if (dealId) {
      setActiveDealId(dealId);
    }
    return () => setActiveDealId(null);
  }, [dealId, setActiveDealId]);

  useEffect(() => {
    if (deal?.scenarios && deal.scenarios.length > 0 && !activeScenarioId) {
      setActiveScenarioId(deal.scenarios[0].id);
    }
  }, [deal, activeScenarioId]);

  // Mutation to update scenario type
  const { mutate: updateScenarioType } = useMutation({
    mutationFn: async (newType: string) => {
      if (!dealId || !activeScenarioId) return;
      return apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${activeScenarioId}`, {
        scenarioType: newType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
    },
  });

  const handleDealTypeChange = (newType: 'FINANCE_DEAL' | 'LEASE_DEAL' | 'CASH_DEAL') => {
    updateScenarioType(newType);
  };

  // Mutation to create new scenario
  const { mutate: createScenario, isPending: isCreatingScenario } = useMutation({
    mutationFn: async () => {
      if (!dealId || !deal) return;
      const baseScenario = deal.scenarios[0] || {};
      return apiRequest('POST', `/api/deals/${dealId}/scenarios`, {
        dealId,
        scenarioType: baseScenario.scenarioType || 'FINANCE_DEAL',
        name: `Scenario ${deal.scenarios.length + 1}`,
        vehiclePrice: String(baseScenario.vehiclePrice || '0'),
        downPayment: String(baseScenario.downPayment || '0'),
        apr: String(baseScenario.apr ?? '5.99'),
        term: baseScenario.term || 60,
        moneyFactor: String(baseScenario.moneyFactor || '0.00125'),
        residualValue: '0',
        residualPercent: '0',
        tradeAllowance: String(baseScenario.tradeAllowance || '0'),
        tradePayoff: String(baseScenario.tradePayoff || '0'),
        dealerFees: [],
        accessories: [],
        aftermarketProducts: [],
        totalTax: '0',
        totalFees: '0',
        amountFinanced: '0',
        monthlyPayment: '0',
        totalCost: '0',
        cashDueAtSigning: '0',
      }).then(res => res.json());
    },
    onSuccess: (newScenario) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      if (newScenario?.id) {
        setActiveScenarioId(newScenario.id);
      }
      toast({
        title: 'Scenario created',
        description: 'New payment scenario is ready to configure.',
      });
    },
    onError: () => {
      toast({
        title: 'Creation failed',
        description: 'Failed to create scenario. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to update deal state (submit)
  const { mutate: updateDealState, isPending: isSubmitting } = useMutation({
    mutationFn: async (newState: string) => {
      if (!dealId) return;
      return apiRequest('PATCH', `/api/deals/${dealId}/state`, { state: newState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Deal submitted',
        description: 'Deal has been moved to In Progress.',
      });
    },
    onError: () => {
      toast({
        title: 'Submit failed',
        description: 'Failed to submit deal. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handler functions for command bar
  const handleEditTerms = () => {
    termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = () => {
    if (deal?.dealState === 'DRAFT') {
      updateDealState('IN_PROGRESS');
    } else if (deal?.dealState === 'IN_PROGRESS') {
      updateDealState('APPROVED');
    }
  };

  const handleAddScenario = () => {
    createScenario();
  };

  // Loading state
  if (isLoading || !deal) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3">
            <DealHeaderSkeleton />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1800px] mx-auto px-3 md:px-6 py-3 md:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3 md:gap-6">
              <div className="space-y-3 md:space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <PremiumSkeleton className="h-6 w-32" />
                    <FormSectionSkeleton />
                  </div>
                ))}
              </div>
              <div className="hidden lg:block sticky top-[200px] self-start space-y-6">
                <PaymentCardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeScenario = deal.scenarios.find(s => s.id === activeScenarioId) || deal.scenarios[0];

  // Handle missing scenarios
  if (!activeScenario || deal.scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No scenarios found</h2>
          <p className="text-muted-foreground">This deal doesn't have any scenarios yet.</p>
          <Button onClick={() => setLocation('/deals')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
        </div>
      </div>
    );
  }

  const scenarioValues = getScenarioValues(activeScenario);
  const isLease = activeScenario.scenarioType === 'LEASE_DEAL';
  // Use dynamic tax rate from customer's zip code, fallback to 9.5% if not available
  const taxRate = taxData?.effectiveTaxRate ?? 0.095;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Navigation & Identity */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/deals')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold font-mono truncate">
                    {deal.dealNumber || "New Deal"}
                  </h1>
                  <Badge className={DEAL_STATE_COLORS[deal.dealState]}>
                    {deal.dealState.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <button
                    onClick={() => setCustomerSelectorOpen(true)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    {deal.customer
                      ? `${deal.customer.firstName} ${deal.customer.lastName}`
                      : "Select Customer"}
                  </button>
                  <button
                    onClick={() => setVehicleSwitcherOpen(true)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Car className="w-3.5 h-3.5" />
                    {deal.vehicle
                      ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                      : "Select Vehicle"}
                  </button>
                  {deal.vehicle?.stockNumber && (
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {deal.vehicle.stockNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(deal.createdAt).toLocaleDateString()}
                  </span>
                  {deal.salesperson && (
                    <span className="text-xs px-2 py-0.5 bg-muted rounded">
                      {deal.salesperson.fullName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Deal Type & Actions */}
            <div className="flex items-center gap-2">
              <DealTypeSwitcherCompact
                value={activeScenario.scenarioType as any}
                onChange={handleDealTypeChange}
              />
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ========== PAYMENT COMMAND BAR ========== */}
      <PaymentCommandBar
        monthlyPayment={scenarioValues.monthlyPayment}
        term={scenarioValues.term}
        dueAtSigning={scenarioValues.dueAtSigning}
        moneyFactor={isLease ? scenarioValues.moneyFactor : undefined}
        aprEquivalent={scenarioValues.aprEquivalent}
        residualPercent={isLease ? scenarioValues.residualPercent : undefined}
        dealType={activeScenario.scenarioType as any}
        onEditTerms={handleEditTerms}
        onAddProducts={handleAddProducts}
        onChangeVehicle={() => setVehicleSwitcherOpen(true)}
        onSubmit={handleSubmit}
      />

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1">
        <div className="max-w-[1800px] mx-auto px-3 md:px-6 py-3 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3 md:gap-6">
            {/* LEFT COLUMN - Deal Structure */}
            <ScenarioFormProvider dealId={dealId!} scenario={activeScenario}>
              <div className="space-y-3 md:space-y-4">
                {/* Vehicle Price */}
                <DeskSection
                  title="Vehicle Price"
                  icon={Car}
                  summary={`$${parseFloat(String(activeScenario.vehiclePrice || 0)).toLocaleString()}`}
                  defaultExpanded
                >
                  <PricingForm />
                </DeskSection>

                {/* Trade-In */}
                <DeskSection
                  title="Trade-In"
                  icon={TrendingUp}
                  summary={
                    scenarioValues.tradeEquity >= 0
                      ? `$${scenarioValues.tradeEquity.toLocaleString()} equity`
                      : `($${Math.abs(scenarioValues.tradeEquity).toLocaleString()}) negative`
                  }
                >
                  <TradeForm />
                </DeskSection>

                {/* Cap Cost Calculation (Lease Only) - Hidden on mobile */}
                {isLease && (
                  <div className="hidden md:block">
                    <DeskSection
                      title="Cap Cost Calculation"
                      icon={Calculator}
                      summary={`Adj. Cap: $${scenarioValues.adjustedCapCost.toLocaleString()}`}
                      alwaysExpanded
                    >
                      <CapCostBreakdown
                        grossCapCost={scenarioValues.grossCapCost}
                        totalCapReductions={scenarioValues.totalCapReductions}
                        adjustedCapCost={scenarioValues.adjustedCapCost}
                        cashDown={scenarioValues.cashDown}
                        tradeEquity={scenarioValues.tradeEquity}
                        manufacturerRebate={scenarioValues.manufacturerRebate}
                      />
                    </DeskSection>
                  </div>
                )}

                {/* Fees & Charges */}
                <DeskSection
                  title="Fees & Charges"
                  icon={Receipt}
                >
                  <DealerFeesForm />
                </DeskSection>

                {/* Taxes */}
                <DeskSection
                  title="Taxes"
                  icon={DollarSign}
                >
                  <TaxBreakdownForm />
                </DeskSection>

                {/* Lease Calculation Breakdown (Lease Only) - Hidden on mobile */}
                {isLease && (
                  <div className="hidden md:block">
                    <DeskSection
                      title="Lease Calculation Breakdown"
                      icon={Calculator}
                      alwaysExpanded
                    >
                      <LeaseCalculationReadonly
                        residualValue={scenarioValues.residualValue}
                        residualPercent={scenarioValues.residualPercent}
                        depreciation={scenarioValues.depreciation}
                        monthlyDepreciationCharge={scenarioValues.monthlyDepreciationCharge}
                        monthlyRentCharge={scenarioValues.monthlyRentCharge}
                        baseMonthlyPayment={scenarioValues.baseMonthlyPayment}
                        monthlyTax={scenarioValues.monthlyTax}
                        moneyFactor={scenarioValues.moneyFactor}
                        taxRate={taxRate}
                      />
                    </DeskSection>
                  </div>
                )}

                {/* Lease Terms (Lease Only) */}
                {isLease && (
                  <div ref={termsRef}>
                    <DeskSection
                      title="Lease Terms"
                      icon={Calculator}
                      defaultExpanded
                    >
                      <LeaseTermsForm />
                    </DeskSection>
                  </div>
                )}

                {/* Finance Terms (Finance Only) */}
                {!isLease && (
                  <div ref={termsRef}>
                    <DeskSection
                      title="Finance Terms"
                      icon={Calculator}
                      defaultExpanded
                    >
                      <FinanceLeaseForm />
                    </DeskSection>
                  </div>
                )}

                {/* F&I Products */}
                <div ref={productsRef}>
                  <DeskSection
                    title="F&I Products"
                    icon={Package}
                  >
                    <FIGrid />
                  </DeskSection>
                </div>
              </div>
            </ScenarioFormProvider>

            {/* RIGHT COLUMN - Scenarios & Summary */}
            <div className="space-y-3 md:space-y-4 lg:sticky lg:top-[200px] lg:self-start">
              {/* Scenario Strip */}
              <Card className="p-3 md:p-4">
                <h3 className="text-xs md:text-sm font-semibold mb-2 md:mb-3 uppercase tracking-wide text-muted-foreground">
                  Payment Scenarios
                </h3>
                <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2">
                  {deal.scenarios.map(scenario => (
                    <ScenarioCardV2
                      key={scenario.id}
                      name={scenario.name}
                      monthlyPayment={parseFloat(String(scenario.monthlyPayment || 0))}
                      term={scenario.term || 36}
                      dueAtSigning={parseFloat(String(scenario.cashDueAtSigning || 0))}
                      cashDown={parseFloat(String((scenario as any).cashDown || scenario.downPayment || 0))}
                      isActive={scenario.id === activeScenarioId}
                      onClick={() => setActiveScenarioId(scenario.id)}
                    />
                  ))}
                  <AddScenarioButton onClick={handleAddScenario} />
                </div>
              </Card>

              {/* Drive-Off Breakdown */}
              <DriveOffBreakdown
                firstPayment={scenarioValues.driveOffBreakdown.firstPayment || scenarioValues.monthlyPayment}
                cashDown={scenarioValues.driveOffBreakdown.cashDown || scenarioValues.cashDown}
                acquisitionFee={scenarioValues.driveOffBreakdown.acquisitionFee}
                docFee={scenarioValues.driveOffBreakdown.docFee}
                upfrontFees={scenarioValues.driveOffBreakdown.upfrontFees}
                upfrontTax={scenarioValues.driveOffBreakdown.upfrontTax}
                securityDeposit={scenarioValues.driveOffBreakdown.securityDeposit}
                otherCharges={scenarioValues.driveOffBreakdown.otherCharges}
                total={scenarioValues.dueAtSigning}
              />

              {/* Deal Summary */}
              <LeaseCalculationSummary
                baseMonthlyPayment={scenarioValues.baseMonthlyPayment}
                monthlyTax={scenarioValues.monthlyTax}
                totalMonthlyPayment={scenarioValues.monthlyPayment}
                term={scenarioValues.term}
                totalOfPayments={scenarioValues.totalOfPayments}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VehicleSwitcher
        open={vehicleSwitcherOpen}
        onOpenChange={setVehicleSwitcherOpen}
        dealId={dealId!}
        scenarioId={activeScenarioId}
        currentVehicleId={deal.vehicle?.id}
      />
      <CustomerSelectorSheet
        open={customerSelectorOpen}
        onOpenChange={setCustomerSelectorOpen}
        dealId={dealId!}
        currentCustomerId={deal.customer?.id}
      />
    </div>
  );
}
