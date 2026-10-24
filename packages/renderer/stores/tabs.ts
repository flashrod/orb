import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { restoreTabSnapshot } from '../lib/tabPersistence';

export interface Tab {
  id: string;
  spaceId: string;
  url: string;
  title: string;
  favicon: string;
  isPinned: boolean;
  groupId?: string | null;
  /** Unloaded tabs keep their identity and URL but have no live renderer. */
  isUnloaded?: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TabGroup {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  collapsed: boolean;
  createdAt: number;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  groups: TabGroup[];
  addTab: (tab: Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateTab: (id: string, partial: Partial<Tab>) => void;
  unloadTab: (id: string) => void;
  loadTab: (id: string) => void;
  moveTab: (tabId: string, newSpaceId: string, index: number) => void;
  getTabsForSpace: (spaceId: string) => Tab[];
  createGroup: (spaceId: string, tabId: string, name?: string) => string | null;
  setTabGroup: (tabId: string, groupId: string | null) => void;
  updateGroup: (groupId: string, partial: Partial<Pick<TabGroup, 'name' | 'color' | 'collapsed'>>) => void;
  removeGroup: (groupId: string) => void;
}

export const useTabStore = create<TabStore>()(persist((set, get) => ({
  tabs: [],
  activeTabId: null,
  groups: [],

  addTab: (tab: Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    set((state) => ({
      tabs: [
        ...state.tabs.map((existing) => ({ ...existing, isActive: false })),
        { ...tab, groupId: tab.groupId || null, id, isActive: true, createdAt: now, updatedAt: now },
      ],
      activeTabId: id,
    }));
  },

  removeTab: (id: string) =>
    set((state) => {
      const newTabs = state.tabs.filter((t: Tab) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id && newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      const remainingGroupIds = new Set(newTabs.map((item) => item.groupId).filter((groupId): groupId is string => Boolean(groupId)));
      return { tabs: newTabs.map((t) => ({ ...t, isActive: t.id === newActiveId })), activeTabId: newActiveId, groups: state.groups.filter((group) => remainingGroupIds.has(group.id)) };
    }),

  setActiveTab: (id: string | null) => set((state) => ({
    activeTabId: id,
    tabs: state.tabs.map((tab) => ({ ...tab, isActive: tab.id === id })),
  })),

  updateTab: (id: string, partial: Partial<Tab>) =>
    set((state) => {
      const tabs = state.tabs.map((tab: Tab) => tab.id === id
        ? { ...tab, ...partial, ...(partial.isPinned ? { groupId: null } : {}), updatedAt: Date.now() }
        : tab);
      const groupIds = new Set(tabs.map((tab) => tab.groupId).filter((groupId): groupId is string => Boolean(groupId)));
      return { tabs, groups: state.groups.filter((group) => groupIds.has(group.id)) };
    }),

  unloadTab: (id: string) =>
    set((state) => ({
      tabs: state.tabs.map((tab: Tab) => tab.id === id ? { ...tab, isUnloaded: true, updatedAt: Date.now() } : tab),
    })),

  loadTab: (id: string) =>
    set((state) => ({
      tabs: state.tabs.map((tab: Tab) => tab.id === id ? { ...tab, isUnloaded: false, updatedAt: Date.now() } : tab),
    })),

  moveTab: (tabId: string, newSpaceId: string, index: number) =>
    set((state) => {
      const tab = state.tabs.find((t: Tab) => t.id === tabId);
      if (!tab) return state;

      const withoutTab = state.tabs.filter((t: Tab) => t.id !== tabId);
      const groupStillInSpace = tab.groupId && state.groups.some((group) => group.id === tab.groupId && group.spaceId === newSpaceId);
      const updatedTab = { ...tab, groupId: groupStillInSpace ? tab.groupId : null, spaceId: newSpaceId, updatedAt: Date.now() };

      withoutTab.splice(index, 0, updatedTab);

      const groupIds = new Set(withoutTab.map((item) => item.groupId).filter((groupId): groupId is string => Boolean(groupId)));
      return { tabs: withoutTab, groups: state.groups.filter((group) => groupIds.has(group.id)) };
    }),

  getTabsForSpace: (spaceId: string) => {
    return get().tabs.filter((t: Tab) => t.spaceId === spaceId);
  },
  createGroup: (spaceId, tabId, name) => {
    const tab = get().tabs.find((item) => item.id === tabId && item.spaceId === spaceId);
    if (!tab) return null;
    const groupsInSpace = get().groups.filter((group) => group.spaceId === spaceId);
    const id = crypto.randomUUID();
    const groupName = name?.trim().slice(0, 32) || `Group ${groupsInSpace.length + 1}`;
    const group: TabGroup = { id, spaceId, name: groupName, color: '#657a60', collapsed: false, createdAt: Date.now() };
    set((state) => ({ groups: [...state.groups, group], tabs: state.tabs.map((item) => item.id === tabId ? { ...item, groupId: id } : item) }));
    return id;
  },
  setTabGroup: (tabId, groupId) => set((state) => {
    const tab = state.tabs.find((item) => item.id === tabId);
    const group = groupId ? state.groups.find((item) => item.id === groupId && item.spaceId === tab?.spaceId) : null;
    if (!tab || (groupId && !group)) return state;
    const tabs = state.tabs.map((item) => item.id === tabId ? { ...item, groupId: group?.id || null } : item);
    const groupIds = new Set(tabs.map((item) => item.groupId).filter((id): id is string => Boolean(id)));
    return { tabs, groups: state.groups.filter((item) => groupIds.has(item.id)) };
  }),
  updateGroup: (groupId, partial) => set((state) => ({ groups: state.groups.map((group) => group.id === groupId ? { ...group, ...partial, name: partial.name?.trim().slice(0, 32) || group.name } : group) })),
  removeGroup: (groupId) => set((state) => ({ groups: state.groups.filter((group) => group.id !== groupId), tabs: state.tabs.map((tab) => tab.groupId === groupId ? { ...tab, groupId: null } : tab) })),
}), {
  name: 'orb-tabs',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId, groups: state.groups }),
  migrate: (persistedState) => restoreTabSnapshot(persistedState),
}));
