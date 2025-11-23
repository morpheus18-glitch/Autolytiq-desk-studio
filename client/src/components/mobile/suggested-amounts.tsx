import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gridLayouts } from "@/lib/design-tokens";

interface SuggestedAmountsProps {
  amounts: number[];
  onSelect: (amount: number) => void;
  selectedAmount?: number | null;
  className?: string;
  formatLabel?: (amount: number) => string;
}

export function SuggestedAmounts({
  amounts,
  onSelect,
  selectedAmount,
  className,
  formatLabel = (amount) => {
    if (amount === 0) return "$0";
    if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
    return `$${amount}`;
  }
}: SuggestedAmountsProps) {
  return (
    <div className={cn(gridLayouts.fourCol, "md:grid-cols-4", className)}>
      {amounts.map((amount) => {
        const isSelected = selectedAmount === amount;
        return (
          <Button
            key={amount}
            variant={isSelected ? "default" : "outline"}
            size="lg"
            onClick={() => onSelect(amount)}
            className="min-h-[56px] text-lg font-semibold"
            data-testid={`suggested-amount-${amount}`}
          >
            {formatLabel(amount)}
          </Button>
        );
      })}
    </div>
  );
}