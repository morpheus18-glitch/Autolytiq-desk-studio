import type { HTMLAttributes } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { skeletonClasses } from '@/lib/design-tokens';

interface PremiumSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  variant?: 'default' | 'card' | 'text' | 'title' | 'button' | 'avatar';
}

export function PremiumSkeleton({
  className,
  glass = false,
  variant = 'default',
  ...props
}: PremiumSkeletonProps) {
  const variantClass = variant === 'default' ? '' : skeletonClasses[variant];

  return (
    <Skeleton
      className={cn(
        'transition-smooth',
        glass && 'glass backdrop-blur-sm',
        variantClass,
        className
      )}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}
