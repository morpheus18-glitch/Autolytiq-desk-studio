import React from 'react';
import { cn } from '../../utils';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * FormField - Wrapper component for form inputs with label, error, and help text
 *
 * @example
 * ```tsx
 * <FormField label="Email" error={errors.email?.message} required>
 *   <FormInput {...register('email')} />
 * </FormField>
 * ```
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helpText,
  required = false,
  htmlFor,
  className = '',
  children,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}

      {children}

      {error && (
        <p className="text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {!error && helpText && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{helpText}</p>
      )}
    </div>
  );
};
