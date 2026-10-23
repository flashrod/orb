import { create } from 'zustand';

export interface Boost {
  id: string;
  domain: string;
  css: string;
  js: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface BoostStore {
  boosts: Boost[];
  addBoost: (boost: Omit<Boost, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeBoost: (id: string) => void;
  toggleBoost: (id: string) => void;
  updateBoost: (id: string, partial: Partial<Boost>) => void;
  getBoostForDomain: (domain: string) => Boost | undefined;
}

export const useBoostStore = create<BoostStore>((set, get) => ({
  boosts: [],

  addBoost: (boost: Omit<Boost, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    set((state) => ({
      boosts: [
        ...state.boosts,
        { ...boost, id, createdAt: now, updatedAt: now },
      ],
    }));
  },

  removeBoost: (id: string) =>
    set((state) => ({
      boosts: state.boosts.filter((b: Boost) => b.id !== id),
    })),

  toggleBoost: (id: string) =>
    set((state) => ({
      boosts: state.boosts.map((b: Boost) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    })),

  updateBoost: (id: string, partial: Partial<Boost>) =>
    set((state) => ({
      boosts: state.boosts.map((b: Boost) =>
        b.id === id ? { ...b, ...partial, updatedAt: Date.now() } : b
      ),
    })),

  getBoostForDomain: (domain: string) => {
    return get().boosts.find((b: Boost) => b.domain === domain);
  },
}));
