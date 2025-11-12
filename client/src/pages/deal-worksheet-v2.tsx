import { useEffect, useState } from 'react';
import { useRoute, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, User, History, Printer, FileText, DollarSign, Calculator, Receipt, TrendingUp, ArrowLeft, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { DealWithRelations, DealScenario } from '@shared/schema';
import { 
  DealHeaderSkeleton, 
  PaymentCardSkeleton, 
  FormSectionSkeleton, 
  ScenarioCardSkeleton,
  PremiumSkeleton 
} from '@/components/skeletons';
import { LayoutShell } from '@/components/layout-shell';
import { SectionHeader } from '@/components/section-header';
import { PaymentSummaryPanel } from '@/components/payment-summary-panel';
import { DeskSection } from '@/components/desk-section';
import { ScenarioFormProvider, useScenarioForm } from '@/contexts/scenario-form-context';
import { DealWorksheetProvider, useDealWorksheet } from '@/contexts/deal-worksheet-context';
import { PricingForm } from '@/components/forms/pricing-form';
import { TradeForm } from '@/components/forms/trade-form';
import { FinanceLeaseForm } from '@/components/forms/finance-lease-form';
import { FIGrid } from '@/components/forms/fi-grid';
import { TaxBreakdownForm } from '@/components/forms/tax-breakdown-form';
import { DealerFeesForm } from '@/components/forms/dealer-fees-form';
import { AccessoriesForm } from '@/components/forms/accessories-form';
import { ScenarioSelector } from '@/components/scenario-selector';
import { FeePackageSelector } from '@/components/fee-package-selector';
import { DealWorkflowControls } from '@/components/deal-workflow-controls';
import { MobilePaymentSheet } from '@/components/mobile-payment-sheet';
import { MobileActionButton } from '@/components/mobile-action-button';
import { VehicleSwitcher } from '@/components/vehicle-switcher';
import { CustomerSelectorSheet } from '@/components/customer-selector-sheet';
import { TradeGarageSheet } from '@/components/trade-garage-sheet';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-0 shadow-md rounded-full',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0 shadow-md rounded-full',
  APPROVED: 'bg-green-100 text-green-800 border-0 shadow-md rounded-full',
  CANCELLED: 'bg-red-100 text-red-800 border-0 shadow-md rounded-full',
};

// Wrapper component that handles routing and provides context
export default function DealWorksheetV2() {
  // Detect which route we're on
  const [matchNew] = useRoute('/deals/new');
  const [matchExisting, params] = useRoute('/deals/:id');
  const searchString = useSearch();
  
  // Parse route params
  const dealId = params?.id;
  const isNewDeal = matchNew;
  
  // Parse query params
  const searchParams = new URLSearchParams(searchString || '');
  const mode = (searchParams.get('mode') as 'quick' | 'full') || 'full';
  const vehicleId = searchParams.get('vehicleId') || undefined;
  const customerId = searchParams.get('customerId') || undefined;
  
  return (
    <DealWorksheetProvider
      dealId={dealId}
      initialMode={mode}
      vehicleId={vehicleId}
      customerId={customerId}
    >
      <DealWorksheetContent />
    </DealWorksheetProvider>
  );
}

