interface AdBlockerStore {
  enabled: boolean;
  ruleCount: number;
  toggle: () => void;
  setRuleCount: (count: number) => void;
}

export const useAdBlockerStore = create<AdBlockerStore>((set) => ({
  enabled: true,
  ruleCount: 0,
  toggle: () => set((state) => ({ enabled: !state.enabled })),
  setRuleCount: (count) => set({ ruleCount: count }),
}));
