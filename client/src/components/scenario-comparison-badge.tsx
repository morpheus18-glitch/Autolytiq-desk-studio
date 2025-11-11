import { Badge } from '@/components/ui/badge';
import { calculateDelta, getValueColorClass } from '@/lib/pricing-utils';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Decimal from 'decimal.js';

interface ScenarioComparisonBadgeProps {
  /**
   * Current value to compare (e.g., Scenario 2 payment)
   */
  current: Decimal | number;
  
  /**
   * Baseline value to compare against (e.g., Scenario 1 payment)
   */
  baseline: Decimal | number;
  
  /**
   * Label for the comparison (e.g., "vs Scenario 1", "vs Base")
   */
  label?: string;
  
  /**
   * Show icon indicator (up/down arrow or equal sign)
   */
  showIcon?: boolean;
  
  /**
   * Show percent change in addition to dollar amount
   */
  showPercent?: boolean;
  
  /**
   * Inverse color coding (green for lower values, red for higher)
   * Useful for payment comparisons where lower is better
   */
  inverse?: boolean;
  
  /**
   * Test ID for automation
   */
  testId?: string;
}

/**
 * ScenarioComparisonBadge - Shows delta between current and baseline values
 * 
 * Professional data presentation component that displays:
 * - Color-coded difference (green/red/neutral)
 * - Optional arrow indicators (up/down/equal)
 * - Optional percent change
 * - Formatted currency with +/- prefix
 * 
 * Follows Apple/Nike quality standards:
 * - WCAG AA contrast ratios
 * - Semantic color tokens
 * - Zero values render neutral
 * - Monospace font for alignment
 * 
 * @example
 * // Show payment increase
 * <ScenarioComparisonBadge 
 *   current={550} 
 *   baseline={500} 
 *   label="vs Scenario 1"
 *   inverse // Lower payment is better
 * />
 * // Displays: "↑ +$50 vs Scenario 1" in red
 * 
 * @example
 * // Show profit decrease
 * <ScenarioComparisonBadge 
 *   current={2000} 
 *   baseline={2500} 
 *   showPercent
 * />
 * // Displays: "↓ -$500 (-20%)" in red
 */
export function ScenarioComparisonBadge({
  current,
  baseline,
  label,
  showIcon = true,
  showPercent = false,
  inverse = false,
  testId = 'badge-scenario-comparison'
}: ScenarioComparisonBadgeProps) {
  const delta = calculateDelta(current, baseline);
  const isZero = delta.value === 0;
  const isPositive = delta.value > 0;
  
  // Use getValueColorClass directly with inverse option
  // This ensures both light and dark mode classes are correct
  const colorClass = getValueColorClass(delta.value, { inverse });
  
  // Icon selection
  const Icon = isZero ? Minus : isPositive ? ArrowUp : ArrowDown;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-mono tabular-nums text-xs",
        colorClass,
        "border-current/20 bg-current/5"
      )}
      data-testid={testId}
    >
      {showIcon && <Icon className="w-3 h-3" aria-hidden="true" />}
      <span>
        {delta.formatted}
        {showPercent && !isZero && ` (${delta.percentChange > 0 ? '+' : ''}${delta.percentChange.toFixed(1)}%)`}
        {label && ` ${label}`}
      </span>
    </Badge>
  );
}
