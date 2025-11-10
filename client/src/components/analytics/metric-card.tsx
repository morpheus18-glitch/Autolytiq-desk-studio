import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useValueTransition } from '@/hooks/use-value-transition';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { MetricCardSkeleton } from '@/components/skeletons/metric-card-skeleton';

interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number | string;
  format?: 'currency' | 'number' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  changePercentage?: number;
  sparklineData?: Array<{ value: number }>;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  className?: string;
  testId?: string;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  trend,
  changePercentage,
  sparklineData,
  icon: Icon,
  loading = false,
  className,
  testId,
}: MetricCardProps) {
  // Determine trend from change percentage if not provided
  const actualTrend = trend || (
    changePercentage !== undefined
      ? changePercentage > 0 
        ? 'up' 
        : changePercentage < 0 
          ? 'down' 
          : 'neutral'
      : 'neutral'
  );
  
  // Format the value based on type
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };
  
  // Animated value for smooth transitions
  const animatedValue = useValueTransition(
    typeof value === 'number' ? value : 0,
    300
  );
  
  const displayValue = typeof value === 'number' 
    ? formatValue(animatedValue)
    : formatValue(value);
  
  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };
  
  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[actualTrend];
  
  const sparklineColor = {
    up: '#10b981',
    down: '#ef4444',
    neutral: '#6b7280',
  }[actualTrend];
  
  if (loading) {
    return <MetricCardSkeleton />;
  }
  
  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover-elevate',
        'bg-card/50 backdrop-blur-sm border-border/50',
        className
      )}
      data-testid={testId || `metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-semibold tabular-nums">
                {displayValue}
              </span>
              {previousValue && (
                <span className="text-sm text-muted-foreground">
                  from {formatValue(previousValue)}
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="rounded-lg bg-muted/50 p-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Trend indicator */}
          {changePercentage !== undefined && (
            <div className="flex items-center gap-2">
              <TrendIcon className={cn('h-4 w-4', trendColor)} />
              <span className={cn('text-sm font-medium', trendColor)}>
                {Math.abs(changePercentage).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs previous period
              </span>
            </div>
          )}
          
          {/* Sparkline chart */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="h-10 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});