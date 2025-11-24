import React, { forwardRef } from 'react';
import { cn } from '../../utils';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

/**
 * FormInput - Text input component with validation states and icons
 *
 * @example
 * ```tsx
 * <FormInput
 *   {...register('email')}
 *   type="email"
 *   placeholder="Enter your email"
 *   error={!!errors.email}
 *   leftIcon={<MailIcon />}
 * />
 * ```
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    { error = false, leftIcon, rightIcon, inputSize = 'md', className = '', disabled, ...props },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-9 text-sm px-3',
      md: 'h-10 text-base px-4',
      lg: 'h-12 text-lg px-5',
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

    const paddingStyles = cn(leftIcon && 'pl-10', rightIcon && 'pr-10');

    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          className={cn(baseStyles, stateStyles, sizeStyles[inputSize], paddingStyles, className)}
          disabled={disabled}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
