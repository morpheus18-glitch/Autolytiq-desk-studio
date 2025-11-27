/**
 * Monthly Income Calculator Component
 *
 * Calculates gross monthly income based on various pay frequencies.
 * Supports hourly, weekly, bi-weekly, semi-monthly, monthly, and annual income types.
 * Similar to GM Financial's income calculation approach.
 */

import { useState, useCallback, useMemo, type JSX, type ChangeEvent } from 'react';
import { Calculator, DollarSign, Clock, Check } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  FormField,
  FormInput,
  FormSelect,
} from '@design-system';

/**
 * Income type enumeration
 */
export type IncomeType = 'hourly' | 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'annual';

/**
 * Income type configuration
 */
interface IncomeTypeConfig {
  label: string;
  description: string;
  multiplier: number;
  requiresHours?: boolean;
}

/**
 * Income type configurations with conversion factors to monthly
 *
 * Conversion formulas:
 * - Hourly: hours/week * hourly_rate * 52 weeks / 12 months
 * - Weekly: weekly * 52 / 12
 * - Bi-Weekly: bi-weekly * 26 / 12
 * - Semi-Monthly: semi-monthly * 2
 * - Monthly: direct (multiplier = 1)
 * - Annual: annual / 12
 */
const INCOME_TYPE_CONFIG: Record<IncomeType, IncomeTypeConfig> = {
  hourly: {
    label: 'Hourly',
    description: 'Pay rate per hour worked',
    multiplier: 52 / 12, // Will be multiplied by hours
    requiresHours: true,
  },
  weekly: {
    label: 'Weekly',
    description: 'Paid every week',
    multiplier: 52 / 12,
  },
  'bi-weekly': {
    label: 'Bi-Weekly',
    description: 'Paid every two weeks',
    multiplier: 26 / 12,
  },
  'semi-monthly': {
    label: 'Semi-Monthly',
    description: 'Paid twice per month',
    multiplier: 2,
  },
  monthly: {
    label: 'Monthly',
    description: 'Paid once per month',
    multiplier: 1,
  },
  annual: {
    label: 'Annual/Salary',
    description: 'Yearly salary',
    multiplier: 1 / 12,
  },
};

/**
 * Income type select options
 */
const INCOME_TYPE_OPTIONS = Object.entries(INCOME_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse currency input to number
 */
function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Component Props
 */
export interface MonthlyIncomeCalculatorProps {
  /**
   * Current monthly income value (if already set)
   */
  currentMonthlyIncome?: number;

  /**
   * Callback when user saves the calculated income
   */
  onSave: (monthlyIncome: number) => Promise<void>;

  /**
   * Whether the save operation is in progress
   */
  isSaving?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Monthly Income Calculator Component
 */
export function MonthlyIncomeCalculator({
  currentMonthlyIncome,
  onSave,
  isSaving = false,
  className = '',
}: MonthlyIncomeCalculatorProps): JSX.Element {
  // State
  const [incomeType, setIncomeType] = useState<IncomeType>('hourly');
  const [amount, setAmount] = useState<string>('');
  const [hoursPerWeek, setHoursPerWeek] = useState<string>('40');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get current income type config
  const currentConfig = INCOME_TYPE_CONFIG[incomeType];

  // Calculate monthly income
  const calculatedMonthlyIncome = useMemo(() => {
    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) return 0;

    if (currentConfig.requiresHours) {
      const hours = parseFloat(hoursPerWeek) || 0;
      return parsedAmount * hours * currentConfig.multiplier;
    }

    return parsedAmount * currentConfig.multiplier;
  }, [amount, hoursPerWeek, currentConfig]);

  // Handle income type change
  const handleIncomeTypeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setIncomeType(e.target.value as IncomeType);
    setSaveSuccess(false);
  }, []);

  // Handle amount change
  const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setSaveSuccess(false);
  }, []);

  // Handle hours change
  const handleHoursChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setHoursPerWeek(e.target.value);
    setSaveSuccess(false);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (calculatedMonthlyIncome <= 0) return;

    try {
      await onSave(calculatedMonthlyIncome);
      setSaveSuccess(true);
      // Reset success state after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Error handling is done by parent component
    }
  }, [calculatedMonthlyIncome, onSave]);

  // Get input label based on income type
  const getAmountLabel = (): string => {
    switch (incomeType) {
      case 'hourly':
        return 'Hourly Rate';
      case 'weekly':
        return 'Weekly Amount';
      case 'bi-weekly':
        return 'Bi-Weekly Amount';
      case 'semi-monthly':
        return 'Semi-Monthly Amount';
      case 'monthly':
        return 'Monthly Amount';
      case 'annual':
        return 'Annual Salary';
      default:
        return 'Amount';
    }
  };

  // Get calculation breakdown text
  const getCalculationBreakdown = (): string | null => {
    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) return null;

    const hours = parseFloat(hoursPerWeek) || 0;

    switch (incomeType) {
      case 'hourly':
        return `${formatCurrency(parsedAmount)}/hr x ${hours} hrs/wk x 52 wks / 12 mo`;
      case 'weekly':
        return `${formatCurrency(parsedAmount)}/wk x 52 wks / 12 mo`;
      case 'bi-weekly':
        return `${formatCurrency(parsedAmount)} x 26 pay periods / 12 mo`;
      case 'semi-monthly':
        return `${formatCurrency(parsedAmount)} x 2 pay periods/mo`;
      case 'monthly':
        return 'Direct monthly amount';
      case 'annual':
        return `${formatCurrency(parsedAmount)}/yr / 12 mo`;
      default:
        return null;
    }
  };

  const calculationBreakdown = getCalculationBreakdown();
  const hasValidCalculation = calculatedMonthlyIncome > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Monthly Income Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate gross monthly income for financing qualification
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Monthly Income Display */}
        {currentMonthlyIncome !== undefined && currentMonthlyIncome > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Current Monthly Income</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(currentMonthlyIncome)}
            </p>
          </div>
        )}

        {/* Income Type Selector */}
        <FormField label="Income Type">
          <FormSelect
            value={incomeType}
            onChange={handleIncomeTypeChange}
            options={INCOME_TYPE_OPTIONS}
          />
        </FormField>

        {/* Income Type Description */}
        <p className="text-xs text-muted-foreground">{currentConfig.description}</p>

        {/* Amount Input */}
        <FormField label={getAmountLabel()}>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="pl-9"
            />
          </div>
        </FormField>

        {/* Hours per Week (for hourly only) */}
        {currentConfig.requiresHours && (
          <FormField label="Hours per Week">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <FormInput
                type="number"
                value={hoursPerWeek}
                onChange={handleHoursChange}
                placeholder="40"
                min="1"
                max="168"
                className="pl-9"
              />
            </div>
          </FormField>
        )}

        {/* Calculation Breakdown */}
        {calculationBreakdown && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Calculation</p>
            <p className="text-sm text-foreground">{calculationBreakdown}</p>
          </div>
        )}

        {/* Result Display */}
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">Gross Monthly Income</p>
          <p className="text-2xl font-bold text-primary">
            {hasValidCalculation ? formatCurrency(calculatedMonthlyIncome) : '$0.00'}
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasValidCalculation || isSaving}
          className="w-full"
          icon={saveSuccess ? <Check className="h-4 w-4" /> : undefined}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved to Customer' : 'Add to Customer Profile'}
        </Button>

        {/* Success Message */}
        {saveSuccess && (
          <p className="text-center text-sm text-success">
            Monthly income has been saved to the customer profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default MonthlyIncomeCalculator;
