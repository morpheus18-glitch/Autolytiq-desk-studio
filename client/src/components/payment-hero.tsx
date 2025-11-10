import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

interface PaymentHeroProps {
  monthlyPayment: string | number;
  apr: string | number;
  term: number;
  downPayment?: string | number;
  amountFinanced?: string | number;
  totalCost?: string | number;
  totalTaxFees?: string | number;
  onAprChange?: (apr: number) => void;
  onTermChange?: (term: number) => void;
  className?: string;
  alwaysExpanded?: boolean;
}

export function PaymentHero({
  monthlyPayment,
  apr,
  term,
  downPayment,
  amountFinanced,
  totalCost,
  totalTaxFees,
  onAprChange,
  onTermChange,
  className,
  alwaysExpanded = false,
}: PaymentHeroProps) {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);
  const [aprValue, setAprValue] = useState(Number(apr));
  const [termValue, setTermValue] = useState(term);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const prevPaymentRef = useRef(monthlyPayment);

  // Sync APR/term state with props
  useEffect(() => {
    setAprValue(Number(apr));
  }, [apr]);

  useEffect(() => {
    setTermValue(term);
  }, [term]);

  // Pulse animation when payment changes
  useEffect(() => {
    if (prevPaymentRef.current !== monthlyPayment && prevPaymentRef.current !== undefined) {
      setPulseAnimation(true);
      const timer = setTimeout(() => {
        setPulseAnimation(false);
      }, 600);
      prevPaymentRef.current = monthlyPayment;
      return () => clearTimeout(timer);
    }
    prevPaymentRef.current = monthlyPayment;
  }, [monthlyPayment]);

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null) return '$0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleToggle = () => {
    if (!alwaysExpanded) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleAprChange = (values: number[]) => {
    setAprValue(values[0]);
  };

  const handleAprCommit = (values: number[]) => {
    onAprChange?.(values[0]);
  };

  const termOptions = [24, 36, 48, 60, 72, 84];
  
  // Find closest term option or use current term
  const getTermIndex = (termVal: number) => {
    const idx = termOptions.indexOf(termVal);
    if (idx !== -1) return idx;
    // Find closest option
    const closest = termOptions.reduce((prev, curr) =>
      Math.abs(curr - termVal) < Math.abs(prev - termVal) ? curr : prev
    );
    return termOptions.indexOf(closest);
  };

  const handleTermChange = (values: number[]) => {
    setTermValue(termOptions[values[0]]);
  };

  const handleTermCommit = (values: number[]) => {
    onTermChange?.(termOptions[values[0]]);
  };

  return (
      <Card 
        className={cn(
          "overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-xl transition-all duration-300",
          isExpanded && "shadow-2xl",
          pulseAnimation && "animate-pulse-glow"
        )}
        data-testid="payment-hero"
      >
      {/* Hero Payment Display */}
      <div
        className={cn(
          "p-6 md:p-8 cursor-pointer transition-colors",
          !alwaysExpanded && "hover-elevate"
        )}
        onClick={handleToggle}
        data-testid="payment-hero-header"
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Monthly Payment
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span 
              className="text-5xl md:text-6xl font-bold text-primary font-mono tabular-nums transition-smooth"
              data-testid="text-monthly-payment"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatCurrency(monthlyPayment)}
            </span>
            <span className="text-2xl md:text-3xl text-muted-foreground">/mo</span>
          </div>
          {!alwaysExpanded && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0" 
              data-testid="button-toggle-payment-details"
              aria-expanded={isExpanded}
              aria-controls="payment-breakdown"
              aria-label={isExpanded ? "Collapse payment details" : "Expand payment details"}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{Number(apr).toFixed(2)}% APR</span>
          <span>•</span>
          <span>{term} months</span>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div 
          id="payment-breakdown"
          className="border-t bg-card/50 p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {/* Deal Summary */}
          <div className="grid grid-cols-2 gap-4">
            {downPayment !== undefined && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Down Payment
                </div>
                <div 
                  className="text-xl font-bold font-mono tabular-nums text-foreground"
                  data-testid="text-down-payment"
                >
                  {formatCurrency(downPayment)}
                </div>
              </div>
            )}
            {amountFinanced !== undefined && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Amount Financed
                </div>
                <div 
                  className="text-xl font-bold font-mono tabular-nums text-primary"
                  data-testid="text-amount-financed"
                >
                  {formatCurrency(amountFinanced)}
                </div>
              </div>
            )}
            {totalTaxFees !== undefined && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Total Tax & Fees
                </div>
                <div 
                  className="text-xl font-bold font-mono tabular-nums text-foreground"
                  data-testid="text-total-tax-fees"
                >
                  {formatCurrency(totalTaxFees)}
                </div>
              </div>
            )}
            {totalCost !== undefined && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Total Cost
                </div>
                <div 
                  className="text-xl font-bold font-mono tabular-nums text-foreground"
                  data-testid="text-total-cost"
                >
                  {formatCurrency(totalCost)}
                </div>
              </div>
            )}
          </div>

          {/* Quick Adjusters */}
          {(onAprChange || onTermChange) && (
            <div className="space-y-5 pt-4 border-t">
              <div className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Adjust Terms
              </div>

              {/* APR Slider */}
              {onAprChange && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">APR</label>
                    <span className="text-lg font-bold font-mono tabular-nums text-primary">
                      {aprValue.toFixed(2)}%
                    </span>
                  </div>
                  <Slider
                    value={[aprValue]}
                    onValueChange={handleAprChange}
                    onValueCommit={handleAprCommit}
                    min={0}
                    max={20}
                    step={0.25}
                    className="w-full"
                    data-testid="slider-apr"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>20%</span>
                  </div>
                </div>
              )}

              {/* Term Slider */}
              {onTermChange && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">Term</label>
                    <span className="text-lg font-bold font-mono tabular-nums text-primary">
                      {termValue} mo
                    </span>
                  </div>
                  <Slider
                    value={[getTermIndex(termValue)]}
                    onValueChange={handleTermChange}
                    onValueCommit={handleTermCommit}
                    min={0}
                    max={termOptions.length - 1}
                    step={1}
                    className="w-full"
                    data-testid="slider-term"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {termOptions.map((option, idx) => (
                      <span key={option} className={cn(idx % 2 === 1 && "hidden sm:inline")}>
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
