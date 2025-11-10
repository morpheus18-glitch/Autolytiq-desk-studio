import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, User, History, Printer, FileText, DollarSign, Calculator, Receipt, TrendingUp } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { DealWithRelations, DealScenario } from '@shared/schema';
import { LayoutShell } from '@/components/layout-shell';
import { SectionHeader } from '@/components/section-header';
import { PaymentSummaryPanel } from '@/components/payment-summary-panel';
import { DeskSection } from '@/components/desk-section';
import { ScenarioFormProvider, useScenarioForm } from '@/contexts/scenario-form-context';
import { PricingForm } from '@/components/forms/pricing-form';
import { TradeForm } from '@/components/forms/trade-form';
import { FinanceLeaseForm } from '@/components/forms/finance-lease-form';
import { FIGrid } from '@/components/forms/fi-grid';
import { TaxBreakdownForm } from '@/components/forms/tax-breakdown-form';
import { DealerFeesForm } from '@/components/forms/dealer-fees-form';
import { AccessoriesForm } from '@/components/forms/accessories-form';
import { ScenarioSelector } from '@/components/scenario-selector';
import { DealWorkflowControls } from '@/components/deal-workflow-controls';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  APPROVED: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export default function DealWorksheetV2() {
  const [, params] = useRoute('/deals/:id');
  const dealId = params?.id;
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const setActiveDealId = useStore(state => state.setActiveDealId);
  
  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
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
  
  if (isLoading || !deal) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading deal...</p>
        </div>
      </div>
    );
  }
  
  const activeScenario = deal.scenarios.find(s => s.id === activeScenarioId) || deal.scenarios[0];
  
  const header = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-mono tracking-tight">{deal.dealNumber}</h1>
            <Badge className={DEAL_STATE_COLORS[deal.dealState]} data-testid="badge-deal-state">
              {deal.dealState.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs md:text-sm text-muted-foreground">
            <span className="font-medium">{deal.customer.firstName} {deal.customer.lastName}</span>
            <span className="text-border">•</span>
            <span>{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</span>
            <span className="text-border">•</span>
            <span className="font-mono">#{deal.vehicle.stockNumber}</span>
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-2">
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
  
  // Summary component - will be rendered inside ScenarioFormProvider
  const SummaryContent = () => {
    const { calculations } = useScenarioForm();
    
    return (
      <div className="space-y-4">
        {/* Mobile: Compact View */}
        <div className="lg:hidden">
          <PaymentSummaryPanel variant="compact" />
        </div>
        
        {/* Desktop: Full View */}
        <div className="hidden lg:block space-y-6">
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
      </div>
    );
  };
  
  return (
    <ScenarioFormProvider 
      scenario={activeScenario} 
      tradeVehicle={deal.tradeVehicle || null}
      dealId={deal.id}
    >
      <LayoutShell header={header} summary={<SummaryContent />}>
        {/* Workflow Controls */}
        <DealWorkflowControls deal={deal} activeScenarioId={activeScenarioId} />
        
        {/* Mobile: Collapsible Sections */}
        <div className="lg:hidden space-y-4">
          <DeskSection title="Customer Information" icon={User} defaultOpen>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </div>
          </DeskSection>
          
          <DeskSection title="Vehicle Details" icon={Car}>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Year/Make/Model</div>
                  <div className="font-medium">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Stock #</div>
                  <div className="font-medium font-mono">{deal.vehicle.stockNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Price</div>
                  <div className="font-mono font-semibold text-base">${parseFloat(deal.vehicle.price as string).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Mileage</div>
                  <div className="font-mono">{deal.vehicle.mileage.toLocaleString()} mi</div>
                </div>
              </div>
            </div>
          </DeskSection>
          
          <DeskSection title="Pricing" icon={DollarSign} defaultOpen>
            <PricingForm />
          </DeskSection>
          
          <DeskSection title="Trade-In" icon={TrendingUp}>
            <TradeForm />
          </DeskSection>
          
          <DeskSection title="Finance Terms" icon={Calculator} defaultOpen>
            <FinanceLeaseForm />
          </DeskSection>
          
          <DeskSection title="Tax & Fees" icon={Receipt}>
            <TaxBreakdownForm />
          </DeskSection>
          
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
              <SectionHeader icon={User} title="Customer Information" />
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
            </div>
            
            <div className="space-y-4">
              <SectionHeader icon={Car} title="Vehicle Details" />
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trade-In</h3>
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
      </LayoutShell>
    </ScenarioFormProvider>
  );
}
