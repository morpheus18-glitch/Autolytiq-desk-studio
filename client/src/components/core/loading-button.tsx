/**
 * LoadingButton - Button with integrated loading state
 *
 * Extends the standard Button component with loading state handling.
 * Automatically disables the button and shows a spinner when loading.
 *
 * @example
 * ```tsx
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   loadingText="Saving..."
 *   onClick={handleSubmit}
 * >
 *   Save Deal
 * </LoadingButton>
 * ```
 */

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LoadingButtonProps extends ButtonProps {
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Optional text to show while loading (default: same as children) */
  loadingText?: string;
  /** Icon to show while loading (default: spinner) */
  loadingIcon?: ReactNode;
}

export function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  loadingIcon,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      className={cn(isLoading && 'cursor-not-allowed', className)}
    >
      {isLoading && (
        <>
          {loadingIcon || <Loader2 className="w-4 h-4 animate-spin" />}
          {loadingText || children}
        </>
      )}
      {!isLoading && children}
    </Button>
  );
}
