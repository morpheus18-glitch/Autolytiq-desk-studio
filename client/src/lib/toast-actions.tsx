import { ToastAction } from "@/components/ui/toast";
import { Undo2, ExternalLink, RefreshCw } from "lucide-react";

/**
 * Toast Action Builders for common patterns
 * 
 * These helpers create pre-styled ToastAction components for:
 * - Undo operations
 * - View/navigate to created items
 * - Retry failed operations
 * 
 * Example usage:
 * ```
 * toast({
 *   title: 'Scenario deleted',
 *   description: 'Scenario removed from deal',
 *   variant: 'destructive',
 *   action: createUndoAction(() => restoreScenario(id))
 * })
 * ```
 */

interface ActionBuilderProps {
  onClick: () => void;
  label?: string;
}

/**
 * Creates an "Undo" action button for delete/destructive operations
 */
export function createUndoAction({ onClick, label = "Undo" }: ActionBuilderProps) {
  return (
    <ToastAction 
      altText={label} 
      onClick={onClick}
      data-testid="button-toast-undo"
    >
      <Undo2 className="w-3 h-3 mr-1.5" />
      {label}
    </ToastAction>
  );
}

/**
 * Creates a "View" action button for navigation to created items
 */
export function createViewAction({ onClick, label = "View" }: ActionBuilderProps) {
  return (
    <ToastAction 
      altText={label} 
      onClick={onClick}
      data-testid="button-toast-view"
    >
      <ExternalLink className="w-3 h-3 mr-1.5" />
      {label}
    </ToastAction>
  );
}

/**
 * Creates a "Retry" action button for failed operations
 */
export function createRetryAction({ onClick, label = "Retry" }: ActionBuilderProps) {
  return (
    <ToastAction 
      altText={label} 
      onClick={onClick}
      data-testid="button-toast-retry"
    >
      <RefreshCw className="w-3 h-3 mr-1.5" />
      {label}
    </ToastAction>
  );
}

/**
 * Rich toast helpers with smart defaults
 */

interface RichToastOptions {
  title: string;
  description?: string;
  action?: React.ReactElement;
  duration?: number;
}

/**
 * Shows a success toast with optional action
 */
export function showSuccessToast(
  toast: (options: any) => void,
  options: RichToastOptions
) {
  return toast({
    variant: 'success',
    duration: options.duration ?? 4000,
    ...options
  });
}

/**
 * Shows an error toast with optional retry action
 */
export function showErrorToast(
  toast: (options: any) => void,
  options: RichToastOptions & { onRetry?: () => void }
) {
  const action = options.onRetry 
    ? createRetryAction({ onClick: options.onRetry })
    : options.action;

  return toast({
    variant: 'destructive',
    duration: options.duration ?? 8000, // Errors stay longer
    ...options,
    action
  });
}

/**
 * Shows an info toast
 */
export function showInfoToast(
  toast: (options: any) => void,
  options: RichToastOptions
) {
  return toast({
    variant: 'info',
    duration: options.duration ?? 5000,
    ...options
  });
}

/**
 * Shows a warning toast
 */
export function showWarningToast(
  toast: (options: any) => void,
  options: RichToastOptions
) {
  return toast({
    variant: 'warning',
    duration: options.duration ?? 6000,
    ...options
  });
}
