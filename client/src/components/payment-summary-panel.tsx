import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { useValueTransition } from '@/hooks/use-value-transition';

interface PaymentSummaryPanelProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export function PaymentSummaryPanel({ variant = 'full', className }: PaymentSummaryPanelProps) {
  const { scenario, calculations } = useScenarioForm();
  const isCompact = variant === 'compact';

  // Smooth transitions for key values (Apple/Nike quality)
  const monthlyPayment = useValueTransition(calculations.monthlyPayment.toNumber(), { duration: 200 });
  const amountFinanced = useValueTransition(calculations.amountFinanced.toNumber(), { duration: 200 });
  const totalCost = useValueTransition(calculations.totalCost.toNumber(), { duration: 200 });

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
    <Card className={cn("glass overflow-hidden", className)}>
      <div className="p-4 md:p-6 space-y-4">
        {/* Scenario Type Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-medium">
            {scenario.scenarioType === 'FINANCE_DEAL' ? 'Finance' : 
             scenario.scenarioType === 'LEASE_DEAL' ? 'Lease' : 'Cash'}
          </Badge>
          {scenario.apr && scenario.scenarioType === 'FINANCE_DEAL' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Percent className="w-3 h-3" />
              <span data-percentage>{formatDecimal(scenario.apr)}% APR</span>
            </div>
          )}
        </div>

        {/* Monthly Payment - Hero */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-step--1 font-medium text-muted-foreground uppercase tracking-wide">
              Monthly Payment
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="hero-metric transition-smooth" data-testid="text-payment-summary-monthly" data-currency>
              {formatCurrency(monthlyPayment)}
            </span>
            <span className="text-step--1 text-muted-foreground">/mo</span>
          </div>
        </div>

        {!isCompact && (
          <>
            <Separator />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Down Payment */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-step--2 text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  Down Payment
                </div>
                <div className="text-step-1 font-semibold" data-currency>
                  {formatCurrency(calculations.downPayment.toNumber())}
                </div>
              </div>

              {/* Term */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-step--2 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Term
                </div>
                <div className="text-step-1 font-semibold" data-numeric>
                  {scenario.term} mo
                </div>
              </div>

              {/* Amount Financed */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-step--2 text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  Financed
                </div>
                <div className="text-step-1 font-semibold transition-smooth" data-currency>
                  {formatCurrency(amountFinanced)}
                </div>
              </div>

              {/* Total Cost */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-step--2 text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  Total Cost
                </div>
                <div className="text-step-1 font-semibold transition-smooth" data-currency>
                  {formatCurrency(totalCost)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tax Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-step--2">
                <span className="text-muted-foreground">Sales Tax</span>
                <span className="font-semibold" data-currency>{formatCurrency(calculations.totalTax.toNumber())}</span>
              </div>
              <div className="flex items-center justify-between text-step--2">
                <span className="text-muted-foreground">Fees</span>
                <span className="font-semibold" data-currency>{formatCurrency(calculations.totalFees.toNumber())}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
