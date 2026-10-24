import { describe, expect, it } from 'vitest';
import {
  MEMORY_GUARD_IDLE_MS,
  MEMORY_GUARD_MAX_LIVE_TABS,
  selectTabsToHibernate,
  shouldHibernate,
  type MemoryGuardTab,
} from './memoryGuard';

function tab(overrides: Partial<MemoryGuardTab> & { id: string }): MemoryGuardTab {
  return {
    isPinned: false,
    isAudible: false,
    inCall: false,
    lastActiveAt: 0,
    state: 'live',
    ...overrides,
  };
}

describe('memory guard (idle tab hibernation)', () => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000 - 1;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  it('hibernates a live tab idle past the threshold', () => {
    expect(shouldHibernate(tab({ id: '1', lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(true);
  });

  it('does not hibernate a pinned tab', () => {
    expect(shouldHibernate(tab({ id: '1', isPinned: true, lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(false);
  });

  it('does not hibernate an audible tab', () => {
    expect(shouldHibernate(tab({ id: '1', isAudible: true, lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(false);
  });

  it('does not hibernate a tab in a call', () => {
    expect(shouldHibernate(tab({ id: '1', inCall: true, lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(false);
  });

  it('never hibernates the active tab, even when idle', () => {
    expect(shouldHibernate(tab({ id: 'active', lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS, 'active')).toBe(false);
  });

  it('does not hibernate a recently active tab', () => {
    expect(shouldHibernate(tab({ id: '1', lastActiveAt: fiveMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(false);
  });

  it('does not hibernate an already hibernated tab', () => {
    expect(shouldHibernate(tab({ id: '1', state: 'hibernated', lastActiveAt: tenMinutesAgo }), now, MEMORY_GUARD_IDLE_MS)).toBe(false);
  });

  it('reclaims idle tabs regardless of the live cap', () => {
    const tabs = [
      tab({ id: 'a', lastActiveAt: now - 30 * 60 * 1000 }),
      tab({ id: 'b', lastActiveAt: now - 20 * 60 * 1000 }),
      tab({ id: 'c', lastActiveAt: now - 60 * 1000 }),
    ];
    expect(selectTabsToHibernate(tabs, now, MEMORY_GUARD_IDLE_MS, 10)).toEqual(['a', 'b']);
  });

  it('hibernates the oldest tabs when over the live cap', () => {
    const tabs = [
      tab({ id: 'a', lastActiveAt: now - 60 * 1000 }),
      tab({ id: 'b', lastActiveAt: now - 120 * 1000 }),
      tab({ id: 'c', lastActiveAt: now - 180 * 1000 }),
    ];
    expect(selectTabsToHibernate(tabs, now, MEMORY_GUARD_IDLE_MS, 1)).toEqual(['c', 'b']);
  });

  it('keeps protected tabs even when over the cap', () => {
    const tabs = [
      tab({ id: 'pinned', isPinned: true, lastActiveAt: now - 600 * 1000 }),
      tab({ id: 'audible', isAudible: true, lastActiveAt: now - 600 * 1000 }),
      tab({ id: 'active', lastActiveAt: now - 600 * 1000 }),
      tab({ id: 'idle', lastActiveAt: now - 600 * 1000 }),
    ];
    expect(selectTabsToHibernate(tabs, now, MEMORY_GUARD_IDLE_MS, 1, 'active')).toEqual(['idle']);
  });

  it('returns nothing when under the cap and nothing is idle', () => {
    const tabs = [tab({ id: 'a', lastActiveAt: now - 60 * 1000 })];
    expect(selectTabsToHibernate(tabs, now, MEMORY_GUARD_IDLE_MS, 5)).toEqual([]);
  });

  it('exposes sane defaults', () => {
    expect(MEMORY_GUARD_IDLE_MS).toBe(10 * 60 * 1000);
    expect(MEMORY_GUARD_MAX_LIVE_TABS).toBe(20);
  });
});
