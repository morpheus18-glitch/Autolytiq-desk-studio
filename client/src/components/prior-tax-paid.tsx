/**
 * Prior Tax Paid Component
 *
 * Collects information about tax previously paid in another state for reciprocity calculations.
 * Used in cross-state vehicle purchases where the customer may receive credit for tax already paid.
 */

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Receipt,
  CalendarIcon,
  MapPin,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllStates } from '@shared/tax-data';

export interface PriorTaxInfo {
  originState: string;
  amount: number;
  paidDate?: string; // ISO date string
}

interface PriorTaxPaidProps {
  value?: PriorTaxInfo | null;
  onChange: (value: PriorTaxInfo | null) => void;
  currentState: string; // The state where vehicle will be registered
  disabled?: boolean;
  className?: string;
}

export function PriorTaxPaid({
  value,
  onChange,
  currentState,
  disabled = false,
  className,
}: PriorTaxPaidProps) {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [originState, setOriginState] = useState(value?.originState || '');
  const [amount, setAmount] = useState(value?.amount?.toString() || '');
  const [paidDate, setPaidDate] = useState(value?.paidDate || '');

  const allStates = useMemo(() => getAllStates(), []);

  // Update parent when values change
  useEffect(() => {
    if (!isExpanded) {
      onChange(null);
      return;
    }

    if (originState && amount && parseFloat(amount) > 0) {
      onChange({
        originState,
        amount: parseFloat(amount),
        paidDate: paidDate || undefined,
      });
    } else {
      onChange(null);
    }
  }, [originState, amount, paidDate, isExpanded, onChange]);

  // Reset when collapsed
  const handleClear = () => {
    setOriginState('');
    setAmount('');
    setPaidDate('');
    setIsExpanded(false);
    onChange(null);
  };

  // Determine reciprocity status
  const reciprocityStatus = useMemo(() => {
    if (!originState || !currentState) {
      return { type: 'unknown', message: 'Select states to check reciprocity' };
    }

    if (originState === currentState) {
      return {
        type: 'same-state',
        message: 'Same state - no reciprocity needed',
      };
    }

    // Simplified reciprocity check - in production, this would query the backend
    // for state-specific reciprocity rules
    return {
      type: 'eligible',
      message: `May receive credit for tax paid in ${originState}. Credit subject to ${currentState} rules.`,
    };
  }, [originState, currentState]);

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={cn('w-full justify-start gap-2', className)}
      >
        <Receipt className="w-4 h-4" />
        Add Prior Tax Paid Information
        <ChevronDown className="w-4 h-4 ml-auto" />
      </Button>
    );
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold">Prior Tax Paid</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            disabled={disabled}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        If tax was already paid on this vehicle in another state, you may receive credit
        toward the tax owed in {currentState}.
      </p>

      {/* Origin State */}
      <div className="space-y-2">
        <Label htmlFor="origin-state" className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          State Where Tax Was Paid
        </Label>
        <Select
          value={originState}
          onValueChange={setOriginState}
          disabled={disabled}
        >
          <SelectTrigger id="origin-state">
            <SelectValue placeholder="Select state..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {allStates.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Amount Paid */}
      <div className="space-y-2">
        <Label htmlFor="tax-amount" className="flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5" />
          Tax Amount Paid
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="tax-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled}
            className="pl-7"
          />
        </div>
      </div>

      {/* Date Paid */}
      <div className="space-y-2">
        <Label htmlFor="paid-date" className="flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5" />
          Date Tax Was Paid
          <Badge variant="secondary" className="text-xs">
            Optional
          </Badge>
        </Label>
        <Input
          id="paid-date"
          type="date"
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
          disabled={disabled}
          max={new Date().toISOString().split('T')[0]}
        />
        <p className="text-xs text-muted-foreground">
          Some states require tax to have been paid within a certain timeframe (e.g., 90 days)
        </p>
      </div>

      {/* Reciprocity Status */}
      {originState && currentState && (
        <Alert
          className={cn(
            reciprocityStatus.type === 'eligible' &&
              'border-green-200 bg-green-50/50 dark:bg-green-950/20',
            reciprocityStatus.type === 'same-state' &&
              'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'
          )}
        >
          <div className="flex items-start gap-2">
            {reciprocityStatus.type === 'eligible' && (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            )}
            {reciprocityStatus.type === 'same-state' && (
              <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            )}
            {reciprocityStatus.type === 'unknown' && (
              <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
            )}
            <AlertDescription className="text-sm">
              {reciprocityStatus.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Warning about verification */}
      {value && value.amount > 0 && (
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            Proof of tax payment may be required. Keep your receipt or title showing tax paid.
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
