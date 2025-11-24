import React, { forwardRef } from 'react';
import { cn } from '../../utils';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: FormSelectOption[];
  error?: boolean;
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

/**
 * FormSelect - Select dropdown component with validation states
 *
 * @example
 * ```tsx
 * <FormSelect
 *   {...register('role')}
 *   options={[
 *     { value: 'admin', label: 'Administrator' },
 *     { value: 'manager', label: 'Manager' },
 *     { value: 'salesperson', label: 'Salesperson' }
 *   ]}
 *   placeholder="Select a role"
 *   error={!!errors.role}
 * />
 * ```
 */
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { options, error = false, placeholder, selectSize = 'md', className = '', disabled, ...props },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-9 text-sm px-3 pr-9',
      md: 'h-10 text-base px-4 pr-10',
      lg: 'h-12 text-lg px-5 pr-12',
    };

    const baseStyles = cn(
      'w-full rounded-md border transition-colors',
      'bg-white dark:bg-neutral-900',
      'text-neutral-900 dark:text-neutral-100',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
      'appearance-none cursor-pointer'
    );

    const stateStyles = error
      ? 'border-error-300 dark:border-error-700 focus:border-error-500 focus:ring-error-500/20'
      : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20 hover:border-neutral-400 dark:hover:border-neutral-600';

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(baseStyles, stateStyles, sizeStyles[selectSize], className)}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-600">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
