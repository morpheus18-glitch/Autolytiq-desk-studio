import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Vehicle } from '@shared/schema';

interface QuickQuoteState {
  // Optional vehicle
  vehicle: Vehicle | null;
  vehiclePrice: number | null;
  
  // Desking inputs
  downPayment: number | null;
  tradeValue: number | null;
  tradePayoff: number | null;
  apr: number;
  termMonths: number;
  
  // Calculated result
  calculatedPayment: number | null;
  amountFinanced: number | null;
  
  // Persisted quote ID (set after saving to DB)
  savedQuoteId: string | null;
  
  // Actions
  setVehicle: (vehicle: Vehicle | null) => void;
  setVehiclePrice: (price: number | null) => void;
  setDownPayment: (amount: number | null) => void;
  setTradeValue: (value: number | null) => void;
  setTradePayoff: (payoff: number | null) => void;
  setApr: (apr: number) => void;
  setTermMonths: (months: number) => void;
  setCalculatedPayment: (payment: number, amountFinanced: number) => void;
  setSavedQuoteId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  vehicle: null,
  vehiclePrice: null,
  downPayment: null,
  tradeValue: null,
  tradePayoff: null,
  apr: 12.9,
  termMonths: 60,
  calculatedPayment: null,
  amountFinanced: null,
  savedQuoteId: null,
};

export const useQuickQuoteStore = create<QuickQuoteState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setVehicle: (vehicle) => set((state) => {
        state.vehicle = vehicle;
        if (vehicle) {
          state.vehiclePrice = Number(vehicle.price);
        }
      }),

      setVehiclePrice: (price) => set((state) => {
        state.vehiclePrice = price;
      }),

      setDownPayment: (amount) => set((state) => {
        state.downPayment = amount;
      }),

      setTradeValue: (value) => set((state) => {
        state.tradeValue = value;
      }),

      setTradePayoff: (payoff) => set((state) => {
        state.tradePayoff = payoff;
      }),

      setApr: (apr) => set((state) => {
        state.apr = Number(apr);
      }),

      setTermMonths: (months) => set((state) => {
        state.termMonths = Number(months);
      }),

      setCalculatedPayment: (payment, amountFinanced) => set((state) => {
        state.calculatedPayment = payment;
        state.amountFinanced = amountFinanced;
      }),

      setSavedQuoteId: (id) => set((state) => {
        state.savedQuoteId = id;
      }),

      reset: () => {
        set(initialState);
        // Clear persisted storage
        localStorage.removeItem('quick-quote-storage');
      },
    })),
    {
      name: 'quick-quote-storage',
      version: 2,
    }
  )
);
