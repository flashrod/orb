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
  moveSpaceSites: (fromSpaceId: string, toSpaceId: string) => void;
}

export const useEssentialsStore = create<EssentialsStore>()(
  persist(
    (set) => ({
      sites: [],
      addSite: (site) => set((state) => ({ sites: [...state.sites, { ...site, id: crypto.randomUUID() }] })),
      removeSite: (id) => set((state) => ({ sites: state.sites.filter((site) => site.id !== id) })),
      moveSpaceSites: (fromSpaceId, toSpaceId) => set((state) => ({
        sites: state.sites.map((site) => site.spaceId === fromSpaceId ? { ...site, spaceId: toSpaceId } : site),
      })),
    }),
    { name: 'orb-essentials', storage: createJSONStorage(() => localStorage) }
  )
);
