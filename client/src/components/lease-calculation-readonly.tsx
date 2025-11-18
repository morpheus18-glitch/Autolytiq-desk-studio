import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number;
  sublabel?: string;
  highlight?: boolean;
  format?: 'currency' | 'percent' | 'number';
}

function MetricCard({ label, value, sublabel, highlight = false, format = 'currency' }: MetricCardProps) {
  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toFixed(5);
      default:
        return value.toString();
    }
  })();

  return (
    <div className={cn(
      "p-4 rounded-lg",
      highlight ? "bg-blue-50 border-2 border-blue-200" : "bg-neutral-50"
    )}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={cn(
        "text-xl md:text-2xl font-bold tabular-nums",
        highlight ? "text-blue-900" : "text-neutral-900"
      )}>
        {formattedValue}
      </div>
      {sublabel && (
        <div className="text-xs text-muted-foreground mt-1">
          {sublabel}
        </div>
      )}
    </div>
  );
}

interface LeaseCalculationReadonlyProps {
  residualValue: number;
  residualPercent: number;
  depreciation: number;
  monthlyDepreciationCharge: number;
  monthlyRentCharge: number;
  baseMonthlyPayment: number;
  monthlyTax: number;
  moneyFactor: number;
  taxRate: number;
  className?: string;
}

export function LeaseCalculationReadonly({
  residualValue,
  residualPercent,
  depreciation,
  monthlyDepreciationCharge,
  monthlyRentCharge,
  baseMonthlyPayment,
  monthlyTax,
  moneyFactor,
  taxRate,
  className,
}: LeaseCalculationReadonlyProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:gap-4", className)}>
      <MetricCard
        label="Residual Value"
        value={residualValue}
        sublabel={`${residualPercent}% of MSRP`}
      />
      <MetricCard
        label="Depreciation"
        value={depreciation}
        sublabel="Total over lease term"
      />
      <MetricCard
        label="Monthly Depreciation"
        value={monthlyDepreciationCharge}
        sublabel="Wear & tear portion"
      />
      <MetricCard
        label="Monthly Rent Charge"
        value={monthlyRentCharge}
        sublabel={`MF ${moneyFactor.toFixed(5)}`}
      />
      <MetricCard
        label="Base Payment"
        value={baseMonthlyPayment}
        sublabel="Before tax"
        highlight
      />
      <MetricCard
        label="Monthly Tax"
        value={monthlyTax}
        sublabel={`${(taxRate * 100).toFixed(2)}% rate`}
      />
    </div>
  );
}

// Compact single-line version for summary display
export function LeaseCalculationSummary({
  baseMonthlyPayment,
  monthlyTax,
  totalMonthlyPayment,
  term,
  totalOfPayments,
  className,
}: {
  baseMonthlyPayment: number;
  monthlyTax: number;
  totalMonthlyPayment: number;
  term: number;
  totalOfPayments: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-neutral-50 p-4 rounded-lg space-y-3", className)}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Deal Summary
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Payment</span>
          <span className="font-medium tabular-nums">
            ${baseMonthlyPayment.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">+ Tax</span>
          <span className="font-medium tabular-nums">
            ${monthlyTax.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="font-semibold">Total Monthly</span>
          <span className="font-bold tabular-nums text-blue-900">
            ${totalMonthlyPayment.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total of {term} Payments</span>
          <span className="tabular-nums">
            ${totalOfPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
