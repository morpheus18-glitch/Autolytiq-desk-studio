/**
 * Tax Breakdown Component
 * Displays detailed tax calculation breakdown using AutoTaxEngine
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Info, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/lib/tax-calculator';
import type { TaxCalculationResult } from '@/hooks/use-tax-calculation';
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
  const hasReciprocity = taxResult && taxResult.reciprocityCredit && taxResult.reciprocityCredit > 0;
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
          <CardDescription>Select a state and enter vehicle price to calculate taxes</CardDescription>
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
            <div className="flex items-center gap-2">
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
          </div>
          
          {taxResult.localTax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Local Tax</span>
              <div className="flex items-center gap-2">
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

        {/* Trade-In Savings */}
        {hasTradeInSavings && (
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Trade-In Tax Savings</span>
            </div>
            <span
              className="font-mono tabular-nums font-semibold"
              data-testid="text-trade-savings"
            >
              -{formatCurrency(taxResult.tradeInTaxSavings)}
            </span>
          </div>
        )}

        {/* Reciprocity Credit */}
        {hasReciprocity && (
          <>
            <div className="flex items-center justify-between text-green-600 dark:text-green-400">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">Reciprocity Credit</span>
              </div>
              <span
                className="font-mono tabular-nums font-semibold"
                data-testid="text-reciprocity-credit"
              >
                -{formatCurrency(taxResult.reciprocityCredit!)}
              </span>
            </div>

            {taxResult.taxAfterReciprocity !== undefined && (
              <div className="flex items-center justify-between bg-green-50/50 dark:bg-green-950/20 p-2 rounded-md border border-green-200 dark:border-green-900">
                <span className="font-semibold text-green-900 dark:text-green-100">Final Tax Due</span>
                <span
                  className="font-mono tabular-nums text-lg font-bold text-green-900 dark:text-green-100"
                  data-testid="text-tax-after-reciprocity"
                >
                  {formatCurrency(taxResult.taxAfterReciprocity)}
                </span>
              </div>
            )}
          </>
        )}

        <Separator />
        
        {/* Fees */}
        <div className="space-y-2">
          {taxResult.titleFee > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Title Fee</span>
              <span 
                className="font-mono tabular-nums"
                data-testid="text-title-fee"
              >
                {formatCurrency(taxResult.titleFee)}
              </span>
            </div>
          )}
          
          {taxResult.registrationFee > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Registration Fee</span>
              <span 
                className="font-mono tabular-nums"
                data-testid="text-registration-fee"
              >
                {formatCurrency(taxResult.registrationFee)}
              </span>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Fees</span>
            <span 
              className="font-mono tabular-nums text-lg font-bold"
              data-testid="text-total-fees"
            >
              {formatCurrency(animatedTotalFees)}
            </span>
          </div>
          
          <div className="flex items-center justify-between bg-primary/10 dark:bg-primary/20 p-3 rounded-lg border border-primary/20">
            <span className="font-bold text-lg">Grand Total</span>
            <span 
              className="font-mono tabular-nums text-2xl font-bold text-primary"
              data-testid="text-grand-total"
            >
              {formatCurrency(animatedGrandTotal)}
            </span>
          </div>
        </div>

        {/* Notes and Warnings */}
        {showDetails && (
          <>
            {hasWarnings && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {taxResult.warnings.map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {hasNotes && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {taxResult.notes.map((note, i) => (
                      <li key={i} className="text-sm">{note}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
