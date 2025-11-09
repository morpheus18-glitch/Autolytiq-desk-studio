import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealScenario } from '@shared/schema';

interface PaymentSummaryPanelProps {
  scenario: DealScenario;
  variant?: 'full' | 'compact';
  className?: string;
}

export function PaymentSummaryPanel({ scenario, variant = 'full', className }: PaymentSummaryPanelProps) {
  const isCompact = variant === 'compact';

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDecimal = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  };

  return (
    <Card className={cn("", className)}>
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
              {formatDecimal(scenario.apr)}% APR
            </div>
          )}
        </div>

        {/* Monthly Payment - Hero */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Monthly Payment
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-mono font-bold tabular-nums">
              {formatCurrency(scenario.monthlyPayment)}
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>

        {!isCompact && (
          <>
            <Separator />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Down Payment */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  Down Payment
                </div>
                <div className="text-lg font-mono font-semibold tabular-nums">
                  {formatCurrency(scenario.downPayment)}
                </div>
              </div>

              {/* Term */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Term
                </div>
                <div className="text-lg font-mono font-semibold tabular-nums">
                  {scenario.term} mo
                </div>
              </div>

              {/* Amount Financed */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  Financed
                </div>
                <div className="text-lg font-mono font-semibold tabular-nums">
                  {formatCurrency(scenario.amountFinanced)}
                </div>
              </div>

              {/* Total Cost */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  Total Cost
                </div>
                <div className="text-lg font-mono font-semibold tabular-nums">
                  {formatCurrency(scenario.totalCost)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tax Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sales Tax</span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(scenario.totalTax)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Fees</span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(scenario.totalFees)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
