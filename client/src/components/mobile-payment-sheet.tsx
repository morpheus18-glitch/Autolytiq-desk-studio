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
        className="glass-strong w-full flex items-center justify-between gap-4 px-6 py-4 shadow-xl hover-elevate active-elevate-2 touch-manipulation"
        data-testid="button-expand-payment-sheet"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-1">
              Monthly Payment
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600 font-mono tabular-nums transition-smooth" data-currency>
                {formatCurrency(monthlyPayment)}
              </span>
              <span className="text-lg text-neutral-500">/mo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          {scenario.apr && scenario.scenarioType === 'FINANCE_DEAL' && (
            <Badge variant="outline" className="text-xs font-semibold" data-percentage>
              {formatDecimal(scenario.apr)}% APR
            </Badge>
          )}
          <ChevronUp className="w-5 h-5 text-neutral-600" />
        </div>
      </button>

      {/* Expandable Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl"
        >
          {/* Handle (Enhanced Touch Target) */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-16 h-2 rounded-full bg-muted" />
          </div>

          {/* Header */}
          <SheetHeader className="px-8 pb-4">
            <SheetTitle className="text-left text-3xl font-bold">Payment Details</SheetTitle>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
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
                <div className="text-sm uppercase tracking-wider text-neutral-500 font-medium">
                  Monthly Payment
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold text-blue-600 font-mono tabular-nums transition-smooth" data-currency>
                    {formatCurrency(monthlyPayment)}
                  </span>
                  <span className="text-2xl text-neutral-500">/mo</span>
                </div>
              </div>

              <Separator />

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Down Payment */}
                <div className="space-y-2">
                  <div className="text-sm uppercase tracking-wider text-neutral-500">
                    Down Payment
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums" data-currency>
                    {formatCurrency(calculations.downPayment.toNumber())}
                  </div>
                </div>

                {/* Term */}
                <div className="space-y-2">
                  <div className="text-sm uppercase tracking-wider text-neutral-500">
                    Term
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums" data-numeric>
                    {scenario.term} mo
                  </div>
                </div>

                {/* Amount Financed */}
                <div className="space-y-2">
                  <div className="text-sm uppercase tracking-wider text-neutral-500">
                    To Finance
                  </div>
                  <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums transition-smooth" data-currency>
                    {formatCurrency(calculations.amountFinanced.toNumber())}
                  </div>
                </div>

                {/* Total Cost */}
                <div className="space-y-2">
                  <div className="text-sm uppercase tracking-wider text-neutral-500">
                    Total Cost
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums transition-smooth" data-currency>
                    {formatCurrency(calculations.totalCost.toNumber())}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tax Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-neutral-600">Sales Tax</span>
                  <span className="text-lg font-semibold text-neutral-900 font-mono tabular-nums" data-currency>
                    {formatCurrency(calculations.totalTax.toNumber())}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-neutral-600">Fees</span>
                  <span className="text-lg font-semibold text-neutral-900 font-mono tabular-nums" data-currency>
                    {formatCurrency(calculations.totalFees.toNumber())}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Scenarios Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-neutral-900">
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
