import { describe, expect, it } from 'vitest';

interface Tab {
  id: string;
  url: string;
  isActive: boolean;
}

/**
 * Determines which tabs should have a WebView mounted.
 * Rules:
 * 1. The active tab is always mounted.
 * 2. Once a tab has been mounted (visited), it stays mounted even when inactive.
 * 3. Inactive tabs that have never been visited are not mounted (lazy mount).
 */
function computeMountedTabs(
  tabs: Tab[],
  activeTabId: string | null,
  previouslyMounted: string[]
): { mountedTabIds: string[]; newlyMounted: string[] } {
  const mountedSet = new Set(previouslyMounted);
  const newlyMounted: string[] = [];

  // Rule 1: active tab is always mounted
  if (activeTabId && !mountedSet.has(activeTabId)) {
    mountedSet.add(activeTabId);
    newlyMounted.push(activeTabId);
  }

  return {
    mountedTabIds: Array.from(mountedSet),
    newlyMounted,
  };
}

describe('tab mounting (keep tabs alive on switch)', () => {
  it('mounts only the active tab on first render', () => {
    const tabs = [
      { id: 'a', url: 'https://a.com', isActive: true },
      { id: 'b', url: 'https://b.com', isActive: false },
    ];
    const { mountedTabIds, newlyMounted } = computeMountedTabs(tabs, 'a', []);
    expect(mountedTabIds).toEqual(['a']);
    expect(newlyMounted).toEqual(['a']);
  });

  it('keeps previously mounted tabs even when inactive', () => {
    const tabs = [
      { id: 'a', url: 'https://a.com', isActive: false },
      { id: 'b', url: 'https://b.com', isActive: true },
    ];
    const { mountedTabIds, newlyMounted } = computeMountedTabs(tabs, 'b', ['a']);
    expect(mountedTabIds).toEqual(['a', 'b']);
    expect(newlyMounted).toEqual(['b']);
  });

  it('does not mount inactive tabs that were never visited', () => {
    const tabs = [
      { id: 'a', url: 'https://a.com', isActive: true },
      { id: 'b', url: 'https://b.com', isActive: false },
      { id: 'c', url: 'https://c.com', isActive: false },
    ];
    const { mountedTabIds } = computeMountedTabs(tabs, 'a', []);
    expect(mountedTabIds).toEqual(['a']);
  });

  it('mounts a newly activated tab that was never visited', () => {
    const tabs = [
      { id: 'a', url: 'https://a.com', isActive: false },
      { id: 'b', url: 'https://b.com', isActive: true },
    ];
    const { mountedTabIds, newlyMounted } = computeMountedTabs(tabs, 'b', ['a']);
    expect(mountedTabIds).toEqual(['a', 'b']);
    expect(newlyMounted).toEqual(['b']);
  });

  it('handles empty tab list', () => {
    const { mountedTabIds, newlyMounted } = computeMountedTabs([], null, []);
    expect(mountedTabIds).toEqual([]);
    expect(newlyMounted).toEqual([]);
  });
});
