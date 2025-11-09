import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Save, Printer, Send, History, ChevronRight, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { DealWithRelations, DealScenario } from '@shared/schema';
import { ScenarioCalculator } from '@/components/scenario-calculator';
import { ScenarioComparison } from '@/components/scenario-comparison';
import { AuditTrail } from '@/components/audit-trail';
import { AutoSaveIndicator } from '@/components/auto-save-indicator';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  APPROVED: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export default function DealWorksheet() {
  const [, params] = useRoute('/deals/:id');
  const dealId = params?.id;
  const [activeTab, setActiveTab] = useState<string>('');
  const { auditTrailOpen, toggleAuditTrail, setActiveDealId, setActiveScenarioId } = useStore();
  const { toast } = useToast();
  
  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
  });
  
  // Set active deal on mount
  useEffect(() => {
    if (dealId) {
      setActiveDealId(dealId);
    }
    return () => setActiveDealId(null);
  }, [dealId, setActiveDealId]);
  
  // Set active scenario when deal loads or tab changes
  useEffect(() => {
    if (deal?.scenarios && deal.scenarios.length > 0) {
      const activeScenario = deal.scenarios.find(s => s.id === activeTab) || deal.scenarios[0];
      setActiveTab(activeScenario.id);
      setActiveScenarioId(activeScenario.id);
    }
  }, [deal, activeTab, setActiveScenarioId]);
  
  const updateDealStateMutation = useMutation({
    mutationFn: async (newState: string) => {
      return await apiRequest('PATCH', `/api/deals/${dealId}/state`, { state: newState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({ title: 'Deal state updated' });
    },
  });
  
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
  
  const activeScenario = deal.scenarios.find(s => s.id === activeTab) || deal.scenarios[0];
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold font-mono">{deal.dealNumber}</h1>
                  <Badge className={DEAL_STATE_COLORS[deal.dealState]}>
                    {deal.dealState.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">{deal.customer.firstName} {deal.customer.lastName}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span>{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-mono">Stock #{deal.vehicle.stockNumber}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAuditTrail}
                className="gap-2"
                data-testid="button-audit-trail"
              >
                <History className="w-4 h-4" />
                Audit Trail
              </Button>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-print">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              {deal.dealState === 'DRAFT' && (
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => updateDealStateMutation.mutate('IN_PROGRESS')}
                  data-testid="button-start-deal"
                >
                  Start Deal
                </Button>
              )}
              {deal.dealState === 'IN_PROGRESS' && (
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => updateDealStateMutation.mutate('APPROVED')}
                  data-testid="button-approve-deal"
                >
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Deal Worksheet */}
        <div className={`flex-1 overflow-auto transition-all ${auditTrailOpen ? 'mr-96' : ''}`}>
          <div className="max-w-5xl mx-auto p-8">
            {/* Customer & Vehicle Summary */}
            <Card className="p-6 mb-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <div className="text-lg font-semibold">
                        {deal.customer.firstName} {deal.customer.lastName}
                      </div>
                      {deal.customer.email && (
                        <div className="text-sm text-muted-foreground">{deal.customer.email}</div>
                      )}
                      {deal.customer.phone && (
                        <div className="text-sm text-muted-foreground">{deal.customer.phone}</div>
                      )}
                    </div>
                    {deal.customer.address && (
                      <div className="text-sm text-muted-foreground">
                        <div>{deal.customer.address}</div>
                        <div>
                          {deal.customer.city}, {deal.customer.state} {deal.customer.zipCode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Vehicle Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <div className="text-lg font-semibold">
                        {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                      </div>
                      {deal.vehicle.trim && (
                        <div className="text-sm text-muted-foreground">{deal.vehicle.trim}</div>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock #:</span>
                        <span className="font-mono font-medium">{deal.vehicle.stockNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VIN:</span>
                        <span className="font-mono text-xs">{deal.vehicle.vin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mileage:</span>
                        <span className="font-mono">{deal.vehicle.mileage.toLocaleString()} mi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-mono font-semibold">
                          ${parseFloat(deal.vehicle.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Scenario Tabs */}
            {deal.scenarios.length > 0 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start mb-6 bg-muted/50">
                  {deal.scenarios.map((scenario) => (
                    <TabsTrigger 
                      key={scenario.id} 
                      value={scenario.id}
                      className="gap-2 data-[state=active]:bg-background"
                      data-testid={`tab-scenario-${scenario.id}`}
                    >
                      <span>{scenario.name}</span>
                      {parseFloat(scenario.monthlyPayment) > 0 && (
                        <span className="font-mono text-xs opacity-70">
                          ${parseFloat(scenario.monthlyPayment).toLocaleString()}/mo
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {deal.scenarios.map((scenario) => (
                  <TabsContent key={scenario.id} value={scenario.id} className="mt-0">
                    <ScenarioCalculator 
                      scenario={scenario} 
                      dealId={deal.id}
                      tradeVehicle={deal.tradeVehicle}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No scenarios yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a financing scenario to start building this deal
                    </p>
                  </div>
                  <Button data-testid="button-create-scenario">
                    Add Scenario
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
        
        {/* Right: Scenario Comparison (when available) */}
        {deal.scenarios.length > 1 && !auditTrailOpen && (
          <div className="w-96 border-l bg-card overflow-auto">
            <ScenarioComparison scenarios={deal.scenarios} activeScenarioId={activeTab} />
          </div>
        )}
        
        {/* Right: Audit Trail (when open) */}
        {auditTrailOpen && (
          <div className="w-96 border-l bg-card overflow-auto fixed right-0 top-0 h-full z-10">
            <AuditTrail dealId={deal.id} onClose={toggleAuditTrail} />
          </div>
        )}
      </div>
      
      {/* Auto-save Indicator */}
      <AutoSaveIndicator />
    </div>
  );
}
