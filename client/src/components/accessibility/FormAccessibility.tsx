/**
 * Accessible Form Components
 *
 * Form components with built-in accessibility features:
 * - Proper label associations (htmlFor/id)
 * - Error announcements via aria-describedby
 * - Required field indicators
 * - Focus management
 *
 * WCAG 2.1 Success Criteria:
 * - 1.3.1 Info and Relationships
 * - 2.4.6 Headings and Labels
 * - 3.3.1 Error Identification
 * - 3.3.2 Labels or Instructions
 */

import {
  forwardRef,
  useId,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Accessible Form Field Wrapper
// ============================================================================

interface AccessibleFormFieldProps {
  /** Field label text */
  label: string;
  /** Optional description/help text */
  description?: string;
  /** Error message (if any) */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Form input element */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom ID override (auto-generated if not provided) */
  id?: string;
}

export function AccessibleFormField({
  label,
  description,
  error,
  required = false,
  children,
  className,
  id: customId,
}: AccessibleFormFieldProps) {
  const generatedId = useId();
  const id = customId || `field-${generatedId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      <div className="relative">
        {/* Clone children and inject accessibility props */}
        {typeof children === 'object' && children !== null && 'props' in children
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (() => {
              const child = children as React.ReactElement<any>;
              return {
                ...child,
                props: {
                  ...child.props,
                  id,
                  'aria-required': required || undefined,
                  'aria-invalid': error ? 'true' : undefined,
                  'aria-describedby': [
                    description ? descriptionId : null,
                    error ? errorId : null,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
                },
              };
            })()
          : children}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <span className="h-1 w-1 rounded-full bg-destructive" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Accessible Input
// ============================================================================

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state */
  error?: boolean;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-destructive focus:ring-destructive'
            : 'border-input',
          className
        )}
        {...props}
      />
    );
  }
);
AccessibleInput.displayName = 'AccessibleInput';

// ============================================================================
// Accessible Select
// ============================================================================

interface AccessibleSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visual error state */
  error?: boolean;
  /** Select options */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Placeholder option text */
  placeholder?: string;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-destructive focus:ring-destructive'
            : 'border-input',
          className
        )}
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
    );
  }
);
AccessibleSelect.displayName = 'AccessibleSelect';

// ============================================================================
// Accessible Textarea
// ============================================================================

interface AccessibleTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visual error state */
  error?: boolean;
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y min-h-[80px]',
          error
            ? 'border-destructive focus:ring-destructive'
            : 'border-input',
          className
        )}
        {...props}
      />
    );
  }
);
AccessibleTextarea.displayName = 'AccessibleTextarea';

// ============================================================================
// Form Accessibility Hook
// ============================================================================

interface UseFormAccessibilityOptions {
  /** Form ID prefix */
  formId?: string;
}

interface FormFieldAccessibility {
  /** Get props for a form field */
  getFieldProps: (fieldName: string, options?: {
    required?: boolean;
    error?: string;
    description?: string;
  }) => {
    id: string;
    'aria-required'?: 'true';
    'aria-invalid'?: 'true';
    'aria-describedby'?: string;
  };
  /** Get props for a label */
  getLabelProps: (fieldName: string) => {
    htmlFor: string;
  };
  /** Get props for an error message */
  getErrorProps: (fieldName: string) => {
    id: string;
    role: 'alert';
  };
  /** Get props for a description */
  getDescriptionProps: (fieldName: string) => {
    id: string;
  };
}

/**
 * Hook for managing form accessibility attributes
 */
export function useFormAccessibility(
  options: UseFormAccessibilityOptions = {}
): FormFieldAccessibility {
  const baseId = useId();
  const formId = options.formId || `form-${baseId}`;

  const getFieldId = (fieldName: string) => `${formId}-${fieldName}`;
  const getDescriptionId = (fieldName: string) => `${formId}-${fieldName}-description`;
  const getErrorId = (fieldName: string) => `${formId}-${fieldName}-error`;

  return {
    getFieldProps: (fieldName, fieldOptions = {}) => {
      const describedByParts: string[] = [];
      if (fieldOptions.description) {
        describedByParts.push(getDescriptionId(fieldName));
      }
      if (fieldOptions.error) {
        describedByParts.push(getErrorId(fieldName));
      }

      return {
        id: getFieldId(fieldName),
        'aria-required': fieldOptions.required ? 'true' : undefined,
        'aria-invalid': fieldOptions.error ? 'true' : undefined,
        'aria-describedby': describedByParts.length > 0 ? describedByParts.join(' ') : undefined,
      };
    },
    getLabelProps: (fieldName) => ({
      htmlFor: getFieldId(fieldName),
    }),
    getErrorProps: (fieldName) => ({
      id: getErrorId(fieldName),
      role: 'alert' as const,
    }),
    getDescriptionProps: (fieldName) => ({
      id: getDescriptionId(fieldName),
    }),
  };
}
