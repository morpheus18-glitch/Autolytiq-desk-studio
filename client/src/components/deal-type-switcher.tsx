import { cn } from '@/lib/utils';

interface DealTypeSwitcherProps {
  value: 'FINANCE_DEAL' | 'LEASE_DEAL' | 'CASH_DEAL';
  onChange: (value: 'FINANCE_DEAL' | 'LEASE_DEAL' | 'CASH_DEAL') => void;
  disabled?: boolean;
  className?: string;
}

export function DealTypeSwitcher({
  value,
  onChange,
  disabled = false,
  className,
}: DealTypeSwitcherProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-lg bg-muted p-1",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <button
        type="button"
        onClick={() => onChange('FINANCE_DEAL')}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          value === 'FINANCE_DEAL'
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Finance
      </button>
      <button
        type="button"
        onClick={() => onChange('LEASE_DEAL')}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          value === 'LEASE_DEAL'
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Lease
      </button>
      <button
        type="button"
        onClick={() => onChange('CASH_DEAL')}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          value === 'CASH_DEAL'
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Cash
      </button>
    </div>
  );
}

// Compact version for header
export function DealTypeSwitcherCompact({
  value,
  onChange,
  disabled = false,
  className,
}: DealTypeSwitcherProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-md bg-muted/60 p-0.5",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <button
        type="button"
        onClick={() => onChange('FINANCE_DEAL')}
        className={cn(
          "px-2 py-1 text-[10px] font-semibold rounded transition-all uppercase tracking-wide",
          value === 'FINANCE_DEAL'
            ? "bg-blue-600 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Fin
      </button>
      <button
        type="button"
        onClick={() => onChange('LEASE_DEAL')}
        className={cn(
          "px-2 py-1 text-[10px] font-semibold rounded transition-all uppercase tracking-wide",
          value === 'LEASE_DEAL'
            ? "bg-blue-600 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Lse
      </button>
    </div>
  );
}