// Main worksheet content component
function DealWorksheetContent() {
  const { deal, draftDeal, isNew, isLoading, mode, setMode } = useDealWorksheet();
  const [, setLocation] = useLocation();
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const [vehicleSwitcherOpen, setVehicleSwitcherOpen] = useState(false);
  const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
  const setActiveDealId = useStore(state => state.setActiveDealId);
  
  useEffect(() => {
    if (deal?.id) {
      setActiveDealId(deal.id);
    }
    return () => setActiveDealId(null);
  }, [deal?.id, setActiveDealId]);
  
  useEffect(() => {
    if (deal?.scenarios && deal.scenarios.length > 0 && !activeScenarioId) {
      setActiveScenarioId(deal.scenarios[0].id);
    }
  }, [deal, activeScenarioId]);
  
  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-4">
            <DealHeaderSkeleton />
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 md:gap-8">
              {/* Main Content */}
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <PremiumSkeleton className="h-6 w-32" />
                    <FormSectionSkeleton />
                  </div>
                ))}
              </div>
              
              {/* Sidebar Skeleton - Desktop Only */}
              <div className="hidden lg:block sticky top-[73px] self-start space-y-6">
                <PaymentCardSkeleton />
                <div className="space-y-3">
                  <PremiumSkeleton className="h-5 w-28" />
                  <ScenarioCardSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // For new deals, we may not have a persisted deal yet
  // For existing deals, we should have a deal by now
  if (!isNew && !deal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Deal not found</h2>
          <p className="text-muted-foreground">This deal could not be loaded.</p>
          <Button onClick={() => setLocation('/deals')} data-testid="button-back-to-deals">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
        </div>
      </div>
    );
  }
  
  // Get active scenario (existing deals only)
  const activeScenario = deal?.scenarios?.find(s => s.id === activeScenarioId) || deal?.scenarios?.[0];
  
  const header = (
    <div className="flex items-start md:items-center justify-between gap-3 md:gap-4">
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/deals')}
          className="shrink-0"
          data-testid="button-back-to-deals"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl lg:text-2xl font-semibold font-mono tracking-tight">{deal.dealNumber}</h1>
            <Badge className={DEAL_STATE_COLORS[deal.dealState]} data-testid="badge-deal-state">
              {deal.dealState.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 mt-1.5 text-xs md:text-sm text-muted-foreground">
            {deal.customer ? (
              <span className="font-medium">{deal.customer.firstName} {deal.customer.lastName}</span>
            ) : (
              <Badge variant="outline" className="text-xs" data-testid="badge-no-customer">
                No Customer Selected
              </Badge>
            )}
            {deal.vehicle ? (
              <>
                <span className="hidden sm:inline text-border">•</span>
                <span className="sm:contents w-full sm:w-auto">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</span>
                <span className="hidden sm:inline text-border">•</span>
                <span className="font-mono">#{deal.vehicle.stockNumber}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline text-border">•</span>
                <Badge variant="outline" className="text-xs" data-testid="badge-no-vehicle">
                  No Vehicle Selected
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" data-testid="button-history">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
        <Button variant="outline" size="sm" data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button variant="default" size="sm" data-testid="button-export">
          <FileText className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
  
  // Desktop Summary - Full view with scenario selector
  const SummaryDesktop = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Payment Summary
          </h3>
          <PaymentSummaryPanel variant="full" />
        </div>
        
        {/* Scenario Selector - Desktop Only */}
        <ScenarioSelector
          dealId={deal.id}
          scenarios={deal.scenarios}
          activeScenarioId={activeScenarioId}
          onScenarioChange={setActiveScenarioId}
        />
      </div>
    );
  };
  
  return (
    <ScenarioFormProvider 
      scenario={activeScenario} 
      tradeVehicle={deal.tradeVehicle || null}
      dealId={deal.id}
    >
      <LayoutShell 
        header={header} 
        summaryDesktop={<SummaryDesktop />}
        mobileSummary={
          <MobilePaymentSheet
            dealId={deal.id}
            scenarios={deal.scenarios}
            activeScenarioId={activeScenarioId}
            onScenarioChange={setActiveScenarioId}
          />
        }
      >
        {/* Workflow Controls */}
        <DealWorkflowControls deal={deal} activeScenarioId={activeScenarioId} />
        
        {/* Mobile: Collapsible Sections */}
        <div className="lg:hidden space-y-4">
          <DeskSection title="Customer Information" icon={User} alwaysExpanded>
            {deal.customer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">Name</div>
                    <div className="font-medium text-sm">{deal.customer.firstName} {deal.customer.lastName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">Phone</div>
                    <div className="font-medium font-mono text-sm">{deal.customer.phone || 'N/A'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground mb-1.5">Email</div>
                    <div className="font-medium text-sm break-all">{deal.customer.email || 'N/A'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No customer selected for this deal</p>
                <Button 
                  variant="outline"
                  onClick={() => setCustomerSelectorOpen(true)}
                  data-testid="button-select-customer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Select Customer
                </Button>
              </div>
            )}
          </DeskSection>
          
          <DeskSection title="Vehicle Details" icon={Car} alwaysExpanded>
            <div className="space-y-4">
              {deal.vehicle ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground mb-1.5">Year/Make/Model</div>
                      <div className="font-medium text-sm">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Stock #</div>
                      <div className="font-medium font-mono text-sm">{deal.vehicle.stockNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Mileage</div>
                      <div className="font-mono text-sm">{deal.vehicle.mileage.toLocaleString()} mi</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground mb-1.5">Price</div>
                      <div className="font-mono font-semibold text-lg">${parseFloat(deal.vehicle.price as string).toLocaleString()}</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setVehicleSwitcherOpen(true)}
                    data-testid="button-switch-vehicle"
                  >
                    <Car className="w-4 h-4 mr-2" />
                    Switch Vehicle
                  </Button>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No vehicle selected for this deal</p>
                  <Button 
                    variant="outline"
                    onClick={() => setVehicleSwitcherOpen(true)}
                    data-testid="button-select-vehicle"
                  >
                    <Car className="w-4 h-4 mr-2" />
                    Select Vehicle
                  </Button>
                </div>
              )}
            </div>
          </DeskSection>
          
          <DeskSection title="Pricing" icon={DollarSign} defaultOpen>
            <PricingForm />
          </DeskSection>
          
          <DeskSection 
            title="Trade-In" 
            icon={TrendingUp}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <TradeGarageSheet dealId={dealId!} />
              </div>
              <TradeForm />
            </div>
          </DeskSection>
          
          <DeskSection title="Finance Terms" icon={Calculator} defaultOpen>
            <FinanceLeaseForm />
          </DeskSection>
          
          <DeskSection title="Tax & Fees" icon={Receipt}>
            <TaxBreakdownForm />
          </DeskSection>
          
          {dealId && activeScenarioId && (
            <DeskSection title="Fee Packages" icon={Receipt} defaultOpen>
              <FeePackageSelector dealId={dealId} scenarioId={activeScenarioId} />
            </DeskSection>
          )}
          
          <DeskSection title="Dealer Fees" icon={Receipt}>
            <DealerFeesForm />
          </DeskSection>
          
          <DeskSection title="Accessories" icon={Receipt}>
            <AccessoriesForm />
          </DeskSection>
          
          <DeskSection title="F&I Products" icon={Receipt}>
            <FIGrid />
          </DeskSection>
        </div>
      
        {/* Desktop: Side-by-Side Sections */}
        <div className="hidden lg:block space-y-8">
          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionHeader icon={User} title="Customer Information" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCustomerSelectorOpen(true)}
                  data-testid="button-select-customer-desktop"
                >
                  <User className="w-4 h-4 mr-2" />
                  {deal.customer ? "Change" : "Select"} Customer
                </Button>
              </div>
              {deal.customer ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Name</div>
                    <div className="font-medium">{deal.customer.firstName} {deal.customer.lastName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Phone</div>
                    <div className="font-medium font-mono">{deal.customer.phone || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <div className="font-medium">{deal.customer.email || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Address</div>
                    <div className="font-medium">{deal.customer.address || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">City, State ZIP</div>
                    <div className="font-medium">
                      {[deal.customer.city, deal.customer.state, deal.customer.zipCode].filter(Boolean).join(', ') || 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No customer selected for this deal</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Car} title="Vehicle Details" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setVehicleSwitcherOpen(true)}
                  data-testid="button-switch-vehicle-desktop"
                >
                  <Car className="w-4 h-4 mr-2" />
                  {deal.vehicle ? "Switch" : "Select"} Vehicle
                </Button>
              </div>
              {deal.vehicle ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Year/Make/Model</div>
                    <div className="font-medium">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Stock #</div>
                    <div className="font-medium font-mono">{deal.vehicle.stockNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">VIN</div>
                    <div className="font-mono text-xs">{deal.vehicle.vin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mileage</div>
                    <div className="font-mono">{deal.vehicle.mileage.toLocaleString()} mi</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Price</div>
                    <div className="font-mono font-semibold text-lg">${parseFloat(deal.vehicle.price as string).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Color</div>
                    <div className="font-medium">{deal.vehicle.exteriorColor || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No vehicle selected for this deal</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Deal Structure with Modular Forms */}
          <div className="space-y-6">
            <SectionHeader icon={Calculator} title="Deal Structure" subtitle="Configure pricing, finance terms, and products" />
            
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing</h3>
                <PricingForm />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trade-In</h3>
                  <TradeGarageSheet dealId={dealId!} />
                </div>
                <TradeForm />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Finance Terms</h3>
                <FinanceLeaseForm />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tax & Fees</h3>
                <TaxBreakdownForm />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dealer Fees</h3>
                <DealerFeesForm />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Accessories</h3>
                <AccessoriesForm />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">F&I Products</h3>
                <FIGrid />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Button */}
        <MobileActionButton />

        {/* Vehicle Switcher Modal */}
        <VehicleSwitcher
          open={vehicleSwitcherOpen}
          onOpenChange={setVehicleSwitcherOpen}
          currentVehicleId={deal.vehicle?.id || null}
          dealId={deal.id}
          scenarioId={activeScenarioId}
        />
        
        {/* Customer Selector Sheet */}
        <CustomerSelectorSheet
          open={customerSelectorOpen}
          onOpenChange={setCustomerSelectorOpen}
          dealId={deal.id}
          currentCustomerId={deal.customer?.id}
        />
      </LayoutShell>
    </ScenarioFormProvider>
  );
}
