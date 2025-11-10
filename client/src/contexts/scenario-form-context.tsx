import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useStore } from '@/lib/store';
import type { DealScenario, TradeVehicle, TaxJurisdictionWithRules, AftermarketProduct } from '@shared/schema';
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

interface ScenarioFormContextValue {
  scenario: DealScenario;
  tradeVehicle: TradeVehicle | null;
  taxJurisdiction: TaxJurisdictionWithRules | null;
  
  // Update methods
  updateField: (field: keyof DealScenario, value: any) => void;
  updateMultipleFields: (updates: Partial<DealScenario>) => void;
  updateAftermarketProducts: (products: AftermarketProduct[]) => void;
  
  // Calculated values
  calculations: {
    sellingPrice: Decimal;
    tradeAllowance: Decimal;
    tradePayoff: Decimal;
    tradeEquity: Decimal;
    downPayment: Decimal;
    rebates: Decimal;
    totalFees: Decimal;
    totalTax: Decimal;
    amountFinanced: Decimal;
    monthlyPayment: Decimal;
    totalCost: Decimal;
    aftermarketTotal: Decimal;
  };
  
  // Auto-save state
  isSaving: boolean;
  lastSaved: Date | null;
}

const ScenarioFormContext = createContext<ScenarioFormContextValue | null>(null);

interface ScenarioFormProviderProps {
  scenario: DealScenario;
  tradeVehicle?: TradeVehicle | null;
  taxJurisdiction?: TaxJurisdictionWithRules | null;
  dealId: string;
  children: ReactNode;
}

