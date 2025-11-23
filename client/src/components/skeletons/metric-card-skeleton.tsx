import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { standardCardClasses, cardSpacing, skeletonClasses } from '@/lib/design-tokens';

export function MetricCardSkeleton() {
  return (
    <Card className={cn(standardCardClasses, "bg-card/50 backdrop-blur-sm")}>
      <CardContent className={cardSpacing.standard}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className={cn(skeletonClasses.avatar, "h-5 w-5")} />
              <Skeleton className={skeletonClasses.text} />
            </div>
            <div className="space-y-2">
              <Skeleton className={cn(skeletonClasses.title, "w-32")} />
              <Skeleton className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <Skeleton className="h-10 w-20 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}