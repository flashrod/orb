import { describe, expect, it } from 'vitest';
import { restoreTabSnapshot } from './tabPersistence';

describe('tab session restore', () => {
  it('restores tab order and selected tab while correcting stale active IDs', () => {
    const restored = restoreTabSnapshot({
      tabs: [
        { id: 'first', spaceId: 'work', url: 'https://example.com', title: 'Example', favicon: '', isPinned: true, isActive: false, createdAt: 1, updatedAt: 1 },
        { id: 'second', spaceId: 'work', url: 'https://example.org', title: 'Example Org', favicon: '', isPinned: false, isActive: true, createdAt: 2, updatedAt: 2 },
      ],
      activeTabId: 'missing',
    });
    expect(restored.tabs.map((tab) => tab.id)).toEqual(['first', 'second']);
    expect(restored.activeTabId).toBe('second');
    expect(restored.tabs.map((tab) => tab.isActive)).toEqual([false, true]);
  });

  it('returns an empty session for malformed persisted tab data', () => {
    expect(restoreTabSnapshot({ tabs: 'not-tabs', activeTabId: 4 })).toEqual({ tabs: [], activeTabId: null });
  });
});
