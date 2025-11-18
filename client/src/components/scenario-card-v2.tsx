import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScenarioCardV2Props {
  name: string;
  monthlyPayment: number;
  term: number;
  dueAtSigning: number;
  cashDown?: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ScenarioCardV2({
  name,
  monthlyPayment,
  term,
  dueAtSigning,
  cashDown = 0,
  isActive = false,
  onClick,
  className,
}: ScenarioCardV2Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col min-w-[140px] p-4 rounded-lg border-2 transition-all text-left",
        isActive
          ? "border-blue-600 bg-blue-50 shadow-md"
          : "border-neutral-200 bg-white hover:border-blue-300 hover:shadow-sm",
        className
      )}
    >
      {/* Scenario Name */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {name}
      </div>

      {/* Payment - Large */}
      <div className="text-2xl font-bold text-neutral-900 tabular-nums mb-1">
        ${Math.round(monthlyPayment).toLocaleString()}
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>

      {/* Term */}
      <div className="text-xs text-muted-foreground mb-2">
        {term} months
      </div>

      {/* DAS */}
      <div className="text-sm font-medium text-neutral-700 tabular-nums">
        ${Math.round(dueAtSigning).toLocaleString()} DAS
      </div>

      {/* Zero Down Badge */}
      {cashDown === 0 && (
        <Badge variant="secondary" className="mt-2 text-xs w-fit">
          Zero Down
        </Badge>
      )}
    </button>
  );
}

interface AddScenarioButtonProps {
  onClick?: () => void;
  className?: string;
}

export function AddScenarioButton({ onClick, className }: AddScenarioButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[120px] p-4 rounded-lg border-2 border-dashed border-neutral-300",
        "hover:border-blue-400 hover:bg-blue-50 transition-all text-neutral-500 hover:text-blue-600",
        className
      )}
    >
      <span className="text-2xl mb-1">+</span>
      <span className="text-xs font-medium">Add Scenario</span>
    </button>
  );
}
