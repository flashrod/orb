import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { normalizeSplitRatio, SplitPair } from '../lib/splitView';

interface SplitViewStore {
  tabIds: SplitPair | null;
  activePane: 0 | 1;
  ratio: number;
  open: (tabIds: SplitPair) => void;
  close: () => void;
  focusPane: (pane: 0 | 1) => void;
  replaceActiveTab: (tabId: string) => void;
  swap: () => void;
  setRatio: (ratio: number) => void;
  removeTab: (tabId: string) => void;
}

export const useSplitViewStore = create<SplitViewStore>()(persist((set) => ({
  tabIds: null,
  activePane: 0,
  ratio: 0.5,
  open: (tabIds) => set({ tabIds, activePane: 0 }),
  close: () => set({ tabIds: null, activePane: 0 }),
  focusPane: (activePane) => set({ activePane }),
  replaceActiveTab: (tabId) => set((state) => ({
    tabIds: state.tabIds ? state.tabIds.map((current, index) => index === state.activePane ? tabId : current) as SplitPair : null,
  })),
  swap: () => set((state) => ({ tabIds: state.tabIds ? [state.tabIds[1], state.tabIds[0]] : null, activePane: state.activePane === 0 ? 1 : 0, ratio: 1 - state.ratio })),
  setRatio: (ratio) => set({ ratio: normalizeSplitRatio(ratio) }),
  removeTab: (tabId) => set((state) => {
    if (!state.tabIds?.includes(tabId)) return state;
    return { tabIds: null, activePane: 0 };
  }),
}), {
  name: 'orb-split-view',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ tabIds: state.tabIds, activePane: state.activePane, ratio: state.ratio }),
}));
