import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface EssentialSite {
  id: string;
  spaceId: string;
  title: string;
  url: string;
  scope?: 'workspace' | 'profile';
  profileId?: string;
}

interface EssentialsStore {
  sites: EssentialSite[];
  addSite: (site: Omit<EssentialSite, 'id'>) => void;
  removeSite: (id: string) => void;
  moveSpaceSites: (fromSpaceId: string, toSpaceId: string) => void;
  moveProfileSites: (fromProfileId: string, toProfileId: string) => void;
}

export const useEssentialsStore = create<EssentialsStore>()(
  persist(
    (set) => ({
      sites: [],
      addSite: (site) => set((state) => ({ sites: [...state.sites, { ...site, id: crypto.randomUUID() }] })),
      removeSite: (id) => set((state) => ({ sites: state.sites.filter((site) => site.id !== id) })),
      moveSpaceSites: (fromSpaceId, toSpaceId) => set((state) => ({
        sites: state.sites.map((site) => site.spaceId === fromSpaceId && site.scope !== 'profile' ? { ...site, spaceId: toSpaceId } : site),
      })),
      moveProfileSites: (fromProfileId, toProfileId) => set((state) => ({
        sites: state.sites.map((site) => site.profileId === fromProfileId ? { ...site, profileId: toProfileId } : site),
      })),
    }),
    { name: 'orb-essentials', storage: createJSONStorage(() => localStorage) }
  )
);
