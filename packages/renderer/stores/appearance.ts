import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearanceTheme = 'paper' | 'sage' | 'night';
export type AppearanceAccent = 'clay' | 'moss' | 'ocean' | 'berry';
export type AppearanceDensity = 'comfortable' | 'compact';
export type TabLayout = 'top' | 'split';
export type MotionPreference = 'off' | 'gentle' | 'lively';
export type PaletteToken = 'canvas' | 'surface' | 'elevated' | 'sidebar' | 'border' | 'text' | 'text-strong' | 'text-muted' | 'accent';

export function migrateAppearanceSettings(persistedState: unknown, version: number): Record<string, unknown> {
  const state = persistedState && typeof persistedState === 'object'
    ? persistedState as Record<string, unknown>
    : {};
  return {
    ...state,
    ...(version < 2 ? { bookmarksBarVisible: false } : {}),
    ...(version < 4 ? { showStartPage: true } : {}),
    ...(version < 5 ? { showTabStrip: true, showNavigation: true, compactMode: false } : {}),
  };
}

interface AppearanceStore {
  theme: AppearanceTheme;
  accent: AppearanceAccent;
  density: AppearanceDensity;
  tabLayout: TabLayout;
  sidebarWidth: number;
  sidebarAutoHide: boolean;
  bookmarksBarVisible: boolean;
  showStartPage: boolean;
  showTabStrip: boolean;
  showNavigation: boolean;
  compactMode: boolean;
  compactSideTabs: boolean;
  motion: MotionPreference;
  customColors: Partial<Record<PaletteToken, string>>;
  setTheme: (theme: AppearanceTheme) => void;
  setAccent: (accent: AppearanceAccent) => void;
  setDensity: (density: AppearanceDensity) => void;
  setTabLayout: (layout: TabLayout) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarAutoHide: (enabled: boolean) => void;
  setBookmarksBarVisible: (enabled: boolean) => void;
  setShowStartPage: (enabled: boolean) => void;
  setShowTabStrip: (enabled: boolean) => void;
  setShowNavigation: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setCompactSideTabs: (enabled: boolean) => void;
  setMotion: (motion: MotionPreference) => void;
  setCustomColor: (token: PaletteToken, color: string) => void;
  resetCustomColors: () => void;
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      theme: 'paper',
      accent: 'clay',
      density: 'comfortable',
      tabLayout: 'top',
      sidebarWidth: 72,
      sidebarAutoHide: false,
      bookmarksBarVisible: false,
      showStartPage: true,
      showTabStrip: true,
      showNavigation: true,
      compactMode: false,
      compactSideTabs: false,
      motion: 'gentle',
      customColors: {},
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setTabLayout: (tabLayout) => set({ tabLayout }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSidebarAutoHide: (sidebarAutoHide) => set({ sidebarAutoHide }),
      setBookmarksBarVisible: (bookmarksBarVisible) => set({ bookmarksBarVisible }),
      setShowStartPage: (showStartPage) => set({ showStartPage }),
      setShowTabStrip: (showTabStrip) => set({ showTabStrip }),
      setShowNavigation: (showNavigation) => set({ showNavigation }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setCompactSideTabs: (compactSideTabs) => set({ compactSideTabs }),
      setMotion: (motion) => set({ motion }),
      setCustomColor: (token, color) => set((state) => {
        const customColors = { ...state.customColors };
        if (color) customColors[token] = color;
        else delete customColors[token];
        return { customColors };
      }),
      resetCustomColors: () => set({ customColors: {} }),
    }),
    {
      name: 'orb-appearance',
      version: 5,
      migrate: migrateAppearanceSettings,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
