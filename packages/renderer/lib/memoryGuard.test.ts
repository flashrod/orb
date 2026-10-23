import { describe, expect, it } from 'vitest';

type TabState = 'live' | 'throttled' | 'hibernated';

interface TabInfo {
  id: string;
  url: string;
  title: string;
  isPinned: boolean;
  isAudible: boolean;
  inCall: boolean;
  lastActiveAt: number;
  state: TabState;
  snapshot?: string;
}

/**
 * Determines if a tab should be hibernated based on idle time and protections.
 * A tab is hibernated if:
 * - It has been idle for more than idleThresholdMs (default 10 minutes)
 * - It is NOT pinned
 * - It is NOT audible
 * - It is NOT in a call
 */
function shouldHibernate(tab: TabInfo, now: number, idleThresholdMs: number): boolean {
  if (tab.state !== 'live') return false;
  if (tab.isPinned) return false;
  if (tab.isAudible) return false;
  if (tab.inCall) return false;
  const idleMs = now - tab.lastActiveAt;
  return idleMs > idleThresholdMs;
}

/**
 * Selects tabs to hibernate when over the memory cap, oldest first,
 * skipping protected tabs.
 */
function selectTabsToHibernate(
  tabs: TabInfo[],
  now: number,
  idleThresholdMs: number,
  maxLiveTabs: number,
): string[] {
  const liveTabs = tabs.filter((t) => t.state === 'live');
  if (liveTabs.length <= maxLiveTabs) return [];

  // Sort by lastActiveAt ascending (oldest first)
  const sorted = [...liveTabs].sort((a, b) => a.lastActiveAt - b.lastActiveAt);
  const toHibernate: string[] = [];
  let hibernatedCount = 0;

  for (const tab of sorted) {
    if (liveTabs.length - hibernatedCount <= maxLiveTabs) break;
    if (shouldHibernate(tab, now, idleThresholdMs)) {
      toHibernate.push(tab.id);
      hibernatedCount++;
    }
  }

  return toHibernate;
}

describe('memory guard (idle tab hibernation)', () => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000 - 1;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  it('hibernates live tab idle over threshold, not pinned/audible/in-call', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: false, isAudible: false, inCall: false,
      lastActiveAt: tenMinutesAgo, state: 'live',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(true);
  });

  it('does not hibernate pinned tab', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: true, isAudible: false, inCall: false,
      lastActiveAt: tenMinutesAgo, state: 'live',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(false);
  });

  it('does not hibernate audible tab', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: false, isAudible: true, inCall: false,
      lastActiveAt: tenMinutesAgo, state: 'live',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(false);
  });

  it('does not hibernate in-call tab', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: false, isAudible: false, inCall: true,
      lastActiveAt: tenMinutesAgo, state: 'live',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(false);
  });

  it('does not hibernate recently active tab', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: false, isAudible: false, inCall: false,
      lastActiveAt: fiveMinutesAgo, state: 'live',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(false);
  });

  it('does not hibernate already hibernated tab', () => {
    const tab: TabInfo = {
      id: '1', url: 'https://example.com', title: 'Example',
      isPinned: false, isAudible: false, inCall: false,
      lastActiveAt: tenMinutesAgo, state: 'hibernated',
    };
    expect(shouldHibernate(tab, now, 10 * 60 * 1000)).toBe(false);
  });

  it('selects oldest live tabs to hibernate when over cap', () => {
    const tabs: TabInfo[] = [
      { id: 'a', url: 'https://a.com', title: 'A', isPinned: false, isAudible: false, inCall: false, lastActiveAt: now - 20 * 60 * 1000, state: 'live' },
      { id: 'b', url: 'https://b.com', title: 'B', isPinned: false, isAudible: false, inCall: false, lastActiveAt: now - 15 * 60 * 1000, state: 'live' },
      { id: 'c', url: 'https://c.com', title: 'C', isPinned: false, isAudible: false, inCall: false, lastActiveAt: now - 5 * 60 * 1000, state: 'live' },
    ];
    const result = selectTabsToHibernate(tabs, now, 10 * 60 * 1000, 1);
    expect(result).toEqual(['a', 'b']);
  });

  it('returns empty when under cap', () => {
    const tabs: TabInfo[] = [
      { id: 'a', url: 'https://a.com', title: 'A', isPinned: false, isAudible: false, inCall: false, lastActiveAt: now - 20 * 60 * 1000, state: 'live' },
    ];
    const result = selectTabsToHibernate(tabs, now, 10 * 60 * 1000, 5);
    expect(result).toEqual([]);
  });
});
