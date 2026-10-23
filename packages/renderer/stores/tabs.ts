import { create } from 'zustand';

export interface Tab {
  id: string;
  spaceId: string;
  url: string;
  title: string;
  favicon: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateTab: (id: string, partial: Partial<Tab>) => void;
  moveTab: (tabId: string, newSpaceId: string, index: number) => void;
  getTabsForSpace: (spaceId: string) => Tab[];
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab: Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    set((state) => ({
      tabs: [
        ...state.tabs,
        { ...tab, id, isActive: true, createdAt: now, updatedAt: now },
      ],
      activeTabId: id,
    }));
  },

  removeTab: (id: string) =>
    set((state) => {
      const tab = state.tabs.find((t: Tab) => t.id === id);
      const newTabs = state.tabs.filter((t: Tab) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id && newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    }),

  setActiveTab: (id: string | null) => set({ activeTabId: id }),

  updateTab: (id: string, partial: Partial<Tab>) =>
    set((state) => ({
      tabs: state.tabs.map((t: Tab) =>
        t.id === id ? { ...t, ...partial, updatedAt: Date.now() } : t
      ),
    })),

  moveTab: (tabId: string, newSpaceId: string, index: number) =>
    set((state) => {
      const tab = state.tabs.find((t: Tab) => t.id === tabId);
      if (!tab) return state;

      const withoutTab = state.tabs.filter((t: Tab) => t.id !== tabId);
      const updatedTab = { ...tab, spaceId: newSpaceId, updatedAt: Date.now() };

      withoutTab.splice(index, 0, updatedTab);

      return { tabs: withoutTab };
    }),

  getTabsForSpace: (spaceId: string) => {
    return get().tabs.filter((t: Tab) => t.spaceId === spaceId);
  },
}));
