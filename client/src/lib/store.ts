import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Store for auto-save and real-time state management
interface DeskingStore {
  // Auto-save tracking
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  
  // Active deal tracking
  activeDealId: string | null;
  activeScenarioId: string | null;
  
  // UI state
  sidebarCollapsed: boolean;
  auditTrailOpen: boolean;
  
  // Actions
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setSaveError: (error: string | null) => void;
  setActiveDealId: (id: string | null) => void;
  setActiveScenarioId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleAuditTrail: () => void;
}

export const useStore = create<DeskingStore>()(
  immer((set) => ({
    // Initial state
    isSaving: false,
    lastSaved: null,
    saveError: null,
    activeDealId: null,
    activeScenarioId: null,
    sidebarCollapsed: false,
    auditTrailOpen: false,
    
    // Actions
    setIsSaving: (saving) => set({ isSaving: saving }),
    setLastSaved: (date) => set({ lastSaved: date, isSaving: false, saveError: null }),
    setSaveError: (error) => set({ saveError: error, isSaving: false }),
    setActiveDealId: (id) => set({ activeDealId: id }),
    setActiveScenarioId: (id) => set({ activeScenarioId: id }),
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; }),
    toggleAuditTrail: () => set((state) => { state.auditTrailOpen = !state.auditTrailOpen; }),
  }))
);