export function ScenarioFormProvider({ 
  scenario: initialScenario, 
  tradeVehicle = null,
  taxJurisdiction = null,
  dealId,
  children 
}: ScenarioFormProviderProps) {
  const [scenario, setScenario] = useState<DealScenario>(initialScenario);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  // Use selector to ONLY get the function, not subscribe to state changes
  const setAutoSaveStatus = useStore(state => state.setAutoSaveStatus);
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const scenarioIdRef = useRef<string>(initialScenario.id);
  
  // Sync with server updates intelligently
  useEffect(() => {
    const isScenarioSwitch = initialScenario.id !== scenarioIdRef.current;
    const hasNoEdits = dirtyFields.size === 0;
    
    if (isScenarioSwitch) {
      // True scenario switch: cancel pending save, reset everything
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      setScenario(initialScenario);
      setDirtyFields(new Set());
      setAutoSaveStatus('idle');
      scenarioIdRef.current = initialScenario.id;
    } else if (hasNoEdits) {
      // Same scenario, no edits: adopt server updates (e.g., after auto-save)
      setScenario(initialScenario);
    }
    // Same scenario WITH edits: preserve user input, ignore server refetch
  }, [initialScenario, dirtyFields, setAutoSaveStatus]);
  
  // Auto-save mutation using existing infrastructure
  const { mutate: saveScenario, isPending: isSaving } = useMutation({
    mutationFn: async (updates: Partial<DealScenario>) => {
      return apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${scenario.id}`, updates);
    },
    onMutate: () => {
      setAutoSaveStatus('saving');
    },
    onSuccess: () => {
      setAutoSaveStatus('saved');
      setDirtyFields(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
    },
    onError: () => {
      setAutoSaveStatus('error');
    },
  });
  
  // Debounced auto-save with dirty tracking
  useEffect(() => {
    if (dirtyFields.size === 0) return;
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    setAutoSaveStatus('pending');
    saveTimerRef.current = setTimeout(() => {
      if (scenario.id && dirtyFields.size > 0) {
        // Only save changed fields
        const updates: Partial<DealScenario> = {};
        dirtyFields.forEach(field => {
          const key = field as keyof DealScenario;
          updates[key] = scenario[key] as any;
        });
        saveScenario(updates);
      }
    }, 1000);
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
    };
  }, [scenario, dirtyFields, saveScenario, setAutoSaveStatus]);
  
  // Cleanup on unmount - cancel any pending saves
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);
  
  // Calculate all derived values with memoization
  const calculations = useMemo(() => {
    const sellingPrice = new Decimal(scenario.vehiclePrice || 0);
    const tradeAllowance = new Decimal(scenario.tradeAllowance || 0);
    const tradePayoff = new Decimal(scenario.tradePayoff || 0);
    const downPayment = new Decimal(scenario.downPayment || 0);
    const rebates = new Decimal(0); // TODO: Add rebates field to schema
    const totalFees = new Decimal(scenario.totalFees || 0);
    const totalTax = new Decimal(scenario.totalTax || 0);
    
    // Aftermarket products total
    const aftermarketProducts = (scenario.aftermarketProducts || []) as AftermarketProduct[];
    const aftermarketTotal = aftermarketProducts.reduce(
      (sum, product) => sum.plus(new Decimal(product.price || 0)),
      new Decimal(0)
    );
    
    // Trade equity
    const tradeEquity = tradeAllowance.minus(tradePayoff);
    
    // Amount Financed = (Vehicle + Tax + Fees + Aftermarket + Payoff) - (Down + Rebates + Trade Allowance)
    const amountFinanced = sellingPrice
      .plus(totalTax)
      .plus(totalFees)
      .plus(aftermarketTotal)
      .plus(tradePayoff)
      .minus(downPayment)
      .minus(rebates)
      .minus(tradeAllowance);
    
    // Monthly Payment calculation (simplified - actual would use APR)
    const term = new Decimal(scenario.term || 60);
    // Parse APR safely - handle empty strings, null, undefined, and invalid inputs
    const aprValue = scenario.apr && scenario.apr.toString().trim() !== '' 
      ? parseFloat(scenario.apr.toString()) 
      : 0;
    const apr = new Decimal(isNaN(aprValue) ? 0 : aprValue).dividedBy(100);
    
    let monthlyPayment = new Decimal(0);
    if (scenario.scenarioType === 'FINANCE_DEAL' && term.greaterThan(0)) {
      if (apr.greaterThan(0)) {
        const monthlyRate = apr.dividedBy(12);
        const power = monthlyRate.plus(1).pow(term);
        monthlyPayment = amountFinanced
          .times(monthlyRate)
          .times(power)
          .dividedBy(power.minus(1));
      } else {
        monthlyPayment = amountFinanced.dividedBy(term);
      }
    } else if (scenario.scenarioType === 'LEASE_DEAL' && term.greaterThan(0)) {
      // Simplified lease calculation
      const residualValueStr = scenario.residualValue?.toString().trim() || '0';
      const residualValue = new Decimal(parseFloat(residualValueStr) || 0);
      const moneyFactorStr = scenario.moneyFactor?.toString().trim() || '0.00125';
      const moneyFactor = new Decimal(parseFloat(moneyFactorStr) || 0.00125);
      const depreciation = amountFinanced.minus(residualValue).dividedBy(term);
      const finance = amountFinanced.plus(residualValue).times(moneyFactor);
      monthlyPayment = depreciation.plus(finance);
    }
    
    // Total cost
    const totalCost = downPayment
      .plus(monthlyPayment.times(term))
      .plus(new Decimal(scenario.cashDueAtSigning || 0));
    
    return {
      sellingPrice,
      tradeAllowance,
      tradePayoff,
      tradeEquity,
      downPayment,
      rebates,
      totalFees,
      totalTax,
      amountFinanced,
      monthlyPayment,
      totalCost,
      aftermarketTotal,
    };
  }, [scenario]);
  
  const updateField = useCallback((field: keyof DealScenario, value: any) => {
    setScenario(prev => ({ ...prev, [field]: value }));
    setDirtyFields(prev => new Set(prev).add(field as string));
  }, []);
  
  const updateMultipleFields = useCallback((updates: Partial<DealScenario>) => {
    setScenario(prev => ({ ...prev, ...updates }));
    setDirtyFields(prev => {
      const next = new Set(prev);
      Object.keys(updates).forEach(key => next.add(key));
      return next;
    });
  }, []);
  
  const updateAftermarketProducts = useCallback((products: AftermarketProduct[]) => {
    setScenario(prev => ({ ...prev, aftermarketProducts: products as any }));
    setDirtyFields(prev => new Set(prev).add('aftermarketProducts'));
  }, []);
  
  const value: ScenarioFormContextValue = {
    scenario,
    tradeVehicle,
    taxJurisdiction,
    updateField,
    updateMultipleFields,
    updateAftermarketProducts,
    calculations,
    isSaving,
    lastSaved: null, // Auto-save status now managed by useStore
  };
  
  return (
    <ScenarioFormContext.Provider value={value}>
      {children}
    </ScenarioFormContext.Provider>
  );
}

export function useScenarioForm() {
  const context = useContext(ScenarioFormContext);
  if (!context) {
    throw new Error('useScenarioForm must be used within ScenarioFormProvider');
  }
  return context;
}
