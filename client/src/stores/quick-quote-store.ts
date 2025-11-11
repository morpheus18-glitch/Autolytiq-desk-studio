import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Vehicle, TradeVehicle } from '@shared/schema';

export type QuickQuoteStep = 
  | 'vehicle'
  | 'budget'
  | 'down-payment'
  | 'trade-question'
  | 'trade-details'
  | 'result';

interface QuickQuoteState {
  // Current wizard step
  currentStep: QuickQuoteStep;
  
  // Selected data
  vehicle: Vehicle | null;
  targetPayment: number | null;
  downPayment: number | null;
  hasTrade: boolean | null;
  tradeValue: number | null;
  tradePayoff: number | null;
  
  // Calculated result
  calculatedPayment: number | null;
  apr: number;
  termMonths: number;
  amountFinanced: number | null;
  
  // Persisted quote ID (set after saving to DB)
  savedQuoteId: string | null;
  
  // Actions
  setStep: (step: QuickQuoteStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  setVehicle: (vehicle: Vehicle) => void;
  setTargetPayment: (amount: number | null) => void;
  setDownPayment: (amount: number | null) => void;
  setHasTrade: (hasTrade: boolean) => void;
  setTradeValue: (value: number | null) => void;
  setTradePayoff: (payoff: number | null) => void;
  setCalculatedPayment: (payment: number, apr: number, termMonths: number, amountFinanced: number) => void;
  setSavedQuoteId: (id: string | null) => void;
  reset: () => void;
}

const stepOrder: QuickQuoteStep[] = [
  'vehicle',
  'budget',
  'down-payment',
  'trade-question',
  'trade-details',
  'result'
];

const initialState = {
  currentStep: 'vehicle' as QuickQuoteStep,
  vehicle: null,
  targetPayment: null,
  downPayment: null,
  hasTrade: null,
  tradeValue: null,
  tradePayoff: null,
  calculatedPayment: null,
  apr: 12.9,
  termMonths: 60,
  amountFinanced: null,
  savedQuoteId: null,
};

export const useQuickQuoteStore = create<QuickQuoteState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      setStep: (step) => set((state) => {
        state.currentStep = step;
      }),

      nextStep: () => set((state) => {
        const current = state.currentStep;
        const currentIndex = stepOrder.indexOf(current);
        
        // Skip trade-details if no trade
        if (current === 'trade-question' && !state.hasTrade) {
          state.currentStep = 'result';
        } else if (currentIndex < stepOrder.length - 1) {
          state.currentStep = stepOrder[currentIndex + 1];
        }
      }),

      previousStep: () => set((state) => {
        const current = state.currentStep;
        const currentIndex = stepOrder.indexOf(current);
        
        // Skip trade-details when going back if no trade
        if (current === 'result' && !state.hasTrade) {
          state.currentStep = 'trade-question';
        } else if (currentIndex > 0) {
          state.currentStep = stepOrder[currentIndex - 1];
        }
      }),

      setVehicle: (vehicle) => set((state) => {
        state.vehicle = vehicle;
      }),

      setTargetPayment: (amount) => set((state) => {
        state.targetPayment = amount;
      }),

      setDownPayment: (amount) => set((state) => {
        state.downPayment = amount;
      }),

      setHasTrade: (hasTrade) => set((state) => {
        state.hasTrade = hasTrade;
        if (!hasTrade) {
          state.tradeValue = null;
          state.tradePayoff = null;
        }
      }),

      setTradeValue: (value) => set((state) => {
        state.tradeValue = value;
      }),

      setTradePayoff: (payoff) => set((state) => {
        state.tradePayoff = payoff;
      }),

      setCalculatedPayment: (payment, apr, termMonths, amountFinanced) => set((state) => {
        state.calculatedPayment = payment;
        state.apr = apr;
        state.termMonths = termMonths;
        state.amountFinanced = amountFinanced;
      }),

      setSavedQuoteId: (id) => set((state) => {
        state.savedQuoteId = id;
      }),

      reset: () => set(initialState),
    })),
    {
      name: 'quick-quote-storage',
      version: 1,
    }
  )
);