import { PremiumSkeleton } from './premium-skeleton';

export function FormSectionSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Input grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <PremiumSkeleton variant="text" className="w-24 h-3" />
            <PremiumSkeleton className="h-11 w-full" />
            <PremiumSkeleton variant="text" className="w-32 h-3" />
          </div>
        ))}
      </div>
      
      {/* Summary card */}
      <div className="calc-surface p-3 md:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <PremiumSkeleton variant="text" className="w-20 h-3" />
              <PremiumSkeleton variant="text" className="w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
