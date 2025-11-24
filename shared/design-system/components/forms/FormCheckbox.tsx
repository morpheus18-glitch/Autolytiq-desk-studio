import React, { forwardRef } from 'react';
import { cn } from '../../utils';

export interface FormCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: boolean;
  checkboxSize?: 'sm' | 'md' | 'lg';
}

/**
 * Size styles mapping for checkbox dimensions
 */
const SIZE_STYLES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

/**
 * Size styles mapping for label text size
 */
const LABEL_SIZE_STYLES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

/**
 * Get the border styles based on error state
 */
function getBorderStyles(error: boolean): string {
  return error
    ? 'border-error-300 dark:border-error-700'
    : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-500';
}

/**
 * Get the text color styles based on error state
 */
function getTextColorStyles(error: boolean): string {
  return error ? 'text-error-600 dark:text-error-400' : 'text-neutral-900 dark:text-neutral-100';
}

/**
 * Get the description color styles based on error state
 */
function getDescriptionColorStyles(error: boolean): string {
  return error ? 'text-error-600 dark:text-error-400' : 'text-neutral-600 dark:text-neutral-400';
}

/**
 * FormCheckbox - Checkbox input with label and description
 *
 * @example
 * ```tsx
 * <FormCheckbox
 *   {...register('agreeToTerms')}
 *   label="I agree to the terms and conditions"
 *   description="You must agree to continue"
 *   error={!!errors.agreeToTerms}
 * />
 * ```
 */
export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    { label, description, error = false, checkboxSize = 'md', className = '', disabled, ...props },
    ref
  ) => {
    const baseStyles = cn(
      'rounded border-2 transition-colors cursor-pointer',
      'text-primary-600 focus:ring-2 focus:ring-offset-0 focus:ring-primary-500/20',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    );

    const stateStyles = getBorderStyles(error);

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(baseStyles, stateStyles, SIZE_STYLES[checkboxSize], 'mt-0.5')}
          disabled={disabled}
          {...props}
        />

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                className={cn(
                  'block font-medium cursor-pointer',
                  LABEL_SIZE_STYLES[checkboxSize],
                  getTextColorStyles(error),
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className={cn(
                  'mt-1 text-sm',
                  getDescriptionColorStyles(error),
                  disabled && 'opacity-50'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
