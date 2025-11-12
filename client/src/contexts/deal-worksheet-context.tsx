import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { DealWithRelations, Vehicle, Customer } from '@shared/schema';

type WorksheetMode = 'quick' | 'full';

interface DraftDeal {
  vehicleId?: string;
  customerId?: string;
  vehicle?: Vehicle | null;
  customer?: Customer | null;
  salespersonId?: string;
}

interface DealWorksheetContextValue {
  mode: WorksheetMode;
  setMode: (mode: WorksheetMode) => void;
  deal: DealWithRelations | null;
  draftDeal: DraftDeal | null;
  isNew: boolean;
  isLoading: boolean;
  setDraftVehicle: (vehicleId: string | undefined) => void;
  setDraftCustomer: (customerId: string | undefined) => void;
  persistDeal: () => Promise<DealWithRelations>;
}

const DealWorksheetContext = createContext<DealWorksheetContextValue | null>(null);

interface DealWorksheetProviderProps {
  children: ReactNode;
  dealId?: string;
  initialMode?: WorksheetMode;
  vehicleId?: string;
  customerId?: string;
}

export function DealWorksheetProvider({
  children,
  dealId,
  initialMode = 'full',
  vehicleId,
  customerId,
}: DealWorksheetProviderProps) {
  const [mode, setMode] = useState<WorksheetMode>(initialMode);
  const [draftDeal, setDraftDeal] = useState<DraftDeal | null>(null);
  const isNew = !dealId;

  // Fetch existing deal if we have an ID
  const { data: deal, isLoading: dealLoading } = useQuery<DealWithRelations>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
  });

  // Fetch vehicle if provided in query params (for new deals)
  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: ['/api/vehicles', vehicleId],
    enabled: isNew && !!vehicleId,
  });

  // Fetch customer if provided in query params (for new deals)
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: isNew && !!customerId,
  });

  // Initialize draft deal for new deals
  useEffect(() => {
    if (isNew) {
      setDraftDeal({
        vehicleId,
        customerId,
        vehicle: vehicle || null,
        customer: customer || null,
      });
    }
  }, [isNew, vehicleId, customerId, vehicle, customer]);

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: DraftDeal) => {
      const response = await apiRequest('POST', '/api/deals', payload);
      return await response.json();
    },
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/stats'] });
      return newDeal;
    },
  });

  const setDraftVehicle = (newVehicleId: string | undefined) => {
    if (isNew) {
      setDraftDeal(prev => ({ ...prev, vehicleId: newVehicleId }));
    }
  };

  const setDraftCustomer = (newCustomerId: string | undefined) => {
    if (isNew) {
      setDraftDeal(prev => ({ ...prev, customerId: newCustomerId }));
    }
  };

  const persistDeal = async (): Promise<DealWithRelations> => {
    if (!isNew) {
      throw new Error('Cannot persist an existing deal');
    }
    if (!draftDeal) {
      throw new Error('No draft deal to persist');
    }
    return await createDealMutation.mutateAsync(draftDeal);
  };

  const isLoading = dealLoading || vehicleLoading || customerLoading;

  return (
    <DealWorksheetContext.Provider
      value={{
        mode,
        setMode,
        deal: deal || null,
        draftDeal,
        isNew,
        isLoading,
        setDraftVehicle,
        setDraftCustomer,
        persistDeal,
      }}
    >
      {children}
    </DealWorksheetContext.Provider>
  );
}

export function useDealWorksheet() {
  const context = useContext(DealWorksheetContext);
  if (!context) {
    throw new Error('useDealWorksheet must be used within a DealWorksheetProvider');
  }
  return context;
}
