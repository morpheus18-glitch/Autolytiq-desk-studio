import { forwardRef, useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, value, onChange, placeholder = "0", className, testId }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      if (value === null || value === 0) {
        setDisplayValue("");
      } else {
        setDisplayValue(value.toLocaleString("en-US"));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, "");
      
      if (rawValue === "") {
        setDisplayValue("");
        onChange(null);
        return;
      }

      const numericValue = parseInt(rawValue, 10);
      setDisplayValue(numericValue.toLocaleString("en-US"));
      onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={testId} className="text-base font-medium">
          {label}
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
          <Input
            ref={ref}
            id={testId}
            type="text"
            inputMode="numeric"
            pattern="[0-9,]*"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="min-h-[56px] pl-12 pr-6 text-2xl font-semibold text-center"
            data-testid={testId}
          />
        </div>
      </div>
    );
  }
);

MoneyInput.displayName = "MoneyInput";