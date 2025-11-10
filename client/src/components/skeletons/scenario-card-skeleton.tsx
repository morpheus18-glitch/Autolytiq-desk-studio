import { Card } from '@/components/ui/card';
import { PremiumSkeleton } from './premium-skeleton';

export function ScenarioCardSkeleton() {
  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <PremiumSkeleton variant="text" className="w-32" />
          <PremiumSkeleton className="h-5 w-20 rounded-full" />
        </div>
        <PremiumSkeleton className="h-8 w-8 rounded-md" />
      </div>
      
      {/* Monthly payment */}
      <div className="space-y-2">
        <PremiumSkeleton variant="text" className="w-28 h-3" />
        <PremiumSkeleton className="h-8 w-32" />
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <PremiumSkeleton variant="text" className="w-20 h-3" />
            <PremiumSkeleton variant="text" className="w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
