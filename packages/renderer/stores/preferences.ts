import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SearchProvider } from '../lib/navigation';
import type { EssentialsScope } from '../lib/essentials';
import { normalizeDisplayName } from '../../shared/onboarding';
import { normalizeNeverHibernateEntry } from '../../shared/siteBehavior';

interface BrowserPreferencesStore {
  searchProvider: SearchProvider;
  essentialsScope: EssentialsScope;
  /** A first name for hellos. Local only; there is no account. */
  displayName: string;
  /** Sites that are never hibernated, stored as bare hostnames. */
  neverHibernate: string[];
  setSearchProvider: (provider: SearchProvider) => void;
  setEssentialsScope: (scope: EssentialsScope) => void;
  setDisplayName: (name: string) => void;
  addNeverHibernate: (entry: string) => string | null;
  removeNeverHibernate: (entry: string) => void;
}

export const useBrowserPreferencesStore = create<BrowserPreferencesStore>()(persist((set) => ({
  searchProvider: 'google',
  essentialsScope: 'workspace',
  displayName: '',
  neverHibernate: [],
  setSearchProvider: (searchProvider) => set({ searchProvider }),
  setEssentialsScope: (essentialsScope) => set({ essentialsScope }),
  setDisplayName: (displayName) => set({ displayName: normalizeDisplayName(displayName) }),
  addNeverHibernate: (entry) => {
    const domain = normalizeNeverHibernateEntry(entry);
    if (!domain) return null;
    set((state) => ({
      neverHibernate: state.neverHibernate.includes(domain)
        ? state.neverHibernate
        : [...state.neverHibernate, domain].sort(),
    }));
    return domain;
  },
  removeNeverHibernate: (entry) => set((state) => ({
    neverHibernate: state.neverHibernate.filter((domain) => domain !== entry),
  })),
}), {
  name: 'orb-preferences',
  version: 4,
  storage: createJSONStorage(() => localStorage),
  migrate: (state: any) => ({
    searchProvider: ['google', 'duckduckgo', 'bing', 'brave', 'startpage'].includes(state?.searchProvider) ? state.searchProvider : 'google',
    essentialsScope: state?.essentialsScope === 'profile' ? 'profile' : 'workspace',
    displayName: normalizeDisplayName(typeof state?.displayName === 'string' ? state.displayName : ''),
    neverHibernate: Array.isArray(state?.neverHibernate)
      ? [...new Set(state.neverHibernate
        .map((entry: unknown) => (typeof entry === 'string' ? normalizeNeverHibernateEntry(entry) : null))
        .filter((entry: string | null): entry is string => Boolean(entry)))].sort()
      : [],
  }),
}));
