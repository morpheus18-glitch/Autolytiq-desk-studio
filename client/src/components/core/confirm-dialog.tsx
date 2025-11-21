/**
 * ConfirmDialog - Standard confirmation dialog
 *
 * Provides consistent confirmation UI for destructive or important actions.
 * Built on top of shadcn/ui AlertDialog with standardized styling.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Deal"
 *   description="Are you sure you want to delete this deal? This action cannot be undone."
 *   confirmText="Delete"
 *   confirmVariant="destructive"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 * ```
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingButton } from './loading-button';
import { ButtonProps } from '@/components/ui/button';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Confirm button variant (default: "default") */
  confirmVariant?: ButtonProps['variant'];
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
  /** Optional loading text for confirm button */
  loadingText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  isLoading = false,
  loadingText,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    // Don't close dialog automatically - let the parent control it
    // This allows the dialog to stay open during async operations
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <LoadingButton
            variant={confirmVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
            loadingText={loadingText}
            asChild
          >
            <AlertDialogAction type="button">
              {confirmText}
            </AlertDialogAction>
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * useConfirmDialog - Hook for managing confirm dialog state
 *
 * Simplifies confirm dialog usage with state management.
 *
 * @example
 * ```tsx
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = () => {
 *   confirm.open({
 *     title: "Delete Deal",
 *     description: "Are you sure?",
 *     onConfirm: async () => {
 *       await deleteDeal(id);
 *       confirm.close();
 *     },
 *   });
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     <ConfirmDialog {...confirm.props} />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>>({
    title: '',
    description: '',
    onConfirm: () => {},
  });

  return {
    open: (newConfig: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      setConfig(newConfig);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    props: {
      ...config,
      open: isOpen,
      onOpenChange: setIsOpen,
    },
  };
}

// Import React for the hook
import * as React from 'react';
