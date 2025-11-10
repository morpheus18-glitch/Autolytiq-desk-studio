import { useState } from 'react';
import { ChevronUp, TrendingUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { useValueTransition } from '@/hooks/use-value-transition';
import { ScenarioSelector } from './scenario-selector';
import type { DealScenario } from '@shared/schema';

interface MobilePaymentSheetProps {
  dealId: string;
  scenarios: DealScenario[];
  activeScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
}

export function MobilePaymentSheet({
  dealId,
  scenarios,
  activeScenarioId,
  onScenarioChange,
}: MobilePaymentSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { scenario, calculations } = useScenarioForm();
  
  // Smooth transitions for payment value
  const monthlyPayment = useValueTransition(calculations.monthlyPayment.toNumber(), { duration: 200 });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDecimal = (value: string | number | null, decimals = 2) => {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  };

  return (
    <>
      {/* Collapsed Bottom Bar - Always Visible (44px+ Touch Target) */}
      <button
        onClick={() => setIsOpen(true)}
        className="glass-strong w-full flex items-center justify-between gap-4 px-4 min-h-14 hover-elevate active-elevate-2 touch-manipulation"
        data-testid="button-expand-payment-sheet"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-step--2 font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Monthly Payment
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-step-2 font-bold transition-smooth" data-currency>
                {formatCurrency(monthlyPayment)}
              </span>
              <span className="text-step--1 text-muted-foreground">/mo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {scenario.apr && scenario.scenarioType === 'FINANCE_DEAL' && (
            <Badge variant="outline" className="text-xs" data-percentage>
              {formatDecimal(scenario.apr)}% APR
            </Badge>
          )}
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>

      {/* Expandable Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] overflow-hidden flex flex-col p-0"
        >
          {/* Handle (Enhanced Touch Target) */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-16 h-2 rounded-full bg-muted" />
          </div>

          {/* Header */}
          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="text-left">Payment Details</SheetTitle>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {/* Payment Summary */}
            <div className="space-y-4">
              {/* Scenario Type Badge */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-medium">
                  {scenario.scenarioType === 'FINANCE_DEAL' ? 'Finance' : 
                   scenario.scenarioType === 'LEASE_DEAL' ? 'Lease' : 'Cash'}
                </Badge>
                {scenario.apr && scenario.scenarioType === 'FINANCE_DEAL' && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{formatDecimal(scenario.apr)}% APR</span>
                  </div>
                )}
              </div>

              {/* Monthly Payment - Hero */}
              <div className="space-y-2">
                <div className="text-step--1 font-medium text-muted-foreground uppercase tracking-wide">
                  Monthly Payment
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="hero-metric transition-smooth" data-currency>
                    {formatCurrency(monthlyPayment)}
                  </span>
                  <span className="text-step-0 text-muted-foreground">/mo</span>
                </div>
              </div>

              <Separator />

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Down Payment */}
                <div className="space-y-1.5">
                  <div className="text-step--2 text-muted-foreground">
                    Down Payment
                  </div>
                  <div className="text-step-1 font-semibold" data-currency>
                    {formatCurrency(calculations.downPayment.toNumber())}
                  </div>
                </div>

                {/* Term */}
                <div className="space-y-1.5">
                  <div className="text-step--2 text-muted-foreground">
                    Term
                  </div>
                  <div className="text-step-1 font-semibold" data-numeric>
                    {scenario.term} mo
                  </div>
                </div>

                {/* Amount Financed */}
                <div className="space-y-1.5">
                  <div className="text-step--2 text-muted-foreground">
                    Financed
                  </div>
                  <div className="text-step-1 font-semibold transition-smooth" data-currency>
                    {formatCurrency(calculations.amountFinanced.toNumber())}
                  </div>
                </div>

                {/* Total Cost */}
                <div className="space-y-1.5">
                  <div className="text-step--2 text-muted-foreground">
                    Total Cost
                  </div>
                  <div className="text-step-1 font-semibold transition-smooth" data-currency>
                    {formatCurrency(calculations.totalCost.toNumber())}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tax Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-step--1">
                  <span className="text-muted-foreground">Sales Tax</span>
                  <span className="font-semibold" data-currency>
                    {formatCurrency(calculations.totalTax.toNumber())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-step--1">
                  <span className="text-muted-foreground">Fees</span>
                  <span className="font-semibold" data-currency>
                    {formatCurrency(calculations.totalFees.toNumber())}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Scenarios Section */}
            <div className="space-y-4">
              <h3 className="text-step--1 font-semibold text-muted-foreground uppercase tracking-wide">
                Scenarios
              </h3>
              <ScenarioSelector
                dealId={dealId}
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                onScenarioChange={(id) => {
                  onScenarioChange(id);
                  setIsOpen(false); // Close sheet after switching scenario
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
