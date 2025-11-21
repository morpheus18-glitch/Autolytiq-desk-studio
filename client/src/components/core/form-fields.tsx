/**
 * Enhanced Form Field Components
 * ===============================
 *
 * Pre-configured form fields with built-in validation and formatting.
 * All components work with react-hook-form and shadcn/ui form components.
 *
 * @example
 * ```tsx
 * <Form {...form}>
 *   <EmailField name="email" label="Email Address" required />
 *   <PhoneField name="phone" label="Phone Number" />
 *   <CurrencyField name="price" label="Vehicle Price" />
 * </Form>
 * ```
 */

import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// =============================================================================
// Base Field Component
// =============================================================================

interface BaseFieldProps<TFieldValues extends FieldValues> {
  /** react-hook-form form instance */
  form: UseFormReturn<TFieldValues>;
  /** Field name (must match schema) */
  name: Path<TFieldValues>;
  /** Field label */
  label: string;
  /** Optional description/helper text */
  description?: string;
  /** Whether field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Email Field
// =============================================================================

export function EmailField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = 'email@example.com',
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="email"
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="email"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Phone Field
// =============================================================================

export function PhoneField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = '(555) 123-4567',
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="tel"
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="tel"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Currency Field
// =============================================================================

export function CurrencyField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = '$0.00',
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');

    // Parse and format as currency
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(number);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                {...field}
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                className="pl-7"
                value={field.value ? formatCurrency(String(field.value)) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                  field.onChange(cleaned ? parseFloat(cleaned) : '');
                }}
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Percentage Field
// =============================================================================

export function PercentageField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = '0.00',
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                type="number"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                step="0.01"
                min="0"
                max="100"
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Number Field
// =============================================================================

interface NumberFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
}

export function NumberField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = '0',
  disabled,
  className,
  min,
  max,
  step = 1,
}: NumberFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Text Field
// =============================================================================

export function TextField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder,
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="text"
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// Password Field
// =============================================================================

export function PasswordField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  placeholder = '••••••••',
  disabled,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="password"
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="new-password"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
