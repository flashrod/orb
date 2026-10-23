import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SearchProvider } from '../lib/navigation';

interface BrowserPreferencesStore {
  searchProvider: SearchProvider;
  setSearchProvider: (provider: SearchProvider) => void;
}

export const useBrowserPreferencesStore = create<BrowserPreferencesStore>()(persist((set) => ({
  searchProvider: 'google',
  setSearchProvider: (searchProvider) => set({ searchProvider }),
}), {
  name: 'orb-preferences',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  migrate: (state: any) => ({ searchProvider: ['google', 'duckduckgo', 'bing', 'brave', 'startpage'].includes(state?.searchProvider) ? state.searchProvider : 'google' }),
}));
