/**
 * LoadingState - Standard loading state component
 *
 * Provides consistent loading UI with spinner and optional message.
 * Use this for inline loading states (not full-page loaders).
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <LoadingState message="Loading deals..." />
 * ) : (
 *   <DealsList deals={deals} />
 * )}
 * ```
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { flexLayouts } from '@/lib/design-tokens';

export interface LoadingStateProps {
  /** Optional loading message */
  message?: string;
  /** Size of the spinner (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** Whether to center the loading state (default: true) */
  centered?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingState({
  message,
  size = 'md',
  className,
  centered = true,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        flexLayouts.colCompact,
        centered && flexLayouts.center,
        'py-8',
        className
      )}
    >
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary')} />
      {message && (
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
      )}
    </div>
  );
}

/**
 * LoadingSpinner - Just the spinner without container
 *
 * Use this when you need just the spinner inline.
 *
 * @example
 * ```tsx
 * <Button disabled={isSubmitting}>
 *   {isSubmitting && <LoadingSpinner size="sm" />}
 *   Submit
 * </Button>
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <Loader2
      className={cn(sizeClasses[size], 'animate-spin', className)}
      aria-label="Loading"
    />
  );
}
