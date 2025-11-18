import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapCostBreakdownProps {
  grossCapCost: number;
  totalCapReductions: number;
  adjustedCapCost: number;
  // Breakdown items
  sellingPrice?: number;
  acquisitionFee?: number;
  docFee?: number;
  capitalizedDealerFees?: number;
  capitalizedGovFees?: number;
  capitalizedAccessories?: number;
  capitalizedProducts?: number;
  // Reductions breakdown
  cashDown?: number;
  tradeEquity?: number;
  manufacturerRebate?: number;
  otherIncentives?: number;
  className?: string;
}

export function CapCostBreakdown({
  grossCapCost,
  totalCapReductions,
  adjustedCapCost,
  sellingPrice,
  acquisitionFee,
  docFee,
  capitalizedDealerFees,
  capitalizedGovFees,
  capitalizedAccessories,
  capitalizedProducts,
  cashDown = 0,
  tradeEquity = 0,
  manufacturerRebate = 0,
  otherIncentives = 0,
  className,
}: CapCostBreakdownProps) {
  const [showGrossBreakdown, setShowGrossBreakdown] = useState(false);
  const [showReductionsBreakdown, setShowReductionsBreakdown] = useState(false);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Gross Cap Cost */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Gross Capitalized Cost
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGrossBreakdown(!showGrossBreakdown)}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
          >
            {showGrossBreakdown ? (
              <>Hide <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>Show breakdown <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </div>
        <div className="text-3xl font-bold text-blue-900 tabular-nums">
          ${grossCapCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* Gross Breakdown */}
        {showGrossBreakdown && (
          <div className="mt-3 pt-3 border-t border-blue-200 space-y-1.5 text-xs">
            {sellingPrice !== undefined && sellingPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selling Price</span>
                <span className="font-medium tabular-nums">${sellingPrice.toLocaleString()}</span>
              </div>
            )}
            {acquisitionFee !== undefined && acquisitionFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acquisition Fee</span>
                <span className="font-medium tabular-nums">${acquisitionFee.toLocaleString()}</span>
              </div>
            )}
            {docFee !== undefined && docFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doc Fee</span>
                <span className="font-medium tabular-nums">${docFee.toLocaleString()}</span>
              </div>
            )}
            {capitalizedDealerFees !== undefined && capitalizedDealerFees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dealer Fees</span>
                <span className="font-medium tabular-nums">${capitalizedDealerFees.toLocaleString()}</span>
              </div>
            )}
            {capitalizedGovFees !== undefined && capitalizedGovFees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gov Fees</span>
                <span className="font-medium tabular-nums">${capitalizedGovFees.toLocaleString()}</span>
              </div>
            )}
            {capitalizedAccessories !== undefined && capitalizedAccessories > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accessories</span>
                <span className="font-medium tabular-nums">${capitalizedAccessories.toLocaleString()}</span>
              </div>
            )}
            {capitalizedProducts !== undefined && capitalizedProducts > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">F&I Products</span>
                <span className="font-medium tabular-nums">${capitalizedProducts.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reductions */}
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Cap Cost Reductions
          </div>
          {(cashDown > 0 || tradeEquity !== 0 || manufacturerRebate > 0 || otherIncentives > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReductionsBreakdown(!showReductionsBreakdown)}
              className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
            >
              {showReductionsBreakdown ? (
                <>Hide <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Details <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>
        <div className="text-3xl font-bold text-green-900 tabular-nums">
          -${totalCapReductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* Reductions Breakdown */}
        {showReductionsBreakdown && (
          <div className="mt-3 pt-3 border-t border-green-200 space-y-1.5 text-xs">
            {cashDown > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Down</span>
                <span className="font-medium tabular-nums">${cashDown.toLocaleString()}</span>
              </div>
            )}
            {tradeEquity > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trade Equity</span>
                <span className="font-medium tabular-nums">${tradeEquity.toLocaleString()}</span>
              </div>
            )}
            {tradeEquity < 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Negative Equity</span>
                <span className="font-medium tabular-nums">(${Math.abs(tradeEquity).toLocaleString()})</span>
              </div>
            )}
            {manufacturerRebate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rebates</span>
                <span className="font-medium tabular-nums">${manufacturerRebate.toLocaleString()}</span>
              </div>
            )}
            {otherIncentives > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other Incentives</span>
                <span className="font-medium tabular-nums">${otherIncentives.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjusted Cap Cost - The Key Number */}
      <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Adjusted Capitalized Cost
        </div>
        <div className="text-4xl font-bold text-purple-900 tabular-nums">
          ${adjustedCapCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          This is the basis of your lease payment
        </div>
      </div>
    </div>
  );
}
