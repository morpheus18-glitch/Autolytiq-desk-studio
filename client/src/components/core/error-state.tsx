/**
 * ErrorState - Standard error state component
 *
 * Provides consistent error UI with icon, message, and optional retry action.
 * Use this for inline error states (not full-page errors).
 *
 * @example
 * ```tsx
 * {error ? (
 *   <ErrorState
 *     title="Failed to load deals"
 *     message={error.message}
 *     onRetry={() => refetch()}
 *   />
 * ) : (
 *   <DealsList deals={deals} />
 * )}
 * ```
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  errorStateClasses,
  errorStateIconClasses,
  errorStateTextClasses,
} from '@/lib/design-tokens';

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
  /** Custom icon (default: AlertCircle) */
  icon?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  icon,
}: ErrorStateProps) {
  return (
    <div className={cn(errorStateClasses, className)}>
      {/* Error Icon */}
      <div className="mb-4">
        {icon || <AlertCircle className={errorStateIconClasses} />}
      </div>

      {/* Error Text */}
      <div>
        <h3 className={errorStateTextClasses.title}>{title}</h3>
        {message && (
          <p className={errorStateTextClasses.description}>{message}</p>
        )}
      </div>

      {/* Retry Button */}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * InlineError - Compact error message for forms and inline errors
 *
 * Use this for form field errors or small inline errors.
 *
 * @example
 * ```tsx
 * {error && <InlineError message={error.message} />}
 * ```
 */
export function InlineError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 text-sm font-medium text-destructive',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
