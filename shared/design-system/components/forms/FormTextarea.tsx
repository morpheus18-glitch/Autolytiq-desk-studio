import React, { forwardRef } from 'react';
import { cn } from '../../utils';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  textareaSize?: 'sm' | 'md' | 'lg';
}

/**
 * FormTextarea - Multi-line text input component with validation states
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   {...register('notes')}
 *   placeholder="Enter additional notes"
 *   rows={4}
 *   error={!!errors.notes}
 *   resize="vertical"
 * />
 * ```
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      error = false,
      resize = 'vertical',
      textareaSize = 'md',
      className = '',
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-4 py-3',
      lg: 'text-lg px-5 py-4',
    };

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const baseStyles = cn(
      'w-full rounded-md border transition-colors',
      'bg-white dark:bg-neutral-900',
      'text-neutral-900 dark:text-neutral-100',
      'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800'
    );

    const stateStyles = error
      ? 'border-error-300 dark:border-error-700 focus:border-error-500 focus:ring-error-500/20'
      : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20 hover:border-neutral-400 dark:hover:border-neutral-600';

    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          baseStyles,
          stateStyles,
          sizeStyles[textareaSize],
          resizeStyles[resize],
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = 'FormTextarea';
