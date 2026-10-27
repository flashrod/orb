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
  /** Sites the user muted from the tab strip, stored as bare hostnames. */
  mutedSites: string[];
  /** Shows the recent sites column on the start page. */
  showRecentSites: boolean;
  /** What to do with the previous session when the app opens. */
  startupBehavior: StartupBehavior;
  setSearchProvider: (provider: SearchProvider) => void;
  setEssentialsScope: (scope: EssentialsScope) => void;
  setDisplayName: (name: string) => void;
  addNeverHibernate: (entry: string) => string | null;
  removeNeverHibernate: (entry: string) => void;
  muteSite: (host: string) => void;
  unmuteSite: (host: string) => void;
  setShowRecentSites: (show: boolean) => void;
  setStartupBehavior: (behavior: StartupBehavior) => void;
}

export type StartupBehavior = 'ask' | 'restore' | 'fresh';

export const STARTUP_BEHAVIORS: StartupBehavior[] = ['ask', 'restore', 'fresh'];

export const useBrowserPreferencesStore = create<BrowserPreferencesStore>()(persist((set) => ({
  searchProvider: 'google',
  essentialsScope: 'workspace',
  displayName: '',
  neverHibernate: [],
  mutedSites: [],
  showRecentSites: true,
  startupBehavior: 'ask',
  setSearchProvider: (searchProvider) => set({ searchProvider }),
  setEssentialsScope: (essentialsScope) => set({ essentialsScope }),
  setDisplayName: (displayName) => set({ displayName: normalizeDisplayName(displayName) }),
  setShowRecentSites: (showRecentSites) => set({ showRecentSites }),
  setStartupBehavior: (startupBehavior) => set({ startupBehavior }),
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
  muteSite: (host) => {
    const domain = normalizeNeverHibernateEntry(host);
    if (!domain) return;
    set((state) => ({
      mutedSites: state.mutedSites.includes(domain) ? state.mutedSites : [...state.mutedSites, domain].sort(),
    }));
  },
  unmuteSite: (host) => {
    const domain = normalizeNeverHibernateEntry(host) || host;
    set((state) => ({ mutedSites: state.mutedSites.filter((entry) => entry !== domain) }));
  },
}), {
  name: 'orb-preferences',
  version: 6,
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
    showRecentSites: state?.showRecentSites !== false,
    startupBehavior: STARTUP_BEHAVIORS.includes(state?.startupBehavior) ? state.startupBehavior : 'ask',
    mutedSites: Array.isArray(state?.mutedSites)
      ? [...new Set(state.mutedSites
        .map((entry: unknown) => (typeof entry === 'string' ? normalizeNeverHibernateEntry(entry) : null))
        .filter((entry: string | null): entry is string => Boolean(entry)))].sort()
      : [],
  }),
}));
