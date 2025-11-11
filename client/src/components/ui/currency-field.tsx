import { forwardRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidCurrencyInput, formatCurrencyOnBlur, parseCurrency } from "@/lib/currency";

interface CurrencyFieldProps {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
  disabled?: boolean;
  required?: boolean;
  showIcon?: boolean;
  error?: string;
}

/**
 * Currency input field following best practices for money inputs
 * - Uses type="text" with inputMode="decimal" for mobile keyboard
 * - Stores raw string while typing
 * - Validates with regex to prevent invalid input
 * - Formats to 2 decimals on blur
 * - Starts with empty string, not 0.00
 */
export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
  (
    {
      label,
      value,
      onChange,
      placeholder = "0.00",
      className,
      testId,
      disabled = false,
      required = false,
      showIcon = true,
      error,
    },
    ref
  ) => {
    // Keep raw string while typing (not formatted)
    const [displayValue, setDisplayValue] = useState<string>("");
    const [isFocused, setIsFocused] = useState(false);

    // Sync internal state when external value changes (but not while user is typing)
    useEffect(() => {
      if (!isFocused) {
        // Only clear when truly null/undefined, preserve zero
        if (value === null || value === undefined) {
          setDisplayValue("");
        } else {
          setDisplayValue(value.toFixed(2));
        }
      }
    }, [value, isFocused]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;

        // Allow only valid currency input patterns
        if (isValidCurrencyInput(next)) {
          setDisplayValue(next);

          // Parse and send to parent immediately (for real-time validation)
          const parsed = parseCurrency(next);
          onChange(parsed);
        }
      },
      [onChange]
    );

    const handleBlur = useCallback(() => {
      setIsFocused(false);

      // Format to 2 decimals on blur
      if (displayValue === "") {
        onChange(null);
        return;
      }

      const formatted = formatCurrencyOnBlur(displayValue);
      setDisplayValue(formatted);

      const parsed = parseCurrency(formatted);
      onChange(parsed);
    }, [displayValue, onChange]);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        e.target.select(); // Select all on focus for easy editing
      },
      []
    );

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor={testId} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          {showIcon && (
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
          <Input
            ref={ref}
            id={testId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            aria-label={label || "Currency amount"}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "font-mono tabular-nums",
              showIcon && "pl-9",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            data-testid={testId}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

CurrencyField.displayName = "CurrencyField";
