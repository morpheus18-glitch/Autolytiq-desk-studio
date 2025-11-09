import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { DealScenario } from '@shared/schema';

interface ScenarioComparisonProps {
  scenarios: DealScenario[];
  activeScenarioId: string;
}

export function ScenarioComparison({ scenarios, activeScenarioId }: ScenarioComparisonProps) {
  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Scenario Comparison</h3>
      
      {scenarios.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;
        
        return (
          <Card 
            key={scenario.id} 
            className={`p-4 space-y-3 ${isActive ? 'ring-2 ring-primary' : ''}`}
            data-testid={`card-scenario-${scenario.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{scenario.name}</h4>
                  {isActive && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      Active
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  {scenario.scenarioType.replace('_', ' ')}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Monthly Payment</span>
                <span className="text-lg font-mono font-semibold tabular-nums">
                  ${parseFloat(scenario.monthlyPayment as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Down Payment</span>
                <span className="text-sm font-mono tabular-nums">
                  ${parseFloat(scenario.downPayment as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Total Tax</span>
                <span className="text-sm font-mono tabular-nums">
                  ${parseFloat(scenario.totalTax as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Total Cost</span>
                <span className="text-sm font-mono tabular-nums font-semibold">
                  ${parseFloat(scenario.totalCost as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              {scenario.scenarioType === 'FINANCE_DEAL' && (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">APR</span>
                    <span className="text-sm font-mono tabular-nums">
                      {parseFloat(scenario.apr as any).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Term</span>
                    <span className="text-sm font-mono tabular-nums">
                      {scenario.term} months
                    </span>
                  </div>
                </>
              )}
              
              {scenario.scenarioType === 'LEASE_DEAL' && (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Money Factor</span>
                    <span className="text-sm font-mono tabular-nums">
                      {parseFloat(scenario.moneyFactor as any).toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Residual</span>
                    <span className="text-sm font-mono tabular-nums">
                      ${parseFloat(scenario.residualValue as any).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
