import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, MoreVertical, Plus, Trash2, Check } from 'lucide-react';
import type { DealScenario } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import Decimal from 'decimal.js';
import { useOptimisticCreate, useOptimisticDelete, generateTempId } from '@/lib/optimistic-mutations';
import { createUndoAction, showSuccessToast, showErrorToast } from '@/lib/toast-actions';

interface ScenarioSelectorProps {
  dealId: string;
  scenarios: DealScenario[];
  activeScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
}

export function ScenarioSelector({
  dealId,
  scenarios,
  activeScenarioId,
  onScenarioChange,
}: ScenarioSelectorProps) {
  const { toast } = useToast();
  const { calculations } = useScenarioForm();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [deletedScenarioSnapshot, setDeletedScenarioSnapshot] = useState<DealScenario | null>(null);

  const createScenarioMutation = useOptimisticCreate<any, any>({
    queryKey: ['/api/deals', dealId],
    updateCache: (old, variables, tempId) => ({
      ...old,
      scenarios: [...(old?.scenarios || []), {
        ...variables,
        id: tempId,
        optimistic: true,
      }]
    }),
    mutationFn: async (scenarioData: any) => {
      const response = await apiRequest('POST', `/api/deals/${dealId}/scenarios`, scenarioData);
      return response.json();
    },
    onSuccess: (newScenario) => {
      onScenarioChange(newScenario.id);
      showSuccessToast(toast, {
        title: 'Scenario created',
        description: `${newScenario.name} is ready to configure.`,
      });
    },
    onError: () => {
      showErrorToast(toast, {
        title: 'Creation failed',
        description: 'Failed to create scenario. Please try again.',
      });
    },
  });

  const deleteScenarioMutation = useOptimisticDelete<void, string>({
    queryKey: ['/api/deals', dealId],
    updateCache: (old, scenarioId) => ({
      ...old,
      scenarios: old?.scenarios?.filter((s: DealScenario) => s.id !== scenarioId) || []
    }),
    mutationFn: async (scenarioId: string) => {
      await apiRequest('DELETE', `/api/deals/${dealId}/scenarios/${scenarioId}`);
    },
    onSuccess: (_, deletedScenarioId) => {
      if (scenarioToDelete === activeScenarioId && scenarios.length > 1) {
        const remainingScenario = scenarios.find(s => s.id !== scenarioToDelete);
        if (remainingScenario) {
          onScenarioChange(remainingScenario.id);
        }
      }
      
      const scenarioName = deletedScenarioSnapshot?.name || 'Scenario';
      
      toast({
        title: 'Scenario deleted',
        description: `${scenarioName} has been removed from this deal.`,
        variant: 'destructive',
        action: createUndoAction({
          onClick: () => {
            if (deletedScenarioSnapshot) {
              const restoreData = {
                ...deletedScenarioSnapshot,
                id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
              };
              createScenarioMutation.mutate(restoreData);
              setDeletedScenarioSnapshot(null);
            }
          }
        })
      });
      setDeleteDialogOpen(false);
      setScenarioToDelete(null);
    },
    onError: () => {
      showErrorToast(toast, {
        title: 'Delete failed',
        description: 'Failed to delete scenario. Please try again.',
        onRetry: () => {
          if (scenarioToDelete) {
            deleteScenarioMutation.mutate(scenarioToDelete);
          }
        }
      });
    },
  });

  const duplicateScenario = (scenario: DealScenario) => {
    const duplicateData = {
      ...scenario,
      name: `${scenario.name} (Copy)`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
    createScenarioMutation.mutate(duplicateData);
  };

  const createNewScenario = () => {
    const baseScenario = scenarios[0] || {};
    createScenarioMutation.mutate({
      dealId,
      scenarioType: 'FINANCE_DEAL',
      name: `Scenario ${scenarios.length + 1}`,
      vehiclePrice: baseScenario.vehiclePrice || '0',
      downPayment: baseScenario.downPayment || '0',
      apr: baseScenario.apr ?? '5.99', // Inherit APR from base scenario
      term: baseScenario.term || 60,
      moneyFactor: baseScenario.moneyFactor || '0.00125',
      residualValue: '0',
      residualPercent: '0',
      tradeAllowance: baseScenario.tradeAllowance || '0',
      tradePayoff: baseScenario.tradePayoff || '0',
      dealerFees: [],
      accessories: [],
      aftermarketProducts: [],
      taxJurisdictionId: baseScenario.taxJurisdictionId || null,
      totalTax: '0',
      totalFees: '0',
      amountFinanced: '0',
      monthlyPayment: '0',
      totalCost: '0',
      cashDueAtSigning: '0',
    });
  };

  const confirmDelete = (scenario: DealScenario) => {
    setScenarioToDelete(scenario.id);
    setDeletedScenarioSnapshot(scenario); // Capture full scenario before deletion
    setDeleteDialogOpen(true);
  };

  const getScenarioBadge = (scenario: DealScenario) => {
    if (scenario.scenarioType === 'FINANCE_DEAL') return 'Finance';
    if (scenario.scenarioType === 'LEASE_DEAL') return 'Lease';
    return 'Cash';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Scenarios</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={createNewScenario}
          disabled={createScenarioMutation.isPending}
          data-testid="button-add-scenario"
        >
          <Plus className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>

      <div className="space-y-2">
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeScenarioId;
          // Show live calculation for active scenario, server value for others
          const monthlyPayment = isActive 
            ? calculations.monthlyPayment.toNumber()
            : parseFloat(scenario.monthlyPayment || '0');
          
          return (
            <Card
              key={scenario.id}
              className={`p-3 cursor-pointer transition-all hover-elevate ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onScenarioChange(scenario.id)}
              data-testid={`card-scenario-${scenario.id}`}
              data-optimistic={(scenario as any).optimistic ? 'true' : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    <h4 className="font-medium text-sm truncate">{scenario.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {getScenarioBadge(scenario)}
                    </Badge>
                    {monthlyPayment > 0 && (
                      <span className="text-xs font-mono text-muted-foreground">
                        ${monthlyPayment.toFixed(2)}/mo
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      data-testid={`button-scenario-menu-${scenario.id}`}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateScenario(scenario);
                      }}
                      data-testid={`button-duplicate-scenario-${scenario.id}`}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {scenarios.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(scenario);
                          }}
                          className="text-destructive"
                          data-testid={`button-delete-scenario-${scenario.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scenario? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scenarioToDelete && deleteScenarioMutation.mutate(scenarioToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
