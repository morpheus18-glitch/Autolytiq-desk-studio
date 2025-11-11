import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { DealScenario } from '@shared/schema';
import Decimal from 'decimal.js';

interface ScenarioComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: DealScenario[];
}

export function ScenarioComparisonModal({
  open,
  onOpenChange,
  scenarios,
}: ScenarioComparisonModalProps) {
  const [scenario1Id, setScenario1Id] = useState<string>('');
  const [scenario2Id, setScenario2Id] = useState<string>('');

  // Hydrate scenario selections when scenarios load or change
  useEffect(() => {
    if (scenarios.length >= 2) {
      // Only update if current selections are invalid
      const validScenarioIds = scenarios.map(s => s.id);
      if (!scenario1Id || !validScenarioIds.includes(scenario1Id)) {
        setScenario1Id(scenarios[0].id);
      }
      if (!scenario2Id || !validScenarioIds.includes(scenario2Id)) {
        setScenario2Id(scenarios[1].id);
      }
    }
  }, [scenarios, scenario1Id, scenario2Id]);

  const scenario1 = scenarios.find(s => s.id === scenario1Id);
  const scenario2 = scenarios.find(s => s.id === scenario2Id);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  };

  const calculateDiff = (val1: string | number, val2: string | number) => {
    const num1 = new Decimal(typeof val1 === 'string' ? val1 : val1.toString());
    const num2 = new Decimal(typeof val2 === 'string' ? val2 : val2.toString());
    return num2.minus(num1).toNumber();
  };

  const renderDiffBadge = (diff: number, inverse = false) => {
    if (Math.abs(diff) < 0.01) return null;
    
    const isBetter = inverse ? diff < 0 : diff > 0;
    const Icon = diff > 0 ? TrendingUp : TrendingDown;
    const variant = isBetter ? 'default' : 'destructive';
    const colorClass = isBetter ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : '';
    
    return (
      <Badge variant={variant} className={`text-xs font-mono ml-2 ${colorClass}`}>
        <Icon className="w-3 h-3 mr-1" />
        {formatCurrency(Math.abs(diff))}
      </Badge>
    );
  };

  const ComparisonRow = ({ 
    label, 
    value1, 
    value2, 
    formatter = formatCurrency,
    inverse = false 
  }: {
    label: string;
    value1: string | number;
    value2: string | number;
    formatter?: (val: string | number) => string;
    inverse?: boolean;
  }) => {
    const diff = calculateDiff(value1, value2);
    const hasDiff = Math.abs(diff) >= 0.01;
    
    const highlightClass = hasDiff
      ? 'bg-yellow-500/5 dark:bg-yellow-500/10 border-l-2 border-l-yellow-500/50 pl-3 -ml-3'
      : '';
    
    return (
      <div className={`grid grid-cols-3 gap-4 py-3 border-b last:border-b-0 ${highlightClass}`}>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-sm font-mono text-right ${hasDiff ? 'font-medium' : ''}`}>
          {formatter(value1)}
        </div>
        <div className={`text-sm font-mono text-right flex items-center justify-end ${hasDiff ? 'font-medium' : ''}`}>
          {formatter(value2)}
          {renderDiffBadge(diff, inverse)}
        </div>
      </div>
    );
  };

  // Show guidance if scenarios aren't ready yet
  if (!scenario1 || !scenario2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare Scenarios</DialogTitle>
            <DialogDescription>
              {scenarios.length < 2 
                ? 'Create at least two scenarios to use the comparison feature.'
                : 'Loading scenarios...'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const tradeEquity1 = new Decimal(scenario1.tradeAllowance || 0)
    .minus(new Decimal(scenario1.tradePayoff || 0))
    .toNumber();
  const tradeEquity2 = new Decimal(scenario2.tradeAllowance || 0)
    .minus(new Decimal(scenario2.tradePayoff || 0))
    .toNumber();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Scenarios</DialogTitle>
          <DialogDescription>
            Select two scenarios to see how they differ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scenario Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Scenario</label>
              <Select value={scenario1Id} onValueChange={setScenario1Id}>
                <SelectTrigger data-testid="select-scenario-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem 
                      key={s.id} 
                      value={s.id}
                      disabled={s.id === scenario2Id}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Second Scenario</label>
              <Select value={scenario2Id} onValueChange={setScenario2Id}>
                <SelectTrigger data-testid="select-scenario-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem 
                      key={s.id} 
                      value={s.id}
                      disabled={s.id === scenario1Id}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="grid grid-cols-3 gap-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Metric
                </CardTitle>
                <CardTitle className="text-sm font-medium text-right">
                  {scenario1.name}
                </CardTitle>
                <CardTitle className="text-sm font-medium text-right">
                  {scenario2.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              <ComparisonRow
                label="Vehicle Price"
                value1={scenario1.vehiclePrice || 0}
                value2={scenario2.vehiclePrice || 0}
              />
              <ComparisonRow
                label="Down Payment"
                value1={scenario1.downPayment || 0}
                value2={scenario2.downPayment || 0}
              />
              <ComparisonRow
                label="Trade Equity"
                value1={tradeEquity1}
                value2={tradeEquity2}
              />
              <ComparisonRow
                label="APR"
                value1={scenario1.apr ?? 0}
                value2={scenario2.apr ?? 0}
                formatter={formatPercent}
                inverse
              />
              <ComparisonRow
                label="Term"
                value1={scenario1.term || 0}
                value2={scenario2.term || 0}
                formatter={(val) => `${val} months`}
              />
              <ComparisonRow
                label="Amount Financed"
                value1={scenario1.amountFinanced || 0}
                value2={scenario2.amountFinanced || 0}
              />
              <ComparisonRow
                label="Monthly Payment"
                value1={scenario1.monthlyPayment || 0}
                value2={scenario2.monthlyPayment || 0}
                inverse
              />
              <ComparisonRow
                label="Total Cost"
                value1={scenario1.totalCost || 0}
                value2={scenario2.totalCost || 0}
                inverse
              />
              <ComparisonRow
                label="Cash Due at Signing"
                value1={scenario1.cashDueAtSigning || 0}
                value2={scenario2.cashDueAtSigning || 0}
                inverse
              />
            </CardContent>
          </Card>

          {/* Fee & Product Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{scenario1.name} - Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <div>Dealer Fees: {Array.isArray(scenario1.dealerFees) ? scenario1.dealerFees.length : 0} items</div>
                  <div>Accessories: {Array.isArray(scenario1.accessories) ? scenario1.accessories.length : 0} items</div>
                  <div>Aftermarket: {Array.isArray(scenario1.aftermarketProducts) ? scenario1.aftermarketProducts.length : 0} items</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{scenario2.name} - Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <div>Dealer Fees: {Array.isArray(scenario2.dealerFees) ? scenario2.dealerFees.length : 0} items</div>
                  <div>Accessories: {Array.isArray(scenario2.accessories) ? scenario2.accessories.length : 0} items</div>
                  <div>Aftermarket: {Array.isArray(scenario2.aftermarketProducts) ? scenario2.aftermarketProducts.length : 0} items</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
