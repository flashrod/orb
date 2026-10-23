import { create } from 'zustand';
import { BoostRecord, NewBoost } from '../../shared/boosts';

export type Boost = BoostRecord;

interface BoostStore {
  boosts: Boost[];
  loaded: boolean;
  error: string | null;
  loadBoosts: () => Promise<void>;
  addBoost: (boost: Omit<NewBoost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeBoost: (id: string) => Promise<void>;
  toggleBoost: (id: string) => Promise<void>;
  updateBoost: (id: string, partial: Partial<Pick<Boost, 'domain' | 'css' | 'js' | 'enabled'>>) => Promise<void>;
  getBoostForDomain: (domain: string) => Boost | undefined;
}

export const useBoostStore = create<BoostStore>((set, get) => ({
  boosts: [],
  loaded: false,
  error: null,

  loadBoosts: async () => {
    try {
      const boosts = await window.orbApi.getBoosts();
      set({ boosts, loaded: true, error: null });
    } catch (error) {
      set({ loaded: true, error: error instanceof Error ? error.message : 'Could not load Boosts.' });
    }
  },

  addBoost: async (boost) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    try {
      const saved = await window.orbApi.saveBoost({ ...boost, id, createdAt: now, updatedAt: now });
      set((state) => ({ boosts: [...state.boosts, saved], error: null }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not save Boost.' });
    }
  },

  removeBoost: async (id) => {
    try {
      await window.orbApi.deleteBoost(id);
      set((state) => ({ boosts: state.boosts.filter((boost) => boost.id !== id), error: null }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not remove Boost.' });
    }
  },

  toggleBoost: async (id) => {
    const current = get().boosts.find((boost) => boost.id === id);
    if (!current) return;
    const now = Date.now();
    try {
      const saved = await window.orbApi.saveBoost({ ...current, enabled: !current.enabled, updatedAt: now });
      set((state) => ({ boosts: state.boosts.map((boost) => boost.id === id ? saved : boost), error: null }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update Boost.' });
    }
  },

  updateBoost: async (id, partial) => {
    const current = get().boosts.find((boost) => boost.id === id);
    if (!current) return;
    try {
      const saved = await window.orbApi.saveBoost({ ...current, ...partial, updatedAt: Date.now() });
      set((state) => ({ boosts: state.boosts.map((boost) => boost.id === id ? saved : boost), error: null }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update Boost.' });
    }
  },

  getBoostForDomain: (domain: string) => {
    return get().boosts.find((boost) => boost.domain === domain.toLowerCase());
  },
}));
