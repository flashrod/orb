import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SearchProvider } from '../lib/navigation';
import type { EssentialsScope } from '../lib/essentials';

interface BrowserPreferencesStore {
  searchProvider: SearchProvider;
  essentialsScope: EssentialsScope;
  setSearchProvider: (provider: SearchProvider) => void;
  setEssentialsScope: (scope: EssentialsScope) => void;
}

export const useBrowserPreferencesStore = create<BrowserPreferencesStore>()(persist((set) => ({
  searchProvider: 'google',
  essentialsScope: 'workspace',
  setSearchProvider: (searchProvider) => set({ searchProvider }),
  setEssentialsScope: (essentialsScope) => set({ essentialsScope }),
}), {
  name: 'orb-preferences',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  migrate: (state: any) => ({
    searchProvider: ['google', 'duckduckgo', 'bing', 'brave', 'startpage'].includes(state?.searchProvider) ? state.searchProvider : 'google',
    essentialsScope: state?.essentialsScope === 'profile' ? 'profile' : 'workspace',
  }),
}));
