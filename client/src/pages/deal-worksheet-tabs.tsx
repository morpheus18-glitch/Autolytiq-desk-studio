import { useEffect, useState, useRef } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, MoreVertical, Mail } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { DealWithRelations } from '@shared/schema';
import { PaymentHero } from '@/components/payment-hero';
import { DealWorksheetTabs } from '@/components/deal-worksheet-tabs';
import { NumbersTab } from '@/components/numbers-tab';
import { ScenarioFormProvider, useScenarioForm } from '@/contexts/scenario-form-context';
import Decimal from 'decimal.js';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-0 shadow-md rounded-full',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0 shadow-md rounded-full',
  APPROVED: 'bg-green-100 text-green-800 border-0 shadow-md rounded-full',
  CANCELLED: 'bg-red-100 text-red-800 border-0 shadow-md rounded-full',
};

export default function DealWorksheetTabsPage() {
  const [, params] = useRoute('/deals/:id/tabs');
  const dealId = params?.id;
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const setActiveDealId = useStore(state => state.setActiveDealId);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroHeight, setHeroHeight] = useState(180);
  
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
  
  // Track Payment Hero height dynamically
  useEffect(() => {
    if (!heroRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeroHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(heroRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  if (isLoading || !deal) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  const activeScenario = deal.scenarios.find(s => s.id === activeScenarioId) || deal.scenarios[0];
  
  // Calculate payment values for Payment Hero
  const monthlyPayment = activeScenario?.monthlyPayment || '0';
  const apr = activeScenario?.apr || '0';
  const term = activeScenario?.term || 60;
  const downPayment = activeScenario?.downPayment || '0';
  
  // Use calculated values from activeScenario
  const amountFinanced = activeScenario?.amountFinanced || '0';
  const totalCost = activeScenario?.totalCost || '0';
  const cssVars = {
    '--header-height': '73px',
    '--hero-height': `${heroHeight}px`,
  } as React.CSSProperties;
  
  return (
    <ScenarioFormProvider 
      scenario={activeScenario} 
      tradeVehicle={deal.tradeVehicle || null}
      dealId={deal.id}
    >
      <DealWorksheetTabsContent 
        deal={deal}
        heroRef={heroRef}
        heroHeight={heroHeight}
        cssVars={cssVars}
      />
    </ScenarioFormProvider>
  );
}

function DealWorksheetTabsContent({ 
  deal, 
  heroRef, 
  heroHeight,
  cssVars 
}: {
  deal: DealWithRelations;
  heroRef: React.RefObject<HTMLDivElement>;
  heroHeight: number;
  cssVars: React.CSSProperties;
}) {
  // Now we can use ScenarioFormContext inside the provider
  const { scenario, calculations } = useScenarioForm();
  
  const totalTaxFees = calculations.totalTax.plus(calculations.totalFees).toFixed(2);
  
  return (
    <div className="h-screen flex flex-col bg-background" style={cssVars}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80" style={{ height: 'var(--header-height, 73px)' } as React.CSSProperties}>
          <div className="px-4 md:px-6 py-3 md:py-4 h-full">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Deal Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-semibold font-mono tracking-tight" data-testid="text-deal-number">
                    {deal.dealNumber}
                  </h1>
                  <Badge className={DEAL_STATE_COLORS[deal.dealState]} data-testid="badge-deal-state">
                    {deal.dealState.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium" data-testid="text-customer-name">
                    {deal.customer.firstName} {deal.customer.lastName}
                  </span>
                  <span>•</span>
                  <span data-testid="text-vehicle-description">
                    {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                  </span>
                </div>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" data-testid="button-save-deal">
                  <Save className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-more-actions">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Hero - Sticky below header */}
        <div 
          ref={heroRef}
          className="px-4 md:px-6 pt-4 md:pt-6 sticky z-40" 
          style={{ top: 'var(--header-height, 73px)' } as React.CSSProperties}
        >
          <PaymentHero
            monthlyPayment={calculations.monthlyPayment.toFixed(2)}
            apr={scenario.apr || '5.99'}
            term={scenario.term ?? 60}
            downPayment={calculations.downPayment.toFixed(2)}
            amountFinanced={calculations.amountFinanced.toFixed(2)}
            totalCost={calculations.totalCost.toFixed(2)}
            totalTaxFees={totalTaxFees}
          />
        </div>

        {/* Tabbed Content */}
        <div className="flex-1 overflow-hidden">
          <DealWorksheetTabs
            defaultTab="numbers"
            className="h-full"
          >
            {{
              numbers: <NumbersTab />,
              customer: (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold">Customer Information</h2>
                  <div className="grid gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Name</div>
                      <div className="text-lg font-medium" data-testid="text-customer-full-name">
                        {deal.customer.firstName} {deal.customer.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Email</div>
                      <div className="font-mono" data-testid="text-customer-email">
                        {deal.customer.email || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Phone</div>
                      <div className="font-mono" data-testid="text-customer-phone">
                        {deal.customer.phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ),
              vehicle: (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold">Vehicle Details</h2>
                  <div className="grid gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Year / Make / Model</div>
                      <div className="text-lg font-medium" data-testid="text-vehicle-full">
                        {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">VIN</div>
                      <div className="font-mono" data-testid="text-vehicle-vin">
                        {deal.vehicle.vin}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Stock Number</div>
                      <div className="font-mono" data-testid="text-vehicle-stock">
                        {deal.vehicle.stockNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Mileage</div>
                      <div className="font-mono" data-testid="text-vehicle-mileage">
                        {deal.vehicle.mileage.toLocaleString()} mi
                      </div>
                    </div>
                  </div>
                </div>
              ),
              products: (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold">Products & Add-Ons</h2>
                  <div className="text-muted-foreground">
                    F&I Products and accessories will be displayed here
                  </div>
                </div>
              ),
              docs: (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold">Documents</h2>
                  <div className="text-muted-foreground">
                    Required documents and e-signature status will be displayed here
                  </div>
                </div>
              ),
            }}
          </DealWorksheetTabs>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="sticky bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-2xl">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none" data-testid="button-email-quote">
                <Mail className="w-4 h-4 mr-2" />
                Email Quote
              </Button>
              <Button variant="default" size="lg" className="flex-1 sm:flex-none" data-testid="button-submit-deal">
                Submit Deal
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}
