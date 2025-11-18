import { Button } from '@/components/ui/button';
import { Calculator, Zap, Car, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentCommandBarProps {
  monthlyPayment: number;
  term: number;
  dueAtSigning: number;
  moneyFactor?: number;
  aprEquivalent?: number;
  residualPercent?: number;
  dealType: 'FINANCE_DEAL' | 'LEASE_DEAL' | 'CASH_DEAL';
  onEditTerms?: () => void;
  onAddProducts?: () => void;
  onChangeVehicle?: () => void;
  onSubmit?: () => void;
  className?: string;
}

export function PaymentCommandBar({
  monthlyPayment,
  term,
  dueAtSigning,
  moneyFactor,
  aprEquivalent,
  residualPercent,
  dealType,
  onEditTerms,
  onAddProducts,
  onChangeVehicle,
  onSubmit,
  className,
}: PaymentCommandBarProps) {
  const isLease = dealType === 'LEASE_DEAL';

  return (
    <div className={cn(
      "sticky top-[72px] z-40 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
          {/* PRIMARY METRICS - Large and Bold */}
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            {/* Monthly Payment - The Star */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Monthly Payment
              </div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-900 tabular-nums">
                ${monthlyPayment.toFixed(2)}
                <span className="text-lg md:text-xl text-muted-foreground ml-1 md:ml-2">/mo</span>
              </div>
            </div>

            {/* Term */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Term
              </div>
              <div className="text-xl md:text-2xl font-semibold text-neutral-900">
                {term} months
              </div>
            </div>

            {/* Due at Signing */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Due at Signing
              </div>
              <div className="text-xl md:text-2xl font-semibold text-neutral-900 tabular-nums">
                ${dueAtSigning.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* SECONDARY METRICS + ACTIONS */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 w-full lg:w-auto">
            {/* Secondary Metrics - Lease only */}
            {isLease && (
              <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm">
                {moneyFactor !== undefined && (
                  <div>
                    <span className="text-muted-foreground">MF:</span>
                    <span className="ml-1.5 font-semibold tabular-nums">{moneyFactor.toFixed(5)}</span>
                  </div>
                )}
                {aprEquivalent !== undefined && (
                  <div>
                    <span className="text-muted-foreground">APR:</span>
                    <span className="ml-1.5 font-semibold tabular-nums">{aprEquivalent.toFixed(2)}%</span>
                  </div>
                )}
                {residualPercent !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Residual:</span>
                    <span className="ml-1.5 font-semibold tabular-nums">{residualPercent}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Secondary Metrics */}
            {isLease && (
              <div className="flex lg:hidden flex-wrap items-center gap-3 text-xs">
                {moneyFactor !== undefined && (
                  <div className="bg-white/60 px-2 py-1 rounded">
                    <span className="text-muted-foreground">MF:</span>
                    <span className="ml-1 font-semibold tabular-nums">{moneyFactor.toFixed(5)}</span>
                  </div>
                )}
                {aprEquivalent !== undefined && (
                  <div className="bg-white/60 px-2 py-1 rounded">
                    <span className="text-muted-foreground">APR:</span>
                    <span className="ml-1 font-semibold tabular-nums">{aprEquivalent.toFixed(2)}%</span>
                  </div>
                )}
                {residualPercent !== undefined && (
                  <div className="bg-white/60 px-2 py-1 rounded">
                    <span className="text-muted-foreground">Res:</span>
                    <span className="ml-1 font-semibold tabular-nums">{residualPercent}%</span>
                  </div>
                )}
              </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              {onEditTerms && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditTerms}
                  className="flex-1 lg:flex-none"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Edit Terms</span>
                  <span className="sm:hidden">Terms</span>
                </Button>
              )}
              {onAddProducts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddProducts}
                  className="hidden md:flex"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Products
                </Button>
              )}
              {onChangeVehicle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onChangeVehicle}
                  className="hidden lg:flex"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Vehicle
                </Button>
              )}
              {onSubmit && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSubmit}
                  className="flex-1 lg:flex-none"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
