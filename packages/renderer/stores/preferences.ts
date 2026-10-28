import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SearchProvider } from '../lib/navigation';
import type { EssentialsScope } from '../lib/essentials';
import { normalizeDisplayName } from '../../shared/onboarding';
import { normalizeNeverHibernateEntry } from '../../shared/siteBehavior';
import { listPresets, presetOverrides } from '../../shared/keymapPresets';

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
  /** Per-command keyboard shortcut overrides. commandId → bindings or null (unbound). Missing = default. */
  keymapOverrides: Record<string, string[] | null>;
  /** The active preset id, or null when the user is on defaults/custom bindings. */
  keymapPreset: string | null;
  setSearchProvider: (provider: SearchProvider) => void;
  setEssentialsScope: (scope: EssentialsScope) => void;
  setDisplayName: (name: string) => void;
  addNeverHibernate: (entry: string) => string | null;
  removeNeverHibernate: (entry: string) => void;
  muteSite: (host: string) => void;
  unmuteSite: (host: string) => void;
  setShowRecentSites: (show: boolean) => void;
  setStartupBehavior: (behavior: StartupBehavior) => void;
  /** Override the bindings for a command. Pass null to unbind. */
  setKeymapOverride: (commandId: string, bindings: string[] | null) => void;
  /** Reset every override to defaults. */
  resetKeymap: () => void;
  /**
   * Apply a built-in preset: write its overrides to the store and record the
   * preset id so the UI can show which preset is active. Passing 'default' or
   * null clears the preset selection without touching overrides.
   */
  setKeymapPreset: (presetId: string | null) => void;
  /**
   * Per-site shortcut passthrough rules. domain → command ids that should
   * not be intercepted by Orb on that site (they are passed to the page instead).
   */
  passthroughRules: Record<string, string[]>;
  /**
   * Set the commands to pass through on a given domain. Empty array clears
   * the rule for that domain.
   */
  setPassthroughRule: (domain: string, commandIds: string[]) => void;
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
  keymapOverrides: {},
  keymapPreset: null,
  passthroughRules: {},
  setSearchProvider: (searchProvider) => set({ searchProvider }),
  setEssentialsScope: (essentialsScope) => set({ essentialsScope }),
  setDisplayName: (displayName) => set({ displayName: normalizeDisplayName(displayName) }),
  setShowRecentSites: (showRecentSites) => set({ showRecentSites }),
  setStartupBehavior: (startupBehavior) => set({ startupBehavior }),
  setKeymapOverride: (commandId, bindings) =>
    set((state) => ({
      keymapOverrides: { ...state.keymapOverrides, [commandId]: bindings },
    })),
  resetKeymap: () => set({ keymapOverrides: {}, keymapPreset: null }),
  setKeymapPreset: (presetId) => {
    if (!presetId || presetId === 'default') {
      set({ keymapPreset: null });
      return;
    }
    const overrides = presetOverrides(presetId);
    if (!overrides) {
      set({ keymapPreset: null });
      return;
    }
    set((state) => ({
      keymapOverrides: { ...state.keymapOverrides, ...overrides },
      keymapPreset: presetId,
    }));
  },
  setPassthroughRule: (domain, commandIds) =>
    set((state) => {
      const next = { ...state.passthroughRules };
      if (commandIds.length === 0) delete next[domain];
      else next[domain] = commandIds;
      return { passthroughRules: next };
    }),
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
  version: 9,
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
    keymapOverrides: {},
    keymapPreset: null,
    passthroughRules: {},
  }),
}));
