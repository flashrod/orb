import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface EssentialSite {
  id: string;
  spaceId: string;
  title: string;
  url: string;
}

interface EssentialsStore {
  sites: EssentialSite[];
  addSite: (site: Omit<EssentialSite, 'id'>) => void;
  removeSite: (id: string) => void;
}

export const useEssentialsStore = create<EssentialsStore>()(
  persist(
    (set) => ({
      sites: [],
      addSite: (site) => set((state) => ({ sites: [...state.sites, { ...site, id: crypto.randomUUID() }] })),
      removeSite: (id) => set((state) => ({ sites: state.sites.filter((site) => site.id !== id) })),
    }),
    { name: 'orb-essentials', storage: createJSONStorage(() => localStorage) }
  )
);
