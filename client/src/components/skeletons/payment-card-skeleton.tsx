import { Card } from '@/components/ui/card';
import { PremiumSkeleton } from './premium-skeleton';

export function PaymentCardSkeleton() {
  return (
    <Card className="glass p-4 md:p-6 space-y-4">
      {/* Scenario type badge */}
      <div className="flex items-center justify-between">
        <PremiumSkeleton className="h-5 w-20 rounded-full" />
        <PremiumSkeleton className="h-5 w-16 rounded-full" />
      </div>
      
      {/* Monthly payment hero */}
      <div className="space-y-2">
        <PremiumSkeleton variant="text" className="w-32 h-3" />
        <PremiumSkeleton className="h-12 w-40" />
      </div>
      
      {/* Metrics grid */}
      <div className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <PremiumSkeleton variant="text" className="w-24 h-3" />
              <PremiumSkeleton variant="text" className="w-20" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional metrics */}
      <div className="space-y-3 pt-4 border-t">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <PremiumSkeleton variant="text" className="w-28 h-3" />
            <PremiumSkeleton variant="text" className="w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
