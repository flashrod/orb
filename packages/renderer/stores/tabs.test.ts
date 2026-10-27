import { describe, expect, it, beforeEach } from 'vitest';
import './test-localStorage';
import { useTabStore } from './tabs';

function resetStore() {
  useTabStore.setState({ tabs: [], activeTabId: null, groups: [] });
}

function get() {
  return useTabStore.getState();
}

describe('tab store — shortcut handler operations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('removeTab closes the active tab and activates another', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });
    state.addTab({ spaceId: 's1', url: 'https://b.com', title: 'B', favicon: '', isPinned: false, isActive: false });

    const tabs = get().tabs;
    const firstId = tabs[0].id;
    state.removeTab(firstId);
    const next = get();
    expect(next.tabs.map((t) => t.id).sort()).toEqual([tabs[1].id].sort());
    expect(next.activeTabId).toBe(tabs[1].id);
    expect(next.tabs.find((t) => t.id === next.activeTabId)?.isActive).toBe(true);
  });

  it('setActiveTab switches the active tab', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });
    state.addTab({ spaceId: 's1', url: 'https://b.com', title: 'B', favicon: '', isPinned: false, isActive: false });

    const tabs = get().tabs;
    const bId = tabs.find((t) => t.title === 'B')!.id;
    state.setActiveTab(bId);
    const next = get();
    expect(next.activeTabId).toBe(bId);
    expect(next.tabs.find((t) => t.id === bId)?.isActive).toBe(true);
    expect(next.tabs.find((t) => t.title === 'A')?.isActive).toBe(false);
  });

  it('updateTab toggles pin on a tab', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });

    const id = get().tabs[0].id;
    state.updateTab(id, { isPinned: true });
    expect(get().tabs.find((t) => t.id === id)?.isPinned).toBe(true);

    state.updateTab(id, { isPinned: false });
    expect(get().tabs.find((t) => t.id === id)?.isPinned).toBe(false);
  });

  it('updateTab toggles mute on a tab', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });

    const id = get().tabs[0].id;
    state.updateTab(id, { isMuted: true });
    expect(get().tabs.find((t) => t.id === id)?.isMuted).toBe(true);
  });

  it('addTab duplicates an active tab into the same space', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });

    const beforeCount = get().tabs.length;
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });

    const next = get();
    expect(next.tabs.length).toBe(beforeCount + 1);
    const dups = next.tabs.filter((t) => t.url === 'https://a.com');
    expect(dups.length).toBe(2);
    const dup = dups.find((t) => !t.isActive); // the older duplicate is not active
    expect(dup).toBeDefined();
  });

  it('tabs in the same space order pinned first for go-to-N', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: false });
    state.addTab({ spaceId: 's1', url: 'https://b.com', title: 'B', favicon: '', isPinned: true, isActive: false });
    state.addTab({ spaceId: 's2', url: 'https://c.com', title: 'C', favicon: '', isPinned: false, isActive: false });

    const allTabs = get().tabs;
    const s1Tabs = allTabs.filter((t) => t.spaceId === 's1');
    expect(s1Tabs.length).toBe(2);
    expect(s1Tabs.some((t) => t.isPinned)).toBe(true);
  });

  it('closing the last tab leaves no active tab', () => {
    const state = get();
    state.addTab({ spaceId: 's1', url: 'https://a.com', title: 'A', favicon: '', isPinned: false, isActive: true });

    const id = get().tabs[0].id;
    state.removeTab(id);
    const next = get();
    expect(next.tabs.length).toBe(0);
    expect(next.activeTabId).toBeNull();
  });
});
