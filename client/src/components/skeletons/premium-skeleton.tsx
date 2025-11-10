import type { HTMLAttributes } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PremiumSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  variant?: 'default' | 'card' | 'text';
}

export function PremiumSkeleton({ 
  className, 
  glass = false,
  variant = 'default',
  ...props 
}: PremiumSkeletonProps) {
  return (
    <Skeleton
      className={cn(
        'transition-smooth',
        glass && 'glass backdrop-blur-sm',
        variant === 'card' && 'min-h-24',
        variant === 'text' && 'h-4',
        className
      )}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}
