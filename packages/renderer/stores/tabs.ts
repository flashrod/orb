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

  addTab: (tab) => {
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

  removeTab: (id) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id && newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, partial) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, ...partial, updatedAt: Date.now() } : t
      ),
    })),

  moveTab: (tabId, newSpaceId, index) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;

      const withoutTab = state.tabs.filter((t) => t.id !== tabId);
      const updatedTab = { ...tab, spaceId: newSpaceId, updatedAt: Date.now() };

      withoutTab.splice(index, 0, updatedTab);

      return { tabs: withoutTab };
    }),

  getTabsForSpace: (spaceId) => {
    return get().tabs.filter((t) => t.spaceId === spaceId);
  },
}));
