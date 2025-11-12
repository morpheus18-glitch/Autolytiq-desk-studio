/**
 * Tax Breakdown Component
 * Displays detailed tax calculation breakdown for automotive sales
 * Features glassmorphic card styling and real-time updates
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calculator, 
  Info, 
  TrendingDown, 
  Receipt, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Zap,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/lib/tax-calculator';
import type { TaxCalculationResult } from '@/lib/tax-calculator';
import { useValueTransition } from '@/hooks/use-value-transition';

interface TaxBreakdownProps {
  taxResult: TaxCalculationResult | null;
  className?: string;
  showDetails?: boolean;
  loading?: boolean;
}

export function TaxBreakdown({ taxResult, className, showDetails = true, loading = false }: TaxBreakdownProps) {
  // Animate value changes for better UX
  const animatedTotalTax = useValueTransition(taxResult?.totalTax || 0);
  const animatedTotalFees = useValueTransition(taxResult?.totalFees || 0);
  const animatedGrandTotal = useValueTransition(taxResult?.totalTaxAndFees || 0);
  const animatedTaxSavings = useValueTransition(taxResult?.tradeInTaxSavings || 0);
  
  const hasTradeInSavings = taxResult && taxResult.tradeInTaxSavings > 0;
  const hasEVIncentive = taxResult && taxResult.evIncentive > 0;
  const hasWarnings = taxResult && taxResult.warnings && taxResult.warnings.length > 0;
  const hasNotes = taxResult && taxResult.notes && taxResult.notes.length > 0;
  
  if (loading) {
    return (
      <Card className={cn("backdrop-blur-sm bg-card/50", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 animate-pulse" />
            <CardTitle>Calculating Tax & Fees...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!taxResult) {
    return (
      <Card className={cn("backdrop-blur-sm bg-card/50", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Tax & Fees</CardTitle>
          </div>
          <CardDescription>Select a state to calculate taxes</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tax calculation requires state and vehicle price information
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("backdrop-blur-sm bg-card/50 border-border/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Tax & Fees Breakdown</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono tabular-nums" data-testid="text-effective-rate">
            {formatPercentage(taxResult.effectiveTaxRate)} Rate
          </Badge>
        </div>
        <CardDescription>
          Taxable Amount: {formatCurrency(taxResult.taxableAmount)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tax Components */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">State Tax</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatPercentage(taxResult.stateTaxRate)}
                    </span>
                    <span 
                      className="font-mono tabular-nums font-semibold"
                      data-testid="text-state-tax"
                    >
                      {formatCurrency(taxResult.stateTax)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatPercentage(taxResult.stateTaxRate)} of {formatCurrency(taxResult.taxableAmount)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {taxResult.localTax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Local Tax</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatPercentage(taxResult.localTaxRate)}
                      </span>
                      <span 
                        className="font-mono tabular-nums font-semibold"
                        data-testid="text-local-tax"
                      >
                        {formatCurrency(taxResult.localTax)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>County/City tax at {formatPercentage(taxResult.localTaxRate)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {taxResult.luxuryTax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                Luxury Tax
              </span>
              <span 
                className="font-mono tabular-nums font-semibold text-yellow-600 dark:text-yellow-400"
                data-testid="text-luxury-tax"
              >
                {formatCurrency(taxResult.luxuryTax)}
              </span>
            </div>
          )}
          
          {taxResult.taxCapApplied && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Tax Cap Applied
              </span>
              <span className="font-mono tabular-nums font-semibold text-green-600 dark:text-green-400">
                Capped at {formatCurrency(taxResult.taxCapAmount!)}
              </span>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Total Tax */}
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Tax</span>
          <span 
            className="font-mono tabular-nums text-lg font-bold"
            data-testid="text-total-tax"
          >
            {formatCurrency(animatedTotalTax)}
          </span>
        </div>
        
        <Separator />
        
        {/* Fees */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Title Fee</span>
            <span 
              className="font-mono tabular-nums"
              data-testid="text-title-fee"
            >
              {formatCurrency(taxResult.titleFee)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Registration Fee</span>
            <span 
              className="font-mono tabular-nums"
              data-testid="text-registration-fee"
            >
              {formatCurrency(taxResult.registrationFee)}
            </span>
          </div>
          
          {taxResult.docFeeTax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Doc Fee Tax</span>
              <span 
                className="font-mono tabular-nums"
                data-testid="text-doc-fee-tax"
              >
                {formatCurrency(taxResult.docFeeTax)}
              </span>
            </div>
          )}
          
          {taxResult.evAdditionalFee > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Car className="h-3 w-3 text-blue-500" />
                EV Registration Fee
              </span>
              <span 
                className="font-mono tabular-nums"
                data-testid="text-ev-fee"
              >
                {formatCurrency(taxResult.evAdditionalFee)}
              </span>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Total Fees */}
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Fees</span>
          <span 
            className="font-mono tabular-nums text-lg font-bold"
            data-testid="text-total-fees"
          >
            {formatCurrency(animatedTotalFees)}
          </span>
        </div>
        
        {/* Credits and Incentives */}
        {(hasTradeInSavings || hasEVIncentive) && (
          <>
            <Separator />
            <div className="space-y-2">
              {hasTradeInSavings && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-green-500" />
                    Trade-In Tax Savings
                  </span>
                  <span 
                    className="font-mono tabular-nums text-green-600 dark:text-green-400 font-semibold"
                    data-testid="text-trade-savings"
                  >
                    -{formatCurrency(animatedTaxSavings)}
                  </span>
                </div>
              )}
              
              {hasEVIncentive && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    EV Incentive
                  </span>
                  <span 
                    className="font-mono tabular-nums text-green-600 dark:text-green-400 font-semibold"
                    data-testid="text-ev-incentive"
                  >
                    -{formatCurrency(taxResult.evIncentive)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        
        <Separator className="my-4" />
        
        {/* Grand Total */}
        <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Total Tax & Fees</span>
          </div>
          <span 
            className="font-mono tabular-nums text-2xl font-bold text-primary"
            data-testid="text-grand-total"
          >
            {formatCurrency(animatedGrandTotal)}
          </span>
        </div>
        
        {/* Detailed Breakdown (optional) */}
        {showDetails && taxResult.breakdown.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Detailed Breakdown</h4>
              {taxResult.breakdown.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm"
                  data-testid={`text-breakdown-${index}`}
                >
                  <span className="text-muted-foreground flex items-center gap-1">
                    {item.type === 'tax' && <DollarSign className="h-3 w-3" />}
                    {item.type === 'fee' && <Receipt className="h-3 w-3" />}
                    {item.type === 'credit' && <TrendingDown className="h-3 w-3 text-green-500" />}
                    {item.type === 'incentive' && <Zap className="h-3 w-3 text-green-500" />}
                    {item.label}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span 
                          className={cn(
                            "font-mono tabular-nums",
                            item.amount < 0 && "text-green-600 dark:text-green-400"
                          )}
                        >
                          {item.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.amount))}
                        </span>
                      </TooltipTrigger>
                      {item.description && (
                        <TooltipContent>
                          <p>{item.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Warnings and Notes */}
        {(hasWarnings || hasNotes) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              {hasWarnings && taxResult.warnings.map((warning, index) => (
                <Alert key={index} className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {warning}
                  </AlertDescription>
                </Alert>
              ))}
              
              {hasNotes && taxResult.notes.map((note, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                  data-testid={`text-note-${index}`}
                >
                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}