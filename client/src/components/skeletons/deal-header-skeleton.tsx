import { PremiumSkeleton } from './premium-skeleton';

export function DealHeaderSkeleton() {
  return (
    <div className="flex items-start md:items-center justify-between gap-3 md:gap-4">
      <div className="flex-1 min-w-0 space-y-3">
        {/* Deal number + status badge */}
        <div className="flex items-center gap-2">
          <PremiumSkeleton className="h-7 w-32" />
          <PremiumSkeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Customer & vehicle info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PremiumSkeleton variant="text" className="w-32" />
          <PremiumSkeleton variant="text" className="w-48" />
          <PremiumSkeleton variant="text" className="w-20" />
        </div>
      </div>
      
      {/* Action buttons - Desktop only */}
      <div className="hidden md:flex items-center gap-2">
        <PremiumSkeleton className="h-9 w-24" />
        <PremiumSkeleton className="h-9 w-24" />
        <PremiumSkeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
