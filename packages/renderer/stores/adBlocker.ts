import { create } from 'zustand';

interface AdBlockerStore {
  enabled: boolean;
  ruleCount: number;
  toggle: () => void;
  setRuleCount: (count: number) => void;
}

export const useAdBlockerStore = create<AdBlockerStore>((set) => ({
  enabled: true,
  ruleCount: 0,
  toggle: () => set((state: AdBlockerStore) => ({ enabled: !state.enabled })),
  setRuleCount: (count: number) => set({ ruleCount: count }),
}));
