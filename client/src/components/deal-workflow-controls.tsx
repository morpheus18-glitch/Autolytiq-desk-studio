import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import type { DealWithRelations } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useScenarioForm } from '@/contexts/scenario-form-context';

interface DealWorkflowControlsProps {
  deal: DealWithRelations;
  activeScenarioId: string;
}

type ValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

const DEAL_STATE_CONFIG = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    nextState: 'IN_PROGRESS' as const,
    nextLabel: 'Start Deal',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    nextState: 'APPROVED' as const,
    nextLabel: 'Approve Deal',
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    nextState: null,
    nextLabel: null,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-destructive/10 text-destructive',
    nextState: null,
    nextLabel: null,
  },
};

export function DealWorkflowControls({ deal, activeScenarioId }: DealWorkflowControlsProps) {
  const { toast } = useToast();
  const { scenario: liveScenario } = useScenarioForm();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  
  const updateStateMutation = useMutation({
    mutationFn: async (newState: string) => {
      return await apiRequest('PATCH', `/api/deals/${deal.id}`, { dealState: newState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', deal.id] });
      toast({
        title: 'Deal updated',
        description: 'Deal status has been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update deal status',
        variant: 'destructive',
      });
    },
  });

  const validateDeal = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    // Use live scenario data from ScenarioFormContext (includes unsaved changes)
    // Fall back to server data if context isn't available
    const scenario = liveScenario || deal.scenarios.find(s => s.id === activeScenarioId) || deal.scenarios[0];
    
    // Customer validation
    if (!deal.customer) {
      issues.push({
        field: 'Customer',
        message: 'Customer must be selected',
        severity: 'error',
      });
    } else if (!deal.customer.email && !deal.customer.phone) {
      issues.push({
        field: 'Customer Contact',
        message: 'Email or phone number required',
        severity: 'error',
      });
    }
    
    // Vehicle validation - only error when trying to approve, warning otherwise
    if (!deal.vehicle?.vin) {
      issues.push({
        field: 'Vehicle VIN',
        message: deal.vehicle ? 'VIN is required for final approval' : 'Vehicle must be selected',
        severity: deal.dealState === 'IN_PROGRESS' ? 'error' : 'warning',
      });
    }
    
    // Pricing validation
    if (!scenario?.vehiclePrice || parseFloat(scenario.vehiclePrice) <= 0) {
      issues.push({
        field: 'Vehicle Price',
        message: 'Valid vehicle price required',
        severity: 'error',
      });
    }
    
    // Finance validation (if not cash deal)
    if (scenario?.scenarioType !== 'CASH_DEAL') {
      if (!scenario?.term || scenario.term <= 0) {
        issues.push({
          field: 'Term',
          message: 'Finance term must be set',
          severity: 'error',
        });
      }
      
      if (scenario?.scenarioType === 'FINANCE_DEAL' && (!scenario?.apr || parseFloat(scenario.apr) < 0)) {
        issues.push({
          field: 'APR',
          message: 'APR must be set for finance deals',
          severity: 'error',
        });
      }
      
      if (scenario?.scenarioType === 'LEASE_DEAL') {
        if (!scenario?.moneyFactor || parseFloat(scenario.moneyFactor) <= 0) {
          issues.push({
            field: 'Money Factor',
            message: 'Money factor required for lease',
            severity: 'error',
          });
        }
        if (!scenario?.residualValue || parseFloat(scenario.residualValue) <= 0) {
          issues.push({
            field: 'Residual Value',
            message: 'Residual value required for lease',
            severity: 'error',
          });
        }
      }
    }
    
    // Tax jurisdiction validation
    if (!scenario?.taxJurisdictionId) {
      issues.push({
        field: 'Tax Jurisdiction',
        message: 'Tax jurisdiction must be selected',
        severity: 'error',
      });
    }
    
    return issues;
  };

  const handleAdvance = () => {
    const issues = validateDeal();
    const errors = issues.filter(i => i.severity === 'error');
    
    if (errors.length > 0) {
      setValidationOpen(true);
      return;
    }
    
    const config = DEAL_STATE_CONFIG[deal.dealState as keyof typeof DEAL_STATE_CONFIG];
    if (config.nextState) {
      updateStateMutation.mutate(config.nextState);
    }
  };

  const handleCancel = () => {
    updateStateMutation.mutate('CANCELLED');
    setCancelDialogOpen(false);
  };

  const config = DEAL_STATE_CONFIG[deal.dealState as keyof typeof DEAL_STATE_CONFIG];
  const validationIssues = validateDeal();
  const hasErrors = validationIssues.some(i => i.severity === 'error');
  const canAdvance = config.nextState && !hasErrors;

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </div>
            <Badge className={config.color} data-testid="badge-deal-status">
              {config.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {deal.dealState !== 'CANCELLED' && deal.dealState !== 'APPROVED' && (
              <Popover open={validationOpen} onOpenChange={setValidationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setValidationOpen(true)}
                    data-testid="button-validation-checklist"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Checklist
                    {validationIssues.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                        {validationIssues.filter(i => i.severity === 'error').length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Deal Checklist</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setValidationOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {validationIssues.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        All requirements met
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {validationIssues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted"
                          >
                            {issue.severity === 'error' ? (
                              <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{issue.field}</div>
                              <div className="text-xs text-muted-foreground">{issue.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {config.nextState && (
              <Button
                size="sm"
                onClick={handleAdvance}
                disabled={!canAdvance || updateStateMutation.isPending}
                data-testid="button-advance-deal"
              >
                {config.nextLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {deal.dealState !== 'CANCELLED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                disabled={updateStateMutation.isPending}
                data-testid="button-cancel-deal"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the deal as cancelled. You can still view it, but it won't be editable.
              This action can be reversed by your manager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Deal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
